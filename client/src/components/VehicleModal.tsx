import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Car, X, Calculator, Trash2 } from "lucide-react";

interface VehicleData {
 id?: number;
 stock_number: string;
 department: string;
 buyer: string;
 sales_status: string;
 collection_status: string;
 registration: string;
 make: string;
 model: string;
 derivative: string;
 colour: string;
 mileage: string;
 year: string;
 date_of_registration: string;
 chassis_number: string;
 purchase_invoice_date: string;
 purchase_px_value: string;
 purchase_cash: string;
 purchase_fees: string;
 purchase_finance_settlement: string;
 purchase_bank_transfer: string;
 vat: string;
 purchase_price_total: string;
 sale_date: string;
 bank_payment: string;
 finance_payment: string;
 finance_settlement: string;
 px_value: string;
 vat_payment: string;
 cash_payment: string;
 total_sale_price: string;
 cash_o_b: string;
 px_o_r_value: string;
 road_tax: string;
 dvla: string;
 alloy_insurance: string;
 paint_insurance: string;
 gap_insurance: string;
 parts_cost: string;
 paint_labour_costs: string;
 warranty_costs: string;
 total_gp: string;
 adj_gp: string;
 dfc_outstanding_amount: string;
 payment_notes: string;
 customer_first_name: string;
 customer_surname: string;
}

type VehicleFormData = {
 [K in keyof VehicleData]: VehicleData[K];
};

interface VehicleModalProps {
 isOpen: boolean;
 onClose: () => void;
 vehicle?: VehicleData;
 mode: "add" | "edit";
}

const departments = ["AL", "ALS", "MSR"];
const salesStatuses = ["Stock", "Sold", "Autolab"];
const collectionStatuses = ["On Site", "AWD"];

