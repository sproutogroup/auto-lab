import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket, WebSocketRoom, WebSocketEvent } from "@/contexts/WebSocketContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StockByMakeCard } from "@/components/dashboard/StockByMakeCard";
import { RecentPurchasesCard } from "@/components/dashboard/RecentPurchasesCard";
import { SalesByMakeCard } from "@/components/dashboard/SalesByMakeCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock as ClockComponent } from "@/components/ui/Clock";
import { DashboardStats } from "@/types/dashboard";
import { PinBoard } from "@/components/PinBoard";
import {
 BarChart3,
 TrendingUp,
 Calendar,
 ShoppingBag,
 Truck,
 CreditCard,
 PlusCircle,
 Users,
 Activity,
 UserPlus,
 DollarSign,
 Star,
 Clock,
 Target,
 Award,
 UserCheck,
 Mail,
 Pin,
 StickyNote,
} from "lucide-react";

interface CustomerCrmStats {
 total_leads_mtd: number;
 active_leads: number;
 recent_interactions: number;
 appointments: number;
 new_leads: number;
 conversion_rate: number;
 hot_leads: number;
 top_priority_leads: number;
 top_leads: Array<{
  id: number;
  name: string;
  stage: string;
  priority: string;
  source: string;
  last_contact: string;
 }>;
 recent_activities: Array<{
  id: number;
  type: string;
  description: string;
  date: string;
  customer_name: string;
 }>;
}

