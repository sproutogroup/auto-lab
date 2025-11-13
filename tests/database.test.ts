import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { db } from "../server/db";
import { vehicles, customers, leads, users, jobs, appointments } from "../shared/schema";
import { eq, and, sql } from "drizzle-orm";

describe("Database Operations", () => {
 let testUserId: number;
 let testVehicleId: number;
 let testCustomerId: number;
 let testLeadId: number;

 beforeAll(async () => {
  // Create test user
  const [testUser] = await db
   .insert(users)
   .values({
    username: "testuser",
    email: "test@example.com",
    password_hash: "hashedpassword",
    first_name: "Test",
    last_name: "User",
    role: "salesperson",
   })
   .returning();
  testUserId = testUser.id;
 });

 afterAll(async () => {
  // Clean up test data
  await db.delete(users).where(eq(users.id, testUserId));
 });

 describe("Vehicle Operations", () => {
  it("should create a new vehicle", async () => {
   const [vehicle] = await db
    .insert(vehicles)
    .values({
     stock_number: "TEST001",
     make: "Test",
     model: "Model",
     year: 2023,
     sales_status: "STOCK",
     collection_status: "ON SITE",
     registration: "TEST123",
     mileage: 1000,
     colour: "Red",
     department: "Sales",
    })
    .returning();

   expect(vehicle).toHaveProperty("id");
   expect(vehicle.stock_number).toBe("TEST001");
   expect(vehicle.make).toBe("Test");
   expect(vehicle.sales_status).toBe("STOCK");

   testVehicleId = vehicle.id;
  });

  it("should retrieve vehicle by ID", async () => {
   const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, testVehicleId));

   expect(vehicle).toBeDefined();
   expect(vehicle.stock_number).toBe("TEST001");
  });

  it("should update vehicle status", async () => {
   await db.update(vehicles).set({ sales_status: "SOLD" }).where(eq(vehicles.id, testVehicleId));

   const [updatedVehicle] = await db.select().from(vehicles).where(eq(vehicles.id, testVehicleId));
   expect(updatedVehicle.sales_status).toBe("SOLD");
  });

  it("should filter vehicles by status", async () => {
   const stockVehicles = await db.select().from(vehicles).where(eq(vehicles.sales_status, "STOCK"));
   expect(Array.isArray(stockVehicles)).toBe(true);
  });

  afterAll(async () => {
   if (testVehicleId) {
    await db.delete(vehicles).where(eq(vehicles.id, testVehicleId));
   }
  });
 });

 describe("Customer Operations", () => {
  it("should create a new customer", async () => {
   const [customer] = await db
    .insert(customers)
    .values({
     first_name: "John",
     last_name: "Doe",
     email: "john.doe@example.com",
     phone: "01234567890",
     customer_status: "active",
     assigned_salesperson_id: testUserId,
    })
    .returning();

   expect(customer).toHaveProperty("id");
   expect(customer.first_name).toBe("John");
   expect(customer.email).toBe("john.doe@example.com");

   testCustomerId = customer.id;
  });

  it("should retrieve customer by email", async () => {
   const [customer] = await db.select().from(customers).where(eq(customers.email, "john.doe@example.com"));

   expect(customer).toBeDefined();
   expect(customer.first_name).toBe("John");
  });

  it("should update customer information", async () => {
   await db.update(customers).set({ phone: "09876543210" }).where(eq(customers.id, testCustomerId));

   const [updatedCustomer] = await db.select().from(customers).where(eq(customers.id, testCustomerId));
   expect(updatedCustomer.phone).toBe("09876543210");
  });

  afterAll(async () => {
   if (testCustomerId) {
    await db.delete(customers).where(eq(customers.id, testCustomerId));
   }
  });
 });

 describe("Lead Operations", () => {
  it("should create a new lead", async () => {
   const [lead] = await db
    .insert(leads)
    .values({
     first_name: "Jane",
     last_name: "Smith",
     email: "jane.smith@example.com",
     primary_phone: "01234567890",
     pipeline_stage: "new",
     lead_quality: "hot",
     priority: "high",
     assigned_salesperson_id: testUserId,
    })
    .returning();

   expect(lead).toHaveProperty("id");
   expect(lead.first_name).toBe("Jane");
   expect(lead.pipeline_stage).toBe("new");

   testLeadId = lead.id;
  });

  it("should update lead pipeline stage", async () => {
   await db.update(leads).set({ pipeline_stage: "qualified" }).where(eq(leads.id, testLeadId));

   const [updatedLead] = await db.select().from(leads).where(eq(leads.id, testLeadId));
   expect(updatedLead.pipeline_stage).toBe("qualified");
  });

  it("should filter leads by quality", async () => {
   const hotLeads = await db.select().from(leads).where(eq(leads.lead_quality, "hot"));
   expect(Array.isArray(hotLeads)).toBe(true);
  });

  afterAll(async () => {
   if (testLeadId) {
    await db.delete(leads).where(eq(leads.id, testLeadId));
   }
  });
 });

 describe("Database Indexes Performance", () => {
  it("should use index for vehicle status queries", async () => {
   const query = db.select().from(vehicles).where(eq(vehicles.sales_status, "STOCK"));
   const explainResult = await db.execute(sql`EXPLAIN ANALYZE ${query}`);

   // Check that index is being used (should contain "Index" in the plan)
   const plan = explainResult.rows.map(row => Object.values(row)[0]).join(" ");
   expect(plan).toContain("Index");
  });

  it("should use index for customer email queries", async () => {
   const query = db.select().from(customers).where(eq(customers.email, "test@example.com"));
   const explainResult = await db.execute(sql`EXPLAIN ANALYZE ${query}`);

   const plan = explainResult.rows.map(row => Object.values(row)[0]).join(" ");
   expect(plan).toContain("Index");
  });

  it("should use index for lead pipeline queries", async () => {
   const query = db.select().from(leads).where(eq(leads.pipeline_stage, "qualified"));
   const explainResult = await db.execute(sql`EXPLAIN ANALYZE ${query}`);

   const plan = explainResult.rows.map(row => Object.values(row)[0]).join(" ");
   expect(plan).toContain("Index");
  });
 });

 describe("Data Integrity", () => {
  it("should enforce foreign key constraints", async () => {
   await expect(
    db.insert(appointments).values({
     appointment_date: new Date(),
     appointment_time: "10:00",
     appointment_type: "viewing",
     status: "scheduled",
     customer_id: 99999, // Non-existent customer
     assigned_to_id: testUserId,
     vehicle_id: testVehicleId,
    }),
   ).rejects.toThrow();
  });

  it("should validate required fields", async () => {
   await expect(
    db.insert(vehicles).values({
     // Missing required fields
    } as any),
   ).rejects.toThrow();
  });

  it("should handle duplicate unique constraints", async () => {
   // Create first vehicle
   await db.insert(vehicles).values({
    stock_number: "UNIQUE001",
    make: "Test",
    model: "Model",
    year: 2023,
    sales_status: "STOCK",
    collection_status: "ON SITE",
   });

   // Try to create duplicate
   await expect(
    db.insert(vehicles).values({
     stock_number: "UNIQUE001", // Duplicate stock number
     make: "Test",
     model: "Model",
     year: 2023,
     sales_status: "STOCK",
     collection_status: "ON SITE",
    }),
   ).rejects.toThrow();

   // Cleanup
   await db.delete(vehicles).where(eq(vehicles.stock_number, "UNIQUE001"));
  });
 });

 describe("Complex Queries", () => {
  it("should perform vehicle search with multiple filters", async () => {
   const results = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.sales_status, "STOCK"), eq(vehicles.make, "BMW")));

   expect(Array.isArray(results)).toBe(true);
   results.forEach(vehicle => {
    expect(vehicle.sales_status).toBe("STOCK");
    expect(vehicle.make).toBe("BMW");
   });
  });

  it("should calculate dashboard statistics", async () => {
   const [stats] = await db.execute(sql`
        SELECT 
          COUNT(*) as total_vehicles,
          COUNT(CASE WHEN sales_status = 'STOCK' THEN 1 END) as stock_vehicles,
          COUNT(CASE WHEN sales_status = 'SOLD' THEN 1 END) as sold_vehicles
        FROM vehicles
      `);

   expect(stats).toHaveProperty("total_vehicles");
   expect(stats).toHaveProperty("stock_vehicles");
   expect(stats).toHaveProperty("sold_vehicles");
  });

  it("should join vehicles with customers for sold vehicles", async () => {
   const results = await db.execute(sql`
        SELECT v.stock_number, v.make, v.model, c.first_name, c.last_name
        FROM vehicles v
        LEFT JOIN customers c ON v.customer_id = c.id
        WHERE v.sales_status = 'SOLD'
        LIMIT 10
      `);

   expect(Array.isArray(results.rows)).toBe(true);
  });
 });
});
