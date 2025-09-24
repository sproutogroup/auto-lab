import { apiRequest } from "./queryClient";
import { iosNotificationManager } from "./iosNotifications";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey =
    "BAo_FnrKbB2p6gzRN8xTF65HGV94Xu-TSYf2VfaaISf9_Gn5j91I5X8v_1pb48aRFwV_dZrvUdVSWKRMDDVKHu8"; // Fresh VAPID key - Phase 3.1

  private constructor() {}

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log("=== PWA PUSH NOTIFICATION INITIALIZATION (Phase 3) ===");
      console.log("User Agent:", navigator.userAgent);
      console.log("Location:", window.location.href);

      // Check if we're on iOS Safari
      const isIOSSafari =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      if (isIOSSafari) {
        console.log(
          "iOS Safari detected - initializing iOS notification system",
        );
        await iosNotificationManager.initialize();
        console.log("=== iOS NOTIFICATION SYSTEM INITIALIZED ===");
        return;
      }

      // Check if service workers are supported
      if (!("serviceWorker" in navigator)) {
        console.error("Service workers not supported");
        throw new Error("Service workers not supported");
      }
      console.log("✓ Service workers supported");

      // Check if push notifications are supported
      if (!("PushManager" in window)) {
        console.error("Push notifications not supported");
        throw new Error("Push notifications not supported");
      }
      console.log("✓ Push notifications supported");

      // Check if we're on HTTPS (required for service workers)
      if (location.protocol !== "https:" && location.hostname !== "localhost") {
        console.error("Service workers require HTTPS");
        throw new Error("Service workers require HTTPS");
      }
      console.log("✓ Protocol check passed");

      // Phase 3: Register service worker with enhanced PWA options
      console.log("Registering service worker at /sw.js...");

      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
            updateViaCache: "none",
          },
        );

        console.log("✓ Service Worker registered successfully");
        console.log("Registration:", this.serviceWorkerRegistration);

        // Phase 3: Enhanced PWA service worker message handling
        navigator.serviceWorker.addEventListener("message", (event) => {
          console.log("Message from service worker:", event.data);

          if (event.data.type === "NAVIGATE_TO") {
            // Handle navigation from notification click
            window.location.href = event.data.url;
          }

          if (event.data.type === "SUBSCRIPTION_UPDATE_REQUIRED") {
            // Handle subscription update request
            console.log("Subscription update required - refreshing...");
            this.refreshSubscription();
          }
        });

        if (this.serviceWorkerRegistration.active) {
          console.log(
            "Active SW state:",
            this.serviceWorkerRegistration.active.state,
          );
        }
      } catch (registrationError) {
        console.error("Service Worker registration failed:", registrationError);
        throw new Error(
          `Service Worker registration failed: ${registrationError.message}`,
        );
      }

      // Wait for service worker to be ready
      console.log("Waiting for service worker to be ready...");
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log("✓ Service worker is ready:", registration);

        // Update reference to the ready registration
        this.serviceWorkerRegistration = registration;
      } catch (readyError) {
        console.error("Service Worker ready failed:", readyError);
        throw new Error(`Service Worker ready failed: ${readyError.message}`);
      }

      console.log("=== PWA INITIALIZATION COMPLETE ===");
    } catch (error) {
      console.error("=== PWA INITIALIZATION FAILED ===");
      console.error("Error details:", error);
      throw error;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return "denied";
    }

    let permission = Notification.permission;
    console.log("Initial permission state:", permission);

    if (permission === "default") {
      try {
        // For iOS Safari, we need to handle the permission request differently
        permission = await Notification.requestPermission();
        console.log("Permission after request:", permission);

        // iOS Safari sometimes takes a moment to update the permission state
        // Wait a bit and check again
        if (permission === "default" || permission === "denied") {
          await new Promise((resolve) => setTimeout(resolve, 500));
          permission = Notification.permission;
          console.log("Permission after delay:", permission);
        }

        console.log("Final permission result:", permission);
      } catch (error) {
        console.error("Error requesting permission:", error);
        permission = "denied";
      }
    }

    return permission;
  }

  async subscribeToPushNotifications(userId: number): Promise<boolean> {
    try {
      console.log("Starting push notification subscription...");

      // Check if we're on iOS Safari
      const isIOSSafari =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      if (isIOSSafari) {
        console.log(
          "iOS Safari detected - web push notifications not supported",
        );
        throw new Error("iOS Safari does not support web push notifications");
      }

      // Check if PushManager is supported
      if (!("PushManager" in window)) {
        console.log("PushManager not supported");
        throw new Error("Push notifications not supported in this browser");
      }

      // Request notification permission
      const permission = await this.requestPermission();
      console.log("Permission result:", permission);

      if (permission !== "granted") {
        console.log("Push notification permission denied or default");
        return false;
      }

      if (!this.serviceWorkerRegistration) {
        console.log("Initializing service worker...");
        await this.initialize();
      }

      if (!this.serviceWorkerRegistration) {
        console.error("Service Worker not registered");
        return false;
      }

      // Check if already subscribed
      const existingSubscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("Already subscribed to push notifications");
        // Still send to server to ensure it's registered
        const subscriptionData = {
          user_id: userId,
          endpoint: existingSubscription.endpoint,
          keys_p256dh: existingSubscription.keys.p256dh,
          keys_auth: existingSubscription.keys.auth,
          device_type: this.getDeviceType(),
          user_agent: navigator.userAgent,
        };

        await apiRequest("POST", "/api/push/subscribe", subscriptionData);
        return true;
      }

      console.log("Creating new push subscription...");

      // For iOS Safari, try to create subscription even if permission shows as denied
      // This is a workaround for iOS Safari permission state bug
      try {
        console.log("Creating push subscription with VAPID key...");
        console.log("VAPID key length:", this.vapidPublicKey.length);

        // Create new subscription
        const subscription =
          await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              this.vapidPublicKey,
            ),
          });

        console.log("Push subscription created successfully:", subscription);
        console.log("Subscription endpoint:", subscription.endpoint);

        // Send subscription to server
        const subscriptionData = {
          user_id: userId,
          endpoint: subscription.endpoint,
          keys_p256dh: subscription.keys.p256dh,
          keys_auth: subscription.keys.auth,
          device_type: this.getDeviceType(),
          user_agent: navigator.userAgent,
        };

        console.log("Sending subscription to server...");
        await apiRequest("POST", "/api/push/subscribe", subscriptionData);
        console.log(
          "Push notification subscription sent to server successfully",
        );
        return true;
      } catch (subscriptionError) {
        console.error("Failed to create push subscription:", subscriptionError);
        console.error("Subscription error details:", {
          name: subscriptionError.name,
          message: subscriptionError.message,
          stack: subscriptionError.stack,
        });

        // If subscription fails, it means permission was truly denied
        if (permission !== "granted") {
          console.log("Permission was actually denied");
          return false;
        }

        throw subscriptionError;
      }
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return false;
    }
  }

  async unsubscribeFromPushNotifications(): Promise<boolean> {
    try {
      // Check if we're on iOS Safari
      const isIOSSafari =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      if (isIOSSafari) {
        await iosNotificationManager.disable();
        return true;
      }

      if (!this.serviceWorkerRegistration) {
        return true;
      }

      const subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (!subscription) {
        return true;
      }

      // Unsubscribe from push service
      await subscription.unsubscribe();

      // Remove subscription from server
      await apiRequest("POST", "/api/push/unsubscribe", {
        endpoint: subscription.endpoint,
      });

      console.log("Push notification unsubscription successful");
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      // Check if we're on iOS Safari
      const isIOSSafari =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

      if (isIOSSafari) {
        return iosNotificationManager.isNotificationEnabled();
      }

      if (!this.serviceWorkerRegistration) {
        return false;
      }

      const subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return "iOS";
    } else if (/Android/i.test(userAgent)) {
      return "Android";
    } else if (/Windows/i.test(userAgent)) {
      return "Windows";
    } else if (/Mac/i.test(userAgent)) {
      return "macOS";
    } else {
      return "Desktop";
    }
  }

  // Phase 3: Refresh subscription when needed
  private async refreshSubscription(): Promise<void> {
    try {
      console.log("Refreshing push subscription...");

      if (!this.serviceWorkerRegistration) {
        await this.initialize();
      }

      // Get current subscription
      const subscription =
        await this.serviceWorkerRegistration!.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe old subscription
        await subscription.unsubscribe();
        console.log("Old subscription unsubscribed");
      }

      // Create new subscription
      const newSubscription =
        await this.serviceWorkerRegistration!.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
        });

      console.log("New subscription created:", newSubscription);

      // Send to server
      const subscriptionData = {
        user_id: 1, // This should be dynamic based on current user
        endpoint: newSubscription.endpoint,
        keys_p256dh: newSubscription.keys.p256dh,
        keys_auth: newSubscription.keys.auth,
        device_type: this.getDeviceType(),
        user_agent: navigator.userAgent,
      };

      await apiRequest("POST", "/api/push/subscribe", subscriptionData);
      console.log("Subscription refresh complete");
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
    }
  }

  // Phase 3: Enhanced local notification with PWA features
  async showLocalNotification(
    title: string,
    body: string,
    icon?: string,
  ): Promise<void> {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return;
    }

    const permission = await this.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    // Phase 3: Enhanced notification with PWA-specific options
    const notification = new Notification(title, {
      body,
      icon: icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: "autolab-notification",
      requireInteraction: false,
      data: {
        url: "/",
        timestamp: Date.now(),
      },
    });

    // Phase 3: Handle notification click
    notification.onclick = (event) => {
      console.log("Local notification clicked");
      event.preventDefault();
      window.focus();
      notification.close();
    };
  }

  // Phase 3: Check and request permission on app startup
  async initializeOnAppStartup(userId: number): Promise<void> {
    try {
      console.log("=== PWA APP STARTUP INITIALIZATION ===");

      // Initialize push notification manager
      await this.initialize();

      // Check current permission
      const permission = await this.requestPermission();
      console.log("Permission status:", permission);

      if (permission === "granted") {
        console.log("Permission granted - subscribing to push notifications");
        const subscribed = await this.subscribeToPushNotifications(userId);
        console.log("Subscription result:", subscribed);
      } else {
        console.log("Permission not granted - push notifications disabled");
      }

      console.log("=== PWA APP STARTUP COMPLETE ===");
    } catch (error) {
      console.error("App startup initialization failed:", error);
    }
  }
}

export const pushNotificationManager = PushNotificationManager.getInstance();
