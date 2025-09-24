#!/usr/bin/env node

// Test script to verify vehicle update triggers websocket events
const { io } = require("socket.io-client");
const http = require("http");

console.log("🔧 Testing Vehicle Update WebSocket Broadcasting...");

let eventReceived = false;
let dashboardEventReceived = false;

// Test websocket connection and listen for vehicle update events
function testWebSocketVehicleUpdate() {
  return new Promise((resolve, reject) => {
    console.log("🔌 Connecting to WebSocket...");

    const socket = io("http://localhost:5000", {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      auth: {
        user_id: 8,
        username: "Rizwan",
        role: "admin",
      },
    });

    const testTimeout = setTimeout(() => {
      console.log("❌ Test timeout after 30 seconds");
      socket.disconnect();
      reject(new Error("Test timeout"));
    }, 30000);

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket");

      // Join required rooms
      socket.emit("join_room", "dashboard_updates");
      socket.emit("join_room", "vehicle_updates");

      console.log(
        "📡 Requested to join dashboard_updates and vehicle_updates rooms",
      );
    });

    socket.on("authenticated", (data) => {
      console.log("✅ WebSocket authenticated:", data.message);
    });

    socket.on("room_joined", (data) => {
      console.log("✅ Successfully joined room:", data.room);
    });

    // Listen for vehicle update events
    socket.on("vehicle:updated", (payload) => {
      console.log("🚗 Received vehicle:updated event:", payload);
      eventReceived = true;
    });

    // Listen for dashboard stats update events
    socket.on("dashboard:stats_updated", (payload) => {
      console.log("📊 Received dashboard:stats_updated event:", payload);
      dashboardEventReceived = true;

      if (eventReceived || dashboardEventReceived) {
        clearTimeout(testTimeout);
        socket.disconnect();
        resolve("WebSocket vehicle update events working");
      }
    });

    socket.on("connect_error", (error) => {
      console.log("❌ WebSocket connection error:", error.message);
      clearTimeout(testTimeout);
      socket.disconnect();
      reject(error);
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
      if (eventReceived || dashboardEventReceived) {
        resolve("Test completed successfully");
      }
    });

    // Give some time for connection and then simulate that vehicle has been updated
    setTimeout(() => {
      console.log("💡 Vehicle update should have been triggered by user...");
      console.log("💡 Waiting for websocket events...");
    }, 5000);
  });
}

// Main test function
async function runTest() {
  console.log("🚀 Starting Vehicle Update WebSocket Test\n");

  try {
    await testWebSocketVehicleUpdate();

    console.log("\n✅ Test results:");
    console.log(
      `- Vehicle Updated Event: ${eventReceived ? "✅ Received" : "❌ Not received"}`,
    );
    console.log(
      `- Dashboard Stats Event: ${dashboardEventReceived ? "✅ Received" : "❌ Not received"}`,
    );

    if (eventReceived || dashboardEventReceived) {
      console.log(
        "\n🎉 WebSocket events are working! Dashboard should update automatically.",
      );
    } else {
      console.log(
        "\n❌ No WebSocket events received. There may be an issue with broadcasting.",
      );
    }
  } catch (error) {
    console.log("\n❌ Test failed:", error.message);
    console.log(
      "🔍 Check server logs and ensure WebSocket service is properly broadcasting events",
    );
  }
}

runTest();
