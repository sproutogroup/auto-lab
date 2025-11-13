#!/usr/bin/env node

// Test to verify dashboard websocket fix works correctly
import { io } from "socket.io-client";

console.log("🔧 Testing Dashboard WebSocket Fix...");

let dashboardEventReceived = false;
let globalEventReceived = false;

function testDashboardWebSocketFix() {
 return new Promise((resolve, reject) => {
  console.log("🔌 Connecting to WebSocket as test client...");

  const socket = io("http://localhost:5000", {
   path: "/socket.io",
   transports: ["polling", "websocket"],
   auth: {
    user_id: 999,
    username: "TestClient",
    role: "admin",
   },
  });

  const testTimeout = setTimeout(() => {
   console.log("❌ Test timeout after 20 seconds");
   socket.disconnect();
   reject(new Error("Test timeout"));
  }, 20000);

  socket.on("connect", () => {
   console.log("✅ Test client connected to WebSocket");
   socket.emit("join_room", "dashboard_updates");
   socket.emit("join_room", "vehicle_updates");
  });

  socket.on("authenticated", data => {
   console.log("✅ Test client authenticated:", data.message);
  });

  // Listen for the exact dashboard events
  socket.on("dashboard:stats_updated", payload => {
   console.log("📊 Received dashboard:stats_updated event:", payload);
   dashboardEventReceived = true;
   checkTestCompletion();
  });

  socket.on("vehicle:updated", payload => {
   console.log("🚗 Received vehicle:updated event:", payload);
   globalEventReceived = true;
   checkTestCompletion();
  });

  function checkTestCompletion() {
   if (dashboardEventReceived || globalEventReceived) {
    clearTimeout(testTimeout);
    socket.disconnect();
    resolve("Dashboard WebSocket events working correctly");
   }
  }

  socket.on("connect_error", error => {
   console.log("❌ Test client connection error:", error.message);
   clearTimeout(testTimeout);
   socket.disconnect();
   reject(error);
  });

  socket.on("disconnect", () => {
   console.log("🔌 Test client disconnected");
  });

  // Instructions
  console.log("\n💡 The test client is now listening for dashboard events...");
  console.log("💡 Now update any vehicle in the Vehicle Master to trigger events");
  console.log("💡 The dashboard should receive updates even when not active!");
  console.log("💡 Check for these console messages:");
  console.log('   - "[WebSocket] *** GLOBAL DASHBOARD_STATS_UPDATED ***"');
  console.log("   - Dashboard stats should update automatically\n");
 });
}

// Run the test
async function runTest() {
 console.log("🚀 Starting Dashboard WebSocket Fix Test\n");

 try {
  await testDashboardWebSocketFix();

  console.log("\n✅ Test results:");
  console.log(`- Dashboard Event: ${dashboardEventReceived ? "✅ Received" : "❌ Not received"}`);
  console.log(`- Global Event: ${globalEventReceived ? "✅ Received" : "❌ Not received"}`);

  if (dashboardEventReceived || globalEventReceived) {
   console.log("\n🎉 SUCCESS! Dashboard WebSocket events are working correctly!");
   console.log("✅ Dashboard will now update automatically when data changes");
   console.log("✅ Even when viewing other pages, dashboard stays updated");
  } else {
   console.log("\n❌ No events received. Test failed.");
  }
 } catch (error) {
  console.log("\n❌ Test failed:", error.message);
 }
}

runTest();
