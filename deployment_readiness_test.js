#!/usr/bin/env node

/**
 * Comprehensive deployment readiness test for VAPID and push notifications
 * This test verifies all components are properly configured for production deployment
 */

import webpush from "web-push";
import crypto from "crypto";

console.log("🚀 DEPLOYMENT READINESS TEST - VAPID & PUSH NOTIFICATIONS");
console.log("=".repeat(70));

// Test results tracking
const results = {
 vapid_config: false,
 webpush_library: false,
 service_initialization: false,
 database_connection: false,
 encryption_test: false,
 service_worker_assets: false,
 environment_variables: false,
 overall_ready: false,
};

async function runDeploymentTests() {
 console.log("\n1. Testing VAPID Configuration...");
 await testVapidConfiguration();

 console.log("\n2. Testing Web-Push Library...");
 await testWebPushLibrary();

 console.log("\n3. Testing WebPushService Initialization...");
 await testServiceInitialization();

 console.log("\n4. Testing Database Connection...");
 await testDatabaseConnection();

 console.log("\n5. Testing Push Encryption...");
 await testPushEncryption();

 console.log("\n6. Testing Service Worker Assets...");
 await testServiceWorkerAssets();

 console.log("\n7. Testing Environment Variables...");
 await testEnvironmentVariables();

 console.log("\n8. Overall Deployment Readiness...");
 await evaluateOverallReadiness();

 console.log("\n" + "=".repeat(70));
 printFinalReport();
}

async function testVapidConfiguration() {
 try {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
   console.log("❌ VAPID keys missing from environment");
   return;
  }

  // Validate key formats
  if (vapidPublic.length !== 87 || !vapidPublic.startsWith("B")) {
   console.log("❌ Invalid VAPID public key format");
   return;
  }

  if (vapidPrivate.length !== 43) {
   console.log("❌ Invalid VAPID private key format");
   return;
  }

  if (!vapidSubject.includes("@") && !vapidSubject.startsWith("mailto:")) {
   console.log("❌ Invalid VAPID subject format");
   return;
  }

  console.log("✅ VAPID configuration valid");
  console.log(`   Public key: ${vapidPublic.substring(0, 20)}...`);
  console.log(`   Private key: ${vapidPrivate.substring(0, 10)}...`);
  console.log(`   Subject: ${vapidSubject}`);

  results.vapid_config = true;
 } catch (error) {
  console.log("❌ VAPID configuration test failed:", error.message);
 }
}

async function testWebPushLibrary() {
 try {
  // Test web-push library configuration
  webpush.setVapidDetails(
   process.env.VAPID_SUBJECT,
   process.env.VAPID_PUBLIC_KEY,
   process.env.VAPID_PRIVATE_KEY,
  );

  console.log("✅ Web-push library configured successfully");
  results.webpush_library = true;
 } catch (error) {
  console.log("❌ Web-push library test failed:", error.message);
 }
}

