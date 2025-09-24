#!/usr/bin/env node

import http from "http";

console.log("🔧 Testing Vehicle Update Route Execution...\n");

async function testVehicleUpdate() {
 return new Promise((resolve, reject) => {
  // First login
  console.log("🔐 Step 1: Logging in...");

  const loginData = JSON.stringify({
   username: "test",
   password: "test123",
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
    if (loginRes.statusCode !== 200) {
     console.log("❌ Login failed:", loginRes.statusCode);
     console.log("❌ Response:", loginResponseData);
     reject(new Error(`Login failed: ${loginRes.statusCode}`));
     return;
    }

    console.log("✅ Login successful");

    // Extract session cookie
    const cookies = loginRes.headers["set-cookie"];
    const sessionCookie = cookies ? cookies[0] : "";
    console.log("🍪 Session cookie:", sessionCookie ? "OBTAINED" : "MISSING");

    // Now test vehicle update
    console.log("\n🚗 Step 2: Making vehicle update request...");
    console.log(
     '📡 This should trigger server logs starting with "Vehicle Update:"'
    );

    const updateData = JSON.stringify({
     colour: "Test Color Debug " + Date.now(),
     mileage: 50000 + Math.floor(Math.random() * 10000),
    });

    const updateOptions = {
     hostname: "localhost",
     port: 5000,
     path: "/api/vehicles/273", // Use the same vehicle ID from the user's test
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
      console.log(`📊 Update Response Status: ${updateRes.statusCode}`);
      console.log(`📊 Update Response Headers:`, updateRes.headers);

      if (updateRes.statusCode === 200) {
       console.log("✅ Vehicle update HTTP request successful");
       console.log('🔍 Check server logs for "Vehicle Update:" messages');
       console.log(
        '🔍 If no "Vehicle Update:" logs appear, the route is not executing'
       );

       try {
        const responseObj = JSON.parse(updateResponseData);
        console.log("📄 Updated vehicle ID:", responseObj.id);
        console.log("📄 Updated vehicle stock:", responseObj.stock_number);
        console.log("📄 Updated vehicle color:", responseObj.colour);
        resolve("Update successful");
       } catch (parseError) {
        console.log("📄 Raw response:", updateResponseData);
        resolve("Update successful (raw response)");
       }
      } else {
       console.log("❌ Vehicle update failed:", updateRes.statusCode);
       console.log("❌ Response:", updateResponseData);
       reject(new Error(`Vehicle update failed: ${updateRes.statusCode}`));
      }
     });
    });

    updateReq.on("error", (error) => {
     console.log("❌ Vehicle update request error:", error.message);
     reject(error);
    });

    updateReq.write(updateData);
    updateReq.end();
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

// Run the test
testVehicleUpdate()
 .then((result) => {
  console.log("\n=== DIAGNOSTIC COMPLETE ===");
  console.log("✅", result);
  console.log("\n📋 NEXT STEPS:");
  console.log('1. Check server logs for "Vehicle Update:" messages');
  console.log(
   '2. If NO "Vehicle Update:" messages appear, the route is not executing'
  );
  console.log(
   "3. If messages appear but no WebSocket events, check WebSocket service"
  );
 })
 .catch((error) => {
  console.log("\n❌ Test failed:", error.message);
 });
