import { storage } from "../storage";
import { NOTIFICATION_REGISTRY } from "../config/notificationRegistry";
import logger from "../logger";

export async function validateNotificationPermissions(userId: number, eventType: string): Promise<boolean> {
 try {
  const event = NOTIFICATION_REGISTRY[eventType];
  if (!event) {
   logger.warn(`Unknown event type: ${eventType}`);
   return false;
  }

  const user = await storage.getUserById(userId);
  if (!user) {
   logger.warn(`User not found: ${userId}`);
   return false;
  }

  // Check if user is active
  if (!user.is_active) {
   logger.debug(`User ${userId} is not active`);
   return false;
  }

  // Check role permissions
  if (!event.recipient_criteria.roles.includes(user.role)) {
   logger.debug(
    `User ${userId} role ${user.role} not in allowed roles: ${event.recipient_criteria.roles.join(", ")}`,
   );
   return false;
  }

  // Check page-specific permissions
  const pageKey = event.action_url.replace("/", "");
  const userPermissions = await storage.getUserPermissions(userId);
  const pagePermission = userPermissions.find(p => p.page_key === pageKey);

  if (pagePermission && pagePermission.permission_level === "hidden") {
   logger.debug(`User ${userId} has hidden permission for page ${pageKey}`);
   return false;
  }

  // Check notification preferences
  const preferences = await storage.getNotificationPreferencesByUser(userId);
  if (!preferences) {
   logger.debug(`No preferences found for user ${userId}, defaulting to enabled`);
   return true; // Default to enabled
  }

  // Check global notification settings
  if (!preferences.notifications_enabled || !preferences.push_notifications_enabled) {
   logger.debug(`User ${userId} has disabled global notifications`);
   return false;
  }

  // Check category preferences
  const categoryKey = `${event.category}_notifications`;
  if (preferences[categoryKey] === false) {
   logger.debug(`User ${userId} has disabled ${categoryKey}`);
   return false;
  }

  // Check event-specific preferences
  const eventPreferenceKey = `${eventType.replace(".", "_")}_enabled`;
  if (preferences[eventPreferenceKey] === false) {
   logger.debug(`User ${userId} has disabled ${eventPreferenceKey}`);
   return false;
  }

  logger.debug(`User ${userId} should receive notification for ${eventType}`);
  return true;
 } catch (error) {
  logger.error("Error validating notification permissions:", error);
  return false;
 }
}

export async function getNotificationRecipients(
 eventType: string,
 excludeUserId?: number,
): Promise<number[]> {
 try {
  const event = NOTIFICATION_REGISTRY[eventType];
  if (!event) {
   return [];
  }

  const users = await storage.getUsers();
  const recipients: number[] = [];

  for (const user of users) {
   if (excludeUserId && user.id === excludeUserId) {
    continue;
   }

   const canReceive = await validateNotificationPermissions(user.id, eventType);
   if (canReceive) {
    recipients.push(user.id);
   }
  }

  return recipients;
 } catch (error) {
  logger.error("Error getting notification recipients:", error);
  return [];
 }
}

export function validateEventPayload(eventType: string, payload: any): boolean {
 const event = NOTIFICATION_REGISTRY[eventType];
 if (!event) {
  return false;
 }

 // Basic payload validation
 if (!payload || typeof payload !== "object") {
  return false;
 }

 // Check required fields based on event type
 switch (eventType) {
  case "vehicle.updated":
   return !!(payload.username && payload.registration && payload.field_name);
  case "vehicle.added":
  case "vehicle.sold":
   return !!(payload.username && payload.registration);
  case "vehicle.bought":
   return !!(payload.username && payload.stock_number);
  case "lead.created":
   return !!(payload.username && payload.lead_name);
  case "appointment.booked":
   return !!(payload.username && payload.appointment_date);
  case "job.booked":
   return !!(payload.username && payload.job_type);
  default:
   return true;
 }
}
