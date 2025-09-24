#!/usr/bin/env node

/**
 * Test WebPushService synchronously
 */

import { execSync } from "child_process";

console.log("=== Phase 2 WebPushService Test (Sync) ===");

// Test the database subscription
console.log("\n1. Testing database subscription:");
try {
  const result = execSync(
    'psql $DATABASE_URL -c "SELECT * FROM push_subscriptions WHERE id = 1;"',
    { encoding: "utf8" },
  );
  console.log(
    "Database subscription found:",
    result.includes("test-endpoint-for-debug"),
  );
} catch (error) {
  console.log("❌ Database query failed:", error.message);
}

// Test the actual API endpoint
console.log("\n2. Testing API endpoint with real request:");
try {
  const loginResult = execSync(
    'curl -X POST "http://localhost:5000/api/auth/login" -H "Content-Type: application/json" -d \'{"username": "admin", "password": "admin123"}\' -c cookies_test.txt -s',
    { encoding: "utf8" },
  );
  console.log("Login successful:", loginResult.includes("Login successful"));

  const testResult = execSync(
    'curl -X POST "http://localhost:5000/debug/send-test-push" -H "Content-Type: application/json" -H "Cookie: $(cat cookies_test.txt)" -d \'{"subscriptionId": 1}\' -s -w "%{http_code}"',
    { encoding: "utf8" },
  );
  console.log("Test push endpoint response:", testResult);
} catch (error) {
  console.log("❌ API test failed:", error.message);
}

// Test WebPushService compilation and existence
console.log("\n3. Testing WebPushService file existence:");
try {
  const lsResult = execSync("ls -la server/services/webPushService.*", {
    encoding: "utf8",
  });
  console.log("WebPushService files:", lsResult);
} catch (error) {
  console.log("❌ File check failed:", error.message);
}

console.log("\n=== Test Complete ===");
