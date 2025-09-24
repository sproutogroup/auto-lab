import { MetricCard } from "./MetricCard";
import { PieChart } from "lucide-react";
import { SalesByMakeItem } from "@/types/dashboard";

interface SalesByMakeCardProps {
  data: SalesByMakeItem[];
}

export function SalesByMakeCard({ data }: SalesByMakeCardProps) {
  return (
    <MetricCard
      title="Sales by Make"
      icon={<PieChart className="h-5 w-5 text-green-600" />}
    >
      <div className="max-h-64 overflow-y-auto space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No sales data available</p>
          </div>
        ) : (
          data.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                {item.makeName}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {item.soldCount} sold
              </span>
            </div>
          ))
        )}
      </div>
    </MetricCard>
  );
}