export default function VehicleModal({ isOpen, onClose, vehicle, mode }: VehicleModalProps) {
 const { toast } = useToast();
 const queryClient = useQueryClient();
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

 // Financial calculation helper functions
 const parseFinancialValue = (value: string | null | undefined): number => {
  if (!value || value === "" || value === "null" || value === "undefined") return 0;
  const cleanValue = value.toString().replace(/[£,\s]/g, "");
  const numValue = parseFloat(cleanValue);
  return isNaN(numValue) || !isFinite(numValue) ? 0 : numValue;
 };

 const formatFinancialValue = (value: number): string => {
  if (isNaN(value) || !isFinite(value)) return "0.00";
  return value.toFixed(2);
 };

 const calculatePurchasePriceTotal = (data: VehicleFormData): number => {
  return (
   parseFinancialValue(data.purchase_px_value) +
   parseFinancialValue(data.purchase_cash) +
   parseFinancialValue(data.purchase_fees) +
   parseFinancialValue(data.purchase_finance_settlement) +
   parseFinancialValue(data.purchase_bank_transfer) +
   parseFinancialValue(data.vat)
  );
 };

 const calculateTotalSalePrice = (data: VehicleFormData): number => {
  return (
   parseFinancialValue(data.bank_payment) +
   parseFinancialValue(data.finance_payment) +
   parseFinancialValue(data.finance_settlement) +
   parseFinancialValue(data.px_value) +
   parseFinancialValue(data.vat_payment) +
   parseFinancialValue(data.cash_payment)
  );
 };

 const calculateTotalGP = (data: VehicleFormData): number => {
  const salePrice = data.sales_status?.toUpperCase() === "SOLD" ? calculateTotalSalePrice(data) : 0;
  const purchasePrice = calculatePurchasePriceTotal(data);
  return salePrice - purchasePrice;
 };

 const calculateAdjGP = (data: VehicleFormData): number => {
  const totalGP = calculateTotalGP(data);
  const partsCost = parseFinancialValue(data.parts_cost);
  const paintLabourCosts = parseFinancialValue(data.paint_labour_costs);
  const warrantyCosts = parseFinancialValue(data.warranty_costs);
  return totalGP - partsCost - paintLabourCosts - warrantyCosts;
 };

 const [formData, setFormData] = useState<VehicleFormData>({
  stock_number: "",
  department: "",
  buyer: "",
  sales_status: "Stock",
  collection_status: "On Site",
  registration: "",
  make: "",
  model: "",
  derivative: "",
  colour: "",
  mileage: "",
  year: "",
  date_of_registration: "",
  chassis_number: "",
  purchase_invoice_date: "",
  purchase_px_value: "",
  purchase_cash: "",
  purchase_fees: "",
  purchase_finance_settlement: "",
  purchase_bank_transfer: "",
  vat: "",
  purchase_price_total: "",
  sale_date: "",
  bank_payment: "",
  finance_payment: "",
  finance_settlement: "",
  px_value: "",
  vat_payment: "",
  cash_payment: "",
  total_sale_price: "",
  cash_o_b: "",
  px_o_r_value: "",
  road_tax: "",
  dvla: "",
  alloy_insurance: "",
  paint_insurance: "",
  gap_insurance: "",
  parts_cost: "",
  paint_labour_costs: "",
  warranty_costs: "",
  total_gp: "",
  adj_gp: "",
  dfc_outstanding_amount: "",
  payment_notes: "",
  customer_first_name: "",
  customer_surname: "",
 });

 // Effect for real-time financial calculations
 useEffect(() => {
  const purchasePriceTotal = calculatePurchasePriceTotal(formData);
  const totalSalePrice = calculateTotalSalePrice(formData);
  const totalGP = calculateTotalGP(formData);
  const adjGP = calculateAdjGP(formData);

  setFormData(prev => ({
   ...prev,
   purchase_price_total: formatFinancialValue(purchasePriceTotal),
   total_sale_price: formatFinancialValue(totalSalePrice),
   total_gp: formatFinancialValue(totalGP),
   adj_gp: formatFinancialValue(adjGP),
  }));
 }, [
  formData.purchase_px_value,
  formData.purchase_cash,
  formData.purchase_fees,
  formData.purchase_finance_settlement,
  formData.purchase_bank_transfer,
  formData.vat,
  formData.bank_payment,
  formData.finance_payment,
  formData.finance_settlement,
  formData.px_value,
  formData.vat_payment,
  formData.cash_payment,
  formData.parts_cost,
  formData.paint_labour_costs,
  formData.warranty_costs,
  formData.sales_status,
 ]);

 useEffect(() => {
  if (vehicle && mode === "edit") {
   // Convert dates to YYYY-MM-DD format for date inputs
   const processedVehicle = { ...vehicle };
   const dateFields = ["date_of_registration", "purchase_invoice_date", "sale_date"];

   dateFields.forEach(field => {
    const value = processedVehicle[field as keyof VehicleData] as string;
    if (value) {
     try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
       Object.assign(processedVehicle, {
        [field]: date.toISOString().split("T")[0],
       });
      }
     } catch {
      Object.assign(processedVehicle, { [field]: "" });
     }
    }
   });

   setFormData(processedVehicle);
  } else if (mode === "add") {
   setFormData({
    stock_number: "",
    department: "",
    buyer: "",
    sales_status: "Stock",
    collection_status: "On Site",
    registration: "",
    make: "",
    model: "",
    derivative: "",
    colour: "",
    mileage: "",
    year: "",
    date_of_registration: "",
    chassis_number: "",
    purchase_invoice_date: "",
    purchase_px_value: "",
    purchase_cash: "",
    purchase_fees: "",
    purchase_finance_settlement: "",
    purchase_bank_transfer: "",
    vat: "",
    purchase_price_total: "",
    sale_date: "",
    bank_payment: "",
    finance_payment: "",
    finance_settlement: "",
    px_value: "",
    vat_payment: "",
    cash_payment: "",
    total_sale_price: "",
    cash_o_b: "",
    px_o_r_value: "",
    road_tax: "",
    dvla: "",
    alloy_insurance: "",
    paint_insurance: "",
    gap_insurance: "",
    parts_cost: "",
    paint_labour_costs: "",
    warranty_costs: "",
    total_gp: "",
    adj_gp: "",
    dfc_outstanding_amount: "",
    payment_notes: "",
    customer_first_name: "",
    customer_surname: "",
   });
  }
 }, [vehicle, mode, isOpen]);

 const mutation = useMutation({
  mutationFn: async (data: VehicleData) => {
   const url = mode === "add" ? "/api/vehicles" : `/api/vehicles/${vehicle?.id}`;
   const method = mode === "add" ? "POST" : "PUT";

   // Send data as-is, let backend handle conversion
   const processedData = { ...data };

   // Remove undefined/empty values and convert empty strings to null for optional fields
   Object.keys(processedData).forEach(key => {
    const value = processedData[key as keyof VehicleData];
    if (value === "" || value === undefined) {
     (processedData as any)[key] = null;
    }
   });

   console.log(`[Frontend] Making ${method} request to ${url} for vehicle ${data.id || "new"}`);
   const response = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(processedData),
   });

   console.log(`[Frontend] Vehicle ${method} response status: ${response.status}`);

   if (!response.ok) throw new Error("Failed to save vehicle");
   return response.json();
  },
  onSuccess: () => {
   console.log("[VehicleModal] Vehicle save successful, invalidating cache...");
   queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
   queryClient.invalidateQueries({ queryKey: ["/api/customers/crm-stats"] });
   queryClient.invalidateQueries({ queryKey: ["/api/stock-age/analytics"] });

   // CRITICAL: Force immediate refetch of dashboard stats to ensure visual update
   console.log("[VehicleModal] Force refetching dashboard stats for immediate update...");
   queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
   queryClient.refetchQueries({ queryKey: ["/api/customers/crm-stats"] });

   toast({
    title: mode === "add" ? "Vehicle Added" : "Vehicle Updated",
    description: `Vehicle has been ${mode === "add" ? "added" : "updated"} successfully`,
   });
   onClose();
  },
  onError: error => {
   toast({
    title: "Error",
    description: `Failed to ${mode} vehicle. Please try again.`,
    variant: "destructive",
   });
  },
 });

 const deleteMutation = useMutation({
  mutationFn: async (vehicleId: number) => {
   console.log(`[Frontend] Attempting to delete vehicle ${vehicleId}`);
   const response = await fetch(`/api/vehicles/${vehicleId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
     "Content-Type": "application/json",
    },
   });

   console.log(`[Frontend] Delete response status: ${response.status}`);
   if (!response.ok) {
    const errorData = await response.text();
    console.log(`[Frontend] Delete error response:`, errorData);
    throw new Error("Failed to delete vehicle");
   }
   return response.json();
  },
  onSuccess: () => {
   console.log("[VehicleModal] Vehicle update successful, invalidating cache...");
   queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
   queryClient.invalidateQueries({ queryKey: ["/api/customers/crm-stats"] });
   queryClient.invalidateQueries({ queryKey: ["/api/stock-age/analytics"] });

   // CRITICAL: Force immediate refetch of dashboard stats to ensure visual update
   console.log("[VehicleModal] Force refetching dashboard stats for immediate update...");
   queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
   queryClient.refetchQueries({ queryKey: ["/api/customers/crm-stats"] });

   toast({
    title: "Vehicle Deleted",
    description: "Vehicle has been deleted successfully",
   });
   onClose();
  },
  onError: error => {
   toast({
    title: "Delete Failed",
    description: "Failed to delete vehicle. Please try again.",
    variant: "destructive",
   });
  },
 });

 const handleDelete = () => {
  if (vehicle?.id) {
   deleteMutation.mutate(vehicle.id);
   setShowDeleteConfirm(false);
  }
 };

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // Basic validation
  if (!formData.stock_number || !formData.department) {
   toast({
    title: "Validation Error",
    description: "Stock number and department are required.",
    variant: "destructive",
   });
   return;
  }

  mutation.mutate(formData);
 };

 const handleInputChange = (field: keyof VehicleData, value: string | number | null) => {
  setFormData(prev => ({
   ...prev,
   [field]: value,
  }));
 };

 const handleFinancialInputChange = (field: keyof VehicleFormData, value: string) => {
  // Allow empty string to show as empty, will default to 0 in calculations
  setFormData(prev => ({ ...prev, [field]: value }));
 };

 const formatDisplayValue = (value: string | null | undefined): string => {
  if (!value || value === "") return "0.00";
  return value;
 };

 const formatCalculatedValue = (value: string): string => {
  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue === 0) return "£0.00";
  return `£${numValue.toFixed(2)}`;
 };

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
     <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
       <Car className="h-5 w-5 text-red-600" />
       <DialogTitle className="text-xl font-semibold">
        {mode === "add" ? "Add New Vehicle" : "Edit Vehicle"}
       </DialogTitle>
      </div>
      <DialogDescription>
       {mode === "add" ? "Form to add a new vehicle to inventory" : "Form to edit existing vehicle details"}
      </DialogDescription>
      <div className="flex items-center space-x-2">
       {mode === "edit" && vehicle?.id && (
        <Button
         type="button"
         variant="destructive"
         size="sm"
         onClick={() => setShowDeleteConfirm(true)}
         disabled={deleteMutation.isPending}
        >
         <Trash2 className="h-4 w-4 mr-1" />
         Delete
        </Button>
       )}
       <Button variant="ghost" size="sm" onClick={onClose}>
        <X className="h-4 w-4" />
       </Button>
      </div>
     </div>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-6">
     {/* Basic Information */}
     <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div>
        <Label htmlFor="stock_number">Stock Number *</Label>
        <Input
         id="stock_number"
         value={formData.stock_number}
         onChange={e => handleInputChange("stock_number", e.target.value)}
         placeholder="AL123456"
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="department">Department *</Label>
        <Select value={formData.department} onValueChange={value => handleInputChange("department", value)}>
         <SelectTrigger className="mt-1">
          <SelectValue placeholder="Select department" />
         </SelectTrigger>
         <SelectContent>
          {departments.map(dept => (
           <SelectItem key={dept} value={dept}>
            {dept}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
       <div>
        <Label htmlFor="buyer">Buyer</Label>
        <Input
         id="buyer"
         value={formData.buyer}
         onChange={e => handleInputChange("buyer", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="sales_status">Sales Status</Label>
        <Select
         value={formData.sales_status}
         onValueChange={value => handleInputChange("sales_status", value)}
        >
         <SelectTrigger className="mt-1">
          <SelectValue />
         </SelectTrigger>
         <SelectContent>
          {salesStatuses.map(status => (
           <SelectItem key={status} value={status}>
            {status}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
       <div>
        <Label htmlFor="collection_status">Collection Status</Label>
        <Select
         value={formData.collection_status}
         onValueChange={value => handleInputChange("collection_status", value)}
        >
         <SelectTrigger className="mt-1">
          <SelectValue />
         </SelectTrigger>
         <SelectContent>
          {collectionStatuses.map(status => (
           <SelectItem key={status} value={status}>
            {status}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
      </div>
     </div>

     {/* Vehicle Details */}
     <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Vehicle Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div>
        <Label htmlFor="registration">Registration</Label>
        <Input
         id="registration"
         value={formData.registration}
         onChange={e => handleInputChange("registration", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="make">Make</Label>
        <Input
         id="make"
         value={formData.make}
         onChange={e => handleInputChange("make", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="model">Model</Label>
        <Input
         id="model"
         value={formData.model}
         onChange={e => handleInputChange("model", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="derivative">Derivative</Label>
        <Input
         id="derivative"
         value={formData.derivative}
         onChange={e => handleInputChange("derivative", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="colour">Colour</Label>
        <Input
         id="colour"
         value={formData.colour}
         onChange={e => handleInputChange("colour", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="mileage">Mileage</Label>
        <Input
         id="mileage"
         type="number"
         value={formData.mileage || ""}
         onChange={e => handleInputChange("mileage", e.target.value ? parseInt(e.target.value) : null)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="year">Year</Label>
        <Input
         id="year"
         type="number"
         value={formData.year || ""}
         onChange={e => handleInputChange("year", e.target.value ? parseInt(e.target.value) : null)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="date_of_registration">Date of Registration</Label>
        <Input
         id="date_of_registration"
         type="date"
         value={formData.date_of_registration}
         onChange={e => handleInputChange("date_of_registration", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="chassis_number">Chassis Number</Label>
        <Input
         id="chassis_number"
         value={formData.chassis_number}
         onChange={e => handleInputChange("chassis_number", e.target.value)}
         className="mt-1"
        />
       </div>
      </div>
     </div>

     {/* Purchase Information */}
     <div className="bg-yellow-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Purchase Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div>
        <Label htmlFor="purchase_invoice_date">Purchase Invoice Date</Label>
        <Input
         id="purchase_invoice_date"
         type="date"
         value={formData.purchase_invoice_date}
         onChange={e => handleInputChange("purchase_invoice_date", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="purchase_px_value">Purchase PX Value (£)</Label>
        <Input
         id="purchase_px_value"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.purchase_px_value)}
         onChange={e => handleFinancialInputChange("purchase_px_value", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="purchase_cash">Purchase Cash (£)</Label>
        <Input
         id="purchase_cash"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.purchase_cash)}
         onChange={e => handleFinancialInputChange("purchase_cash", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="purchase_fees">Purchase Fees (£)</Label>
        <Input
         id="purchase_fees"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.purchase_fees)}
         onChange={e => handleFinancialInputChange("purchase_fees", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="purchase_finance_settlement">Purchase Finance Settlement (£)</Label>
        <Input
         id="purchase_finance_settlement"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.purchase_finance_settlement)}
         onChange={e => handleFinancialInputChange("purchase_finance_settlement", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="purchase_bank_transfer">Purchase Bank Transfer (£)</Label>
        <Input
         id="purchase_bank_transfer"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.purchase_bank_transfer)}
         onChange={e => handleFinancialInputChange("purchase_bank_transfer", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="vat">VAT (£)</Label>
        <Input
         id="vat"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.vat)}
         onChange={e => handleFinancialInputChange("vat", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="purchase_price_total" className="flex items-center gap-2">
         <Calculator className="h-4 w-4 text-green-600" />
         Purchase Price Total (£) - Calculated
        </Label>
        <Input
         id="purchase_price_total"
         value={formatCalculatedValue(formData.purchase_price_total)}
         readOnly
         className="mt-1 bg-green-50 border-green-200 text-green-800 font-semibold cursor-not-allowed"
        />
       </div>
      </div>
     </div>

     {/* Sales Information */}
     <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Sales Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div>
        <Label htmlFor="sale_date">Sale Date</Label>
        <Input
         id="sale_date"
         type="date"
         value={formData.sale_date}
         onChange={e => handleInputChange("sale_date", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="bank_payment">Bank Payment (£)</Label>
        <Input
         id="bank_payment"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.bank_payment)}
         onChange={e => handleFinancialInputChange("bank_payment", e.target.value)}
         className="mt-1"
         disabled={formData.sales_status?.toUpperCase() !== "SOLD"}
        />
       </div>
       <div>
        <Label htmlFor="finance_payment">Finance Payment (£)</Label>
        <Input
         id="finance_payment"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.finance_payment)}
         onChange={e => handleFinancialInputChange("finance_payment", e.target.value)}
         className="mt-1"
         disabled={formData.sales_status?.toUpperCase() !== "SOLD"}
        />
       </div>
       <div>
        <Label htmlFor="finance_settlement">Finance Settlement (£)</Label>
        <Input
         id="finance_settlement"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.finance_settlement)}
         onChange={e => handleFinancialInputChange("finance_settlement", e.target.value)}
         className="mt-1"
         disabled={formData.sales_status?.toUpperCase() !== "SOLD"}
        />
       </div>
       <div>
        <Label htmlFor="px_value">PX Value (£)</Label>
        <Input
         id="px_value"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.px_value)}
         onChange={e => handleFinancialInputChange("px_value", e.target.value)}
         className="mt-1"
         disabled={formData.sales_status?.toUpperCase() !== "SOLD"}
        />
       </div>
       <div>
        <Label htmlFor="vat_payment">VAT Payment (£)</Label>
        <Input
         id="vat_payment"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.vat_payment)}
         onChange={e => handleFinancialInputChange("vat_payment", e.target.value)}
         className="mt-1"
         disabled={formData.sales_status?.toUpperCase() !== "SOLD"}
        />
       </div>
       <div>
        <Label htmlFor="cash_payment">Cash Payment (£)</Label>
        <Input
         id="cash_payment"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.cash_payment)}
         onChange={e => handleFinancialInputChange("cash_payment", e.target.value)}
         className="mt-1"
         disabled={formData.sales_status?.toUpperCase() !== "SOLD"}
        />
       </div>
       <div>
        <Label htmlFor="total_sale_price" className="flex items-center gap-2">
         <Calculator className="h-4 w-4 text-blue-600" />
         Total Sale Price (£) - Calculated
        </Label>
        <Input
         id="total_sale_price"
         value={formatCalculatedValue(formData.total_sale_price)}
         readOnly
         className="mt-1 bg-blue-50 border-blue-200 text-blue-800 font-semibold cursor-not-allowed"
        />
       </div>
      </div>
     </div>

     {/* Additional Financial */}
     <div className="bg-purple-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Additional Financial</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div>
        <Label htmlFor="cash_o_b">Cash O/B (£)</Label>
        <Input
         id="cash_o_b"
         type="number"
         step="0.01"
         value={formData.cash_o_b}
         onChange={e => handleInputChange("cash_o_b", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="px_o_r_value">PX O/R Value (£)</Label>
        <Input
         id="px_o_r_value"
         type="number"
         step="0.01"
         value={formData.px_o_r_value}
         onChange={e => handleInputChange("px_o_r_value", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="road_tax">Road Tax (£)</Label>
        <Input
         id="road_tax"
         type="number"
         step="0.01"
         value={formData.road_tax}
         onChange={e => handleInputChange("road_tax", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="dvla">DVLA (£)</Label>
        <Input
         id="dvla"
         type="number"
         step="0.01"
         value={formData.dvla}
         onChange={e => handleInputChange("dvla", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="alloy_insurance">Alloy Insurance (£)</Label>
        <Input
         id="alloy_insurance"
         type="number"
         step="0.01"
         value={formData.alloy_insurance}
         onChange={e => handleInputChange("alloy_insurance", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="paint_insurance">Paint Insurance (£)</Label>
        <Input
         id="paint_insurance"
         type="number"
         step="0.01"
         value={formData.paint_insurance}
         onChange={e => handleInputChange("paint_insurance", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="gap_insurance">GAP Insurance (£)</Label>
        <Input
         id="gap_insurance"
         type="number"
         step="0.01"
         value={formData.gap_insurance}
         onChange={e => handleInputChange("gap_insurance", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="parts_cost">Parts Cost (£)</Label>
        <Input
         id="parts_cost"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.parts_cost)}
         onChange={e => handleFinancialInputChange("parts_cost", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="paint_labour_costs">Paint & Labour Costs (£)</Label>
        <Input
         id="paint_labour_costs"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.paint_labour_costs)}
         onChange={e => handleFinancialInputChange("paint_labour_costs", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="warranty_costs">Warranty Costs (£)</Label>
        <Input
         id="warranty_costs"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.warranty_costs)}
         onChange={e => handleFinancialInputChange("warranty_costs", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="total_gp" className="flex items-center gap-2">
         <Calculator className="h-4 w-4 text-purple-600" />
         Total GP (£) - Calculated
        </Label>
        <Input
         id="total_gp"
         value={formatCalculatedValue(formData.total_gp)}
         readOnly
         className="mt-1 bg-purple-50 border-purple-200 text-purple-800 font-semibold cursor-not-allowed"
        />
       </div>
       <div>
        <Label htmlFor="adj_gp" className="flex items-center gap-2">
         <Calculator className="h-4 w-4 text-red-600" />
         ADJ GP (£) - Calculated
        </Label>
        <Input
         id="adj_gp"
         value={formatCalculatedValue(formData.adj_gp)}
         readOnly
         className="mt-1 bg-red-50 border-red-200 text-red-800 font-semibold cursor-not-allowed"
        />
       </div>
       <div>
        <Label htmlFor="dfc_outstanding_amount">DFC Outstanding Amount (£)</Label>
        <Input
         id="dfc_outstanding_amount"
         type="number"
         step="0.01"
         placeholder="0.00"
         value={formatDisplayValue(formData.dfc_outstanding_amount)}
         onChange={e => handleFinancialInputChange("dfc_outstanding_amount", e.target.value)}
         className="mt-1"
        />
       </div>
      </div>
     </div>

     {/* Customer Information */}
     <div className="bg-green-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       <div>
        <Label htmlFor="customer_first_name">Customer First Name</Label>
        <Input
         id="customer_first_name"
         value={formData.customer_first_name}
         onChange={e => handleInputChange("customer_first_name", e.target.value)}
         className="mt-1"
        />
       </div>
       <div>
        <Label htmlFor="customer_surname">Customer Surname</Label>
        <Input
         id="customer_surname"
         value={formData.customer_surname}
         onChange={e => handleInputChange("customer_surname", e.target.value)}
         className="mt-1"
        />
       </div>
       <div className="md:col-span-2">
        <Label htmlFor="payment_notes">Payment Notes</Label>
        <Textarea
         id="payment_notes"
         value={formData.payment_notes}
         onChange={e => handleInputChange("payment_notes", e.target.value)}
         className="mt-1"
         rows={3}
        />
       </div>
      </div>
     </div>

     {/* Action Buttons */}
     <div className="flex justify-end space-x-3 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onClose}>
       Cancel
      </Button>
      <Button type="submit" disabled={mutation.isPending} className="bg-red-600 hover:bg-red-700">
       {mutation.isPending ? "Saving..." : mode === "add" ? "Add Vehicle" : "Update Vehicle"}
      </Button>
     </div>
    </form>
   </DialogContent>

   {/* Delete Confirmation Dialog */}
   <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
    <DialogContent className="max-w-md">
     <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
       <Trash2 className="h-5 w-5" />
       Delete Vehicle
      </DialogTitle>
      <DialogDescription>Confirm deletion of this vehicle from the inventory</DialogDescription>
     </DialogHeader>
     <div className="space-y-4">
      <p className="text-gray-700">Are you sure you want to delete this vehicle?</p>
      <div className="bg-gray-50 p-3 rounded-lg">
       <p className="font-semibold">Stock Number: {vehicle?.stock_number}</p>
       <p className="text-sm text-gray-600">
        {vehicle?.make} {vehicle?.model}
       </p>
       <p className="text-sm text-gray-600">Registration: {vehicle?.registration}</p>
      </div>
      <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>
      <div className="flex justify-end space-x-3">
       <Button
        type="button"
        variant="outline"
        onClick={() => setShowDeleteConfirm(false)}
        disabled={deleteMutation.isPending}
       >
        Cancel
       </Button>
       <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
        {deleteMutation.isPending ? "Deleting..." : "Delete Vehicle"}
       </Button>
      </div>
     </div>
    </DialogContent>
   </Dialog>
  </Dialog>
 );
}
