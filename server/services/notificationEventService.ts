import { WebPushService } from "./webPushService";
import { storage } from "../storage";
import {
  NOTIFICATION_REGISTRY,
  NotificationEventConfig,
} from "../config/notificationRegistry";
import {
  InsertNotification,
  User,
  NotificationPreference,
} from "../../shared/schema";
// import { io } from './websocketService';
import logger from "../logger";

export class NotificationEventService {
  private webPushService: WebPushService;

  constructor() {
    this.webPushService = WebPushService.getInstance();
  }

  async triggerEvent(
    eventType: string,
    payload: any,
    triggeredBy: number,
  ): Promise<void> {
    try {
      logger.info(`Triggering notification event: ${eventType}`, {
        payload,
        triggeredBy,
      });

      const event = NOTIFICATION_REGISTRY[eventType];
      if (!event) {
        logger.warn(`Unknown event type: ${eventType}`);
        return;
      }

      const recipients = await this.getRecipients(event.recipient_criteria);
      logger.info(
        `Found ${recipients.length} potential recipients for ${eventType}`,
      );

      for (const recipient of recipients) {
        if (recipient.id === triggeredBy) {
          logger.debug(
            `Skipping notification for triggering user: ${recipient.id}`,
          );
          continue;
        }

        const shouldNotify = await this.shouldNotifyUser(
          recipient.id,
          eventType,
        );
        if (!shouldNotify) {
          logger.debug(
            `User ${recipient.id} should not be notified for ${eventType}`,
          );
          continue;
        }

        // Create notification record
        const notification = await this.createNotificationRecord(
          event,
          payload,
          recipient.id,
        );

        // Send push notification
        await this.sendPushNotification(recipient.id, notification);

        // Send WebSocket notification (fallback)
        await this.sendWebSocketNotification(recipient.id, notification);
      }
    } catch (error) {
      logger.error("Error triggering notification event:", error);
      throw error;
    }
  }

  private async getRecipients(
    criteria: NotificationEventConfig["recipient_criteria"],
  ): Promise<User[]> {
    try {
      const users = await storage.getUsers();
      return users.filter((user) => {
        // Check if user has required role
        if (!criteria.roles.includes(user.role)) {
          return false;
        }

        // Check if user is active
        if (!user.is_active) {
          return false;
        }

        return true;
      });
    } catch (error) {
      logger.error("Error getting recipients:", error);
      return [];
    }
  }

  private async shouldNotifyUser(
    userId: number,
    eventType: string,
  ): Promise<boolean> {
    try {
      const event = NOTIFICATION_REGISTRY[eventType];
      if (!event) return false;

      const users = await storage.getUsers();
      const user = users.find((u) => u.id === userId);
      if (!user) return false;

      // Check role permissions
      if (!event.recipient_criteria.roles.includes(user.role)) {
        return false;
      }

      // Check page-specific permissions
      const pageKey = event.action_url.replace("/", "");
      try {
        const userPermissions = await storage.getUserPermissions(userId);
        const pagePermission = userPermissions.find(
          (p) => p.page_key === pageKey,
        );

        if (pagePermission && pagePermission.permission_level === "hidden") {
          return false;
        }
      } catch (error) {
        logger.warn(
          `Could not check user permissions for user ${userId}: ${error}`,
        );
        // Continue with notification if permissions check fails
      }

      // Check notification preferences
      try {
        const preferences =
          await storage.getNotificationPreferencesByUser(userId);
        if (!preferences) return true; // Default to enabled

        // Check global notification settings
        if (
          !preferences.notifications_enabled ||
          !preferences.push_notifications_enabled
        ) {
          return false;
        }

        // Check event-specific preferences
        const eventKey = `${eventType.replace(".", "_")}_enabled`;
        if (eventKey in preferences && !(preferences as any)[eventKey]) {
          return false;
        }
      } catch (error) {
        logger.warn(
          `Could not check notification preferences for user ${userId}: ${error}`,
        );
        // Continue with notification if preferences check fails
      }

      return true;
    } catch (error) {
      logger.error("Error checking if user should be notified:", error);
      return false;
    }
  }

  private async createNotificationRecord(
    event: NotificationEventConfig,
    payload: any,
    recipientId: number,
  ): Promise<any> {
    try {
      const notification: InsertNotification = {
        recipient_user_id: recipientId,
        notification_type: event.category,
        priority_level: event.priority,
        title: this.populateTemplate(event.title_template, payload),
        body: this.populateTemplate(event.body_template, payload),
        action_url: event.action_url,
        related_entity_type: event.entity_type,
        related_entity_id: payload.entity_id,
        action_data: payload.data || {},
      };

      const createdNotification =
        await storage.createNotification(notification);
      logger.info(`Created notification record: ${createdNotification.id}`);
      return createdNotification;
    } catch (error) {
      logger.error("Error creating notification record:", error);
      throw error;
    }
  }

  private populateTemplate(template: string, payload: any): string {
    let result = template;

    // Replace placeholders with actual values
    Object.keys(payload).forEach((key) => {
      const placeholder = `{${key}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder, "g"),
          payload[key] || "",
        );
      }
    });

    return result;
  }

  private async sendPushNotification(
    userId: number,
    notification: any,
  ): Promise<void> {
    try {
      const subscriptions = await storage.getPushSubscriptionsByUser(userId);

      for (const subscription of subscriptions) {
        await this.webPushService.sendWebPush(subscription, {
          title: notification.title,
          body: notification.body,
          icon: "/assets/icon-192.png",
          badge: "/icons/badge-72x72.png",
          tag: `notification-${notification.id}`,
          data: {
            notification_id: notification.id,
            url: notification.action_url,
            timestamp: Date.now(),
            ...notification.action_data,
          },
        });
      }
    } catch (error) {
      logger.error("Error sending push notification:", error);
    }
  }

  private async sendWebSocketNotification(
    userId: number,
    notification: any,
  ): Promise<void> {
    try {
      // TODO: Re-enable WebSocket notifications after fixing import issue
      // const userSockets = Array.from(io.sockets.sockets.values()).filter(
      //   socket => socket.data.userId === userId
      // );

      // const notificationData = {
      //   id: notification.id,
      //   type: notification.notification_type,
      //   title: notification.title,
      //   body: notification.body,
      //   timestamp: notification.created_at,
      //   action_url: notification.action_url,
      //   priority: notification.priority_level
      // };

      // for (const socket of userSockets) {
      //   socket.emit('notification', notificationData);
      // }

      logger.info(
        `WebSocket notification disabled temporarily for user ${userId}`,
      );
    } catch (error) {
      logger.error("Error sending WebSocket notification:", error);
    }
  }
}

export const notificationEventService = new NotificationEventService();
