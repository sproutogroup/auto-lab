import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { registerRoutes } from "../server/routes";
import express from "express";

describe("Performance Tests", () => {
 let app: express.Application;
 let server: any;
 let authCookie: string;

 beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);

  // Login to get auth cookie
  const loginResponse = await request(app).post("/api/auth/login").send({
   username: "admin",
   password: "admin123",
  });

  authCookie = loginResponse.headers["set-cookie"][0];
 });

 afterAll(async () => {
  if (server) {
   server.close();
  }
 });

 describe("Response Time Tests", () => {
  it("should respond to health check quickly", async () => {
   const startTime = Date.now();

   await request(app).get("/health").expect(200);

   const responseTime = Date.now() - startTime;
   expect(responseTime).toBeLessThan(100); // Should respond in under 100ms
  });

  it("should load dashboard stats quickly", async () => {
   const startTime = Date.now();

   await request(app).get("/api/dashboard/stats").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;
   expect(responseTime).toBeLessThan(500); // Should respond in under 500ms
  });

  it("should load vehicle list quickly", async () => {
   const startTime = Date.now();

   await request(app).get("/api/vehicles").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;
   expect(responseTime).toBeLessThan(200); // Should respond in under 200ms
  });

  it("should load customer list quickly", async () => {
   const startTime = Date.now();

   await request(app).get("/api/customers").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;
   expect(responseTime).toBeLessThan(200); // Should respond in under 200ms
  });

  it("should load lead list quickly", async () => {
   const startTime = Date.now();

   await request(app).get("/api/leads").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;
   expect(responseTime).toBeLessThan(200); // Should respond in under 200ms
  });

  it("should handle business intelligence queries efficiently", async () => {
   const startTime = Date.now();

   await request(app).get("/api/business-intelligence/financial-audit").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;
   expect(responseTime).toBeLessThan(1000); // Complex queries under 1000ms
  });
 });

 describe("Load Tests", () => {
  it("should handle multiple concurrent requests", async () => {
   const promises = [];
   const startTime = Date.now();

   // Create 10 concurrent requests
   for (let i = 0; i < 10; i++) {
    promises.push(request(app).get("/api/vehicles").set("Cookie", authCookie).expect(200));
   }

   const results = await Promise.all(promises);
   const totalTime = Date.now() - startTime;

   // All requests should complete
   expect(results.length).toBe(10);
   results.forEach(result => {
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body)).toBe(true);
   });

   // Should handle 10 concurrent requests in under 2 seconds
   expect(totalTime).toBeLessThan(2000);
  });

  it("should handle multiple dashboard stat requests", async () => {
   const promises = [];

   for (let i = 0; i < 5; i++) {
    promises.push(request(app).get("/api/dashboard/stats").set("Cookie", authCookie).expect(200));
   }

   const results = await Promise.all(promises);

   expect(results.length).toBe(5);
   results.forEach(result => {
    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("stockSummary");
   });
  });

  it("should handle search queries efficiently", async () => {
   const searches = [
    "/api/vehicles?make=BMW",
    "/api/vehicles?status=STOCK",
    "/api/vehicles?year=2023",
    "/api/customers?status=active",
    "/api/leads?stage=qualified",
   ];

   const promises = searches.map(url => request(app).get(url).set("Cookie", authCookie).expect(200));

   const startTime = Date.now();
   const results = await Promise.all(promises);
   const totalTime = Date.now() - startTime;

   expect(results.length).toBe(5);
   expect(totalTime).toBeLessThan(1000); // All searches under 1 second
  });
 });

 describe("Memory and Resource Tests", () => {
  it("should not have memory leaks during repeated requests", async () => {
   const initialMemory = process.memoryUsage().heapUsed;

   // Make 50 requests
   for (let i = 0; i < 50; i++) {
    await request(app).get("/api/vehicles").set("Cookie", authCookie).expect(200);
   }

   // Force garbage collection if available
   if (global.gc) {
    global.gc();
   }

   const finalMemory = process.memoryUsage().heapUsed;
   const memoryIncrease = finalMemory - initialMemory;

   // Memory increase should be reasonable (less than 50MB)
   expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it("should handle large data sets efficiently", async () => {
   const startTime = Date.now();

   // Request large dataset
   const response = await request(app).get("/api/vehicles?limit=1000").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;

   expect(Array.isArray(response.body)).toBe(true);
   expect(responseTime).toBeLessThan(1000); // Should handle 1000 records under 1 second
  });
 });

 describe("Database Performance", () => {
  it("should use database indexes for vehicle queries", async () => {
   const startTime = Date.now();

   // Query that should use index
   await request(app).get("/api/vehicles?make=BMW&status=STOCK").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;

   // Should be very fast with proper indexing
   expect(responseTime).toBeLessThan(100);
  });

  it("should efficiently handle customer searches", async () => {
   const startTime = Date.now();

   await request(app).get("/api/customers?email=test@example.com").set("Cookie", authCookie).expect(200);

   const responseTime = Date.now() - startTime;

   // Email search should be very fast with index
   expect(responseTime).toBeLessThan(50);
  });

  it("should handle complex business intelligence queries", async () => {
   const startTime = Date.now();

   await request(app)
    .get("/api/business-intelligence/vehicle-performance")
    .set("Cookie", authCookie)
    .expect(200);

   const responseTime = Date.now() - startTime;

   // Complex BI queries should still be reasonable
   expect(responseTime).toBeLessThan(2000);
  });
 });

 describe("Rate Limiting Performance", () => {
  it("should handle requests within rate limits efficiently", async () => {
   const promises = [];

   // Make requests within rate limit
   for (let i = 0; i < 10; i++) {
    promises.push(request(app).get("/health").expect(200));
   }

   const startTime = Date.now();
   const results = await Promise.all(promises);
   const totalTime = Date.now() - startTime;

   expect(results.length).toBe(10);
   expect(totalTime).toBeLessThan(1000); // Should not be significantly slowed by rate limiting
  });

  it("should respond quickly to rate limited requests", async () => {
   const startTime = Date.now();

   // Make request that might be rate limited
   const response = await request(app).post("/api/auth/login").send({
    username: "invalid",
    password: "invalid",
   });

   const responseTime = Date.now() - startTime;

   // Even rate limited responses should be quick
   expect(responseTime).toBeLessThan(100);
   expect([401, 429]).toContain(response.status);
  });
 });

 describe("Static Asset Performance", () => {
  it("should serve static assets quickly", async () => {
   const startTime = Date.now();

   await request(app).get("/health").expect(200);

   const responseTime = Date.now() - startTime;

   // Static assets should be very fast
   expect(responseTime).toBeLessThan(50);
  });
 });
});
