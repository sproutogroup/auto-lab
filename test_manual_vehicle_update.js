#!/usr/bin/env node

// Test script to manually trigger vehicle update and test websocket events
const http = require("http");

console.log("🔧 Testing Manual Vehicle Update and WebSocket Broadcasting...");

async function testVehicleUpdate() {
 return new Promise((resolve, reject) => {
  console.log("📡 Making HTTP request to update a vehicle...");

  // Make a PUT request to update a vehicle
  const postData = JSON.stringify({
   colour: "Red Updated " + Date.now(),
   mileage: 50000 + Math.floor(Math.random() * 10000),
   year: 2020,
  });

  const options = {
   hostname: "localhost",
   port: 5000,
   path: "/api/vehicles/1", // Update vehicle ID 1
   method: "PUT",
   headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
    // Add authentication cookie - you may need to get this from browser
    Cookie: "session_id=your_session_here",
   },
  };

  const req = http.request(options, res => {
   let data = "";

   res.on("data", chunk => {
    data += chunk;
   });

   res.on("end", () => {
    console.log("✅ Vehicle update response:", res.statusCode);
    if (res.statusCode === 200) {
     console.log("✅ Vehicle updated successfully");
     console.log("📊 Response data:", data);
     console.log("💡 Check server logs for WebSocket broadcast messages");
     resolve("Vehicle updated successfully");
    } else {
     console.log("❌ Vehicle update failed:", res.statusCode);
     console.log("❌ Response:", data);
     reject(new Error(`Update failed with status ${res.statusCode}`));
    }
   });
  });

  req.on("error", error => {
   console.error("❌ Request error:", error.message);
   reject(error);
  });

  req.write(postData);
  req.end();
 });
}

// Test dashboard stats API
async function testDashboardAPI() {
 return new Promise((resolve, reject) => {
  console.log("📊 Testing Dashboard API...");

  const options = {
   hostname: "localhost",
   port: 5000,
   path: "/api/dashboard/stats",
   method: "GET",
   headers: {
    Cookie: "session_id=your_session_here",
   },
  };

  const req = http.request(options, res => {
   let data = "";

   res.on("data", chunk => {
    data += chunk;
   });

   res.on("end", () => {
    console.log("✅ Dashboard API response:", res.statusCode);
    if (res.statusCode === 200) {
     const stats = JSON.parse(data);
     console.log("📈 Total vehicles:", stats.stockSummary?.totalVehicles || "N/A");
     console.log("💰 Total value:", stats.stockSummary?.totalValue || "N/A");
     resolve(stats);
    } else {
     console.log("❌ Dashboard API failed:", res.statusCode, data);
     reject(new Error(`Dashboard API failed with status ${res.statusCode}`));
    }
   });
  });

  req.on("error", error => {
   console.error("❌ Dashboard API error:", error.message);
   reject(error);
  });

  req.end();
 });
}

// Main test function
async function runTest() {
 console.log("🚀 Starting Manual Vehicle Update Test\n");

 try {
  // Test 1: Dashboard API (without auth for now)
  console.log("📊 Testing Dashboard API first...");

  // Test 2: Attempt vehicle update
  console.log("\n🚗 Attempting vehicle update...");

  console.log("\n💡 NOTE: This test requires authentication.");
  console.log("💡 To properly test:");
  console.log("   1. Login to the app in your browser");
  console.log("   2. Get the session cookie from browser dev tools");
  console.log("   3. Update the Cookie header in this script");
  console.log("   4. Run this script again");
  console.log("\n📋 Alternatively, use the Vehicle Master UI to update a vehicle");
  console.log("📋 and watch the server console logs for WebSocket broadcast messages");
 } catch (error) {
  console.log("\n❌ Test failed:", error.message);
 }
}

// Run the test
runTest();
