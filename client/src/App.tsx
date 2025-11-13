import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/hooks/useSidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { pushNotificationManager } from "@/lib/pushNotifications";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { ConnectionStatusBanner } from "@/components/WebSocketIndicator";
import { NotificationProvider } from "@/components/NotificationProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

// Permission Guard Component for individual pages
function PermissionGuard({
 children,
 pageKey,
 requiredRole,
}: {
 children: React.ReactNode;
 pageKey?: string;
 requiredRole?: "admin" | "manager" | "salesperson";
}) {
 const { user } = useAuth();
 const { hasPermission } = usePermissions();

 // Admin bypass with proper audit logging
 if (user?.role === "admin") {
  // Log admin access for security audit (server-side logging would be better)
  if (pageKey) {
   // Send audit log to server for proper tracking
   fetch("/api/admin/audit-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
     action: "page_access",
     page_key: pageKey,
     user_id: user.id,
     username: user.username,
     timestamp: new Date().toISOString(),
     bypass_reason: "admin_role",
    }),
   }).catch(err => console.error("Audit log failed:", err));
  }
  return <>{children}</>;
 }

 // Role check
 if (requiredRole) {
  const roleHierarchy = {
   salesperson: 1,
   manager: 2,
   admin: 3,
  };
  const userLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole];
  if (userLevel < requiredLevel) {
   return (
    <div className="flex items-center justify-center min-h-screen">
     <div className="text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
      <p className="text-muted-foreground">You don't have permission to access this page.</p>
     </div>
    </div>
   );
  }
 }

 // Permission check
 if (pageKey && !hasPermission(pageKey)) {
  return (
   <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
     <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
     <p className="text-gray-600">You don't have permission to access this page.</p>
    </div>
   </div>
  );
 }

 return <>{children}</>;
}
import { Loader2 } from "lucide-react";
import DealerGPTAssistant from "@/components/DealerGPTAssistant";

// Pages
import Dashboard from "@/pages/Dashboard";
import VehicleMaster from "@/pages/VehicleMaster";
import StockSummary from "@/pages/StockSummary";
import SoldStock from "@/pages/SoldStock";
import CurrentStock from "@/pages/CurrentStock";
import StockAge from "@/pages/StockAge";
import BoughtVehicles from "@/pages/BoughtVehicles";
import Customers from "@/pages/Customers";
import Leads from "@/pages/Leads";
import Appointments from "@/pages/Appointments";
import Tasks from "@/pages/Tasks";
import PurchaseInvoice from "@/pages/PurchaseInvoice";
import SalesInvoice from "@/pages/SalesInvoice";
import CollectionForms from "@/pages/CollectionForms";
import PdfTemplates from "@/pages/PdfTemplates";
import Calendar from "@/pages/Calendar";
import Schedule from "@/pages/Schedule";
import JobHistory from "@/pages/JobHistory";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import NotificationManagement from "@/pages/NotificationManagement";
import ServiceWorkerTestPage from "@/pages/ServiceWorkerTest";
import DebugPage from "@/pages/Debug";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

function ProtectedRouter() {
 return (
  <ProtectedRoute>
   <Switch>
    <Route path="/">
     <PermissionGuard pageKey="dashboard">
      <Dashboard />
     </PermissionGuard>
    </Route>
    <Route path="/vehicle-master">
     <PermissionGuard pageKey="vehicle-master">
      <VehicleMaster />
     </PermissionGuard>
    </Route>
    <Route path="/stock-summary">
     <PermissionGuard pageKey="stock-summary">
      <StockSummary />
     </PermissionGuard>
    </Route>
    <Route path="/sold-stock">
     <PermissionGuard pageKey="sold-stock">
      <SoldStock />
     </PermissionGuard>
    </Route>
    <Route path="/current-stock">
     <PermissionGuard pageKey="current-stock">
      <CurrentStock />
     </PermissionGuard>
    </Route>
    <Route path="/stock-age">
     <PermissionGuard pageKey="stock-age">
      <StockAge />
     </PermissionGuard>
    </Route>
    <Route path="/bought-vehicles">
     <PermissionGuard pageKey="bought-vehicles">
      <BoughtVehicles />
     </PermissionGuard>
    </Route>
    <Route path="/customers">
     <PermissionGuard pageKey="customers">
      <Customers />
     </PermissionGuard>
    </Route>
    <Route path="/leads">
     <PermissionGuard pageKey="leads">
      <Leads />
     </PermissionGuard>
    </Route>
    <Route path="/appointments">
     <PermissionGuard pageKey="appointments">
      <Appointments />
     </PermissionGuard>
    </Route>
    <Route path="/tasks">
     <PermissionGuard pageKey="tasks">
      <Tasks />
     </PermissionGuard>
    </Route>
    <Route path="/purchase-invoices">
     <PermissionGuard pageKey="purchase-invoices">
      <PurchaseInvoice />
     </PermissionGuard>
    </Route>
    <Route path="/sales-invoices">
     <PermissionGuard pageKey="sales-invoices">
      <SalesInvoice />
     </PermissionGuard>
    </Route>
    <Route path="/collection-forms">
     <PermissionGuard pageKey="collection-forms">
      <CollectionForms />
     </PermissionGuard>
    </Route>
    <Route path="/pdf-templates">
     <PermissionGuard pageKey="pdf-templates">
      <PdfTemplates />
     </PermissionGuard>
    </Route>
    <Route path="/calendar">
     <PermissionGuard pageKey="calendar">
      <Calendar />
     </PermissionGuard>
    </Route>
    <Route path="/schedule">
     <PermissionGuard pageKey="schedule">
      <Schedule />
     </PermissionGuard>
    </Route>
    <Route path="/job-history">
     <PermissionGuard pageKey="job-history">
      <JobHistory />
     </PermissionGuard>
    </Route>
    <Route path="/reports">
     <PermissionGuard pageKey="reports" requiredRole="manager">
      <Reports />
     </PermissionGuard>
    </Route>
    <Route path="/users">
     <PermissionGuard pageKey="users" requiredRole="admin">
      <Users />
     </PermissionGuard>
    </Route>
    <Route path="/notifications">
     <PermissionGuard pageKey="notifications" requiredRole="admin">
      <NotificationManagement />
     </PermissionGuard>
    </Route>
    <Route path="/service-worker-test">
     <ServiceWorkerTestPage />
    </Route>
    <Route path="/debug">
     <DebugPage />
    </Route>
    <Route component={NotFound} />
   </Switch>
  </ProtectedRoute>
 );
}

function AppContent() {
 const { user, isLoading } = useAuth();

 if (isLoading) {
  return (
   <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
   </div>
  );
 }

 if (!user) {
  return <AuthPage />;
 }

 return (
  <SidebarProvider>
   <div className="flex h-screen overflow-hidden bg-gray-50">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
     <Header />
     <main className="flex-1 overflow-auto bg-gray-50">
      <ProtectedRouter />
     </main>
    </div>
   </div>
   {/* PWA Components */}
   <OfflineIndicator />
   <InstallPrompt />
   {/* DealerGPT Assistant */}
   <DealerGPTAssistant />
  </SidebarProvider>
 );
}

function App() {
 return (
  <ErrorBoundary>
   <QueryClientProvider client={queryClient}>
    <TooltipProvider>
     <PWAProvider>
      <AuthProvider>
       <WebSocketProvider>
        <NotificationProvider>
         <AppContent />
         <Toaster />
        </NotificationProvider>
       </WebSocketProvider>
      </AuthProvider>
     </PWAProvider>
    </TooltipProvider>
   </QueryClientProvider>
  </ErrorBoundary>
 );
}

export default App;
