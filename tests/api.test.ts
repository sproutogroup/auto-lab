import request from "supertest";
import { setupVite } from "../server/vite";
import { registerRoutes } from "../server/routes";
import express from "express";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("API Endpoints", () => {
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

 describe("Health Checks", () => {
  it("should return health status", async () => {
   const response = await request(app).get("/health").expect(200);

   expect(response.body).toHaveProperty("status", "healthy");
   expect(response.body).toHaveProperty("timestamp");
   expect(response.body).toHaveProperty("uptime");
   expect(response.body).toHaveProperty("database");
  });

  it("should return API health status", async () => {
   const response = await request(app).get("/api/health").expect(200);

   expect(response.body).toHaveProperty("status", "healthy");
   expect(response.body).toHaveProperty("timestamp");
  });
 });

 describe("Authentication", () => {
  it("should reject unauthenticated requests", async () => {
   const response = await request(app).get("/api/auth/user").expect(401);

   expect(response.body).toHaveProperty("message", "Not authenticated");
  });

  it("should accept valid login credentials", async () => {
   const response = await request(app)
    .post("/api/auth/login")
    .send({
     username: "admin",
     password: "admin123",
    })
    .expect(200);

   expect(response.body).toHaveProperty("message", "Login successful");
   expect(response.body).toHaveProperty("user");
   expect(response.body.user).toHaveProperty("username", "admin");
  });

  it("should reject invalid login credentials", async () => {
   const response = await request(app)
    .post("/api/auth/login")
    .send({
     username: "admin",
     password: "wrongpassword",
    })
    .expect(401);

   expect(response.body).toHaveProperty("message", "Invalid credentials");
  });
 });

 describe("Vehicle API", () => {
  let authCookie: string;

  beforeAll(async () => {
   // Login to get auth cookie
   const loginResponse = await request(app).post("/api/auth/login").send({
    username: "admin",
    password: "admin123",
   });

   authCookie = loginResponse.headers["set-cookie"][0];
  });

  it("should return vehicles list", async () => {
   const response = await request(app).get("/api/vehicles").set("Cookie", authCookie).expect(200);

   expect(Array.isArray(response.body)).toBe(true);
  });

  it("should return sold vehicles", async () => {
   const response = await request(app).get("/api/vehicles/sold").set("Cookie", authCookie).expect(200);

   expect(Array.isArray(response.body)).toBe(true);
  });
 });

 describe("Dashboard API", () => {
  let authCookie: string;

  beforeAll(async () => {
   const loginResponse = await request(app).post("/api/auth/login").send({
    username: "admin",
    password: "admin123",
   });

   authCookie = loginResponse.headers["set-cookie"][0];
  });

  it("should return dashboard stats", async () => {
   const response = await request(app).get("/api/dashboard/stats").set("Cookie", authCookie).expect(200);

   expect(response.body).toHaveProperty("stockSummary");
   expect(response.body).toHaveProperty("weeklySales");
   expect(response.body).toHaveProperty("monthlySales");
   expect(response.body).toHaveProperty("boughtSummary");
   expect(response.body).toHaveProperty("carsIncoming");
   expect(response.body).toHaveProperty("financeSales");
  });
 });

 describe("Customer API", () => {
  let authCookie: string;

  beforeAll(async () => {
   const loginResponse = await request(app).post("/api/auth/login").send({
    username: "admin",
    password: "admin123",
   });

   authCookie = loginResponse.headers["set-cookie"][0];
  });

  it("should return customer stats", async () => {
   const response = await request(app).get("/api/customers/stats").set("Cookie", authCookie).expect(200);

   expect(response.body).toHaveProperty("totalCustomers");
   expect(response.body).toHaveProperty("activeCustomers");
   expect(response.body).toHaveProperty("highValueCustomers");
  });
 });

 describe("Leads API", () => {
  let authCookie: string;

  beforeAll(async () => {
   const loginResponse = await request(app).post("/api/auth/login").send({
    username: "admin",
    password: "admin123",
   });

   authCookie = loginResponse.headers["set-cookie"][0];
  });

  it("should return leads stats", async () => {
   const response = await request(app).get("/api/leads/stats").set("Cookie", authCookie).expect(200);

   expect(response.body).toHaveProperty("totalLeads");
   expect(response.body).toHaveProperty("newLeads");
   expect(response.body).toHaveProperty("qualifiedLeads");
  });
 });

 describe("Business Intelligence API", () => {
  let authCookie: string;

  beforeAll(async () => {
   const loginResponse = await request(app).post("/api/auth/login").send({
    username: "admin",
    password: "admin123",
   });

   authCookie = loginResponse.headers["set-cookie"][0];
  });

  it("should return financial audit data", async () => {
   const response = await request(app)
    .get("/api/business-intelligence/financial-audit")
    .set("Cookie", authCookie)
    .expect(200);

   expect(response.body).toHaveProperty("revenue_analysis");
   expect(response.body).toHaveProperty("cost_analysis");
   expect(response.body).toHaveProperty("profitability_analysis");
  });

  it("should return vehicle performance data", async () => {
   const response = await request(app)
    .get("/api/business-intelligence/vehicle-performance")
    .set("Cookie", authCookie)
    .expect(200);

   expect(response.body).toHaveProperty("turnover_metrics");
   expect(response.body).toHaveProperty("pricing_metrics");
   expect(response.body).toHaveProperty("quality_metrics");
  });
 });
});
