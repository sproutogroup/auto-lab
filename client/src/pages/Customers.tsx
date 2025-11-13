import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
 Users,
 UserPlus,
 Search,
 Filter,
 Phone,
 Mail,
 MapPin,
 Calendar,
 Tag,
 TrendingUp,
 DollarSign,
 Eye,
 Edit,
 Trash2,
 Star,
 Clock,
 UserCheck,
 UserX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CustomerModal from "@/components/CustomerModal";

interface Customer {
 id: number;
 first_name: string;
 last_name: string;
 email: string;
 phone: string;
 mobile: string;
 address: string;
 city: string;
 county: string;
 postcode: string;
 notes: string;
 created_at: string;
 updated_at: string;
}

interface CustomerStats {
 totalCustomers: number;
 activeCustomers: number;
 prospectiveCustomers: number;
 legacyCustomers: number;
 totalSpent: number;
 averageSpent: number;
 topCustomers: Array<{
  id: number;
  name: string;
  totalSpent: number;
  totalPurchases: number;
 }>;
}

const customerTypeOptions = [
 {
  value: "all",
  label: "All Customers",
  color: "bg-gray-100 text-gray-800 border-gray-200",
 },
 {
  value: "prospective",
  label: "Prospective",
  color: "bg-blue-100 text-blue-800 border-blue-200",
 },
 {
  value: "active",
  label: "Active",
  color: "bg-green-100 text-green-800 border-green-200",
 },
 {
  value: "legacy",
  label: "Legacy",
  color: "bg-gray-100 text-gray-800 border-gray-200",
 },
];

