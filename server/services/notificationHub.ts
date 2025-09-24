import { Server as SocketIOServer } from "socket.io";
import { NotificationService } from "./notificationService";
import { MobilePushService } from "./mobilePushService";
import { WebSocketService, WebSocketEvent } from "./websocketService";
import { storage } from "../storage";
import logger from "../logger";
import {
  InsertNotification,
  Notification,
  NotificationTemplate,
  User,
  NotificationPreference,
} from "@shared/schema";

export interface NotificationHubConfig {
  enableWebSocket: boolean;
  enableMobilePush: boolean;
  enableEmailFallback: boolean;
  enableSMSFallback: boolean;
  batchNotifications: boolean;
  maxRetryAttempts: number;
}

export interface NotificationDeliveryStatus {
  notification_id: number;
  user_id: number;
  websocket_delivered: boolean;
  push_delivered: boolean;
  email_delivered: boolean;
  sms_delivered: boolean;
  total_attempts: number;
  last_attempt: Date;
  status: "pending" | "partial" | "delivered" | "failed";
}

export interface NotificationQueueItem {
  id: string;
  notification: InsertNotification;
  user_id: number;
  priority: "low" | "medium" | "high" | "urgent" | "critical";
  delivery_methods: ("websocket" | "push" | "email" | "sms")[];
  scheduled_for?: Date;
  retry_count: number;
  max_retries: number;
  created_at: Date;
  user_preferences: NotificationPreference;
  device_info: any;
}

export class NotificationHub {
  private static instance: NotificationHub;
  private notificationService: NotificationService;
  private mobilePushService: MobilePushService;
  private webSocketService: WebSocketService | null = null;
  private deliveryQueue: Map<string, NotificationQueueItem> = new Map();
  private processingQueue: boolean = false;
  private config: NotificationHubConfig;
  private deliveryStatus: Map<number, NotificationDeliveryStatus> = new Map();
  private userConnectionStatus: Map<number, boolean> = new Map();
  private offlineQueue: Map<number, NotificationQueueItem[]> = new Map();

  private constructor(config: NotificationHubConfig) {
    this.config = config;
    this.notificationService = NotificationService.getInstance();
    this.mobilePushService = MobilePushService.getInstance();

    // Start the queue processor
    this.startQueueProcessor();

    // Initialize periodic cleanup
    this.startCleanupProcessor();

    logger.info("NotificationHub initialized", { config });
  }

  static getInstance(config?: NotificationHubConfig): NotificationHub {
    if (!NotificationHub.instance) {
      const defaultConfig: NotificationHubConfig = {
        enableWebSocket: true,
        enableMobilePush: true,
        enableEmailFallback: true,
        enableSMSFallback: false,
        batchNotifications: true,
        maxRetryAttempts: 3,
      };
      NotificationHub.instance = new NotificationHub(config || defaultConfig);
    }
    return NotificationHub.instance;
  }

  // Initialize WebSocket service reference
  setWebSocketService(webSocketService: WebSocketService): void {
    this.webSocketService = webSocketService;
    logger.info("WebSocket service connected to NotificationHub");
  }

