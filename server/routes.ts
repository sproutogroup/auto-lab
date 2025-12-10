import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import ExcelJS from "exceljs";
import { storage } from "./storage";
import {
  setupAuth,
  requireAuth,
  requireAdmin,
  requireManager,
  requirePermission,
  type AuthenticatedRequest,
} from "./auth";
import { notificationService } from "./services/notificationService";
import { openaiNotificationService } from "./services/openaiNotificationService";
import { naturalLanguageNotificationService } from "./services/naturalLanguageNotificationService";
import { aiBusinessIntelligenceService } from "./services/aiBusinessIntelligenceService";
import WebSocketService, { WebSocketEvent } from "./services/websocketService";
import logger from "./logger";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  insertAppointmentSchema,
  insertJobSchema,
  insertStaffScheduleSchema,
  insertJobProgressSchema,
  insertVehicleLogisticsSchema,
  insertJobTemplateSchema,
  insertBoughtVehicleSchema,
  insertPurchaseInvoiceSchema,
  insertSalesInvoiceSchema,
  insertPageDefinitionSchema,
  insertUserPermissionSchema,
  insertNotificationSchema,
  insertNotificationPreferenceSchema,
  insertPushSubscriptionSchema,
  insertDeviceRegistrationSchema,
  insertNotificationRuleSchema,
  insertPinnedMessageSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertVehicleConditionSchema,
  InvoiceApiData

} from "../shared/schema";
import { z } from "zod";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const purchaseUploadDir = path.join(process.cwd(), "uploads", "purchase-invoices");
const salesUploadDir = path.join(process.cwd(), "uploads", "sales-invoices");
const inspectionUploadDir = path.join(process.cwd(), "uploads", "vehicle-inspection-images");

if (!fs.existsSync(purchaseUploadDir)) {
  fs.mkdirSync(purchaseUploadDir, { recursive: true });
}
if (!fs.existsSync(salesUploadDir)) {
  fs.mkdirSync(salesUploadDir, { recursive: true });
}
if (!fs.existsSync(inspectionUploadDir)) {
  fs.mkdirSync(inspectionUploadDir, { recursive: true });
}

const purchaseStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, purchaseUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const salesStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, salesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const vehicleInspectionStorageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, inspectionUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, Word, Excel, and image files are allowed"));
  }
};

