#!/usr/bin/env node

/**
 * Direct WebPushService Test - Phase 2 Implementation
 * This bypasses the HTTP endpoint and tests the WebPushService directly
 */

import { webPushService } from "./server/services/webPushService.js";

async function testWebPushService() {
 console.log("=== Phase 2 WebPushService Direct Test ===");

 try {
  // Test 1: Test with subscription ID 1
  console.log("\n1. Testing WebPushService.testSend(1):");
  const result = await webPushService.testSend(1);
  console.log("✅ Result:", JSON.stringify(result, null, 2));

  // Test 2: Test with invalid subscription ID
  console.log("\n2. Testing WebPushService.testSend(999):");
  const result2 = await webPushService.testSend(999);
  console.log("✅ Result:", JSON.stringify(result2, null, 2));

  console.log("\n=== WebPushService Test Complete ===");
 } catch (error) {
  console.error("❌ WebPushService test failed:", error.message);
  console.error("Stack:", error.stack);
 }
}

// Run the test
testWebPushService().catch(console.error);