async function testServiceInitialization() {
 try {
  // Test if we can import and initialize WebPushService
  const { WebPushService } = await import("./server/services/webPushService.js");
  const service = WebPushService.getInstance();

  if (!service) {
   console.log("❌ WebPushService failed to initialize");
   return;
  }

  console.log("✅ WebPushService initialized successfully");
  console.log("   Available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(service)));

  results.service_initialization = true;
 } catch (error) {
  console.log("❌ WebPushService initialization failed:", error.message);
 }
}

async function testDatabaseConnection() {
 try {
  // Test database connection by trying to access storage
  const { storage } = await import("./server/storage.js");
  const subscriptions = await storage.getPushSubscriptionsByUserId(1);

  console.log("✅ Database connection successful");
  console.log(`   Found ${subscriptions.length} push subscriptions in database`);

  results.database_connection = true;
 } catch (error) {
  console.log("❌ Database connection test failed:", error.message);
 }
}

async function testPushEncryption() {
 try {
  // Generate valid test keys for encryption test
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();

  const p256dhKey = ecdh.getPublicKey("base64");
  const authKey = crypto.randomBytes(16).toString("base64");

  // Create test subscription
  const testSubscription = {
   endpoint: "https://fcm.googleapis.com/fcm/send/test-deployment-readiness",
   keys: {
    p256dh: p256dhKey,
    auth: authKey,
   },
  };

  // Test payload
  const testPayload = {
   title: "Deployment Readiness Test",
   body: "Push encryption working correctly",
   icon: "/icons/icon-192x192.png",
   tag: "deployment-test",
  };

  // Test encryption (will fail to send but should pass encryption)
  await webpush.sendNotification(testSubscription, JSON.stringify(testPayload));

  console.log("✅ Push encryption test passed (endpoint invalid as expected)");
  results.encryption_test = true;
 } catch (error) {
  if (error.statusCode === 400 || error.statusCode === 404 || error.statusCode === 410) {
   console.log("✅ Push encryption test passed (endpoint invalid as expected)");
   results.encryption_test = true;
  } else {
   console.log("❌ Push encryption test failed:", error.message);
  }
 }
}

async function testServiceWorkerAssets() {
 try {
  const fs = await import("fs");
  const path = await import("path");

  // Check for service worker file
  const swPath = path.join(process.cwd(), "client/public/sw.js");
  const manifestPath = path.join(process.cwd(), "client/public/manifest.json");

  let swExists = false;
  let manifestExists = false;

  try {
   fs.accessSync(swPath, fs.constants.F_OK);
   swExists = true;
  } catch (e) {
   // File doesn't exist
  }

  try {
   fs.accessSync(manifestPath, fs.constants.F_OK);
   manifestExists = true;
  } catch (e) {
   // File doesn't exist
  }

  if (swExists && manifestExists) {
   console.log("✅ Service worker and manifest files present");
   results.service_worker_assets = true;
  } else {
   console.log("❌ Missing service worker assets:");
   if (!swExists) console.log("   - service worker (sw.js) not found");
   if (!manifestExists) console.log("   - manifest.json not found");
  }
 } catch (error) {
  console.log("❌ Service worker assets test failed:", error.message);
 }
}

async function testEnvironmentVariables() {
 try {
  const requiredEnvVars = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "DATABASE_URL"];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length === 0) {
   console.log("✅ All required environment variables are set");
   results.environment_variables = true;
  } else {
   console.log("❌ Missing environment variables:", missingVars);
  }
 } catch (error) {
  console.log("❌ Environment variables test failed:", error.message);
 }
}

async function evaluateOverallReadiness() {
 const passedTests = Object.values(results).filter(Boolean).length;
 const totalTests = Object.keys(results).length - 1; // Exclude overall_ready from count

 const readinessScore = (passedTests / totalTests) * 100;

 if (readinessScore >= 90) {
  console.log("✅ DEPLOYMENT READY - All critical systems operational");
  results.overall_ready = true;
 } else if (readinessScore >= 70) {
  console.log("⚠️  DEPLOYMENT CAUTION - Some issues detected");
  results.overall_ready = false;
 } else {
  console.log("❌ NOT READY FOR DEPLOYMENT - Critical issues found");
  results.overall_ready = false;
 }

 console.log(`   Readiness Score: ${readinessScore.toFixed(1)}% (${passedTests}/${totalTests} tests passed)`);
}

function printFinalReport() {
 console.log("\n📊 DEPLOYMENT READINESS REPORT");
 console.log("-".repeat(40));

 Object.entries(results).forEach(([test, passed]) => {
  const status = passed ? "✅" : "❌";
  const testName = test.replace(/_/g, " ").toUpperCase();
  console.log(`${status} ${testName}`);
 });

 console.log("-".repeat(40));

 if (results.overall_ready) {
  console.log("🎉 YOUR APPLICATION IS READY FOR DEPLOYMENT!");
  console.log("   All VAPID keys are properly configured");
  console.log("   Push notifications will work in production");
  console.log("   Database connections are operational");
  console.log("   Web-push encryption is functional");
 } else {
  console.log("⚠️  DEPLOYMENT ISSUES DETECTED");
  console.log("   Please resolve the failed tests above");
  console.log("   before deploying to production");
 }

 console.log("\n📝 DEPLOYMENT CHECKLIST:");
 console.log("   • Ensure all environment variables are set in production");
 console.log("   • Verify database is accessible from production environment");
 console.log("   • Test push notifications with real browser subscriptions");
 console.log("   • Monitor logs for any WebPushService errors");
 console.log("   • Verify HTTPS is enabled (required for push notifications)");
}

// Run the tests
runDeploymentTests().catch(error => {
 console.error("❌ Deployment readiness test failed:", error);
 process.exit(1);
});