export default function Customers() {
 const { toast } = useToast();
 const queryClient = useQueryClient();

 const [searchTerm, setSearchTerm] = useState("");
 const [filterType, setFilterType] = useState("all");
 const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
 const [modalMode, setModalMode] = useState<"add" | "edit">("add");
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [viewCustomer, setViewCustomer] = useState<Customer | undefined>();
 const [isViewModalOpen, setIsViewModalOpen] = useState(false);

 // Fetch customers with filtering
 const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
  queryKey: ["/api/customers", filterType, searchTerm],
  queryFn: async () => {
   const params = new URLSearchParams();
   if (filterType !== "all") params.append("type", filterType);
   if (searchTerm) params.append("search", searchTerm);

   const url = `/api/customers${params.toString() ? `?${params.toString()}` : ""}`;
   const response = await fetch(url);
   if (!response.ok) throw new Error("Failed to fetch customers");
   return await response.json();
  },
 });

 // Fetch customer statistics
 const { data: stats, isLoading: isLoadingStats } = useQuery<CustomerStats>({
  queryKey: ["/api/customers/stats"],
  queryFn: async () => {
   const response = await fetch("/api/customers/stats");
   if (!response.ok) throw new Error("Failed to fetch customer stats");
   return await response.json();
  },
 });

 // Fetch customer purchases data for purchase value calculation
 const { data: customerPurchases = [] } = useQuery({
  queryKey: ["/api/customer-purchases"],
  queryFn: async () => {
   const response = await fetch("/api/customer-purchases");
   if (!response.ok) throw new Error("Failed to fetch customer purchases");
   return await response.json();
  },
 });

 // Calculate purchase value for a customer using customer_purchases table
 const calculatePurchaseValue = (customer: Customer) => {
  const customerPurchasesList = customerPurchases.filter(
   (purchase: any) => purchase.customer_id === customer.id,
  );

  const totalPurchaseValue = customerPurchasesList.reduce((total: number, purchase: any) => {
   const purchasePrice = parseFloat(purchase.purchase_price) || 0;
   return total + purchasePrice;
  }, 0);

  return totalPurchaseValue;
 };

 // Delete customer mutation
 const deleteMutation = useMutation({
  mutationFn: async (customerId: number) => {
   const response = await fetch(`/api/customers/${customerId}`, {
    method: "DELETE",
   });
   if (!response.ok) throw new Error("Failed to delete customer");
   return await response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
   queryClient.invalidateQueries({ queryKey: ["/api/customers/stats"] });
   toast({
    title: "Success",
    description: "Customer deleted successfully",
   });
  },
  onError: () => {
   toast({
    title: "Error",
    description: "Failed to delete customer",
    variant: "destructive",
   });
  },
 });

 const handleAddCustomer = () => {
  setSelectedCustomer(undefined);
  setModalMode("add");
  setIsModalOpen(true);
 };

 const handleEditCustomer = (customer: Customer) => {
  setSelectedCustomer(customer);
  setModalMode("edit");
  setIsModalOpen(true);
 };

 const handleViewCustomer = (customer: Customer) => {
  setViewCustomer(customer);
  setIsViewModalOpen(true);
 };

 const handleDeleteCustomer = (customerId: number) => {
  deleteMutation.mutate(customerId);
 };

 const getCustomerTypeColor = (type: string) => {
  const option = customerTypeOptions.find(opt => opt.value === type);
  return option?.color || "bg-gray-100 text-gray-800 border-gray-200";
 };

 const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
 };

 const formatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", {
   style: "currency",
   currency: "GBP",
  }).format(num);
 };

 const getContactIcon = (method: string) => {
  switch (method) {
   case "email":
    return <Mail className="h-4 w-4" />;
   case "sms":
    return <Phone className="h-4 w-4" />;
   default:
    return <Phone className="h-4 w-4" />;
  }
 };

 const isFollowUpDue = (dateString: string) => {
  if (!dateString) return false;
  const followUpDate = new Date(dateString);
  const today = new Date();
  return followUpDate <= today;
 };

 if (isLoadingCustomers || isLoadingStats) {
  return (
   <div className="p-6 space-y-6">
    <div className="animate-pulse">
     <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
     <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[...Array(4)].map((_, i) => (
       <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
      ))}
     </div>
     <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
   </div>
  );
 }

 return (
  <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div>{/* Page title removed as it may be duplicated elsewhere */}</div>
   </div>

   {/* Statistics Cards - Mobile Optimized */}
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <Card className="border-l-4 border-l-gray-500 bg-white shadow-sm">
     <CardContent className="p-3 lg:p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-medium text-gray-600">Total Customers</p>
        <p className="text-lg font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
       </div>
       <Users className="h-4 w-4 text-gray-600" />
      </div>
     </CardContent>
    </Card>

    <Card className="border-l-4 border-l-red-500 bg-white shadow-sm">
     <CardContent className="p-3 lg:p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-medium text-gray-600">Active Customers</p>
        <p className="text-lg font-bold text-gray-900">{stats?.activeCustomers || 0}</p>
       </div>
       <UserCheck className="h-4 w-4 text-red-600" />
      </div>
     </CardContent>
    </Card>

    <Card className="border-l-4 border-l-green-500 bg-white shadow-sm">
     <CardContent className="p-3 lg:p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-medium text-gray-600">Total Revenue</p>
        <p className="text-lg font-bold text-gray-900">{formatCurrency(stats?.totalSpent || 0)}</p>
       </div>
       <DollarSign className="h-4 w-4 text-green-600" />
      </div>
     </CardContent>
    </Card>

    <Card className="border-l-4 border-l-blue-500 bg-white shadow-sm">
     <CardContent className="p-3 lg:p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-xs font-medium text-gray-600">Average Spent</p>
        <p className="text-lg font-bold text-gray-900">{formatCurrency(stats?.averageSpent || 0)}</p>
       </div>
       <TrendingUp className="h-4 w-4 text-blue-600" />
      </div>
     </CardContent>
    </Card>
   </div>

   {/* Filters and Search */}
   <Card className="shadow-sm border-gray-200 bg-white">
    <CardContent className="p-6">
     <div className="flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
       <Input
        placeholder="Search customers by name, email, or phone..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="pl-10 bg-white border-gray-200 focus:border-gray-400 focus:ring-gray-400"
       />
      </div>
      <div className="flex items-center gap-2">
       <Filter className="h-4 w-4 text-gray-500" />
       <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-48 bg-white border-gray-200">
         <SelectValue />
        </SelectTrigger>
        <SelectContent>
         {customerTypeOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
           {option.label}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>
      <Button onClick={handleAddCustomer} className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm">
       <UserPlus className="h-4 w-4 mr-2" />
       Add Customer
      </Button>
     </div>
    </CardContent>
   </Card>

   {/* Desktop Grid View */}
   <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
     <table className="w-full min-w-[600px]">
      <thead className="bg-gray-50 border-b border-gray-200">
       <tr>
        <th className="text-center p-2 font-semibold text-gray-900 text-xs">Name</th>
        <th className="text-center p-2 font-semibold text-gray-900 text-xs">Email</th>
        <th className="text-center p-2 font-semibold text-gray-900 text-xs">Phone</th>
        <th className="text-center p-2 font-semibold text-gray-900 text-xs">Purchase Value</th>
        <th className="text-center p-2 font-semibold text-gray-900 text-xs">Actions</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
       {isLoadingCustomers ? (
        <tr>
         <td colSpan={5} className="text-center py-8 text-gray-500 text-xs">
          Loading customers...
         </td>
        </tr>
       ) : customers.length === 0 ? (
        <tr>
         <td colSpan={5} className="text-center py-8 text-gray-500 text-xs">
          No customers found
         </td>
        </tr>
       ) : (
        customers
         .sort((a, b) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
         })
         .map((customer: Customer) => (
          <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-200">
           <td className="p-2 font-medium text-gray-900 text-center text-xs">
            {customer.first_name} {customer.last_name}
           </td>
           <td className="p-2 text-gray-700 text-center text-xs">{customer.email || "-"}</td>
           <td className="p-2 text-gray-700 text-center text-xs">
            {customer.phone || customer.mobile || "-"}
           </td>
           <td className="p-2 text-gray-700 text-center text-xs">
            £
            {calculatePurchaseValue(customer).toLocaleString("en-GB", {
             minimumFractionDigits: 2,
             maximumFractionDigits: 2,
            })}
           </td>
           <td className="p-2">
            <div className="flex justify-center gap-1">
             <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewCustomer(customer)}
              className="h-6 w-6 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
             >
              <Eye className="h-3 w-3" />
             </Button>
             <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditCustomer(customer)}
              className="h-6 w-6 p-0 text-gray-600 hover:text-green-600 hover:bg-green-50"
             >
              <Edit className="h-3 w-3" />
             </Button>
             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
               >
                <Trash2 className="h-3 w-3" />
               </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
               <AlertDialogHeader>
                <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                <AlertDialogDescription>
                 Are you sure you want to delete {customer.first_name} {customer.last_name}? This action
                 cannot be undone.
                </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                 onClick={() => handleDeleteCustomer(customer.id)}
                 className="bg-red-600 hover:bg-red-700"
                >
                 Delete
                </AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </td>
          </tr>
         ))
       )}
      </tbody>
     </table>
    </div>
   </div>

   {/* Mobile Card View */}
   <div className="md:hidden space-y-3">
    {isLoadingCustomers ? (
     <div className="text-center py-8 text-gray-500">Loading customers...</div>
    ) : customers.length === 0 ? (
     <div className="text-center py-8 text-gray-500">No customers found</div>
    ) : (
     customers
      .sort((a, b) => {
       const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
       const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
       return nameA.localeCompare(nameB);
      })
      .map((customer: Customer) => (
       <Card key={customer.id} className="p-3 hover:shadow-md transition-shadow">
        <div className="space-y-3">
         {/* Header */}
         <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
           <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-red-600" />
           </div>
           <div className="min-w-0">
            <div className="font-medium text-gray-900 text-sm">
             {customer.first_name} {customer.last_name}
            </div>
           </div>
          </div>
          <Badge className="bg-gray-100 text-gray-700 text-xs">converted</Badge>
         </div>

         {/* Details */}
         <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
           <span>Contact:</span>
           <span>{customer.email || customer.phone || customer.mobile || "No contact info"}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
           <span>Phone:</span>
           <span>{customer.phone || customer.mobile || "No phone"}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
           <span>Purchase Value:</span>
           <span className="font-medium text-green-600">
            £
            {calculatePurchaseValue(customer).toLocaleString("en-GB", {
             minimumFractionDigits: 2,
             maximumFractionDigits: 2,
            })}
           </span>
          </div>
         </div>

         {/* Quick Actions */}
         <div className="flex space-x-2 pt-2 border-t border-gray-100">
          <Button
           size="sm"
           variant="outline"
           onClick={() => handleViewCustomer(customer)}
           className="flex-1 h-8 text-xs"
          >
           <Eye className="w-3 h-3 mr-1" />
           View
          </Button>
          <Button
           size="sm"
           variant="outline"
           onClick={() => handleEditCustomer(customer)}
           className="flex-1 h-8 text-xs"
          >
           <Edit className="w-3 h-3 mr-1" />
           Edit
          </Button>
          <AlertDialog>
           <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" className="px-2 h-8">
             <Trash2 className="w-3 h-3" />
            </Button>
           </AlertDialogTrigger>
           <AlertDialogContent>
            <AlertDialogHeader>
             <AlertDialogTitle>Delete Customer</AlertDialogTitle>
             <AlertDialogDescription>
              Are you sure you want to delete {customer.first_name} {customer.last_name}? This action cannot
              be undone.
             </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction
              onClick={() => handleDeleteCustomer(customer.id)}
              className="bg-red-600 hover:bg-red-700"
             >
              Delete
             </AlertDialogAction>
            </AlertDialogFooter>
           </AlertDialogContent>
          </AlertDialog>
         </div>
        </div>
       </Card>
      ))
    )}
   </div>

   {/* Empty state for desktop - handled within grid */}
   {customers.length === 0 && !isLoadingCustomers && (
    <div className="hidden md:block">
     <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-12 text-center">
       <UserX className="h-16 w-16 text-gray-400 mx-auto mb-4" />
       <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers found</h3>
       <p className="text-gray-600 mb-6">
        {searchTerm || filterType !== "all"
         ? "Try adjusting your search or filter criteria"
         : "Get started by adding your first customer"}
       </p>
       {!searchTerm && filterType === "all" && (
        <Button onClick={handleAddCustomer} className="bg-red-600 hover:bg-red-700 text-white">
         <UserPlus className="h-4 w-4 mr-2" />
         Add Your First Customer
        </Button>
       )}
      </CardContent>
     </Card>
    </div>
   )}

   {/* Customer Modal */}
   <CustomerModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    customer={selectedCustomer}
    mode={modalMode}
   />

   {/* View Customer Modal */}
   <CustomerModal
    isOpen={isViewModalOpen}
    onClose={() => setIsViewModalOpen(false)}
    customer={viewCustomer}
    is_view_mode={true}
   />
  </div>
 );
}
