import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Car, Upload, Download, Plus, Search, Filter, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import VehicleModal from "@/components/VehicleModal";

export interface VehicleData {
 id: number;
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
 mileage: number;
 year: number;
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

const columns = [
 {
  key: "actions",
  label: "ACTIONS",
  width: 60,
  sticky: false,
  backgroundColor: "#ffffff",
 },
 {
  key: "stock_number",
  label: "STOCK #",
  width: 75,
  sticky: true,
  backgroundColor: "#ffffff",
 },
 { key: "department", label: "DEPT.", width: 50, backgroundColor: "#ffffff" },
 { key: "buyer", label: "BUYER", width: 50, backgroundColor: "#ffffff" },
 {
  key: "sales_status",
  label: "SALES STATUS",
  width: 80,
  backgroundColor: "#ffffff",
 },
 {
  key: "collection_status",
  label: "COLLECTION STATUS",
  width: 90,
  backgroundColor: "#ffffff",
 },
 {
  key: "registration",
  label: "REGISTRATION",
  width: 80,
  backgroundColor: "#ffffff",
 },
 { key: "make", label: "MAKE", width: 60, backgroundColor: "#ffffff" },
 { key: "model", label: "MODEL", width: 80, backgroundColor: "#ffffff" },
 {
  key: "derivative",
  label: "DERIVATIVE",
  width: 100,
  backgroundColor: "#ffffff",
 },
 { key: "colour", label: "COLOUR", width: 60, backgroundColor: "#ffffff" },
 { key: "mileage", label: "MILEAGE", width: 60, backgroundColor: "#ffffff" },
 { key: "year", label: "YEAR", width: 45, backgroundColor: "#ffffff" },
 {
  key: "date_of_registration",
  label: "D.O.R",
  width: 70,
  backgroundColor: "#ffffff",
 },
 {
  key: "chassis_number",
  label: "CHASSIS NUMBER",
  width: 110,
  backgroundColor: "#ffffff",
 },
 {
  key: "purchase_invoice_date",
  label: "PURCHASE INVOICE DATE",
  width: 90,
  backgroundColor: "#ffffff",
 },
 // Purchase columns
 {
  key: "purchase_px_value",
  label: "PURCHASE PX VALUE",
  width: 85,
  backgroundColor: "#ffffff",
 },
 {
  key: "purchase_cash",
  label: "PURCHASE CASH",
  width: 80,
  backgroundColor: "#ffffff",
 },
 {
  key: "purchase_fees",
  label: "PURCHASE FEES",
  width: 80,
  backgroundColor: "#ffffff",
 },
 {
  key: "purchase_finance_settlement",
  label: "PURCHASE FINANCE SETTLEMENT",
  width: 110,
  backgroundColor: "#ffffff",
 },
 {
  key: "purchase_bank_transfer",
  label: "PURCHASE BANK TRANSFER",
  width: 100,
  backgroundColor: "#ffffff",
 },
 { key: "vat", label: "VAT", width: 50, backgroundColor: "#ffffff" },
 {
  key: "purchase_price_total",
  label: "PURCHASE PRICE TOTAL",
  width: 90,
  backgroundColor: "#ffeb24",
 },
 // Sale columns - green background for sales fields
 {
  key: "sale_date",
  label: "SALE DATE",
  width: 70,
  backgroundColor: "#46d359",
 },
 {
  key: "bank_payment",
  label: "BANK PAYMENT",
  width: 80,
  backgroundColor: "#46d359",
 },
 {
  key: "finance_payment",
  label: "FINANCE PAYMENT",
  width: 85,
  backgroundColor: "#46d359",
 },
 {
  key: "finance_settlement",
  label: "FINANCE SETTLEMENT",
  width: 90,
  backgroundColor: "#46d359",
 },
 { key: "px_value", label: "PX VALUE", width: 65, backgroundColor: "#46d359" },
 {
  key: "vat_payment",
  label: "VAT PAYMENT",
  width: 70,
  backgroundColor: "#46d359",
 },
 {
  key: "cash_payment",
  label: "CASH PAYMENT",
  width: 75,
  backgroundColor: "#46d359",
 },
 {
  key: "total_sale_price",
  label: "TOTAL SALE PRICE",
  width: 90,
  backgroundColor: "#ffeb24",
 },
 // Additional financial columns - peach background
 { key: "cash_o_b", label: "CASH O/B", width: 60, backgroundColor: "#fce2d5" },
 {
  key: "px_o_r_value",
  label: "PX O/R VALUE",
  width: 75,
  backgroundColor: "#fce2d5",
 },
 { key: "road_tax", label: "ROAD TAX", width: 60, backgroundColor: "#fce2d5" },
 { key: "dvla", label: "DVLA", width: 50, backgroundColor: "#fce2d5" },
 {
  key: "alloy_insurance",
  label: "ALLOY INSURANCE",
  width: 80,
  backgroundColor: "#fce2d5",
 },
 {
  key: "paint_insurance",
  label: "PAINT INSURANCE",
  width: 80,
  backgroundColor: "#fce2d5",
 },
 {
  key: "gap_insurance",
  label: "GAP INSURANCE",
  width: 75,
  backgroundColor: "#fce2d5",
 },
 // Cost columns - light green background
 {
  key: "parts_cost",
  label: "PARTS COST",
  width: 65,
  backgroundColor: "#83e28e",
 },
 {
  key: "paint_labour_costs",
  label: "PAINT & LABOUR COSTS",
  width: 95,
  backgroundColor: "#83e28e",
 },
 {
  key: "warranty_costs",
  label: "WARRANTY COSTS",
  width: 80,
  backgroundColor: "#83e28e",
 },
 // GP columns - gray background
 {
  key: "total_gp",
  label: "TOTAL GP (£'s)",
  width: 75,
  backgroundColor: "#d0d0d0",
 },
 {
  key: "adj_gp",
  label: "ADJ GP (£'s)",
  width: 75,
  backgroundColor: "#d0d0d0",
 },
 {
  key: "dfc_outstanding_amount",
  label: "DFC OUTSTANDING AMOUNT",
  width: 90,
  backgroundColor: "#d0d0d0",
 },
 // Customer columns - green background
 {
  key: "payment_notes",
  label: "PAYMENT NOTES",
  width: 90,
  backgroundColor: "#ffffff",
 },
 {
  key: "customer_first_name",
  label: "CUSTOMER FIRST NAME",
  width: 90,
  backgroundColor: "#46d359",
 },
 {
  key: "customer_surname",
  label: "CUSTOMER SURNAME",
  width: 90,
  backgroundColor: "#46d359",
 },
];

// Badge component for status displays
const StatusBadge = ({ value, type }: { value: string; type: "sales" | "collection" }) => {
 if (!value) return <span className="text-gray-400">-</span>;

 const normalizedValue = value.toUpperCase();

 if (type === "sales") {
  if (normalizedValue === "SOLD") {
   return (
    <span
     className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium bg-red-500 text-white"
     style={{ fontSize: "10px" }}
    >
     SOLD
    </span>
   );
  } else if (normalizedValue === "STOCK") {
   return (
    <span
     className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium bg-green-500 text-white"
     style={{ fontSize: "10px" }}
    >
     STOCK
    </span>
   );
  } else if (normalizedValue === "AUTOLAB") {
   return (
    <span
     className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium bg-purple-500 text-white"
     style={{ fontSize: "10px" }}
    >
     AUTOLAB
    </span>
   );
  }
 }

 if (type === "collection") {
  if (normalizedValue === "ON SITE") {
   return (
    <span
     className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium bg-green-500 text-white"
     style={{ fontSize: "10px" }}
    >
     ON SITE
    </span>
   );
  } else if (normalizedValue === "AWD") {
   return (
    <span
     className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium bg-red-500 text-white"
     style={{ fontSize: "10px" }}
    >
     AWD
    </span>
   );
  }
 }

 // Return original value if no badge styling applies
 return <span>{value}</span>;
};

export default function VehicleMaster() {
 const [searchTerm, setSearchTerm] = useState("");
 const [zoomLevel, setZoomLevel] = useState(1);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [modalMode, setModalMode] = useState<"add" | "edit">("add");
 const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | undefined>();
 const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const { toast } = useToast();

 const { data: rawVehicles = [], isLoading } = useQuery<VehicleData[]>({
  queryKey: ["/api/vehicles"],
  staleTime: 0, // Force fresh data
  cacheTime: 0, // Don't cache data
 });

 console.log("All vehicles data", rawVehicles)

 // Sort vehicles: Sold first (by sale date ascending), then Autolab (by stock number), then Stock (by stock number ascending)
 const vehicles = rawVehicles.sort((a, b) => {
  // Normalize sales status to handle case variations
  const statusA = a.sales_status?.toUpperCase();
  const statusB = b.sales_status?.toUpperCase();

  // First, separate by sales status - SOLD first, then AUTOLAB, then STOCK
  if (statusA === "SOLD" && statusB !== "SOLD") return -1;
  if (statusA !== "SOLD" && statusB === "SOLD") return 1;

  // Both are SOLD - sort by sale date (ascending, oldest first)
  if (statusA === "SOLD" && statusB === "SOLD") {
   const dateA = a.sale_date ? new Date(a.sale_date).getTime() : 0;
   const dateB = b.sale_date ? new Date(b.sale_date).getTime() : 0;
   return dateA - dateB;
  }

  // After SOLD, prioritize AUTOLAB before STOCK
  if (statusA === "AUTOLAB" && statusB === "STOCK") return -1;
  if (statusA === "STOCK" && statusB === "AUTOLAB") return 1;

  // Both are AUTOLAB or both are STOCK - sort by stock number (ascending)
  return a.stock_number.localeCompare(b.stock_number, undefined, {
   numeric: true,
  });
 });

 const importMutation = useMutation({
  mutationFn: async (csvData: any[]) => {
   console.log(`[Frontend] Starting CSV import with ${csvData.length} vehicles`);
   const response = await fetch("/api/vehicles/import", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vehicles: csvData }),
   });
   console.log(`[Frontend] CSV import response status: ${response.status}`);
   if (!response.ok) {
    const errorData = await response.text();
    console.log(`[Frontend] CSV import error response:`, errorData);
    throw new Error("Import failed");
   }
   return response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
   queryClient.invalidateQueries({ queryKey: ["/api/customers/crm-stats"] });
   queryClient.invalidateQueries({ queryKey: ["/api/stock-age/analytics"] });
   toast({
    title: "Import Successful",
    description: "Vehicles have been imported successfully",
   });
  },
  onError: error => {
   toast({
    title: "Import Failed",
    description: "Failed to import vehicles. Please check the CSV format.",
    variant: "destructive",
   });
  },
 });

 const parseCsvData = (csvText: string) => {
  const lines = csvText
   .trim()
   .split("\n")
   .filter(line => line.trim());
  if (lines.length === 0) {
   throw new Error("Empty CSV file");
  }

  // Parse CSV properly handling quoted values with commas
  const parseCSVLine = (line: string) => {
   const result = [];
   let current = "";
   let inQuotes = false;

   for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
     if (inQuotes && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
     } else {
      inQuotes = !inQuotes;
     }
    } else if (char === "," && !inQuotes) {
     result.push(current.trim());
     current = "";
    } else {
     current += char;
    }
   }
   result.push(current.trim());
   return result;
  };

  const headers = parseCSVLine(lines[0]);

  // Map CSV headers to database field names
  const headerMap: { [key: string]: string } = {
   "Stock No.": "stock_number",
   "Dept.": "department",
   Buyer: "buyer",
   "Sales Status": "sales_status",
   "Collection Status": "collection_status",
   Registration: "registration",
   Make: "make",
   Model: "model",
   Derivative: "derivative",
   Colour: "colour",
   Mileage: "mileage",
   Year: "year",
   "D.O.R": "date_of_registration",
   "Chassis Number": "chassis_number",
   "Purchase Invoice Date": "purchase_invoice_date",
   "Purchase PX Value": "purchase_px_value",
   "Purchase Cash": "purchase_cash",
   "Purchase Fees": "purchase_fees",
   "Purchase Finance Settlement": "purchase_finance_settlement",
   "Purchase Bank Transfer": "purchase_bank_transfer",
   VAT: "vat",
   "Purchase Price Total": "purchase_price_total",
   "Sale Date": "sale_date",
   "Bank Payment": "bank_payment",
   "Finance Payment": "finance_payment",
   "Finance Settlement": "finance_settlement",
   "PX Value": "px_value",
   "Vat Payment": "vat_payment",
   "Cash Payment": "cash_payment",
   "Total Sale Price": "total_sale_price",
   "Cash O/B": "cash_o_b",
   "PX O/R Value": "px_o_r_value",
   "Road Tax": "road_tax",
   DVLA: "dvla",
   "Alloy Insurance": "alloy_insurance",
   "Paint Insrance": "paint_insurance",
   "Paint Insurance": "paint_insurance",
   "Gap Insurance": "gap_insurance",
   "Parts Cost": "parts_cost",
   "Paint &  Labour Costs": "paint_labour_costs",
   "Paint & Labour Costs": "paint_labour_costs",
   "Warranty Costs": "warranty_costs",
   "Total GP (£'s)": "total_gp",
   "ADJ GP (£'s)": "adj_gp",
   "Payment Notes": "payment_notes",
   "Customer  First Name": "customer_first_name",
   "Customer  Surname": "customer_surname",
  };

  const vehicles = [];
  for (let i = 1; i < lines.length; i++) {
   const line = lines[i].trim();
   if (line) {
    const values = parseCSVLine(line);
    const vehicle: any = {};

    headers.forEach((header, index) => {
     const cleanHeader = header.replace(/['"]/g, "").trim();
     const dbField = headerMap[cleanHeader] || cleanHeader.toLowerCase().replace(/[^a-z0-9]/g, "_");
     let value = (values[index] || "").replace(/^["']|["']$/g, "").trim();

     // Skip empty values
     if (!value || value === "") {
      vehicle[dbField] = null;
      return;
     }

     // Convert currency values
     if (value.startsWith("£") || value.includes("£")) {
      const numericValue = value.replace(/[£,]/g, "");
      // Ensure we preserve the decimal value properly
      const parsedValue = parseFloat(numericValue);
      if (!isNaN(parsedValue)) {
       vehicle[dbField] = numericValue;
      } else {
       vehicle[dbField] = null;
      }
      return;
     }

     // Convert dates
     if (dbField.includes("date") && value) {
      try {
       // Handle various date formats
       const dateFormats = [
        value, // Original format
        value.replace(/(\d+)-(\w+)-(\d+)/, "$3-$2-$1"), // DD-MMM-YY to YY-MMM-DD
       ];

       for (const format of dateFormats) {
        const date = new Date(format);
        if (!isNaN(date.getTime())) {
         vehicle[dbField] = date.toISOString();
         return;
        }
       }
       vehicle[dbField] = value; // Keep original if parsing fails
      } catch {
       vehicle[dbField] = value;
      }
      return;
     }

     // Convert numbers
     if (dbField === "mileage" || dbField === "year") {
      const numValue = parseInt(value.replace(/[,]/g, ""));
      vehicle[dbField] = isNaN(numValue) ? null : numValue;
     } else {
      vehicle[dbField] = value;
     }
    });

    vehicles.push(vehicle);
   }
  }

  return vehicles;
 };

 const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Check file size (limit to 10MB)
  if (file.size > 10 * 1024 * 1024) {
   toast({
    title: "File Too Large",
    description: "Please select a CSV file smaller than 10MB.",
    variant: "destructive",
   });
   return;
  }

  // Check file type
  if (!file.name.toLowerCase().endsWith(".csv")) {
   toast({
    title: "Invalid File Type",
    description: "Please select a CSV file.",
    variant: "destructive",
   });
   return;
  }

  toast({
   title: "Processing File",
   description: "Reading and parsing CSV file...",
  });

  const reader = new FileReader();
  reader.onload = e => {
   try {
    const csvText = e.target?.result as string;

    toast({
     title: "Parsing Complete",
     description: "Starting import process...",
    });

    const parsedData = parseCsvData(csvText);

    if (parsedData.length === 0) {
     toast({
      title: "Empty File",
      description: "The CSV file contains no valid data.",
      variant: "destructive",
     });
     return;
    }

    toast({
     title: "Import Starting",
     description: `Importing ${parsedData.length} vehicles...`,
    });

    importMutation.mutate(parsedData);
   } catch (error) {
    console.error("CSV parsing error:", error);
    toast({
     title: "Parse Error",
     description: `Failed to parse CSV file: ${error instanceof Error ? error.message : "Unknown error"}`,
     variant: "destructive",
    });
   }
  };

  reader.onerror = () => {
   toast({
    title: "File Read Error",
    description: "Failed to read the file. Please try again.",
    variant: "destructive",
   });
  };

  reader.readAsText(file);

  // Clear the input so the same file can be selected again
  event.target.value = "";
 };

 const handleImportClick = () => {
  fileInputRef.current?.click();
 };

 const handleAddVehicle = () => {
  setModalMode("add");
  setSelectedVehicle(undefined);
  setIsModalOpen(true);
 };

 const handleEditVehicle = (vehicle: VehicleData) => {
  setModalMode("edit");
  setSelectedVehicle(vehicle);
  setIsModalOpen(true);
 };

 const handleCloseModal = () => {
  setIsModalOpen(false);
  setSelectedVehicle(undefined);
 };

 const handleRowClick = (vehicle: VehicleData) => {
  setSelectedRowId(prevId => (prevId === vehicle.id ? null : vehicle.id));
 };

 const handleExport = () => {
  if (vehicles.length === 0) {
   toast({
    title: "No Data",
    description: "No vehicles to export",
    variant: "destructive",
   });
   return;
  }

  // Create CSV headers
  const csvHeaders = columns.map(col => col.label).join(",");

  // Create CSV rows
  const csvRows = vehicles.map(vehicle => {
   return columns
    .map(col => {
     const value = vehicle[col.key as keyof VehicleData];
     if (value === null || value === undefined) return "";
     return `"${value.toString().replace(/"/g, '""')}"`;
    })
    .join(",");
  });

  const csvContent = [csvHeaders, ...csvRows].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `vehicles_export_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
   title: "Export Successful",
   description: `Exported ${vehicles.length} vehicles to CSV`,
  });
 };

 const filteredVehicles = vehicles.filter(vehicle =>
  Object.values(vehicle).some(value => value?.toString().toLowerCase().includes(searchTerm.toLowerCase())),
 );

 const formatCurrency = (value: string | number | null | undefined, allowZero: boolean = false) => {
  // Handle null/undefined values - show £0.00 for all financial fields
  if (value === null || value === undefined) {
   return "£0.00";
  }

  // Handle empty string values
  if (value === "") {
   return "£0.00";
  }

  // Remove existing £ symbols and clean the value
  const cleanValue = value.toString().replace(/[£,]/g, "");
  const numValue = parseFloat(cleanValue);

  // If can't parse as number, show £0.00
  if (isNaN(numValue)) {
   return "£0.00";
  }

  // Format with commas and £ symbol - always show values including zero
  return `£${numValue.toLocaleString("en-GB", {
   minimumFractionDigits: 2,
   maximumFractionDigits: 2,
  })}`;
 };

 const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
   return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
   });
  } catch {
   return dateString;
  }
 };

 return (
  <div className="flex flex-col h-full bg-gray-50">
   {/* Page Controls */}
   <div className="p-3 md:p-6 bg-white border-b border-gray-200">
    {/* Search and Controls */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
     <div className="flex items-center space-x-2">
      <div className="relative flex-1 md:flex-none">
       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
       <Input
        placeholder="Search vehicles..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="pl-10 w-full md:w-80"
       />
      </div>
      <Button variant="outline" size="sm" className="whitespace-nowrap">
       <Filter className="h-4 w-4 mr-2" />
       Filter
      </Button>
      <input
       type="file"
       ref={fileInputRef}
       onChange={handleFileUpload}
       accept=".csv"
       style={{ display: "none" }}
      />
      <Button
       variant="outline"
       size="sm"
       onClick={handleImportClick}
       disabled={importMutation.isPending}
       className="h-10 w-10 p-0"
      >
       <Upload className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={handleExport} className="h-10 w-10 p-0">
       <Download className="h-4 w-4" />
      </Button>
      <Button size="sm" className="bg-red-600 hover:bg-red-700 h-10 w-10 p-0" onClick={handleAddVehicle}>
       <Plus className="h-4 w-4" />
      </Button>
     </div>

     {/* Zoom Control - Hide on mobile */}
     <div className="hidden md:flex items-center space-x-2">
      <span className="text-sm text-gray-600">Zoom:</span>
      <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}>
       -
      </Button>
      <span className="text-sm w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
      <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}>
       +
      </Button>
     </div>
    </div>
   </div>

   {/* Desktop Grid View */}
   <div className="hidden md:block flex-1 overflow-hidden border border-gray-300 rounded-lg m-6 mt-0 vehicle-master-grid shadow-2xl">
    <div className="h-full horizontal-scroll-visible force-scrollbars overflow-auto">
     <table className="w-full border-collapse">
      {/* Sticky Header */}
      <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
       <tr>
        {columns.map((column, index) => (
         <th
          key={column.key}
          className={`
                      border border-gray-300 px-1 py-1 text-center font-bold text-white uppercase tracking-wide
                      ${column.sticky ? "sticky left-0 z-30 bg-red-600" : "bg-red-600"}
                    `}
          style={{
           width: `${column.width}px`,
           minWidth: `${column.width}px`,
           fontSize: `${9 * zoomLevel}px`,
           height: "28px",
           lineHeight: "1.2",
          }}
         >
          {column.label}
         </th>
        ))}
       </tr>
      </thead>

      {/* Data Rows */}
      <tbody>
       {isLoading ? (
        <tr>
         <td colSpan={columns.length} className="text-center py-8 text-gray-500">
          Loading vehicles...
         </td>
        </tr>
       ) : filteredVehicles.length === 0 ? (
        <tr>
         <td colSpan={columns.length} className="text-center py-8 text-gray-500">
          No vehicles found
         </td>
        </tr>
       ) : (
        filteredVehicles.map((vehicle, rowIndex) => (
         <tr
          key={`${vehicle.id}-${vehicle.stock_number}-${rowIndex}`}
          onClick={() => handleRowClick(vehicle)}
          className={`
                      hover:bg-blue-50 transition-colors cursor-pointer
                      ${
                       selectedRowId === vehicle.id
                        ? "bg-red-100 border-2 border-red-300 shadow-lg"
                        : rowIndex % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                      }
                    `}
         >
          {columns.map(column => (
           <td
            key={`${vehicle.id}-${column.key}`}
            className={`
                          border border-gray-300 px-1 py-1 text-center whitespace-nowrap overflow-hidden
                          ${column.sticky ? "sticky left-0 z-10 font-semibold sticky-white-bg" : ""}
                        `}
            style={{
             width: `${column.width}px`,
             minWidth: `${column.width}px`,
             fontSize: `${10 * zoomLevel}px`,
             height: "22px",
             lineHeight: "1.2",
             backgroundColor: column.sticky ? "#ffffff" : column.backgroundColor || "transparent",
            }}
           >
            {(() => {
             // Handle actions column
             if (column.key === "actions") {
              return (
               <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditVehicle(vehicle)}
                className="h-6 w-6 p-0 hover:bg-red-100"
               >
                <Edit className="h-3 w-3 text-red-600" />
               </Button>
              );
             }

             const value = vehicle[column.key as keyof VehicleData];

             // Handle status badges
             if (column.key === "sales_status") {
              return <StatusBadge value={value?.toString() || ""} type="sales" />;
             }

             if (column.key === "collection_status") {
              return <StatusBadge value={value?.toString() || ""} type="collection" />;
             }

             // Handle different data types
             if (column.key.includes("date") && value) {
              return formatDate(value.toString());
             }

             // Currency formatting for all financial fields
             const currencyFields = [
              "purchase_px_value",
              "purchase_cash",
              "purchase_fees",
              "purchase_finance_settlement",
              "purchase_bank_transfer",
              "vat",
              "purchase_price_total",
              "bank_payment",
              "finance_payment",
              "finance_settlement",
              "px_value",
              "vat_payment",
              "cash_payment",
              "total_sale_price",
              "cash_o_b",
              "px_o_r_value",
              "road_tax",
              "dvla",
              "alloy_insurance",
              "paint_insurance",
              "gap_insurance",
              "parts_cost",
              "paint_labour_costs",
              "warranty_costs",
              "total_gp",
              "adj_gp",
              "dfc_outstanding_amount",
             ];

             if (currencyFields.includes(column.key)) {
              return formatCurrency(value);
             }

             // Mileage formatting with commas
             if (column.key === "mileage" && value) {
              const mileageNum = parseInt(value.toString());
              return isNaN(mileageNum) ? "" : mileageNum.toLocaleString();
             }

             return value?.toString() || "";
            })()}
           </td>
          ))}
         </tr>
        ))
       )}
      </tbody>
     </table>
    </div>
   </div>

   {/* Mobile Card View */}
   <div className="md:hidden flex-1 overflow-auto p-3 space-y-3">
    {isLoading ? (
     <div className="text-center py-8 text-gray-500">Loading vehicles...</div>
    ) : filteredVehicles.length === 0 ? (
     <div className="text-center py-8 text-gray-500">No vehicles found</div>
    ) : (
     filteredVehicles.map((vehicle, index) => (
      <div
       key={`${vehicle.id}-${vehicle.stock_number}-${index}`}
       className={`
                bg-white rounded-lg shadow-md border-l-4 p-4 cursor-pointer transition-all duration-200 touch-manipulation
                ${selectedRowId === vehicle.id ? "border-l-red-500 bg-red-50 shadow-lg" : "border-l-gray-300"}
                ${
                 vehicle.sales_status?.toUpperCase() === "SOLD"
                  ? "border-l-red-500"
                  : vehicle.sales_status?.toUpperCase() === "STOCK"
                    ? "border-l-green-500"
                    : vehicle.sales_status?.toUpperCase() === "AUTOLAB"
                      ? "border-l-purple-500"
                      : "border-l-gray-300"
                }
              `}
       onClick={() => handleRowClick(vehicle)}
      >
       {/* Card Header */}
       <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
         <h3 className="font-bold text-lg text-gray-900">{vehicle.stock_number}</h3>
         <StatusBadge value={vehicle.sales_status || ""} type="sales" />
        </div>
        <div className="flex items-center space-x-2">
         <StatusBadge value={vehicle.collection_status || ""} type="collection" />
         <Button
          variant="ghost"
          size="sm"
          onClick={e => {
           e.stopPropagation();
           handleEditVehicle(vehicle);
          }}
          className="h-8 w-8 p-0 hover:bg-red-100"
         >
          <Edit className="h-4 w-4 text-red-600" />
         </Button>
        </div>
       </div>

       {/* Vehicle Details */}
       <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
         <div className="font-semibold text-gray-700">Vehicle</div>
         <div className="text-gray-900">
          {vehicle.year} {vehicle.make} {vehicle.model}
         </div>
         <div className="text-gray-600">{vehicle.derivative}</div>
        </div>

        <div className="space-y-1">
         <div className="font-semibold text-gray-700">Details</div>
         <div className="text-gray-900">{vehicle.registration}</div>
         <div className="text-gray-600">{vehicle.colour}</div>
        </div>

        <div className="space-y-1">
         <div className="font-semibold text-gray-700">Mileage</div>
         <div className="text-gray-900">
          {vehicle.mileage ? parseInt(vehicle.mileage.toString()).toLocaleString() : "N/A"}
         </div>
        </div>

        <div className="space-y-1">
         <div className="font-semibold text-gray-700">Department</div>
         <div className="text-gray-900">{vehicle.department || "N/A"}</div>
        </div>
       </div>

       {/* Financial Information */}
       <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm">
         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Purchase Price</div>
          <div className="text-gray-900 font-medium">{formatCurrency(vehicle.purchase_price_total)}</div>
         </div>

         {vehicle.sales_status?.toUpperCase() === "SOLD" && (
          <div className="space-y-1">
           <div className="font-semibold text-gray-700">Sale Price</div>
           <div className="text-gray-900 font-medium">{formatCurrency(vehicle.total_sale_price)}</div>
          </div>
         )}

         {vehicle.sales_status?.toUpperCase() === "SOLD" && (
          <div className="space-y-1">
           <div className="font-semibold text-gray-700">Total GP</div>
           <div className="text-gray-900 font-medium">{formatCurrency(vehicle.total_gp)}</div>
          </div>
         )}

         {vehicle.sales_status?.toUpperCase() === "SOLD" && (
          <div className="space-y-1">
           <div className="font-semibold text-gray-700">Adj GP</div>
           <div className="text-gray-900 font-medium">{formatCurrency(vehicle.adj_gp)}</div>
          </div>
         )}

         {vehicle.sales_status?.toUpperCase() === "SOLD" && (
          <div className="space-y-1">
           <div className="font-semibold text-gray-700">DFC Outstanding</div>
           <div className="text-gray-900 font-medium">{formatCurrency(vehicle.dfc_outstanding_amount)}</div>
          </div>
         )}
        </div>
       </div>

       {/* Customer Information (if sold) */}
       {vehicle.sales_status?.toUpperCase() === "SOLD" &&
        (vehicle.customer_first_name || vehicle.customer_surname) && (
         <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-sm">
           <div className="font-semibold text-gray-700">Customer</div>
           <div className="text-gray-900">
            {vehicle.customer_first_name} {vehicle.customer_surname}
           </div>
           {vehicle.sale_date && (
            <div className="text-gray-600">Sale Date: {formatDate(vehicle.sale_date)}</div>
           )}
          </div>
         </div>
        )}
      </div>
     ))
    )}
   </div>

   {/* Footer Summary */}
   <div className="px-3 md:px-6 py-3 bg-gray-100 border-t border-gray-200">
    <div className="flex flex-col md:flex-row md:justify-between md:items-center text-sm text-gray-600 space-y-1 md:space-y-0">
     <span>
      Showing {filteredVehicles.length} of {vehicles.length} vehicles
     </span>
     <span>
      Total Stock Value:{" "}
      {vehicles
       .reduce((sum, v) => {
        const price = parseFloat(v.purchase_price_total?.replace(/[£,]/g, "") || "0");
        return sum + price;
       }, 0)
       .toLocaleString("en-GB", { style: "currency", currency: "GBP" })}
     </span>
    </div>
   </div>

   {/* Vehicle Modal */}
   <VehicleModal isOpen={isModalOpen} onClose={handleCloseModal} vehicle={selectedVehicle} mode={modalMode} />

   <Toaster />
  </div>
 );
}
