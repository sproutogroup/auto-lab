import webpush from "web-push";
import { storage } from "../storage";
import logger from "../logger";

export interface WebPushSubscription {
 id: number;
 user_id: number;
 endpoint: string;
 keys_p256dh: string;
 keys_auth: string;
 is_active: boolean;
}

export interface NotificationPayload {
 title: string;
 body: string;
 icon?: string;
 badge?: string;
 tag?: string;
 data?: Record<string, any>;
 actions?: Array<{
  action: string;
  title: string;
  icon?: string;
 }>;
}

export interface WebPushResult {
 success: boolean;
 subscription_id: number;
 error?: string;
 retry_count?: number;
}

export class WebPushService {
 private static instance: WebPushService;
 private vapidPublicKey: string;
 private vapidPrivateKey: string;
 private vapidSubject: string;

 private constructor() {
  this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
  this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
  this.vapidSubject = process.env.VAPID_SUBJECT || "";

  if (!this.vapidPublicKey || !this.vapidPrivateKey || !this.vapidSubject) {
   throw new Error("VAPID configuration missing - check environment variables");
  }

  // Configure web-push with VAPID details
  webpush.setVapidDetails(
   this.vapidSubject,
   this.vapidPublicKey,
   this.vapidPrivateKey
  );

  logger.info("WebPushService initialized", {
   vapid_subject: this.vapidSubject,
   vapid_configured: true,
  });
 }

 static getInstance(): WebPushService {
  if (!WebPushService.instance) {
   WebPushService.instance = new WebPushService();
  }
  return WebPushService.instance;
 }

 /**
  * Send web push notification to a single subscription
  */
 async sendWebPush(
  subscription: WebPushSubscription,
  payload: NotificationPayload
 ): Promise<WebPushResult> {
  try {
   // Construct web push subscription object
   const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
     p256dh: subscription.keys_p256dh,
     auth: subscription.keys_auth,
    },
   };

   // Prepare notification payload
   const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-96x96.png",
    tag: payload.tag || "autolab-notification",
    data: {
     ...payload.data,
     timestamp: Date.now(),
     url: payload.data?.url || "/",
    },
    actions: payload.actions || [],
   });

   // Send the notification
   await webpush.sendNotification(pushSubscription, notificationPayload, {
    vapidDetails: {
     subject: this.vapidSubject,
     publicKey: this.vapidPublicKey,
     privateKey: this.vapidPrivateKey,
    },
    TTL: 60 * 60 * 24, // 24 hours
    urgency: "normal",
   });

   logger.info("Web push notification sent successfully", {
    subscription_id: subscription.id,
    user_id: subscription.user_id,
    title: payload.title,
   });

   return {
    success: true,
    subscription_id: subscription.id,
   };
  } catch (error: any) {
   return await this.handleWebPushError(error, subscription);
  }
 }

 /**
  * Handle web push errors with appropriate actions
  */
 private async handleWebPushError(
  error: any,
  subscription: WebPushSubscription
 ): Promise<WebPushResult> {
  const statusCode = error.statusCode || error.status || 0;
  const errorMessage = error.message || "Unknown error";

  logger.error("Web push notification failed", {
   subscription_id: subscription.id,
   user_id: subscription.user_id,
   status_code: statusCode,
   error: errorMessage,
   endpoint: subscription.endpoint,
  });

  // Handle specific error cases
  switch (statusCode) {
   case 404:
   case 410:
    // Subscription no longer valid - mark for cleanup
    await this.markSubscriptionInactive(subscription.id);
    logger.info("Subscription marked inactive due to 404/410 error", {
     subscription_id: subscription.id,
    });
    break;

   case 413:
    // Payload too large
    logger.warn("Notification payload too large", {
     subscription_id: subscription.id,
    });
    break;

   case 429:
    // Rate limited
    logger.warn("Rate limited by push service", {
     subscription_id: subscription.id,
    });
    break;

   default:
    // Other errors - log for investigation
    logger.error("Unexpected web push error", {
     subscription_id: subscription.id,
     status_code: statusCode,
     error: errorMessage,
    });
  }

  return {
   success: false,
   subscription_id: subscription.id,
   error: errorMessage,
  };
 }

 /**
  * Mark a subscription as inactive in the database
  */
 private async markSubscriptionInactive(subscriptionId: number): Promise<void> {
  try {
   // Update push_subscriptions table to mark as inactive
   await storage.updatePushSubscription(subscriptionId, {
    is_active: false,
   });

   logger.info("Subscription marked inactive due to 404/410 error", {
    subscription_id: subscriptionId,
   });
  } catch (error) {
   logger.error("Failed to mark subscription inactive", {
    subscription_id: subscriptionId,
    error: (error as Error).message,
   });
  }
 }

 /**
  * Get active push subscriptions for a user
  */
 async getUserSubscriptions(userId: number): Promise<WebPushSubscription[]> {
  try {
   const subscriptions = await storage.getActivePushSubscriptions(userId);
   return subscriptions.map((sub) => ({
    id: sub.id,
    user_id: sub.user_id,
    endpoint: sub.endpoint,
    keys_p256dh: sub.keys_p256dh,
    keys_auth: sub.keys_auth,
    is_active: sub.is_active,
   }));
  } catch (error) {
   logger.error("Failed to get user subscriptions", {
    user_id: userId,
    error: (error as Error).message,
   });
   return [];
  }
 }

 /**
  * Send notification to all user subscriptions
  */
 async sendToUser(
  userId: number,
  payload: NotificationPayload
 ): Promise<{ sent: number; failed: number; errors: string[] }> {
  const subscriptions = await this.getUserSubscriptions(userId);

  if (subscriptions.length === 0) {
   logger.warn("No active subscriptions for user", { user_id: userId });
   return { sent: 0, failed: 0, errors: ["No active subscriptions"] };
  }

  const results = await Promise.allSettled(
   subscriptions.map((sub) => this.sendWebPush(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  results.forEach((result, index) => {
   if (result.status === "fulfilled" && result.value.success) {
    sent++;
   } else {
    failed++;
    const error =
     result.status === "rejected" ? result.reason?.message : result.value.error;
    errors.push(`Subscription ${subscriptions[index].id}: ${error}`);
   }
  });

  logger.info("Bulk notification send completed", {
   user_id: userId,
   total_subscriptions: subscriptions.length,
   sent,
   failed,
  });

  return { sent, failed, errors };
 }

 /**
  * Test method for debugging
  */
 async testSend(subscriptionId: number): Promise<WebPushResult> {
  try {
   const subscription = await storage.getPushSubscriptionById(subscriptionId);
   if (!subscription) {
    return {
     success: false,
     subscription_id: subscriptionId,
     error: "Subscription not found",
    };
   }

   const testPayload: NotificationPayload = {
    title: "Test Notification",
    body: "Phase 2 live - WebPushService working!",
    icon: "/icons/icon-192x192.png",
    data: {
     test: true,
     timestamp: new Date().toISOString(),
    },
   };

   return await this.sendWebPush(subscription, testPayload);
  } catch (error) {
   return {
    success: false,
    subscription_id: subscriptionId,
    error: (error as Error).message,
   };
  }
 }
}

export const webPushService = WebPushService.getInstance();
