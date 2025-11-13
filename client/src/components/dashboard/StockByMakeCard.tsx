import { MetricCard } from "./MetricCard";
import { Car } from "lucide-react";
import { StockByMakeItem } from "@/types/dashboard";

interface StockByMakeCardProps {
 data: StockByMakeItem[];
}

export function StockByMakeCard({ data }: StockByMakeCardProps) {
 return (
  <MetricCard title="Stock by Make" icon={<Car className="h-5 w-5 text-gray-600" />}>
   <div className="space-y-2">
    {data.length === 0 ? (
     <div className="text-center py-6 text-gray-500">
      <Car className="h-10 w-10 mx-auto mb-2 text-gray-300" />
      <p className="text-sm">No stock data available</p>
     </div>
    ) : (
     data.map((item, index) => (
      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
       <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
         <Car className="h-3 w-3 text-gray-600" />
        </div>
        <span className="font-medium text-gray-900 text-sm">{item.makeName}</span>
       </div>
       <div className="text-right">
        <div className="text-sm font-semibold text-gray-900">{item.count} units</div>
        <div className="text-xs text-gray-500">£{item.value.toLocaleString()}</div>
       </div>
      </div>
     ))
    )}
   </div>
  </MetricCard>
 );
}
