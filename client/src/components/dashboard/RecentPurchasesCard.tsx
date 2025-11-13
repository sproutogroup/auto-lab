import { MetricCard } from "./MetricCard";
import { History } from "lucide-react";
import { RecentPurchase } from "@/types/dashboard";

interface RecentPurchasesCardProps {
 data: RecentPurchase[];
}

export function RecentPurchasesCard({ data }: RecentPurchasesCardProps) {
 return (
  <MetricCard title="Last 10 Vehicles Bought" icon={<History className="h-5 w-5 text-blue-600" />}>
   <div className="max-h-64 overflow-y-auto space-y-3">
    {data.length === 0 ? (
     <div className="text-center py-8 text-gray-500">
      <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
      <p className="text-sm">No recent purchases</p>
     </div>
    ) : (
     data.map((vehicle, index) => (
      <div
       key={index}
       className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
      >
       <span className="text-sm text-gray-700">{vehicle.vehicleName}</span>
       <span className="text-sm font-semibold text-gray-900">£{vehicle.price.toLocaleString()}</span>
      </div>
     ))
    )}
   </div>
  </MetricCard>
 );
}