export default function Dashboard() {
 const [activeTab, setActiveTab] = useState("overview");
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const { joinRoom, leaveRoom, subscribeToEvent, isConnected } = useWebSocket();

 const {
  data: stats,
  isLoading,
  error,
  refetch,
  dataUpdatedAt,
  isFetching,
 } = useQuery<DashboardStats>({
  queryKey: ["/api/dashboard/stats"],
  refetchInterval: 30 * 1000, // Reduced: Refetch every 30 seconds instead of 5
  refetchOnWindowFocus: true,
  staleTime: 10 * 1000, // Cache for 10 seconds to reduce unnecessary requests
 });

 // Simplified debug logging
 useEffect(() => {
  if (stats) {
   console.log("[Dashboard] Stock Summary:", {
    vehicles: stats.stockSummary?.totalVehicles,
    value: stats.stockSummary?.totalValue,
    updated: new Date(dataUpdatedAt).toLocaleTimeString(),
   });
  }
 }, [stats?.stockSummary, dataUpdatedAt]);

 // Fetch customer CRM statistics
 const { data: customerStats, isLoading: isLoadingCustomerStats } = useQuery<CustomerCrmStats>({
  queryKey: ["/api/customers/crm-stats"],
  enabled: activeTab === "customers",
 });

 // Simplified WebSocket subscriptions for vehicle updates only
 useEffect(() => {
  if (!isConnected) return;

  // Join essential rooms
  joinRoom(WebSocketRoom.DASHBOARD_UPDATES);
  joinRoom(WebSocketRoom.VEHICLE_UPDATES);

  // Single event handler for vehicle changes
  const unsubscribeVehicleEvents = subscribeToEvent(WebSocketEvent.VEHICLE_UPDATED, () => {
   console.log("[Dashboard] Vehicle updated - refreshing stats");
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  });

  const unsubscribeVehicleCreated = subscribeToEvent(WebSocketEvent.VEHICLE_CREATED, () => {
   console.log("[Dashboard] Vehicle created - refreshing stats");
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  });

  const unsubscribeVehicleDeleted = subscribeToEvent(WebSocketEvent.VEHICLE_DELETED, () => {
   console.log("[Dashboard] Vehicle deleted - refreshing stats");
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  });

  return () => {
   unsubscribeVehicleEvents();
   unsubscribeVehicleCreated();
   unsubscribeVehicleDeleted();
  };
 }, [isConnected, queryClient]);

 // Get current date formatted
 const currentDate = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
 });

 if (isLoading) {
  return (
   <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
    <div className="mb-4 lg:mb-6">
     <Skeleton className="h-6 lg:h-7 w-48 lg:w-64 mb-2" />
     <Skeleton className="h-4 lg:h-5 w-36 lg:w-48" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
     {[...Array(3)].map((_, i) => (
      <Card key={i} className="p-4 lg:p-6">
       <CardContent className="p-0">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-8 w-32" />
       </CardContent>
      </Card>
     ))}
    </div>
   </div>
  );
 }

 if (error) {
  return (
   <div className="p-4 lg:p-6">
    <div className="mb-4 lg:mb-6">
     <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-2">
      Welcome back, {user?.first_name || user?.username || "User"}
     </h2>
     <p className="text-sm lg:text-base text-gray-600">{currentDate}</p>
    </div>
    <div className="flex items-center justify-center h-48 lg:h-64">
     <div className="text-center">
      <p className="text-red-600 mb-2">Error loading dashboard data</p>
      <p className="text-sm text-gray-500">{error.message}</p>
     </div>
    </div>
   </div>
  );
 }

 const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GB", {
   style: "currency",
   currency: "GBP",
  }).format(amount);
 };

 const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
   day: "numeric",
   month: "short",
   year: "numeric",
  });
 };

 const getCustomerTypeColor = (type: string) => {
  switch (type) {
   case "active":
    return "bg-green-100 text-green-800 border-green-200";
   case "prospective":
    return "bg-blue-100 text-blue-800 border-blue-200";
   case "legacy":
    return "bg-gray-100 text-gray-800 border-gray-200";
   default:
    return "bg-gray-100 text-gray-800 border-gray-200";
  }
 };

 const getLeadStageColor = (stage: string) => {
  switch (stage) {
   case "new":
    return "bg-blue-100 text-blue-800 border-blue-200";
   case "contacted":
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
   case "qualified":
    return "bg-orange-100 text-orange-800 border-orange-200";
   case "test_drive_booked":
   case "test_drive_completed":
    return "bg-purple-100 text-purple-800 border-purple-200";
   case "negotiating":
    return "bg-red-100 text-red-800 border-red-200";
   case "deposit_taken":
   case "finance_pending":
    return "bg-indigo-100 text-indigo-800 border-indigo-200";
   case "converted":
    return "bg-green-100 text-green-800 border-green-200";
   case "lost":
    return "bg-gray-100 text-gray-800 border-gray-200";
   default:
    return "bg-gray-100 text-gray-800 border-gray-200";
  }
 };

 const renderOverviewContent = () => {
  if (!stats) {
   return (
    <div className="flex items-center justify-center h-64">
     <p className="text-gray-500">No dashboard data available</p>
    </div>
   );
  }

  return (
   <div className="space-y-6">
    {/* Overview Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
     {/* Stock Summary Card */}
     <MetricCard
      title="Stock Summary"
      icon={<BarChart3 className="h-5 w-5 text-red-600" />}
      className="col-span-1 lg:col-span-1"
     >
      <div className="grid grid-cols-3 gap-2 md:gap-4">
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
         Total Value
        </div>
        <div className="text-lg md:text-2xl font-bold text-gray-900 break-all">
         £
         {Number(stats.stockSummary.totalValue).toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
         })}
        </div>
       </div>
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Vehicles</div>
        <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.stockSummary.totalVehicles}</div>
       </div>
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Makes</div>
        <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.stockSummary.totalMakes}</div>
       </div>
      </div>
     </MetricCard>

     {/* Weekly Sales Card */}
     <MetricCard title="Weekly Sales" icon={<TrendingUp className="h-5 w-5 text-green-600" />}>
      <div className="space-y-3 md:space-y-4">
       <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div className="text-center">
         <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
          This Week
         </div>
         <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.weeklySales.thisWeek}</div>
        </div>
        <div className="text-center">
         <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
          Total Value
         </div>
         <div className="text-lg md:text-2xl font-bold text-green-600 break-all">
          £
          {Number(stats.weeklySales.thisWeekValue).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </div>
        </div>
       </div>
       <div className="pt-2 md:pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Week</span>
         <span className="text-sm md:text-lg font-bold text-gray-600 break-all">
          £
          {Number(stats.weeklySales.lastWeekValue).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </span>
        </div>
       </div>
      </div>
     </MetricCard>

     {/* Month-to-Date Sales Card */}
     <MetricCard title="Month-to-Date Sales" icon={<Calendar className="h-5 w-5 text-blue-600" />}>
      <div className="space-y-3 md:space-y-4">
       <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div className="text-center">
         <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
          This Month
         </div>
         <div className="text-lg md:text-2xl font-bold text-gray-900">{stats.monthlySales.thisMonth}</div>
        </div>
        <div className="text-center">
         <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
          Total Value
         </div>
         <div className="text-lg md:text-2xl font-bold text-blue-600 break-all">
          £
          {Number(stats.monthlySales.thisMonthValue).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </div>
        </div>
       </div>
       <div className="pt-2 md:pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</span>
         <span className="text-sm md:text-lg font-bold text-green-600 break-all">
          £
          {Number(stats.monthlySales.grossProfit).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </span>
        </div>
       </div>
      </div>
     </MetricCard>
    </div>

    {/* Secondary Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
     {/* Bought Summary */}
     <MetricCard title="Bought Summary (MTD)" icon={<ShoppingBag className="h-5 w-5 text-purple-600" />}>
      <div className="space-y-3 md:space-y-4">
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Vehicles</div>
        <div className="text-xl md:text-3xl font-bold text-gray-900">
         {stats.boughtSummary?.monthlyBought || 0}
        </div>
       </div>
       <div className="space-y-2 md:space-y-3 pt-2 md:pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Value</span>
         <span className="text-sm md:text-lg font-bold text-gray-900 break-all">
          £
          {Number(stats.boughtSummary?.monthlyBoughtValue || 0).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </span>
        </div>
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">PX Value</span>
         <span className="text-sm md:text-lg font-bold text-purple-600 break-all">
          £
          {Number(stats.boughtSummary?.monthlyPxValue || 0).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </span>
        </div>
       </div>
      </div>
     </MetricCard>

     {/* Cars Incoming */}
     <MetricCard title="Cars Incoming" icon={<Truck className="h-5 w-5 text-orange-600" />}>
      <div className="space-y-3 md:space-y-4">
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Vehicles</div>
        <div className="text-xl md:text-3xl font-bold text-gray-900">
         {stats.carsIncoming?.awdVehicles || 0}
        </div>
       </div>
       <div className="pt-2 md:pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Value</span>
         <span className="text-sm md:text-lg font-bold text-orange-600 break-all">
          £
          {Number(stats.carsIncoming?.awdTotalValue || 0).toLocaleString("en-GB", {
           minimumFractionDigits: 2,
           maximumFractionDigits: 2,
          })}
         </span>
        </div>
       </div>
      </div>
     </MetricCard>

     {/* Finance Sales */}
     <MetricCard title="Finance Sales (MTD)" icon={<CreditCard className="h-5 w-5 text-emerald-600" />}>
      <div className="grid grid-cols-2 gap-2 md:gap-4">
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Amount</div>
        <div className="text-lg md:text-2xl font-bold text-gray-900">
         {stats.financeSales?.monthlyFinanceAmount || 0}
        </div>
       </div>
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Value</div>
        <div className="text-lg md:text-2xl font-bold text-emerald-600 break-all">
         £
         {Number(stats.financeSales?.monthlyFinanceValue || 0).toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
         })}
        </div>
       </div>
      </div>
     </MetricCard>

     {/* DF Funded */}
     <MetricCard title="DF Funded" icon={<CreditCard className="h-5 w-5 text-indigo-600" />}>
      <div className="space-y-3 md:space-y-4">
       <div className="text-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 md:mb-2">
         Group Utilisation
        </div>
        <div className="text-xl md:text-3xl font-bold text-gray-900">
         {stats.dfFunded?.totalUtilisation?.toFixed(1) || 0}%
        </div>
       </div>
       <div className="pt-2 md:pt-3 border-t border-gray-100 space-y-2">
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Outstanding</span>
         <span className="text-sm md:text-lg font-bold text-indigo-600 break-all">
          £
          {Number(stats.dfFunded?.totalOutstanding || 0).toLocaleString("en-GB", {
           minimumFractionDigits: 0,
           maximumFractionDigits: 0,
          })}
         </span>
        </div>
        <div className="flex justify-between items-center">
         <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remaining</span>
         <span
          className={`text-sm md:text-lg font-bold break-all ${
           (stats.dfFunded?.remainingFacility || 0) < 0 ? "text-red-600" : "text-green-600"
          }`}
         >
          £
          {Number(stats.dfFunded?.remainingFacility || 0).toLocaleString("en-GB", {
           minimumFractionDigits: 0,
           maximumFractionDigits: 0,
          })}
         </span>
        </div>
       </div>
      </div>
     </MetricCard>
    </div>

    {/* Detailed Analytics */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {/* Stock by Make */}
     <StockByMakeCard data={stats.stockByMake} />

     {/* Sales by Make & Recent Purchases */}
     <div className="space-y-6">
      <SalesByMakeCard data={stats.salesByMake} />
      <RecentPurchasesCard data={stats.recentPurchases} />
     </div>
    </div>
   </div>
  );
 };

 const renderCustomersContent = () => {
  if (isLoadingCustomerStats) {
   return (
    <div className="space-y-6">
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
       <Card key={i} className="p-6">
        <CardContent className="p-0">
         <Skeleton className="h-4 w-24 mb-4" />
         <Skeleton className="h-8 w-32" />
        </CardContent>
       </Card>
      ))}
     </div>
    </div>
   );
  }

  // Use real customer data from the API
  return (
   <div className="space-y-6">
    {/* Customer CRM Statistics - Row 1 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Users className="h-4 w-4 text-blue-600" />
        Total Leads (MTD)
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">
        {customerStats?.total_leads_mtd?.toLocaleString() || 0}
       </div>
       <div className="text-gray-500 text-sm mt-1">New leads this month</div>
      </CardContent>
     </Card>

     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-green-600" />
        Active Leads
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">
        {customerStats?.active_leads?.toLocaleString() || 0}
       </div>
       <div className="text-gray-500 text-sm mt-1">In pipeline</div>
      </CardContent>
     </Card>

     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Mail className="h-4 w-4 text-purple-600" />
        Recent Interactions
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">
        {customerStats?.recent_interactions?.toLocaleString() || 0}
       </div>
       <div className="text-gray-500 text-sm mt-1">This week</div>
      </CardContent>
     </Card>

     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-orange-600" />
        Appointments
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">
        {customerStats?.appointments?.toLocaleString() || 0}
       </div>
       <div className="text-gray-500 text-sm mt-1">Scheduled</div>
      </CardContent>
     </Card>
    </div>

    {/* Customer CRM Statistics - Row 2 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-purple-600" />
        New Leads
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">{customerStats?.new_leads || 0}</div>
       <div className="text-gray-500 text-sm mt-1">This month</div>
      </CardContent>
     </Card>

     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Target className="h-4 w-4 text-orange-600" />
        Conversion Rate
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">{customerStats?.conversion_rate || 0}%</div>
       <div className="text-gray-500 text-sm mt-1">Lead conversion</div>
      </CardContent>
     </Card>

     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Star className="h-4 w-4 text-red-600" />
        Hot Leads
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">{customerStats?.hot_leads || 0}</div>
       <div className="text-gray-500 text-sm mt-1">High priority leads</div>
      </CardContent>
     </Card>

     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
       <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Clock className="h-4 w-4 text-red-600" />
        Top Priority Leads
       </CardTitle>
      </CardHeader>
      <CardContent>
       <div className="text-3xl font-bold text-gray-900">{customerStats?.top_priority_leads || 0}</div>
       <div className="text-gray-500 text-sm mt-1">High priority status</div>
      </CardContent>
     </Card>
    </div>

    {/* Top Customers and Recent Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
     {/* Top Leads */}
     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
       <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Award className="h-4 w-4 text-yellow-600" />
        Top Priority Leads
       </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
       <div className="space-y-3">
        {(customerStats?.top_leads || []).map((lead, index) => (
         <div
          key={lead.id}
          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
         >
          <div className="flex items-start gap-3">
           <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-semibold text-gray-700">{index + 1}</span>
           </div>
           <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 text-sm">{lead.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">
             Last contact: {lead.last_contact === "Never" ? "Invalid Date" : formatDate(lead.last_contact)}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Priority: {lead.priority}</div>
           </div>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
           <div className="text-xs font-medium text-gray-600 mb-1">{lead.source}</div>
           <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
            {lead.stage.replace("_", " ")}
           </Badge>
          </div>
         </div>
        ))}
        {(!customerStats?.top_leads || customerStats.top_leads.length === 0) && (
         <div className="text-center py-8 text-gray-500">
          <div className="text-sm">No lead data available yet</div>
         </div>
        )}
       </div>
      </CardContent>
     </Card>

     {/* Recent Activities */}
     <Card className="bg-white border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
       <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Clock className="h-4 w-4 text-blue-600" />
        Recent Activities
       </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
       <div className="space-y-3">
        {(customerStats?.recent_activities || []).map((activity, index) => (
         <div
          key={activity.id}
          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
         >
          <div className="flex items-start gap-3">
           <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <Users className="h-3 w-3 text-blue-600" />
           </div>
           <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 text-sm">{activity.customer_name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
             <Clock className="h-3 w-3" />
             {formatDate(activity.date)} - Lead Interaction
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{activity.description}</div>
           </div>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
           <Badge
            variant="outline"
            className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200"
           >
            Lead Interaction
           </Badge>
          </div>
         </div>
        ))}
        {(!customerStats?.recent_activities || customerStats.recent_activities.length === 0) && (
         <div className="text-center py-8 text-gray-500">
          <div className="text-sm">No recent activity data available</div>
         </div>
        )}
       </div>
      </CardContent>
     </Card>
    </div>
   </div>
  );
 };

 return (
  <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
   {/* Dashboard Welcome Section */}
   <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="text-center sm:text-left flex-1">
     <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">
      Welcome back, {user?.first_name || user?.username || "User"}
     </h2>
    </div>
    <div className="flex-shrink-0 flex justify-center sm:justify-end">
     <ClockComponent />
    </div>
   </div>

   {/* Tabbed Interface */}
   <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    <TabsList className="grid w-full grid-cols-3 mb-4 lg:mb-6">
     <TabsTrigger value="overview" className="flex items-center gap-2 text-sm lg:text-base">
      <Activity className="h-4 w-4" />
      <span className="hidden sm:inline">Overview</span>
     </TabsTrigger>
     <TabsTrigger value="customers" className="flex items-center gap-2 text-sm lg:text-base">
      <Users className="h-4 w-4" />
      <span className="hidden sm:inline">Customers</span>
     </TabsTrigger>
     <TabsTrigger value="pin-board" className="flex items-center gap-2 text-sm lg:text-base">
      <StickyNote className="h-4 w-4" />
      <span className="hidden sm:inline">Pin Board</span>
     </TabsTrigger>
    </TabsList>

    {/* Overview Tab */}
    <TabsContent value="overview" className="space-y-6 mt-0">
     {renderOverviewContent()}
    </TabsContent>

    {/* Customers Tab */}
    <TabsContent value="customers" className="space-y-6 mt-0">
     {renderCustomersContent()}
    </TabsContent>

    {/* Pin Board Tab */}
    <TabsContent value="pin-board" className="space-y-6 mt-0">
     <PinBoard />
    </TabsContent>
   </Tabs>
  </div>
 );
}
