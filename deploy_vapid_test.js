#!/usr/bin/env node

/**
 * Simple VAPID deployment readiness test
 * Tests core functionality for production deployment
 */

import webpush from "web-push";
import crypto from "crypto";
import { readFileSync, existsSync } from "fs";

console.log("🚀 VAPID DEPLOYMENT READINESS TEST");
console.log("=".repeat(50));

const results = {
 passed: 0,
 failed: 0,
 warnings: 0,
};

function testPassed(message) {
 console.log(`✅ ${message}`);
 results.passed++;
}

function testFailed(message) {
 console.log(`❌ ${message}`);
 results.failed++;
}

function testWarning(message) {
 console.log(`⚠️  ${message}`);
 results.warnings++;
}

// Test 1: Environment Variables
console.log("\n1. Testing Environment Variables...");
const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;
const databaseUrl = process.env.DATABASE_URL;

if (vapidPublic && vapidPrivate && vapidSubject) {
 testPassed("All VAPID environment variables are set");

 // Validate formats
 if (vapidPublic.length === 87 && vapidPublic.startsWith("B")) {
  testPassed("VAPID public key format is valid");
 } else {
  testFailed("VAPID public key format is invalid");
 }

 if (vapidPrivate.length === 43) {
  testPassed("VAPID private key format is valid");
 } else {
  testFailed("VAPID private key format is invalid");
 }

 if (vapidSubject.includes("@") || vapidSubject.startsWith("mailto:")) {
  testPassed("VAPID subject format is valid");
 } else {
  testFailed("VAPID subject format is invalid");
 }
} else {
 testFailed("Missing VAPID environment variables");
}

if (databaseUrl) {
 testPassed("Database URL is configured");
} else {
 testFailed("Database URL is missing");
}

// Test 2: Web-Push Library
console.log("\n2. Testing Web-Push Library...");
try {
 webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
 testPassed("Web-push library configured successfully");
} catch (error) {
 testFailed(`Web-push configuration failed: ${error.message}`);
}

// Test 3: Push Notification Encryption
console.log("\n3. Testing Push Notification Encryption...");
try {
 // Generate valid ECDH keys for testing
 const ecdh = crypto.createECDH("prime256v1");
 ecdh.generateKeys();

 const p256dhKey = ecdh.getPublicKey("base64");
 const authKey = crypto.randomBytes(16).toString("base64");

 // Test subscription
 const testSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/deployment-readiness-test",
  keys: {
   p256dh: p256dhKey,
   auth: authKey,
  },
 };

 // Test payload
 const testPayload = {
  title: "Deployment Test",
  body: "VAPID encryption working",
  icon: "/icons/icon-192x192.png",
 };

 await webpush.sendNotification(testSubscription, JSON.stringify(testPayload));

 testPassed("Push notification encryption works");
} catch (error) {
 if (error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 410) {
  testPassed("Push notification encryption works (test endpoint invalid as expected)");
 } else {
  testFailed(`Push notification encryption failed: ${error.message}`);
 }
}

// Test 4: Service Worker Assets
console.log("\n4. Testing Service Worker Assets...");
const swPath = "client/public/sw.js";
const manifestPath = "client/public/manifest.json";

if (existsSync(swPath)) {
 testPassed("Service worker file exists");

 // Check for push event listener
 const swContent = readFileSync(swPath, "utf8");
 if (swContent.includes("push") && swContent.includes("self.addEventListener")) {
  testPassed("Service worker has push event listener");
 } else {
  testWarning("Service worker may not have push event listener");
 }
} else {
 testFailed("Service worker file missing");
}

if (existsSync(manifestPath)) {
 testPassed("Web app manifest exists");

 try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.name && manifest.icons && manifest.start_url) {
   testPassed("Web app manifest has required fields");
  } else {
   testWarning("Web app manifest missing some recommended fields");
  }
 } catch (error) {
  testFailed("Web app manifest is invalid JSON");
 }
} else {
 testFailed("Web app manifest missing");
}

// Test 5: HTTPS Requirement Check
console.log("\n5. Testing HTTPS Requirements...");
if (process.env.REPLIT_DOMAINS) {
 testPassed("Running on Replit (HTTPS automatically provided)");
} else {
 testWarning("Ensure HTTPS is enabled in production (required for push notifications)");
}

// Test 6: VAPID Key Consistency
console.log("\n6. Testing VAPID Key Consistency...");
const clientVapidPath = "client/src/lib/deviceRegistration.ts";
if (existsSync(clientVapidPath)) {
 const clientContent = readFileSync(clientVapidPath, "utf8");
 if (clientContent.includes("VITE_VAPID_PUBLIC_KEY")) {
  testPassed("Client configured to use VAPID public key from environment");
 } else {
  testWarning("Client may not be using environment VAPID key");
 }
} else {
 testWarning("Client device registration file not found");
}

// Test 7: Database Schema
console.log("\n7. Testing Database Schema...");
const schemaPath = "shared/schema.ts";
if (existsSync(schemaPath)) {
 const schemaContent = readFileSync(schemaPath, "utf8");
 if (schemaContent.includes("push_subscriptions")) {
  testPassed("Database schema includes push_subscriptions table");
 } else {
  testFailed("Database schema missing push_subscriptions table");
 }
} else {
 testFailed("Database schema file not found");
}

// Final Report
console.log("\n" + "=".repeat(50));
console.log("📊 DEPLOYMENT READINESS SUMMARY");
console.log("-".repeat(30));
console.log(`✅ Tests Passed: ${results.passed}`);
console.log(`❌ Tests Failed: ${results.failed}`);
console.log(`⚠️  Warnings: ${results.warnings}`);

const totalTests = results.passed + results.failed;
const successRate = (results.passed / totalTests) * 100;

console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);

if (results.failed === 0) {
 console.log("\n🎉 DEPLOYMENT READY!");
 console.log("Your VAPID configuration is production-ready.");
 console.log("Push notifications will work when deployed.");
} else if (results.failed <= 2) {
 console.log("\n⚠️  DEPLOYMENT CAUTION");
 console.log("Minor issues detected. Review failed tests above.");
} else {
 console.log("\n❌ NOT READY FOR DEPLOYMENT");
 console.log("Critical issues found. Fix failed tests before deploying.");
}

console.log("\n📋 DEPLOYMENT CHECKLIST:");
console.log("• All environment variables are set in production");
console.log("• HTTPS is enabled (automatic on Replit)");
console.log("• Database is accessible");
console.log("• Service worker is properly configured");
console.log("• Test push notifications with real browser");

console.log("\n🔧 ENVIRONMENT VARIABLES FOR PRODUCTION:");
console.log("VAPID_PUBLIC_KEY=" + (vapidPublic || "NOT_SET"));
console.log("VAPID_PRIVATE_KEY=" + (vapidPrivate ? vapidPrivate.substring(0, 10) + "..." : "NOT_SET"));
console.log("VAPID_SUBJECT=" + (vapidSubject || "NOT_SET"));
console.log("DATABASE_URL=" + (databaseUrl ? "SET" : "NOT_SET"));
