import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Clock,
 TrendingUp,
 TrendingDown,
 Calendar,
 DollarSign,
 AlertTriangle,
 CheckCircle,
 Search,
 Filter,
 Download,
 Gauge,
 PieChart,
 BarChart3,
 Target,
 Zap,
} from "lucide-react";

interface StockAgeAnalytics {
 stockAgeSummary: {
  totalStockVehicles: number;
  totalStockValue: number;
  averageAgeInStock: number;
  slowMovingStock: number;
  fastMovingStock: number;
 };
 ageDistribution: Array<{
  ageRange: string;
  count: number;
  totalValue: number;
  percentage: number;
 }>;
 stockDetails: Array<{
  id: number;
  stock_number: string;
  registration: string;
  make: string;
  model: string;
  derivative: string;
  colour: string;
  year: number;
  mileage: number;
  purchase_invoice_date: string;
  purchase_price_total: number;
  days_in_stock: number;
  carrying_cost_daily: number;
  total_carrying_cost: number;
  depreciation_risk: string;
 }>;
 makePerformance: Array<{
  make: string;
  totalVehicles: number;
  averageAge: number;
  totalValue: number;
  slowMovingCount: number;
 }>;
 costAnalysis: {
  totalCarryingCost: number;
  dailyCarryingCost: number;
  potentialSavings: number;
  highRiskValue: number;
 };
}

const MetricCard = ({
 title,
 value,
 subtitle,
 icon,
 trend,
 className = "",
}: {
 title: string;
 value: string | number;
 subtitle?: string;
 icon: React.ReactNode;
 trend?: "up" | "down" | "neutral";
 className?: string;
}) => (
 <Card className={`premium-card ${className}`}>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
   <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
   <div className="h-4 w-4 text-red-600">{icon}</div>
  </CardHeader>
  <CardContent>
   <div className="text-2xl font-bold text-gray-900">{value}</div>
   {subtitle && (
    <div className="flex items-center text-xs text-gray-500 mt-1">
     {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
     {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500 mr-1" />}
     {subtitle}
    </div>
   )}
  </CardContent>
 </Card>
);

const RiskBadge = ({ risk }: { risk: string }) => {
 const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
   case "low":
    return "bg-green-100 text-green-800 border-green-200";
   case "medium":
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
   case "high":
    return "bg-orange-100 text-orange-800 border-orange-200";
   case "critical":
    return "bg-red-100 text-red-800 border-red-200";
   default:
    return "bg-gray-100 text-gray-800 border-gray-200";
  }
 };

 return (
  <Badge variant="outline" className={`${getRiskColor(risk)} text-xs font-medium`}>
   {risk.charAt(0).toUpperCase() + risk.slice(1)}
  </Badge>
 );
};

