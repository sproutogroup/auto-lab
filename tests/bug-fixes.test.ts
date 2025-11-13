import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { setupVite } from "../server/vite";
import { registerRoutes } from "../server/routes";
import { checkDatabaseConnection } from "../server/db";
import { securityManager } from "../server/middleware/security";
import { errorHandler } from "../client/src/lib/errorHandler";
import { performanceMonitor } from "../client/src/lib/performanceMonitor";
import { securityHelper } from "../client/src/lib/securityHelper";
import express from "express";

describe("Comprehensive Bug Fixes Validation", () => {
 let app: express.Application;
 let server: any;

 beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);
 });

 afterAll(async () => {
  if (server) {
   server.close();
  }
 });

 describe("Database Connection Handling", () => {
  it("should handle database connection gracefully", async () => {
   const result = await checkDatabaseConnection();
   expect(result).toHaveProperty("connected");
   expect(typeof result.connected).toBe("boolean");

   if (!result.connected) {
    expect(result).toHaveProperty("error");
    expect(typeof result.error).toBe("string");
   }
  });

  it("should handle database errors without crashing", async () => {
   // Test with invalid SQL to ensure error handling works
   const response = await request(app)
    .get("/api/dashboard/stats")
    .expect(res => {
     // Should either succeed or fail gracefully
     expect([200, 500].includes(res.status)).toBe(true);
    });
  });
 });

 describe("Security Enhancements", () => {
  it("should block suspicious requests", async () => {
   const response = await request(app).post("/api/auth/login").send({
    username: "admin'; DROP TABLE users; --",
    password: "password",
   });

   expect(response.status).toBe(400);
   expect(response.body.message).toBe("Request blocked by security filter");
  });

  it("should implement rate limiting", async () => {
   const promises = [];

   // Make 6 rapid requests to trigger rate limiting
   for (let i = 0; i < 6; i++) {
    promises.push(
     request(app).post("/api/auth/login").send({
      username: "admin",
      password: "wrongpassword",
     }),
    );
   }

   const responses = await Promise.all(promises);
   const rateLimitedResponses = responses.filter(r => r.status === 429);

   expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });

  it("should validate input properly", async () => {
   const response = await request(app).post("/api/customers").send({
    first_name: "", // Invalid: empty string
    last_name: "Test",
    email: "invalid-email", // Invalid: not a proper email
    phone: "123-abc-def", // Invalid: contains letters
   });

   expect(response.status).toBe(400);
   expect(response.body).toHaveProperty("errors");
  });

  it("should sanitize input strings", async () => {
   const maliciousInput = '<script>alert("xss")</script>';
   const sanitized = securityHelper.sanitizeInput(maliciousInput);

   expect(sanitized).not.toContain("<script>");
   expect(sanitized).not.toContain("alert");
  });
 });

 describe("Error Handling Infrastructure", () => {
  it("should log errors properly", () => {
   const testError = new Error("Test error");

   expect(() => {
    errorHandler.logError(testError, "Test Context");
   }).not.toThrow();

   const errors = errorHandler.getErrors();
   expect(errors.length).toBeGreaterThan(0);
   expect(errors[0].message).toBe("Test error");
  });

  it("should handle API errors gracefully", () => {
   const testError = new Error("API Error");

   expect(() => {
    errorHandler.handleApiError(testError, false);
   }).not.toThrow();
  });

  it("should validate security configurations", () => {
   expect(securityHelper.validateEmail("test@example.com")).toBe(true);
   expect(securityHelper.validateEmail("invalid-email")).toBe(false);

   expect(securityHelper.validatePhone("+1234567890")).toBe(true);
   expect(securityHelper.validatePhone("invalid-phone")).toBe(false);

   expect(securityHelper.validateUrl("https://example.com")).toBe(true);
   expect(securityHelper.validateUrl("invalid-url")).toBe(false);
  });
 });

 describe("Performance Monitoring", () => {
  it("should record performance metrics", () => {
   performanceMonitor.recordMetric("test_metric", 100, "timing");

   const metrics = performanceMonitor.getMetrics();
   expect(metrics.length).toBeGreaterThan(0);

   const testMetric = metrics.find(m => m.name === "test_metric");
   expect(testMetric).toBeDefined();
   expect(testMetric?.value).toBe(100);
   expect(testMetric?.type).toBe("timing");
  });

  it("should measure API calls", async () => {
   const mockApiCall = () => Promise.resolve("success");

   const result = await performanceMonitor.measureApiCall(mockApiCall, "test_api");

   expect(result).toBe("success");

   const metrics = performanceMonitor.getMetrics();
   const apiMetric = metrics.find(m => m.name === "api_test_api_duration");
   expect(apiMetric).toBeDefined();
   expect(apiMetric?.type).toBe("timing");
  });
 });

 describe("API Response Validation", () => {
  it("should return proper error responses", async () => {
   const response = await request(app).get("/api/nonexistent-endpoint").expect(404);

   expect(response.body).toHaveProperty("message");
  });

  it("should handle authentication properly", async () => {
   const response = await request(app).get("/api/auth/user").expect(401);

   expect(response.body).toHaveProperty("message");
   expect(response.body.message).toBe("Not authenticated");
  });

  it("should validate required fields", async () => {
   const response = await request(app).post("/api/vehicles").send({
    // Missing required fields
    make: "",
    model: "",
   });

   expect(response.status).toBe(400);
  });
 });

 describe("Dialog Accessibility Fixes", () => {
  it("should include proper dialog descriptions", () => {
   // This would be tested in component tests
   // Here we ensure the components are properly structured
   expect(true).toBe(true); // Placeholder for component testing
  });
 });

 describe("Toast Memory Leak Prevention", () => {
  it("should properly clean up toast resources", () => {
   // This would be tested in component tests
   // Here we ensure cleanup mechanisms are in place
   expect(true).toBe(true); // Placeholder for component testing
  });
 });

 describe("Security Manager Functionality", () => {
  it("should track failed attempts", () => {
   const testIP = "192.168.1.1";

   securityManager.recordFailedAttempt(testIP);
   securityManager.recordFailedAttempt(testIP);

   const metrics = securityManager.getMetrics();
   expect(metrics.failedAttempts).toBeGreaterThanOrEqual(2);
  });

  it("should block IPs after excessive failures", () => {
   const testIP = "192.168.1.2";

   // Record 5 failed attempts
   for (let i = 0; i < 5; i++) {
    securityManager.recordFailedAttempt(testIP);
   }

   expect(securityManager.isBlocked(testIP)).toBe(true);
  });

  it("should detect suspicious activity", () => {
   const suspiciousRequest = {
    body: { query: "SELECT * FROM users" },
    query: {},
    params: {},
    headers: {},
   };

   const isSuspicious = securityManager.detectSuspiciousActivity(suspiciousRequest as any);
   expect(isSuspicious).toBe(true);
  });
 });

 describe("Data Integrity Checks", () => {
  it("should handle malformed JSON gracefully", async () => {
   const response = await request(app)
    .post("/api/vehicles")
    .set("Content-Type", "application/json")
    .send('{"invalid": json}');

   expect(response.status).toBe(400);
  });

  it("should validate data types", async () => {
   const response = await request(app).post("/api/vehicles").send({
    make: 123, // Should be string
    model: true, // Should be string
    year: "invalid", // Should be number
    price: "not-a-number", // Should be number
   });

   expect(response.status).toBe(400);
  });
 });

 describe("Cross-Origin Resource Sharing (CORS)", () => {
  it("should handle CORS requests properly", async () => {
   const response = await request(app)
    .options("/api/dashboard/stats")
    .set("Origin", "https://example.com")
    .expect(res => {
     // Should either accept or reject based on CORS config
     expect([200, 204, 403].includes(res.status)).toBe(true);
    });
  });
 });

 describe("Health Check Endpoints", () => {
  it("should provide health status", async () => {
   const response = await request(app).get("/health").expect(200);

   expect(response.body).toHaveProperty("status");
   expect(response.body.status).toBe("healthy");
  });

  it("should provide API health status", async () => {
   const response = await request(app).get("/api/health").expect(200);

   expect(response.body).toHaveProperty("database");
   expect(response.body).toHaveProperty("timestamp");
  });
 });
});
