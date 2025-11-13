import { storage } from "../storage";
import { db } from "../db";
import { sql } from "drizzle-orm";

export interface ComprehensiveDealershipData {
 timestamp: string;
 system_status: {
  database_connected: boolean;
  total_records: number;
  data_freshness: string;
 };

 // Complete Vehicle Inventory
 vehicles: {
  all_vehicles: any[];
  stock_vehicles: any[];
  sold_vehicles: any[];
  autolab_vehicles: any[];
  awaiting_delivery: any[];
  by_status: Record<string, any[]>;
  by_make: Record<string, any[]>;
  by_location: Record<string, any[]>;
 };

 // Financial Data
 financial: {
  total_stock_value: number;
  total_sales_revenue: number;
  total_gross_profit: number;
  total_adjusted_profit: number;
  profit_margins: {
   gross_margin: number;
   adjusted_margin: number;
  };
  cash_flow: {
   inflow: number;
   outflow: number;
   net: number;
  };
  by_payment_method: Record<string, number>;
  monthly_breakdown: any[];
  quarterly_breakdown: any[];
  yearly_breakdown: any[];
 };

 // Sales & Performance
 sales: {
  all_sales: any[];
  recent_sales: any[];
  sales_by_salesperson: Record<string, any>;
  sales_by_make: Record<string, any>;
  sales_by_month: Record<string, any>;
  conversion_metrics: {
   lead_to_sale: number;
   average_days_to_sell: number;
   average_sale_price: number;
  };
  top_performers: any[];
 };

 // Customer & CRM
 customers: {
  all_customers: any[];
  active_customers: any[];
  customer_segments: Record<string, any[]>;
  lifetime_values: any[];
  purchase_history: any[];
  interaction_history: any[];
 };

 // Leads & Pipeline
 leads: {
  all_leads: any[];
  active_leads: any[];
  by_stage: Record<string, any[]>;
  by_source: Record<string, any[]>;
  by_salesperson: Record<string, any[]>;
  hot_leads: any[];
  follow_ups_due: any[];
  conversion_funnel: any;
 };

 // Operations
 operations: {
  jobs: {
   all_jobs: any[];
   active_jobs: any[];
   by_type: Record<string, any[]>;
   by_status: Record<string, any[]>;
   overdue: any[];
  };
  appointments: {
   all_appointments: any[];
   today: any[];
   upcoming: any[];
   by_type: Record<string, any[]>;
  };
  tasks: {
   all_tasks: any[];
   pending: any[];
   overdue: any[];
   by_assignee: Record<string, any[]>;
  };
 };

 // Service & Parts
 service: {
  service_history: any[];
  parts_inventory: any[];
  warranty_claims: any[];
  service_revenue: number;
  parts_revenue: number;
 };

 // Business Intelligence
 analytics: {
  kpis: {
   inventory_turnover: number;
   gross_roi: number;
   customer_acquisition_cost: number;
   lifetime_customer_value: number;
   sales_velocity: number;
  };
  trends: {
   sales_trend: string;
   inventory_trend: string;
   profit_trend: string;
   customer_trend: string;
  };
  forecasts: {
   next_month_sales: number;
   next_quarter_revenue: number;
   inventory_needs: any[];
  };
  alerts: {
   slow_moving_stock: any[];
   overdue_followups: any[];
   cash_flow_concerns: any[];
   inventory_gaps: any[];
  };
 };

 // Documents & Invoices
 documents: {
  purchase_invoices: any[];
  sales_invoices: any[];
  recent_uploads: any[];
 };

 // Staff & Permissions
 staff: {
  all_users: any[];
  active_users: any[];
  by_role: Record<string, any[]>;
  permissions: any[];
  schedules: any[];
 };
}

export class DealerGPTDataAccessService {
 private static instance: DealerGPTDataAccessService;

 public static getInstance(): DealerGPTDataAccessService {
  if (!DealerGPTDataAccessService.instance) {
   DealerGPTDataAccessService.instance = new DealerGPTDataAccessService();
  }
  return DealerGPTDataAccessService.instance;
 }

