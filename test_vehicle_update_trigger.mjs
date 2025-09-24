#!/usr/bin/env node

import { io } from "socket.io-client";
import http from "http";

console.log("🔧 Testing Vehicle Update Event Broadcasting...\n");

let dashboardEventReceived = false;
let vehicleEventReceived = false;

// Start listening for WebSocket events
function startEventListener() {
  return new Promise((resolve, reject) => {
    console.log("🔌 Starting WebSocket event listener...");

    const socket = io("http://localhost:5000", {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      upgrade: true,
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket for event listening");

      // Authenticate
      socket.emit("authenticate", {
        user_id: 2,
        username: "TestDashboard",
        role: "admin",
      });
    });

    socket.on("authenticated", (data) => {
      console.log("✅ Authenticated for event listening");

      // Join required rooms
      socket.emit("join_room", "dashboard_updates");
      socket.emit("join_room", "vehicle_updates");
    });

    let roomsJoined = 0;
    socket.on("room_joined", (data) => {
      console.log("✅ Joined room:", data.room);
      roomsJoined++;

      if (roomsJoined >= 2) {
        console.log("📡 Now listening for dashboard and vehicle events...\n");

        // After 2 seconds, trigger a vehicle update
        setTimeout(() => {
          triggerVehicleUpdate()
            .then(() => {
              console.log("✅ Vehicle update triggered, waiting for events...");
            })
            .catch((err) => {
              console.log("❌ Vehicle update failed:", err.message);
            });
        }, 2000);

        // Resolve after 15 seconds to give events time
        setTimeout(() => {
          socket.disconnect();
          resolve({
            dashboardEventReceived,
            vehicleEventReceived,
          });
        }, 15000);
      }
    });

    // Listen for dashboard events
    socket.on("dashboard:stats_updated", (payload) => {
      console.log("📊 *** DASHBOARD EVENT RECEIVED ***");
      console.log("   Trigger:", payload.data?.trigger || "unknown");
      console.log("   Timestamp:", payload.timestamp);
      dashboardEventReceived = true;
    });

    // Listen for vehicle events
    socket.on("vehicle:updated", (payload) => {
      console.log("🚗 *** VEHICLE EVENT RECEIVED ***");
      console.log("   Vehicle ID:", payload.data?.id || "unknown");
      console.log("   Stock Number:", payload.data?.stock_number || "unknown");
      console.log("   Timestamp:", payload.timestamp);
      vehicleEventReceived = true;
    });

    socket.on("connect_error", (error) => {
      console.log("❌ WebSocket connection error:", error.message);
      reject(error);
    });
  });
}

// Simulate a vehicle update by making HTTP request
async function triggerVehicleUpdate() {
  return new Promise((resolve, reject) => {
    console.log("🚗 Triggering vehicle update via HTTP...");

    // First, let's try to login to get authentication
    const loginData = JSON.stringify({
      username: "admin",
      password: "admin123",
    });

    const loginOptions = {
      hostname: "localhost",
      port: 5000,
      path: "/api/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginData),
      },
    };

    const loginReq = http.request(loginOptions, (loginRes) => {
      let loginResponseData = "";

      loginRes.on("data", (chunk) => {
        loginResponseData += chunk;
      });

      loginRes.on("end", () => {
        if (loginRes.statusCode === 200) {
          console.log("✅ Successfully logged in");

          // Extract session cookie
          const cookies = loginRes.headers["set-cookie"];
          const sessionCookie = cookies ? cookies[0] : "";

          // Now update a vehicle
          const updateData = JSON.stringify({
            colour: "Test Color " + Date.now(),
            mileage: 45000 + Math.floor(Math.random() * 5000),
          });

          const updateOptions = {
            hostname: "localhost",
            port: 5000,
            path: "/api/vehicles/1", // Try to update vehicle ID 1
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(updateData),
              Cookie: sessionCookie,
            },
          };

          const updateReq = http.request(updateOptions, (updateRes) => {
            let updateResponseData = "";

            updateRes.on("data", (chunk) => {
              updateResponseData += chunk;
            });

            updateRes.on("end", () => {
              if (updateRes.statusCode === 200) {
                console.log("✅ Vehicle update successful");
                console.log(
                  "📡 WebSocket broadcast should have been triggered",
                );
                resolve("Vehicle updated successfully");
              } else {
                console.log("❌ Vehicle update failed:", updateRes.statusCode);
                console.log("❌ Response:", updateResponseData);
                reject(
                  new Error(`Vehicle update failed: ${updateRes.statusCode}`),
                );
              }
            });
          });

          updateReq.on("error", (error) => {
            console.log("❌ Vehicle update request error:", error.message);
            reject(error);
          });

          updateReq.write(updateData);
          updateReq.end();
        } else {
          console.log("❌ Login failed:", loginRes.statusCode);
          console.log("❌ Login response:", loginResponseData);
          reject(new Error(`Login failed: ${loginRes.statusCode}`));
        }
      });
    });

    loginReq.on("error", (error) => {
      console.log("❌ Login request error:", error.message);
      reject(error);
    });

    loginReq.write(loginData);
    loginReq.end();
  });
}

// Main test function
async function runTest() {
  console.log("🚀 Starting Vehicle Update Event Broadcasting Test\n");

  try {
    const results = await startEventListener();

    console.log("\n=== TEST RESULTS ===");
    console.log(
      `Dashboard Event Received: ${results.dashboardEventReceived ? "✅ YES" : "❌ NO"}`,
    );
    console.log(
      `Vehicle Event Received: ${results.vehicleEventReceived ? "✅ YES" : "❌ NO"}`,
    );

    if (results.dashboardEventReceived || results.vehicleEventReceived) {
      console.log("\n🎉 SUCCESS! WebSocket events are working!");
      console.log(
        "✅ Dashboard will now update automatically when vehicle data changes",
      );
    } else {
      console.log("\n❌ NO EVENTS RECEIVED");
      console.log("🔍 Possible issues:");
      console.log("   - Vehicle update may have failed");
      console.log("   - WebSocket broadcasting not working properly");
      console.log("   - Event names may be mismatched");
      console.log("   - Check server logs for broadcast messages");
    }
  } catch (error) {
    console.log("\n❌ Test failed:", error.message);
  }
}

// Run the test
runTest();
