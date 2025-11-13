import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../server/index";
import { db } from "../server/db";
import { vehicles } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

describe("Dashboard Real-time Updates", () => {
 let authCookie: string;
 let testVehicleId: number;

 beforeAll(async () => {
  // Login to get auth cookie
  const loginResponse = await request(app)
   .post("/api/auth/login")
   .send({ username: "admin", password: "admin123" });

  authCookie = loginResponse.headers["set-cookie"][0];
 });

 afterAll(async () => {
  // Cleanup test vehicle if it exists
  if (testVehicleId) {
   await db.delete(vehicles).where(eq(vehicles.id, testVehicleId));
  }
 });

 it("should automatically refresh dashboard when vehicle is added", async () => {
  // Get initial dashboard stats
  const initialStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const initialStats = initialStatsResponse.body;
  const initialStockVehicles = initialStats.stockSummary.totalVehicles;

  // Add a new vehicle
  const newVehicle = {
   stock_number: `TEST${Date.now()}`,
   make: "TestMake",
   model: "TestModel",
   derivative: "TestDerivative",
   colour: "Red",
   year: 2020,
   sales_status: "STOCK",
   collection_status: "ON SITE",
   registration: "TEST123",
   chassis_number: "TEST123456",
   purchase_invoice_date: "2025-01-01",
   purchase_px_value: "5000",
   purchase_cash: "15000",
   purchase_fees: "500",
   purchase_finance_settlement: "0",
   purchase_bank_transfer: "0",
   vat: "3000",
   department: "Main",
   buyer: "Test Buyer",
   mileage: 50000,
   date_of_registration: "2020-01-01",
   sale_date: "",
   bank_payment: "0",
   finance_payment: "0",
   finance_settlement: "0",
   px_value: "0",
   vat_payment: "0",
   cash_payment: "0",
   cash_o_b: "0",
   px_o_r_value: "0",
   road_tax: "0",
   dvla: "0",
   alloy_insurance: "0",
   paint_insurance: "0",
   gap_insurance: "0",
   parts_cost: "0",
   paint_labour_costs: "0",
   warranty_costs: "0",
   payment_notes: "Test payment notes",
   customer_first_name: "",
   customer_surname: "",
  };

  // Add vehicle
  const addResponse = await request(app)
   .post("/api/vehicles")
   .set("Cookie", authCookie)
   .send(newVehicle)
   .expect(201);

  testVehicleId = addResponse.body.id;

  // Get updated dashboard stats
  const updatedStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const updatedStats = updatedStatsResponse.body;
  const updatedStockVehicles = updatedStats.stockSummary.totalVehicles;

  // Verify that the dashboard stats have been updated
  expect(updatedStockVehicles).toBe(initialStockVehicles + 1);
  expect(updatedStats.stockSummary.totalValue).toBeGreaterThan(initialStats.stockSummary.totalValue);
 });

 it("should automatically refresh dashboard when vehicle status is updated", async () => {
  // Get initial dashboard stats
  const initialStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const initialStats = initialStatsResponse.body;
  const initialStockVehicles = initialStats.stockSummary.totalVehicles;

  // Update vehicle status from STOCK to SOLD
  const updateData = {
   sales_status: "SOLD",
   sale_date: "2025-01-15",
   bank_payment: "20000",
   finance_payment: "5000",
   finance_settlement: "0",
   px_value: "0",
   vat_payment: "4000",
   cash_payment: "0",
   customer_first_name: "John",
   customer_surname: "Doe",
  };

  await request(app)
   .put(`/api/vehicles/${testVehicleId}`)
   .set("Cookie", authCookie)
   .send(updateData)
   .expect(200);

  // Get updated dashboard stats
  const updatedStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const updatedStats = updatedStatsResponse.body;
  const updatedStockVehicles = updatedStats.stockSummary.totalVehicles;

  // Verify that stock count decreased by 1 (vehicle is no longer in stock)
  expect(updatedStockVehicles).toBe(initialStockVehicles - 1);

  // Verify monthly sales have increased
  expect(updatedStats.monthlySales.thisMonth).toBeGreaterThan(initialStats.monthlySales.thisMonth);
  expect(updatedStats.monthlySales.thisMonthValue).toBeGreaterThan(initialStats.monthlySales.thisMonthValue);
 });

 it("should automatically refresh dashboard when vehicle is deleted", async () => {
  // Get current dashboard stats
  const initialStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const initialStats = initialStatsResponse.body;
  const initialTotalVehicles = initialStats.stockSummary.totalVehicles;

  // Delete the test vehicle
  await request(app).delete(`/api/vehicles/${testVehicleId}`).set("Cookie", authCookie).expect(200);

  // Reset testVehicleId since it's been deleted
  testVehicleId = 0;

  // Get updated dashboard stats
  const updatedStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const updatedStats = updatedStatsResponse.body;

  // Verify that the dashboard reflects the deletion
  // Note: Since we sold the vehicle in the previous test, it should still show same count
  // as it wasn't counted in stock anyway
  expect(updatedStats.stockSummary.totalVehicles).toBe(initialTotalVehicles);
 });

 it("should automatically refresh dashboard when vehicles are imported via CSV", async () => {
  // Get initial dashboard stats
  const initialStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const initialStats = initialStatsResponse.body;
  const initialStockVehicles = initialStats.stockSummary.totalVehicles;

  // Import a vehicle via CSV
  const csvVehicles = [
   {
    stock_number: `CSV${Date.now()}`,
    make: "Honda",
    model: "Civic",
    derivative: "Type R",
    colour: "White",
    year: 2023,
    sales_status: "STOCK",
    collection_status: "ON SITE",
    registration: "CSV123",
    chassis_number: "CSV123456",
    purchase_invoice_date: "2025-01-01",
    purchase_px_value: "8000",
    purchase_cash: "25000",
    purchase_fees: "1000",
    purchase_finance_settlement: "0",
    purchase_bank_transfer: "0",
    vat: "5000",
    department: "Main",
    buyer: "CSV Buyer",
    mileage: 1000,
    date_of_registration: "2023-01-01",
    sale_date: "",
    bank_payment: "0",
    finance_payment: "0",
    finance_settlement: "0",
    px_value: "0",
    vat_payment: "0",
    cash_payment: "0",
    cash_o_b: "0",
    px_o_r_value: "0",
    road_tax: "0",
    dvla: "0",
    alloy_insurance: "0",
    paint_insurance: "0",
    gap_insurance: "0",
    parts_cost: "0",
    paint_labour_costs: "0",
    warranty_costs: "0",
    payment_notes: "CSV import test",
    customer_first_name: "",
    customer_surname: "",
   },
  ];

  // Import vehicles
  const importResponse = await request(app)
   .post("/api/vehicles/import")
   .set("Cookie", authCookie)
   .send({ vehicles: csvVehicles })
   .expect(200);

  // Store the imported vehicle ID for cleanup
  const importedVehicle = await db
   .select()
   .from(vehicles)
   .where(eq(vehicles.stock_number, csvVehicles[0].stock_number))
   .limit(1);

  if (importedVehicle.length > 0) {
   testVehicleId = importedVehicle[0].id;
  }

  // Get updated dashboard stats
  const updatedStatsResponse = await request(app)
   .get("/api/dashboard/stats")
   .set("Cookie", authCookie)
   .expect(200);

  const updatedStats = updatedStatsResponse.body;
  const updatedStockVehicles = updatedStats.stockSummary.totalVehicles;

  // Verify that the dashboard stats have been updated
  expect(updatedStockVehicles).toBe(initialStockVehicles + 1);
  expect(updatedStats.stockSummary.totalValue).toBeGreaterThan(initialStats.stockSummary.totalValue);
 });
});
