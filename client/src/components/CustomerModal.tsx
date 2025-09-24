import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  Car,
  CreditCard,
  Search,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Vehicle, User as UserType } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface CustomerPurchase {
  id: number;
  customer_id: number;
  vehicle_id: number;
  salesperson_id?: number;
  purchase_date: string;
  purchase_price: number;
  finance_amount: number;
  deposit_amount: number;
  trade_in_value: number;
  finance_provider?: string;
  finance_type?: string;
  payment_method: string;
  warranty_included: boolean;
  warranty_provider?: string;
  warranty_duration?: number;
  delivery_method?: string;
  delivery_address?: string;
  delivery_date?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  vehicle: Vehicle;
  salesperson?: UserType;
}

const customerFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z.string().optional(),
  notes: z.string().optional(),
});

const purchaseFormSchema = z.object({
  vehicle_id: z.number().min(1, "Vehicle selection is required"),
  salesperson_id: z.number().optional(),
  purchase_date: z.string().min(1, "Purchase date is required"),
  purchase_price: z.number().min(0, "Purchase price must be positive"),
  finance_amount: z.number().min(0).optional(),
  deposit_amount: z.number().min(0).optional(),
  trade_in_value: z.number().min(0).optional(),
  finance_provider: z.string().optional(),
  finance_type: z.string().optional(),
  payment_method: z.string().min(1, "Payment method is required"),
  warranty_included: z.boolean().default(false),
  warranty_provider: z.string().optional(),
  warranty_duration: z.number().optional(),
  delivery_method: z.string().optional(),
  delivery_address: z.string().optional(),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;
type PurchaseFormData = z.infer<typeof purchaseFormSchema>;

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  mode?: "add" | "edit" | "view";
  is_view_mode?: boolean;
}

export default function CustomerModal({
  isOpen,
  onClose,
  customer,
  mode,
  is_view_mode,
}: CustomerModalProps) {
  const actual_view_mode = is_view_mode || mode === "view";
  const actual_mode = mode || (is_view_mode ? "view" : "add");
  const { toast } = useToast();
  const query_client = useQueryClient();

  // State for add purchase modal
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      mobile: "",
      address: "",
      city: "",
      county: "",
      postcode: "",
      notes: "",
    },
  });

  const purchaseForm = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      vehicle_id: 1, // Will be updated when vehicle is selected
      salesperson_id: undefined,
      purchase_date: format(new Date(), "yyyy-MM-dd"),
      purchase_price: 0,
      finance_amount: 0,
      deposit_amount: 0,
      trade_in_value: 0,
      finance_provider: "",
      finance_type: "",
      payment_method: "cash",
      warranty_included: false,
      warranty_provider: "",
      warranty_duration: undefined,
      delivery_method: "",
      delivery_address: "",
      delivery_date: "",
      notes: "",
    },
  });

  // Reset form when modal opens or customer/mode changes
  useEffect(() => {
    if (isOpen) {
      if (customer && (actual_mode === "edit" || actual_mode === "view")) {
        form.reset({
          first_name: customer.first_name || "",
          last_name: customer.last_name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          mobile: customer.mobile || "",
          address: customer.address || "",
          city: customer.city || "",
          county: customer.county || "",
          postcode: customer.postcode || "",
          notes: customer.notes || "",
        });
      } else if (actual_mode === "add") {
        form.reset({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          mobile: "",
          address: "",
          city: "",
          county: "",
          postcode: "",
          notes: "",
        });
      }
    }
  }, [isOpen, customer, actual_mode, form]);

  // Reset purchase form when Add Purchase modal opens
  useEffect(() => {
    if (showAddPurchase) {
      purchaseForm.reset({
        vehicle_id: 1,
        salesperson_id: undefined,
        purchase_date: format(new Date(), "yyyy-MM-dd"),
        purchase_price: 0,
        finance_amount: 0,
        deposit_amount: 0,
        trade_in_value: 0,
        finance_provider: "",
        finance_type: "",
        payment_method: "cash",
        warranty_included: false,
        warranty_provider: "",
        warranty_duration: undefined,
        delivery_method: "",
        delivery_address: "",
        delivery_date: "",
        notes: "",
      });
      setSelectedVehicle(null);
      setVehicleSearch("");
    }
  }, [showAddPurchase, purchaseForm]);

  // Create/Update customer mutation
  const customer_mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const url =
        actual_mode === "edit"
          ? `/api/customers/${customer?.id}`
          : "/api/customers";
      const method = actual_mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${actual_mode === "edit" ? "update" : "create"} customer`,
        );
      }

      return response.json();
    },
    onSuccess: () => {
      query_client.invalidateQueries({ queryKey: ["/api/customers"] });
      query_client.invalidateQueries({ queryKey: ["/api/customers/stats"] });
      toast({
        title: "Success",
        description: `Customer ${actual_mode === "edit" ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    customer_mutation.mutate(data);
  };

  const onPurchaseSubmit = (data: PurchaseFormData) => {
    console.log("Purchase form submitted with data:", data);
    console.log("Selected vehicle:", selectedVehicle);
    console.log("Form errors:", purchaseForm.formState.errors);

    if (!selectedVehicle) {
      toast({
        title: "Error",
        description: "Please select a vehicle",
        variant: "destructive",
      });
      return;
    }

    // Convert string values to numbers for financial fields
    const purchaseData = {
      ...data,
      vehicle_id: selectedVehicle.id,
      purchase_price: Number(data.purchase_price),
      finance_amount: Number(data.finance_amount || 0),
      deposit_amount: Number(data.deposit_amount || 0),
      trade_in_value: Number(data.trade_in_value || 0),
      warranty_duration: data.warranty_duration
        ? Number(data.warranty_duration)
        : undefined,
      salesperson_id: data.salesperson_id || undefined,
    };

    console.log("Final purchase data being sent:", purchaseData);
    createPurchaseMutation.mutate(purchaseData);
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleSearch(
      `${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.registration}`,
    );

    // Update form with selected vehicle ID
    purchaseForm.setValue("vehicle_id", vehicle.id);

    // Auto-fill purchase price if available
    if (vehicle.total_sale_price) {
      purchaseForm.setValue("purchase_price", Number(vehicle.total_sale_price));
    }

    console.log("Vehicle selected:", vehicle.id, vehicle.registration);
  };

  const getCustomerStatus = () => {
    // For now, we'll just return "Active" as the default
    return "Active";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
      case "prospect":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  // Fetch customer purchases for view/edit mode
  const { data: customerPurchases = [], isLoading: purchasesLoading } =
    useQuery({
      queryKey: ["/api/customers", customer?.id, "purchases"],
      queryFn: async () => {
        const response = await fetch(
          `/api/customers/${customer?.id}/purchases`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch customer purchases");
        }
        return response.json();
      },
      enabled: !!(
        customer?.id &&
        (actual_mode === "view" || actual_mode === "edit")
      ),
    });

  // Fetch vehicles for purchase form
  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const response = await fetch("/api/vehicles");
      if (!response.ok) {
        throw new Error("Failed to fetch vehicles");
      }
      return response.json();
    },
    enabled: showAddPurchase,
  });

  // Fetch users for salesperson selection
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: showAddPurchase,
  });

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
    const searchTerm = vehicleSearch.toLowerCase();
    return (
      vehicle.registration?.toLowerCase().includes(searchTerm) ||
      vehicle.make?.toLowerCase().includes(searchTerm) ||
      vehicle.model?.toLowerCase().includes(searchTerm) ||
      vehicle.stock_number?.toLowerCase().includes(searchTerm)
    );
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      console.log("Making API request with data:", data);
      const response = await apiRequest(
        "POST",
        `/api/customers/${customer?.id}/purchases`,
        {
          ...data,
          customer_id: customer?.id,
        },
      );
      return response;
    },
    onSuccess: () => {
      query_client.invalidateQueries({
        queryKey: ["/api/customers", customer?.id, "purchases"],
      });
      query_client.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Success",
        description: "Purchase added successfully",
      });
      setShowAddPurchase(false);
      purchaseForm.reset({
        vehicle_id: 1,
        salesperson_id: undefined,
        purchase_date: format(new Date(), "yyyy-MM-dd"),
        purchase_price: 0,
        finance_amount: 0,
        deposit_amount: 0,
        trade_in_value: 0,
        finance_provider: "",
        finance_type: "",
        payment_method: "cash",
        warranty_included: false,
        warranty_provider: "",
        warranty_duration: undefined,
        delivery_method: "",
        delivery_address: "",
        delivery_date: "",
        notes: "",
      });
      setSelectedVehicle(null);
      setVehicleSearch("");
    },
    onError: (error: Error) => {
      console.error("Purchase creation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show view mode for converted customers
  if (actual_view_mode && customer) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 sm:max-w-[95vw] sm:max-h-[90vh] sm:m-2">
            <DialogHeader className="border-b pb-6 sm:pb-4">
              {/* Mobile Header */}
              <div className="sm:hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                      {customer.first_name} {customer.last_name}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
                      Customer Information & Purchase History
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`${getStatusColor(getCustomerStatus())} text-xs font-medium px-2 py-1`}
                  >
                    {getCustomerStatus()}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-1">
                    {customerPurchases.length} Purchase
                    {customerPurchases.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              {/* Desktop Header */}
              <div className="hidden sm:flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                      {customer.first_name} {customer.last_name}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-300 mt-1">
                      Customer Information & Purchase History
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={`${getStatusColor(getCustomerStatus())} text-sm font-medium px-3 py-1`}
                  >
                    {getCustomerStatus()}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-sm font-medium px-3 py-1">
                    {customerPurchases.length} Purchase
                    {customerPurchases.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <div className="py-6 sm:py-4">
              <Tabs defaultValue="details" className="w-full">
                {/* Mobile Tabs */}
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 sm:hidden">
                  <TabsTrigger
                    value="details"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="purchases"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
                  >
                    Purchases
                  </TabsTrigger>
                </TabsList>

                {/* Desktop Tabs */}
                <TabsList className="hidden sm:grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <TabsTrigger
                    value="details"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Customer Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="purchases"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    Purchase History
                  </TabsTrigger>
                </TabsList>

                {/* Customer Details Tab */}
                <TabsContent
                  value="details"
                  className="space-y-6 mt-6 sm:space-y-4 sm:mt-4"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
                    {/* Personal Information Card */}
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-700/40">
                      <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg sm:py-3">
                        <CardTitle className="flex items-center gap-2 sm:text-base">
                          <User className="h-5 w-5 sm:h-4 sm:w-4" />
                          Personal Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4 sm:p-4 sm:space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                            Full Name
                          </label>
                          <p className="text-xl font-bold text-gray-900 dark:text-white sm:text-lg">
                            {customer.first_name} {customer.last_name}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                              First Name
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                              {customer.first_name || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                              Last Name
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                              {customer.last_name || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact Information Card */}
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800/40 dark:to-stone-700/40">
                      <CardHeader className="bg-gradient-to-r from-stone-600 to-stone-700 text-white rounded-t-lg sm:py-3">
                        <CardTitle className="flex items-center gap-2 sm:text-base">
                          <Phone className="h-5 w-5 sm:h-4 sm:w-4" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4 sm:p-4 sm:space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                            Email Address
                          </label>
                          <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                            {customer.email || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                            Phone
                          </label>
                          <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                            {customer.phone || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                            Mobile
                          </label>
                          <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                            {customer.mobile || "Not provided"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Address Information Card */}
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-700/40">
                    <CardHeader className="bg-gradient-to-r from-zinc-600 to-zinc-700 text-white rounded-t-lg sm:py-3">
                      <CardTitle className="flex items-center gap-2 sm:text-base">
                        <MapPin className="h-5 w-5 sm:h-4 sm:w-4" />
                        Address Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
                        <div className="space-y-4 sm:space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                              Address
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                              {customer.address || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                              City
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                              {customer.city || "Not provided"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-4 sm:space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                              County
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                              {customer.county || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                              Postcode
                            </label>
                            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
                              {customer.postcode || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes Card */}
                  {customer.notes && (
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800/40 dark:to-neutral-700/40">
                      <CardHeader className="bg-gradient-to-r from-neutral-600 to-neutral-700 text-white rounded-t-lg sm:py-3">
                        <CardTitle className="flex items-center gap-2 sm:text-base">
                          <Mail className="h-5 w-5 sm:h-4 sm:w-4" />
                          Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 sm:p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-neutral-500 sm:p-3">
                          <p className="text-gray-900 dark:text-white sm:text-sm">
                            {customer.notes}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Purchase History Tab */}
                <TabsContent
                  value="purchases"
                  className="space-y-6 mt-6 sm:space-y-4 sm:mt-4"
                >
                  <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-800/40 dark:to-emerald-700/40">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg sm:py-3">
                      <CardTitle className="flex items-center gap-2 sm:text-base">
                        <ShoppingCart className="h-5 w-5 sm:h-4 sm:w-4" />
                        Purchase History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 sm:p-4">
                      {purchasesLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-500">
                            Loading purchases...
                          </p>
                        </div>
                      ) : customerPurchases.length === 0 ? (
                        <div className="text-center py-8 sm:py-6">
                          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4 sm:h-10 sm:w-10" />
                          <p className="text-gray-500 font-medium sm:text-sm">
                            No purchases yet
                          </p>
                          <p className="text-sm text-gray-400 sm:text-xs">
                            This customer hasn't made any purchases
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 sm:space-y-3">
                          {customerPurchases.map(
                            (purchase: CustomerPurchase) => (
                              <div
                                key={purchase.id}
                                className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-shadow sm:p-3"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-3 sm:mb-2">
                                      <Car className="h-4 w-4 text-emerald-500 sm:h-3 sm:w-3" />
                                      <h4 className="font-bold text-gray-900 dark:text-white sm:text-sm">
                                        {purchase.vehicle.year}{" "}
                                        {purchase.vehicle.make}{" "}
                                        {purchase.vehicle.model}
                                      </h4>
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-emerald-500 text-emerald-700 dark:text-emerald-300 sm:text-xs"
                                      >
                                        {purchase.vehicle.registration}
                                      </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm sm:grid-cols-1 sm:gap-2">
                                      <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Purchase Date
                                        </label>
                                        <p className="font-medium text-gray-900 dark:text-white sm:text-sm">
                                          {format(
                                            new Date(purchase.purchase_date),
                                            "dd/MM/yyyy",
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Purchase Price
                                        </label>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 sm:text-sm">
                                          £
                                          {purchase.purchase_price.toLocaleString()}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Payment Method
                                        </label>
                                        <p className="font-medium text-gray-900 dark:text-white sm:text-sm">
                                          {purchase.payment_method}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Status
                                        </label>
                                        <Badge
                                          variant={
                                            purchase.status === "completed"
                                              ? "default"
                                              : "secondary"
                                          }
                                          className="text-xs sm:text-xs"
                                        >
                                          {purchase.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    {purchase.finance_amount > 0 && (
                                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border-l-2 border-blue-500 sm:mt-2 sm:p-2">
                                        <div className="flex items-center gap-2 sm:gap-1">
                                          <CreditCard className="h-4 w-4 text-blue-500 sm:h-3 sm:w-3" />
                                          <span className="font-bold text-blue-700 dark:text-blue-400 sm:text-sm">
                                            Finance: £
                                            {purchase.finance_amount.toLocaleString()}
                                          </span>
                                          {purchase.finance_provider && (
                                            <span className="text-blue-600 dark:text-blue-400 sm:text-xs">
                                              via {purchase.finance_provider}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {purchase.notes && (
                                      <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/40 rounded-lg border-l-2 border-gray-500 sm:mt-2 sm:p-2">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 sm:text-xs">
                                          <span className="font-medium">
                                            Notes:
                                          </span>{" "}
                                          {purchase.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  onClick={onClose}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Purchase Modal for View Mode */}
        <AddPurchaseModal
          isOpen={showAddPurchase}
          onClose={() => {
            console.log("AddPurchaseModal onClose called (view mode)");
            setShowAddPurchase(false);
            purchaseForm.reset();
            setSelectedVehicle(null);
            setVehicleSearch("");
          }}
          customer={customer}
          purchaseForm={purchaseForm}
          createPurchaseMutation={createPurchaseMutation}
          onPurchaseSubmit={onPurchaseSubmit}
          vehicleSearch={vehicleSearch}
          setVehicleSearch={setVehicleSearch}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          handleVehicleSelect={handleVehicleSelect}
          filteredVehicles={filteredVehicles}
          users={users}
        />
      </>
    );
  }

  // Edit mode with tabs for existing customers
  if (mode === "edit" && customer) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Edit Customer - {customer.first_name} {customer.last_name}
              </DialogTitle>
              <DialogDescription>
                Update customer information and manage purchase history
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Customer Details</TabsTrigger>
                <TabsTrigger value="purchases">Purchase History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      {/* Personal Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="first_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="First name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="last_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Last name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Contact Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Phone className="h-5 w-5" />
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Email address"
                                      type="email"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Phone number"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="mobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mobile</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Mobile number"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Address Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Address Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Full address"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="City" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="county"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>County</FormLabel>
                                  <FormControl>
                                    <Input placeholder="County" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="postcode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Postcode</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Postcode" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Notes */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Additional Notes</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Any additional notes about this customer..."
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={customer_mutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={customer_mutation.isPending}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                      >
                        {customer_mutation.isPending
                          ? "Saving..."
                          : "Save Customer"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="purchases" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Purchase History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {purchasesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">
                          Loading purchases...
                        </p>
                      </div>
                    ) : customerPurchases.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No purchases yet</p>
                        <p className="text-sm text-gray-400">
                          Add vehicle purchases for this customer
                        </p>
                        <Button
                          className="mt-4 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                          onClick={() => {
                            console.log(
                              "Add Purchase button clicked, setting showAddPurchase to true",
                            );
                            setShowAddPurchase(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Purchase
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {customerPurchases.length} purchase
                            {customerPurchases.length !== 1 ? "s" : ""}
                          </p>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                            onClick={() => {
                              console.log(
                                "Add Purchase button clicked (existing purchases), setting showAddPurchase to true",
                              );
                              setShowAddPurchase(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Purchase
                          </Button>
                        </div>

                        {customerPurchases.map((purchase: CustomerPurchase) => (
                          <div
                            key={purchase.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Car className="h-4 w-4 text-blue-500" />
                                  <h4 className="font-semibold">
                                    {purchase.vehicle.year}{" "}
                                    {purchase.vehicle.make}{" "}
                                    {purchase.vehicle.model}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {purchase.vehicle.registration}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">
                                      Purchase Date
                                    </p>
                                    <p className="font-medium">
                                      {format(
                                        new Date(purchase.purchase_date),
                                        "dd/MM/yyyy",
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">
                                      Purchase Price
                                    </p>
                                    <p className="font-medium">
                                      £
                                      {purchase.purchase_price.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">
                                      Payment Method
                                    </p>
                                    <p className="font-medium">
                                      {purchase.payment_method}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-500 dark:text-gray-400">
                                      Status
                                    </p>
                                    <Badge
                                      variant={
                                        purchase.status === "completed"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {purchase.status}
                                    </Badge>
                                  </div>
                                </div>

                                {purchase.finance_amount > 0 && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                                    <div className="flex items-center gap-1">
                                      <CreditCard className="h-3 w-3" />
                                      <span className="font-medium">
                                        Finance: £
                                        {purchase.finance_amount.toLocaleString()}
                                      </span>
                                      {purchase.finance_provider && (
                                        <span className="text-gray-600 dark:text-gray-400">
                                          via {purchase.finance_provider}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {purchase.notes && (
                                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p>
                                      <span className="font-medium">
                                        Notes:
                                      </span>{" "}
                                      {purchase.notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // We'll implement this later
                                    toast({
                                      title: "Coming Soon",
                                      description:
                                        "Edit purchase functionality will be implemented",
                                    });
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // We'll implement this later
                                    toast({
                                      title: "Coming Soon",
                                      description:
                                        "Delete purchase functionality will be implemented",
                                    });
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Add Purchase Modal for View Mode */}
        <AddPurchaseModal
          isOpen={showAddPurchase}
          onClose={() => {
            console.log("AddPurchaseModal onClose called (view mode)");
            setShowAddPurchase(false);
            purchaseForm.reset();
            setSelectedVehicle(null);
            setVehicleSearch("");
          }}
          customer={customer}
          purchaseForm={purchaseForm}
          createPurchaseMutation={createPurchaseMutation}
          onPurchaseSubmit={onPurchaseSubmit}
          vehicleSearch={vehicleSearch}
          setVehicleSearch={setVehicleSearch}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          handleVehicleSelect={handleVehicleSelect}
          filteredVehicles={filteredVehicles}
          users={users}
        />
      </>
    );
  }

  // Add mode (simple form without tabs)
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your database
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Email address"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="Mobile number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="county"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>County</FormLabel>
                          <FormControl>
                            <Input placeholder="County" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input placeholder="Postcode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes about this customer..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={customer_mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={customer_mutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  {customer_mutation.isPending
                    ? "Saving..."
                    : mode === "edit"
                      ? "Update Customer"
                      : "Create Customer"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Purchase Modal */}
      <AddPurchaseModal
        isOpen={showAddPurchase}
        onClose={() => {
          console.log("AddPurchaseModal onClose called");
          setShowAddPurchase(false);
          purchaseForm.reset();
          setSelectedVehicle(null);
          setVehicleSearch("");
        }}
        customer={customer!}
        purchaseForm={purchaseForm}
        createPurchaseMutation={createPurchaseMutation}
        onPurchaseSubmit={onPurchaseSubmit}
        vehicleSearch={vehicleSearch}
        setVehicleSearch={setVehicleSearch}
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        handleVehicleSelect={handleVehicleSelect}
        filteredVehicles={filteredVehicles}
        users={users}
      />
    </>
  );
}

// Add Purchase Modal Component
function AddPurchaseModal({
  isOpen,
  onClose,
  customer,
  purchaseForm,
  createPurchaseMutation,
  onPurchaseSubmit,
  vehicleSearch,
  setVehicleSearch,
  selectedVehicle,
  setSelectedVehicle,
  handleVehicleSelect,
  filteredVehicles,
  users,
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  purchaseForm: any;
  createPurchaseMutation: any;
  onPurchaseSubmit: (data: any) => void;
  vehicleSearch: string;
  setVehicleSearch: (value: string) => void;
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  handleVehicleSelect: (vehicle: Vehicle) => void;
  filteredVehicles: Vehicle[];
  users: UserType[];
}) {
  console.log("AddPurchaseModal rendered, isOpen:", isOpen);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("Dialog onOpenChange called with:", open);
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Purchase</DialogTitle>
          <DialogDescription>
            Add a new vehicle purchase for {customer?.first_name}{" "}
            {customer?.last_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...purchaseForm}>
          <form
            onSubmit={purchaseForm.handleSubmit(onPurchaseSubmit)}
            className="space-y-6"
          >
            {/* Vehicle Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Search & Select Vehicle
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by registration, make, model, or stock number..."
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      className="pl-10"
                    />
                    {selectedVehicle && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-6 w-6 p-0"
                        onClick={() => {
                          setSelectedVehicle(null);
                          setVehicleSearch("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Vehicle Search Results */}
                {vehicleSearch && !selectedVehicle && (
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {filteredVehicles.length > 0 ? (
                      filteredVehicles.slice(0, 10).map((vehicle: Vehicle) => (
                        <div
                          key={vehicle.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleVehicleSelect(vehicle)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {vehicle.registration} • Stock:{" "}
                              {vehicle.stock_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              £
                              {vehicle.total_sale_price?.toLocaleString() ||
                                "N/A"}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {vehicle.sales_status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No vehicles found matching your search
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Vehicle Display */}
                {selectedVehicle && (
                  <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-green-800 dark:text-green-300">
                            {selectedVehicle.year} {selectedVehicle.make}{" "}
                            {selectedVehicle.model}
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            {selectedVehicle.registration} • Stock:{" "}
                            {selectedVehicle.stock_number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-800 dark:text-green-300">
                            £
                            {selectedVehicle.total_sale_price?.toLocaleString() ||
                              "N/A"}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs border-green-300"
                          >
                            {selectedVehicle.sales_status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Purchase Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Purchase Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={purchaseForm.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={purchaseForm.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={purchaseForm.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="bank_transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="part_exchange">
                            Part Exchange
                          </SelectItem>
                          <SelectItem value="mixed">Mixed Payment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={purchaseForm.control}
                  name="salesperson_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salesperson</FormLabel>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select salesperson (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: UserType) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={purchaseForm.control}
                    name="deposit_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Amount (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={purchaseForm.control}
                    name="finance_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finance Amount (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={purchaseForm.control}
                    name="trade_in_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade-in Value (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={purchaseForm.control}
                    name="finance_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finance Provider</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Close Brothers, Santander"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={purchaseForm.control}
                    name="finance_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finance Type</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select finance type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hp">
                              Hire Purchase (HP)
                            </SelectItem>
                            <SelectItem value="pcp">
                              Personal Contract Purchase (PCP)
                            </SelectItem>
                            <SelectItem value="lease">Lease</SelectItem>
                            <SelectItem value="loan">Personal Loan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Warranty & Delivery */}
            <Card>
              <CardHeader>
                <CardTitle>Warranty & Delivery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FormField
                    control={purchaseForm.control}
                    name="warranty_included"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Warranty Included</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={purchaseForm.control}
                    name="warranty_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Provider</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Warrantywise, AA"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={purchaseForm.control}
                    name="warranty_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Duration (months)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="12"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={purchaseForm.control}
                  name="delivery_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Method</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select delivery method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="collection">
                            Customer Collection
                          </SelectItem>
                          <SelectItem value="delivery">
                            Home Delivery
                          </SelectItem>
                          <SelectItem value="showroom">
                            Showroom Handover
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={purchaseForm.control}
                    name="delivery_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Full delivery address..."
                            className="min-h-[60px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={purchaseForm.control}
                    name="delivery_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={purchaseForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes about this purchase..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createPurchaseMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPurchaseMutation.isPending || !selectedVehicle}
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
              >
                {createPurchaseMutation.isPending
                  ? "Adding Purchase..."
                  : "Add Purchase"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
