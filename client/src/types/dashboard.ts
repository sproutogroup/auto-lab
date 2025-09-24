export interface DashboardStats {
  stockSummary: {
    totalValue: number;
    totalVehicles: string;
    totalMakes: number;
  };
  weeklySales: {
    thisWeek: string;
    thisWeekValue: number;
    lastWeek: string;
    lastWeekValue: number;
  };
  monthlySales: {
    thisMonth: string;
    thisMonthValue: number;
    grossProfit: number;
  };
  boughtSummary: {
    monthlyBought: string;
    monthlyBoughtValue: number;
    monthlyPxValue: number;
  };
  carsIncoming: {
    awdVehicles: string;
    awdTotalValue: number;
  };
  financeSales: {
    monthlyFinanceAmount: string;
    monthlyFinanceValue: number;
  };
  dfFunded: {
    totalBudget: number;
    totalOutstanding: number;
    totalUtilisation: number;
    remainingFacility: number;
  };
  stockByMake: Array<{
    makeName: string;
    count: string;
    value: number;
  }>;
  recentPurchases: Array<{
    vehicleName: string;
    price: number;
    date: Date;
  }>;
  salesByMake: Array<{
    makeName: string;
    soldCount: string;
  }>;
}

export interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export interface StockByMakeItem {
  makeName: string;
  count: number;
  value: number;
}

export interface RecentPurchase {
  vehicleName: string;
  price: number;
  date: Date;
}

export interface SalesByMakeItem {
  makeName: string;
  soldCount: number;
}