const purchaseUpload = multer({
  storage: purchaseStorageConfig,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

const salesUpload = multer({
  storage: salesStorageConfig,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

const vehicleInspectionUpload = multer({
  storage: vehicleInspectionStorageConfig,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Service Worker route with iOS Safari compatible headers
  app.get("/sw.js", (req, res) => {
    const swPath = path.join(process.cwd(), "client", "public", "sw.js");

    console.log("Service Worker requested from:", req.get("User-Agent"));
    console.log("Service Worker path:", swPath);
    console.log("Service Worker exists:", fs.existsSync(swPath));

    // Set iOS Safari compatible headers
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Add CORS headers for iOS Safari
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (fs.existsSync(swPath)) {
      console.log("Serving service worker file");
      res.sendFile(swPath);
    } else {
      console.error("Service Worker file not found at:", swPath);
      res.status(404).send("Service Worker not found");
    }
  });

  // Health Check Endpoints (before authentication for monitoring)
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    });
  });

  app.get("/api/health", async (req, res) => {
    try {
      // Test database connection
      const dbStart = Date.now();
      await storage.getUsers(); // Simple query to test DB
      const dbTime = Date.now() - dbStart;

      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0.0",
        database: {
          status: "connected",
          responseTime: `${dbTime}ms`,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB",
        },
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Database connection failed",
      });
    }
  });

  // Create HTTP server and initialize WebSocket service FIRST
  const httpServer = createServer(app);
  const webSocketService = new WebSocketService(httpServer);
  (global as any).webSocketService = webSocketService;
  console.log("WebSocket service initialized and set globally at start of registerRoutes");

  // Setup authentication system
  setupAuth(app);

  // Users API
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Interactions API
  app.get("/api/interactions", async (req, res) => {
    try {
      const interactions = await storage.getInteractions();
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.get("/api/leads/:id/interactions", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const interactions = await storage.getInteractionsByLead(leadId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching lead interactions:", error);
      res.status(500).json({ message: "Failed to fetch lead interactions" });
    }
  });

  app.post("/api/interactions", async (req, res) => {
    try {
      console.log("Received interaction data:", req.body); // Debug log

      // Validate required fields
      const { lead_id, user_id, interaction_type, interaction_direction, interaction_notes } = req.body;

      if (!lead_id || !user_id || !interaction_type || !interaction_direction || !interaction_notes) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["lead_id", "user_id", "interaction_type", "interaction_direction", "interaction_notes"],
          received: req.body,
        });
      }

      // Fix date handling - convert string dates to Date objects
      const processedData = { ...req.body };

      // Handle follow_up_date
      if (processedData.follow_up_date) {
        if (typeof processedData.follow_up_date === "string" && processedData.follow_up_date.trim() !== "") {
          processedData.follow_up_date = new Date(processedData.follow_up_date);
        } else {
          // If empty string or invalid, set to null
          processedData.follow_up_date = null;
        }
      } else {
        processedData.follow_up_date = null;
      }

      console.log("Processed data for database:", processedData); // Debug log

      const interaction = await storage.createInteraction(processedData);
      console.log("Created interaction:", interaction); // Debug log
      res.status(201).json(interaction);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(500).json({
        message: "Failed to create interaction",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : error,
      });
    }
  });

  // Dashboard API with performance optimization
  app.get("/api/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const startTime = Date.now();
      console.log(
        `[Dashboard API] *** FETCHING DASHBOARD STATS *** - Request by user ${req.user?.username
        } at ${new Date().toLocaleTimeString()}`,
      );

      const stats = await storage.getDashboardStats();
      const duration = Date.now() - startTime;

      // Add detailed logging for dashboard stats
      console.log(`[Dashboard API] Stock Summary:`, {
        totalVehicles: stats.stockSummary.totalVehicles,
        totalValue: stats.stockSummary.totalValue,
        totalMakes: stats.stockSummary.totalMakes,
      });
      console.log(`[Dashboard API] Monthly Sales:`, {
        thisMonth: stats.monthlySales.thisMonth,
        thisMonthValue: stats.monthlySales.thisMonthValue,
        grossProfit: stats.monthlySales.grossProfit,
      });
      console.log(`[Dashboard API] Finance Sales:`, {
        financeAmount: stats.financeSales.monthlyFinanceAmount,
        financeValue: stats.financeSales.monthlyFinanceValue,
      });
      console.log(`[Dashboard API] Query duration: ${duration}ms`);

      // Log slow queries for optimization
      if (duration > 1000) {
        logger.warn("Slow dashboard stats query", {
          duration,
          endpoint: "/api/dashboard/stats",
          user_id: req.user?.id,
          service: "dealership-management",
        });
      }

      // Remove caching headers to ensure fresh data
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.json(stats);
    } catch (error) {
      logger.error("Error fetching dashboard stats:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        user_id: req.user?.id,
        service: "dealership-management",
      });
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Stock Age Analytics API
  app.get("/api/stock-age/analytics", async (req, res) => {
    try {
      const analytics = await storage.getStockAgeAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching stock age analytics:", error);
      res.status(500).json({ message: "Failed to fetch stock age analytics" });
    }
  });

  // Customers API
  app.get("/api/customers", async (req, res) => {
    try {
      const { type, search } = req.query;
      let customers;

      if (search) {
        customers = await storage.searchCustomers(search as string);
      } else if (type) {
        customers = await storage.getCustomersByType(type as string);
      } else {
        customers = await storage.getCustomers();
      }

      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/stats", async (req, res) => {
    try {
      const stats = await storage.getCustomerStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching customer stats:", error);
      res.status(500).json({ message: "Failed to fetch customer stats" });
    }
  });

  app.get("/api/customers/crm-stats", async (req, res) => {
    try {
      const stats = await storage.getCustomerCrmStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching customer CRM stats:", error);
      res.status(500).json({ message: "Failed to fetch customer CRM stats" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req: AuthenticatedRequest, res) => {
    try {
      // Handle empty numeric fields by converting empty strings to null
      const customerData = {
        ...req.body,
        budget_min:
          req.body.budget_min === "" || req.body.budget_min === undefined ? null : parseFloat(req.body.budget_min),
        budget_max:
          req.body.budget_max === "" || req.body.budget_max === undefined ? null : parseFloat(req.body.budget_max),
        total_spent:
          req.body.total_spent === "" || req.body.total_spent === undefined
            ? null
            : parseFloat(req.body.total_spent),
        total_purchases:
          req.body.total_purchases === "" || req.body.total_purchases === undefined
            ? null
            : parseInt(req.body.total_purchases),
      };

      const customer = await storage.createCustomer(customerData);

      // Broadcast customer creation to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastCustomerCreated(customer, req.user?.id);
      }

      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.updateCustomer(id, req.body);

      // Broadcast customer update to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastCustomerUpdated(customer, req.user?.id);
      }

      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomer(id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Broadcast customer deletion to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastCustomerDeleted(id, req.user?.id);
      }

      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Customer Purchase API
  app.get("/api/customer-purchases", async (req, res) => {
    try {
      const purchases = await storage.getAllCustomerPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching all customer purchases:", error);
      res.status(500).json({ message: "Failed to fetch customer purchases" });
    }
  });

  app.get("/api/customers/:id/purchases", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const purchases = await storage.getCustomerPurchases(customerId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching customer purchases:", error);
      res.status(500).json({ message: "Failed to fetch customer purchases" });
    }
  });

  app.post("/api/customers/:id/purchases", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const purchaseData = {
        ...req.body,
        customer_id: customerId,
        purchase_date: new Date(req.body.purchase_date),
        delivery_date: req.body.delivery_date ? new Date(req.body.delivery_date) : null,
      };

      const purchase = await storage.createCustomerPurchase(purchaseData);
      res.status(201).json(purchase);
    } catch (error) {
      console.error("Error creating customer purchase:", error);
      res.status(500).json({ message: "Failed to create customer purchase" });
    }
  });

  app.put("/api/customers/:customerId/purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = {
        ...req.body,
        purchase_date: req.body.purchase_date ? new Date(req.body.purchase_date) : undefined,
        delivery_date: req.body.delivery_date ? new Date(req.body.delivery_date) : undefined,
      };

      const purchase = await storage.updateCustomerPurchase(id, updateData);
      res.json(purchase);
    } catch (error) {
      console.error("Error updating customer purchase:", error);
      res.status(500).json({ message: "Failed to update customer purchase" });
    }
  });

  app.delete("/api/customers/:customerId/purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomerPurchase(id);
      if (!success) {
        return res.status(404).json({ message: "Customer purchase not found" });
      }
      res.json({ message: "Customer purchase deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer purchase:", error);
      res.status(500).json({ message: "Failed to delete customer purchase" });
    }
  });

  // Vehicles API
  app.get("/api/vehicles", requirePermission("vehicle-master"), async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/sold", requirePermission("sold-stock"), async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      const soldVehicles = vehicles.filter(
        vehicle => vehicle.sales_status && vehicle.sales_status.toLowerCase() === "sold",
      );
      res.json(soldVehicles);
    } catch (error) {
      console.error("Error fetching sold vehicles:", error);
      res.status(500).json({ message: "Failed to fetch sold vehicles" });
    }
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicle = await storage.getVehicleById(id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const vehicleData = req.body;
      console.log(`Vehicle Create: Creating new vehicle by user ${req.user?.username}`);

      const newVehicle = await storage.createVehicle(vehicleData);
      console.log(`Vehicle Create: Successfully created vehicle ${newVehicle.id}`);

      // Trigger vehicle.added notification
      try {
        await notificationService.createNotification({
          recipient_user_id: req.user?.id || 1,
          notification_type: "inventory",
          priority_level: "medium",
          title: "New Vehicle Added",
          body: `User ${req.user?.username || "System"} added '${newVehicle.registration || "N/A"
            }' to Vehicle Master`,
          action_url: "/vehicle-master",
          related_entity_type: "vehicle",
          related_entity_id: newVehicle.id,
          status: "pending",
        });
        console.log(`Vehicle Create: Notification created for vehicle ${newVehicle.id}`);
      } catch (notificationError) {
        console.error("Vehicle Create: Notification failed:", notificationError);
      }

      // Broadcast vehicle creation to all connected clients
      const webSocketService = (global as any).webSocketService;
      console.log(`Vehicle Create: WebSocket service available: ${!!webSocketService}`);
      if (webSocketService) {
        console.log(`Vehicle Create: Broadcasting vehicle creation for vehicle ${newVehicle.id}`);
        webSocketService.broadcastVehicleCreated(newVehicle, req.user?.id);
        console.log(`Vehicle Create: Vehicle creation broadcast complete`);
      } else {
        console.log("ERROR: WebSocket service not available for broadcasting vehicle creation");
      }

      res.status(201).json(newVehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.put("/api/vehicles/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    console.log(`🚨🚨🚨 CRITICAL DEBUG: VEHICLE UPDATE ROUTE HIT /api/vehicles/${req.params.id} 🚨🚨🚨`);
    console.log(`🚨 Request method: ${req.method}`);
    console.log(`🚨 Request URL: ${req.url}`);
    console.log(`🚨 User authenticated: ${!!req.user}`);
    console.log(`🚨 Route middleware executed successfully`);

    try {
      const vehicleId = parseInt(req.params.id);
      const vehicleData = req.body;

      console.log(`Vehicle Update: Updating vehicle ${vehicleId} by user ${req.user?.username}`);
      console.log(`Vehicle Update: Request data:`, {
        ...vehicleData,
        id: vehicleId,
      });

      // Get original vehicle for status comparison
      const originalVehicle = await storage.getVehicleById(vehicleId);
      const updatedVehicle = await storage.updateVehicle(vehicleId, vehicleData);

      console.log(`Vehicle Update: Successfully updated vehicle ${vehicleId}`);
      console.log(
        `Vehicle Update: Status change: ${originalVehicle?.sales_status} → ${updatedVehicle.sales_status}`,
      );

      // Trigger vehicle.updated notification
      try {
        await notificationService.createNotification({
          recipient_user_id: req.user?.id || 1,
          notification_type: "inventory",
          priority_level: "medium",
          title: "Vehicle Updated",
          body: `User ${req.user?.username || "System"} updated '${updatedVehicle.registration || "N/A"
            }' - vehicle details changed`,
          action_url: "/vehicle-master",
          related_entity_type: "vehicle",
          related_entity_id: updatedVehicle.id,
          status: "pending",
        });
        console.log(`Vehicle Update: Notification created for vehicle ${vehicleId}`);
      } catch (notificationError) {
        console.error("Vehicle Update: Notification failed:", notificationError);
      }

      // Check if vehicle was sold and trigger vehicle.sold notification
      if (originalVehicle && originalVehicle.sales_status !== "SOLD" && updatedVehicle.sales_status === "SOLD") {
        try {
          const salePrice =
            Number(updatedVehicle.bank_payment || 0) +
            Number(updatedVehicle.finance_payment || 0) +
            Number(updatedVehicle.finance_settlement || 0) +
            Number(updatedVehicle.px_value || 0) +
            Number(updatedVehicle.vat_payment || 0) +
            Number(updatedVehicle.cash_payment || 0);
          await notificationService.createNotification({
            recipient_user_id: req.user?.id || 1,
            notification_type: "sales",
            priority_level: "high",
            title: "Vehicle Sold",
            body: `User ${req.user?.username || "System"} marked '${updatedVehicle.registration || "N/A"
              }' as sold - £${salePrice.toLocaleString()}`,
            action_url: "/vehicle-master",
            related_entity_type: "vehicle",
            related_entity_id: updatedVehicle.id,
            status: "pending",
          });
          console.log(`Vehicle Update: Vehicle sold notification created for vehicle ${vehicleId}`);
        } catch (notificationError) {
          console.error("Vehicle Update: Vehicle sold notification failed:", notificationError);
        }
      }

      // Broadcast vehicle update to all connected clients
      const webSocketService = (global as any).webSocketService;
      console.log(`[DEBUG] Vehicle Update: WebSocket service available: ${!!webSocketService}`);
      console.log(`[DEBUG] Vehicle Update: WebSocket service type:`, typeof webSocketService);
      console.log(
        `[DEBUG] Vehicle Update: Available methods:`,
        webSocketService ? Object.getOwnPropertyNames(Object.getPrototypeOf(webSocketService)) : "N/A",
      );

      if (webSocketService) {
        console.log(`[DEBUG] Vehicle Update: *** BROADCASTING VEHICLE UPDATE FOR VEHICLE ${vehicleId} ***`);
        console.log(`[DEBUG] Vehicle Update: Updated vehicle data:`, {
          id: updatedVehicle.id,
          stock_number: updatedVehicle.stock_number,
          collection_status: updatedVehicle.collection_status,
        });
        webSocketService.broadcastVehicleUpdated(updatedVehicle, req.user?.id);

        // Check if status changed and broadcast status change
        if (originalVehicle && originalVehicle.sales_status !== updatedVehicle.sales_status) {
          console.log(
            `Vehicle Update: Broadcasting status change from ${originalVehicle.sales_status} to ${updatedVehicle.sales_status}`,
          );
          webSocketService.broadcastVehicleStatusChanged(
            vehicleId,
            originalVehicle.sales_status,
            updatedVehicle.sales_status,
            req.user?.id,
          );
        }
        console.log(`Vehicle Update: All broadcasts complete for vehicle ${vehicleId}`);
      } else {
        console.log("ERROR: WebSocket service not available for broadcasting vehicle update");
        console.log("Available global properties:", Object.keys(global as any));
      }

      res.json(updatedVehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const vehicleId = parseInt(req.params.id);

      // Validate vehicle ID
      if (isNaN(vehicleId) || vehicleId <= 0) {
        return res.status(400).json({ message: "Invalid vehicle ID" });
      }

      console.log(`Attempting to delete vehicle ${vehicleId}`);
      const success = await storage.deleteVehicle(vehicleId);

      if (!success) {
        console.log(`Vehicle ${vehicleId} not found or could not be deleted`);
        return res.status(404).json({ message: "Vehicle not found or could not be deleted" });
      }

      console.log(`Vehicle ${vehicleId} deleted successfully`);

      // Broadcast vehicle deletion to all connected clients
      const webSocketService = (global as any).webSocketService;
      console.log(`Global WebSocket service available: ${!!webSocketService}`);
      if (webSocketService) {
        console.log(`Broadcasting vehicle deletion for vehicle ${vehicleId}`);
        webSocketService.broadcastVehicleDeleted(vehicleId, req.user?.id);
        console.log(`Vehicle deletion broadcast complete for vehicle ${vehicleId}`);
      } else {
        console.log("ERROR: WebSocket service not available for broadcasting vehicle deletion");
        console.log("Available global properties:", Object.keys(global as any));
      }

      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({
        message: "Failed to delete vehicle",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  app.post("/api/vehicles/import", requireAuth, async (req, res) => {
    try {
      const { vehicles } = req.body;
      console.log(`CSV Import: Received ${vehicles?.length || 0} vehicles for import`);

      if (!vehicles || !Array.isArray(vehicles)) {
        return res.status(400).json({ message: "Invalid vehicles data" });
      }

      const importedVehicles = await storage.importVehiclesFromCsv(vehicles);
      console.log(`CSV Import: Successfully imported ${importedVehicles.length} vehicles`);

      // Broadcast vehicle import to all connected clients
      const webSocketService = (global as any).webSocketService;
      console.log(`CSV Import: WebSocket service available: ${!!webSocketService}`);
      if (webSocketService) {
        console.log(`CSV Import: Broadcasting vehicle import for ${importedVehicles.length} vehicles`);
        webSocketService.broadcastVehicleImported(importedVehicles.length, req.user?.id);

        // CRITICAL: Also broadcast dashboard stats update like individual vehicle operations
        console.log(`CSV Import: Broadcasting dashboard stats update after CSV import`);
        webSocketService.broadcastDashboardStatsUpdated("csv_import", req.user?.id);

        console.log(`CSV Import: All broadcasts complete (import + dashboard stats)`);
      } else {
        console.log("ERROR: WebSocket service not available for broadcasting vehicle import");
        console.log("Available global properties:", Object.keys(global as any));
      }

      res.json({
        message: "Vehicles imported successfully",
        count: importedVehicles.length,
        vehicles: importedVehicles,
      });
    } catch (error) {
      console.error("Error importing vehicles:", error);
      res.status(500).json({ message: "Failed to import vehicles" });
    }
  });

  // Vehicle Makes API
  app.get("/api/vehicle-makes", async (req, res) => {
    try {
      const makes = await storage.getVehicleMakes();
      res.json(makes);
    } catch (error) {
      console.error("Error fetching vehicle makes:", error);
      res.status(500).json({ message: "Failed to fetch vehicle makes" });
    }
  });

  // Vehicle Models API
  app.get("/api/vehicle-models", async (req, res) => {
    try {
      const models = await storage.getVehicleModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching vehicle models:", error);
      res.status(500).json({ message: "Failed to fetch vehicle models" });
    }
  });

  app.get("/api/vehicle-models/make/:makeId", async (req, res) => {
    try {
      const makeId = parseInt(req.params.makeId);
      const models = await storage.getVehicleModelsByMake(makeId);
      res.json(models);
    } catch (error) {
      console.error("Error fetching vehicle models by make:", error);
      res.status(500).json({ message: "Failed to fetch vehicle models" });
    }
  });

  // Customers API
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomerById(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  // Sales API
  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  // Purchases API
  app.get("/api/purchases", async (req, res) => {
    try {
      const purchases = await storage.getPurchases();
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Leads API - Enhanced sales pipeline
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/stats", async (req, res) => {
    try {
      const stats = await storage.getLeadStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching lead stats:", error);
      res.status(500).json({ message: "Failed to fetch lead stats" });
    }
  });

  app.get("/api/leads/by-stage/:stage", async (req, res) => {
    try {
      const stage = req.params.stage;
      const leads = await storage.getLeadsByStage(stage);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads by stage:", error);
      res.status(500).json({ message: "Failed to fetch leads by stage" });
    }
  });

  app.get("/api/leads/by-salesperson/:salespersonId", async (req, res) => {
    try {
      const salespersonId = parseInt(req.params.salespersonId);
      const leads = await storage.getLeadsBySalesperson(salespersonId);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads by salesperson:", error);
      res.status(500).json({ message: "Failed to fetch leads by salesperson" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      // Helper function to convert date strings to Date objects
      const parseDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr || dateStr === "") return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Clean the request body - remove undefined/empty timestamp fields
      const cleanedBody = { ...req.body };

      // Remove any timestamp fields that are undefined or empty strings
      const timestampFields = ["last_contact_date", "next_follow_up_date", "gdpr_consent_date"];
      timestampFields.forEach(field => {
        if (cleanedBody[field] === "" || cleanedBody[field] === undefined) {
          delete cleanedBody[field];
        } else if (cleanedBody[field]) {
          cleanedBody[field] = parseDate(cleanedBody[field]);
        }
      });

      // Handle empty numeric fields by converting empty strings to null
      const leadData = {
        ...cleanedBody,
        budget_min:
          req.body.budget_min === "" || req.body.budget_min === undefined ? null : parseFloat(req.body.budget_min),
        budget_max:
          req.body.budget_max === "" || req.body.budget_max === undefined ? null : parseFloat(req.body.budget_max),
        trade_in_value:
          req.body.trade_in_value === "" || req.body.trade_in_value === undefined
            ? null
            : parseFloat(req.body.trade_in_value),
        contact_attempts:
          req.body.contact_attempts === "" || req.body.contact_attempts === undefined
            ? 0
            : parseInt(req.body.contact_attempts),
      };

      console.log("Creating lead with data:", JSON.stringify(leadData, null, 2));

      const lead = await storage.createLead(leadData);

      // Trigger lead.created notification
      try {
        await notificationService.createNotification({
          recipient_user_id: req.user?.id || 1,
          notification_type: "customer",
          priority_level: "high",
          title: "New Lead Created",
          body: `User ${req.user?.username || "System"} added a new lead: ${lead.first_name} ${lead.last_name}`,
          action_url: "/leads",
          related_entity_type: "lead",
          related_entity_id: lead.id,
          status: "pending",
        });
        console.log(`Lead Create: Notification created for lead ${lead.id}`);
      } catch (notificationError) {
        console.error("Lead Create: Notification failed:", notificationError);
      }

      // Trigger smart AI notification for new lead
      try {
        const assignedUser = lead.assigned_salesperson_id || req.user?.id;
        if (assignedUser) {
          await notificationService.createSmartNotification({
            user_id: assignedUser,
            context: `New lead created: ${lead.first_name} ${lead.last_name} is interested in ${lead.vehicle_interests || "vehicles"
              } with budget ${lead.budget_min ? `£${lead.budget_min.toLocaleString()}` : "TBD"} - ${lead.budget_max ? `£${lead.budget_max.toLocaleString()}` : "TBD"
              }`,
            entityType: "lead",
            entityData: {
              id: lead.id,
              name: `${lead.first_name} ${lead.last_name}`,
              phone: lead.primary_phone,
              email: lead.email,
              vehicle_interests: lead.vehicle_interests,
              budget_min: lead.budget_min,
              budget_max: lead.budget_max,
              pipeline_stage: lead.pipeline_stage,
              lead_quality: lead.lead_quality,
              lead_source: lead.lead_source,
            },
            userRole: req.user?.role || "user",
            urgency: lead.lead_quality === "hot" ? "high" : lead.lead_quality === "warm" ? "medium" : "low",
            customInstructions:
              "New lead requires immediate attention and follow-up. Use professional luxury dealership tone.",
          });
        }
      } catch (notificationError) {
        console.error("Failed to send smart lead notification:", notificationError);
        // Don't fail the lead creation if notification fails
      }

      // Broadcast lead creation to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastLeadCreated(lead, req.user?.id);
      }

      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const lead = await storage.getLeadById(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Helper function to convert date strings to Date objects
      const parseDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr || dateStr === "") return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Handle empty numeric fields by converting empty strings to null
      const leadData = {
        ...req.body,
        date_of_birth: parseDate(req.body.date_of_birth),
        preferred_contact_date: parseDate(req.body.preferred_contact_date),
        last_contact_date: parseDate(req.body.last_contact_date),
        next_follow_up_date: parseDate(req.body.next_follow_up_date),
        budget_min:
          req.body.budget_min === "" || req.body.budget_min === undefined ? null : parseFloat(req.body.budget_min),
        budget_max:
          req.body.budget_max === "" || req.body.budget_max === undefined ? null : parseFloat(req.body.budget_max),
        trade_in_value:
          req.body.trade_in_value === "" || req.body.trade_in_value === undefined
            ? null
            : parseFloat(req.body.trade_in_value),
        contact_attempts:
          req.body.contact_attempts === "" || req.body.contact_attempts === undefined
            ? 0
            : parseInt(req.body.contact_attempts),
      };

      const originalLead = await storage.getLeadById(id);
      const lead = await storage.updateLead(id, leadData);

      // Broadcast lead update to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastLeadUpdated(lead, req.user?.id);

        // Check if stage changed and broadcast stage change
        if (originalLead && originalLead.pipeline_stage !== lead.pipeline_stage) {
          webSocketService.broadcastLeadStageChanged(
            id,
            originalLead.pipeline_stage,
            lead.pipeline_stage,
            req.user?.id,
          );
        }
      }

      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLead(id);
      if (!success) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Broadcast lead deletion to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastLeadDeleted(id, req.user?.id);
      }

      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  app.post("/api/leads/:id/convert", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);

      // Extract only the fields that exist in the simplified customer structure
      const customerData = {
        first_name: req.body.first_name || req.body.firstName || "",
        last_name: req.body.last_name || req.body.lastName || "",
        email: req.body.email || "",
        phone: req.body.phone || req.body.primary_phone || "",
        mobile: req.body.mobile || req.body.secondary_phone || "",
        address: req.body.address || "",
        city: req.body.city || "",
        county: req.body.county || "",
        postcode: req.body.postcode || "",
        notes: req.body.notes || "",
      };

      const result = await storage.convertLeadToCustomer(leadId, customerData);

      // Broadcast lead conversion to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastLeadConverted(leadId, result.customer.id, req.user?.id);
      }

      res.json(result);
    } catch (error) {
      console.error("Error converting lead to customer:", error);
      res.status(500).json({ message: "Failed to convert lead to customer" });
    }
  });

  app.post("/api/leads/:id/assign-vehicle", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const vehicleId = parseInt(req.body.vehicleId);
      const lead = await storage.assignVehicleToLead(leadId, vehicleId);
      res.json(lead);
    } catch (error) {
      console.error("Error assigning vehicle to lead:", error);
      res.status(500).json({ message: "Failed to assign vehicle to lead" });
    }
  });

  // Appointments API - Enhanced for comprehensive booking
  app.get("/api/appointments", async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/date/:date", async (req, res) => {
    try {
      const date = new Date(req.params.date);
      const appointments = await storage.getAppointmentsByDate(date);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by date:", error);
      res.status(500).json({ message: "Failed to fetch appointments by date" });
    }
  });

  app.get("/api/appointments/month/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const appointments = await storage.getAppointmentsByMonth(year, month);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments by month:", error);
      res.status(500).json({ message: "Failed to fetch appointments by month" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      // Convert date string to Date object if needed
      const appointmentData = {
        ...req.body,
        appointment_date: req.body.appointment_date ? new Date(req.body.appointment_date) : undefined,
      };

      const validatedData = insertAppointmentSchema.parse(appointmentData);
      const appointment = await storage.createAppointment(validatedData);

      // Trigger appointment.booked notification
      try {
        await notificationService.createNotification({
          recipient_user_id: req.user?.id || 1,
          notification_type: "customer",
          priority_level: "medium",
          title: "Appointment Booked",
          body: `User ${req.user?.username || "System"} booked an appointment on ${appointment.appointment_date ? appointment.appointment_date.toLocaleDateString() : "TBD"
            }`,
          action_url: "/appointments",
          related_entity_type: "appointment",
          related_entity_id: appointment.id,
          status: "pending",
        });
        console.log(`Appointment Create: Notification created for appointment ${appointment.id}`);
      } catch (notificationError) {
        console.error("Appointment Create: Notification failed:", notificationError);
      }

      // Broadcast appointment creation to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastAppointmentCreated(appointment, req.user?.id);
      }

      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Convert date string to Date object if needed
      const appointmentData = {
        ...req.body,
        appointment_date: req.body.appointment_date ? new Date(req.body.appointment_date) : undefined,
      };

      const validatedData = insertAppointmentSchema.partial().parse(appointmentData);
      const appointment = await storage.updateAppointment(id, validatedData);

      // Broadcast appointment update to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastAppointmentUpdated(appointment, req.user?.id);
      }

      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update appointment" });
      }
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAppointment(id);
      if (success) {
        // Broadcast appointment deletion to all connected clients
        const webSocketService = (global as any).webSocketService;
        if (webSocketService) {
          webSocketService.broadcastAppointmentDeleted(id, req.user?.id);
        }

        res.json({ message: "Appointment deleted successfully" });
      } else {
        res.status(404).json({ message: "Appointment not found" });
      }
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Jobs API - Comprehensive logistics management
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/status/:status", async (req, res) => {
    try {
      const jobs = await storage.getJobsByStatus(req.params.status);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs by status:", error);
      res.status(500).json({ message: "Failed to fetch jobs by status" });
    }
  });

  app.get("/api/jobs/stats", async (req, res) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching job stats:", error);
      res.status(500).json({ message: "Failed to fetch job stats" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      // Helper function to convert date strings to Date objects
      const parseDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr || dateStr === "") return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Clean the request body - handle date and cost conversions
      const cleanedBody = { ...req.body };

      // Convert date fields to proper Date objects
      const dateFields = ["scheduled_date", "actual_start_date", "actual_end_date"];
      dateFields.forEach(field => {
        if (cleanedBody[field] === "" || cleanedBody[field] === undefined) {
          cleanedBody[field] = null;
        } else if (cleanedBody[field]) {
          cleanedBody[field] = parseDate(cleanedBody[field]);
        }
      });

      // Convert cost fields to strings (schema expects strings)
      const costFields = [
        "estimated_cost",
        "actual_cost",
        "hourly_rate",
        "material_costs",
        "external_costs",
        "total_cost",
        "estimated_duration_hours", 
        "actual_duration_hours",  
      ];
      costFields.forEach(field => {
        if (cleanedBody[field] !== undefined && cleanedBody[field] !== null && cleanedBody[field] !== "") {
          cleanedBody[field] = cleanedBody[field].toString();
        } else {
          cleanedBody[field] = null;
        }
      });

      // Validate the data
      const validatedData = insertJobSchema.parse(cleanedBody);

      const job = await storage.createJob(validatedData);

      // Trigger job.booked notification
      try {
        await notificationService.createNotification({
          recipient_user_id: req.user?.id || 1,
          notification_type: "staff",
          priority_level: "medium",
          title: "Job Booked",
          body: `User ${req.user?.username || "System"} booked a new job: ${job.job_type || "Job"}`,
          action_url: "/calendar",
          related_entity_type: "job",
          related_entity_id: job.id,
          status: "pending",
        });
        console.log(`Job Create: Notification created for job ${job.id}`);
      } catch (notificationError) {
        console.error("Job Create: Notification failed:", notificationError);
      }

      // Broadcast job creation to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastJobCreated(job, req.user?.id);
      }

      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid job data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create job" });
      }
    }
  });

  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Helper function to convert date strings to Date objects
      const parseDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr || dateStr === "") return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };

      // Clean the request body - handle date and cost conversions
      const cleanedBody = { ...req.body };

      // Convert date fields to proper Date objects
      const dateFields = ["scheduled_date", "actual_start_date", "actual_end_date"];
      dateFields.forEach(field => {
        if (cleanedBody[field] === "" || cleanedBody[field] === undefined) {
          cleanedBody[field] = null;
        } else if (cleanedBody[field]) {
          cleanedBody[field] = parseDate(cleanedBody[field]);
        }
      });

      // Convert cost fields to strings (schema expects strings)
      const costFields = [
        "estimated_cost",
        "actual_cost",
        "hourly_rate",
        "material_costs",
        "external_costs",
        "total_cost",
      ];
      costFields.forEach(field => {
        if (cleanedBody[field] !== undefined && cleanedBody[field] !== null && cleanedBody[field] !== "") {
          cleanedBody[field] = cleanedBody[field].toString();
        } else if (cleanedBody[field] === "") {
          cleanedBody[field] = null;
        }
      });

      // Validate the data
      const validatedData = insertJobSchema.partial().parse(cleanedBody);

      const originalJob = await storage.getJobById(id);
      const job = await storage.updateJob(id, validatedData);

      // Broadcast job update to all connected clients
      const webSocketService = (global as any).webSocketService;
      if (webSocketService) {
        webSocketService.broadcastJobUpdated(job, req.user?.id);

        // Check if status changed and broadcast status change
        if (originalJob && originalJob.status !== job.status) {
          webSocketService.broadcastJobStatusChanged(id, originalJob.status, job.status, req.user?.id);
        }
      }

      res.json(job);
    } catch (error) {
      console.error("Error updating job:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid job data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update job" });
      }
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJob(id);
      if (success) {
        // Broadcast job deletion to all connected clients
        const webSocketService = (global as any).webSocketService;
        if (webSocketService) {
          webSocketService.broadcastJobDeleted(id, req.user?.id);
        }

        res.json({ message: "Job deleted successfully" });
      } else {
        res.status(404).json({ message: "Job not found" });
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Staff Schedules API
  app.get("/api/schedules", async (req, res) => {
    try {
      const schedules = await storage.getStaffSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.get("/api/schedules/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const schedules = await storage.getStaffSchedulesByUser(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching user schedules:", error);
      res.status(500).json({ message: "Failed to fetch user schedules" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    try {
      const validatedData = insertStaffScheduleSchema.parse(req.body);
      const schedule = await storage.createStaffSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid schedule data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create schedule" });
      }
    }
  });

  // Vehicle Logistics API
  app.get("/api/logistics", async (req, res) => {
    try {
      const logistics = await storage.getVehicleLogistics();
      res.json(logistics);
    } catch (error) {
      console.error("Error fetching logistics:", error);
      res.status(500).json({ message: "Failed to fetch logistics" });
    }
  });

  app.post("/api/logistics", async (req, res) => {
    try {
      const validatedData = insertVehicleLogisticsSchema.parse(req.body);
      const logistics = await storage.createVehicleLogistics(validatedData);
      res.status(201).json(logistics);
    } catch (error) {
      console.error("Error creating logistics entry:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid logistics data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create logistics entry" });
      }
    }
  });

  // Job Templates API
  app.get("/api/job-templates", async (req, res) => {
    try {
      const templates = await storage.getJobTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching job templates:", error);
      res.status(500).json({ message: "Failed to fetch job templates" });
    }
  });

  app.post("/api/job-templates", async (req, res) => {
    try {
      const validatedData = insertJobTemplateSchema.parse(req.body);
      const template = await storage.createJobTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating job template:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create job template" });
      }
    }
  });

  // Bought Vehicles API
  app.get("/api/bought-vehicles", requirePermission("bought-vehicles"), async (req, res) => {
    try {
      const vehicles = await storage.getBoughtVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching bought vehicles:", error);
      res.status(500).json({ message: "Failed to fetch bought vehicles" });
    }
  });

  app.get("/api/bought-vehicles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicle = await storage.getBoughtVehicleById(id);
      if (!vehicle) {
        return res.status(404).json({ message: "Bought vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching bought vehicle:", error);
      res.status(500).json({ message: "Failed to fetch bought vehicle" });
    }
  });

  app.post("/api/bought-vehicles", async (req, res) => {
    try {
      const validatedData = insertBoughtVehicleSchema.parse(req.body);
      const vehicle = await storage.createBoughtVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error("Error creating bought vehicle:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid vehicle data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create bought vehicle" });
      }
    }
  });

  app.put("/api/bought-vehicles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBoughtVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateBoughtVehicle(id, validatedData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating bought vehicle:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid vehicle data", details: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update bought vehicle" });
      }
    }
  });

  app.delete("/api/bought-vehicles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBoughtVehicle(id);
      if (!success) {
        return res.status(404).json({ message: "Bought vehicle not found" });
      }
      res.json({ message: "Bought vehicle deleted successfully" });
    } catch (error) {
      console.error("Error deleting bought vehicle:", error);
      res.status(500).json({ message: "Failed to delete bought vehicle" });
    }
  });

  app.get("/api/bought-vehicles-stats", async (req, res) => {
    try {
      const stats = await storage.getBoughtVehicleStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bought vehicle stats:", error);
      res.status(500).json({ message: "Failed to fetch bought vehicle stats" });
    }
  });

  // Purchase Invoice API routes
  app.get("/api/purchase-invoices", async (req, res) => {
    try {
      const invoices = await storage.getPurchaseInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      res.status(500).json({ message: "Failed to fetch purchase invoices" });
    }
  });

  app.get("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase invoice ID" });
      }
      const invoice = await storage.getPurchaseInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Purchase invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching purchase invoice:", error);
      res.status(500).json({ message: "Failed to fetch purchase invoice" });
    }
  });

  app.post("/api/purchase-invoices", purchaseUpload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const invoiceData = {
        ...req.body,
        document_filename: req.file.originalname,
        document_path: req.file.path,
        document_size: req.file.size,
        document_type: path.extname(req.file.originalname).toLowerCase().substring(1),
        // Convert date strings to proper format
        purchase_date: req.body.purchase_date ? new Date(req.body.purchase_date) : null,
        estimated_collection_date: req.body.estimated_collection_date
          ? new Date(req.body.estimated_collection_date)
          : null,
        outstanding_finance: req.body.outstanding_finance === "true",
        part_exchange: req.body.part_exchange === "true",
        tags: req.body.tags ? req.body.tags.split(",").map((tag: string) => tag.trim()) : [],
      };

      const validatedData = insertPurchaseInvoiceSchema.parse(invoiceData);
      const newInvoice = await storage.createPurchaseInvoice(validatedData);
      res.status(201).json(newInvoice);
    } catch (error) {
      console.error("Error creating purchase invoice:", error);
      // Clean up uploaded file if database save fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to create purchase invoice" });
    }
  });

  app.put("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase invoice ID" });
      }
      const validatedData = insertPurchaseInvoiceSchema.partial().parse(req.body);
      const updatedInvoice = await storage.updatePurchaseInvoice(id, validatedData);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating purchase invoice:", error);
      res.status(500).json({ message: "Failed to update purchase invoice" });
    }
  });

  app.delete("/api/purchase-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase invoice ID" });
      }
      const deleted = await storage.deletePurchaseInvoice(id);
      if (!deleted) {
        return res.status(404).json({ message: "Purchase invoice not found" });
      }
      res.json({ message: "Purchase invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase invoice:", error);
      res.status(500).json({ message: "Failed to delete purchase invoice" });
    }
  });

  app.get("/api/purchase-invoices-stats", async (req, res) => {
    try {
      const stats = await storage.getPurchaseInvoiceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching purchase invoice stats:", error);
      res.status(500).json({ message: "Failed to fetch purchase invoice stats" });
    }
  });

  // Serve uploaded files
  app.get("/api/uploads/purchase-invoices/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(purchaseUploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.sendFile(filePath);
  });

  // Sales Invoice API
  app.get("/api/sales-invoices", async (req, res) => {
    try {
      const invoices = await storage.getSalesInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching sales invoices:", error);
      res.status(500).json({ message: "Failed to fetch sales invoices" });
    }
  });

  app.get("/api/sales-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const invoice = await storage.getSalesInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Sales invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching sales invoice:", error);
      res.status(500).json({ message: "Failed to fetch sales invoice" });
    }
  });

  app.post("/api/sales-invoices", salesUpload.single("document"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const formData = req.body;

      // Convert string boolean values to actual booleans and handle empty strings
      const processedData = {
        seller_name: formData.seller_name || "",
        registration:
          formData.registration && formData.registration.trim() !== "" ? formData.registration : undefined,
        date_of_sale:
          formData.date_of_sale && formData.date_of_sale.trim() !== "" ? formData.date_of_sale : undefined,
        delivery_collection:
          formData.delivery_collection && formData.delivery_collection.trim() !== ""
            ? formData.delivery_collection
            : undefined,
        make: formData.make && formData.make.trim() !== "" ? formData.make : undefined,
        model: formData.model && formData.model.trim() !== "" ? formData.model : undefined,
        customer_name: formData.customer_name || "",
        notes: formData.notes && formData.notes.trim() !== "" ? formData.notes : undefined,
        paid_in_full: formData.paid_in_full === "true",
        finance: formData.finance === "true",
        part_exchange: formData.part_exchange === "true",
        documents_to_sign: formData.documents_to_sign === "true",
        document_filename: req.file.originalname,
        document_path: req.file.path,
        document_size: req.file.size,
        document_type: path.extname(req.file.originalname).toLowerCase().substring(1),
        tags: formData.tags ? JSON.parse(formData.tags) : [],
      };

      const validationResult = insertSalesInvoiceSchema.safeParse(processedData);

      if (!validationResult.success) {
        console.error("Sales Invoice Validation failed:");
        console.error("Raw form data:", formData);
        console.error("Processed data:", processedData);
        console.error("Validation errors:", JSON.stringify(validationResult.error.errors, null, 2));
        return res.status(400).json({
          message: "Invalid data",
          errors: validationResult.error.errors,
        });
      }

      const invoice = await storage.createSalesInvoice(validationResult.data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating sales invoice:", error);
      res.status(500).json({ message: "Failed to create sales invoice" });
    }
  });

  app.put("/api/sales-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const invoice = await storage.updateSalesInvoice(id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating sales invoice:", error);
      res.status(500).json({ message: "Failed to update sales invoice" });
    }
  });

  app.delete("/api/sales-invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      const success = await storage.deleteSalesInvoice(id);
      if (!success) {
        return res.status(404).json({ message: "Sales invoice not found" });
      }

      res.json({ message: "Sales invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting sales invoice:", error);
      res.status(500).json({ message: "Failed to delete sales invoice" });
    }
  });

  app.get("/api/sales-invoices-stats", async (req, res) => {
    try {
      const stats = await storage.getSalesInvoiceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching sales invoice stats:", error);
      res.status(500).json({ message: "Failed to fetch sales invoice stats" });
    }
  });

  // Serve sales invoice uploaded files
  app.get("/api/uploads/sales-invoices/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(salesUploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.sendFile(filePath);
  });

  // Business Intelligence API endpoints
  app.get("/api/business-intelligence/overview", async (req, res) => {
    try {
      const overview = await storage.getBusinessIntelligenceOverview();
      res.json(overview);
    } catch (error) {
      console.error("Error fetching business intelligence overview:", error);
      res.status(500).json({ message: "Failed to fetch business intelligence overview" });
    }
  });

  app.get("/api/business-intelligence/financial-performance", async (req, res) => {
    try {
      const { dateRange = "current" } = req.query;
      const performance = await storage.getFinancialPerformance(dateRange as string);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching financial performance:", error);
      res.status(500).json({ message: "Failed to fetch financial performance" });
    }
  });

  app.get("/api/business-intelligence/quarterly-overview", async (req, res) => {
    try {
      const quarterly = await storage.getQuarterlyOverview();
      res.json(quarterly);
    } catch (error) {
      console.error("Error fetching quarterly overview:", error);
      res.status(500).json({ message: "Failed to fetch quarterly overview" });
    }
  });

  app.get("/api/business-intelligence/inventory-analytics", async (req, res) => {
    try {
      const analytics = await storage.getInventoryAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching inventory analytics:", error);
      res.status(500).json({ message: "Failed to fetch inventory analytics" });
    }
  });

  app.get("/api/business-intelligence/sales-trends", async (req, res) => {
    try {
      const { period = "monthly" } = req.query;
      const trends = await storage.getSalesTrends(period as string);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching sales trends:", error);
      res.status(500).json({ message: "Failed to fetch sales trends" });
    }
  });

  app.get("/api/business-intelligence/operational-metrics", async (req, res) => {
    try {
      const metrics = await storage.getOperationalMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching operational metrics:", error);
      res.status(500).json({ message: "Failed to fetch operational metrics" });
    }
  });

  app.get("/api/business-intelligence/performance-indicators", async (req, res) => {
    try {
      const indicators = await storage.getPerformanceIndicators();
      res.json(indicators);
    } catch (error) {
      console.error("Error fetching performance indicators:", error);
      res.status(500).json({ message: "Failed to fetch performance indicators" });
    }
  });

  // New comprehensive business intelligence endpoints
  app.get("/api/business-intelligence/financial-audit", async (req, res) => {
    try {
      const audit = await storage.getFinancialAudit();
      res.json(audit);
    } catch (error) {
      console.error("Error fetching financial audit:", error);
      res.status(500).json({ message: "Failed to fetch financial audit" });
    }
  });

  app.get("/api/business-intelligence/vehicle-performance", async (req, res) => {
    try {
      const performance = await storage.getVehiclePerformanceMetrics();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching vehicle performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch vehicle performance metrics" });
    }
  });

  app.get("/api/business-intelligence/sales-management", async (req, res) => {
    try {
      const dashboard = await storage.getSalesManagementDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching sales management dashboard:", error);
      res.status(500).json({ message: "Failed to fetch sales management dashboard" });
    }
  });

  app.get("/api/business-intelligence/executive-dashboard", async (req, res) => {
    try {
      const executive = await storage.getExecutiveDashboard();
      res.json(executive);
    } catch (error) {
      console.error("Error fetching executive dashboard:", error);
      res.status(500).json({ message: "Failed to fetch executive dashboard" });
    }
  });

  app.get("/api/business-intelligence/monthly-data/:yearMonth", async (req, res) => {
    try {
      const { yearMonth } = req.params;
      const monthlyData = await storage.getMonthlyData(yearMonth);
      res.json(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      res.status(500).json({ message: "Failed to fetch monthly data" });
    }
  });

  // Permission Management API (Admin only)

  // Audit logging endpoint for security tracking
  app.post("/api/admin/audit-log", requireAuth, async (req, res) => {
    try {
      const { action, page_key, user_id, username, timestamp, bypass_reason } = req.body;

      // Log audit event to server logs for proper tracking
      logger.info("Admin audit event", {
        action,
        page_key,
        user_id,
        username,
        timestamp,
        bypass_reason,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        service: "dealership-management",
      });

      res.json({ success: true, message: "Audit log recorded" });
    } catch (error) {
      logger.error("Audit log error", {
        error: error instanceof Error ? error.message : "Unknown error",
        service: "dealership-management",
      });
      res.status(500).json({ success: false, message: "Failed to record audit log" });
    }
  });

  // Initialize default pages (run once during setup)
  app.post("/api/admin/permissions/initialize", requireAdmin, async (req, res) => {
    try {
      await storage.initializeDefaultPages();
      res.json({ message: "Default pages initialized successfully" });
    } catch (error) {
      console.error("Error initializing default pages:", error);
      res.status(500).json({ message: "Failed to initialize default pages" });
    }
  });

  // Get all page definitions
  app.get("/api/admin/page-definitions", requireAdmin, async (req, res) => {
    try {
      const pages = await storage.getPageDefinitions();
      res.json(pages);
    } catch (error) {
      console.error("Error fetching page definitions:", error);
      res.status(500).json({ message: "Failed to fetch page definitions" });
    }
  });

  // Create page definition
  app.post("/api/admin/page-definitions", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPageDefinitionSchema.parse(req.body);
      const page = await storage.createPageDefinition(validatedData);
      res.status(201).json(page);
    } catch (error) {
      console.error("Error creating page definition:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid page definition data",
          details: error.errors,
        });
      } else {
        res.status(500).json({ message: "Failed to create page definition" });
      }
    }
  });

  // Update page definition
  app.put("/api/admin/page-definitions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPageDefinitionSchema.partial().parse(req.body);
      const page = await storage.updatePageDefinition(id, validatedData);
      res.json(page);
    } catch (error) {
      console.error("Error updating page definition:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid page definition data",
          details: error.errors,
        });
      } else {
        res.status(500).json({ message: "Failed to update page definition" });
      }
    }
  });

  // Delete page definition
  app.delete("/api/admin/page-definitions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePageDefinition(id);
      if (deleted) {
        res.json({ message: "Page definition deleted successfully" });
      } else {
        res.status(404).json({ message: "Page definition not found" });
      }
    } catch (error) {
      console.error("Error deleting page definition:", error);
      res.status(500).json({ message: "Failed to delete page definition" });
    }
  });

  // Get all users with their permissions
  app.get("/api/admin/users-with-permissions", requireAdmin, async (req, res) => {
    try {
      const usersWithPermissions = await storage.getUsersWithPermissions();
      res.json(usersWithPermissions);
    } catch (error) {
      console.error("Error fetching users with permissions:", error);
      res.status(500).json({ message: "Failed to fetch users with permissions" });
    }
  });

  // Get user permissions
  app.get("/api/admin/user-permissions/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Create or update user permission
  app.put("/api/admin/user-permissions/:userId/:pageKey", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { pageKey } = req.params;
      const permissionData = {
        ...req.body,
        user_id: userId,
        page_key: pageKey,
      };

      // Check if permission already exists
      const existingPermission = await storage.getUserPermissionsByPageKey(userId, pageKey);

      if (existingPermission) {
        // Update existing permission
        const validatedData = insertUserPermissionSchema.partial().parse(req.body);
        const permission = await storage.updateUserPermission(existingPermission.id, validatedData);
        res.json(permission);
      } else {
        // Create new permission
        const validatedData = insertUserPermissionSchema.parse(permissionData);
        const permission = await storage.createUserPermission(validatedData);
        res.status(201).json(permission);
      }
    } catch (error) {
      console.error("Error creating/updating user permission:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: "Invalid permission data",
          details: error.errors,
        });
      } else {
        res.status(500).json({ message: "Failed to create/update user permission" });
      }
    }
  });

  // Delete user permission
  app.delete("/api/admin/user-permissions/:userId/:pageKey", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { pageKey } = req.params;

      const existingPermission = await storage.getUserPermissionsByPageKey(userId, pageKey);
      if (existingPermission) {
        const deleted = await storage.deleteUserPermission(existingPermission.id);
        if (deleted) {
          res.json({ message: "User permission deleted successfully" });
        } else {
          res.status(404).json({ message: "User permission not found" });
        }
      } else {
        res.status(404).json({ message: "User permission not found" });
      }
    } catch (error) {
      console.error("Error deleting user permission:", error);
      res.status(500).json({ message: "Failed to delete user permission" });
    }
  });

  // Delete all permissions for a user
  app.delete("/api/admin/user-permissions/:userId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const deleted = await storage.deleteUserPermissionsByUserId(userId);
      if (deleted) {
        res.json({ message: "All user permissions deleted successfully" });
      } else {
        res.status(404).json({ message: "No permissions found for user" });
      }
    } catch (error) {
      console.error("Error deleting user permissions:", error);
      res.status(500).json({ message: "Failed to delete user permissions" });
    }
  });

  // Get accessible pages for authenticated user
  app.get("/api/user/accessible-pages", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const accessiblePages = await storage.getAccessiblePages(userId);
      res.json(accessiblePages);
    } catch (error) {
      console.error("Error fetching accessible pages:", error);
      res.status(500).json({ message: "Failed to fetch accessible pages" });
    }
  });

  // ====== NOTIFICATION ROUTES ======

  // Get notification statistics
  app.get("/api/notifications/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getNotificationStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      res.status(500).json({ message: "Failed to fetch notification stats" });
    }
  });

  // Get notifications for user
  app.get("/api/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const notifications = await storage.getNotificationsByUser(userId, limit, offset);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;

      const notification = await storage.getNotificationById(notificationId);
      if (!notification || notification.recipient_user_id !== userId) {
        return res.status(404).json({ message: "Notification not found" });
      }

      const updated = await storage.updateNotification(notificationId, {
        is_read: true,
        read_at: new Date().toISOString(),
      });

      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // ====== DEVICE REGISTRATION ROUTES ======

  // Register new device
  app.post("/api/devices/register", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const deviceData = insertDeviceRegistrationSchema.parse({
        ...req.body,
        user_id: userId,
      });

      // Check if device already exists
      const existingDevice = await storage.getDeviceRegistrationByToken(deviceData.device_token);
      if (existingDevice) {
        // Update existing device
        const updated = await storage.updateDeviceRegistration(existingDevice.id, deviceData);
        res.json(updated);
      } else {
        // Create new device
        const newDevice = await storage.createDeviceRegistration(deviceData);
        res.json(newDevice);
      }
    } catch (error) {
      console.error("Error registering device:", error);
      res.status(500).json({ message: "Failed to register device" });
    }
  });

  // Get user devices
  app.get("/api/devices", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const devices = await storage.getDeviceRegistrationsByUser(userId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // Get device by token
  app.get("/api/devices/:token", requireAuth, async (req, res) => {
    try {
      const deviceToken = req.params.token;
      const device = await storage.getDeviceRegistrationByToken(deviceToken);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      console.error("Error fetching device:", error);
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  // Update device settings
  app.put("/api/devices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const updateData = insertDeviceRegistrationSchema.partial().parse(req.body);

      const updated = await storage.updateDeviceRegistration(deviceId, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  // Delete device
  app.delete("/api/devices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const deleted = await storage.deleteDeviceRegistration(deviceId);
      if (deleted) {
        res.json({ message: "Device deleted successfully" });
      } else {
        res.status(404).json({ message: "Device not found" });
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Update device last active
  app.put("/api/devices/:token/active", requireAuth, async (req, res) => {
    try {
      const deviceToken = req.params.token;
      await storage.updateDeviceLastActive(deviceToken);
      res.json({ message: "Device activity updated" });
    } catch (error) {
      console.error("Error updating device activity:", error);
      res.status(500).json({ message: "Failed to update device activity" });
    }
  });

  // Get device stats (admin only)
  app.get("/api/devices/stats", requireAdmin, async (req, res) => {
    try {
      const devices = await storage.getDeviceRegistrations();
      const stats = {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.is_active).length,
        platforms: devices.reduce(
          (acc, d) => {
            acc[d.platform] = (acc[d.platform] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
        pushEnabled: devices.filter(d => d.push_enabled).length,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching device stats:", error);
      res.status(500).json({ message: "Failed to fetch device stats" });
    }
  });

  // Cleanup inactive devices (admin only)
  app.post("/api/devices/cleanup", requireAdmin, async (req, res) => {
    try {
      const { daysInactive = 30 } = req.body;
      const cleanedCount = await storage.cleanupInactiveDevices(daysInactive);
      res.json({ message: `Cleaned up ${cleanedCount} inactive devices` });
    } catch (error) {
      console.error("Error cleaning up devices:", error);
      res.status(500).json({ message: "Failed to cleanup devices" });
    }
  });

  // Pinned Messages API

  // Get pinned messages for current user
  app.get("/api/pinned-messages", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const messages = await storage.getPinnedMessagesForUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
      res.status(500).json({ message: "Failed to fetch pinned messages" });
    }
  });

  // Get all pinned messages (admin only)
  app.get("/api/pinned-messages/all", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getPinnedMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching all pinned messages:", error);
      res.status(500).json({ message: "Failed to fetch all pinned messages" });
    }
  });

  // Get specific pinned message by ID
  app.get("/api/pinned-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.getPinnedMessageById(id);

      if (!message) {
        return res.status(404).json({ message: "Pinned message not found" });
      }

      const userId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      // Check if user can access this message
      if (!isAdmin && message.author_id !== userId) {
        if (!message.is_public && !message.target_user_ids?.includes(userId)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(message);
    } catch (error) {
      console.error("Error fetching pinned message:", error);
      res.status(500).json({ message: "Failed to fetch pinned message" });
    }
  });

  // Create new pinned message
  app.post("/api/pinned-messages", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertPinnedMessageSchema.parse({
        ...req.body,
        author_id: userId,
      });

      const message = await storage.createPinnedMessage(validatedData);

      // Broadcast to WebSocket clients
      webSocketService.broadcastToAll(WebSocketEvent.PINNED_MESSAGE_CREATED, {
        message,
        author: req.user!.username,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating pinned message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pinned message" });
    }
  });

  // Update pinned message
  app.put("/api/pinned-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      // Check if message exists and user has permission
      const existingMessage = await storage.getPinnedMessageById(id);
      if (!existingMessage) {
        return res.status(404).json({ message: "Pinned message not found" });
      }

      if (!isAdmin && existingMessage.author_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertPinnedMessageSchema.partial().parse(req.body);
      delete validatedData.author_id; // Prevent changing author

      const updatedMessage = await storage.updatePinnedMessage(id, validatedData);

      // Broadcast to WebSocket clients
      webSocketService.broadcastToAll(WebSocketEvent.PINNED_MESSAGE_UPDATED, {
        message: updatedMessage,
        author: req.user!.username,
      });

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error updating pinned message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update pinned message" });
    }
  });

  // Delete pinned message
  app.delete("/api/pinned-messages/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      const isAdmin = req.user!.role === "admin";

      // Check if message exists and user has permission
      const existingMessage = await storage.getPinnedMessageById(id);
      if (!existingMessage) {
        return res.status(404).json({ message: "Pinned message not found" });
      }

      if (!isAdmin && existingMessage.author_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deletePinnedMessage(id);

      if (deleted) {
        // Broadcast to WebSocket clients
        webSocketService.broadcastToAll(WebSocketEvent.PINNED_MESSAGE_DELETED, {
          message_id: id,
          author: req.user!.username,
        });

        res.json({ message: "Pinned message deleted successfully" });
      } else {
        res.status(404).json({ message: "Pinned message not found" });
      }
    } catch (error) {
      console.error("Error deleting pinned message:", error);
      res.status(500).json({ message: "Failed to delete pinned message" });
    }
  });

  // Get active users for user selection
  app.get("/api/users/active", requireAuth, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const activeUsers = users
        .filter(user => user.is_active)
        .map(user => ({
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        }));
      res.json(activeUsers);
    } catch (error) {
      console.error("Error fetching active users:", error);
      res.status(500).json({ message: "Failed to fetch active users" });
    }
  });

  // Test notification endpoint (admin only)
  app.post("/api/notifications/test", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const {
        title = "Test Notification",
        body = "This is a test notification from the dealership management system",
      } = req.body;

      // Create a test notification
      const notification = await storage.createNotification({
        recipient_user_id: userId,
        notification_type: "system",
        priority_level: "high",
        title,
        body,
        status: "pending",
      });

      // Try to send the notification
      try {
        // Send notification via WebSocket (notificationHub replaced with webSocketService)
        // await webSocketService.broadcastToAll('NOTIFICATION_CREATED', notification);
        res.json({
          message: "Test notification sent successfully",
          notification_id: notification.id,
          title,
          body,
        });
      } catch (sendError) {
        console.error("Failed to send test notification:", sendError);
        res.json({
          message: "Test notification created but sending failed",
          notification_id: notification.id,
          error: sendError instanceof Error ? sendError.message : "Unknown error",
          title,
          body,
        });
      }
    } catch (error) {
      console.error("Error creating test notification:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });

  // OpenAI-powered smart notification endpoints (Phase 2)

  // Create smart notification using OpenAI
  app.post("/api/notifications/smart", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { context, entityType, entityData, urgency, customInstructions } = req.body;

      if (!context || !entityType) {
        return res.status(400).json({ message: "Context and entity type are required" });
      }

      const userId = req.user!.id;
      const userRole = req.user!.role || "user";

      const notification = await notificationService.createSmartNotification({
        user_id: userId,
        context,
        entityType,
        entityData: entityData || {},
        userRole,
        urgency,
        customInstructions,
      });

      res.json({
        message: "Smart notification created successfully",
        notification,
      });
    } catch (error) {
      console.error("Error creating smart notification:", error);
      res.status(500).json({ message: "Failed to create smart notification" });
    }
  });

  // Optimize notification content
  app.post("/api/notifications/:id/optimize", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);

      const optimized = await notificationService.optimizeNotificationContent(notificationId);

      res.json({
        message: "Notification optimized successfully",
        notification: optimized,
      });
    } catch (error) {
      console.error("Error optimizing notification:", error);
      res.status(500).json({ message: "Failed to optimize notification" });
    }
  });

  // Generate follow-up notification
  app.post("/api/notifications/:id/follow-up", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const { userResponse } = req.body;

      if (!userResponse || !["read", "dismissed", "clicked", "ignored"].includes(userResponse)) {
        return res.status(400).json({ message: "Valid user response is required" });
      }

      const followUp = await notificationService.generateFollowUpNotification(notificationId, userResponse);

      if (followUp) {
        res.json({
          message: "Follow-up notification generated successfully",
          notification: followUp,
        });
      } else {
        res.json({
          message: "No follow-up notification needed",
          notification: null,
        });
      }
    } catch (error) {
      console.error("Error generating follow-up notification:", error);
      res.status(500).json({ message: "Failed to generate follow-up notification" });
    }
  });

  // Predict notification needs (admin only)
  app.post("/api/notifications/predict", requireAdmin, async (req, res) => {
    try {
      const { dealershipData, timeframe = "today" } = req.body;

      const predictions = await openaiNotificationService.predictNotificationNeeds(
        dealershipData || {},
        timeframe,
      );

      res.json({
        message: "Notification predictions generated successfully",
        predictions,
      });
    } catch (error) {
      console.error("Error predicting notifications:", error);
      res.status(500).json({ message: "Failed to predict notifications" });
    }
  });

  // Get user notification preferences
  app.get("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const preferences = await storage.getNotificationPreferencesByUser(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  // Update user notification preferences
  app.put("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertNotificationPreferenceSchema.partial().parse(req.body);
      const preferences = await storage.updateNotificationPreferences(userId, validatedData);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Get notification performance metrics (admin only)
  app.get("/api/notifications/performance", requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getNotificationPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching notification performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch notification performance metrics" });
    }
  });

  // Natural Language Notification Setup (Phase 2.1) - Import added at top of file

  // Parse natural language notification rule
  app.post("/api/notifications/parse-rule", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const parsedRule = await naturalLanguageNotificationService.parseNotificationRule({
        prompt,
      });

      res.json(parsedRule);
    } catch (error) {
      console.error("Error parsing notification rule:", error);
      res.status(500).json({ message: "Failed to parse notification rule" });
    }
  });

  // Create notification rule from parsed data
  app.post("/api/notifications/rules", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { trigger, condition, priority, recipients, message_template, confidence } = req.body;

      if (!trigger || !priority || !recipients) {
        return res.status(400).json({ message: "Trigger, priority, and recipients are required" });
      }

      const rule = await storage.createNotificationRule({
        user_id: userId,
        rule_name: `${trigger.replace("_", " ")} notification`,
        original_prompt: req.body.originalPrompt || "",
        trigger_event: trigger,
        condition_logic: condition,
        notification_template: message_template || `New ${trigger} notification`,
        priority_level: priority,
        target_recipients: recipients,
        ai_confidence: confidence || 0.8,
        is_active: true,
      });

      res.json({
        message: "Notification rule created successfully",
        rule,
      });
    } catch (error) {
      console.error("Error creating notification rule:", error);
      res.status(500).json({ message: "Failed to create notification rule" });
    }
  });

  // Get user's notification rules
  app.get("/api/notifications/rules", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const rules = await storage.getNotificationRulesByUser(userId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching notification rules:", error);
      res.status(500).json({ message: "Failed to fetch notification rules" });
    }
  });

  // Update notification rule
  app.put("/api/notifications/rules/:id", requireAuth, async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Verify rule belongs to user
      const rule = await storage.getNotificationRuleById(ruleId);
      if (!rule || rule.user_id !== userId) {
        return res.status(404).json({ message: "Notification rule not found" });
      }

      const updatedRule = await storage.updateNotificationRule(ruleId, req.body);
      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating notification rule:", error);
      res.status(500).json({ message: "Failed to update notification rule" });
    }
  });

  // Delete notification rule
  app.delete("/api/notifications/rules/:id", requireAuth, async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Verify rule belongs to user
      const rule = await storage.getNotificationRuleById(ruleId);
      if (!rule || rule.user_id !== userId) {
        return res.status(404).json({ message: "Notification rule not found" });
      }

      await storage.deleteNotificationRule(ruleId);
      res.json({ message: "Notification rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification rule:", error);
      res.status(500).json({ message: "Failed to delete notification rule" });
    }
  });

  // Get suggested notification rules
  app.post("/api/notifications/suggestions", requireAuth, async (req, res) => {
    try {
      const { context = "luxury car dealership management" } = req.body;

      const suggestions = await naturalLanguageNotificationService.suggestNotificationRules(context);

      res.json({
        message: "Notification suggestions generated successfully",
        suggestions,
      });
    } catch (error) {
      console.error("Error generating notification suggestions:", error);
      res.status(500).json({ message: "Failed to generate notification suggestions" });
    }
  });

  // Subscribe to push notifications
  app.post("/api/notifications/subscribe", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validatedData = insertPushSubscriptionSchema.parse(req.body);
      const subscription = await storage.createNotificationSubscription({
        ...validatedData,
        user_id: userId,
      });
      res.json(subscription);
    } catch (error) {
      console.error("Error creating notification subscription:", error);
      res.status(500).json({ message: "Failed to create notification subscription" });
    }
  });

  // Unsubscribe from push notifications
  app.delete("/api/notifications/subscribe/:id", requireAuth, async (req, res) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const userId = req.user!.id;

      const subscriptions = await storage.getNotificationSubscriptions();
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription || subscription.user_id !== userId) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const deleted = await storage.deleteNotificationSubscription(subscriptionId);
      if (deleted) {
        res.json({
          message: "Notification subscription deleted successfully",
        });
      } else {
        res.status(404).json({ message: "Notification subscription not found" });
      }
    } catch (error) {
      console.error("Error deleting notification subscription:", error);
      res.status(500).json({ message: "Failed to delete notification subscription" });
    }
  });

  // Send test notification (admin only)
  app.post("/api/notifications/test", requireAdmin, async (req, res) => {
    try {
      const { templateKey, recipientUserId, context } = req.body;
      const senderId = req.user!.id;

      const { notificationService } = await import("./services/notificationService");
      const notification = await notificationService.createNotification({
        recipient_user_id: recipientUserId,
        notification_type: "system",
        priority_level: "medium",
        title: `Test: ${templateKey}`,
        body: `Test notification sent by user ${senderId}`,
        status: "pending",
      });

      res.json(notification);
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  // Initialize notification system (admin only)
  app.post("/api/notifications/initialize", requireAdmin, async (req, res) => {
    try {
      const { notificationService } = await import("./services/notificationService");
      // Note: Initialization methods not implemented yet - system works without them

      res.json({ message: "Notification system initialized successfully" });
    } catch (error) {
      console.error("Error initializing notification system:", error);
      res.status(500).json({ message: "Failed to initialize notification system" });
    }
  });

  // ====== PUSH NOTIFICATION ROUTES ======

  // Subscribe to push notifications
  app.post("/api/push/subscribe", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { endpoint, keys_p256dh, keys_auth, device_type, user_agent } = req.body;

      if (!endpoint || !keys_p256dh || !keys_auth) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      const subscription = await storage.createPushSubscription({
        user_id: userId,
        endpoint,
        keys_p256dh,
        keys_auth,
        device_type: device_type || "unknown",
        user_agent: user_agent || "",
        is_active: true,
      });

      res.json({
        message: "Push subscription created successfully",
        subscription,
      });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  // Phase 3: PWA-compatible subscription endpoint
  app.post("/api/subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Phase 3: Transform PWA subscription format to database format
      const pwaSub = req.body;

      if (!pwaSub.endpoint || !pwaSub.keys?.p256dh || !pwaSub.keys?.auth) {
        return res.status(400).json({
          success: false,
          message: "Missing required subscription data",
        });
      }

      const subscription = await storage.createPushSubscription({
        user_id: userId,
        endpoint: pwaSub.endpoint,
        keys_p256dh: pwaSub.keys.p256dh,
        keys_auth: pwaSub.keys.auth,
        device_type: pwaSub.device_type || "unknown",
        user_agent: pwaSub.user_agent || "",
        is_active: true,
      });

      res.json({
        success: true,
        subscription_id: subscription.id,
        message: "Push subscription created successfully",
      });
    } catch (error) {
      console.error("Error creating PWA subscription:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create push subscription",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Missing endpoint" });
      }

      const deleted = await storage.deletePushSubscription(userId, endpoint);

      if (deleted) {
        res.json({ message: "Push subscription removed successfully" });
      } else {
        res.status(404).json({ message: "Push subscription not found" });
      }
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // Phase 3: Background sync endpoint for offline notifications
  app.post("/api/notifications/sync", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { timestamp, sync_type } = req.body;

      console.log(`Sync request from user ${userId} at ${timestamp}, type: ${sync_type}`);

      // For now, return empty pending notifications
      // In a full implementation, this would check for queued notifications
      res.json({
        success: true,
        synced_at: new Date().toISOString(),
        pending_notifications: [],
      });
    } catch (error) {
      console.error("Error syncing notifications:", error);
      res.status(500).json({
        success: false,
        message: "Failed to sync notifications",
      });
    }
  });

  // Get user's push subscriptions
  app.get("/api/push/subscriptions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const subscriptions = await storage.getPushSubscriptionsByUser(userId);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching push subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch push subscriptions" });
    }
  });

  // Debug endpoint for testing WebPushService
  app.post("/debug/send-test-push", requireAuth, async (req, res) => {
    try {
      console.log("Debug endpoint called with body:", req.body);
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        console.log("Missing subscriptionId parameter");
        return res.status(400).json({
          success: false,
          message: "Missing subscriptionId parameter",
        });
      }

      // Get the subscription from database
      const subscription = await storage.getPushSubscriptionById(subscriptionId);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
          subscription_id: subscriptionId,
        });
      }

      console.log("Found subscription:", subscription);

      // Test direct web-push without service wrapper
      const webpush = await import("web-push");

      // Configure VAPID
      webpush.default.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:test@example.com",
        process.env.VAPID_PUBLIC_KEY || "",
        process.env.VAPID_PRIVATE_KEY || "",
      );

      // Create push subscription object
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys_p256dh,
          auth: subscription.keys_auth,
        },
      };

      // Create test payload
      const payload = JSON.stringify({
        title: "AUTOLAB DMS Test",
        body: "Phase 2 WebPush test notification",
        icon: "/icons/icon-192x192.png",
        data: {
          timestamp: Date.now(),
          test: true,
          phase: 2,
        },
      });

      console.log("Sending test notification...");
      await webpush.default.sendNotification(pushSubscription, payload);

      res.json({
        success: true,
        subscription_id: subscriptionId,
        message: "Test push sent successfully - Phase 2",
        timestamp: new Date().toISOString(),
        payload: JSON.parse(payload),
      });
    } catch (error) {
      console.error("Debug test push error:", error);
      res.status(500).json({
        success: false,
        message: "Debug test push failed",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });

  // API endpoint for push notifications (Phase 3.2)
  app.post("/api/notifications/push", requireAuth, async (req, res) => {
    try {
      const { subscriptionId, notification } = req.body;
      console.log("Push notification API called with:", {
        subscriptionId,
        notification,
      });

      if (!subscriptionId || !notification) {
        return res.status(400).json({
          success: false,
          message: "Subscription ID and notification data are required",
        });
      }

      // Get subscription from database
      const subscription = await storage.getPushSubscriptionById(subscriptionId);

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Test direct web-push without service wrapper
      const webpush = await import("web-push");

      // Configure VAPID
      webpush.default.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:test@example.com",
        process.env.VAPID_PUBLIC_KEY || "",
        process.env.VAPID_PRIVATE_KEY || "",
      );

      // Create push subscription object
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys_p256dh,
          auth: subscription.keys_auth,
        },
      };

      // Debug key information
      console.log("Subscription keys debug:", {
        p256dh_length: subscription.keys_p256dh?.length || 0,
        p256dh_type: typeof subscription.keys_p256dh,
        p256dh_preview: subscription.keys_p256dh?.substring(0, 20) + "...",
        auth_length: subscription.keys_auth?.length || 0,
        auth_type: typeof subscription.keys_auth,
        auth_preview: subscription.keys_auth?.substring(0, 20) + "...",
      });

      // Create notification payload
      const payload = JSON.stringify({
        title: notification.title || "AUTOLAB DMS Notification",
        body: notification.body || "New notification from AUTOLAB DMS",
        icon: notification.icon || "/icons/icon-192x192.png",
        badge: notification.badge || "/icons/badge-72x72.png",
        tag: notification.tag || "autolab-notification",
        data: {
          url: notification.url || "/notifications",
          timestamp: Date.now(),
          phase: "3.2",
          ...notification.data,
        },
      });

      console.log("Sending push notification...");
      await webpush.default.sendNotification(pushSubscription, payload);

      res.json({
        success: true,
        message: "Push notification sent successfully",
        subscriptionId,
        notification: JSON.parse(payload),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Push notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send push notification",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Test push notification
  app.post("/api/push/test", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { title, body } = req.body;

      const testTitle = title || "Test Notification";
      const testBody = body || "This is a test push notification from AUTOLAB";

      // Create a test notification
      const notification = await storage.createNotification({
        recipient_user_id: userId,
        notification_type: "push",
        priority_level: "medium",
        title: testTitle,
        body: testBody,

        status: "pending",
      });

      // Send push notification (handled automatically by createNotification)

      res.json({
        message: "Test push notification sent successfully",
        notification,
      });
    } catch (error) {
      console.error("Error sending test push notification:", error);
      res.status(500).json({ message: "Failed to send test push notification" });
    }
  });

  // Get pending notifications for iOS Safari
  app.get("/api/notifications/pending", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get undelivered notifications for this user
      const notifications = await storage.getUndeliveredNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Failed to get pending notifications:", error);
      res.status(500).json({ error: "Failed to get pending notifications" });
    }
  });

  // Mark notification as delivered
  app.post("/api/notifications/:id/delivered", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (!notificationId) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }

      await storage.markNotificationDelivered(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark notification as delivered:", error);
      res.status(500).json({ error: "Failed to mark notification as delivered" });
    }
  });

  // Register AI routes directly here for now
  // Quick query endpoint for common questions
  app.post("/api/ai/quick-query", requireAuth, async (req, res) => {
    try {
      const { query } = req.body;

      // Handle specific queries with direct data access for speed
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes("how many vehicles") || lowerQuery.includes("inventory count")) {
        const stats = await storage.getDashboardStats();
        return res.json({
          message: `We currently have ${stats.stockSummary.totalVehicles
            } vehicles in stock with a total value of £${stats.stockSummary.totalValue.toLocaleString()}. This includes ${stats.stockSummary.totalMakes
            } different makes.`,
          context_used: ["inventory_data", "stock_summary"],
          suggestions: [
            "Show me the breakdown by make",
            "What's our oldest stock?",
            "Which vehicles arrived this week?",
          ],
        });
      }

      if (lowerQuery.includes("sales today") || lowerQuery.includes("today sales")) {
        const todaySales = await storage.getTodaySales();
        return res.json({
          message: `Today we've sold ${todaySales.count
            } vehicles for a total of £${todaySales.revenue.toLocaleString()} with a gross profit of £${todaySales.profit.toLocaleString()}.`,
          context_used: ["sales_data", "today_sales"],
          suggestions: [
            "Compare with yesterday's sales",
            "Show me this week's performance",
            "Who were the top performers today?",
          ],
        });
      }

      if (
        lowerQuery.includes("top selling") ||
        lowerQuery.includes("best selling") ||
        lowerQuery.includes("top makes") ||
        lowerQuery.includes("selling makes")
      ) {
        const stats = await storage.getDashboardStats();
        const topMakes = stats.salesByMake.slice(0, 5);
        let message = `Here are our top selling makes:\n\n`;
        topMakes.forEach((make, index) => {
          message += `${index + 1}. ${make.makeName}: ${make.soldCount} vehicles sold\n`;
        });

        return res.json({
          message: message.trim(),
          context_used: ["sales_data", "make_analysis"],
          suggestions: [
            "Show me stock by make",
            "What's our most profitable make?",
            "Show me sales trends this month",
          ],
        });
      }

      if (lowerQuery.includes("customer") || lowerQuery.includes("lead")) {
        const leadStats = await storage.getLeadStats();
        const customerStats = await storage.getCustomerCrmStats();

        return res.json({
          message: `We currently have ${leadStats.totalLeads
            } active leads in our pipeline with a ${leadStats.conversionRate.toFixed(
              1,
            )}% conversion rate. We've served ${customerStats.total_leads_mtd} customers total, with ${customerStats.active_leads
            } active this year.`,
          context_used: ["customer_data", "lead_data"],
          suggestions: [
            "Show me high-value customers",
            "What's our lead conversion by source?",
            "Show me recent customer activity",
          ],
        });
      }

      // For other queries, fall back to AI
      return res.status(400).json({
        error: "Query not recognized for quick response",
        fallback: true,
      });
    } catch (error) {
      console.error("Quick query error:", error);
      res.status(500).json({ error: "Failed to process quick query" });
    }
  });

  // AI Business Intelligence conversational endpoints (keeping legacy endpoints for backward compatibility)
  app.post("/api/ai-reports/generate", requireAuth, async (req, res) => {
    try {
      const { query, context, conversation_history } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }

      const response = await aiBusinessIntelligenceService.processConversation({
        message: query,
        context,
        conversation_history,
      });

      res.json(response);
    } catch (error) {
      console.error("Error processing AI conversation:", error);
      res.status(500).json({ error: "Failed to process AI conversation" });
    }
  });

  // AI conversation endpoint for Global AI Assistant
  app.post("/api/ai-reports/conversation", requireAuth, async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required and must be a string" });
      }

      const response = await aiBusinessIntelligenceService.processConversation({
        message,
        conversation_history: conversationHistory,
      });

      res.json(response);
    } catch (error) {
      console.error("Error processing AI conversation:", error);
      res.status(500).json({ error: "Failed to process AI conversation" });
    }
  });

  // Sync notifications for offline support
  app.post("/api/notifications/sync", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { timestamp } = req.body;

      // Get pending notifications for user
      const pendingNotifications = await storage.getPendingNotificationsByUser(userId);

      res.json({
        message: "Notifications synced successfully",
        notifications: pendingNotifications,
      });
    } catch (error) {
      console.error("Error syncing notifications:", error);
      res.status(500).json({ message: "Failed to sync notifications" });
    }
  });

  // Create invoice (optionally include items and vehicle_condition in the body)
  async function logDbContext(client : any) {
  try {
    const r = await client.query("SELECT current_database() AS db, current_user AS user, current_schema() AS schema;");
    const sp = await client.query("SHOW search_path;");
    console.log("API - USING DATABASE_URL:", process.env.DATABASE_URL?.replace(/(\/\/).*?:.*@/,"$1<REDACTED>@") );
    console.log("API - DB_CONTEXT:", r.rows[0]);
    console.log("API - search_path:", sp.rows[0].search_path);
  } catch (err) {
    console.error("API - failed to query DB context:", err);
  }
}


