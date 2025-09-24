import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import { registerRoutes } from "../server/routes";
import express from "express";

describe("Business Logic Tests", () => {
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

  describe("Vehicle Management", () => {
    it("should calculate financial totals correctly", async () => {
      // Create a test vehicle with financial data
      const vehicleData = {
        stock_number: "TEST001",
        make: "BMW",
        model: "X5",
        year: 2023,
        sales_status: "STOCK",
        purchase_px_value: 1000,
        purchase_cash: 20000,
        purchase_fees: 500,
        purchase_finance_settlement: 0,
        purchase_bank_transfer: 0,
        vat: 4200,
      };

      const response = await request(app)
        .post("/api/vehicles")
        .set("Cookie", authCookie)
        .send(vehicleData)
        .expect(200);

      const vehicle = response.body;
      const expectedTotal = 1000 + 20000 + 500 + 0 + 0 + 4200;

      expect(vehicle.purchase_price_total).toBe(expectedTotal);

      // Cleanup
      await request(app)
        .delete(`/api/vehicles/${vehicle.id}`)
        .set("Cookie", authCookie);
    });

    it("should calculate gross profit for sold vehicles", async () => {
      const vehicleData = {
        stock_number: "TEST002",
        make: "Mercedes",
        model: "C-Class",
        year: 2023,
        sales_status: "SOLD",
        purchase_px_value: 1000,
        purchase_cash: 18000,
        purchase_fees: 300,
        bank_payment: 0,
        finance_payment: 22000,
        finance_settlement: 0,
        px_value: 500,
        vat_payment: 0,
        cash_payment: 0,
      };

      const response = await request(app)
        .post("/api/vehicles")
        .set("Cookie", authCookie)
        .send(vehicleData)
        .expect(200);

      const vehicle = response.body;
      const purchaseTotal = 1000 + 18000 + 300;
      const saleTotal = 22000 + 500;
      const expectedGrossProfit = saleTotal - purchaseTotal;

      expect(vehicle.total_gp).toBe(expectedGrossProfit);

      // Cleanup
      await request(app)
        .delete(`/api/vehicles/${vehicle.id}`)
        .set("Cookie", authCookie);
    });

    it("should filter vehicles by status correctly", async () => {
      const response = await request(app)
        .get("/api/vehicles?status=STOCK")
        .set("Cookie", authCookie)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((vehicle: any) => {
        expect(vehicle.sales_status).toBe("STOCK");
      });
    });

    it("should search vehicles by make and model", async () => {
      const response = await request(app)
        .get("/api/vehicles?make=BMW&model=X5")
        .set("Cookie", authCookie)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((vehicle: any) => {
        expect(vehicle.make).toBe("BMW");
        expect(vehicle.model).toBe("X5");
      });
    });
  });

  describe("Dashboard Analytics", () => {
    it("should calculate stock summary correctly", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .set("Cookie", authCookie)
        .expect(200);

      const stats = response.body;
      expect(stats).toHaveProperty("stockSummary");
      expect(stats.stockSummary).toHaveProperty("totalVehicles");
      expect(stats.stockSummary).toHaveProperty("totalValue");
      expect(stats.stockSummary).toHaveProperty("uniqueMakes");

      expect(typeof stats.stockSummary.totalVehicles).toBe("number");
      expect(typeof stats.stockSummary.totalValue).toBe("number");
      expect(typeof stats.stockSummary.uniqueMakes).toBe("number");
    });

    it("should calculate weekly sales correctly", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .set("Cookie", authCookie)
        .expect(200);

      const stats = response.body;
      expect(stats).toHaveProperty("weeklySales");
      expect(stats.weeklySales).toHaveProperty("thisWeek");
      expect(stats.weeklySales).toHaveProperty("lastWeek");
      expect(stats.weeklySales).toHaveProperty("change");

      expect(typeof stats.weeklySales.thisWeek).toBe("number");
      expect(typeof stats.weeklySales.lastWeek).toBe("number");
    });

    it("should calculate monthly sales correctly", async () => {
      const response = await request(app)
        .get("/api/dashboard/stats")
        .set("Cookie", authCookie)
        .expect(200);

      const stats = response.body;
      expect(stats).toHaveProperty("monthlySales");
      expect(stats.monthlySales).toHaveProperty("volume");
      expect(stats.monthlySales).toHaveProperty("value");
      expect(stats.monthlySales).toHaveProperty("grossProfit");

      expect(typeof stats.monthlySales.volume).toBe("number");
      expect(typeof stats.monthlySales.value).toBe("number");
      expect(typeof stats.monthlySales.grossProfit).toBe("number");
    });
  });

  describe("Customer Management", () => {
    let testCustomerId: number;

    it("should create customer with validation", async () => {
      const customerData = {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
        phone: "01234567890",
        customer_status: "active",
      };

      const response = await request(app)
        .post("/api/customers")
        .set("Cookie", authCookie)
        .send(customerData)
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.first_name).toBe("John");
      expect(response.body.email).toBe("john.doe@example.com");

      testCustomerId = response.body.id;
    });

    it("should reject duplicate email addresses", async () => {
      const customerData = {
        first_name: "Jane",
        last_name: "Smith",
        email: "john.doe@example.com", // Same email as above
        phone: "09876543210",
        customer_status: "active",
      };

      await request(app)
        .post("/api/customers")
        .set("Cookie", authCookie)
        .send(customerData)
        .expect(400);
    });

    it("should update customer information", async () => {
      const updateData = {
        phone: "09876543210",
        customer_status: "legacy",
      };

      const response = await request(app)
        .put(`/api/customers/${testCustomerId}`)
        .set("Cookie", authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.phone).toBe("09876543210");
      expect(response.body.customer_status).toBe("legacy");
    });

    afterAll(async () => {
      if (testCustomerId) {
        await request(app)
          .delete(`/api/customers/${testCustomerId}`)
          .set("Cookie", authCookie);
      }
    });
  });

  describe("Lead Management", () => {
    let testLeadId: number;

    it("should create lead with pipeline stage", async () => {
      const leadData = {
        first_name: "Sarah",
        last_name: "Johnson",
        email: "sarah.johnson@example.com",
        primary_phone: "01234567890",
        pipeline_stage: "new",
        lead_quality: "hot",
        priority: "high",
      };

      const response = await request(app)
        .post("/api/leads")
        .set("Cookie", authCookie)
        .send(leadData)
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.pipeline_stage).toBe("new");
      expect(response.body.lead_quality).toBe("hot");

      testLeadId = response.body.id;
    });

    it("should update lead pipeline stage", async () => {
      const updateData = {
        pipeline_stage: "qualified",
        notes: "Customer very interested in BMW X5",
      };

      const response = await request(app)
        .put(`/api/leads/${testLeadId}`)
        .set("Cookie", authCookie)
        .send(updateData)
        .expect(200);

      expect(response.body.pipeline_stage).toBe("qualified");
      expect(response.body.notes).toBe("Customer very interested in BMW X5");
    });

    it("should convert lead to customer", async () => {
      const response = await request(app)
        .post(`/api/leads/${testLeadId}/convert`)
        .set("Cookie", authCookie)
        .expect(200);

      expect(response.body).toHaveProperty("customerId");
      expect(response.body.message).toBe(
        "Lead converted to customer successfully",
      );
    });

    afterAll(async () => {
      if (testLeadId) {
        await request(app)
          .delete(`/api/leads/${testLeadId}`)
          .set("Cookie", authCookie);
      }
    });
  });

  describe("Business Intelligence", () => {
    it("should generate financial audit report", async () => {
      const response = await request(app)
        .get("/api/business-intelligence/financial-audit")
        .set("Cookie", authCookie)
        .expect(200);

      const report = response.body;
      expect(report).toHaveProperty("revenue_analysis");
      expect(report).toHaveProperty("cost_analysis");
      expect(report).toHaveProperty("profitability_analysis");

      expect(report.revenue_analysis).toHaveProperty("total_revenue");
      expect(report.cost_analysis).toHaveProperty("total_purchase_costs");
      expect(report.profitability_analysis).toHaveProperty(
        "gross_profit_margin",
      );
    });

    it("should generate vehicle performance report", async () => {
      const response = await request(app)
        .get("/api/business-intelligence/vehicle-performance")
        .set("Cookie", authCookie)
        .expect(200);

      const report = response.body;
      expect(report).toHaveProperty("turnover_metrics");
      expect(report).toHaveProperty("pricing_metrics");
      expect(report).toHaveProperty("quality_metrics");

      expect(report.turnover_metrics).toHaveProperty("average_days_to_sell");
      expect(report.pricing_metrics).toHaveProperty(
        "average_markup_percentage",
      );
    });

    it("should generate executive dashboard", async () => {
      const response = await request(app)
        .get("/api/business-intelligence/executive-dashboard")
        .set("Cookie", authCookie)
        .expect(200);

      const dashboard = response.body;
      expect(dashboard).toHaveProperty("key_metrics");
      expect(dashboard).toHaveProperty("strategic_insights");
      expect(dashboard).toHaveProperty("forecasts");

      expect(dashboard.key_metrics).toHaveProperty("total_revenue");
      expect(dashboard.strategic_insights).toHaveProperty(
        "growth_opportunities",
      );
    });
  });

  describe("Data Validation", () => {
    it("should validate vehicle data before saving", async () => {
      const invalidVehicle = {
        stock_number: "", // Empty stock number
        make: "BMW",
        year: "invalid-year", // Invalid year
      };

      await request(app)
        .post("/api/vehicles")
        .set("Cookie", authCookie)
        .send(invalidVehicle)
        .expect(400);
    });

    it("should validate customer email format", async () => {
      const invalidCustomer = {
        first_name: "John",
        last_name: "Doe",
        email: "invalid-email", // Invalid email format
        phone: "01234567890",
      };

      await request(app)
        .post("/api/customers")
        .set("Cookie", authCookie)
        .send(invalidCustomer)
        .expect(400);
    });

    it("should validate lead priority values", async () => {
      const invalidLead = {
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        priority: "invalid-priority", // Invalid priority
      };

      await request(app)
        .post("/api/leads")
        .set("Cookie", authCookie)
        .send(invalidLead)
        .expect(400);
    });
  });
});
