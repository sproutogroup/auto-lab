import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { registerRoutes } from "../server/routes";
import express from "express";

describe("Integration Tests", () => {
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

 describe("Complete Vehicle Sales Workflow", () => {
  let vehicleId: number;
  let customerId: number;
  let leadId: number;
  let appointmentId: number;

  it("should create a new lead", async () => {
   const leadData = {
    first_name: "John",
    last_name: "Buyer",
    email: "john.buyer@example.com",
    primary_phone: "01234567890",
    pipeline_stage: "new",
    lead_quality: "hot",
    priority: "high",
    vehicle_interests: "SUV",
    budget_min: 25000,
    budget_max: 35000,
   };

   const response = await request(app)
    .post("/api/leads")
    .set("Cookie", authCookie)
    .send(leadData)
    .expect(200);

   expect(response.body).toHaveProperty("id");
   expect(response.body.pipeline_stage).toBe("new");
   leadId = response.body.id;
  });

  it("should create a vehicle in stock", async () => {
   const vehicleData = {
    stock_number: "INT001",
    make: "BMW",
    model: "X5",
    year: 2023,
    sales_status: "STOCK",
    collection_status: "ON SITE",
    registration: "AB23XYZ",
    mileage: 15000,
    colour: "Black",
    department: "Sales",
    purchase_cash: 28000,
    purchase_fees: 1200,
    vat: 5840,
   };

   const response = await request(app)
    .post("/api/vehicles")
    .set("Cookie", authCookie)
    .send(vehicleData)
    .expect(200);

   expect(response.body).toHaveProperty("id");
   expect(response.body.sales_status).toBe("STOCK");
   vehicleId = response.body.id;
  });

  it("should create an appointment for vehicle viewing", async () => {
   const appointmentData = {
    appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    appointment_time: "14:00",
    appointment_type: "viewing",
    status: "scheduled",
    lead_id: leadId,
    vehicle_id: vehicleId,
    notes: "Customer interested in BMW X5",
   };

   const response = await request(app)
    .post("/api/appointments")
    .set("Cookie", authCookie)
    .send(appointmentData)
    .expect(200);

   expect(response.body).toHaveProperty("id");
   expect(response.body.appointment_type).toBe("viewing");
   appointmentId = response.body.id;
  });

  it("should progress lead through pipeline stages", async () => {
   // Update to qualified
   await request(app)
    .put(`/api/leads/${leadId}`)
    .set("Cookie", authCookie)
    .send({ pipeline_stage: "qualified" })
    .expect(200);

   // Update to negotiation
   await request(app)
    .put(`/api/leads/${leadId}`)
    .set("Cookie", authCookie)
    .send({ pipeline_stage: "negotiation" })
    .expect(200);

   // Verify final stage
   const response = await request(app).get(`/api/leads/${leadId}`).set("Cookie", authCookie).expect(200);

   expect(response.body.pipeline_stage).toBe("negotiation");
  });

  it("should convert lead to customer", async () => {
   const response = await request(app)
    .post(`/api/leads/${leadId}/convert`)
    .set("Cookie", authCookie)
    .expect(200);

   expect(response.body).toHaveProperty("customerId");
   customerId = response.body.customerId;

   // Verify customer was created
   const customerResponse = await request(app)
    .get(`/api/customers/${customerId}`)
    .set("Cookie", authCookie)
    .expect(200);

   expect(customerResponse.body.email).toBe("john.buyer@example.com");
  });

  it("should complete the vehicle sale", async () => {
   const saleData = {
    sales_status: "SOLD",
    customer_id: customerId,
    sale_date: new Date().toISOString(),
    finance_payment: 32000,
    cash_payment: 0,
    px_value: 1500,
    salesperson: "admin",
   };

   const response = await request(app)
    .put(`/api/vehicles/${vehicleId}`)
    .set("Cookie", authCookie)
    .send(saleData)
    .expect(200);

   expect(response.body.sales_status).toBe("SOLD");
   expect(response.body.customer_id).toBe(customerId);
  });

  it("should update appointment status to completed", async () => {
   const response = await request(app)
    .put(`/api/appointments/${appointmentId}`)
    .set("Cookie", authCookie)
    .send({ status: "completed" })
    .expect(200);

   expect(response.body.status).toBe("completed");
  });

  it("should reflect sale in dashboard statistics", async () => {
   const response = await request(app).get("/api/dashboard/stats").set("Cookie", authCookie).expect(200);

   const stats = response.body;
   expect(stats.monthlySales.volume).toBeGreaterThan(0);
   expect(stats.monthlySales.value).toBeGreaterThan(0);
  });

  // Cleanup
  afterAll(async () => {
   if (appointmentId) {
    await request(app).delete(`/api/appointments/${appointmentId}`).set("Cookie", authCookie);
   }
   if (vehicleId) {
    await request(app).delete(`/api/vehicles/${vehicleId}`).set("Cookie", authCookie);
   }
   if (customerId) {
    await request(app).delete(`/api/customers/${customerId}`).set("Cookie", authCookie);
   }
   if (leadId) {
    await request(app).delete(`/api/leads/${leadId}`).set("Cookie", authCookie);
   }
  });
 });

 describe("User Permission System Integration", () => {
  let testUserId: number;
  let testUserCookie: string;

  it("should create a new user with limited permissions", async () => {
   const userData = {
    username: "testuser",
    email: "test@example.com",
    password: "testpass123",
    first_name: "Test",
    last_name: "User",
    role: "salesperson",
   };

   const response = await request(app)
    .post("/api/users")
    .set("Cookie", authCookie)
    .send(userData)
    .expect(200);

   expect(response.body).toHaveProperty("id");
   testUserId = response.body.id;
  });

  it("should login with new user", async () => {
   const response = await request(app)
    .post("/api/auth/login")
    .send({
     username: "testuser",
     password: "testpass123",
    })
    .expect(200);

   testUserCookie = response.headers["set-cookie"][0];
  });

  it("should restrict access based on permissions", async () => {
   // Test user should not be able to access admin endpoints
   await request(app).get("/api/users").set("Cookie", testUserCookie).expect(403);
  });

  it("should allow access to permitted endpoints", async () => {
   // Test user should be able to access vehicles
   await request(app).get("/api/vehicles").set("Cookie", testUserCookie).expect(200);
  });

  afterAll(async () => {
   if (testUserId) {
    await request(app).delete(`/api/users/${testUserId}`).set("Cookie", authCookie);
   }
  });
 });

 describe("Data Consistency Integration", () => {
  it("should maintain referential integrity", async () => {
   // Create customer
   const customerResponse = await request(app)
    .post("/api/customers")
    .set("Cookie", authCookie)
    .send({
     first_name: "Jane",
     last_name: "Smith",
     email: "jane.smith@example.com",
     phone: "09876543210",
    })
    .expect(200);

   const customerId = customerResponse.body.id;

   // Create vehicle and assign to customer
   const vehicleResponse = await request(app)
    .post("/api/vehicles")
    .set("Cookie", authCookie)
    .send({
     stock_number: "INT002",
     make: "Mercedes",
     model: "C-Class",
     year: 2023,
     sales_status: "SOLD",
     customer_id: customerId,
    })
    .expect(200);

   const vehicleId = vehicleResponse.body.id;

   // Try to delete customer (should fail due to foreign key)
   await request(app).delete(`/api/customers/${customerId}`).set("Cookie", authCookie).expect(400);

   // Cleanup in correct order
   await request(app).delete(`/api/vehicles/${vehicleId}`).set("Cookie", authCookie).expect(200);

   await request(app).delete(`/api/customers/${customerId}`).set("Cookie", authCookie).expect(200);
  });
 });

 describe("Business Intelligence Integration", () => {
  it("should generate accurate reports across all modules", async () => {
   // Get all BI reports
   const [financialAudit, vehiclePerformance, salesManagement, executiveDashboard] = await Promise.all([
    request(app).get("/api/business-intelligence/financial-audit").set("Cookie", authCookie),
    request(app).get("/api/business-intelligence/vehicle-performance").set("Cookie", authCookie),
    request(app).get("/api/business-intelligence/sales-management").set("Cookie", authCookie),
    request(app).get("/api/business-intelligence/executive-dashboard").set("Cookie", authCookie),
   ]);

   // All should return 200
   expect(financialAudit.status).toBe(200);
   expect(vehiclePerformance.status).toBe(200);
   expect(salesManagement.status).toBe(200);
   expect(executiveDashboard.status).toBe(200);

   // Verify data consistency across reports
   const financialRevenue = financialAudit.body.revenue_analysis.total_revenue;
   const executiveRevenue = executiveDashboard.body.key_metrics.total_revenue;

   expect(financialRevenue).toBe(executiveRevenue);
  });
 });
});
