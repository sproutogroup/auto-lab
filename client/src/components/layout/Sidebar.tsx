import { Link, useLocation } from "wouter";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
 Car,
 ChevronLeft,
 ChevronRight,
 BarChart3,
 Archive,
 Warehouse,
 Clock,
 ShoppingCart,
 Users,
 UserPlus,
 Calendar,
 CheckSquare,
 FileText,
 Receipt,
 File,
 FileDown,
 CalendarDays,
 History,
 BarChart,
 Settings,
 LogOut,
 Package,
 FileSpreadsheet,
 User,
 Bell,
 Bug,
} from "lucide-react";

const navigationItems = [
 {
  section: "OVERVIEW",
  items: [{ id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/" }],
 },
 {
  section: "VEHICLES",
  items: [
   {
    id: "vehicle-master",
    label: "Vehicle Master",
    icon: Car,
    path: "/vehicle-master",
   },
   {
    id: "sold-stock",
    label: "Sold Stock",
    icon: Package,
    path: "/sold-stock",
   },
   {
    id: "current-stock",
    label: "Current Stock",
    icon: Warehouse,
    path: "/current-stock",
   },
   { id: "stock-age", label: "Stock Age", icon: Clock, path: "/stock-age" },
   {
    id: "bought-vehicles",
    label: "Bought Vehicles",
    icon: ShoppingCart,
    path: "/bought-vehicles",
   },
  ],
 },
 {
  section: "SALES",
  items: [
   { id: "customers", label: "Customers", icon: Users, path: "/customers" },
   { id: "leads", label: "Leads", icon: UserPlus, path: "/leads" },
   {
    id: "appointments",
    label: "Appointments",
    icon: Calendar,
    path: "/appointments",
   },
   { id: "tasks", label: "Tasks", icon: CheckSquare, path: "/tasks" },
  ],
 },
 {
  section: "DOCUMENTS",
  items: [
   {
    id: "purchase-invoices",
    label: "Purchase Invoices",
    icon: FileText,
    path: "/purchase-invoices",
   },
   {
    id: "sales-invoices",
    label: "Sales Invoices",
    icon: Receipt,
    path: "/sales-invoices",
   },
   {
    id: "collection-forms",
    label: "Collection Forms",
    icon: File,
    path: "/collection-forms",
   },
   {
    id: "pdf-templates",
    label: "PDF Templates",
    icon: FileDown,
    path: "/pdf-templates",
   },
  ],
 },
 {
  section: "MANAGEMENT",
  items: [
   { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
   {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    path: "/schedule",
   },
   {
    id: "job-history",
    label: "Job History",
    icon: History,
    path: "/job-history",
   },
  ],
 },
 {
  section: "ANALYSIS",
  items: [{ id: "reports", label: "Reports", icon: BarChart, path: "/reports" }],
 },
 {
  section: "SYSTEM",
  items: [
   { id: "users", label: "Users", icon: Settings, path: "/users" },
   {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    path: "/notifications",
   },
   ...(process.env.NODE_ENV === "development"
    ? [{ id: "debug", label: "Debug", icon: Bug, path: "/debug" }]
    : []),
  ],
 },
];

export function Sidebar() {
 const { isCollapsed, toggleSidebar } = useSidebar();
 const { user, logoutMutation } = useAuth();
 const { hasPermission, isLoading: permissionsLoading } = usePermissions();
 const [location] = useLocation();

 // Show all items for admin users or while permissions are loading
 const filteredNavigationItems =
  !user || user.role === "admin" || permissionsLoading
   ? navigationItems
   : navigationItems
      .filter(section => {
       return section.items.some(item => hasPermission(item.id));
      })
      .map(section => ({
       ...section,
       items: section.items.filter(item => hasPermission(item.id)),
      }));

 const getRoleBadgeColor = (role: string) => {
  switch (role) {
   case "admin":
    return "bg-red-100 text-red-800";
   case "manager":
    return "bg-blue-100 text-blue-800";
   case "salesperson":
    return "bg-green-100 text-green-800";
   default:
    return "bg-gray-100 text-gray-800";
  }
 };

 const handleLogout = () => {
  logoutMutation.mutate();
 };

 return (
  <>
   {/* Mobile Backdrop */}
   {!isCollapsed && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={toggleSidebar} />}

   {/* Sidebar */}
   <aside
    className={cn(
     "bg-white shadow-lg border-r border-gray-100 transition-all duration-300 ease-in-out flex flex-col h-full",
     // Mobile: Fixed positioning, full height, transform based on state
     "fixed inset-y-0 left-0 z-50 w-64 lg:relative lg:w-auto lg:z-auto lg:h-screen",
     // Mobile transform
     isCollapsed ? "transform -translate-x-full lg:translate-x-0" : "transform translate-x-0",
     // Desktop sizing
     isCollapsed ? "lg:w-16" : "lg:w-64",
    )}
   >
    {/* Sidebar Header */}
    <div className="px-4 py-5 border-b border-gray-100 flex-shrink-0">
     <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
       {!isCollapsed && (
        <>
         <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
          <Car className="text-white h-4 w-4" />
         </div>
         <span className="text-lg font-bold text-gray-900 whitespace-nowrap">Autolab UK</span>
        </>
       )}
      </div>
      <Button
       variant="ghost"
       size="sm"
       onClick={toggleSidebar}
       className="p-1.5 rounded-md hover:bg-gray-100 transition-colors hidden lg:flex flex-shrink-0"
      >
       {isCollapsed ? (
        <ChevronRight className="h-3 w-3 text-gray-500" />
       ) : (
        <ChevronLeft className="h-3 w-3 text-gray-500" />
       )}
      </Button>
     </div>
    </div>

    {/* Navigation Menu */}
    <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
     <div className="space-y-1 px-3">
      {filteredNavigationItems.map(section => (
       <div key={section.section} className="space-y-1">
        {section.section !== "OVERVIEW" && !isCollapsed && (
         <div className="pt-4 pb-2">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
           {section.section}
          </h3>
         </div>
        )}
        <div className="space-y-1">
         {section.items.map(item => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
           <Link key={item.id} href={item.path}>
            <div
             className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 group",
              isActive
               ? "bg-red-50 text-red-600 shadow-sm"
               : "text-gray-700 hover:text-gray-900 hover:bg-gray-50",
             )}
            >
             <Icon
              className={cn(
               "h-4 w-4 flex-shrink-0 transition-colors",
               isActive ? "text-red-600" : "text-gray-500 group-hover:text-gray-700",
              )}
             />
             {!isCollapsed && <span className="ml-3 truncate">{item.label}</span>}
            </div>
           </Link>
          );
         })}
        </div>
       </div>
      ))}
     </div>
    </nav>

    {/* User Info & Logout Section */}
    <div className="border-t border-gray-100 px-3 py-3 flex-shrink-0">
     {!isCollapsed ? (
      <div className="space-y-2">
       {/* User Information */}
       <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
        <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
         <User className="h-3 w-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
         <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
        </div>
       </div>

       {/* Logout Button */}
       <Button
        variant="ghost"
        onClick={handleLogout}
        disabled={logoutMutation.isPending}
        className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50 h-9"
       >
        <LogOut className="h-4 w-4 mr-3" />
        {logoutMutation.isPending ? "Logging out..." : "Logout"}
       </Button>
      </div>
     ) : (
      <div className="flex flex-col space-y-2">
       <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={logoutMutation.isPending}
        className="w-full justify-center text-gray-700 hover:text-red-600 hover:bg-red-50 h-9"
       >
        <LogOut className="h-4 w-4" />
       </Button>
      </div>
     )}
    </div>
   </aside>
  </>
 );
}
