/**
 * Background job to cleanup duplicate push subscriptions
 * This ensures users don't receive multiple notifications for the same endpoint
 */

import { storage } from "../storage.js";
import { logger } from "../utils/logger.js";

export async function cleanupDuplicateSubscriptions() {
 try {
  logger.info("Starting cleanup of duplicate push subscriptions");

  // Get all users
  const users = await storage.getUsers();

  for (const user of users) {
   await storage.cleanupOldSubscriptions(user.id);
  }

  logger.info(`Cleaned up duplicate subscriptions for ${users.length} users`);
 } catch (error) {
  logger.error("Error cleaning up duplicate subscriptions:", error);
 }
}

// Run cleanup every hour
setInterval(cleanupDuplicateSubscriptions, 60 * 60 * 1000);
