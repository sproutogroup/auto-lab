import { db } from "../db";
import {
  notifications,
  notification_preferences,
  device_registrations,
  push_subscriptions,
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type {
  InsertNotification,
  Notification,
  NotificationPreference,
  DeviceRegistration,
  PushSubscription,
} from "../../shared/schema";
import {
  openaiNotificationService,
  SmartNotificationRequest,
} from "./openaiNotificationService";

export class NotificationService {
  // Create smart notification using OpenAI
  async createSmartNotification(
    request: SmartNotificationRequest & { user_id: number },
  ): Promise<Notification> {
    try {
      // Generate intelligent notification content
      const smartContent =
        await openaiNotificationService.generateSmartNotification(request);

      // Create notification with OpenAI-generated content
      const notification: InsertNotification = {
        recipient_user_id: request.user_id,
        notification_type: smartContent.type,
        priority_level: smartContent.priority,
        title: smartContent.title,
        body: smartContent.message,
        action_url: smartContent.actionUrl,
        related_entity_type: request.entityType,
        related_entity_id: request.entityData?.id,
        status: "pending",
        action_data: {
          ai_generated: true,
          confidence: smartContent.metadata?.confidence || 0.8,
          original_context: request.context,
          ...smartContent.metadata,
        },
      };

      const [created] = await db
        .insert(notifications)
        .values(notification)
        .returning();

      // Schedule or deliver immediately
      if (smartContent.scheduledFor) {
        // TODO: Implement scheduled delivery
        console.log(
          `Notification ${created.id} scheduled for ${smartContent.scheduledFor}`,
        );
      } else {
        await this.deliverNotification(created);
      }

      return created;
    } catch (error) {
      console.error("Smart notification creation failed:", error);
      // Fallback to regular notification
      return this.createNotification({
        recipient_user_id: request.user_id,
        notification_type: request.entityType.toLowerCase(),
        priority_level: request.urgency || "medium",
        title: `${request.entityType} Update`,
        body: `New ${request.entityType.toLowerCase()} requires attention`,
        status: "pending",
      });
    }
  }

  // Optimize existing notification content
  async optimizeNotificationContent(
    notificationId: number,
  ): Promise<Notification> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    if (!notification) {
      throw new Error("Notification not found");
    }

    try {
      const optimized =
        await openaiNotificationService.optimizeNotificationContent(
          notification.title,
          notification.body,
          notification.action_data
            ? JSON.stringify(notification.action_data)
            : "",
        );

      const [updated] = await db
        .update(notifications)
        .set({
          title: optimized.title,
          body: optimized.message,
          action_data: {
            ...((notification.action_data as any) || {}),
            optimized: true,
            engagement_score: optimized.engagementScore,
            optimization_timestamp: new Date().toISOString(),
          },
        })
        .where(eq(notifications.id, notificationId))
        .returning();

      return updated;
    } catch (error) {
      console.error("Notification optimization failed:", error);
      return notification;
    }
  }

  // Generate follow-up notifications based on user interaction
  async generateFollowUpNotification(
    originalNotificationId: number,
    userResponse: "read" | "dismissed" | "clicked" | "ignored",
  ): Promise<Notification | null> {
    const [originalNotification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, originalNotificationId));

    if (!originalNotification) {
      return null;
    }

    const timeElapsed =
      Date.now() -
      new Date(originalNotification.created_at || new Date()).getTime();
    const minutesElapsed = Math.floor(timeElapsed / (1000 * 60));

    try {
      const followUp =
        await openaiNotificationService.generateFollowUpNotification(
          originalNotification,
          userResponse,
          minutesElapsed,
        );

      if (!followUp) {
        return null;
      }

      const [created] = await db
        .insert(notifications)
        .values({
          recipient_user_id: originalNotification.recipient_user_id,
          notification_type: followUp.type,
          priority_level: followUp.priority,
          title: followUp.title,
          body: followUp.message,
          action_url: followUp.actionUrl,
          related_entity_type: originalNotification.related_entity_type,
          related_entity_id: originalNotification.related_entity_id,
          status: "pending",
          action_data: {
            follow_up: true,
            original_notification_id: originalNotificationId,
            user_response: userResponse,
            time_elapsed_minutes: minutesElapsed,
            ai_generated: true,
          },
        })
        .returning();

      await this.deliverNotification(created);
      return created;
    } catch (error) {
      console.error("Follow-up generation failed:", error);
      return null;
    }
  }

  // Send notification to a user
  async createNotification(
    notification: InsertNotification,
  ): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();

    // Immediately attempt to deliver
    await this.deliverNotification(created);

    return created;
  }

  // Send notification to multiple users
  async createBulkNotifications(
    userIds: number[],
    notificationData: Omit<InsertNotification, "recipient_user_id">,
  ): Promise<Notification[]> {
    const notificationsList = userIds.map((userId) => ({
      ...notificationData,
      recipient_user_id: userId,
    }));

    const created = await db
      .insert(notifications)
      .values(notificationsList)
      .returning();

    // Deliver all notifications
    await Promise.all(
      created.map((notification) => this.deliverNotification(notification)),
    );

    return created;
  }

  // Get user notifications
  async getUserNotifications(
    userId: number,
    limit: number = 50,
  ): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipient_user_id, userId))
      .orderBy(desc(notifications.created_at))
      .limit(limit);
  }

  // Get unread notifications count
  async getUnreadCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipient_user_id, userId),
          eq(notifications.status, "pending"),
        ),
      );

    return result.count;
  }

  // Mark notification as read
  async markAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        status: "read",
        read_at: sql`now()`,
      })
      .where(eq(notifications.id, notificationId));
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        status: "read",
        read_at: sql`now()`,
      })
      .where(
        and(
          eq(notifications.recipient_user_id, userId),
          eq(notifications.status, "pending"),
        ),
      );
  }

  // Dismiss notification
  async dismissNotification(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({
        status: "dismissed",
        dismissed_at: sql`now()`,
      })
      .where(eq(notifications.id, notificationId));
  }

  // Get user preferences
  async getUserPreferences(
    userId: number,
  ): Promise<NotificationPreference | null> {
    const [preferences] = await db
      .select()
      .from(notification_preferences)
      .where(eq(notification_preferences.user_id, userId))
      .limit(1);

    return preferences || null;
  }

  // Update user preferences
  async updateUserPreferences(
    userId: number,
    preferences: Partial<NotificationPreference>,
  ): Promise<void> {
    await db
      .insert(notification_preferences)
      .values({ user_id: userId, ...preferences })
      .onConflictDoUpdate({
        target: notification_preferences.user_id,
        set: preferences,
      });
  }

  // Get user devices
  async getUserDevices(userId: number): Promise<DeviceRegistration[]> {
    return await db
      .select()
      .from(device_registrations)
      .where(eq(device_registrations.user_id, userId));
  }

  // Get user push subscriptions
  async getUserPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    return await db
      .select()
      .from(push_subscriptions)
      .where(eq(push_subscriptions.user_id, userId));
  }

  // Check if user should receive notification based on preferences
  async shouldReceiveNotification(
    userId: number,
    notification: Notification,
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    if (!preferences || !preferences.notifications_enabled) {
      return false;
    }

    // Check type-specific preferences
    const typePrefs = {
      lead: preferences.sales_notifications,
      sale: preferences.sales_notifications,
      inventory: preferences.inventory_notifications,
      task: preferences.sales_notifications,
      appointment: preferences.inventory_notifications,
      financial: preferences.financial_notifications,
      system: preferences.system_notifications,
    };

    if (
      typePrefs[notification.notification_type as keyof typeof typePrefs] ===
      false
    ) {
      return false;
    }

    // Check priority preferences
    const priorityPrefs = {
      urgent: preferences.urgent_notifications,
      high: preferences.high_notifications,
      medium: preferences.medium_notifications,
      low: preferences.low_notifications,
    };

    if (
      priorityPrefs[
        notification.priority_level as keyof typeof priorityPrefs
      ] === false
    ) {
      return false;
    }

    // Check quiet hours
    if (preferences.quiet_hours_enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const { quiet_hours_start, quiet_hours_end } = preferences;

      if (quiet_hours_start && quiet_hours_end) {
        const isInQuietHours = this.isInQuietHours(
          currentTime,
          quiet_hours_start,
          quiet_hours_end,
        );
        if (isInQuietHours) {
          return false;
        }
      }
    }

    return true;
  }

  // Deliver notification (placeholder for push notification logic)
  private async deliverNotification(notification: Notification): Promise<void> {
    // Check if user should receive this notification
    const shouldReceive = await this.shouldReceiveNotification(
      notification.recipient_user_id,
      notification,
    );

    if (!shouldReceive) {
      // Mark as dismissed if filtered out
      await this.dismissNotification(notification.id);
      return;
    }

    // Mark as delivered (actual push notification delivery will be in Phase 3)
    await db
      .update(notifications)
      .set({
        status: "delivered",
        delivered_at: sql`now()`,
      })
      .where(eq(notifications.id, notification.id));
  }

  // Utility method to check if current time is in quiet hours
  private isInQuietHours(
    currentTime: string,
    startTime: string,
    endTime: string,
  ): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start < end) {
      return current >= start && current <= end;
    } else {
      // Quiet hours cross midnight
      return current >= start || current <= end;
    }
  }

  // Convert time string to minutes
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  // Convenient methods for creating common notification types
  async createLeadNotification(
    userId: number,
    leadId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "lead",
      priority_level: "medium",
      title,
      body: message,
      related_entity_type: "lead",
      related_entity_id: leadId,
      action_url: `/leads/${leadId}`,
    });
  }

  async createSaleNotification(
    userId: number,
    saleId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "sale",
      priority_level: "high",
      title,
      body: message,
      related_entity_type: "sale",
      related_entity_id: saleId,
      action_url: `/sales/${saleId}`,
    });
  }

  async createInventoryNotification(
    userId: number,
    vehicleId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "inventory",
      priority_level: "medium",
      title,
      body: message,
      related_entity_type: "vehicle",
      related_entity_id: vehicleId,
      action_url: `/vehicles/${vehicleId}`,
    });
  }

  async createTaskNotification(
    userId: number,
    taskId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "task",
      priority_level: "medium",
      title,
      body: message,
      related_entity_type: "task",
      related_entity_id: taskId,
      action_url: `/tasks/${taskId}`,
    });
  }

  async createAppointmentNotification(
    userId: number,
    appointmentId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "appointment",
      priority_level: "high",
      title,
      body: message,
      related_entity_type: "appointment",
      related_entity_id: appointmentId,
      action_url: `/appointments/${appointmentId}`,
    });
  }

  async createFinancialNotification(
    userId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "financial",
      priority_level: "urgent",
      title,
      body: message,
      related_entity_type: "financial",
      related_entity_id: null,
    });
  }

  async createSystemNotification(
    userId: number,
    title: string,
    message: string,
  ): Promise<Notification> {
    return this.createNotification({
      recipient_user_id: userId,
      notification_type: "system",
      priority_level: "medium",
      title,
      body: message,
      related_entity_type: "system",
      related_entity_id: null,
    });
  }

  // Send system-wide notification to all users
  async createSystemWideNotification(
    title: string,
    message: string,
  ): Promise<Notification[]> {
    // Get all user IDs
    const userIds = await db
      .select({ id: sql<number>`users.id` })
      .from(sql`users`);

    return this.createBulkNotifications(
      userIds.map((u) => u.id),
      {
        notification_type: "system",
        priority_level: "medium",
        title,
        body: message,
        related_entity_type: "system",
        related_entity_id: null,
      },
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
