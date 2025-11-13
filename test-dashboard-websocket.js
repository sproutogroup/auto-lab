#!/usr/bin/env node

// Test script to verify dashboard websocket real-time updates
const { io } = require("socket.io-client");
const http = require("http");

console.log("🔧 Testing Dashboard WebSocket Real-time Updates...");

// Function to get dashboard stats
function getDashboardStats() {
 return new Promise((resolve, reject) => {
  const options = {
   hostname: "localhost",
   port: 3000,
   path: "/api/dashboard/stats",
   method: "GET",
  };

  const req = http.request(options, res => {
   let data = "";
   res.on("data", chunk => {
    data += chunk;
   });
   res.on("end", () => {
    try {
     resolve(JSON.parse(data));
    } catch (e) {
     reject(e);
    }
   });
  });

  req.on("error", reject);
  req.setTimeout(5000, () => reject(new Error("Timeout")));
  req.end();
 });
}

// Test websocket connection
async function testWebSocketConnection() {
 console.log("📡 Testing WebSocket connection...");

 const socket = io("http://localhost:3000/ws", {
  transports: ["websocket", "polling"],
  forceNew: true,
  timeout: 10000,
 });

 return new Promise((resolve, reject) => {
  let connected = false;
  let authenticated = false;
  let roomJoined = false;

  // Set timeout for entire test
  const testTimeout = setTimeout(() => {
   if (!connected) {
    console.log("❌ WebSocket connection failed");
    reject(new Error("Connection timeout"));
   } else if (!authenticated) {
    console.log("❌ WebSocket authentication failed");
    reject(new Error("Authentication timeout"));
   } else if (!roomJoined) {
    console.log("❌ WebSocket room join failed");
    reject(new Error("Room join timeout"));
   } else {
    console.log("❌ Test timeout");
    reject(new Error("Test timeout"));
   }
   socket.disconnect();
  }, 10000);

  socket.on("connect", () => {
   console.log("✅ WebSocket connected successfully");
   connected = true;

   // Authenticate
   socket.emit("authenticate", {
    user_id: 1,
    username: "test-user",
    role: "admin",
   });
  });

  socket.on("authenticated", data => {
   console.log("✅ WebSocket authentication successful");
   authenticated = true;

   // Join dashboard updates room
   socket.emit("join_room", "dashboard_updates");
  });

  socket.on("room_joined", data => {
   if (data.room === "dashboard_updates") {
    console.log("✅ Successfully joined dashboard_updates room");
    roomJoined = true;

    // Listen for dashboard events
    socket.on("dashboard:stats_updated", payload => {
     console.log("✅ Received dashboard:stats_updated event:", payload);
    });

    clearTimeout(testTimeout);
    socket.disconnect();
    resolve("WebSocket test passed");
   }
  });

  socket.on("connect_error", error => {
   console.log("❌ WebSocket connection error:", error.message);
   clearTimeout(testTimeout);
   socket.disconnect();
   reject(error);
  });

  socket.on("disconnect", () => {
   console.log("🔌 WebSocket disconnected");
  });
 });
}

// Test dashboard API
async function testDashboardAPI() {
 console.log("📊 Testing Dashboard API...");

 try {
  const stats = await getDashboardStats();
  console.log("✅ Dashboard API accessible");
  console.log("📈 Total vehicles:", stats.stockSummary?.totalVehicles || "N/A");
  console.log("💰 Total value:", stats.stockSummary?.totalValue || "N/A");
  return true;
 } catch (error) {
  console.log("❌ Dashboard API error:", error.message);
  return false;
 }
}

// Main test function
async function runTests() {
 console.log("🚀 Starting Dashboard Real-time Update Tests\n");

 try {
  // Test 1: Dashboard API
  const apiWorking = await testDashboardAPI();
  if (!apiWorking) {
   console.log("❌ Dashboard API test failed");
   process.exit(1);
  }

  console.log("");

  // Test 2: WebSocket connection
  await testWebSocketConnection();

  console.log("\n✅ All tests passed! Dashboard real-time updates should work.");
  console.log("💡 To test live updates: modify a vehicle and watch dashboard");
 } catch (error) {
  console.log("\n❌ Test failed:", error.message);
  console.log("🔍 Check server logs for WebSocket connection issues");
  process.exit(1);
 }
}

// Run tests
runTests();