app.post(
  "/api/invoices/generate-excel",
  requireAuth,
  async (req, res) => {
    try {
      const invoice = req.body?.invoice as InvoiceApiData | undefined;

      if (!invoice || !invoice.invoice_no) {
        return res
          .status(400)
          .json({ error: "Missing invoice data or invoice_no" });
      }

      const formatDate = (value: string | Date | null): string => {
        if (!value) return "";
        if (value instanceof Date) return value.toLocaleDateString("en-GB");
        const [d] = value.split("T");
        return d || value;
      };

      const asNumber = (v: string | number | null): number | undefined => {
        if (v === null || v === undefined || v === "") return undefined;
        if (typeof v === "number") return v;
        const num = Number(v);
        return Number.isNaN(num) ? undefined : num;
      };

      const fillAddressLines = (
        ws: ExcelJS.Worksheet,
        col: string,
        startRow: number,
        value: string | null | undefined,
        maxLines: number
      ): void => {
        if (!value) return;
        const lines = value.split(/\r?\n/).filter((l) => l.trim());
        lines.slice(0, maxLines).forEach((line, i) => {
          ws.getCell(`${col}${startRow + i}`).value = line;
        });
      };

      // 1) Load template
     const templatePath = path.join(
      process.cwd(),
      "server",
      "templates",
      "invoice-template-excel.xlsx"
    );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);

      const ws = workbook.getWorksheet(1);
      if (!ws) {
        return res
          .status(500)
          .json({ error: "Worksheet not found in Excel template" });
      }

      // ========================
      // Fill header / address
      // ========================
      ws.getCell("C1").value = invoice.invoice_no;
      ws.getCell("C2").value = invoice.tax_point ?? "N/A";

      fillAddressLines(ws, "A", 7, invoice.invoice_name_address, 5);
      if (invoice.collection_address) {
        fillAddressLines(ws, "F", 7, invoice.collection_address, 5);
      }

      if (invoice.issued_by) ws.getCell("C15").value = invoice.issued_by;
      if (invoice.invoiced_by) ws.getCell("G15").value = invoice.invoiced_by;

      // ========================
      // Vehicle details block
      // ========================

      // Row 17: headers → values on row 18
      ws.getCell("A18").value = invoice.make ?? "";             // under "Make"
      ws.getCell("C18").value = invoice.model ?? "";            // under "Model"
      ws.getCell("E18").value = invoice.chassis_no ?? "";       // under "Chassis No."
      ws.getCell("G18").value = invoice.registration ?? "";     // under "Registration"

      // Row 19: headers → values on row 20
      ws.getCell("A20").value = invoice.purchased_by ?? "";             // Sold By
      ws.getCell("C20").value = formatDate(invoice.mot_end);            // MOT Expiry
      if (invoice.mileage !== null && invoice.mileage !== undefined) {
        ws.getCell("E20").value = invoice.mileage;                       // Mileage
      }
      ws.getCell("G20").value = invoice.dor ?? "";                       // Date Of Registration

      // Row 21: headers → values on row 22
      ws.getCell("A22").value = invoice.colour ?? "";                    // Colour
      ws.getCell("C22").value = invoice.interior_colour ?? "";           // Int Colour
      ws.getCell("E22").value = formatDate(invoice.purchase_date);       // Sale Date
      ws.getCell("G22").value = formatDate(invoice.collection_date);     // Collection Date

      // ========================
      // Description of Goods
      // ========================
      ws.getCell("A26").value = invoice.description_of_goods ?? "";

      // ========================
      // Bank / Payment section
      // ========================
      // move values to column C so labels in column A stay fully visible
      ws.getCell("C46").value = invoice.bank_name ?? "";        // Bank
      ws.getCell("C47").value = invoice.acc_name ?? "";         // Account Name
      ws.getCell("C48").value = invoice.sort_code ?? "";        // Sort Code
      ws.getCell("C49").value = invoice.account_number ?? "";   // Account Number
      ws.getCell("C52").value = invoice.ref ?? "";              // REFERENCE (yellow cell)

      // ========================
      // Totals
      // ========================
      const subTotal = asNumber(invoice.sub_total);
      const vat = asNumber(invoice.vat_at_20);
      const total = asNumber(invoice.total);
      const deposit = asNumber(invoice.deposit_paid);
      const balance = asNumber(invoice.balance_due);

      if (subTotal !== undefined) ws.getCell("G45").value = subTotal;
      if (vat !== undefined) ws.getCell("G46").value = vat;
      if (total !== undefined) ws.getCell("G48").value = total;
      if (deposit !== undefined) ws.getCell("G49").value = deposit;
      if (balance !== undefined) ws.getCell("G52").value = balance;

      // Footer date
      const invoiceDate =
        formatDate(invoice.tax_point) || formatDate(invoice.created_at);
      ws.getCell("A57").value = `Date: ${invoiceDate}`;

      // ========================
      // STREAM EXCEL BACK
      // ========================
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${invoice.invoice_no}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error generating Excel invoice:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate invoice Excel file";
      res.status(500).json({ error: message });
    }
  }
);





