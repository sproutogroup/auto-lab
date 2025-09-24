import request from "supertest";
import { setupVite } from "../server/vite";
import { registerRoutes } from "../server/routes";
import express from "express";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("Security Tests", () => {
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

  describe("Rate Limiting", () => {
    it("should apply rate limiting to auth endpoints", async () => {
      // Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app).post("/api/auth/login").send({
            username: "admin",
            password: "wrongpassword",
          }),
        );
      }

      const responses = await Promise.all(promises);

      // Should have at least one 429 response (rate limited)
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe("Input Validation", () => {
    it("should reject SQL injection attempts", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: "admin'; DROP TABLE users; --",
        password: "password",
      });

      // Should not crash the server
      expect(response.status).toBe(401);
    });

    it("should reject XSS attempts", async () => {
      const response = await request(app).post("/api/auth/login").send({
        username: '<script>alert("xss")</script>',
        password: "password",
      });

      // Should not crash the server
      expect(response.status).toBe(401);
    });
  });

  describe("Authentication Protection", () => {
    it("should protect dashboard endpoints", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .expect(401);

      expect(response.body).toHaveProperty("message", "Not authenticated");
    });

    it("should protect vehicle endpoints", async () => {
      const response = await request(app).get("/api/vehicles").expect(401);

      expect(response.body).toHaveProperty("message", "Not authenticated");
    });

    it("should protect customer endpoints", async () => {
      const response = await request(app).get("/api/customers").expect(401);

      expect(response.body).toHaveProperty("message", "Not authenticated");
    });

    it("should protect leads endpoints", async () => {
      const response = await request(app).get("/api/leads").expect(401);

      expect(response.body).toHaveProperty("message", "Not authenticated");
    });

    it("should protect business intelligence endpoints", async () => {
      const response = await request(app)
        .get("/api/business-intelligence/financial-audit")
        .expect(401);

      expect(response.body).toHaveProperty("message", "Not authenticated");
    });
  });

  describe("CORS Protection", () => {
    it("should include CORS headers", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });

    it("should handle preflight requests", async () => {
      const response = await request(app)
        .options("/api/auth/login")
        .expect(200);

      expect(response.headers).toHaveProperty("access-control-allow-methods");
      expect(response.headers).toHaveProperty("access-control-allow-headers");
    });
  });

  describe("Security Headers", () => {
    it("should include security headers", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.headers).toHaveProperty(
        "x-content-type-options",
        "nosniff",
      );
      expect(response.headers).toHaveProperty("x-frame-options", "DENY");
      expect(response.headers).toHaveProperty(
        "x-xss-protection",
        "1; mode=block",
      );
    });

    it("should include CSP header", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.headers).toHaveProperty("content-security-policy");
    });
  });
});