 /**
  * Fetch ALL dealership data with complete access
  */
 async fetchComprehensiveDealershipData(): Promise<ComprehensiveDealershipData> {
  console.log("[DealerGPT DataAccess] Starting comprehensive data collection...");
  const startTime = Date.now();

  try {
   // Get current date for monthly data
   const currentDate = new Date();
   const currentYear = currentDate.getFullYear();
   const currentMonth = currentDate.getMonth() + 1;

   // Generate list of months to fetch (last 12 months)
   const monthsToFetch = [];
   for (let i = 0; i < 12; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month <= 0) {
     month += 12;
     year -= 1;
    }
    monthsToFetch.push(`${year}-${String(month).padStart(2, "0")}`);
   }

   // Parallel data fetching for performance
   const [
    vehicles,
    customers,
    leads,
    sales,
    appointments,
    tasks,
    jobs,
    interactions,
    dashboardStats,
    stockAgeAnalytics,
    customerStats,
    leadStats,
    jobStats,
    boughtVehicles,
    purchaseInvoices,
    salesInvoices,
    users,
    // Business Intelligence Data
    financialAudit,
    vehiclePerformance,
    salesManagement,
    executiveDashboard,
    inventoryAnalytics,
    quarterlyOverview,
    // Monthly data for accurate counts
    ...monthlyDataResults
   ] = await Promise.all([
    storage.getVehicles(),
    storage.getCustomers(),
    storage.getLeads(),
    storage.getSales(),
    storage.getAppointments(),
    storage.getTasks(),
    storage.getJobs(),
    storage.getInteractions(),
    storage.getDashboardStats(),
    storage.getStockAgeAnalytics(),
    storage.getCustomerStats(),
    storage.getLeadStats(),
    storage.getJobStats(),
    storage.getBoughtVehicles(),
    storage.getPurchaseInvoices(),
    storage.getSalesInvoices(),
    storage.getUsers(),
    // Business Intelligence
    storage.getFinancialAudit(),
    storage.getVehiclePerformanceMetrics(),
    storage.getSalesManagementDashboard(),
    storage.getExecutiveDashboard(),
    storage.getInventoryAnalytics(),
    storage.getQuarterlyOverview(),
    // Fetch monthly data for each month
    ...monthsToFetch.map(month => storage.getMonthlyData(month)),
   ]);

   // Process monthly data into a proper structure
   const monthlyData = {};
   monthsToFetch.forEach((month, index) => {
    const data = monthlyDataResults[index];
    if (data && data.sales_summary) {
     monthlyData[month] = {
      count: data.sales_summary.total_units_sold,
      revenue: data.sales_summary.total_revenue,
      profit: data.sales_summary.gross_profit,
      net_profit: data.sales_summary.net_profit,
      profit_margin: data.sales_summary.profit_margin,
      avg_selling_price: data.sales_summary.avg_selling_price,
      vehicles: [], // We don't have individual vehicles in monthly data
     };
    }
   });

   // Process and organize vehicle data
   const vehiclesByStatus = this.groupBy(vehicles, "sales_status");
   const vehiclesByMake = this.groupBy(vehicles, "make");
   const vehiclesByLocation = this.groupBy(vehicles, "location");

   const stockVehicles = vehicles.filter(v => v.sales_status?.toLowerCase() === "stock");
   const soldVehicles = vehicles.filter(v => v.sales_status?.toLowerCase() === "sold");
   const autolabVehicles = vehicles.filter(v => v.sales_status?.toLowerCase() === "autolab");
   const awaitingDelivery = vehicles.filter(v => v.collection_status?.toLowerCase() === "awd");

   // Use Business Intelligence data for accurate financial metrics
   const totalStockValue = financialAudit?.cost_analysis?.total_purchase_cost || 0;
   const totalSalesRevenue = financialAudit?.revenue_analysis?.total_revenue || 0;
   const totalGrossProfit = financialAudit?.profitability_analysis?.gross_profit || 0;
   const totalAdjustedProfit = financialAudit?.profitability_analysis?.net_profit || 0;

   // Use Business Intelligence monthly data instead of grouping ourselves
   const salesByMonth = monthlyData;
   const salesBySalesperson = this.groupBy(soldVehicles, "salesperson");
   const salesByMake = this.groupBy(soldVehicles, "make");

   // Process leads and pipeline
   const leadsByStage = this.groupBy(leads, "pipeline_stage");
   const leadsBySource = this.groupBy(leads, "source");
   const leadsBySalesperson = this.groupBy(leads, "assigned_to");
   const hotLeads = leads.filter(l => l.lead_quality === "hot");
   const followUpsDue = leads.filter(l => l.follow_up_date && new Date(l.follow_up_date) <= new Date());

   // Process operations data
   const jobsByType = this.groupBy(jobs, "job_type");
   const jobsByStatus = this.groupBy(jobs, "status");
   const activeJobs = jobs.filter(j => ["pending", "assigned", "in_progress"].includes(j.status));
   const overdueJobs = jobs.filter(
    j => j.scheduled_date && new Date(j.scheduled_date) < new Date() && j.status !== "completed",
   );

   // Process appointments
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const todayAppointments = appointments.filter(a => {
    const apptDate = new Date(a.appointment_date);
    apptDate.setHours(0, 0, 0, 0);
    return apptDate.getTime() === today.getTime();
   });
   const upcomingAppointments = appointments.filter(a => new Date(a.appointment_date) > new Date());

   // Calculate KPIs
   const inventoryTurnover = soldVehicles.length / (stockVehicles.length || 1);
   const averageDaysToSell = this.calculateAverageDaysToSell(soldVehicles);
   const grossROI = (totalGrossProfit / (totalStockValue || 1)) * 100;

   // Compile comprehensive data
   const comprehensiveData: ComprehensiveDealershipData = {
    timestamp: new Date().toISOString(),
    system_status: {
     database_connected: true,
     total_records: vehicles.length + customers.length + leads.length + sales.length,
     data_freshness: "real-time",
    },

    vehicles: {
     all_vehicles: vehicles,
     stock_vehicles: stockVehicles,
     sold_vehicles: soldVehicles,
     autolab_vehicles: autolabVehicles,
     awaiting_delivery: awaitingDelivery,
     by_status: vehiclesByStatus,
     by_make: vehiclesByMake,
     by_location: vehiclesByLocation,
    },

    financial: {
     total_stock_value: totalStockValue,
     total_sales_revenue: totalSalesRevenue,
     total_gross_profit: totalGrossProfit,
     total_adjusted_profit: totalAdjustedProfit,
     profit_margins: {
      gross_margin: (totalGrossProfit / totalSalesRevenue) * 100 || 0,
      adjusted_margin: (totalAdjustedProfit / totalSalesRevenue) * 100 || 0,
     },
     cash_flow: financialAudit?.cash_flow_analysis || {
      cash_inflow: 0,
      cash_outflow: 0,
      net_cash_flow: 0,
     },
     by_payment_method: this.groupPaymentMethods(soldVehicles),
     monthly_breakdown: monthlyData,
     quarterly_breakdown: quarterlyOverview?.quarters || [],
     yearly_breakdown: this.generateYearlyBreakdown(monthlyData),
    },

    sales: {
     all_sales: sales,
     recent_sales: soldVehicles.slice(-20),
     sales_by_salesperson: salesBySalesperson,
     sales_by_make: salesByMake,
     sales_by_month: salesByMonth,
     conversion_metrics: {
      lead_to_sale: (soldVehicles.length / (leads.length || 1)) * 100,
      average_days_to_sell: averageDaysToSell,
      average_sale_price: totalSalesRevenue / (soldVehicles.length || 1),
     },
     top_performers: salesManagement?.team_performance || [],
    },

    customers: {
     all_customers: customers,
     active_customers: customers.filter(c => c.customer_type === "active"),
     customer_segments: this.groupBy(customers, "customer_type"),
     lifetime_values: this.calculateCustomerLifetimeValues(customers, soldVehicles),
     purchase_history: [], // Would need customer purchases data
     interaction_history: interactions,
    },

    leads: {
     all_leads: leads,
     active_leads: leads.filter(l => !["lost", "converted"].includes(l.pipeline_stage)),
     by_stage: leadsByStage,
     by_source: leadsBySource,
     by_salesperson: leadsBySalesperson,
     hot_leads: hotLeads,
     follow_ups_due: followUpsDue,
     conversion_funnel: leadStats,
    },

    operations: {
     jobs: {
      all_jobs: jobs,
      active_jobs: activeJobs,
      by_type: jobsByType,
      by_status: jobsByStatus,
      overdue: overdueJobs,
     },
     appointments: {
      all_appointments: appointments,
      today: todayAppointments,
      upcoming: upcomingAppointments,
      by_type: this.groupBy(appointments, "appointment_type"),
     },
     tasks: {
      all_tasks: tasks,
      pending: tasks.filter(t => t.status === "pending"),
      overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"),
      by_assignee: this.groupBy(tasks, "assigned_to"),
     },
    },

    service: {
     service_history: jobs.filter(j => ["service", "mot", "repair"].includes(j.job_type)),
     parts_inventory: [], // Would need parts data
     warranty_claims: soldVehicles.filter(v => v.warranty_costs > 0),
     service_revenue: jobs.filter(j => j.actual_cost).reduce((sum, j) => sum + j.actual_cost, 0),
     parts_revenue: soldVehicles.reduce((sum, v) => sum + parseFloat(v.parts_cost?.toString() || "0"), 0),
    },

    analytics: {
     kpis: {
      inventory_turnover: inventoryTurnover,
      gross_roi: grossROI,
      customer_acquisition_cost: 0, // Would need marketing spend data
      lifetime_customer_value: this.calculateAverageCustomerValue(customers, soldVehicles),
      sales_velocity: soldVehicles.length / 30, // Sales per day (last 30 days)
     },
     trends: {
      sales_trend: this.calculateTrend(salesByMonth),
      inventory_trend: stockVehicles.length > 50 ? "high" : "normal",
      profit_trend: this.calculateProfitTrend(soldVehicles),
      customer_trend: this.calculateCustomerTrend(customers),
     },
     forecasts: executiveDashboard?.forecasts || {
      next_month_sales: 0,
      next_quarter_revenue: 0,
      inventory_needs: [],
     },
     alerts: {
      slow_moving_stock: stockAgeAnalytics?.stockDetails?.filter(v => v.days_in_stock > 90) || [],
      overdue_followups: followUpsDue,
      cash_flow_concerns: [],
      inventory_gaps: vehiclePerformance?.inventory_gaps || [],
     },
    },

    documents: {
     purchase_invoices: purchaseInvoices || [],
     sales_invoices: salesInvoices || [],
     recent_uploads: [...(purchaseInvoices || []), ...(salesInvoices || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10),
    },

    staff: {
     all_users: users,
     active_users: users.filter(u => u.is_active !== false),
     by_role: this.groupBy(users, "role"),
     permissions: [], // Would need permissions data
     schedules: [], // Would need schedules data
    },
   };

   console.log(`[DealerGPT DataAccess] Data collection completed in ${Date.now() - startTime}ms`);
   return comprehensiveData;
  } catch (error) {
   console.error("[DealerGPT DataAccess] Error collecting comprehensive data:", error);
   throw error;
  }
 }