app.post(
  "/api/invoices",
  requireAuth,
  vehicleInspectionUpload.single("inspectionImage"),
  async (req: AuthenticatedRequest, res) => {
    const parseJsonFields = (body: any) => {
      if (typeof body.items === "string") {
        try { body.items = JSON.parse(body.items); } catch {}
      }
      if (typeof body.vehicle_condition === "string") {
        try { body.vehicle_condition = JSON.parse(body.vehicle_condition); } catch {}
      }
      return body;
    };

    const normalizeNumberString = (v: any): number | undefined => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === "number") return v;
      if (typeof v !== "string") return undefined;
      const s = v.trim();
      if (s === "") return undefined;
      const cleaned = s.replace(/[^0-9+\-.,eE]/g, "").replace(/,/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : NaN;
    };

    const normalizeDateString = (v: any): Date | undefined => {
      if (v === undefined || v === null) return undefined;
      if (v instanceof Date) return v;
      if (typeof v !== "string") return undefined;
      const s = v.trim();
      if (s === "") return undefined;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    try {
      req.body = parseJsonFields(req.body);

      const numericFields = [
        "mileage",
        "sub_total",
        "vat_at_20",
        "total",
        "deposit_paid",
        "balance_due",
      ];

      const dateFields = ["mot_end", "purchase_date", "collection_date"];

      const fieldErrors: Record<string, string[]> = {};

      for (const key of numericFields) {
        if (key in req.body) {
          const val = req.body[key];
          const n = normalizeNumberString(val);
          if (n === undefined) {
            delete req.body[key];
          } else if (Number.isNaN(n)) {
            fieldErrors[key] = [`Expected number, received invalid value (${String(val)})`];
          } else {
            req.body[key] = n;
          }
        }
      }

      for (const key of dateFields) {
        if (key in req.body) {
          const val = req.body[key];
          const d = normalizeDateString(val);
          if (d === undefined) {
            delete req.body[key];
          } else if (d === null) {
            fieldErrors[key] = [`Expected date, received invalid value (${String(val)})`];
          } else {
            req.body[key] = d;
          }
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        return res.status(400).json({
          message: "Validation failed",
          errors: {
            formErrors: [],
            fieldErrors,
          },
        });
      }

      const baseShape = ((insertInvoiceSchema as any).shape ?? {}) as Record<string, any>;

      const invoiceRequestSchema = z.object({
        ...baseShape,
        mileage: z.number().optional(),
        sub_total: z.number().optional(),
        vat_at_20: z.number().optional(),
        total: z.number().optional(),
        deposit_paid: z.number().optional(),
        balance_due: z.number().optional(),
        mot_end: z.preprocess((v) => (v instanceof Date ? v : v), z.date().optional()),
        purchase_date: z.preprocess((v) => (v instanceof Date ? v : v), z.date().optional()),
        collection_date: z.preprocess((v) => (v instanceof Date ? v : v), z.date().optional()),
      });

      const parsed = invoiceRequestSchema.parse(req.body);

      const invoicePayload: any = { ...parsed };

      // ===========================================================
      //                🚗 ADD INSPECTION IMAGE HANDLING
      // ===========================================================
      if (req.file) {
        const f = req.file as Express.Multer.File;

        // store file metadata
        invoicePayload.inspectionImage = {
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          path: f.path ?? null,
          filename: (f as any).filename ?? null,
        };

        // Compute URL (prefer filename produced by multer diskStorage)
        const url = (f as any).filename
          ? `/uploads/vehicle-inspection-images/${encodeURIComponent((f as any).filename)}`
          : f.path ?? null;

        // set both keys so either code style works:
        invoicePayload.inspectionImageUrl = url;           // camelCase (existing)
        invoicePayload.inspection_image_url = url;         // snake_case (DB / schema)
      }

      // ===========================================================
      //                   EXISTING ATTACHMENTS
      // ===========================================================
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        invoicePayload.attachments = (req.files as Express.Multer.File[]).map((f) => ({
          originalName: f.originalname,
          mimeType: f.mimetype,
          size: f.size,
          path: f.path ?? null,
          filename: (f as any).filename ?? null,
        }));
      }

      // DEBUG: log payload so you can confirm inspection_image_url is present
      console.log("About to create invoicePayload:", invoicePayload);

      // ===========================================================
      //                       CREATE IN DB
      // ===========================================================
      const created = await storage.createInvoice(invoicePayload);

      console.log("API - created invoice:", created?.id ?? created);

      return res.status(201).json({ success: true, invoice: created });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.flatten() });
      }
      console.error(err);
      return res.status(500).json({ message: "Failed to create invoice" });
    }
  }
);



