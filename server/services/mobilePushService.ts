import { storage } from "../storage";
import logger from "../logger";
import webpush from "web-push";
import { DeviceRegistration } from "@shared/schema";

// FCM (Firebase Cloud Messaging) types
interface FCMMessage {
  token: string;
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: "normal" | "high";
    notification: {
      icon: string;
      color: string;
      sound: string;
      tag: string;
      channel_id: string;
      click_action?: string;
    };
    data?: Record<string, string>;
  };
  apns?: {
    headers: {
      "apns-priority": string;
      "apns-push-type": string;
      "apns-topic": string;
    };
    payload: {
      aps: {
        alert: {
          title: string;
          body: string;
        };
        badge?: number;
        sound: string;
        "content-available"?: number;
        "mutable-content"?: number;
        category?: string;
      };
      custom_data?: Record<string, any>;
    };
  };
  webpush?: {
    headers: Record<string, string>;
    data: Record<string, any>;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  priority: "low" | "medium" | "high" | "urgent" | "critical";
  category?: string;
  sound?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushNotificationResult {
  success: boolean;
  device_count: number;
  successful_devices: number;
  failed_devices: number;
  errors: Array<{
    device_id: string;
    platform: string;
    error: string;
  }>;
}

export class MobilePushService {
  private static instance: MobilePushService;
  private fcmServerKey: string | null = null;
  private apnsKeyId: string | null = null;
  private apnsTeamId: string | null = null;
  private apnsPrivateKey: string | null = null;
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidEmail: string;

  private constructor() {
    // Initialize VAPID keys for web push
    this.vapidPublicKey =
      process.env.VAPID_PUBLIC_KEY ||
      "BEl62iUYgUivxIkv69yViEuiBIa40HcCWLaS4N-YwwJDtfKGjXxTqvJNcCRFH_kf2wlE8YZjXRzlGTfVjj0M2fY";
    this.vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY ||
      "kE9j2ZfJ-gSH6_EQFRKZVmKZBQJGSLQ8SHglNsYHPDw";
    this.vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@autolab.com";

    // Initialize FCM and APNS keys from environment variables
    this.fcmServerKey = process.env.FCM_SERVER_KEY || null;
    this.apnsKeyId = process.env.APNS_KEY_ID || null;
    this.apnsTeamId = process.env.APNS_TEAM_ID || null;
    this.apnsPrivateKey = process.env.APNS_PRIVATE_KEY || null;

    // Setup web push
    webpush.setVapidDetails(
      this.vapidEmail,
      this.vapidPublicKey,
      this.vapidPrivateKey,
    );

    logger.info("MobilePushService initialized", {
      fcm_configured: !!this.fcmServerKey,
      apns_configured: !!(
        this.apnsKeyId &&
        this.apnsTeamId &&
        this.apnsPrivateKey
      ),
      vapid_configured: true,
    });
  }

  static getInstance(): MobilePushService {
    if (!MobilePushService.instance) {
      MobilePushService.instance = new MobilePushService();
    }
    return MobilePushService.instance;
  }

  // Main method to send push notifications to all user devices
  async sendNotification(
    userId: number,
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      // Get all device registrations for the user
      const devices = await storage.getDeviceRegistrationsByUser(userId);

      if (devices.length === 0) {
        logger.warn("No devices registered for user", { userId });
        return {
          success: false,
          device_count: 0,
          successful_devices: 0,
          failed_devices: 0,
          errors: [],
        };
      }

      const result: PushNotificationResult = {
        success: true,
        device_count: devices.length,
        successful_devices: 0,
        failed_devices: 0,
        errors: [],
      };

      // Send to each device
      const promises = devices.map((device) =>
        this.sendToDevice(device, payload),
      );
      const results = await Promise.allSettled(promises);

      // Process results
      results.forEach((deviceResult, index) => {
        const device = devices[index];
        if (deviceResult.status === "fulfilled" && deviceResult.value) {
          result.successful_devices++;
        } else {
          result.failed_devices++;
          result.errors.push({
            device_id: device.id.toString(),
            platform: device.platform,
            error:
              deviceResult.status === "rejected"
                ? deviceResult.reason?.message || "Unknown error"
                : "Send failed",
          });
        }
      });

      // Update overall success status
      result.success = result.successful_devices > 0;

      logger.info("Push notification batch completed", {
        userId,
        device_count: result.device_count,
        successful: result.successful_devices,
        failed: result.failed_devices,
      });

      return result;
    } catch (error) {
      logger.error("Failed to send push notification", { error, userId });
      return {
        success: false,
        device_count: 0,
        successful_devices: 0,
        failed_devices: 0,
        errors: [
          {
            device_id: "unknown",
            platform: "unknown",
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  // Send notification to a specific device
  private async sendToDevice(
    device: DeviceRegistration,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!device.push_enabled) {
      return false;
    }

    try {
      switch (device.platform) {
        case "ios":
          return await this.sendToIOS(device, payload);
        case "android":
          return await this.sendToAndroid(device, payload);
        case "web":
          return await this.sendToWeb(device, payload);
        default:
          logger.warn("Unsupported platform", { platform: device.platform });
          return false;
      }
    } catch (error) {
      logger.error("Failed to send to device", {
        error,
        device_id: device.id,
        platform: device.platform,
      });
      return false;
    }
  }

  // iOS Push Notification (APNS)
  private async sendToIOS(
    device: DeviceRegistration,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.apnsKeyId || !this.apnsTeamId || !this.apnsPrivateKey) {
      logger.warn("APNS not configured, skipping iOS notification");
      return false;
    }

    try {
      // Create APNS payload
      const apnsPayload = {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          badge: payload.data?.badge || 1,
          sound: payload.sound || "default",
          category: payload.category || "dealership",
          "content-available": 1,
          "mutable-content": 1,
        },
        custom_data: payload.data || {},
      };

      // APNS HTTP/2 request removed in Phase 2 - PWA web push only
      logger.warn("APNS functionality disabled in Phase 2");
      return false;
    } catch (error) {
      logger.error("iOS push notification error", {
        error,
        device_id: device.id,
      });
      return false;
    }
  }

  // Android Push Notification (FCM)
  private async sendToAndroid(
    device: DeviceRegistration,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    if (!this.fcmServerKey) {
      logger.warn("FCM not configured, skipping Android notification");
      return false;
    }

    try {
      // Create FCM payload
      const fcmPayload = {
        to: device.device_token,
        priority: this.mapPriorityToFCM(payload.priority),
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "ic_notification",
          color: payload.badge || "#FF0000",
          sound: payload.sound || "default",
          tag: payload.category || "dealership",
          click_action: payload.data?.action_url || "MainActivity",
        },
        data: payload.data || {},
      };

      // FCM functionality removed in Phase 2 - PWA web push only
      logger.warn("FCM functionality disabled in Phase 2");
      return false;
    } catch (error) {
      logger.error("Android push notification error", {
        error,
        device_id: device.id,
      });
      return false;
    }
  }

  // Web Push Notification
  private async sendToWeb(
    device: DeviceRegistration,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    try {
      // Parse subscription from device token
      const subscription = JSON.parse(device.device_token);

      // Create web push payload
      const webPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192x192.svg",
        badge: payload.badge || "/icons/icon-96x96.svg",
        tag: payload.category || "autolab-notification",
        data: payload.data || {},
        actions: payload.actions || [],
      });

      // Send via Web Push
      await webpush.sendNotification(subscription, webPayload);

      logger.info("Web push notification sent successfully", {
        device_id: device.id,
        title: payload.title,
      });

      return true;
    } catch (error) {
      logger.error("Web push notification error", {
        error,
        device_id: device.id,
      });
      return false;
    }
  }

  // APNS HTTP/2 request
  // APNS functionality removed in Phase 2 - PWA web push only

  // FCM HTTP request
  // FCM functionality removed in Phase 2 - PWA web push only

  // Device registration methods
  async registerDevice(
    userId: number,
    deviceToken: string,
    platform: "ios" | "android" | "web",
    deviceInfo: {
      app_version?: string;
      os_version?: string;
      device_model?: string;
      timezone?: string;
      language?: string;
    } = {},
  ): Promise<DeviceRegistration> {
    try {
      // Check if device already exists
      const existingDevice =
        await storage.getDeviceRegistrationByToken(deviceToken);

      if (existingDevice) {
        // Update existing device
        const updatedDevice = await storage.updateDeviceRegistration(
          existingDevice.id,
          {
            user_id: userId,
            last_active: new Date(),
            app_version: deviceInfo.app_version,
            os_version: deviceInfo.os_version,
            device_model: deviceInfo.device_model,
            timezone: deviceInfo.timezone,
            language: deviceInfo.language,
          },
        );

        logger.info("Device registration updated", {
          device_id: updatedDevice.id,
          user_id: userId,
          platform,
        });

        return updatedDevice;
      } else {
        // Create new device registration
        const newDevice = await storage.createDeviceRegistration({
          user_id: userId,
          device_token: deviceToken,
          platform,
          push_enabled: true,
          last_active: new Date(),
          app_version: deviceInfo.app_version,
          os_version: deviceInfo.os_version,
          device_model: deviceInfo.device_model,
          timezone: deviceInfo.timezone,
          language: deviceInfo.language,
        });

        logger.info("Device registration created", {
          device_id: newDevice.id,
          user_id: userId,
          platform,
        });

        return newDevice;
      }
    } catch (error) {
      logger.error("Failed to register device", { error, userId, platform });
      throw error;
    }
  }

  async unregisterDevice(deviceToken: string): Promise<boolean> {
    try {
      const device = await storage.getDeviceRegistrationByToken(deviceToken);

      if (!device) {
        logger.warn("Device not found for unregistration", { deviceToken });
        return false;
      }

      await storage.deleteDeviceRegistration(device.id);

      logger.info("Device unregistered", { device_id: device.id });
      return true;
    } catch (error) {
      logger.error("Failed to unregister device", { error, deviceToken });
      return false;
    }
  }

  async updateDevicePushSettings(
    deviceToken: string,
    pushEnabled: boolean,
  ): Promise<boolean> {
    try {
      const device = await storage.getDeviceRegistrationByToken(deviceToken);

      if (!device) {
        logger.warn("Device not found for push settings update", {
          deviceToken,
        });
        return false;
      }

      await storage.updateDeviceRegistration(device.id, {
        push_enabled: pushEnabled,
      });

      logger.info("Device push settings updated", {
        device_id: device.id,
        push_enabled: pushEnabled,
      });

      return true;
    } catch (error) {
      logger.error("Failed to update device push settings", {
        error,
        deviceToken,
      });
      return false;
    }
  }

  // Utility methods
  private mapPriorityToFCM(priority: string): string {
    switch (priority) {
      case "critical":
      case "urgent":
        return "high";
      default:
        return "normal";
    }
  }

  // Analytics and monitoring
  async getDeviceStats(userId?: number): Promise<{
    total_devices: number;
    active_devices: number;
    by_platform: Record<string, number>;
    push_enabled: number;
    last_24h_registrations: number;
  }> {
    try {
      const devices = userId
        ? await storage.getDeviceRegistrationsByUser(userId)
        : await storage.getDeviceRegistrations();

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const stats = {
        total_devices: devices.length,
        active_devices: 0,
        by_platform: { ios: 0, android: 0, web: 0 },
        push_enabled: 0,
        last_24h_registrations: 0,
      };

      devices.forEach((device: any) => {
        // Count by platform
        if (device.platform in stats.by_platform) {
          stats.by_platform[device.platform as keyof typeof stats.by_platform] =
            (stats.by_platform[
              device.platform as keyof typeof stats.by_platform
            ] || 0) + 1;
        }

        // Count push enabled
        if (device.push_enabled) {
          stats.push_enabled++;
        }

        // Count active (active in last 7 days)
        if (
          device.last_active &&
          new Date(device.last_active) >
            new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        ) {
          stats.active_devices++;
        }

        // Count recent registrations
        if (device.created_at && new Date(device.created_at) > yesterday) {
          stats.last_24h_registrations++;
        }
      });

      return stats;
    } catch (error) {
      logger.error("Failed to get device stats", { error, userId });
      throw error;
    }
  }

  // Test methods for development
  async testNotification(
    userId: number,
    platform: "ios" | "android" | "web",
  ): Promise<boolean> {
    const testPayload: PushNotificationPayload = {
      title: "Test Notification",
      body: "This is a test notification from AUTOLAB",
      icon: "test_icon",
      badge: "#FF0000",
      priority: "medium",
      category: "test",
      data: {
        test: "true",
        timestamp: new Date().toISOString(),
      },
    };

    const result = await this.sendNotification(userId, testPayload);
    return result.success;
  }

  // Configuration methods
  configureFCM(serverKey: string): void {
    this.fcmServerKey = serverKey;
    logger.info("FCM configuration updated");
  }

  configureAPNS(keyId: string, teamId: string, privateKey: string): void {
    this.apnsKeyId = keyId;
    this.apnsTeamId = teamId;
    this.apnsPrivateKey = privateKey;
    logger.info("APNS configuration updated");
  }

  isConfigured(): {
    fcm: boolean;
    apns: boolean;
    vapid: boolean;
  } {
    return {
      fcm: !!this.fcmServerKey,
      apns: !!(this.apnsKeyId && this.apnsTeamId && this.apnsPrivateKey),
      vapid: !!(this.vapidPublicKey && this.vapidPrivateKey),
    };
  }
}

export const mobilePushService = MobilePushService.getInstance();