 /**
  * Helper method to group array by property
  */
 private groupBy<T>(array: T[], key: string): Record<string, T[]> {
  return array.reduce(
   (groups, item) => {
    const value = item[key] || "undefined";
    if (!groups[value]) {
     groups[value] = [];
    }
    groups[value].push(item);
    return groups;
   },
   {} as Record<string, T[]>,
  );
 }

 /**
  * Generate yearly breakdown from monthly data
  */
 private generateYearlyBreakdown(monthlyData: Record<string, any>): any[] {
  const yearlyData = {};

  Object.entries(monthlyData).forEach(([month, data]) => {
   const year = month.split("-")[0];
   if (!yearlyData[year]) {
    yearlyData[year] = {
     year,
     count: 0,
     revenue: 0,
     profit: 0,
    };
   }
   yearlyData[year].count += data.count || 0;
   yearlyData[year].revenue += data.revenue || 0;
   yearlyData[year].profit += data.profit || 0;
  });

  return Object.values(yearlyData).sort((a: any, b: any) => b.year - a.year);
 }

 /**
  * Group payment methods
  */
 private groupPaymentMethods(vehicles: any[]): Record<string, number> {
  const methods = {
   cash: 0,
   finance: 0,
   bank_transfer: 0,
   part_exchange: 0,
  };

  vehicles.forEach(v => {
   if (v.cash_payment > 0) methods.cash += parseFloat(v.cash_payment.toString());
   if (v.finance_payment > 0) methods.finance += parseFloat(v.finance_payment.toString());
   if (v.bank_payment > 0) methods.bank_transfer += parseFloat(v.bank_payment.toString());
   if (v.px_value > 0) methods.part_exchange += parseFloat(v.px_value.toString());
  });

  return methods;
 }