// route: /api/invoices

// List invoices
app.get("/api/invoices", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const invoices = await storage.getInvoices();
    res.json(invoices);
  } catch (err) {
    console.error("Error fetching invoices:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

// Get single invoice (optionally include items and vehicle condition)
app.get("/api/invoices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid invoice id" });

    const invoice = await storage.getInvoice(id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const items = await storage.getInvoiceItems(id);
    const vehicleCondition = await storage.getVehicleCondition(id);

    res.json({ ...invoice, items, vehicle_condition: vehicleCondition });
  } catch (err) {
    console.error("Error fetching invoice:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
});

// Delete invoice
app.delete("/api/invoices/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid invoice id" });

    await storage.deleteInvoice(id);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting invoice:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
});

/* -------------------------
   Invoice Items endpoints
   ------------------------- */

// Add invoice item (single)
app.post("/api/invoices/:id/items", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const invoiceId = Number(req.params.id);
    if (Number.isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice id" });

    const item = insertInvoiceItemSchema.parse({ ...req.body, invoice_id: invoiceId });
    const created = await storage.addInvoiceItem(item);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: err.flatten() });
    }
    console.error("Error adding invoice item:", err);
    res.status(500).json({ message: "Failed to add invoice item" });
  }
});

// Delete invoice item
app.delete("/api/invoices/items/:itemId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const itemId = Number(req.params.itemId);
    if (Number.isNaN(itemId)) return res.status(400).json({ message: "Invalid item id" });

    await storage.deleteInvoiceItem(itemId);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting invoice item:", err);
    res.status(500).json({ message: "Failed to delete invoice item" });
  }
});

