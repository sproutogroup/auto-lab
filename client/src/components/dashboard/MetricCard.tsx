import { cn } from "@/lib/utils";
import { MetricCardProps } from "@/types/dashboard";

export function MetricCard({
  title,
  icon,
  children,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "premium-card metric-card rounded-xl p-3 md:p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3 md:mb-6">
        <h3 className="text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {title}
        </h3>
        <div className="p-1.5 md:p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      {children}
    </div>
  );
}