 /**
  * Calculate average days to sell
  */
 private calculateAverageDaysToSell(vehicles: any[]): number {
  const vehiclesWithBothDates = vehicles.filter(v => v.purchase_invoice_date && v.sale_date);

  if (vehiclesWithBothDates.length === 0) return 0;

  const totalDays = vehiclesWithBothDates.reduce((sum, v) => {
   const purchaseDate = new Date(v.purchase_invoice_date);
   const saleDate = new Date(v.sale_date);
   const days = Math.floor((saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
   return sum + days;
  }, 0);

  return Math.round(totalDays / vehiclesWithBothDates.length);
 }

 /**
  * Calculate customer lifetime values
  */
 private calculateCustomerLifetimeValues(customers: any[], vehicles: any[]): any[] {
  return customers
   .map(customer => {
    const customerPurchases = vehicles.filter(
     v =>
      v.customer_name?.toLowerCase().includes(customer.first_name?.toLowerCase()) ||
      v.customer_name?.toLowerCase().includes(customer.last_name?.toLowerCase()),
    );

    const totalSpent = customerPurchases.reduce(
     (sum, v) => sum + parseFloat(v.total_sale_price?.toString() || "0"),
     0,
    );

    return {
     customer_id: customer.id,
     customer_name: `${customer.first_name} ${customer.last_name}`,
     total_purchases: customerPurchases.length,
     total_spent: totalSpent,
     average_purchase: customerPurchases.length > 0 ? totalSpent / customerPurchases.length : 0,
     first_purchase: customerPurchases[0]?.sale_date,
     last_purchase: customerPurchases[customerPurchases.length - 1]?.sale_date,
    };
   })
   .sort((a, b) => b.total_spent - a.total_spent);
 }

 /**
  * Calculate average customer value
  */
 private calculateAverageCustomerValue(customers: any[], vehicles: any[]): number {
  const lifetimeValues = this.calculateCustomerLifetimeValues(customers, vehicles);
  const totalValue = lifetimeValues.reduce((sum, cv) => sum + cv.total_spent, 0);
  return lifetimeValues.length > 0 ? totalValue / lifetimeValues.length : 0;
 }

 /**
  * Calculate trend direction
  */
 private calculateTrend(monthlyData: Record<string, any>): string {
  const months = Object.keys(monthlyData).sort();
  if (months.length < 2) return "stable";

  const lastMonth = monthlyData[months[months.length - 1]];
  const previousMonth = monthlyData[months[months.length - 2]];

  const change = ((lastMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;

  if (change > 10) return "strong_growth";
  if (change > 0) return "growth";
  if (change > -10) return "stable";
  return "decline";
 }

 /**
  * Calculate profit trend
  */
 private calculateProfitTrend(vehicles: any[]): string {
  const recentVehicles = vehicles.slice(-20);
  const olderVehicles = vehicles.slice(-40, -20);

  if (recentVehicles.length === 0 || olderVehicles.length === 0) return "stable";

  const recentAvgProfit =
   recentVehicles.reduce((sum, v) => sum + parseFloat(v.total_gp?.toString() || "0"), 0) /
   recentVehicles.length;

  const olderAvgProfit =
   olderVehicles.reduce((sum, v) => sum + parseFloat(v.total_gp?.toString() || "0"), 0) /
   olderVehicles.length;

  const change = ((recentAvgProfit - olderAvgProfit) / olderAvgProfit) * 100;

  if (change > 10) return "improving";
  if (change > -10) return "stable";
  return "declining";
 }

 /**
  * Calculate customer trend
  */
 private calculateCustomerTrend(customers: any[]): string {
  const recentCustomers = customers.filter(c => {
   const createdDate = new Date(c.created_at);
   const thirtyDaysAgo = new Date();
   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
   return createdDate > thirtyDaysAgo;
  });

  const previousCustomers = customers.filter(c => {
   const createdDate = new Date(c.created_at);
   const sixtyDaysAgo = new Date();
   sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
   const thirtyDaysAgo = new Date();
   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
   return createdDate > sixtyDaysAgo && createdDate <= thirtyDaysAgo;
  });

  if (recentCustomers.length > previousCustomers.length * 1.2) return "growing";
  if (recentCustomers.length < previousCustomers.length * 0.8) return "declining";
  return "stable";
 }

 /**
  * Execute custom SQL queries for advanced analytics
  */
 async executeCustomQuery(query: string): Promise<any> {
  try {
   console.log("[DealerGPT DataAccess] Executing custom query...");
   const result = await db.execute(sql.raw(query));
   return result;
  } catch (error) {
   console.error("[DealerGPT DataAccess] Error executing custom query:", error);
   throw error;
  }
 }

 /**
  * Get specific data slice for focused queries
  */
 async getDataSlice(entity: string, filters?: any): Promise<any> {
  console.log(`[DealerGPT DataAccess] Fetching data slice for ${entity}...`);

  try {
   switch (entity.toLowerCase()) {
    case "vehicles":
     return filters ? await this.filterVehicles(filters) : await storage.getVehicles();

    case "customers":
     return filters ? await this.filterCustomers(filters) : await storage.getCustomers();

    case "leads":
     return filters ? await this.filterLeads(filters) : await storage.getLeads();

    case "sales":
     return filters ? await this.filterSales(filters) : await storage.getSales();

    case "financial":
     return await storage.getFinancialAudit();

    case "inventory":
     return await storage.getInventoryAnalytics();

    case "performance":
     return await storage.getVehiclePerformanceMetrics();

    default:
     throw new Error(`Unknown entity type: ${entity}`);
   }
  } catch (error) {
   console.error(`[DealerGPT DataAccess] Error fetching ${entity} data:`, error);
   throw error;
  }
 }

 /**
  * Filter vehicles based on criteria
  */
 private async filterVehicles(filters: any): Promise<any[]> {
  const vehicles = await storage.getVehicles();

  return vehicles.filter(v => {
   if (filters.status && v.sales_status?.toLowerCase() !== filters.status.toLowerCase()) return false;
   if (filters.make && v.make?.toLowerCase() !== filters.make.toLowerCase()) return false;
   if (filters.min_price && parseFloat(v.purchase_price_total?.toString() || "0") < filters.min_price)
    return false;
   if (filters.max_price && parseFloat(v.purchase_price_total?.toString() || "0") > filters.max_price)
    return false;
   if (filters.days_in_stock) {
    const days = this.calculateDaysInStock(v.purchase_invoice_date);
    if (days < filters.days_in_stock) return false;
   }
   return true;
  });
 }

 /**
  * Filter customers based on criteria
  */
 private async filterCustomers(filters: any): Promise<any[]> {
  const customers = await storage.getCustomers();

  return customers.filter(c => {
   if (filters.type && c.customer_type !== filters.type) return false;
   if (filters.city && c.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
   if (filters.active_only && c.customer_type !== "active") return false;
   return true;
  });
 }

 /**
  * Filter leads based on criteria
  */
 private async filterLeads(filters: any): Promise<any[]> {
  const leads = await storage.getLeads();

  return leads.filter(l => {
   if (filters.stage && l.pipeline_stage !== filters.stage) return false;
   if (filters.quality && l.lead_quality !== filters.quality) return false;
   if (filters.assigned_to && l.assigned_to !== filters.assigned_to) return false;
   if (filters.source && l.source !== filters.source) return false;
   return true;
  });
 }

 /**
  * Filter sales based on criteria
  */
 private async filterSales(filters: any): Promise<any[]> {
  const sales = await storage.getSales();

  return sales.filter(s => {
   if (filters.start_date && new Date(s.sale_date) < new Date(filters.start_date)) return false;
   if (filters.end_date && new Date(s.sale_date) > new Date(filters.end_date)) return false;
   if (filters.salesperson_id && s.salesperson_id !== filters.salesperson_id) return false;
   return true;
  });
 }

 /**
  * Calculate days in stock
  */
 private calculateDaysInStock(purchaseDate: string | Date): number {
  if (!purchaseDate) return 0;
  const purchase = new Date(purchaseDate);
  const today = new Date();
  return Math.floor((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
 }
}

export const dealerGPTDataAccess = DealerGPTDataAccessService.getInstance();