/* -------------------------
   Vehicle Condition endpoints
   ------------------------- */

// Create or update vehicle condition for an invoice
app.post("/api/invoices/:id/vehicle-condition", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const invoiceId = Number(req.params.id);
    if (Number.isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice id" });

    const parsed = insertVehicleConditionSchema.parse({ ...req.body, invoice_id: invoiceId });

    // Check existing
    const existing = await storage.getVehicleCondition(invoiceId);
    if (existing) {
      const updated = await storage.updateVehicleCondition(existing.id, parsed);
      res.json(updated);
    } else {
      const created = await storage.createVehicleCondition(parsed);
      res.status(201).json(created);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation failed", errors: err.flatten() });
    }
    console.error("Error saving vehicle condition:", err);
    res.status(500).json({ message: "Failed to save vehicle condition" });
  }
});

// Get vehicle condition for invoice
app.get("/api/invoices/:id/vehicle-condition", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const invoiceId = Number(req.params.id);
    if (Number.isNaN(invoiceId)) return res.status(400).json({ message: "Invalid invoice id" });

    const vc = await storage.getVehicleCondition(invoiceId);
    if (!vc) return res.status(404).json({ message: "Vehicle condition not found" });

    res.json(vc);
  } catch (err) {
    console.error("Error fetching vehicle condition:", err);
    res.status(500).json({ message: "Failed to fetch vehicle condition" });
  }
});

  // Import and register DealerGPT routes (WebSocket service is now available)
  const { default: simpleDealerGPTRoutes } = await import("./routes/simpleDealerGPTRoutes");
  app.use(simpleDealerGPTRoutes);

  return httpServer;
}