  // Main notification sending method
  async sendNotification(
    templateKey: string,
    userId: number,
    context: Record<string, any> = {},
    options: {
      priority?: "low" | "medium" | "high" | "urgent" | "critical";
      deliveryMethods?: ("websocket" | "push" | "email" | "sms")[];
      scheduledFor?: Date;
      forceDelivery?: boolean;
    } = {},
  ): Promise<{ notification_id: number; queue_id: string }> {
    try {
      // Get user preferences
      const userPreferences = await storage.getUserNotificationSettings(userId);

      // Check if notifications are enabled for user
      if (!userPreferences.notifications_enabled && !options.forceDelivery) {
        throw new Error("Notifications disabled for user");
      }

      // Get notification template
      const template = await storage.getNotificationTemplateByKey(templateKey);
      if (!template) {
        throw new Error(`Template not found: ${templateKey}`);
      }

      // Check user preferences for this category and priority
      if (
        !this.checkUserPreferences(template, userPreferences) &&
        !options.forceDelivery
      ) {
        throw new Error("Notification blocked by user preferences");
      }

      // Create notification object
      const notification: InsertNotification = {
        template_id: template.id,
        template_key: templateKey,
        recipient_user_id: userId,
        sender_user_id: context.sender_user_id,
        notification_type: template.notification_type,
        priority_level: options.priority || template.priority_level,
        title: this.processTemplate(template.title_template, context),
        body: this.processTemplate(template.body_template, context),
        action_url: template.action_url_template
          ? this.processTemplate(template.action_url_template, context)
          : undefined,
        action_data: context.action_data,
        icon_name: template.icon_name,
        badge_color: template.badge_color,
        related_entity_type: context.related_entity_type,
        related_entity_id: context.related_entity_id,
        business_context: context.business_context,
        scheduled_for: options.scheduledFor
          ? options.scheduledFor.toISOString()
          : undefined,
        expires_at: context.expires_at,
        notification_group: context.notification_group,
        thread_id: context.thread_id,
      };

      // Determine delivery methods based on user preferences and options
      const deliveryMethods = this.determineDeliveryMethods(
        userPreferences,
        options.deliveryMethods,
        template,
      );

      // Get device information
      const deviceInfo = await this.getUserDeviceInfo(userId);

      // Create queue item
      const queueId = this.generateQueueId();
      const queueItem: NotificationQueueItem = {
        id: queueId,
        notification,
        user_id: userId,
        priority: options.priority || (template.priority_level as any),
        delivery_methods: deliveryMethods,
        scheduled_for: options.scheduledFor,
        retry_count: 0,
        max_retries: this.config.maxRetryAttempts,
        created_at: new Date(),
        user_preferences: userPreferences,
        device_info: deviceInfo,
      };

      // Add to queue
      this.deliveryQueue.set(queueId, queueItem);

      // Create notification in database
      const createdNotification =
        await storage.createNotification(notification);
      queueItem.notification = {
        ...queueItem.notification,
        id: createdNotification.id,
      };

      // Initialize delivery status
      this.deliveryStatus.set(createdNotification.id, {
        notification_id: createdNotification.id,
        user_id: userId,
        websocket_delivered: false,
        push_delivered: false,
        email_delivered: false,
        sms_delivered: false,
        total_attempts: 0,
        last_attempt: new Date(),
        status: "pending",
      });

      logger.info("Notification queued for delivery", {
        notification_id: createdNotification.id,
        queue_id: queueId,
        user_id: userId,
        template_key: templateKey,
        delivery_methods: deliveryMethods,
      });

      return {
        notification_id: createdNotification.id,
        queue_id: queueId,
      };
    } catch (error) {
      logger.error("Failed to send notification", {
        error,
        templateKey,
        userId,
      });
      throw error;
    }
  }

