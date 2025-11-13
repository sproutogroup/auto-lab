import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIBusinessIntelligence from "@/components/AIBusinessIntelligence";
import {
 BarChart,
 LineChart,
 PieChart,
 TrendingUp,
 TrendingDown,
 Target,
 Users,
 Car,
 DollarSign,
 Calendar,
 Search,
 Filter,
 Download,
 BarChart3,
 Activity,
 ShoppingCart,
 Package,
 ArrowUpIcon,
 ArrowDownIcon,
 Zap,
 Clock,
 Eye,
 FileText,
 Briefcase,
 CheckCircle,
 CreditCard,
 Shield,
 AlertCircle,
 AlertTriangle,
 ArrowRight,
 ArrowUpRight,
 ArrowDownRight,
 Brain,
 Sparkles,
} from "lucide-react";

interface DashboardStats {
 stockSummary: {
  totalValue: number;
  totalVehicles: number;
  totalMakes: number;
 };
 weeklySales: {
  thisWeek: number;
  thisWeekValue: number;
  lastWeek: number;
  lastWeekValue: number;
 };
 monthlySales: {
  thisMonth: number;
  thisMonthValue: number;
  grossProfit: number;
 };
 boughtSummary: {
  monthlyBought: number;
  monthlyBoughtValue: number;
  monthlyPxValue: number;
 };
 carsIncoming: {
  awdVehicles: number;
  awdTotalValue: number;
 };
 financeSales: {
  monthlyFinanceAmount: number;
  monthlyFinanceValue: number;
 };
 stockByMake: Array<{
  makeName: string;
  count: number;
  value: number;
 }>;
 recentPurchases: Array<{
  vehicleName: string;
  price: number;
  date: Date;
 }>;
 salesByMake: Array<{
  makeName: string;
  soldCount: number;
 }>;
}

interface StockAgeAnalytics {
 avgStockAge: number;
 totalStockValue: number;
 stockTurnoverRate: number;
 overAgedStockValue: number;
 fastMovingStock: number;
 slowMovingStock: number;
 ageDistribution: Array<{
  ageRange: string;
  count: number;
  percentage: number;
  totalValue: number;
 }>;
 makePerformance: Array<{
  makeName: string;
  avgAge: number;
  stockValue: number;
  velocity: number;
 }>;
}

interface CustomerStats {
 totalCustomers: number;
 activeCustomers: number;
 newCustomersThisMonth: number;
 totalSpent: number;
 avgSpentPerCustomer: number;
 topCustomers: Array<{
  id: number;
  name: string;
  totalSpent: number;
  purchaseCount: number;
 }>;
 customersBySource: Array<{
  source: string;
  count: number;
 }>;
 monthlyNewCustomers: Array<{
  month: string;
  count: number;
 }>;
}

interface LeadStats {
 totalLeads: number;
 activeLeads: number;
 conversionRate: number;
 averageLeadValue: number;
 leadsThisMonth: number;
 convertedThisMonth: number;
 leadsBySource: Array<{
  source: string;
  count: number;
  conversionRate: number;
 }>;
 leadsByStage: Array<{
  stage: string;
  count: number;
  percentage: number;
 }>;
 leadsByQuality: Array<{
  quality: string;
  count: number;
  avgValue: number;
 }>;
}

interface JobStats {
 totalJobs: number;
 activeJobs: number;
 completedJobs: number;
 completionRate: number;
 avgJobDuration: number;
 jobsByType: Array<{
  type: string;
  count: number;
 }>;
 jobsByStatus: Array<{
  status: string;
  count: number;
 }>;
 jobsByPriority: Array<{
  priority: string;
  count: number;
 }>;
}

