import { apiRequest } from "./queryClient";

// Device registration interface
export interface DeviceRegistration {
  id: number;
  user_id: number;
  device_token: string;
  platform: "ios" | "android" | "web";
  device_name?: string;
  device_model?: string;
  device_os?: string;
  os_version?: string;
  app_version?: string;
  push_enabled: boolean;
  badge_enabled: boolean;
  sound_enabled: boolean;
  timezone?: string;
  language?: string;
  is_active: boolean;
  last_active?: Date;
  registration_source?: string;
  user_agent?: string;
  ip_address?: string;
  created_at: Date;
  updated_at: Date;
}

// Device registration service
export class DeviceRegistrationService {
  private static instance: DeviceRegistrationService;
  private registrationToken: string | null = null;
  private platform: "ios" | "android" | "web" = "web";
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DeviceRegistrationService {
    if (!DeviceRegistrationService.instance) {
      DeviceRegistrationService.instance = new DeviceRegistrationService();
    }
    return DeviceRegistrationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Detect platform
      this.platform = this.detectPlatform();

      // Initialize device registration based on platform
      switch (this.platform) {
        case "web":
          await this.initializeWebPushRegistration();
          break;
        case "ios":
          await this.initializeIOSRegistration();
          break;
        case "android":
          await this.initializeAndroidRegistration();
          break;
        default:
          console.warn("Unknown platform, using web registration");
          await this.initializeWebPushRegistration();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Device registration initialization failed:", error);
    }
  }

