import {
 pgTable,
 text,
 serial,
 integer,
 boolean,
 timestamp,
 decimal,
 varchar,
 jsonb,
 index,
 time,
 real,
 json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
 "sessions",
 {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
 },
 table => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable(
 "users",
 {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // hashed password
  email: text("email").unique(),
  first_name: text("first_name"),
  last_name: text("last_name"),
  profile_image_url: text("profile_image_url"),
  role: text("role").notNull().default("salesperson"), // admin, manager, salesperson, office_staff, marketing, showroom_staff
  is_active: boolean("is_active").notNull().default(true),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  // Authentication and user management indexes
  index("idx_users_username").on(table.username),
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
  index("idx_users_is_active").on(table.is_active),
  index("idx_users_last_login").on(table.last_login),
  index("idx_users_created_at").on(table.created_at),

  // Composite indexes for user queries
  index("idx_users_active_role").on(table.is_active, table.role),
  index("idx_users_role_name").on(table.role, table.first_name, table.last_name),
 ],
);

// Page definitions table - defines all available pages in the system
export const page_definitions = pgTable("page_definitions", {
 id: serial("id").primaryKey(),
 page_key: text("page_key").notNull().unique(), // e.g., 'dashboard', 'vehicles', 'customers'
 page_name: text("page_name").notNull(), // Display name
 page_description: text("page_description"),
 page_category: text("page_category").notNull(), // 'main', 'management', 'reports', 'admin'
 is_system_page: boolean("is_system_page").notNull().default(false), // Cannot be disabled for admins
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// User permissions table - granular permissions per user per page
export const user_permissions = pgTable(
 "user_permissions",
 {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
   .references(() => users.id, { onDelete: "cascade" })
   .notNull(),
  page_key: text("page_key")
   .references(() => page_definitions.page_key, { onDelete: "cascade" })
   .notNull(),
  permission_level: text("permission_level").notNull(), // 'hidden', 'view_only', 'full_access'
  can_create: boolean("can_create").notNull().default(false),
  can_edit: boolean("can_edit").notNull().default(false),
  can_delete: boolean("can_delete").notNull().default(false),
  can_export: boolean("can_export").notNull().default(false),
  custom_restrictions: jsonb("custom_restrictions"), // JSON for page-specific restrictions
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_user_permissions_user_id").on(table.user_id),
  index("idx_user_permissions_page_key").on(table.page_key),
 ],
);

// Vehicle makes table
export const vehicleMakes = pgTable("vehicle_makes", {
 id: serial("id").primaryKey(),
 name: text("name").notNull().unique(),
 createdAt: timestamp("created_at").defaultNow(),
});

// Vehicle models table
export const vehicleModels = pgTable("vehicle_models", {
 id: serial("id").primaryKey(),
 makeId: integer("make_id")
  .notNull()
  .references(() => vehicleMakes.id),
 name: text("name").notNull(),
 createdAt: timestamp("created_at").defaultNow(),
});

// Vehicle Master table (matches CSV structure)
export const vehicles = pgTable(
 "vehicles",
 {
  id: serial("id").primaryKey(),
  stock_number: text("stock_number").unique(),
  department: text("department"),
  buyer: text("buyer"),
  sales_status: text("sales_status"),
  collection_status: text("collection_status"),
  registration: text("registration"),
  make: text("make"),
  model: text("model"),
  derivative: text("derivative"),
  colour: text("colour"),
  mileage: integer("mileage"),
  year: integer("year"),
  date_of_registration: timestamp("date_of_registration"),
  chassis_number: text("chassis_number"),
  purchase_invoice_date: timestamp("purchase_invoice_date"),
  purchase_px_value: decimal("purchase_px_value", {
   precision: 10,
   scale: 2,
  }),
  purchase_cash: decimal("purchase_cash", { precision: 10, scale: 2 }),
  purchase_fees: decimal("purchase_fees", { precision: 10, scale: 2 }),
  purchase_finance_settlement: decimal("purchase_finance_settlement", {
   precision: 10,
   scale: 2,
  }),
  purchase_bank_transfer: decimal("purchase_bank_transfer", {
   precision: 10,
   scale: 2,
  }),
  vat: decimal("vat", { precision: 10, scale: 2 }),
  purchase_price_total: decimal("purchase_price_total", {
   precision: 10,
   scale: 2,
  }),
  sale_date: timestamp("sale_date"),
  bank_payment: decimal("bank_payment", { precision: 10, scale: 2 }),
  finance_payment: decimal("finance_payment", { precision: 10, scale: 2 }),
  finance_settlement: decimal("finance_settlement", {
   precision: 10,
   scale: 2,
  }),
  px_value: decimal("px_value", { precision: 10, scale: 2 }),
  vat_payment: decimal("vat_payment", { precision: 10, scale: 2 }),
  cash_payment: decimal("cash_payment", { precision: 10, scale: 2 }),
  total_sale_price: decimal("total_sale_price", { precision: 10, scale: 2 }),
  cash_o_b: decimal("cash_o_b", { precision: 10, scale: 2 }),
  px_o_r_value: decimal("px_o_r_value", { precision: 10, scale: 2 }),
  road_tax: decimal("road_tax", { precision: 10, scale: 2 }),
  dvla: decimal("dvla", { precision: 10, scale: 2 }),
  alloy_insurance: decimal("alloy_insurance", { precision: 10, scale: 2 }),
  paint_insurance: decimal("paint_insurance", { precision: 10, scale: 2 }),
  gap_insurance: decimal("gap_insurance", { precision: 10, scale: 2 }),
  parts_cost: decimal("parts_cost", { precision: 10, scale: 2 }),
  paint_labour_costs: decimal("paint_labour_costs", {
   precision: 10,
   scale: 2,
  }),
  warranty_costs: decimal("warranty_costs", { precision: 10, scale: 2 }),
  total_gp: decimal("total_gp", { precision: 10, scale: 2 }),
  adj_gp: decimal("adj_gp", { precision: 10, scale: 2 }),
  dfc_outstanding_amount: decimal("dfc_outstanding_amount", {
   precision: 10,
   scale: 2,
  }),
  payment_notes: text("payment_notes"),
  customer_first_name: text("customer_first_name"),
  customer_surname: text("customer_surname"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
 },
 table => [
  // Performance-critical indexes for vehicle management
  index("idx_vehicles_sales_status").on(table.sales_status),
  index("idx_vehicles_collection_status").on(table.collection_status),
  index("idx_vehicles_make").on(table.make),
  index("idx_vehicles_model").on(table.model),
  index("idx_vehicles_registration").on(table.registration),
  index("idx_vehicles_year").on(table.year),
  index("idx_vehicles_mileage").on(table.mileage),
  index("idx_vehicles_sale_date").on(table.sale_date),
  index("idx_vehicles_purchase_invoice_date").on(table.purchase_invoice_date),
  index("idx_vehicles_created_at").on(table.createdAt),
  index("idx_vehicles_updated_at").on(table.updatedAt),

  // Composite indexes for common query patterns
  index("idx_vehicles_status_make").on(table.sales_status, table.make),
  index("idx_vehicles_status_date").on(table.sales_status, table.sale_date),
  index("idx_vehicles_make_model").on(table.make, table.model),
  index("idx_vehicles_make_year").on(table.make, table.year),
  index("idx_vehicles_status_stock").on(table.sales_status, table.stock_number),

  // Financial reporting indexes
  index("idx_vehicles_sale_date_status").on(table.sale_date, table.sales_status),
  index("idx_vehicles_purchase_date_status").on(table.purchase_invoice_date, table.sales_status),

  // Search and filtering indexes
  index("idx_vehicles_customer_name").on(table.customer_first_name, table.customer_surname),
  index("idx_vehicles_department").on(table.department),
 ],
);


// Invoice Table
/**
 * Invoices header / payment / vehicle summary
 */
  export const invoices = pgTable(
    "invoices",
    {
      id: serial("id").primaryKey(),
      invoice_no: text("invoice_no").unique().notNull(),
      tax_point: text("tax_point"),
      check_no: text("check_no"),
      invoice_name_address: text("invoice_name_address"),
      collection_address: text("collection_address"),
      issued_by: text("issued_by"),
      invoiced_by: text("invoiced_by"),

      inspection_image_url: text("inspection_image_url"),

      // basic vehicle summary (also stored fully in vehicle_conditions if needed)
      make: text("make"),
      model: text("model"),
      chassis_no: text("chassis_no"),
      registration: text("registration"),
      purchased_by: text("purchased_by"),
      mot_end: timestamp("mot_end"),
      mileage: integer("mileage"),
      dor: text("dor"),
      colour: text("colour"),
      interior_colour: text("interior_colour"),
      purchase_date: timestamp("purchase_date"),
      collection_date: timestamp("collection_date"),

      // payment/bank
      bank_name: text("bank_name"),
      account_number: text("account_number"),
      sort_code: text("sort_code"),
      ref: text("ref"),
      acc_name: text("acc_name"),

      // totals (monetary fields)
      sub_total: decimal("sub_total", { precision: 14, scale: 2 }),
      vat_at_20: decimal("vat_at_20", { precision: 14, scale: 2 }),
      total: decimal("total", { precision: 14, scale: 2 }),
      deposit_paid: decimal("deposit_paid", { precision: 14, scale: 2 }),
      balance_due: decimal("balance_due", { precision: 14, scale: 2 }),

      // freeform / notes
      description_of_goods: text("description_of_goods"),
      notes: text("notes"),

      // administrative
      upload_date: timestamp("upload_date").defaultNow(),
      created_at: timestamp("created_at").defaultNow(),
      updated_at: timestamp("updated_at").defaultNow(),
    },
    (table) => [
      // indexes to support common queries
      index("idx_invoices_invoice_no").on(table.invoice_no),
      index("idx_invoices_upload_date").on(table.upload_date),
      index("idx_invoices_make_model").on(table.make, table.model),
      index("idx_invoices_registration").on(table.registration),
      index("idx_invoices_created_at").on(table.created_at),
    ]
  );

/**
 * Invoice line items — supports multiple rows per invoice.
 * (Your form presently collects a single description/qty/unitPrice/actualPrice,
 * but using a separate table gives flexible modeling.)
 */
export const invoice_items = pgTable(
  "invoice_items",
  {
    id: serial("id").primaryKey(),
    invoice_id: integer("invoice_id").references(() => invoices.id).notNull(),
    description: text("description").notNull(),
    qty: integer("qty"),
    unit_price: decimal("unit_price", { precision: 14, scale: 2 }),
    actual_price: decimal("actual_price", { precision: 14, scale: 2 }),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_invoice_items_invoice_id").on(table.invoice_id),
  ]
);

/**
 * Vehicle condition / inspection sheet — one row per invoice (nullable until inspection done)
 */
export const vehicle_conditions = pgTable(
  "vehicle_conditions",
  {
    id: serial("id").primaryKey(),
    invoice_id: integer("invoice_id").references(() => invoices.id).unique().notNull(),

    // star ratings (1-5). Using integers for each area so they map cleanly to your UI.
    front_paint: integer("front_paint").default(0),
    front_rust_dust: integer("front_rust_dust").default(0),
    front_dent: integer("front_dent").default(0),

    rear_paint: integer("rear_paint").default(0),
    rear_rust_dust: integer("rear_rust_dust").default(0),
    rear_dent: integer("rear_dent").default(0),

    left_paint: integer("left_paint").default(0),
    left_rust_dust: integer("left_rust_dust").default(0),
    left_dent: integer("left_dent").default(0),

    right_paint: integer("right_paint").default(0),
    right_rust_dust: integer("right_rust_dust").default(0),
    right_dent: integer("right_dent").default(0),

    top_paint: integer("top_paint").default(0),
    top_rust_dust: integer("top_rust_dust").default(0),
    top_dent: integer("top_dent").default(0),

    wheels_front_left: integer("wheels_front_left").default(0),
    wheels_front_right: integer("wheels_front_right").default(0),
    wheels_rear_left: integer("wheels_rear_left").default(0),
    wheels_rear_right: integer("wheels_rear_right").default(0),

    windscreen_chipped: boolean("windscreen_chipped").default(false),

    additional_comments: text("additional_comments"),

    // Optionally keep a JSON snapshot of the whole inspection (useful for audit / future UI fields)
    inspection_snapshot: jsonb("inspection_snapshot"),

    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_vehicle_conditions_invoice_id").on(table.invoice_id),
    index("idx_vehicle_conditions_created_at").on(table.created_at),
  ]
);

// Sales Invoices v2
 export const sales_invoices_v2 = pgTable(
  "sales_invoices_v2",
  {
   id: serial("id").primaryKey(),
   invoice_no: text("invoice_no").unique().notNull(),
   tax_point: text("tax_point"),
   check_no: text("check_no"),
   invoice_name_address: text("invoice_name_address"),
   collection_address: text("collection_address"),
   issued_by: text("issued_by"),
   invoiced_by: text("invoiced_by"),

   inspection_image_url: text("inspection_image_url"),

   // basic vehicle summary (also stored fully in vehicle_conditions if needed)
   make: text("make"),
   model: text("model"),
   chassis_no: text("chassis_no"),
   registration: text("registration"),
   purchased_by: text("purchased_by"),
   mot_end: timestamp("mot_end"),
   mileage: integer("mileage"),
   dor: text("dor"),
   colour: text("colour"),
   interior_colour: text("interior_colour"),
   purchase_date: timestamp("purchase_date"),
   collection_date: timestamp("collection_date"),

   // payment/bank
   bank_name: text("bank_name"),
   account_number: text("account_number"),
   sort_code: text("sort_code"),
   ref: text("ref"),
   acc_name: text("acc_name"),

   // totals (monetary fields)
   sub_total: decimal("sub_total", { precision: 14, scale: 2 }),
   vat_at_20: decimal("vat_at_20", { precision: 14, scale: 2 }),
   total: decimal("total", { precision: 14, scale: 2 }),
   deposit_paid: decimal("deposit_paid", { precision: 14, scale: 2 }),
   balance_due: decimal("balance_due", { precision: 14, scale: 2 }),

   // freeform / notes
   description_of_goods: text("description_of_goods"),
   notes: text("notes"),

   // administrative
   upload_date: timestamp("upload_date").defaultNow(),
   created_at: timestamp("created_at").defaultNow(),
   updated_at: timestamp("updated_at").defaultNow(),
  },
  table => [
   index("idx_sales_invoices_v2_invoice_no").on(table.invoice_no),
   index("idx_sales_invoices_v2_upload_date").on(table.upload_date),
   index("idx_sales_invoices_v2_make_model").on(table.make, table.model),
   index("idx_sales_invoices_v2_registration").on(table.registration),
   index("idx_sales_invoices_v2_created_at").on(table.created_at),
  ],
 );



// Customers table - Simplified structure focused on essential information
export const customers = pgTable(
 "customers",
 {
  id: serial("id").primaryKey(),
  // Name information
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),

  // Contact information
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),

  // Address information
  address: text("address"),
  city: text("city"),
  county: text("county"),
  postcode: text("postcode"),

  // Notes
  notes: text("notes"),

  // Timestamps
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  // Core customer lookup indexes
  index("idx_customers_email").on(table.email),
  index("idx_customers_phone").on(table.phone),
  index("idx_customers_mobile").on(table.mobile),
  index("idx_customers_postcode").on(table.postcode),
  index("idx_customers_created_at").on(table.created_at),
  index("idx_customers_updated_at").on(table.updated_at),

  // Name search index
  index("idx_customers_name_search").on(table.first_name, table.last_name),
 ],
);

// AI Assistant Memory Store - For context-aware interactions
export const ai_memory = pgTable(
 "ai_memory",
 {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Format: "entity@id" or "topic@context"
  data: jsonb("data").notNull(), // Structured data for the memory entry
  memory_type: text("memory_type").notNull(), // user_preference, interaction, decision, pattern, alert
  entity_type: text("entity_type"), // customer, vehicle, lead, sale, etc.
  entity_id: integer("entity_id"), // Reference to the specific entity
  user_id: integer("user_id").references(() => users.id), // Associated user
  priority: text("priority").notNull().default("normal"), // low, normal, high, critical
  tags: text("tags").array(), // Searchable tags
  relevance_score: real("relevance_score").default(1.0), // For memory ranking
  expires_at: timestamp("expires_at"), // Optional expiration
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_ai_memory_key").on(table.key),
  index("idx_ai_memory_type").on(table.memory_type),
  index("idx_ai_memory_entity").on(table.entity_type, table.entity_id),
  index("idx_ai_memory_user").on(table.user_id),
  index("idx_ai_memory_priority").on(table.priority),
  index("idx_ai_memory_relevance").on(table.relevance_score),
  index("idx_ai_memory_expires").on(table.expires_at),
  index("idx_ai_memory_created").on(table.created_at),
 ],
);

// AI Assistant Conversations - For conversation history
export const ai_conversations = pgTable(
 "ai_conversations",
 {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
   .references(() => users.id)
   .notNull(),
  session_id: text("session_id").notNull(), // Groups messages in a session
  message: text("message").notNull(),
  response: text("response").notNull(),
  context_used: text("context_used").array(), // Context keys used
  response_time: integer("response_time"), // Response time in milliseconds
  feedback: text("feedback"), // user feedback on response quality
  created_at: timestamp("created_at").defaultNow(),
 },
 table => [
  index("idx_ai_conversations_user").on(table.user_id),
  index("idx_ai_conversations_session").on(table.session_id),
  index("idx_ai_conversations_created").on(table.created_at),
 ],
);

// AI Assistant Insights - For proactive recommendations
export const ai_insights = pgTable(
 "ai_insights",
 {
  id: serial("id").primaryKey(),
  insight_type: text("insight_type").notNull(), // alert, recommendation, pattern, forecast
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: jsonb("data"), // Supporting data for the insight
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  category: text("category").notNull(), // inventory, sales, customers, leads, finance
  target_users: integer("target_users").array(), // User IDs who should see this
  conditions: jsonb("conditions"), // Conditions that triggered this insight
  is_active: boolean("is_active").notNull().default(true),
  is_acknowledged: boolean("is_acknowledged").notNull().default(false),
  acknowledged_by: integer("acknowledged_by").references(() => users.id),
  acknowledged_at: timestamp("acknowledged_at"),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow(),
 },
 table => [
  index("idx_ai_insights_type").on(table.insight_type),
  index("idx_ai_insights_priority").on(table.priority),
  index("idx_ai_insights_category").on(table.category),
  index("idx_ai_insights_active").on(table.is_active),
  index("idx_ai_insights_acknowledged").on(table.is_acknowledged),
  index("idx_ai_insights_expires").on(table.expires_at),
  index("idx_ai_insights_created").on(table.created_at),
 ],
);

// Sales table
export const sales = pgTable(
 "sales",
 {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id")
   .notNull()
   .references(() => vehicles.id),
  customerId: integer("customer_id")
   .notNull()
   .references(() => customers.id),
  salespersonId: integer("salesperson_id")
   .notNull()
   .references(() => users.id),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  grossProfit: decimal("gross_profit", { precision: 10, scale: 2 }),
  financeAmount: decimal("finance_amount", { precision: 10, scale: 2 }),
  financeProvider: text("finance_provider"),
  addOnProducts: jsonb("add_on_products"), // warranties, insurance, etc.
  saleDate: timestamp("sale_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
 },
 table => [
  // Sales reporting and analysis indexes
  index("idx_sales_sale_date").on(table.saleDate),
  index("idx_sales_vehicle_id").on(table.vehicleId),
  index("idx_sales_customer_id").on(table.customerId),
  index("idx_sales_salesperson_id").on(table.salespersonId),
  index("idx_sales_sale_price").on(table.salePrice),
  index("idx_sales_gross_profit").on(table.grossProfit),
  index("idx_sales_finance_provider").on(table.financeProvider),
  index("idx_sales_created_at").on(table.createdAt),

  // Composite indexes for performance reporting
  index("idx_sales_date_salesperson").on(table.saleDate, table.salespersonId),
  index("idx_sales_date_price").on(table.saleDate, table.salePrice),
  index("idx_sales_salesperson_date").on(table.salespersonId, table.saleDate),
 ],
);

// Purchases table (vehicle acquisitions)
export const purchases = pgTable("purchases", {
 id: serial("id").primaryKey(),
 vehicleId: integer("vehicle_id")
  .notNull()
  .references(() => vehicles.id),
 supplierId: integer("supplier_id"),
 purchasePrice: decimal("purchase_price", {
  precision: 10,
  scale: 2,
 }).notNull(),
 isPartExchange: boolean("is_part_exchange").default(false),
 purchaseDate: timestamp("purchase_date").notNull(),
 createdAt: timestamp("created_at").defaultNow(),
});

// Leads table - Enhanced sales pipeline
export const leads = pgTable(
 "leads",
 {
  id: serial("id").primaryKey(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  email: text("email"),
  primary_phone: text("primary_phone"),
  secondary_phone: text("secondary_phone"),

  // Vehicle assignment and preferences
  assigned_vehicle_id: integer("assigned_vehicle_id").references(() => vehicles.id),
  vehicle_interests: text("vehicle_interests"), // Hatchback, Estate, Coupe, SUV, Convertible, Pickup, Saloon
  budget_min: decimal("budget_min", { precision: 10, scale: 2 }),
  budget_max: decimal("budget_max", { precision: 10, scale: 2 }),
  finance_required: boolean("finance_required").default(false),
  trade_in_vehicle: text("trade_in_vehicle"),
  trade_in_value: decimal("trade_in_value", { precision: 10, scale: 2 }),

  // Part exchange details
  part_exchange_registration: text("part_exchange_registration"),
  part_exchange_mileage: text("part_exchange_mileage"),
  part_exchange_damage: text("part_exchange_damage"),
  part_exchange_colour: text("part_exchange_colour"),

  // Finance preferences
  finance_preference_type: text("finance_preference_type"), // HP, PCP, Cash, Combination

  // Lead source and pipeline
  lead_source: text("lead_source").notNull(), // AutoTrader, Facebook Marketplace, Website, Walk-in, Referral, Phone Inquiry
  pipeline_stage: text("pipeline_stage").notNull().default("new"), // new, contacted, qualified, test_drive_booked, test_drive_completed, negotiating, deposit_taken, finance_pending, converted, lost
  lead_quality: text("lead_quality").default("unqualified"), // unqualified, cold, warm, hot
  priority: text("priority").default("medium"), // low, medium, high, urgent

  // Assignment and tracking
  assigned_salesperson_id: integer("assigned_salesperson_id").references(() => users.id),
  converted_customer_id: integer("converted_customer_id").references(() => customers.id),
  lost_reason: text("lost_reason"), // price, financing, vehicle_not_suitable, bought_elsewhere, not_ready, no_response

  // Interaction tracking
  last_contact_date: timestamp("last_contact_date"),
  next_follow_up_date: timestamp("next_follow_up_date"),
  contact_attempts: integer("contact_attempts").default(0),

  // Additional information
  notes: text("notes"),
  internal_notes: text("internal_notes"), // Staff-only notes
  marketing_consent: boolean("marketing_consent").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
 },
 table => [
  // Sales pipeline performance indexes
  index("idx_leads_pipeline_stage").on(table.pipeline_stage),
  index("idx_leads_lead_quality").on(table.lead_quality),
  index("idx_leads_priority").on(table.priority),
  index("idx_leads_lead_source").on(table.lead_source),
  index("idx_leads_assigned_salesperson").on(table.assigned_salesperson_id),
  index("idx_leads_created_at").on(table.createdAt),
  index("idx_leads_updated_at").on(table.updatedAt),

  // Contact and follow-up indexes
  index("idx_leads_email").on(table.email),
  index("idx_leads_primary_phone").on(table.primary_phone),
  index("idx_leads_last_contact").on(table.last_contact_date),
  index("idx_leads_next_followup").on(table.next_follow_up_date),
  index("idx_leads_contact_attempts").on(table.contact_attempts),

  // Vehicle and budget indexes
  index("idx_leads_assigned_vehicle").on(table.assigned_vehicle_id),
  index("idx_leads_budget_min").on(table.budget_min),
  index("idx_leads_budget_max").on(table.budget_max),
  index("idx_leads_vehicle_interests").on(table.vehicle_interests),
  index("idx_leads_finance_required").on(table.finance_required),

  // Composite indexes for common queries
  index("idx_leads_stage_salesperson").on(table.pipeline_stage, table.assigned_salesperson_id),
  index("idx_leads_quality_priority").on(table.lead_quality, table.priority),
  index("idx_leads_source_stage").on(table.lead_source, table.pipeline_stage),
  index("idx_leads_followup_stage").on(table.next_follow_up_date, table.pipeline_stage),

  // Conversion tracking
  index("idx_leads_converted_customer").on(table.converted_customer_id),
  index("idx_leads_lost_reason").on(table.lost_reason),
 ],
);

// Appointments table - Enhanced for customer-based booking
export const appointments = pgTable(
 "appointments",
 {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id),
  lead_id: integer("lead_id").references(() => leads.id),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id),
  assigned_to_id: integer("assigned_to_id")
   .notNull()
   .references(() => users.id),
  appointment_date: timestamp("appointment_date").notNull(),
  appointment_time: text("appointment_time").notNull(), // HH:MM format
  appointment_type: text("appointment_type").notNull(), // viewing, collection, drop_off, other
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled, no_show
  customer_name: text("customer_name"), // Manual entry option when not selecting from leads
  customer_phone: text("customer_phone"), // Manual entry option
  customer_email: text("customer_email"), // Manual entry option
  notes: text("notes"),
  duration_minutes: integer("duration_minutes").default(60), // Default 1 hour appointment
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  // Appointment scheduling indexes
  index("idx_appointments_date").on(table.appointment_date),
  index("idx_appointments_assigned_to").on(table.assigned_to_id),
  index("idx_appointments_status").on(table.status),
  index("idx_appointments_type").on(table.appointment_type),
  index("idx_appointments_created_at").on(table.created_at),

  // Customer and lead relationship indexes
  index("idx_appointments_customer_id").on(table.customer_id),
  index("idx_appointments_lead_id").on(table.lead_id),
  index("idx_appointments_vehicle_id").on(table.vehicle_id),

  // Composite indexes for calendar views
  index("idx_appointments_date_status").on(table.appointment_date, table.status),
  index("idx_appointments_date_assigned").on(table.appointment_date, table.assigned_to_id),
  index("idx_appointments_status_type").on(table.status, table.appointment_type),
 ],
);

// Tasks table
export const tasks = pgTable("tasks", {
 id: serial("id").primaryKey(),
 title: text("title").notNull(),
 description: text("description"),
 assignedToId: integer("assigned_to_id")
  .notNull()
  .references(() => users.id),
 createdById: integer("created_by_id")
  .notNull()
  .references(() => users.id),
 dueDate: timestamp("due_date"),
 priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
 status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
 createdAt: timestamp("created_at").defaultNow(),
 updatedAt: timestamp("updated_at").defaultNow(),
});

// Interactions table - CRM interaction tracking
export const interactions = pgTable(
 "interactions",
 {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id),
  customer_id: integer("customer_id").references(() => customers.id),
  vehicle_id: integer("vehicle_id").references(() => vehicles.id),
  user_id: integer("user_id")
   .notNull()
   .references(() => users.id), // Staff member who logged the interaction
  interaction_type: text("interaction_type").notNull(), // phone_call, email, sms, in_person, test_drive, viewing, follow_up, quote_sent, finance_discussion, objection_handling, closing_attempt
  interaction_direction: text("interaction_direction").notNull(), // inbound, outbound
  interaction_outcome: text("interaction_outcome"), // positive, neutral, negative, no_answer, callback_requested, appointment_scheduled, sale_progressed, lost_lead
  interaction_subject: text("interaction_subject"), // Brief subject line
  interaction_notes: text("interaction_notes").notNull(), // Detailed notes about the interaction
  follow_up_required: boolean("follow_up_required").default(false),
  follow_up_date: timestamp("follow_up_date"),
  follow_up_priority: text("follow_up_priority").default("medium"), // low, medium, high, urgent
  follow_up_notes: text("follow_up_notes"),
  duration_minutes: integer("duration_minutes"), // For calls/meetings
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  // CRM interaction tracking indexes
  index("idx_interactions_lead_id").on(table.lead_id),
  index("idx_interactions_customer_id").on(table.customer_id),
  index("idx_interactions_vehicle_id").on(table.vehicle_id),
  index("idx_interactions_user_id").on(table.user_id),
  index("idx_interactions_created_at").on(table.created_at),

  // Interaction type and outcome indexes
  index("idx_interactions_type").on(table.interaction_type),
  index("idx_interactions_direction").on(table.interaction_direction),
  index("idx_interactions_outcome").on(table.interaction_outcome),

  // Follow-up management indexes
  index("idx_interactions_followup_required").on(table.follow_up_required),
  index("idx_interactions_followup_date").on(table.follow_up_date),
  index("idx_interactions_followup_priority").on(table.follow_up_priority),

  // Composite indexes for CRM analytics
  index("idx_interactions_lead_type").on(table.lead_id, table.interaction_type),
  index("idx_interactions_customer_type").on(table.customer_id, table.interaction_type),
  index("idx_interactions_type_outcome").on(table.interaction_type, table.interaction_outcome),
  index("idx_interactions_user_date").on(table.user_id, table.created_at),
 ],
);

// Jobs table - Comprehensive logistics job management
export const jobs = pgTable(
 "jobs",
 {
  id: serial("id").primaryKey(),
  job_number: text("job_number").notNull().unique(), // Auto-generated job reference
  job_type: text("job_type").notNull(), // delivery, collection, valuation, inspection, repair, service, mot, preparation, photography, transport
  job_category: text("job_category").notNull(), // logistics, workshop, admin, external
  job_priority: text("job_priority").notNull().default("medium"), // low, medium, high, urgent, critical
  job_status: text("job_status").notNull().default("pending"), // pending, assigned, in_progress, on_hold, completed, cancelled, failed

  // Vehicle and customer assignment
  vehicle_id: integer("vehicle_id").references(() => vehicles.id),
  customer_id: integer("customer_id").references(() => customers.id),
  lead_id: integer("lead_id").references(() => leads.id),

  // Staff assignment and scheduling
  assigned_to_id: integer("assigned_to_id").references(() => users.id),
  created_by_id: integer("created_by_id")
   .notNull()
   .references(() => users.id),
  supervisor_id: integer("supervisor_id").references(() => users.id),

  // Scheduling and timing
  scheduled_date: timestamp("scheduled_date"),
  actual_start_date: timestamp("actual_start_date"),
  actual_end_date: timestamp("actual_end_date"),
  estimated_duration_hours: decimal("estimated_duration_hours", {
   precision: 5,
   scale: 2,
  }),
  actual_duration_hours: decimal("actual_duration_hours", {
   precision: 5,
   scale: 2,
  }),

  // Location and logistics (UK standard address structure)
  address_line_1: text("address_line_1"),
  address_line_2: text("address_line_2"),
  city: text("city"),
  county: text("county"),
  postcode: text("postcode"),
  contact_name: text("contact_name"),
  contact_phone: text("contact_phone"),

  // Job details and notes
  notes: text("notes"),
  equipment_required: text("equipment_required").array(), // tools, keys, documents, etc.
  skills_required: text("skills_required").array(), // driving_license, forklift, mechanic, etc.

  // Financial tracking
  estimated_cost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actual_cost: decimal("actual_cost", { precision: 10, scale: 2 }),
  hourly_rate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  material_costs: decimal("material_costs", { precision: 10, scale: 2 }),
  external_costs: decimal("external_costs", { precision: 10, scale: 2 }),
  total_cost: decimal("total_cost", { precision: 10, scale: 2 }),

  // Quality and completion tracking
  quality_check_required: boolean("quality_check_required").default(false),
  quality_check_completed: boolean("quality_check_completed").default(false),
  quality_check_by_id: integer("quality_check_by_id").references(() => users.id),
  quality_rating: integer("quality_rating"), // 1-5 scale
  customer_satisfaction_rating: integer("customer_satisfaction_rating"), // 1-5 scale

  // Documentation and notes
  completion_notes: text("completion_notes"),
  issues_encountered: text("issues_encountered"),
  photos_taken: text("photos_taken").array(), // Photo URLs or references
  documents_generated: text("documents_generated").array(), // Document references

  // Integration fields
  parent_job_id: integer("parent_job_id"), // For sub-jobs - self-reference added after table creation
  recurring_job_id: integer("recurring_job_id"), // For recurring job templates
  external_reference: text("external_reference"), // Third-party system reference

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  // Job management core indexes
  index("idx_jobs_job_number").on(table.job_number),
  index("idx_jobs_job_type").on(table.job_type),
  index("idx_jobs_job_category").on(table.job_category),
  index("idx_jobs_job_priority").on(table.job_priority),
  index("idx_jobs_job_status").on(table.job_status),
  index("idx_jobs_created_at").on(table.created_at),
  index("idx_jobs_updated_at").on(table.updated_at),

  // Assignment and scheduling indexes
  index("idx_jobs_vehicle_id").on(table.vehicle_id),
  index("idx_jobs_customer_id").on(table.customer_id),
  index("idx_jobs_lead_id").on(table.lead_id),
  index("idx_jobs_assigned_to").on(table.assigned_to_id),
  index("idx_jobs_created_by").on(table.created_by_id),
  index("idx_jobs_supervisor").on(table.supervisor_id),
  index("idx_jobs_scheduled_date").on(table.scheduled_date),
  index("idx_jobs_actual_start_date").on(table.actual_start_date),
  index("idx_jobs_actual_end_date").on(table.actual_end_date),

  // Location and logistics indexes
  index("idx_jobs_postcode").on(table.postcode),
  index("idx_jobs_city").on(table.city),
  index("idx_jobs_county").on(table.county),

  // Composite indexes for common queries
  index("idx_jobs_status_priority").on(table.job_status, table.job_priority),
  index("idx_jobs_status_assigned").on(table.job_status, table.assigned_to_id),
  index("idx_jobs_type_status").on(table.job_type, table.job_status),
  index("idx_jobs_scheduled_status").on(table.scheduled_date, table.job_status),
  index("idx_jobs_assigned_scheduled").on(table.assigned_to_id, table.scheduled_date),

  // Quality and completion indexes
  index("idx_jobs_quality_check_required").on(table.quality_check_required),
  index("idx_jobs_quality_check_completed").on(table.quality_check_completed),
  index("idx_jobs_quality_rating").on(table.quality_rating),
  index("idx_jobs_customer_satisfaction").on(table.customer_satisfaction_rating),

  // Financial tracking
  index("idx_jobs_estimated_cost").on(table.estimated_cost),
  index("idx_jobs_actual_cost").on(table.actual_cost),
  index("idx_jobs_total_cost").on(table.total_cost),
 ],
);

// Staff Schedules table - Employee scheduling and availability
export const staff_schedules = pgTable("staff_schedules", {
 id: serial("id").primaryKey(),
 user_id: integer("user_id")
  .notNull()
  .references(() => users.id),
 schedule_date: timestamp("schedule_date").notNull(),
 schedule_type: text("schedule_type").notNull(), // regular_shift, overtime, holiday, sick_leave, training, meeting
 shift_start_time: text("shift_start_time"), // HH:MM format
 shift_end_time: text("shift_end_time"), // HH:MM format
 break_duration_minutes: integer("break_duration_minutes").default(60),
 location: text("location"), // office, workshop, field, customer_site, home
 availability_status: text("availability_status").notNull().default("available"), // available, busy, unavailable, on_job, on_break
 notes: text("notes"),
 is_recurring: boolean("is_recurring").default(false),
 recurring_pattern: text("recurring_pattern"), // daily, weekly, monthly
 recurring_end_date: timestamp("recurring_end_date"),
 created_by_id: integer("created_by_id")
  .notNull()
  .references(() => users.id),
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// Job Progress table - Detailed job progress tracking
export const job_progress = pgTable("job_progress", {
 id: serial("id").primaryKey(),
 job_id: integer("job_id")
  .notNull()
  .references(() => jobs.id),
 progress_stage: text("progress_stage").notNull(), // started, in_transit, arrived, working, paused, quality_check, completed
 stage_status: text("stage_status").notNull(), // pending, in_progress, completed, failed, skipped
 user_id: integer("user_id")
  .notNull()
  .references(() => users.id),
 stage_start_time: timestamp("stage_start_time").defaultNow(),
 stage_end_time: timestamp("stage_end_time"),
 duration_minutes: integer("duration_minutes"),
 location_latitude: decimal("location_latitude", { precision: 10, scale: 8 }),
 location_longitude: decimal("location_longitude", {
  precision: 11,
  scale: 8,
 }),
 progress_notes: text("progress_notes"),
 issues_encountered: text("issues_encountered"),
 photos_uploaded: text("photos_uploaded").array(),
 signature_required: boolean("signature_required").default(false),
 signature_captured: boolean("signature_captured").default(false),
 signature_name: text("signature_name"),
 signature_data: text("signature_data"), // Base64 encoded signature
 next_stage: text("next_stage"),
 created_at: timestamp("created_at").defaultNow(),
});

// Vehicle Logistics table - Vehicle-specific logistics tracking
export const vehicle_logistics = pgTable("vehicle_logistics", {
 id: serial("id").primaryKey(),
 vehicle_id: integer("vehicle_id")
  .notNull()
  .references(() => vehicles.id),
 logistics_status: text("logistics_status").notNull().default("pending"), // pending, scheduled, in_transit, delivered, collected, storage
 current_location: text("current_location"),
 current_location_address: text("current_location_address"),
 destination_location: text("destination_location"),
 destination_address: text("destination_address"),
 transport_method: text("transport_method"), // driven, transported, collected, delivered
 transport_company: text("transport_company"),
 transport_reference: text("transport_reference"),
 driver_name: text("driver_name"),
 driver_phone: text("driver_phone"),
 keys_location: text("keys_location"),
 fuel_level: text("fuel_level"), // empty, quarter, half, three_quarter, full
 condition_on_arrival: text("condition_on_arrival"),
 condition_on_departure: text("condition_on_departure"),
 mileage_on_arrival: integer("mileage_on_arrival"),
 mileage_on_departure: integer("mileage_on_departure"),
 service_book_present: boolean("service_book_present").default(false),
 spare_keys_count: integer("spare_keys_count").default(0),
 v5_document_present: boolean("v5_document_present").default(false),
 mot_certificate_present: boolean("mot_certificate_present").default(false),
 insurance_documents_present: boolean("insurance_documents_present").default(false),
 logistics_notes: text("logistics_notes"),
 photos_on_arrival: text("photos_on_arrival").array(),
 photos_on_departure: text("photos_on_departure").array(),
 assigned_to_id: integer("assigned_to_id").references(() => users.id),
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// Job Templates table - Recurring job templates and workflows
export const job_templates = pgTable("job_templates", {
 id: serial("id").primaryKey(),
 template_name: text("template_name").notNull(),
 template_category: text("template_category").notNull(), // delivery, collection, preparation, service, inspection
 job_type: text("job_type").notNull(),
 estimated_duration_hours: decimal("estimated_duration_hours", {
  precision: 5,
  scale: 2,
 }),
 default_priority: text("default_priority").default("medium"),
 required_skills: text("required_skills").array(),
 required_equipment: text("required_equipment").array(),
 checklist_items: jsonb("checklist_items"), // Structured checklist for job completion
 instructions: text("instructions"),
 quality_checks: jsonb("quality_checks"),
 is_active: boolean("is_active").default(true),
 created_by_id: integer("created_by_id")
  .notNull()
  .references(() => users.id),
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// Bought Vehicles table - Separate from main vehicles for monitoring purposes
export const bought_vehicles = pgTable("bought_vehicles", {
 id: serial("id").primaryKey(),
 stock_number: text("stock_number").notNull(),
 make: text("make").notNull(),
 model: text("model").notNull(),
 derivative: text("derivative"),
 colour: text("colour"),
 mileage: integer("mileage"),
 year: integer("year"),
 registration: text("registration"),
 location: text("location"),
 due_in: timestamp("due_in"),
 retail_price_1: decimal("retail_price_1", { precision: 10, scale: 2 }),
 retail_price_2: decimal("retail_price_2", { precision: 10, scale: 2 }),
 things_to_do: text("things_to_do"),
 vehicle_images: text("vehicle_images").array(),
 status: text("status").default("AWAITING"), // AWAITING, ARRIVED, PROCESSED
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// Purchase Invoice Documents table - PDF document management for purchase invoices
export const purchase_invoices = pgTable("purchase_invoices", {
 id: serial("id").primaryKey(),
 buyer_name: text("buyer_name").notNull(),
 description: text("description"),
 registration: text("registration"),
 purchase_date: timestamp("purchase_date"),
 make: text("make"),
 model: text("model"),
 seller_type: text("seller_type"), // private, dealer, trade, auction, lease_return
 estimated_collection_date: timestamp("estimated_collection_date"),
 outstanding_finance: boolean("outstanding_finance").default(false),
 part_exchange: boolean("part_exchange").default(false),
 document_filename: text("document_filename").notNull(),
 document_path: text("document_path").notNull(),
 document_size: integer("document_size"), // File size in bytes
 document_type: text("document_type").notNull(), // pdf, doc, docx, xls, xlsx, jpg, png, etc.
 upload_date: timestamp("upload_date").defaultNow(),
 tags: text("tags").array(), // For searchability and organization
 status: text("status").default("active"), // active, archived, deleted
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// Sales Invoice Documents table - PDF document management for sales invoices
export const sales_invoices = pgTable("sales_invoices", {
 id: serial("id").primaryKey(),
 seller_name: text("seller_name").notNull(),
 registration: text("registration"),
 date_of_sale: timestamp("date_of_sale"),
 delivery_collection: text("delivery_collection"), // delivery, collection
 make: text("make"),
 model: text("model"),
 customer_name: text("customer_name").notNull(),
 notes: text("notes"),
 paid_in_full: boolean("paid_in_full").default(false),
 finance: boolean("finance").default(false),
 part_exchange: boolean("part_exchange").default(false),
 documents_to_sign: boolean("documents_to_sign").default(false),
 document_filename: text("document_filename").notNull(),
 document_path: text("document_path").notNull(),
 document_size: integer("document_size"), // File size in bytes
 document_type: text("document_type").notNull(), // pdf, doc, docx, xls, xlsx, jpg, png, etc.
 upload_date: timestamp("upload_date").defaultNow(),
 tags: text("tags").array(), // For searchability and organization
 status: text("status").default("active"), // active, archived, deleted
 created_at: timestamp("created_at").defaultNow(),
 updated_at: timestamp("updated_at").defaultNow(),
});

// Customer Purchases table - Track customer purchase history
export const customer_purchases = pgTable(
 "customer_purchases",
 {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id")
   .notNull()
   .references(() => customers.id, { onDelete: "cascade" }),
  vehicle_id: integer("vehicle_id")
   .notNull()
   .references(() => vehicles.id),
  salesperson_id: integer("salesperson_id").references(() => users.id),
  purchase_date: timestamp("purchase_date").notNull(),
  purchase_price: decimal("purchase_price", {
   precision: 10,
   scale: 2,
  }).notNull(),
  finance_amount: decimal("finance_amount", { precision: 10, scale: 2 }),
  deposit_amount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  trade_in_value: decimal("trade_in_value", { precision: 10, scale: 2 }),
  finance_provider: text("finance_provider"),
  finance_type: text("finance_type"), // HP, PCP, Personal Loan, Cash
  payment_method: text("payment_method"), // Cash, Finance, Part Exchange, Combination
  warranty_included: boolean("warranty_included").default(false),
  warranty_provider: text("warranty_provider"),
  warranty_duration: integer("warranty_duration"), // months
  delivery_method: text("delivery_method"), // Collection, Delivery
  delivery_address: text("delivery_address"),
  delivery_date: timestamp("delivery_date"),
  status: text("status").default("completed"), // pending, completed, cancelled
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_customer_purchases_customer_id").on(table.customer_id),
  index("idx_customer_purchases_vehicle_id").on(table.vehicle_id),
  index("idx_customer_purchases_purchase_date").on(table.purchase_date),
  index("idx_customer_purchases_salesperson_id").on(table.salesperson_id),
  index("idx_customer_purchases_status").on(table.status),
 ],
);

// Relations
export const vehicleMakesRelations = relations(vehicleMakes, ({ many }) => ({
 models: many(vehicleModels),
 vehicles: many(vehicles),
}));

export const vehicleModelsRelations = relations(vehicleModels, ({ one, many }) => ({
 make: one(vehicleMakes, {
  fields: [vehicleModels.makeId],
  references: [vehicleMakes.id],
 }),
 vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
 sales: many(sales),
 purchases: many(purchases),
 leads: many(leads),
 jobs: many(jobs),
 vehicleLogistics: many(vehicle_logistics),
 customer_purchases: many(customer_purchases),
}));

export const customersRelations = relations(customers, ({ many }) => ({
 sales: many(sales),
 appointments: many(appointments),
 customer_purchases: many(customer_purchases),
}));

export const usersRelations = relations(users, ({ many }) => ({
 sales: many(sales),
 assignedLeads: many(leads),
 assignedAppointments: many(appointments),
 assignedTasks: many(tasks),
 createdTasks: many(tasks, { relationName: "created_tasks" }),
 assignedJobs: many(jobs),
 createdJobs: many(jobs, { relationName: "created_jobs" }),
 supervisedJobs: many(jobs, { relationName: "supervised_jobs" }),
 staffSchedules: many(staff_schedules),
 jobProgress: many(job_progress),
 vehicleLogistics: many(vehicle_logistics),
 jobTemplates: many(job_templates),
}));

export const salesRelations = relations(sales, ({ one }) => ({
 vehicle: one(vehicles, {
  fields: [sales.vehicleId],
  references: [vehicles.id],
 }),
 customer: one(customers, {
  fields: [sales.customerId],
  references: [customers.id],
 }),
 salesperson: one(users, {
  fields: [sales.salespersonId],
  references: [users.id],
 }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
 vehicle: one(vehicles, {
  fields: [purchases.vehicleId],
  references: [vehicles.id],
 }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
 assignedVehicle: one(vehicles, {
  fields: [leads.assigned_vehicle_id],
  references: [vehicles.id],
 }),
 assignedSalesperson: one(users, {
  fields: [leads.assigned_salesperson_id],
  references: [users.id],
 }),
 convertedCustomer: one(customers, {
  fields: [leads.converted_customer_id],
  references: [customers.id],
 }),
 appointments: many(appointments),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
 customer: one(customers, {
  fields: [appointments.customer_id],
  references: [customers.id],
 }),
 lead: one(leads, {
  fields: [appointments.lead_id],
  references: [leads.id],
 }),
 vehicle: one(vehicles, {
  fields: [appointments.vehicle_id],
  references: [vehicles.id],
 }),
 assignedTo: one(users, {
  fields: [appointments.assigned_to_id],
  references: [users.id],
 }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
 assignedTo: one(users, {
  fields: [tasks.assignedToId],
  references: [users.id],
 }),
 createdBy: one(users, {
  fields: [tasks.createdById],
  references: [users.id],
  relationName: "created_tasks",
 }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
 lead: one(leads, {
  fields: [interactions.lead_id],
  references: [leads.id],
 }),
 customer: one(customers, {
  fields: [interactions.customer_id],
  references: [customers.id],
 }),
 vehicle: one(vehicles, {
  fields: [interactions.vehicle_id],
  references: [vehicles.id],
 }),
 user: one(users, {
  fields: [interactions.user_id],
  references: [users.id],
 }),
}));

// Jobs Relations
export const jobsRelations = relations(jobs, ({ one, many }): any => ({
 vehicle: one(vehicles, {
  fields: [jobs.vehicle_id],
  references: [vehicles.id],
 }),
 customer: one(customers, {
  fields: [jobs.customer_id],
  references: [customers.id],
 }),
 lead: one(leads, {
  fields: [jobs.lead_id],
  references: [leads.id],
 }),
 assignedTo: one(users, {
  fields: [jobs.assigned_to_id],
  references: [users.id],
 }),
 createdBy: one(users, {
  fields: [jobs.created_by_id],
  references: [users.id],
  relationName: "created_jobs",
 }),
 supervisor: one(users, {
  fields: [jobs.supervisor_id],
  references: [users.id],
  relationName: "supervised_jobs",
 }),
 parentJob: one(jobs, {
  fields: [jobs.parent_job_id],
  references: [jobs.id],
 }),
 subJobs: many(jobs),
 jobProgress: many(job_progress),
 qualityCheckBy: one(users, {
  fields: [jobs.quality_check_by_id],
  references: [users.id],
 }),
}));

// Staff Schedules Relations
export const staffSchedulesRelations = relations(staff_schedules, ({ one }) => ({
 user: one(users, {
  fields: [staff_schedules.user_id],
  references: [users.id],
 }),
 createdBy: one(users, {
  fields: [staff_schedules.created_by_id],
  references: [users.id],
 }),
}));

// Job Progress Relations
export const jobProgressRelations = relations(job_progress, ({ one }) => ({
 job: one(jobs, {
  fields: [job_progress.job_id],
  references: [jobs.id],
 }),
 user: one(users, {
  fields: [job_progress.user_id],
  references: [users.id],
 }),
}));

// Vehicle Logistics Relations
export const vehicleLogisticsRelations = relations(vehicle_logistics, ({ one }) => ({
 vehicle: one(vehicles, {
  fields: [vehicle_logistics.vehicle_id],
  references: [vehicles.id],
 }),
 assignedTo: one(users, {
  fields: [vehicle_logistics.assigned_to_id],
  references: [users.id],
 }),
}));

// Job Templates Relations
export const jobTemplatesRelations = relations(job_templates, ({ one }) => ({
 createdBy: one(users, {
  fields: [job_templates.created_by_id],
  references: [users.id],
 }),
}));

// Customer Purchases Relations
export const customerPurchasesRelations = relations(customer_purchases, ({ one }) => ({
 customer: one(customers, {
  fields: [customer_purchases.customer_id],
  references: [customers.id],
 }),
 vehicle: one(vehicles, {
  fields: [customer_purchases.vehicle_id],
  references: [vehicles.id],
 }),
 salesperson: one(users, {
  fields: [customer_purchases.salesperson_id],
  references: [users.id],
 }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
 id: true,
 created_at: true,
 updated_at: true,
 last_login: true,
});
export const insertPageDefinitionSchema = createInsertSchema(page_definitions).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertUserPermissionSchema = createInsertSchema(user_permissions).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertVehicleMakeSchema = createInsertSchema(vehicleMakes).omit({
 id: true,
 createdAt: true,
});
export const insertVehicleModelSchema = createInsertSchema(vehicleModels).omit({
 id: true,
 createdAt: true,
});
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
 id: true,
 createdAt: true,
 updatedAt: true,
});
export const insertCustomerSchema = createInsertSchema(customers).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertSaleSchema = createInsertSchema(sales).omit({
 id: true,
 createdAt: true,
});
export const insertPurchaseSchema = createInsertSchema(purchases).omit({
 id: true,
 createdAt: true,
});
export const insertLeadSchema = createInsertSchema(leads).omit({
 id: true,
 createdAt: true,
 updatedAt: true,
});
export const insertAppointmentSchema = createInsertSchema(appointments)
 .omit({ id: true, created_at: true, updated_at: true })
 .extend({
  appointment_date: z.union([z.date(), z.string().transform(str => new Date(str))]),
 });
export const insertTaskSchema = createInsertSchema(tasks).omit({
 id: true,
 createdAt: true,
 updatedAt: true,
});
export const insertInteractionSchema = createInsertSchema(interactions).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertJobSchema = createInsertSchema(jobs).omit({
 id: true,
 created_at: true,
 updated_at: true,
 job_number: true,
});
export const insertStaffScheduleSchema = createInsertSchema(staff_schedules).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertJobProgressSchema = createInsertSchema(job_progress).omit({
 id: true,
 created_at: true,
});
export const insertVehicleLogisticsSchema = createInsertSchema(vehicle_logistics).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertJobTemplateSchema = createInsertSchema(job_templates).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertBoughtVehicleSchema = createInsertSchema(bought_vehicles)
 .omit({ id: true, created_at: true, updated_at: true })
 .extend({
  due_in: z
   .union([z.date(), z.string().transform(str => (str ? new Date(str) : undefined)), z.undefined()])
   .optional(),
 });
export const insertPurchaseInvoiceSchema = createInsertSchema(purchase_invoices)
 .omit({ id: true, created_at: true, updated_at: true, upload_date: true })
 .extend({
  purchase_date: z
   .union([z.date(), z.string().transform(str => (str ? new Date(str) : undefined)), z.undefined()])
   .optional(),
  estimated_collection_date: z
   .union([z.date(), z.string().transform(str => (str ? new Date(str) : undefined)), z.undefined()])
   .optional(),
 });
export const insertSalesInvoiceSchema = createInsertSchema(sales_invoices)
 .omit({ id: true, created_at: true, updated_at: true, upload_date: true })
 .extend({
  date_of_sale: z
   .union([
    z.date(),
    z.string().transform(str => (str && str.trim() !== "" ? new Date(str) : undefined)),
    z.undefined(),
   ])
   .optional(),
  registration: z.string().optional(),
  delivery_collection: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
  paid_in_full: z.boolean().default(false),
  finance: z.boolean().default(false),
  part_exchange: z.boolean().default(false),
  documents_to_sign: z.boolean().default(false),
 });
export const insertCustomerPurchaseSchema = createInsertSchema(customer_purchases)
 .omit({ id: true, created_at: true, updated_at: true })
 .extend({
  purchase_date: z.union([z.date(), z.string().transform(str => new Date(str))]),
  delivery_date: z
   .union([z.date(), z.string().transform(str => (str ? new Date(str) : undefined))])
   .optional(),
 });

// Types
export type User = typeof users.$inferSelect;
export type PageDefinition = typeof page_definitions.$inferSelect;
export type UserPermission = typeof user_permissions.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPageDefinition = z.infer<typeof insertPageDefinitionSchema>;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type VehicleMake = typeof vehicleMakes.$inferSelect;
export type InsertVehicleMake = z.infer<typeof insertVehicleMakeSchema>;
export type VehicleModel = typeof vehicleModels.$inferSelect;
export type InsertVehicleModel = z.infer<typeof insertVehicleModelSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type StaffSchedule = typeof staff_schedules.$inferSelect;
export type InsertStaffSchedule = z.infer<typeof insertStaffScheduleSchema>;
export type JobProgress = typeof job_progress.$inferSelect;
export type InsertJobProgress = z.infer<typeof insertJobProgressSchema>;
export type VehicleLogistics = typeof vehicle_logistics.$inferSelect;
export type InsertVehicleLogistics = z.infer<typeof insertVehicleLogisticsSchema>;
export type JobTemplate = typeof job_templates.$inferSelect;
export type InsertJobTemplate = z.infer<typeof insertJobTemplateSchema>;
export type BoughtVehicle = typeof bought_vehicles.$inferSelect;
export type InsertBoughtVehicle = z.infer<typeof insertBoughtVehicleSchema>;
export type PurchaseInvoice = typeof purchase_invoices.$inferSelect;
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type SalesInvoice = typeof sales_invoices.$inferSelect;
export type InsertSalesInvoice = z.infer<typeof insertSalesInvoiceSchema>;
export type CustomerPurchase = typeof customer_purchases.$inferSelect;
export type InsertCustomerPurchase = z.infer<typeof insertCustomerPurchaseSchema>;

export type InvoiceT = typeof invoices.$inferSelect;
export type InvoiceInsert = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoice_items.$inferSelect;
export type InvoiceItemInsert = typeof invoice_items.$inferInsert;

export type VehicleCondition = typeof vehicle_conditions.$inferSelect;
export type VehicleConditionInsert = typeof vehicle_conditions.$inferInsert;

// Simplified Push Subscriptions table - Web push notification subscriptions
export const push_subscriptions = pgTable(
 "push_subscriptions",
 {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
   .notNull()
   .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  keys_p256dh: text("keys_p256dh").notNull(),
  keys_auth: text("keys_auth").notNull(),
  user_agent: text("user_agent"),
  device_type: text("device_type"), // mobile, desktop, tablet
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_push_subscriptions_user_id").on(table.user_id),
  index("idx_push_subscriptions_endpoint").on(table.endpoint),
  index("idx_push_subscriptions_active").on(table.is_active),
 ],
);

// Device Registrations table - Mobile device registration for push notifications
export const device_registrations = pgTable(
 "device_registrations",
 {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
   .notNull()
   .references(() => users.id, { onDelete: "cascade" }),
  device_token: text("device_token").notNull().unique(),
  platform: text("platform").notNull(), // ios, android, web

  // Device information
  device_name: text("device_name"), // User-friendly device name
  device_model: text("device_model"), // iPhone 14 Pro, Samsung Galaxy S23, etc.
  device_os: text("device_os"), // iOS, Android, Chrome OS, etc.
  os_version: text("os_version"), // 16.4.1, 13.0, etc.
  app_version: text("app_version"), // App version that registered

  // Push notification settings
  push_enabled: boolean("push_enabled").notNull().default(true),
  badge_enabled: boolean("badge_enabled").notNull().default(true),
  sound_enabled: boolean("sound_enabled").notNull().default(true),

  // Location and preferences
  timezone: text("timezone"), // User's timezone
  language: text("language"), // Preferred language

  // Status tracking
  is_active: boolean("is_active").notNull().default(true),
  last_active: timestamp("last_active").defaultNow(),
  registration_source: text("registration_source"), // app, pwa, website

  // Metadata
  user_agent: text("user_agent"),
  ip_address: text("ip_address"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_device_registrations_user_id").on(table.user_id),
  index("idx_device_registrations_token").on(table.device_token),
  index("idx_device_registrations_platform").on(table.platform),
  index("idx_device_registrations_active").on(table.is_active),
  index("idx_device_registrations_user_active").on(table.user_id, table.is_active),
  index("idx_device_registrations_push_enabled").on(table.push_enabled),
  index("idx_device_registrations_last_active").on(table.last_active),
 ],
);

// Notification Templates table removed - Phase 1 simplification

// Notification Rules table - AI-parsed notification automation rules
export const notification_rules = pgTable(
 "notification_rules",
 {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
   .notNull()
   .references(() => users.id, { onDelete: "cascade" }),

  // Rule identification
  rule_name: text("rule_name").notNull(),
  original_prompt: text("original_prompt").notNull(),

  // Trigger configuration
  trigger_event: text("trigger_event").notNull(), // lead_created, vehicle_added, etc.
  condition_logic: text("condition_logic"), // Additional conditions

  // Notification configuration
  notification_template: text("notification_template").notNull(),
  priority_level: text("priority_level").notNull().default("medium"),
  target_recipients: text("target_recipients").array().notNull(),

  // AI metadata
  ai_confidence: real("ai_confidence").notNull().default(0.8),
  ai_parsed_at: timestamp("ai_parsed_at").defaultNow(),

  // Status
  is_active: boolean("is_active").notNull().default(true),
  last_triggered: timestamp("last_triggered"),
  trigger_count: integer("trigger_count").notNull().default(0),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_notification_rules_user_id").on(table.user_id),
  index("idx_notification_rules_trigger").on(table.trigger_event),
  index("idx_notification_rules_active").on(table.is_active),
  index("idx_notification_rules_user_active").on(table.user_id, table.is_active),
 ],
);

// Notifications table - All notification records
export const notifications = pgTable(
 "notifications",
 {
  id: serial("id").primaryKey(),
  recipient_user_id: integer("recipient_user_id")
   .notNull()
   .references(() => users.id, { onDelete: "cascade" }),
  notification_type: text("notification_type").notNull(), // lead, sale, inventory, task, system, appointment, financial
  priority_level: text("priority_level").notNull().default("medium"), // low, medium, high, urgent
  title: text("title").notNull(),
  body: text("body").notNull(),
  action_url: text("action_url"),

  // Context tracking
  related_entity_type: text("related_entity_type"), // vehicle, customer, lead, appointment, job, sale
  related_entity_id: integer("related_entity_id"),

  // Rule tracking
  rule_id: integer("rule_id").references(() => notification_rules.id, {
   onDelete: "set null",
  }),

  // Delivery tracking
  status: text("status").notNull().default("pending"), // pending, delivered, read, dismissed
  delivered_at: timestamp("delivered_at"),
  read_at: timestamp("read_at"),
  dismissed_at: timestamp("dismissed_at"),

  // Metadata
  action_data: json("action_data"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_notifications_recipient_user_id").on(table.recipient_user_id),
  index("idx_notifications_status").on(table.status),
  index("idx_notifications_priority").on(table.priority_level),
  index("idx_notifications_type").on(table.notification_type),
  index("idx_notifications_created_at").on(table.created_at),
  index("idx_notifications_entity").on(table.related_entity_type, table.related_entity_id),
  index("idx_notifications_rule_id").on(table.rule_id),
 ],
);

// Simplified User Notification Preferences
export const notification_preferences = pgTable(
 "notification_preferences",
 {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
   .notNull()
   .references(() => users.id, { onDelete: "cascade" }),

  // Global settings
  notifications_enabled: boolean("notifications_enabled").default(true),
  push_notifications_enabled: boolean("push_notifications_enabled").default(true),

  // Type preferences
  email_notifications_enabled: boolean("email_notifications_enabled").default(true),
  sms_notifications_enabled: boolean("sms_notifications_enabled").default(true),
  in_app_notifications_enabled: boolean("in_app_notifications_enabled").default(true),
  sales_notifications: boolean("sales_notifications").default(true),
  inventory_notifications: boolean("inventory_notifications").default(true),
  customer_notifications: boolean("customer_notifications").default(true),
  financial_notifications: boolean("financial_notifications").default(true),
  system_notifications: boolean("system_notifications").default(true),
  staff_notifications: boolean("staff_notifications").default(true),

  // Priority preferences
  critical_notifications: boolean("critical_notifications").default(true),
  urgent_notifications: boolean("urgent_notifications").default(true),
  high_notifications: boolean("high_notifications").default(true),
  medium_notifications: boolean("medium_notifications").default(true),
  low_notifications: boolean("low_notifications").default(false),

  // Delivery preferences
  sound_enabled: boolean("sound_enabled").default(true),
  vibration_enabled: boolean("vibration_enabled").default(true),
  quiet_hours_enabled: boolean("quiet_hours_enabled").default(false),
  quiet_hours_start: time("quiet_hours_start").default("22:00"),
  quiet_hours_end: time("quiet_hours_end").default("06:00"),
  quiet_hours_timezone: text("quiet_hours_timezone").default("UTC"),

  // Rate limiting
  immediate_delivery: boolean("immediate_delivery").default(true),
  batch_delivery_enabled: boolean("batch_delivery_enabled").default(false),
  batch_delivery_interval: integer("batch_delivery_interval").default(15),
  max_notifications_per_hour: integer("max_notifications_per_hour").default(20),

  // Custom settings
  custom_sound_url: text("custom_sound_url"),

  // Event-specific preferences (Phase 4.1)
  vehicle_updated_enabled: boolean("vehicle_updated_enabled").default(true),
  vehicle_added_enabled: boolean("vehicle_added_enabled").default(true),
  vehicle_sold_enabled: boolean("vehicle_sold_enabled").default(true),
  vehicle_bought_enabled: boolean("vehicle_bought_enabled").default(true),
  lead_created_enabled: boolean("lead_created_enabled").default(true),
  appointment_booked_enabled: boolean("appointment_booked_enabled").default(true),
  job_booked_enabled: boolean("job_booked_enabled").default(true),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_notification_preferences_user_id").on(table.user_id),
  index("idx_notification_preferences_enabled").on(table.notifications_enabled),
 ],
);

// Pin board messages table
export const pinned_messages = pgTable(
 "pinned_messages",
 {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author_id: integer("author_id")
   .references(() => users.id, { onDelete: "cascade" })
   .notNull(),
  is_public: boolean("is_public").notNull().default(true), // true = everyone can see, false = specific users only
  target_user_ids: integer("target_user_ids").array(), // Array of user IDs who can see this message (when is_public = false)
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  color_theme: text("color_theme").default("yellow"), // yellow, blue, green, red, purple for visual variety
  is_pinned: boolean("is_pinned").notNull().default(true), // Allow unpinning without deletion
  expires_at: timestamp("expires_at"), // Optional expiration date
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
 },
 table => [
  index("idx_pinned_messages_author").on(table.author_id),
  index("idx_pinned_messages_public").on(table.is_public),
  index("idx_pinned_messages_pinned").on(table.is_pinned),
  index("idx_pinned_messages_expires").on(table.expires_at),
  index("idx_pinned_messages_created").on(table.created_at),
  index("idx_pinned_messages_priority").on(table.priority),
 ],
);

// Notification Events and Analytics tables removed - Phase 1 simplification

// Simplified types for notification system
export type PushSubscription = typeof push_subscriptions.$inferSelect;
export type InsertPushSubscription = typeof push_subscriptions.$inferInsert;

export type DeviceRegistration = typeof device_registrations.$inferSelect;
export type InsertDeviceRegistration = typeof device_registrations.$inferInsert;

export type NotificationRule = typeof notification_rules.$inferSelect;
export type InsertNotificationRule = typeof notification_rules.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type NotificationPreference = typeof notification_preferences.$inferSelect;
export type InsertNotificationPreference = typeof notification_preferences.$inferInsert;

export type PinnedMessage = typeof pinned_messages.$inferSelect;
export type InsertPinnedMessage = typeof pinned_messages.$inferInsert;

export interface InvoiceApiData {
  id: number;
  invoice_no: string;
  tax_point: string | null;
  check_no: string | null;
  invoice_name_address: string | null;
  collection_address: string | null;
  issued_by: string | null;
  invoiced_by: string | null;
  inspection_image_url: string | null;
  make: string | null;
  model: string | null;
  chassis_no: string | null;
  registration: string | null;
  purchased_by: string | null;

  mot_end: string | Date | null;
  mileage: number | null;
  dor: string | null;
  colour: string | null;
  interior_colour: string | null;
  purchase_date: string | Date | null;
  collection_date: string | Date | null;

  bank_name: string | null;
  account_number: string | null;
  sort_code: string | null;
  ref: string | null;
  acc_name: string | null;
  sub_total: string | null;
  vat_at_20: string | null;
  total: string | null;
  deposit_paid: string | null;
  balance_due: string | null;
  description_of_goods: string | null;
  notes: string | null;

  upload_date: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
}


// Simplified insert schemas for notification system
export const insertPushSubscriptionSchema = createInsertSchema(push_subscriptions).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertDeviceRegistrationSchema = createInsertSchema(device_registrations).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertNotificationRuleSchema = createInsertSchema(notification_rules).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertNotificationPreferenceSchema = createInsertSchema(notification_preferences).omit({
 id: true,
 created_at: true,
 updated_at: true,
});
export const insertPinnedMessageSchema = createInsertSchema(pinned_messages).omit({
 id: true,
 created_at: true,
 updated_at: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  upload_date: true,
  created_at: true,
  updated_at: true
});

export const insertSalesSchemaV2 = createInsertSchema(sales_invoices_v2).omit({
  id: true,
  upload_date: true,
  created_at: true,
  updated_at: true
});

export const insertInvoiceItemSchema = createInsertSchema(invoice_items).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertVehicleConditionSchema = createInsertSchema(vehicle_conditions).omit({
  id: true,
  created_at: true,
  updated_at: true
});