export default function StockAge() {
 const [searchTerm, setSearchTerm] = useState("");
 const [selectedAgeRange, setSelectedAgeRange] = useState("all");
 const [selectedRisk, setSelectedRisk] = useState("all");

 const {
  data: analytics,
  isLoading,
  error,
 } = useQuery<StockAgeAnalytics>({
  queryKey: ["/api/stock-age/analytics"],
 });

 const filteredStockDetails = useMemo(() => {
  if (!analytics?.stockDetails) return [];

  return analytics.stockDetails.filter(vehicle => {
   const matchesSearch =
    searchTerm === "" ||
    vehicle.stock_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchTerm.toLowerCase());

   const matchesAgeRange =
    selectedAgeRange === "all" ||
    (selectedAgeRange === "0-30" && vehicle.days_in_stock <= 30) ||
    (selectedAgeRange === "31-60" && vehicle.days_in_stock > 30 && vehicle.days_in_stock <= 60) ||
    (selectedAgeRange === "61-90" && vehicle.days_in_stock > 60 && vehicle.days_in_stock <= 90) ||
    (selectedAgeRange === "91-180" && vehicle.days_in_stock > 90 && vehicle.days_in_stock <= 180) ||
    (selectedAgeRange === "180+" && vehicle.days_in_stock > 180);

   const matchesRisk = selectedRisk === "all" || vehicle.depreciation_risk === selectedRisk;

   return matchesSearch && matchesAgeRange && matchesRisk;
  });
 }, [analytics?.stockDetails, searchTerm, selectedAgeRange, selectedRisk]);

 const handleExport = () => {
  if (!filteredStockDetails.length) return;

  const csvHeaders = [
   "Stock Number",
   "Registration",
   "Make",
   "Model",
   "Derivative",
   "Colour",
   "Year",
   "Mileage",
   "Purchase Date",
   "Purchase Price",
   "Days in Stock",
   "Daily Carrying Cost",
   "Total Carrying Cost",
   "Risk Level",
  ];

  const csvData = filteredStockDetails.map(vehicle => [
   vehicle.stock_number,
   vehicle.registration,
   vehicle.make,
   vehicle.model,
   vehicle.derivative,
   vehicle.colour,
   vehicle.year,
   vehicle.mileage,
   vehicle.purchase_invoice_date,
   `£${vehicle.purchase_price_total.toLocaleString()}`,
   vehicle.days_in_stock,
   `£${vehicle.carrying_cost_daily}`,
   `£${vehicle.total_carrying_cost.toLocaleString()}`,
   vehicle.depreciation_risk,
  ]);

  const csvContent = [csvHeaders, ...csvData].map(row => row.map(field => `"${field}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-age-analysis-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
 };

 if (isLoading) {
  return (
   <div className="p-6 space-y-6">
    <div className="text-center py-12">
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
     <p className="mt-4 text-gray-600">Loading stock age analytics...</p>
    </div>
   </div>
  );
 }

 if (error || !analytics) {
  return (
   <div className="p-6 space-y-6">
    <Card className="premium-card">
     <CardContent className="p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <p className="text-gray-600">Unable to load stock age analytics</p>
     </CardContent>
    </Card>
   </div>
  );
 }

 return (
  <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
   {/* Page Controls - Mobile Optimized */}
   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
    <div className="flex items-center space-x-2">
     <div className="relative flex-1 sm:flex-none">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
       placeholder="Search vehicles..."
       value={searchTerm}
       onChange={e => setSearchTerm(e.target.value)}
       className="pl-10 w-full sm:w-64 h-12 sm:h-auto text-base sm:text-sm"
      />
     </div>
     <Button onClick={handleExport} variant="outline" size="sm" className="h-10 w-10 p-0">
      <Download className="h-4 w-4" />
     </Button>
    </div>
   </div>

   {/* Summary Cards */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
    <MetricCard
     title="Total Stock Vehicles"
     value={analytics.stockAgeSummary.totalStockVehicles}
     subtitle="Active inventory"
     icon={<Gauge />}
    />
    <MetricCard
     title="Total Stock Value"
     value={`£${analytics.stockAgeSummary.totalStockValue.toLocaleString()}`}
     subtitle="Purchase value"
     icon={<DollarSign />}
    />
    <MetricCard
     title="Average Age"
     value={`${analytics.stockAgeSummary.averageAgeInStock} days`}
     subtitle="Days in stock"
     icon={<Calendar />}
    />
    <MetricCard
     title="Slow Moving Stock"
     value={analytics.stockAgeSummary.slowMovingStock}
     subtitle="Over 90 days"
     icon={<AlertTriangle />}
     trend="down"
    />
    <MetricCard
     title="Fast Moving Stock"
     value={analytics.stockAgeSummary.fastMovingStock}
     subtitle="Under 30 days"
     icon={<Zap />}
     trend="up"
    />
   </div>

   {/* Cost Analysis Cards */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <MetricCard
     title="Total Carrying Cost"
     value={`£${analytics.costAnalysis.totalCarryingCost.toLocaleString()}`}
     subtitle="Accumulated cost"
     icon={<TrendingUp />}
     trend="down"
    />
    <MetricCard
     title="Daily Carrying Cost"
     value={`£${analytics.costAnalysis.dailyCarryingCost.toLocaleString()}`}
     subtitle="Per day cost"
     icon={<Calendar />}
    />
    <MetricCard
     title="High Risk Value"
     value={`£${analytics.costAnalysis.highRiskValue.toLocaleString()}`}
     subtitle="Vehicles at risk"
     icon={<AlertTriangle />}
     trend="down"
    />
    <MetricCard
     title="Potential Savings"
     value={`£${analytics.costAnalysis.potentialSavings.toLocaleString()}`}
     subtitle="From quick sales"
     icon={<Target />}
     trend="up"
    />
   </div>

   {/* Age Distribution and Make Performance */}
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Age Distribution */}
    <Card className="premium-card">
     <CardHeader>
      <CardTitle className="flex items-center gap-2">
       <PieChart className="h-5 w-5 text-red-600" />
       Age Distribution
      </CardTitle>
     </CardHeader>
     <CardContent>
      <div className="space-y-4">
       {analytics.ageDistribution.map((range, index) => (
        <div key={index} className="flex items-center justify-between">
         <div className="flex items-center space-x-3">
          <div
           className="w-3 h-3 rounded-full bg-red-600 opacity-80"
           style={{ opacity: 1 - index * 0.15 }}
          ></div>
          <span className="text-sm font-medium text-gray-700">{range.ageRange}</span>
         </div>
         <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">{range.count} vehicles</div>
          <div className="text-xs text-gray-500">
           £{range.totalValue.toLocaleString()} ({range.percentage}%)
          </div>
         </div>
        </div>
       ))}
      </div>
     </CardContent>
    </Card>

    {/* Make Performance */}
    <Card className="premium-card">
     <CardHeader>
      <CardTitle className="flex items-center gap-2">
       <BarChart3 className="h-5 w-5 text-red-600" />
       Make Performance
      </CardTitle>
     </CardHeader>
     <CardContent>
      <div className="space-y-4">
       {analytics.makePerformance.slice(0, 6).map((make, index) => (
        <div key={index} className="flex items-center justify-between">
         <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{make.make}</div>
          <div className="text-xs text-gray-500">
           {make.totalVehicles} vehicles • Avg {make.averageAge} days
          </div>
         </div>
         <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">£{make.totalValue.toLocaleString()}</div>
          {make.slowMovingCount > 0 && (
           <div className="text-xs text-red-600">{make.slowMovingCount} slow moving</div>
          )}
         </div>
        </div>
       ))}
      </div>
     </CardContent>
    </Card>
   </div>

   {/* Stock Details Table */}
   <Card className="premium-card">
    <CardHeader>
     <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <CardTitle className="flex items-center gap-2">
       <Clock className="h-5 w-5 text-red-600" />
       Stock Details ({filteredStockDetails.length} vehicles)
      </CardTitle>

      {/* Mobile Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
       <div className="relative flex-1 sm:flex-none">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
         placeholder="Search vehicles..."
         value={searchTerm}
         onChange={e => setSearchTerm(e.target.value)}
         className="pl-10 w-full sm:w-64 h-12 sm:h-auto text-base sm:text-sm"
        />
       </div>

       {/* Mobile Filter Controls */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row">
         <label className="text-xs font-medium text-gray-600 mb-1 sm:hidden">Age Range</label>
         <select
          value={selectedAgeRange}
          onChange={e => setSelectedAgeRange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-3 sm:py-2 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto h-12 sm:h-auto"
         >
          <option value="all">All Ages</option>
          <option value="0-30">0-30 days</option>
          <option value="31-60">31-60 days</option>
          <option value="61-90">61-90 days</option>
          <option value="91-180">91-180 days</option>
          <option value="180+">180+ days</option>
         </select>
        </div>

        <div className="flex flex-col sm:flex-row">
         <label className="text-xs font-medium text-gray-600 mb-1 sm:hidden">Risk Level</label>
         <select
          value={selectedRisk}
          onChange={e => setSelectedRisk(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-3 sm:py-2 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-auto h-12 sm:h-auto"
         >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
          <option value="critical">Critical Risk</option>
         </select>
        </div>
       </div>
      </div>
     </div>
    </CardHeader>
    <CardContent>
     <div className="overflow-x-auto stock-age-mobile-table">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-gray-200">
         <th className="text-center py-3 px-2 font-medium text-gray-700">Vehicle</th>
         <th className="text-center py-3 px-2 font-medium text-gray-700">Details</th>
         <th className="text-center py-3 px-2 font-medium text-gray-700">Purchase</th>
         <th className="text-center py-3 px-2 font-medium text-gray-700">Age</th>
         <th className="text-center py-3 px-2 font-medium text-gray-700">Carrying Cost</th>
         <th className="text-center py-3 px-2 font-medium text-gray-700">Risk</th>
        </tr>
       </thead>
       <tbody>
        {filteredStockDetails.map((vehicle, index) => (
         <tr
          key={vehicle.id}
          className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
         >
          <td className="py-3 px-2 text-center">
           <div>
            <div className="font-medium text-gray-900">{vehicle.stock_number}</div>
            <div className="text-xs text-gray-500">{vehicle.registration}</div>
           </div>
          </td>
          <td className="py-3 px-2 text-center">
           <div>
            <div className="font-medium text-gray-900">
             {vehicle.make} {vehicle.model}
            </div>
            <div className="text-xs text-gray-500">
             {vehicle.year} • {vehicle.mileage?.toLocaleString()} mi • {vehicle.colour}
            </div>
           </div>
          </td>
          <td className="py-3 px-2 text-center">
           <div>
            <div className="font-medium text-gray-900">£{vehicle.purchase_price_total.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{vehicle.purchase_invoice_date}</div>
           </div>
          </td>
          <td className="py-3 px-2 text-center">
           <div>
            <div className="font-medium text-gray-900">{vehicle.days_in_stock} days</div>
            <div className="text-xs text-gray-500">
             {vehicle.days_in_stock > 90 ? "🔴 Slow" : vehicle.days_in_stock < 30 ? "🟢 Fast" : "🟡 Normal"}
            </div>
           </div>
          </td>
          <td className="py-3 px-2 text-center">
           <div>
            <div className="font-medium text-gray-900">£{vehicle.total_carrying_cost.toLocaleString()}</div>
            <div className="text-xs text-gray-500">£{vehicle.carrying_cost_daily}/day</div>
           </div>
          </td>
          <td className="py-3 px-2 text-center">
           <RiskBadge risk={vehicle.depreciation_risk} />
          </td>
         </tr>
        ))}
       </tbody>
      </table>
      {filteredStockDetails.length === 0 && (
       <div className="text-center py-8 text-gray-500">No vehicles match the current filters</div>
      )}
     </div>
    </CardContent>
   </Card>
  </div>
 );
}