  // Broadcast notification to multiple users
  async broadcastNotification(
    templateKey: string,
    userIds: number[],
    context: Record<string, any> = {},
    options: {
      priority?: "low" | "medium" | "high" | "urgent" | "critical";
      deliveryMethods?: ("websocket" | "push" | "email" | "sms")[];
      scheduledFor?: Date;
    } = {},
  ): Promise<{ notification_ids: number[]; queue_ids: string[] }> {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        this.sendNotification(templateKey, userId, context, options),
      ),
    );

    const successful = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<any>).value);

    const failed = results
      .filter((result) => result.status === "rejected")
      .map((result) => (result as PromiseRejectedResult).reason);

    if (failed.length > 0) {
      logger.warn("Some broadcast notifications failed", {
        failed_count: failed.length,
      });
    }

    return {
      notification_ids: successful.map((s) => s.notification_id),
      queue_ids: successful.map((s) => s.queue_id),
    };
  }

  // Queue processor - runs continuously
  private async startQueueProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.processingQueue || this.deliveryQueue.size === 0) {
        return;
      }

      this.processingQueue = true;
      try {
        await this.processQueue();
      } catch (error) {
        logger.error("Queue processing failed", { error });
      } finally {
        this.processingQueue = false;
      }
    }, 1000); // Process every second
  }

  private async processQueue(): Promise<void> {
    const now = new Date();
    const itemsToProcess: NotificationQueueItem[] = [];

    // Get items ready for processing
    for (const [queueId, item] of this.deliveryQueue) {
      if (item.scheduled_for && item.scheduled_for > now) {
        continue; // Not ready yet
      }

      itemsToProcess.push(item);
    }

    // Sort by priority
    itemsToProcess.sort((a, b) => {
      const priorityOrder = {
        critical: 0,
        urgent: 1,
        high: 2,
        medium: 3,
        low: 4,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process items
    for (const item of itemsToProcess) {
      try {
        await this.processNotificationItem(item);
      } catch (error) {
        logger.error("Failed to process notification item", {
          error,
          queue_id: item.id,
          notification_id: item.notification.id,
        });
      }
    }
  }

  private async processNotificationItem(
    item: NotificationQueueItem,
  ): Promise<void> {
    const deliveryStatus = this.deliveryStatus.get(item.notification.id!);
    if (!deliveryStatus) {
      logger.error("Delivery status not found", {
        notification_id: item.notification.id,
      });
      return;
    }

    deliveryStatus.total_attempts++;
    deliveryStatus.last_attempt = new Date();

    let anyDelivered = false;

    // Try WebSocket delivery first (fastest)
    if (
      item.delivery_methods.includes("websocket") &&
      !deliveryStatus.websocket_delivered
    ) {
      try {
        if (await this.deliverViaWebSocket(item)) {
          deliveryStatus.websocket_delivered = true;
          anyDelivered = true;
        }
      } catch (error) {
        logger.error("WebSocket delivery failed", {
          error,
          notification_id: item.notification.id,
        });
      }
    }

    // Try push notification delivery
    if (
      item.delivery_methods.includes("push") &&
      !deliveryStatus.push_delivered
    ) {
      try {
        if (await this.deliverViaPush(item)) {
          deliveryStatus.push_delivered = true;
          anyDelivered = true;
        }
      } catch (error) {
        logger.error("Push delivery failed", {
          error,
          notification_id: item.notification.id,
        });
      }
    }

    // Try email delivery (if enabled and other methods failed)
    if (
      item.delivery_methods.includes("email") &&
      !deliveryStatus.email_delivered
    ) {
      try {
        if (await this.deliverViaEmail(item)) {
          deliveryStatus.email_delivered = true;
          anyDelivered = true;
        }
      } catch (error) {
        logger.error("Email delivery failed", {
          error,
          notification_id: item.notification.id,
        });
      }
    }

    // Try SMS delivery (if enabled and other methods failed)
    if (
      item.delivery_methods.includes("sms") &&
      !deliveryStatus.sms_delivered
    ) {
      try {
        if (await this.deliverViaSMS(item)) {
          deliveryStatus.sms_delivered = true;
          anyDelivered = true;
        }
      } catch (error) {
        logger.error("SMS delivery failed", {
          error,
          notification_id: item.notification.id,
        });
      }
    }

    // Update delivery status
    if (anyDelivered) {
      if (deliveryStatus.websocket_delivered || deliveryStatus.push_delivered) {
        deliveryStatus.status = "delivered";
        this.deliveryQueue.delete(item.id);
      } else {
        deliveryStatus.status = "partial";
      }
    } else {
      // Handle retry logic
      if (item.retry_count < item.max_retries) {
        item.retry_count++;
        item.scheduled_for = new Date(
          Date.now() + Math.pow(2, item.retry_count) * 1000,
        ); // Exponential backoff
        logger.info("Retrying notification delivery", {
          notification_id: item.notification.id,
          retry_count: item.retry_count,
        });
      } else {
        deliveryStatus.status = "failed";
        this.deliveryQueue.delete(item.id);
        logger.error("Notification delivery failed after max retries", {
          notification_id: item.notification.id,
        });
      }
    }

    // Update notification status in database
    await storage.updateNotification(item.notification.id!, {
      status: deliveryStatus.status,
      delivered_at: anyDelivered ? new Date().toISOString() : undefined,
      failure_reason:
        deliveryStatus.status === "failed" ? "Max retries exceeded" : undefined,
    });
  }

  // Delivery methods
  private async deliverViaWebSocket(
    item: NotificationQueueItem,
  ): Promise<boolean> {
    if (!this.webSocketService) {
      return false;
    }

    try {
      // Check if user is online
      const isOnline = this.userConnectionStatus.get(item.user_id) || false;

      if (!isOnline) {
        // Add to offline queue
        this.addToOfflineQueue(item);
        return false;
      }

      // Send via WebSocket
      const payload = {
        event: WebSocketEvent.NOTIFICATION_CREATED,
        data: {
          notification: item.notification,
          title: item.notification.title,
          body: item.notification.body,
          icon: item.notification.icon_name,
          action_url: item.notification.action_url,
          priority: item.priority,
          related_entity_type: item.notification.related_entity_type,
          related_entity_id: item.notification.related_entity_id,
        },
        user_id: item.user_id,
        timestamp: new Date().toISOString(),
      };

      await this.webSocketService.sendToUser(item.user_id, payload);

      logger.info("Notification delivered via WebSocket", {
        notification_id: item.notification.id,
        user_id: item.user_id,
      });

      return true;
    } catch (error) {
      logger.error("WebSocket delivery failed", {
        error,
        notification_id: item.notification.id,
      });
      return false;
    }
  }

  private async deliverViaPush(item: NotificationQueueItem): Promise<boolean> {
    try {
      return await this.mobilePushService.sendNotification(item.user_id, {
        title: item.notification.title,
        body: item.notification.body,
        icon: item.notification.icon_name,
        badge: item.notification.badge_color,
        data: {
          notification_id: item.notification.id,
          action_url: item.notification.action_url,
          related_entity_type: item.notification.related_entity_type,
          related_entity_id: item.notification.related_entity_id,
        },
        priority: item.priority,
        category: item.notification.template_key,
      });
    } catch (error) {
      logger.error("Push delivery failed", {
        error,
        notification_id: item.notification.id,
      });
      return false;
    }
  }

  private async deliverViaEmail(item: NotificationQueueItem): Promise<boolean> {
    // Email delivery implementation would go here
    // For now, we'll simulate it
    logger.info("Email delivery simulated", {
      notification_id: item.notification.id,
    });
    return true;
  }

  private async deliverViaSMS(item: NotificationQueueItem): Promise<boolean> {
    // SMS delivery implementation would go here
    // For now, we'll simulate it
    logger.info("SMS delivery simulated", {
      notification_id: item.notification.id,
    });
    return true;
  }

  // Utility methods
  private determineDeliveryMethods(
    userPreferences: NotificationPreference,
    requestedMethods?: ("websocket" | "push" | "email" | "sms")[],
    template?: NotificationTemplate,
  ): ("websocket" | "push" | "email" | "sms")[] {
    const methods: ("websocket" | "push" | "email" | "sms")[] = [];

    if (requestedMethods) {
      return requestedMethods;
    }

    // Default priority: WebSocket > Push > Email > SMS
    if (
      userPreferences.in_app_notifications ||
      userPreferences.notifications_enabled
    ) {
      methods.push("websocket");
    }

    if (userPreferences.push_notifications) {
      methods.push("push");
    }

    if (userPreferences.email_notifications) {
      methods.push("email");
    }

    if (userPreferences.sms_notifications) {
      methods.push("sms");
    }

    return methods.length > 0 ? methods : ["websocket", "push"];
  }

  private checkUserPreferences(
    template: NotificationTemplate,
    preferences: NotificationPreference,
  ): boolean {
    // Check category preferences
    switch (template.template_category) {
      case "sales":
        return preferences.sales_notifications;
      case "inventory":
        return preferences.inventory_notifications;
      case "customer":
        return preferences.customer_notifications;
      case "financial":
        return preferences.financial_notifications;
      case "system":
        return preferences.system_notifications;
      default:
        return true;
    }
  }

  private processTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    let processed = template;

    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      processed = processed.replace(regex, String(value));
    }

    return processed;
  }

  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getUserDeviceInfo(userId: number): Promise<any> {
    try {
      // Get device registrations for user
      const devices =
        await this.notificationService.storage.getUserActiveDevices(userId);
      const subscriptions =
        await this.notificationService.storage.getPushSubscriptionsByUser(
          userId,
        );

      return {
        device_count: devices.length,
        platforms: devices.map((d) => d.platform),
        push_enabled: devices.some((d) => d.push_enabled),
        devices: devices,
        subscriptions: subscriptions,
        hasWebPush: subscriptions.length > 0,
        hasDeviceRegistrations: devices.length > 0,
        totalDevices: devices.length + subscriptions.length,
      };
    } catch (error) {
      logger.error("Failed to get user device info", { error, userId });
      return {
        device_count: 0,
        platforms: [],
        push_enabled: false,
        devices: [],
        subscriptions: [],
        hasWebPush: false,
        hasDeviceRegistrations: false,
        totalDevices: 0,
      };
    }
  }

  private addToOfflineQueue(item: NotificationQueueItem): void {
    if (!this.offlineQueue.has(item.user_id)) {
      this.offlineQueue.set(item.user_id, []);
    }
    this.offlineQueue.get(item.user_id)!.push(item);
  }

  // User connection status methods
  updateUserConnectionStatus(userId: number, isOnline: boolean): void {
    this.userConnectionStatus.set(userId, isOnline);

    if (isOnline) {
      // Process offline queue
      this.processOfflineQueue(userId);
    }
  }

  private async processOfflineQueue(userId: number): Promise<void> {
    const offlineItems = this.offlineQueue.get(userId);
    if (!offlineItems || offlineItems.length === 0) {
      return;
    }

    logger.info("Processing offline queue for user", {
      userId,
      count: offlineItems.length,
    });

    for (const item of offlineItems) {
      // Add back to main queue for processing
      this.deliveryQueue.set(item.id, item);
    }

    // Clear offline queue
    this.offlineQueue.delete(userId);
  }

  // Cleanup processor
  private startCleanupProcessor(): void {
    setInterval(
      () => {
        this.cleanupExpiredNotifications();
      },
      60 * 60 * 1000,
    ); // Every hour
  }

  private cleanupExpiredNotifications(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [queueId, item] of this.deliveryQueue) {
      // Remove items older than 24 hours
      if (now.getTime() - item.created_at.getTime() > 24 * 60 * 60 * 1000) {
        this.deliveryQueue.delete(queueId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info("Cleaned up expired notifications", { count: cleanedCount });
    }
  }

  // Analytics and monitoring
  getQueueStats(): {
    total_queued: number;
    by_priority: Record<string, number>;
    by_user: Record<number, number>;
    processing: boolean;
  } {
    const stats = {
      total_queued: this.deliveryQueue.size,
      by_priority: { critical: 0, urgent: 0, high: 0, medium: 0, low: 0 },
      by_user: {} as Record<number, number>,
      processing: this.processingQueue,
    };

    for (const item of this.deliveryQueue.values()) {
      stats.by_priority[item.priority]++;
      stats.by_user[item.user_id] = (stats.by_user[item.user_id] || 0) + 1;
    }

    return stats;
  }

  getDeliveryStats(): {
    total_processed: number;
    success_rate: number;
    by_method: Record<string, number>;
  } {
    const stats = {
      total_processed: this.deliveryStatus.size,
      success_rate: 0,
      by_method: { websocket: 0, push: 0, email: 0, sms: 0 },
    };

    let successful = 0;
    for (const status of this.deliveryStatus.values()) {
      if (status.status === "delivered") {
        successful++;
      }
      if (status.websocket_delivered) stats.by_method.websocket++;
      if (status.push_delivered) stats.by_method.push++;
      if (status.email_delivered) stats.by_method.email++;
      if (status.sms_delivered) stats.by_method.sms++;
    }

    stats.success_rate =
      stats.total_processed > 0
        ? (successful / stats.total_processed) * 100
        : 0;

    return stats;
  }
}

export const notificationHub = NotificationHub.getInstance();