  private detectPlatform(): "ios" | "android" | "web" {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return "ios";
    } else if (/android/.test(userAgent)) {
      return "android";
    } else {
      return "web";
    }
  }

  private async initializeWebPushRegistration(): Promise<void> {
    try {
      // Check if service worker is supported
      if (!("serviceWorker" in navigator)) {
        console.warn("Service Worker not supported");
        return;
      }

      // Check if push messaging is supported
      if (!("PushManager" in window)) {
        console.warn("Push messaging not supported");
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.ready;

      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlB64ToUint8Array(
            import.meta.env.VITE_VAPID_PUBLIC_KEY || "",
          ),
        });
      }

      // Use the subscription endpoint as the device token
      this.registrationToken = subscription.endpoint;

      // Register device in database
      await this.registerDevice({
        device_token: this.registrationToken,
        platform: "web",
        device_name: navigator.userAgent.includes("Mobile")
          ? "Mobile Web"
          : "Desktop Web",
        device_model: this.getDeviceModel(),
        device_os: this.getOperatingSystem(),
        os_version: this.getOSVersion(),
        app_version: "1.0.0",
        push_enabled: true,
        badge_enabled: true,
        sound_enabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        registration_source: "web_push",
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Web push registration failed:", error);
    }
  }

  private async initializeIOSRegistration(): Promise<void> {
    try {
      // For iOS, we'll use a fallback approach since iOS Safari doesn't support push notifications
      // Generate a unique device token based on device characteristics
      const deviceToken = this.generateIOSDeviceToken();
      this.registrationToken = deviceToken;

      console.log("iOS device registration starting", {
        deviceToken: deviceToken.substring(0, 20) + "...",
      });

      // Register device in database
      await this.registerDevice({
        device_token: deviceToken,
        platform: "ios",
        device_name: this.getIOSDeviceModel(),
        device_model: this.getIOSDeviceModel(),
        device_os: "iOS",
        os_version: this.getIOSVersion(),
        app_version: "1.0.0",
        push_enabled: false, // iOS Safari doesn't support push notifications
        badge_enabled: false,
        sound_enabled: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        registration_source: "ios_safari",
        user_agent: navigator.userAgent,
      });

      console.log("iOS device registration completed successfully");
    } catch (error) {
      console.error("iOS registration failed:", error);
      throw new Error(
        `iOS device registration failed: ${(error as Error).message}`,
      );
    }
  }

  private async initializeAndroidRegistration(): Promise<void> {
    try {
      // For Android, we'll use web push registration
      await this.initializeWebPushRegistration();
    } catch (error) {
      console.error("Android registration failed:", error);
    }
  }

  private async registerDevice(
    registrationData: Partial<DeviceRegistration>,
  ): Promise<void> {
    // Add retry logic for authentication issues
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Registering device (attempt ${attempt}/${maxRetries}) with data:`,
          {
            platform: registrationData.platform,
            device_token:
              registrationData.device_token?.substring(0, 20) + "...",
            device_name: registrationData.device_name,
          },
        );

        const response = await apiRequest(
          "POST",
          "/api/devices/register",
          registrationData,
        );
        const result = await response.json();
        console.log("Device registered successfully:", result);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.error(`Device registration attempt ${attempt} failed:`, error);

        // If it's an auth error and we have retries left, wait and try again
        if ((error as Error).message?.includes("401") && attempt < maxRetries) {
          console.log(`Retrying device registration in ${attempt * 1000}ms...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          continue;
        }

        // If not an auth error or no retries left, break the loop
        break;
      }
    }

    // If we get here, all retries failed
    throw new Error(
      `Device registration failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
    );
  }

  // Update device settings
  async updateDeviceSettings(
    settings: Partial<DeviceRegistration>,
  ): Promise<void> {
    try {
      if (!this.registrationToken) {
        throw new Error("Device not registered");
      }

      const response = await apiRequest("GET", "/api/devices");
      const devices = await response.json();
      const currentDevice = devices.find(
        (d: DeviceRegistration) => d.device_token === this.registrationToken,
      );

      if (currentDevice) {
        await apiRequest("PUT", `/api/devices/${currentDevice.id}`, settings);
        console.log("Device settings updated successfully");
      }
    } catch (error) {
      console.error("Device settings update failed:", error);
    }
  }

  // Get user devices
  async getUserDevices(): Promise<DeviceRegistration[]> {
    try {
      const response = await apiRequest("GET", "/api/devices");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user devices:", error);
      return [];
    }
  }

  // Update last active timestamp
  async updateLastActive(): Promise<void> {
    try {
      if (!this.registrationToken) {
        return;
      }

      await apiRequest("PUT", `/api/devices/${this.registrationToken}/active`);
    } catch (error) {
      console.error("Failed to update last active:", error);
    }
  }

  // Utility methods
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private getDeviceModel(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Mobile")) {
      return "Mobile Device";
    } else if (userAgent.includes("Tablet")) {
      return "Tablet Device";
    } else {
      return "Desktop Device";
    }
  }

  private getOperatingSystem(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac")) return "macOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (
      userAgent.includes("iOS") ||
      userAgent.includes("iPhone") ||
      userAgent.includes("iPad")
    )
      return "iOS";
    return "Unknown";
  }

  private getOSVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(
      /(?:Windows NT|Mac OS X|Android|iPhone OS|iPad) ([\d._]+)/,
    );
    return match ? match[1] : "Unknown";
  }

  private generateIOSDeviceToken(): string {
    // Generate a unique token based on device characteristics
    const characteristics = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 1,
    ].join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < characteristics.length; i++) {
      const char = characteristics.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `ios_device_${Math.abs(hash).toString(36)}_${Date.now()}`;
  }

  private getIOSDeviceModel(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("iPad")) return "iPad";
    if (userAgent.includes("iPod")) return "iPod";
    return "iOS Device";
  }

  private getIOSVersion(): string {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/OS ([\d_]+)/);
    return match ? match[1].replace(/_/g, ".") : "Unknown";
  }

  // Getters
  get isRegistered(): boolean {
    return this.registrationToken !== null;
  }

  get deviceToken(): string | null {
    return this.registrationToken;
  }

  get currentPlatform(): "ios" | "android" | "web" {
    return this.platform;
  }
}

export const deviceRegistrationService =
  DeviceRegistrationService.getInstance();
