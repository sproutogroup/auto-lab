// iOS Safari Local Notification System
export class IOSNotificationManager {
 private static instance: IOSNotificationManager;
 private isEnabled: boolean = false;
 private userId: number | null = null;

 private constructor() {
  this.loadSettings();
 }

 static getInstance(): IOSNotificationManager {
  if (!IOSNotificationManager.instance) {
   IOSNotificationManager.instance = new IOSNotificationManager();
  }
  return IOSNotificationManager.instance;
 }

 private loadSettings(): void {
  const enabled = localStorage.getItem("ios_notifications_enabled") === "true";
  const userId = localStorage.getItem("ios_user_id");

  this.isEnabled = enabled;
  this.userId = userId ? parseInt(userId) : null;
 }

 async initialize(): Promise<void> {
  // Check if we're on iOS Safari
  const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (!isIOSSafari) {
   console.log("Not iOS Safari, skipping iOS notification setup");
   return;
  }

  // Check if notifications are supported
  if (!("Notification" in window)) {
   console.log("Notifications not supported on this device");
   return;
  }

  // If already enabled, set up periodic checks
  if (this.isEnabled && this.userId) {
   this.setupPeriodicChecks();
  }
 }

 async enable(userId: number): Promise<boolean> {
  try {
   const permission = await Notification.requestPermission();

   if (permission === "granted") {
    this.isEnabled = true;
    this.userId = userId;

    // Store settings
    localStorage.setItem("ios_notifications_enabled", "true");
    localStorage.setItem("ios_user_id", userId.toString());

    // Setup periodic checks
    this.setupPeriodicChecks();

    return true;
   }

   return false;
  } catch (error) {
   console.error("Error enabling iOS notifications:", error);
   return false;
  }
 }

 async disable(): Promise<void> {
  this.isEnabled = false;
  this.userId = null;

  // Clear settings
  localStorage.removeItem("ios_notifications_enabled");
  localStorage.removeItem("ios_user_id");

  // Clear any existing intervals
  this.clearPeriodicChecks();
 }

 private setupPeriodicChecks(): void {
  // Check for new notifications every 30 seconds when app is active
  setInterval(() => {
   if (document.visibilityState === "visible" && this.isEnabled && this.userId) {
    this.checkForNotifications();
   }
  }, 30000);
 }

 private clearPeriodicChecks(): void {
  // Clear all intervals (simplified for now)
  // In a real implementation, you'd store interval IDs
 }

 private async checkForNotifications(): Promise<void> {
  try {
   const response = await fetch("/api/notifications/pending", {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
    },
   });

   if (response.ok) {
    const notifications = await response.json();

    // Show local notifications for any pending notifications
    for (const notification of notifications) {
     this.showLocalNotification(notification.title, notification.body);

     // Mark as delivered
     await fetch(`/api/notifications/${notification.id}/delivered`, {
      method: "POST",
     });
    }
   }
  } catch (error) {
   console.error("Error checking for notifications:", error);
  }
 }

 showLocalNotification(title: string, body: string, icon?: string): void {
  if (!this.isEnabled || Notification.permission !== "granted") {
   return;
  }

  try {
   const notification = new Notification(title, {
    body,
    icon: icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: "autolab-ios-notification",
    requireInteraction: false,
    silent: false,
   });

   // Auto-close after 5 seconds
   setTimeout(() => {
    notification.close();
   }, 5000);

   // Handle click
   notification.onclick = () => {
    window.focus();
    notification.close();
   };
  } catch (error) {
   console.error("Error showing local notification:", error);
  }
 }

 isNotificationEnabled(): boolean {
  return this.isEnabled;
 }
}

export const iosNotificationManager = IOSNotificationManager.getInstance();
