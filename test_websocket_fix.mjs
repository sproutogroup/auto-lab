#!/usr/bin/env node

import { io } from "socket.io-client";
import http from "http";

console.log("🔧 COMPREHENSIVE Dashboard WebSocket Issue Analysis...\n");

let dashboardEventReceived = false;
let vehicleEventReceived = false;
let authenticationReceived = false;
let roomsJoined = [];

function testWebSocketAuthentication() {
 return new Promise((resolve, reject) => {
  console.log("🔌 Testing WebSocket Authentication Flow...");

  const socket = io("http://localhost:5000", {
   path: "/socket.io",
   transports: ["polling", "websocket"],
   upgrade: true,
   autoConnect: true,
  });

  const testTimeout = setTimeout(() => {
   console.log("❌ Test timeout after 15 seconds");
   socket.disconnect();
   reject(new Error("Test timeout"));
  }, 15000);

  socket.on("connect", () => {
   console.log("✅ Connected to WebSocket");
   console.log("📡 Emitting authentication...");

   // Manually authenticate like the real client does
   socket.emit("authenticate", {
    user_id: 1,
    username: "TestAdmin",
    role: "admin",
   });
  });

  socket.on("authenticated", data => {
   console.log("✅ Authentication confirmed:", data.message);
   authenticationReceived = true;

   console.log("📡 Joining required rooms...");
   socket.emit("join_room", "dashboard_updates");
   socket.emit("join_room", "vehicle_updates");
  });

  socket.on("room_joined", data => {
   console.log("✅ Successfully joined room:", data.room);
   roomsJoined.push(data.room);

   // After joining both rooms, we can finish this test
   if (roomsJoined.length >= 2) {
    clearTimeout(testTimeout);
    socket.disconnect();
    console.log("✅ Authentication and room joining test PASSED");
    resolve("Authentication test successful");
   }
  });

  // Listen for the events we expect
  socket.on("dashboard:stats_updated", payload => {
   console.log("📊 *** DASHBOARD EVENT RECEIVED ***:", payload);
   dashboardEventReceived = true;
  });

  socket.on("vehicle:updated", payload => {
   console.log("🚗 *** VEHICLE EVENT RECEIVED ***:", payload);
   vehicleEventReceived = true;
  });

  socket.on("connect_error", error => {
   console.log("❌ Connection error:", error.message);
   clearTimeout(testTimeout);
   socket.disconnect();
   reject(error);
  });

  socket.on("disconnect", () => {
   console.log("🔌 Disconnected from WebSocket");
  });
 });
}

async function testDashboardAPI() {
 return new Promise((resolve, reject) => {
  console.log("📊 Testing Dashboard API accessibility...");

  const options = {
   hostname: "localhost",
   port: 5000,
   path: "/api/dashboard/stats",
   method: "GET",
  };

  const req = http.request(options, res => {
   let data = "";

   res.on("data", chunk => {
    data += chunk;
   });

   res.on("end", () => {
    if (res.statusCode === 401) {
     console.log("⚠️  Dashboard API requires authentication (401)");
     console.log("💡 This is expected - API is protected");
     resolve({ requiresAuth: true });
    } else if (res.statusCode === 200) {
     const stats = JSON.parse(data);
     console.log("✅ Dashboard API accessible");
     console.log("📈 Total vehicles:", stats.stockSummary?.totalVehicles || "N/A");
     resolve(stats);
    } else {
     console.log("❌ Dashboard API error:", res.statusCode);
     reject(new Error(`API error: ${res.statusCode}`));
    }
   });
  });

  req.on("error", error => {
   console.error("❌ Dashboard API request error:", error.message);
   reject(error);
  });

  req.end();
 });
}

async function checkWebSocketServiceStatus() {
 return new Promise((resolve, reject) => {
  console.log("🔍 Checking WebSocket Service Status...");

  const options = {
   hostname: "localhost",
   port: 5000,
   path: "/health",
   method: "GET",
  };

  const req = http.request(options, res => {
   let data = "";

   res.on("data", chunk => {
    data += chunk;
   });

   res.on("end", () => {
    if (res.statusCode === 200) {
     console.log("✅ Server health check passed");
     try {
      const health = JSON.parse(data);
      console.log("📡 Server status:", health.status);
      resolve(health);
     } catch (e) {
      resolve({ status: "ok" });
     }
    } else {
     console.log("❌ Health check failed:", res.statusCode);
     reject(new Error(`Health check failed: ${res.statusCode}`));
    }
   });
  });

  req.on("error", error => {
   console.error("❌ Health check error:", error.message);
   reject(error);
  });

  req.end();
 });
}

// Main diagnostic function
async function runComprehensiveDiagnostic() {
 console.log("🚀 Starting Comprehensive WebSocket Diagnostic\n");

 try {
  // Test 1: Server Health
  console.log("=== TEST 1: Server Health ===");
  await checkWebSocketServiceStatus();
  console.log("");

  // Test 2: Dashboard API
  console.log("=== TEST 2: Dashboard API ===");
  await testDashboardAPI();
  console.log("");

  // Test 3: WebSocket Authentication
  console.log("=== TEST 3: WebSocket Authentication ===");
  await testWebSocketAuthentication();
  console.log("");

  // Results Summary
  console.log("=== DIAGNOSTIC RESULTS ===");
  console.log(`✅ Authentication: ${authenticationReceived ? "WORKING" : "FAILED"}`);
  console.log(`✅ Room Joining: ${roomsJoined.length >= 2 ? "WORKING" : "FAILED"}`);
  console.log(`✅ Rooms Joined: [${roomsJoined.join(", ")}]`);
  console.log(`⏸️  Dashboard Event: ${dashboardEventReceived ? "RECEIVED" : "NOT TRIGGERED"}`);
  console.log(`⏸️  Vehicle Event: ${vehicleEventReceived ? "RECEIVED" : "NOT TRIGGERED"}`);

  console.log("\n=== NEXT STEPS ===");
  if (authenticationReceived && roomsJoined.length >= 2) {
   console.log("✅ WebSocket foundation is WORKING");
   console.log("💡 To test live updates:");
   console.log("   1. Keep this test running in background");
   console.log("   2. Update a vehicle in the Vehicle Master UI");
   console.log("   3. Watch for event messages above");
   console.log("   4. Events should appear within 1-2 seconds");
  } else {
   console.log("❌ WebSocket foundation has ISSUES");
   console.log("🔧 Check server WebSocket service initialization");
   console.log("🔧 Check authentication flow in WebSocketContext.tsx");
  }
 } catch (error) {
  console.log("\n❌ Diagnostic failed:", error.message);
  console.log("🔍 Check server logs for more details");
 }
}

// Run the comprehensive diagnostic
runComprehensiveDiagnostic();
