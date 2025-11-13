import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Warehouse, Search, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface VehicleData {
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
}

// Columns for current stock - only up to purchase_price_total
const columns = [
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
];

// Badge component for status displays
const StatusBadge = ({ value, type }: { value: string; type: "sales" | "collection" }) => {
 if (!value) return <span className="text-gray-400">-</span>;

 const normalizedValue = value.toUpperCase();

 if (type === "sales") {
  if (normalizedValue === "STOCK") {
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

export default function CurrentStock() {
 const [searchTerm, setSearchTerm] = useState("");
 const [zoomLevel, setZoomLevel] = useState(1);
 const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
 const { toast } = useToast();

 const { data: rawVehicles = [], isLoading } = useQuery<VehicleData[]>({
  queryKey: ["/api/vehicles"],
 });

 // Filter only vehicles with STOCK status and sort by stock number
 const stockVehicles = rawVehicles
  .filter(vehicle => vehicle.sales_status?.toUpperCase() === "STOCK")
  .sort((a, b) =>
   a.stock_number.localeCompare(b.stock_number, undefined, {
    numeric: true,
   }),
  );

 const handleRowClick = (vehicle: VehicleData) => {
  setSelectedRowId(vehicle.id);
 };

 const handleExport = () => {
  if (stockVehicles.length === 0) {
   toast({
    title: "No Data",
    description: "No stock vehicles to export",
    variant: "destructive",
   });
   return;
  }

  // Create CSV headers
  const csvHeaders = columns.map(col => col.label).join(",");

  // Create CSV rows
  const csvRows = stockVehicles.map(vehicle => {
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
  link.setAttribute("download", `current_stock_export_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
   title: "Export Successful",
   description: `Exported ${stockVehicles.length} stock vehicles to CSV`,
  });
 };

 const filteredVehicles = stockVehicles.filter(vehicle =>
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
   const date = new Date(dateString);
   if (isNaN(date.getTime())) return dateString; // Return original if invalid
   return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
   });
  } catch {
   return dateString;
  }
 };

 const renderCellContent = (vehicle: VehicleData, column: any) => {
  const value = vehicle[column.key as keyof VehicleData];

  // Handle status badges
  if (column.key === "sales_status") {
   return <StatusBadge value={value as string} type="sales" />;
  }

  if (column.key === "collection_status") {
   return <StatusBadge value={value as string} type="collection" />;
  }

  // Handle currency fields
  if ((column.key.includes("purchase_") && column.key !== "purchase_invoice_date") || column.key === "vat") {
   return <span className="font-mono">{formatCurrency(value as string)}</span>;
  }

  // Handle date fields
  if (column.key.includes("date")) {
   return formatDate(value as string);
  }

  // Handle numeric fields
  if (column.key === "mileage" && value) {
   return (value as number).toLocaleString();
  }

  // Return formatted value or empty string
  return value || "";
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
      <Button variant="outline" size="sm" onClick={handleExport} className="whitespace-nowrap">
       <Download className="h-4 w-4" />
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
          Loading stock vehicles...
         </td>
        </tr>
       ) : filteredVehicles.length === 0 ? (
        <tr>
         <td colSpan={columns.length} className="text-center py-8 text-gray-500">
          {searchTerm ? "No vehicles found matching search criteria" : "No stock vehicles found"}
         </td>
        </tr>
       ) : (
        filteredVehicles.map((vehicle, rowIndex) => (
         <tr
          key={vehicle.id}
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
                          border border-gray-300 px-1 py-1 text-center whitespace-nowrap overflow-hidden text-ellipsis
                          ${column.sticky ? "sticky left-0 z-10" : ""}
                          ${selectedRowId === vehicle.id && column.sticky ? "bg-red-100 border-red-300" : ""}
                          ${selectedRowId !== vehicle.id && column.sticky ? (rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50") : ""}
                        `}
            style={{
             width: `${column.width}px`,
             minWidth: `${column.width}px`,
             // Ensure sticky columns always have solid background colors
             backgroundColor: column.sticky
              ? selectedRowId === vehicle.id
                ? "rgba(220, 38, 38, 0.1)"
                : rowIndex % 2 === 0
                  ? "#ffffff"
                  : "#f9fafb"
              : selectedRowId === vehicle.id
                ? undefined
                : column.backgroundColor,
             fontSize: `${12 * zoomLevel}px`,
             height: "32px",
             lineHeight: "1.2",
            }}
            title={vehicle[column.key as keyof VehicleData]?.toString() || ""}
           >
            {renderCellContent(vehicle, column)}
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
     <div className="text-center py-8 text-gray-500">Loading stock vehicles...</div>
    ) : filteredVehicles.length === 0 ? (
     <div className="text-center py-8 text-gray-500">
      {searchTerm ? "No vehicles found matching search criteria" : "No stock vehicles found"}
     </div>
    ) : (
     filteredVehicles.map((vehicle, index) => (
      <div
       key={`${vehicle.id}-${vehicle.stock_number}-${index}`}
       className={`
                bg-white rounded-lg shadow-md border-l-4 p-4 cursor-pointer transition-all duration-200 touch-manipulation
                ${selectedRowId === vehicle.id ? "border-l-red-500 bg-red-50 shadow-lg" : "border-l-green-500"}
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

       {/* Purchase Information */}
       <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm">
         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Purchase Price</div>
          <div className="text-gray-900 font-medium">{formatCurrency(vehicle.purchase_price_total)}</div>
         </div>

         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Purchase Date</div>
          <div className="text-gray-900">
           {vehicle.purchase_invoice_date ? formatDate(vehicle.purchase_invoice_date) : "N/A"}
          </div>
         </div>

         <div className="space-y-1">
          <div className="font-semibold text-gray-700">PX Value</div>
          <div className="text-gray-900">{formatCurrency(vehicle.purchase_px_value)}</div>
         </div>

         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Buyer</div>
          <div className="text-gray-900">{vehicle.buyer || "N/A"}</div>
         </div>
        </div>
       </div>

       {/* Additional Purchase Details */}
       <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-3 text-sm">
         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Cash Payment</div>
          <div className="text-gray-900 font-medium">{formatCurrency(vehicle.purchase_cash)}</div>
         </div>

         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Fees</div>
          <div className="text-gray-900">{formatCurrency(vehicle.purchase_fees)}</div>
         </div>

         <div className="space-y-1">
          <div className="font-semibold text-gray-700">Finance Settlement</div>
          <div className="text-gray-900">{formatCurrency(vehicle.purchase_finance_settlement)}</div>
         </div>

         <div className="space-y-1">
          <div className="font-semibold text-gray-700">VAT</div>
          <div className="text-gray-900">{formatCurrency(vehicle.vat)}</div>
         </div>
        </div>
       </div>

       {/* Registration Information */}
       {vehicle.date_of_registration && (
        <div className="mt-3 pt-3 border-t border-gray-200">
         <div className="text-sm">
          <div className="font-semibold text-gray-700">Registration Date</div>
          <div className="text-gray-900">{formatDate(vehicle.date_of_registration)}</div>
          {vehicle.chassis_number && (
           <div className="text-gray-600 mt-1">Chassis: {vehicle.chassis_number}</div>
          )}
         </div>
        </div>
       )}
      </div>
     ))
    )}
   </div>

   <Toaster />
  </div>
 );
}
