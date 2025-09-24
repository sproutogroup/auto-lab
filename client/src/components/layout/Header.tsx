import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useSidebar } from "@/hooks/useSidebar";
import { NetworkStatusIndicator } from "@/components/pwa/OfflineIndicator";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { useAuth } from "@/hooks/use-auth";
import { WebSocketIndicator } from "@/components/WebSocketIndicator";
import { Menu } from "lucide-react";

// Page title mapping
const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/vehicle-master": "Vehicle Master",
  "/sold-stock": "Sold Stock",
  "/current-stock": "Current Stock",
  "/autolab-stock": "Autolab Stock",
  "/stock-age": "Stock Age",
  "/bought-vehicles": "Bought Vehicles",
  "/customers": "Customers",
  "/leads": "Leads",
  "/appointments": "Appointments",
  "/tasks": "Tasks",
  "/purchase-invoices": "Purchase Invoices",
  "/sales-invoices": "Sales Invoices",
  "/collection-forms": "Collection Forms",
  "/pdf-templates": "PDF Templates",
  "/calendar": "Calendar",
  "/schedule": "Schedule",
  "/job-history": "Job History",
  "/reports": "Reports",
  "/users": "Users",
};

export function Header() {
  const { toggleSidebar } = useSidebar();
  const [location] = useLocation();
  const { user } = useAuth();

  // Get current page title
  const pageTitle = pageTitles[location] || "Dashboard";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4 flex-1 min-w-0">
          {/* Sidebar Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation lg:hidden"
          >
            <Menu className="h-5 w-5 text-gray-500" />
          </Button>
          <h1 className="text-lg lg:text-2xl font-semibold text-gray-900 truncate">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
          {/* PWA Network Status */}
          <NetworkStatusIndicator />

          {/* WebSocket Connection Status */}
          <WebSocketIndicator />

          {/* Push Notifications */}
          {user && <PushNotificationButton userId={user.id} />}
        </div>
      </div>
    </header>
  );
}