export default function Reports() {
 const [activeView, setActiveView] = useState("dashboard");
 const [dateRange, setDateRange] = useState("current");
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedMonth, setSelectedMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
 });

 // Fetch all analytics data
 const { data: dashboardStats, isLoading: dashboardLoading } = useQuery<DashboardStats>({
  queryKey: ["/api/dashboard/stats"],
 });

 const { data: stockAgeAnalytics, isLoading: stockAgeLoading } = useQuery<StockAgeAnalytics>({
  queryKey: ["/api/stock-age/analytics"],
 });

 const { data: customerStats, isLoading: customerLoading } = useQuery<CustomerStats>({
  queryKey: ["/api/customers/stats"],
 });

 const { data: leadStats, isLoading: leadLoading } = useQuery<LeadStats>({
  queryKey: ["/api/leads/stats"],
 });

 const { data: jobStats, isLoading: jobLoading } = useQuery<JobStats>({
  queryKey: ["/api/jobs/stats"],
 });

 const { data: inventoryAnalytics, isLoading: inventoryLoading } = useQuery({
  queryKey: ["/api/business-intelligence/inventory-analytics"],
 });

 // New comprehensive business intelligence queries
 const { data: financialAudit } = useQuery({
  queryKey: ["/api/business-intelligence/financial-audit"],
 });

 const { data: vehiclePerformance } = useQuery({
  queryKey: ["/api/business-intelligence/vehicle-performance"],
 });

 const { data: salesManagement } = useQuery({
  queryKey: ["/api/business-intelligence/sales-management"],
 });

 const { data: executiveDashboard } = useQuery({
  queryKey: ["/api/business-intelligence/executive-dashboard"],
 });

 // Monthly data query
 const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
  queryKey: [`/api/business-intelligence/monthly-data/${selectedMonth}`],
  enabled: activeView === "monthly",
 });

 // Calculate key metrics
 const keyMetrics = useMemo(() => {
  if (!dashboardStats || !stockAgeAnalytics || !customerStats || !leadStats || !jobStats) return null;

  const stockTurnoverVelocity =
   stockAgeAnalytics.avgStockAge > 0 ? Math.round(365 / stockAgeAnalytics.avgStockAge) : 0;

  const revenueGrowth =
   (dashboardStats.weeklySales?.lastWeekValue || 0) > 0
    ? (((dashboardStats.weeklySales?.thisWeekValue || 0) - (dashboardStats.weeklySales?.lastWeekValue || 0)) /
       (dashboardStats.weeklySales?.lastWeekValue || 1)) *
      100
    : 0;

  const avgProfitMargin =
   (dashboardStats.monthlySales?.thisMonthValue || 0) > 0
    ? ((dashboardStats.monthlySales?.grossProfit || 0) / (dashboardStats.monthlySales?.thisMonthValue || 1)) *
      100
    : 0;

  return {
   inventory: {
    totalValue: dashboardStats.stockSummary?.totalValue || 0,
    totalVehicles: dashboardStats.stockSummary?.totalVehicles || 0,
    avgStockAge: stockAgeAnalytics.avgStockAge || 0,
    turnoverVelocity: stockTurnoverVelocity,
   },
   sales: {
    monthlyRevenue: dashboardStats.monthlySales?.thisMonthValue || 0,
    weeklyRevenue: dashboardStats.weeklySales?.thisWeekValue || 0,
    revenueGrowth,
    avgProfitMargin,
    unitsSold: dashboardStats.monthlySales?.thisMonth || 0,
   },
   customers: {
    totalCustomers: customerStats.totalCustomers || 0,
    activeCustomers: customerStats.activeCustomers || 0,
    newThisMonth: customerStats.newCustomersThisMonth || 0,
    avgSpent: customerStats.avgSpentPerCustomer || 0,
   },
   leads: {
    totalLeads: leadStats.totalLeads || 0,
    activeLeads: leadStats.activeLeads || 0,
    conversionRate: leadStats.conversionRate || 0,
    leadsThisMonth: leadStats.leadsThisMonth || 0,
   },
   operations: {
    totalJobs: jobStats.totalJobs || 0,
    activeJobs: jobStats.activeJobs || 0,
    completionRate: jobStats.completionRate || 0,
    avgDuration: jobStats.avgJobDuration || 0,
   },
  };
 }, [dashboardStats, stockAgeAnalytics, customerStats, leadStats, jobStats]);

 const isLoading =
  dashboardLoading || stockAgeLoading || customerLoading || leadLoading || jobLoading || inventoryLoading;

 if (isLoading) {
  return (
   <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
     <div className="flex items-center space-x-2">
      <BarChart className="h-6 w-6 text-red-600" />
      <h1 className="text-2xl font-semibold text-gray-900">Business Intelligence Center</h1>
     </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
     {[1, 2, 3, 4].map(i => (
      <Card key={i} className="premium-card">
       <CardContent className="p-6">
        <div className="animate-pulse">
         <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
         <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
       </CardContent>
      </Card>
     ))}
    </div>
   </div>
  );
 }

 if (!keyMetrics) {
  return (
   <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
     <div className="flex items-center space-x-2">
      <BarChart className="h-6 w-6 text-red-600" />
      <h1 className="text-2xl font-semibold text-gray-900">Business Intelligence Center</h1>
     </div>
    </div>
    <Card className="premium-card">
     <CardContent className="p-6">
      <p className="text-gray-600">Unable to load analytics data. Please try again later.</p>
     </CardContent>
    </Card>
   </div>
  );
 }

 return (
  <div className="p-3 lg:p-6 space-y-4 lg:space-y-6 bg-gray-50 min-h-screen">
   {/* Header */}
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
    <div className="flex items-center space-x-3">
     <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
      <BarChart className="h-5 w-5 text-white" />
     </div>
     <div>
      <h1 className="text-xl font-semibold text-gray-900">Business Intelligence</h1>
      <p className="text-sm text-gray-600">Comprehensive analytics and insights</p>
     </div>
    </div>
    <div className="flex items-center space-x-3">
     <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select value={dateRange} onValueChange={setDateRange}>
       <SelectTrigger className="w-40 h-9">
        <SelectValue />
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="current">Current Period</SelectItem>
        <SelectItem value="last30">Last 30 Days</SelectItem>
        <SelectItem value="last90">Last 90 Days</SelectItem>
        <SelectItem value="year">Year to Date</SelectItem>
       </SelectContent>
      </Select>
     </div>
     <Button variant="outline" size="sm" className="h-9">
      <Download className="h-4 w-4 mr-2" />
      Export Report
     </Button>
    </div>
   </div>

   {/* Key Performance Indicators */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
    {/* Inventory Overview */}
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
     <CardContent className="p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
       <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
         <Package className="h-4 w-4 text-red-600" />
        </div>
        <span className="text-sm font-medium text-gray-900">Inventory Overview</span>
       </div>
       <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs px-2 py-1">
        Live
       </Badge>
      </div>
      <div className="space-y-3">
       <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900">{keyMetrics.inventory.totalVehicles}</span>
        <span className="text-xs text-gray-600">In Stock</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-800">
         £{(keyMetrics.inventory.totalValue || 0).toLocaleString()}
        </span>
        <span className="text-xs text-gray-600">Total Value</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{keyMetrics.inventory.avgStockAge} days</span>
        <span className="text-xs text-gray-600">Avg. Age</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
         {keyMetrics.inventory.turnoverVelocity} days
        </span>
        <span className="text-xs text-gray-600">Velocity</span>
       </div>
      </div>
     </CardContent>
    </Card>

    {/* Sales Performance */}
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
     <CardContent className="p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
       <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
         <DollarSign className="h-4 w-4 text-green-600" />
        </div>
        <span className="text-sm font-medium text-gray-900">Sales Performance</span>
       </div>
       <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-2 py-1">
        YTD
       </Badge>
      </div>
      <div className="space-y-3">
       <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900">
         £{(keyMetrics.sales.monthlyRevenue || 0).toLocaleString()}
        </span>
        <span className="text-xs text-gray-600">Total Revenue</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-800">{keyMetrics.sales.unitsSold}</span>
        <span className="text-xs text-gray-600">Units Sold</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
         {(keyMetrics.sales.avgProfitMargin || 0).toFixed(1)}%
        </span>
        <span className="text-xs text-gray-600">Avg. Profit</span>
       </div>
       <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
         <span className="text-sm font-medium text-gray-700">
          {(keyMetrics.sales.revenueGrowth || 0).toFixed(1)}%
         </span>
         {(keyMetrics.sales.revenueGrowth || 0) >= 0 ? (
          <ArrowUpIcon className="h-3 w-3 text-green-600" />
         ) : (
          <ArrowDownIcon className="h-3 w-3 text-red-600" />
         )}
        </div>
        <span className="text-xs text-gray-600">Growth</span>
       </div>
      </div>
     </CardContent>
    </Card>

    {/* Inventory Value */}
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
     <CardContent className="p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
       <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
         <Target className="h-4 w-4 text-yellow-600" />
        </div>
        <span className="text-sm font-medium text-gray-900">Inventory Value</span>
       </div>
       <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1">
        Current
       </Badge>
      </div>
      <div className="space-y-3">
       <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900">
         £{(keyMetrics.inventory.totalValue || 0).toLocaleString()}
        </span>
        <span className="text-xs text-gray-600">Total Value</span>
       </div>
       <div className="text-center mt-3">
        <div className="text-xs text-gray-600 mb-2">Age Profile</div>
        <div className="flex space-x-1">
         {stockAgeAnalytics?.ageDistribution.map((range, index) => (
          <div
           key={index}
           className="bg-yellow-400 h-2 rounded-full"
           style={{
            width: `${range.percentage}%`,
            opacity: 1 - index * 0.15,
           }}
          ></div>
         ))}
        </div>
        <div className="text-xs text-gray-600 mt-1">{stockAgeAnalytics?.ageDistribution.length} vehicles</div>
       </div>
      </div>
     </CardContent>
    </Card>

    {/* Operational Health */}
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
     <CardContent className="p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
       <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
         <Activity className="h-4 w-4 text-blue-600" />
        </div>
        <span className="text-sm font-medium text-gray-900">Operational Health</span>
       </div>
       <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-2 py-1">
        30-day
       </Badge>
      </div>
      <div className="space-y-3">
       <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-900">{keyMetrics.operations.totalJobs}</span>
        <span className="text-xs text-gray-600">Active</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-800">{keyMetrics.customers.activeCustomers}</span>
        <span className="text-xs text-gray-600">Staff</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{keyMetrics.operations.activeJobs}</span>
        <span className="text-xs text-gray-600">Queue</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
         {(keyMetrics.operations.completionRate || 0).toFixed(1)}%
        </span>
        <span className="text-xs text-gray-600">Completion</span>
       </div>
      </div>
     </CardContent>
    </Card>
   </div>

   {/* Navigation Tabs */}
   <div className="bg-white rounded-lg border-0 shadow-sm p-4">
    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
     <div className="flex flex-wrap gap-2">
      <Button
       variant={activeView === "dashboard" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("dashboard")}
       className="h-8 text-xs"
      >
       <BarChart3 className="h-3 w-3 mr-1" />
       Dashboard
      </Button>
      <Button
       variant={activeView === "monthly" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("monthly")}
       className="h-8 text-xs"
      >
       <Calendar className="h-3 w-3 mr-1" />
       Monthly
      </Button>
      <Button
       variant={activeView === "inventory" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("inventory")}
       className="h-8 text-xs"
      >
       <Package className="h-3 w-3 mr-1" />
       Inventory
      </Button>
      <Button
       variant={activeView === "sales" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("sales")}
       className="h-8 text-xs"
      >
       <TrendingUp className="h-3 w-3 mr-1" />
       Sales
      </Button>
      <Button
       variant={activeView === "trends" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("trends")}
       className="h-8 text-xs"
      >
       <LineChart className="h-3 w-3 mr-1" />
       Trends
      </Button>
      <Button
       variant={activeView === "staff" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("staff")}
       className="h-8 text-xs"
      >
       <Users className="h-3 w-3 mr-1" />
       Staff
      </Button>
      <Button
       variant={activeView === "financial" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("financial")}
       className="h-8 text-xs"
      >
       <DollarSign className="h-3 w-3 mr-1" />
       Financial
      </Button>
      <Button
       variant={activeView === "performance" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("performance")}
       className="h-8 text-xs"
      >
       <Activity className="h-3 w-3 mr-1" />
       Performance
      </Button>
      <Button
       variant={activeView === "executive" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("executive")}
       className="h-8 text-xs"
      >
       <Target className="h-3 w-3 mr-1" />
       Executive
      </Button>
      <Button
       variant={activeView === "ai-assistant" ? "default" : "outline"}
       size="sm"
       onClick={() => setActiveView("ai-assistant")}
       className="h-8 text-xs"
      >
       <Brain className="h-3 w-3 mr-1" />
       AI Assistant
      </Button>
     </div>
     <div className="flex-1"></div>
     <div className="flex items-center space-x-2">
      <Select value={dateRange} onValueChange={setDateRange}>
       <SelectTrigger className="w-28 h-8 text-xs">
        <SelectValue />
       </SelectTrigger>
       <SelectContent>
        <SelectItem value="current">Current</SelectItem>
        <SelectItem value="last30">Last 30d</SelectItem>
        <SelectItem value="last90">Last 90d</SelectItem>
       </SelectContent>
      </Select>
      <div className="relative">
       <Search className="h-3 w-3 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
       <Input
        placeholder="Search reports..."
        className="pl-8 w-36 h-8 text-xs"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
       />
      </div>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
       <Filter className="h-3 w-3" />
      </Button>
     </div>
    </div>
   </div>

   {/* Content Area */}
   {activeView === "dashboard" && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
     {/* Financial Performance */}
     <Card className="bg-white border-0 shadow-sm lg:col-span-2">
      <CardHeader className="pb-3">
       <CardTitle className="flex items-center space-x-2 text-base">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
         <BarChart3 className="h-4 w-4 text-red-600" />
        </div>
        <span>Financial Performance</span>
       </CardTitle>
       <p className="text-sm text-gray-600">Business metrics for the current year</p>
      </CardHeader>
      <CardContent className="space-y-4">
       <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg">
         <div className="text-xs text-gray-600">Revenue</div>
         <div className="text-xl font-bold text-gray-900">
          £{(keyMetrics.sales.monthlyRevenue || 0).toLocaleString()}
         </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
         <div className="text-xs text-gray-600">Purchases</div>
         <div className="text-xl font-bold text-gray-900">
          £{(dashboardStats?.boughtSummary?.monthlyBoughtValue || 0).toLocaleString()}
         </div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
         <div className="text-xs text-gray-600">Profit</div>
         <div className="text-xl font-bold text-gray-900">
          £{(dashboardStats?.monthlySales?.grossProfit || 0).toLocaleString()}
         </div>
        </div>
       </div>

       {/* Simulated Chart Area */}
       <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
         <BarChart3 className="h-10 w-10 text-gray-400 mx-auto mb-2" />
         <p className="text-sm text-gray-600">Monthly Performance Chart</p>
         <p className="text-xs text-gray-500">Revenue vs Purchases vs Profit</p>
        </div>
       </div>
      </CardContent>
     </Card>

     {/* Quarterly Overview */}
     <Card className="bg-white border-0 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="flex items-center space-x-2 text-base">
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
         <Target className="h-4 w-4 text-red-600" />
        </div>
        <span>Quarterly Overview</span>
       </CardTitle>
       <p className="text-sm text-gray-600">Performance by quarter</p>
      </CardHeader>
      <CardContent>
       <div className="space-y-3">
        {["Q1", "Q2", "Q3", "Q4"].map((quarter, index) => (
         <div key={quarter} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
           <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{quarter}</span>
           </div>
           <div>
            <div className="text-sm font-semibold text-gray-900">Revenue</div>
            <div className="text-xs text-gray-600">
             £{index === 0 ? (keyMetrics.sales.monthlyRevenue || 0).toLocaleString() : "0"}
            </div>
           </div>
          </div>
          <div className="text-right">
           <div className="text-xs text-gray-600">
            Profit: £{index === 0 ? (dashboardStats?.monthlySales?.grossProfit || 0).toLocaleString() : "0"}
           </div>
           <div className="text-xs text-gray-500">{index === 0 ? keyMetrics.sales.unitsSold : "0"} sold</div>
          </div>
         </div>
        ))}
       </div>
      </CardContent>
     </Card>
    </div>
   )}

   {activeView === "monthly" && (
    <div className="space-y-4">
     {/* Month Selection Header */}
     <div className="bg-white rounded-lg border-0 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
       <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold text-gray-900">Monthly Analysis</h2>
        <div className="flex items-center space-x-2">
         <Calendar className="h-4 w-4 text-gray-500" />
         <Input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="w-40 h-8 text-sm"
         />
        </div>
       </div>
       {monthlyLoading && (
        <div className="flex items-center space-x-2 text-gray-500">
         <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
         <span className="text-sm">Loading...</span>
        </div>
       )}
      </div>
     </div>

     {monthlyData && !monthlyLoading && (
      <>
       {/* Summary Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-sm">
         <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
           <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-blue-600" />
           </div>
           <span className="text-sm font-medium text-gray-900">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
           £{(monthlyData.sales_summary.total_revenue || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-600 mt-1">
           {monthlyData.sales_summary.total_units_sold} units sold
          </p>
         </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
         <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
           <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-600" />
           </div>
           <span className="text-sm font-medium text-gray-900">Gross Profit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
           £{(monthlyData.sales_summary.gross_profit || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-600 mt-1">
           {monthlyData.sales_summary.profit_margin.toFixed(1)}% margin
          </p>
         </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
         <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
           <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Car className="h-4 w-4 text-yellow-600" />
           </div>
           <span className="text-sm font-medium text-gray-900">Avg Price</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
           £{(monthlyData.sales_summary.avg_selling_price || 0).toLocaleString()}
          </div>
          <p className="text-xs text-gray-600 mt-1">Per vehicle</p>
         </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
         <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
           <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Target className="h-4 w-4 text-purple-600" />
           </div>
           <span className="text-sm font-medium text-gray-900">Target Achievement</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
           {monthlyData.performance_metrics.revenue_vs_target.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-600 mt-1">Revenue target</p>
         </CardContent>
        </Card>
       </div>

       {/* Additional Cards */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Performance Card */}
        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <DollarSign className="h-5 w-5 text-red-600" />
           <span>Sales Performance</span>
          </CardTitle>
          <p className="text-sm text-gray-600">Units sold, total value and gross profit</p>
         </CardHeader>
         <CardContent>
          <div className="space-y-4">
           <div className="flex items-center space-x-3">
            <Car className="h-4 w-4 text-red-600" />
            <div className="flex-1">
             <div className="text-xs text-gray-600 uppercase">Units Sold</div>
             <div className="text-2xl font-bold text-gray-900">
              {monthlyData.sales_summary.total_units_sold}
             </div>
            </div>
           </div>
           <div className="flex items-center space-x-3">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <div className="flex-1">
             <div className="text-xs text-gray-600 uppercase">Total Value</div>
             <div className="text-2xl font-bold text-gray-900">
              £{(monthlyData.sales_summary.total_revenue || 0).toLocaleString()}
             </div>
            </div>
           </div>
           <div className="flex items-center space-x-3">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
             <div className="text-xs text-gray-600 uppercase">Gross Profit</div>
             <div className="text-2xl font-bold text-gray-900">
              £{(monthlyData.sales_summary.gross_profit || 0).toLocaleString()}
             </div>
            </div>
           </div>
          </div>
         </CardContent>
        </Card>

        {/* Finance Sales Card */}
        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <CreditCard className="h-5 w-5 text-red-600" />
           <span>Finance Sales</span>
          </CardTitle>
          <p className="text-sm text-gray-600">Finance units and total finance value</p>
         </CardHeader>
         <CardContent>
          <div className="space-y-4">
           <div className="flex items-center space-x-3">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
             <div className="text-xs text-gray-600 uppercase">Finance Units</div>
             <div className="text-2xl font-bold text-gray-900">
              {monthlyData.finance_breakdown?.finance_units || 0}
             </div>
            </div>
           </div>
           <div className="flex items-center space-x-3">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div className="flex-1">
             <div className="text-xs text-gray-600 uppercase">Finance Value</div>
             <div className="text-2xl font-bold text-gray-900">
              £{(monthlyData.finance_breakdown?.finance_value || 0).toLocaleString()}
             </div>
            </div>
           </div>

           <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-3">Additional Products Sold</div>
            <div className="grid grid-cols-3 gap-4">
             <div className="text-center">
              <Shield className="h-4 w-4 text-red-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">
               {monthlyData.finance_breakdown?.warranty_count || 0}
              </div>
              <div className="text-xs text-gray-600">Warranty</div>
             </div>
             <div className="text-center">
              <FileText className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">
               {monthlyData.finance_breakdown?.alloy_insurance_count || 0}
              </div>
              <div className="text-xs text-gray-600">Alloy Ins.</div>
             </div>
             <div className="text-center">
              <Shield className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-gray-900">
               {monthlyData.finance_breakdown?.gap_insurance_count || 0}
              </div>
              <div className="text-xs text-gray-600">GAP Ins.</div>
             </div>
            </div>
           </div>
          </div>
         </CardContent>
        </Card>
       </div>

       {/* Sales Breakdown */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Make */}
        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <BarChart3 className="h-5 w-5 text-blue-600" />
           <span>Sales by Make</span>
          </CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-3">
           {monthlyData.sales_by_make?.slice(0, 8).map((item, index) => (
            <div key={item.make} className="flex items-center justify-between">
             <div className="flex items-center space-x-3">
              <div className="w-1 h-8 bg-blue-600" style={{ opacity: 1 - index * 0.1 }}></div>
              <div>
               <div className="font-medium">{item.make}</div>
               <div className="text-sm text-gray-500">{item.units} units</div>
              </div>
             </div>
             <div className="text-right">
              <div className="font-semibold">£{(item.revenue || 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">£{(item.avg_price || 0).toLocaleString()} avg</div>
             </div>
            </div>
           ))}
          </div>
         </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <Package className="h-5 w-5 text-red-600" />
           <span>Cost Analysis</span>
          </CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-4">
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Purchase Costs</span>
            <span className="font-semibold">
             £{(monthlyData.cost_breakdown.purchase_costs || 0).toLocaleString()}
            </span>
           </div>
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Operational Costs</span>
            <span className="font-semibold">
             £{(monthlyData.cost_breakdown.operational_costs || 0).toLocaleString()}
            </span>
           </div>
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Holding Costs</span>
            <span className="font-semibold">
             £{(monthlyData.cost_breakdown.holding_costs || 0).toLocaleString()}
            </span>
           </div>
           <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
             <span className="font-medium text-gray-900">Total Costs</span>
             <span className="text-lg font-bold text-red-600">
              £{(monthlyData.cost_breakdown.total_costs || 0).toLocaleString()}
             </span>
            </div>
           </div>
           <div className="pt-2">
            <div className="flex justify-between items-center">
             <span className="font-medium text-gray-900">Net Profit</span>
             <span className="text-lg font-bold text-green-600">
              £{(monthlyData.sales_summary.net_profit || 0).toLocaleString()}
             </span>
            </div>
           </div>
          </div>
         </CardContent>
        </Card>
       </div>

       {/* Performance Metrics */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <Target className="h-5 w-5 text-green-600" />
           <span>Performance vs Targets</span>
          </CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-4">
           <div className="space-y-2">
            <div className="flex justify-between text-sm">
             <span>Units Target</span>
             <span>{monthlyData.performance_metrics.vehicles_sold_vs_target.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
             <div
              className="bg-blue-600 h-2 rounded-full"
              style={{
               width: `${Math.min(monthlyData.performance_metrics.vehicles_sold_vs_target, 100)}%`,
              }}
             ></div>
            </div>
           </div>
           <div className="space-y-2">
            <div className="flex justify-between text-sm">
             <span>Revenue Target</span>
             <span>{monthlyData.performance_metrics.revenue_vs_target.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
             <div
              className="bg-green-600 h-2 rounded-full"
              style={{
               width: `${Math.min(monthlyData.performance_metrics.revenue_vs_target, 100)}%`,
              }}
             ></div>
            </div>
           </div>
           <div className="space-y-2">
            <div className="flex justify-between text-sm">
             <span>Profit Target</span>
             <span>{monthlyData.performance_metrics.profit_vs_target.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
             <div
              className="bg-yellow-600 h-2 rounded-full"
              style={{
               width: `${Math.min(monthlyData.performance_metrics.profit_vs_target, 100)}%`,
              }}
             ></div>
            </div>
           </div>
          </div>
         </CardContent>
        </Card>

        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <Activity className="h-5 w-5 text-purple-600" />
           <span>Department Performance</span>
          </CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-3">
           {monthlyData.sales_by_department?.map((dept, index) => (
            <div key={dept.department} className="flex items-center justify-between">
             <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-purple-600" style={{ opacity: 1 - index * 0.2 }}></div>
              <span className="font-medium">{dept.department}</span>
             </div>
             <div className="text-right">
              <div className="font-semibold">£{(dept.revenue || 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500">{dept.units} units</div>
             </div>
            </div>
           ))}
          </div>
         </CardContent>
        </Card>

        <Card className="premium-card">
         <CardHeader>
          <CardTitle className="flex items-center space-x-2">
           <Clock className="h-5 w-5 text-orange-600" />
           <span>Key Metrics</span>
          </CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-4">
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Inventory Turnover</span>
            <span className="font-semibold">
             {monthlyData.performance_metrics.inventory_turnover.toFixed(1)}x
            </span>
           </div>
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Profit Margin</span>
            <span className="font-semibold">{monthlyData.sales_summary.profit_margin.toFixed(1)}%</span>
           </div>
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Units per Day</span>
            <span className="font-semibold">
             {(monthlyData.sales_summary.total_units_sold / 30).toFixed(1)}
            </span>
           </div>
           <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Revenue per Day</span>
            <span className="font-semibold">
             £{((monthlyData.sales_summary.total_revenue || 0) / 30).toLocaleString()}
            </span>
           </div>
          </div>
         </CardContent>
        </Card>
       </div>
      </>
     )}

     {!monthlyData && !monthlyLoading && (
      <Card className="premium-card">
       <CardContent className="p-12 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
        <p className="text-gray-500">No sales data found for the selected month.</p>
       </CardContent>
      </Card>
     )}
    </div>
   )}

   {activeView === "inventory" && (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
     {/* Department Analysis - Dynamic based on actual data */}
     {inventoryAnalytics?.departments?.map((department, index) => {
      const iconColor = index === 0 ? "text-red-600" : index === 1 ? "text-purple-600" : "text-green-600";
      const description =
       index === 0
        ? "All department vehicles"
        : index === 1
          ? "Motor sport racing department vehicles"
          : "Autolab select premium vehicles";

      return (
       <Card key={department.name} className="premium-card">
        <CardHeader>
         <CardTitle className="flex items-center space-x-2">
          <Package className={`h-5 w-5 ${iconColor}`} />
          <span>{department.name}</span>
         </CardTitle>
         <p className="text-sm text-gray-600">{description}</p>
        </CardHeader>
        <CardContent>
         <div className="space-y-4">
          <div className="text-center">
           <div className="text-3xl font-bold text-gray-900">{department.stockCount}</div>
           <div className="text-sm text-gray-600">In Stock</div>
          </div>
          <div className="space-y-2">
           <div className="flex justify-between">
            <span className="text-sm text-gray-600">Sold</span>
            <span className="font-semibold">{department.soldCount}</span>
           </div>
           <div className="flex justify-between">
            <span className="text-sm text-gray-600">Stock Value</span>
            <span className="font-semibold">£{(department.stockValue || 0).toLocaleString()}</span>
           </div>
          </div>
         </div>
        </CardContent>
       </Card>
      );
     })}

     {/* DF Funded Section */}
     {inventoryAnalytics?.df_funded && (
      <>
       <div className="lg:col-span-3 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
         <CreditCard className="h-5 w-5 text-blue-600" />
         <span>DF Funded Analysis</span>
        </h3>
       </div>
       {inventoryAnalytics.df_funded.map((dfData, index) => {
        const isGroupCard = dfData.department_name === "Group Utilisation";
        const utilizationColor =
         dfData.facility_utilisation > 80
          ? "text-red-600"
          : dfData.facility_utilisation > 60
            ? "text-yellow-600"
            : "text-green-600";
        const utilizationBg = isGroupCard
         ? "bg-blue-50 border-blue-200 border-2"
         : dfData.facility_utilisation > 80
           ? "bg-red-100 border-red-200"
           : dfData.facility_utilisation > 60
             ? "bg-yellow-100 border-yellow-200"
             : "bg-green-100 border-green-200";
        const iconColor = isGroupCard ? "text-blue-600" : utilizationColor;

        return (
         <Card
          key={dfData.department_name}
          className={`premium-card ${utilizationBg} ${isGroupCard ? "lg:col-span-3" : ""}`}
         >
          <CardHeader>
           <CardTitle className="flex items-center space-x-2">
            {isGroupCard ? (
             <Shield className={`h-5 w-5 ${iconColor}`} />
            ) : (
             <CreditCard className={`h-5 w-5 ${iconColor}`} />
            )}
            <span className={isGroupCard ? "text-lg font-bold" : ""}>{dfData.department_name}</span>
           </CardTitle>
           <p className="text-sm text-gray-600">
            {isGroupCard
             ? "Total group facility utilization across all departments"
             : "Department facility utilization"}
           </p>
          </CardHeader>
          <CardContent>
           <div className="space-y-4">
            <div className="text-center">
             <div className={`${isGroupCard ? "text-4xl" : "text-3xl"} font-bold ${utilizationColor}`}>
              {dfData.facility_utilisation.toFixed(1)}%
             </div>
             <div className="text-sm text-gray-600">
              {isGroupCard ? "Total Group Utilisation" : "Facility Utilisation"}
             </div>
            </div>
            <div className="space-y-2">
             <div className="flex justify-between">
              <span className="text-sm text-gray-600">{isGroupCard ? "Total Budget" : "Budget Amount"}</span>
              <span className="font-semibold">£{dfData.budget_amount.toLocaleString()}</span>
             </div>
             <div className="flex justify-between">
              <span className="text-sm text-gray-600">
               {isGroupCard ? "Total DFC Outstanding" : "DFC Outstanding"}
              </span>
              <span className="font-semibold">£{dfData.dfc_outstanding_amount.toLocaleString()}</span>
             </div>
             <div className="flex justify-between">
              <span className="text-sm text-gray-600">
               {isGroupCard ? "Total Remaining Facility" : "Remaining Facility"}
              </span>
              <span
               className={`font-semibold ${dfData.remaining_facility < 0 ? "text-red-600" : "text-green-600"}`}
              >
               £{dfData.remaining_facility.toLocaleString()}
              </span>
             </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
             <div
              className={`h-4 rounded-full transition-all duration-300 ${
               dfData.facility_utilisation > 80
                ? "bg-red-600"
                : dfData.facility_utilisation > 60
                  ? "bg-yellow-600"
                  : "bg-green-600"
              }`}
              style={{
               width: `${Math.min(dfData.facility_utilisation, 100)}%`,
              }}
             ></div>
            </div>
            {isGroupCard && (
             <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800 font-medium text-center">
               Total facility utilization across Autolab (£2.7M), MSR (£300K), and ALS (£0)
              </p>
             </div>
            )}
           </div>
          </CardContent>
         </Card>
        );
       })}
      </>
     )}

     {/* Inventory Composition */}
     <Card className="premium-card lg:col-span-2">
      <CardHeader>
       <CardTitle className="flex items-center space-x-2">
        <PieChart className="h-5 w-5 text-red-600" />
        <span>Inventory Composition</span>
       </CardTitle>
       <p className="text-sm text-gray-600">Vehicle distribution by make</p>
      </CardHeader>
      <CardContent>
       <div className="space-y-3">
        {inventoryAnalytics?.composition?.slice(0, 8).map((item, index) => (
         <div key={item.make} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
           <div className="w-3 h-3 rounded-full bg-red-600" style={{ opacity: 1 - index * 0.1 }}></div>
           <span className="text-sm font-medium">{item.make}</span>
          </div>
          <div className="text-right">
           <div className="text-sm font-semibold">{item.count} vehicles</div>
           <div className="text-xs text-gray-500">
            £{(item.value || 0).toLocaleString()} ({(item.percentage || 0).toFixed(1)}%)
           </div>
          </div>
         </div>
        ))}
        {(!inventoryAnalytics?.composition || inventoryAnalytics.composition.length === 0) && (
         <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
           <PieChart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
           <p className="text-sm text-gray-600">No inventory data available</p>
          </div>
         </div>
        )}
       </div>
      </CardContent>
     </Card>

     {/* Oldest in Stock */}
     <Card className="premium-card">
      <CardHeader>
       <CardTitle className="flex items-center space-x-2">
        <Clock className="h-5 w-5 text-red-600" />
        <span>Oldest in Stock</span>
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="space-y-3">
        {stockAgeAnalytics?.makePerformance.slice(0, 5).map((make, index) => (
         <div key={make.makeName} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
           <div className="text-sm font-medium">{make.makeName}</div>
          </div>
          <div className="text-right">
           <div className="text-sm font-semibold text-red-600">{make.avgAge} days</div>
           <div className="text-xs text-gray-500">£{(make.stockValue || 0).toLocaleString()}</div>
          </div>
         </div>
        ))}
       </div>
      </CardContent>
     </Card>
    </div>
   )}

   {activeView === "sales" && (
    <div className="space-y-6">
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="premium-card">
       <CardHeader>
        <CardTitle>Monthly Sales Performance</CardTitle>
       </CardHeader>
       <CardContent>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
         <div className="text-center">
          <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Sales Trend Chart</p>
          <p className="text-sm text-gray-500">Monthly performance tracking</p>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card">
       <CardHeader>
        <CardTitle>Top Performers</CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         {dashboardStats?.stockByMake.slice(0, 5).map((make, index) => (
          <div key={make.makeName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
           <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
             <span className="text-xs font-bold text-white">{index + 1}</span>
            </div>
            <span className="font-medium">{make.makeName}</span>
           </div>
           <div className="text-right">
            <div className="font-semibold">£{(make.value || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-600">{make.count} units</div>
           </div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>
     </div>
    </div>
   )}

   {activeView === "trends" && (
    <div className="space-y-6">
     <Card className="premium-card">
      <CardHeader>
       <CardTitle>Business Trends Analysis</CardTitle>
      </CardHeader>
      <CardContent>
       <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
         <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
         <p className="text-lg text-gray-600">Advanced Analytics Dashboard</p>
         <p className="text-sm text-gray-500">Comprehensive business intelligence and trend analysis</p>
        </div>
       </div>
      </CardContent>
     </Card>
    </div>
   )}

   {activeView === "staff" && (
    <div className="space-y-6">
     <Card className="premium-card">
      <CardHeader>
       <CardTitle>Staff Performance</CardTitle>
      </CardHeader>
      <CardContent>
       <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
         <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
         <p className="text-lg text-gray-600">Staff Analytics Dashboard</p>
         <p className="text-sm text-gray-500">Performance metrics and productivity analysis</p>
        </div>
       </div>
      </CardContent>
     </Card>
    </div>
   )}

   {activeView === "financial" && financialAudit && (
    <div className="space-y-6">
     {/* Revenue Analysis Section */}
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="premium-card bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <DollarSign className="h-5 w-5 text-emerald-600" />
         <span>Total Revenue</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div className="text-3xl font-bold text-emerald-900">
          £{(financialAudit.revenue_analysis.total_revenue || 0).toLocaleString()}
         </div>
         <div className="space-y-2">
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Cash Revenue</span>
           <span className="text-sm font-semibold">
            £{(financialAudit.revenue_analysis.cash_revenue || 0).toLocaleString()}
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Finance Revenue</span>
           <span className="text-sm font-semibold">
            £{(financialAudit.revenue_analysis.finance_revenue || 0).toLocaleString()}
           </span>
          </div>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <TrendingUp className="h-5 w-5 text-amber-600" />
         <span>Profitability</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div className="text-3xl font-bold text-amber-900">
          £{(financialAudit.profitability_analysis.gross_profit || 0).toLocaleString()}
         </div>
         <div className="space-y-2">
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Net Profit</span>
           <span className="text-sm font-semibold">
            £{(financialAudit.profitability_analysis.net_profit || 0).toLocaleString()}
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Profit Margin</span>
           <span className="text-sm font-semibold">
            {(financialAudit.profitability_analysis.profit_margin || 0).toFixed(1)}%
           </span>
          </div>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <Activity className="h-5 w-5 text-blue-600" />
         <span>Cash Flow</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div className="text-3xl font-bold text-blue-900">
          £{(financialAudit.cash_flow_analysis.net_cash_flow || 0).toLocaleString()}
         </div>
         <div className="space-y-2">
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Cash In</span>
           <span className="text-sm font-semibold text-green-600">
            £{(financialAudit.cash_flow_analysis.cash_inflow || 0).toLocaleString()}
           </span>
          </div>
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Cash Out</span>
           <span className="text-sm font-semibold text-red-600">
            £{(financialAudit.cash_flow_analysis.cash_outflow || 0).toLocaleString()}
           </span>
          </div>
         </div>
        </div>
       </CardContent>
      </Card>
     </div>

     {/* Revenue by Make */}
     <Card className="premium-card">
      <CardHeader>
       <CardTitle className="flex items-center space-x-2">
        <BarChart3 className="h-5 w-5 text-emerald-600" />
        <span>Revenue by Make</span>
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="space-y-3">
        {financialAudit.revenue_analysis.revenue_by_make?.slice(0, 10).map((item, index) => (
         <div key={item.make} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
           <div className="w-1 h-8 bg-emerald-600" style={{ opacity: 1 - index * 0.08 }}></div>
           <span className="font-medium">{item.make}</span>
          </div>
          <div className="text-right">
           <div className="font-semibold">£{(item.revenue || 0).toLocaleString()}</div>
           <div className="text-xs text-gray-500">{(item.percentage || 0).toFixed(1)}%</div>
          </div>
         </div>
        ))}
       </div>
      </CardContent>
     </Card>

     {/* Cost Analysis */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="premium-card">
       <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-4">
         <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total Purchase Cost</span>
          <span className="font-semibold">
           £{(financialAudit.cost_analysis.total_purchase_cost || 0).toLocaleString()}
          </span>
         </div>
         <div className="flex justify-between">
          <span className="text-sm text-gray-600">Operational Costs</span>
          <span className="font-semibold">
           £{(financialAudit.cost_analysis.total_operational_cost || 0).toLocaleString()}
          </span>
         </div>
         <div className="flex justify-between">
          <span className="text-sm text-gray-600">Holding Costs</span>
          <span className="font-semibold">
           £{(financialAudit.cost_analysis.holding_costs || 0).toLocaleString()}
          </span>
         </div>
         <div className="flex justify-between">
          <span className="text-sm text-gray-600">Avg Cost per Vehicle</span>
          <span className="font-semibold">
           £{(financialAudit.cost_analysis.average_cost_per_vehicle || 0).toLocaleString()}
          </span>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card">
       <CardHeader>
        <CardTitle>Department Profitability</CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-4">
         {financialAudit.profitability_analysis.profit_by_department?.map(dept => (
          <div key={dept.department} className="space-y-1">
           <div className="flex justify-between">
            <span className="font-medium">{dept.department}</span>
            <span className="font-semibold">£{(dept.profit || 0).toLocaleString()}</span>
           </div>
           <div className="w-full bg-gray-200 rounded-full h-2">
            <div
             className="bg-emerald-600 h-2 rounded-full"
             style={{
              width: `${Math.min(dept.margin || 0, 100)}%`,
             }}
            ></div>
           </div>
           <div className="text-xs text-gray-500">{(dept.margin || 0).toFixed(1)}% margin</div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>
     </div>
    </div>
   )}

   {activeView === "performance" && vehiclePerformance && (
    <div className="space-y-6">
     {/* Turnover Metrics */}
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="premium-card bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <Clock className="h-5 w-5 text-orange-600" />
         <span>Turnover Metrics</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div className="text-center">
          <div className="text-3xl font-bold text-orange-900">
           {vehiclePerformance.turnover_metrics.average_days_to_sell}
          </div>
          <div className="text-sm text-gray-600">Average Days to Sell</div>
         </div>
         <div className="pt-2 border-t">
          <div className="text-sm font-medium text-gray-700">Stock Turnover Rate</div>
          <div className="text-2xl font-bold text-orange-800">
           {vehiclePerformance.turnover_metrics.stock_turnover_rate.toFixed(1)}x
          </div>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <TrendingUp className="h-5 w-5 text-green-600" />
         <span>Pricing Metrics</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div className="text-center">
          <div className="text-3xl font-bold text-green-900">
           {vehiclePerformance.pricing_metrics.average_markup.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Average Markup</div>
         </div>
         <div className="pt-2 border-t">
          <div className="text-sm font-medium text-gray-700">Pricing Accuracy</div>
          <div className="text-2xl font-bold text-green-800">
           {vehiclePerformance.pricing_metrics.pricing_accuracy}%
          </div>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <Shield className="h-5 w-5 text-purple-600" />
         <span>Quality Metrics</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div className="space-y-2">
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Warranty Cost Ratio</span>
           <span className="font-semibold">{vehiclePerformance.quality_metrics.warranty_cost_ratio}%</span>
          </div>
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Parts Cost Ratio</span>
           <span className="font-semibold">{vehiclePerformance.quality_metrics.parts_cost_ratio}%</span>
          </div>
          <div className="flex justify-between">
           <span className="text-sm text-gray-600">Return Rate</span>
           <span className="font-semibold">{vehiclePerformance.quality_metrics.return_rate}%</span>
          </div>
         </div>
        </div>
       </CardContent>
      </Card>
     </div>

     {/* Fastest & Slowest Selling Makes */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="premium-card">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <Zap className="h-5 w-5 text-green-600" />
         <span>Fastest Selling Makes</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         {vehiclePerformance.turnover_metrics.fastest_selling_makes?.map((item, index) => (
          <div key={item.make} className="flex items-center justify-between">
           <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
             {index + 1}
            </div>
            <span className="font-medium">{item.make}</span>
           </div>
           <div className="text-right">
            <div className="font-semibold">{item.avg_days} days</div>
            <div className="text-xs text-gray-500">{item.count} sold</div>
           </div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <AlertCircle className="h-5 w-5 text-red-600" />
         <span>Slowest Selling Makes</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         {vehiclePerformance.turnover_metrics.slowest_selling_makes?.map((item, index) => (
          <div key={item.make} className="flex items-center justify-between">
           <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
             {index + 1}
            </div>
            <span className="font-medium">{item.make}</span>
           </div>
           <div className="text-right">
            <div className="font-semibold">{item.avg_days} days</div>
            <div className="text-xs text-gray-500">{item.count} sold</div>
           </div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>
     </div>

     {/* Discount Analysis */}
     <Card className="premium-card">
      <CardHeader>
       <CardTitle>Discount Analysis</CardTitle>
      </CardHeader>
      <CardContent>
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {vehiclePerformance.pricing_metrics.discount_analysis?.map(item => (
         <div key={item.range} className="p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{item.range}</div>
          <div className="text-sm text-gray-600">{item.count} vehicles</div>
          <div className="text-sm font-medium text-orange-600">Avg: {item.avg_discount.toFixed(1)}%</div>
         </div>
        ))}
       </div>
      </CardContent>
     </Card>
    </div>
   )}

   {activeView === "executive" && executiveDashboard && (
    <div className="space-y-6">
     {/* Key Metrics Overview */}
     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card className="premium-card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
       <CardContent className="p-4">
        <div className="text-sm text-purple-700 font-medium">Inventory Value</div>
        <div className="text-2xl font-bold text-purple-900">
         £{(executiveDashboard.key_metrics.total_inventory_value || 0).toLocaleString()}
        </div>
       </CardContent>
      </Card>
      <Card className="premium-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
       <CardContent className="p-4">
        <div className="text-sm text-blue-700 font-medium">Monthly Revenue</div>
        <div className="text-2xl font-bold text-blue-900">
         £{(executiveDashboard.key_metrics.monthly_revenue || 0).toLocaleString()}
        </div>
       </CardContent>
      </Card>
      <Card className="premium-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
       <CardContent className="p-4">
        <div className="text-sm text-green-700 font-medium">Monthly Profit</div>
        <div className="text-2xl font-bold text-green-900">
         £{(executiveDashboard.key_metrics.monthly_profit || 0).toLocaleString()}
        </div>
       </CardContent>
      </Card>
      <Card className="premium-card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
       <CardContent className="p-4">
        <div className="text-sm text-amber-700 font-medium">YoY Growth</div>
        <div className="text-2xl font-bold text-amber-900">{executiveDashboard.key_metrics.yoy_growth}%</div>
       </CardContent>
      </Card>
      <Card className="premium-card bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
       <CardContent className="p-4">
        <div className="text-sm text-red-700 font-medium">Market Share</div>
        <div className="text-2xl font-bold text-red-900">{executiveDashboard.key_metrics.market_share}%</div>
       </CardContent>
      </Card>
     </div>

     {/* Strategic Insights */}
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="premium-card">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <TrendingUp className="h-5 w-5 text-green-600" />
         <span>Growth Opportunities</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         {executiveDashboard.strategic_insights.growth_opportunities?.map((opp, index) => (
          <div key={index} className="space-y-1">
           <div className="flex justify-between items-start">
            <span className="font-medium">{opp.area}</span>
            <Badge
             variant={
              opp.priority === "High" ? "destructive" : opp.priority === "Medium" ? "secondary" : "outline"
             }
             className="text-xs"
            >
             {opp.priority}
            </Badge>
           </div>
           <div className="text-sm text-gray-600">
            Potential: £{(opp.potential_value || 0).toLocaleString()}
           </div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <AlertTriangle className="h-5 w-5 text-amber-600" />
         <span>Risk Factors</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         {executiveDashboard.strategic_insights.risk_factors?.map((risk, index) => (
          <div key={index} className="space-y-1">
           <div className="flex justify-between items-start">
            <span className="font-medium">{risk.risk}</span>
            <Badge
             variant={
              risk.impact === "High" ? "destructive" : risk.impact === "Medium" ? "secondary" : "outline"
             }
             className="text-xs"
            >
             {risk.impact}
            </Badge>
           </div>
           <div className="text-xs text-gray-600">{risk.mitigation}</div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card">
       <CardHeader>
        <CardTitle className="flex items-center space-x-2">
         <Target className="h-5 w-5 text-purple-600" />
         <span>Competitive Position</span>
        </CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         <div>
          <div className="text-sm font-medium text-green-700">Strength</div>
          <div className="text-sm">
           {executiveDashboard.strategic_insights.competitive_position?.strength}
          </div>
         </div>
         <div>
          <div className="text-sm font-medium text-red-700">Weakness</div>
          <div className="text-sm">
           {executiveDashboard.strategic_insights.competitive_position?.weakness}
          </div>
         </div>
         <div>
          <div className="text-sm font-medium text-blue-700">Opportunity</div>
          <div className="text-sm">
           {executiveDashboard.strategic_insights.competitive_position?.opportunity}
          </div>
         </div>
        </div>
       </CardContent>
      </Card>
     </div>

     {/* Forecast & Inventory Needs */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="premium-card">
       <CardHeader>
        <CardTitle>3-Month Forecast</CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-4">
         <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-700">Revenue Forecast</div>
          <div className="text-2xl font-bold text-blue-900">
           £{(executiveDashboard.forecast.revenue_forecast_3m || 0).toLocaleString()}
          </div>
         </div>
         <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-sm text-green-700">Profit Forecast</div>
          <div className="text-2xl font-bold text-green-900">
           £{(executiveDashboard.forecast.profit_forecast_3m || 0).toLocaleString()}
          </div>
         </div>
        </div>
       </CardContent>
      </Card>

      <Card className="premium-card">
       <CardHeader>
        <CardTitle>Inventory Recommendations</CardTitle>
       </CardHeader>
       <CardContent>
        <div className="space-y-3">
         {executiveDashboard.forecast.inventory_needs?.slice(0, 5).map(need => (
          <div key={need.make} className="flex items-center justify-between">
           <span className="font-medium">{need.make}</span>
           <div className="flex items-center space-x-4">
            <div className="text-right">
             <div className="text-sm text-gray-600">Current</div>
             <div className="font-semibold">{need.current_stock}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <div className="text-right">
             <div className="text-sm text-gray-600">Recommended</div>
             <div className="font-semibold text-green-600">{need.recommended_stock}</div>
            </div>
           </div>
          </div>
         ))}
        </div>
       </CardContent>
      </Card>
     </div>

     {/* Sales Management Integration */}
     {salesManagement && (
      <div className="space-y-6">
       <Card className="premium-card">
        <CardHeader>
         <CardTitle>Sales Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
         <div className="overflow-x-auto">
          <table className="w-full">
           <thead>
            <tr className="text-left border-b">
             <th className="pb-2 text-sm font-medium text-gray-700">Salesperson</th>
             <th className="pb-2 text-sm font-medium text-gray-700 text-right">Sales</th>
             <th className="pb-2 text-sm font-medium text-gray-700 text-right">Revenue</th>
             <th className="pb-2 text-sm font-medium text-gray-700 text-right">Avg Deal</th>
             <th className="pb-2 text-sm font-medium text-gray-700 text-right">Conversion</th>
            </tr>
           </thead>
           <tbody>
            {salesManagement.sales_team_performance?.slice(0, 5).map(person => (
             <tr key={person.salesperson} className="border-b">
              <td className="py-2 font-medium">{person.salesperson}</td>
              <td className="py-2 text-right">{person.total_sales}</td>
              <td className="py-2 text-right">£{(person.revenue_generated || 0).toLocaleString()}</td>
              <td className="py-2 text-right">£{(person.average_deal_size || 0).toLocaleString()}</td>
              <td className="py-2 text-right">{person.conversion_rate}%</td>
             </tr>
            ))}
           </tbody>
          </table>
         </div>
        </CardContent>
       </Card>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card">
         <CardHeader>
          <CardTitle>Target Achievement</CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-4">
           <div className="text-center">
            <div className="text-3xl font-bold">
             {(salesManagement.target_achievement.achievement_percentage || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">of monthly target</div>
           </div>
           <div className="w-full bg-gray-200 rounded-full h-3">
            <div
             className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full"
             style={{
              width: `${Math.min(salesManagement.target_achievement.achievement_percentage || 0, 100)}%`,
             }}
            ></div>
           </div>
           <div className="text-sm text-center">
            <div>
             Current: £{(salesManagement.target_achievement.current_achievement || 0).toLocaleString()}
            </div>
            <div>Target: £{(salesManagement.target_achievement.monthly_target || 0).toLocaleString()}</div>
           </div>
          </div>
         </CardContent>
        </Card>

        <Card className="premium-card">
         <CardHeader>
          <CardTitle>Pipeline Value</CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-3">
           <div className="text-3xl font-bold text-center">
            £{(salesManagement.sales_pipeline_analysis.pipeline_value || 0).toLocaleString()}
           </div>
           <div className="space-y-2">
            <div className="flex justify-between text-sm">
             <span className="text-gray-600">Leads in Pipeline</span>
             <span className="font-semibold">
              {salesManagement.sales_pipeline_analysis.leads_in_pipeline}
             </span>
            </div>
            <div className="flex justify-between text-sm">
             <span className="text-gray-600">Conversion Forecast</span>
             <span className="font-semibold">
              {salesManagement.sales_pipeline_analysis.conversion_forecast}
             </span>
            </div>
            <div className="flex justify-between text-sm">
             <span className="text-gray-600">Avg Sales Cycle</span>
             <span className="font-semibold">
              {salesManagement.sales_pipeline_analysis.average_sales_cycle} days
             </span>
            </div>
           </div>
          </div>
         </CardContent>
        </Card>

        <Card className="premium-card">
         <CardHeader>
          <CardTitle>Pipeline Bottlenecks</CardTitle>
         </CardHeader>
         <CardContent>
          <div className="space-y-3">
           {salesManagement.sales_pipeline_analysis.bottlenecks?.map(bottleneck => (
            <div key={bottleneck.stage} className="space-y-1">
             <div className="flex justify-between">
              <span className="text-sm font-medium capitalize">{bottleneck.stage}</span>
              <span className="text-sm font-semibold">{bottleneck.stuck_count} leads</span>
             </div>
             <div className="text-xs text-gray-500">Avg: {bottleneck.avg_days} days</div>
            </div>
           ))}
          </div>
         </CardContent>
        </Card>
       </div>
      </div>
     )}
    </div>
   )}

   {/* AI Assistant Tab */}
   {activeView === "ai-assistant" && (
    <div className="space-y-4">
     <div className="bg-white rounded-lg border-0 shadow-sm p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
       <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
         <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
         <h2 className="text-lg font-semibold text-gray-900">AI Business Intelligence Assistant</h2>
         <p className="text-sm text-gray-600">
          Ask questions, generate reports, and get intelligent insights about your dealership data
         </p>
        </div>
       </div>
       <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-3 py-1">
        <Sparkles className="h-3 w-3 mr-1" />
        Powered by GPT-4
       </Badge>
      </div>

      <div className="h-[600px]">
       <AIBusinessIntelligence />
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
