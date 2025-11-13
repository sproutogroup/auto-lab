#!/usr/bin/env node

/**
 * Test WebPushService directly
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";

// Test the WebPushService directly
console.log("=== Phase 2 WebPushService Test ===");

// Test 1: VAPID Configuration
console.log("\n1. Testing VAPID Configuration:");
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

console.log("VAPID_PUBLIC_KEY:", vapidPublic ? "SET (" + vapidPublic.substring(0, 20) + "...)" : "NOT SET");
console.log(
 "VAPID_PRIVATE_KEY:",
 vapidPrivate ? "SET (" + vapidPrivate.substring(0, 10) + "...)" : "NOT SET",
);
console.log("VAPID_SUBJECT:", vapidSubject);

// Test 2: web-push library
console.log("\n2. Testing web-push library:");
try {
 const webpush = await import("web-push");
 webpush.default.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
 console.log("✅ web-push library configured successfully");
} catch (error) {
 console.log("❌ web-push configuration failed:", error.message);
}

// Test 3: WebPushService initialization
console.log("\n3. Testing WebPushService initialization:");
try {
 const { WebPushService } = await import("./server/services/webPushService.js");
 const service = WebPushService.getInstance();
 console.log("✅ WebPushService initialized successfully");
 console.log("Service methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(service)));
} catch (error) {
 console.log("❌ WebPushService initialization failed:", error.message);
}

// Test 4: Database subscription
console.log("\n4. Testing database subscription:");
try {
 const { execSync } = await import("child_process");
 const result = execSync('psql $DATABASE_URL -c "SELECT * FROM push_subscriptions WHERE id = 1;"', {
  encoding: "utf8",
 });
 console.log("Database subscription found:", result.includes("test-endpoint-for-debug"));
} catch (error) {
 console.log("❌ Database query failed:", error.message);
}

// Test 5: Send test notification
console.log("\n5. Testing WebPushService.testSend:");
try {
 const { webPushService } = await import("./server/services/webPushService.js");
 const result = await webPushService.testSend(1);
 console.log("✅ Test send result:", result);
} catch (error) {
 console.log("❌ Test send failed:", error.message);
}

console.log("\n=== Test Complete ===");
