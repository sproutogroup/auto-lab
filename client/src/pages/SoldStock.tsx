import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Car,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";

interface SoldVehicle {
  id: number;
  stock_number: string;
  make: string;
  model: string;
  derivative: string;
  colour: string;
  year: number | null;
  mileage: number | null;
  registration: string;
  sale_date: string;
  total_sale_price: string;
  purchase_price_total: string;
  total_gp: string;
  customer_first_name: string;
  customer_surname: string;
  sales_status: string;
}

export default function SoldStock() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("sale_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const {
    data: vehicles,
    isLoading,
    error,
  } = useQuery<SoldVehicle[]>({
    queryKey: ["/api/vehicles/sold"],
  });

  const filteredAndSortedVehicles = useMemo(() => {
    if (!vehicles) return [];

    let filtered = vehicles.filter((vehicle) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        vehicle.stock_number.toLowerCase().includes(searchLower) ||
        vehicle.registration?.toLowerCase().includes(searchLower) ||
        `${vehicle.make} ${vehicle.model}`
          .toLowerCase()
          .includes(searchLower) ||
        vehicle.derivative?.toLowerCase().includes(searchLower) ||
        `${vehicle.customer_first_name} ${vehicle.customer_surname}`
          .toLowerCase()
          .includes(searchLower)
      );
    });

    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof SoldVehicle];
      let bValue: any = b[sortBy as keyof SoldVehicle];

      if (sortBy === "sale_date") {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else if (
        sortBy === "total_sale_price" ||
        sortBy === "purchase_price_total" ||
        sortBy === "total_gp"
      ) {
        aValue = parseFloat(aValue || "0");
        bValue = parseFloat(bValue || "0");
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [vehicles, searchTerm, sortBy, sortOrder]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Sold Stock</h1>
          </div>
          <p className="text-gray-600">View all vehicles that have been sold</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="premium-card">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-8 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="premium-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Sold Stock</h1>
          </div>
        </div>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Unable to load sold vehicles</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const soldVehicles = filteredAndSortedVehicles;
  const allVehicles = vehicles || [];

  const totalSoldValue = allVehicles.reduce((sum, vehicle) => {
    const price = parseFloat(vehicle.total_sale_price) || 0;
    return sum + price;
  }, 0);

  const totalGrossProfit = allVehicles.reduce((sum, vehicle) => {
    const gp = parseFloat(vehicle.total_gp) || 0;
    return sum + gp;
  }, 0);

  const thisMonthSales = allVehicles.filter((vehicle) => {
    if (!vehicle.sale_date) return false;
    const saleDate = new Date(vehicle.sale_date);
    const now = new Date();
    return (
      saleDate.getMonth() === now.getMonth() &&
      saleDate.getFullYear() === now.getFullYear()
    );
  });

  const thisMonthValue = thisMonthSales.reduce((sum, vehicle) => {
    const price = parseFloat(vehicle.total_sale_price) || 0;
    return sum + price;
  }, 0);

  const exportToCSV = () => {
    const headers = [
      "Stock Number",
      "Registration",
      "Make",
      "Model",
      "Derivative",
      "Year",
      "Colour",
      "Mileage",
      "Customer Name",
      "Sale Date",
      "Purchase Price",
      "Sale Price",
      "Gross Profit",
    ];

    const csvData = soldVehicles.map((vehicle) => [
      vehicle.stock_number,
      vehicle.registration || "",
      vehicle.make,
      vehicle.model,
      vehicle.derivative || "",
      vehicle.year || "",
      vehicle.colour,
      vehicle.mileage || "",
      `${vehicle.customer_first_name} ${vehicle.customer_surname}`,
      vehicle.sale_date
        ? new Date(vehicle.sale_date).toLocaleDateString("en-GB")
        : "",
      parseFloat(vehicle.purchase_price_total || "0").toFixed(2),
      parseFloat(vehicle.total_sale_price || "0").toFixed(2),
      parseFloat(vehicle.total_gp || "0").toFixed(2),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `sold-vehicles-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sold</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allVehicles.length}
                </p>
              </div>
              <Car className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Sale Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  £{totalSoldValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Gross Profit
                </p>
                <p
                  className={`text-2xl font-bold ${totalGrossProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  £{totalGrossProfit.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {thisMonthSales.length}
                </p>
                <p className="text-sm text-gray-500">
                  £{thisMonthValue.toLocaleString()}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <Card className="premium-card">
        <CardContent className="p-3 md:p-4">
          {/* Single Line Layout */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by stock number, registration, vehicle, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full md:w-80"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale_date">Sale Date</SelectItem>
                  <SelectItem value="stock_number">Stock Number</SelectItem>
                  <SelectItem value="make">Make</SelectItem>
                  <SelectItem value="total_sale_price">Sale Price</SelectItem>
                  <SelectItem value="total_gp">Gross Profit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Highest</SelectItem>
                  <SelectItem value="asc">Lowest</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
              <div className="text-sm text-gray-600">
                <span className="font-medium">
                  Showing {soldVehicles.length}
                </span>{" "}
                of {allVehicles.length} sold vehicles
              </div>
              <div className="hidden md:block text-xs text-gray-400">
                Click rows to highlight • Compact view for maximum data
                visibility
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sold Vehicles Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Sold Vehicles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {soldVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-lg mb-2">
                No sold vehicles found
              </p>
              <p className="text-gray-400 text-sm">
                Sold vehicles will appear here once sales are recorded
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">
                      Stock #
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">
                      Registration
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">
                      Vehicle Details
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">
                      Customer
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">
                      Sale Date
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900 text-xs">
                      Purchase Price
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900 text-xs">
                      Sale Price
                    </th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-900 text-xs">
                      Gross Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {soldVehicles.map((vehicle, index) => (
                    <tr
                      key={vehicle.id}
                      onClick={() =>
                        setSelectedRow(
                          selectedRow === vehicle.id ? null : vehicle.id,
                        )
                      }
                      className={`border-b border-gray-100 transition-all duration-200 cursor-pointer h-8 ${
                        selectedRow === vehicle.id
                          ? "bg-blue-50 border-blue-200 shadow-sm"
                          : index % 2 === 0
                            ? "bg-white hover:bg-gray-50"
                            : "bg-gray-50/50 hover:bg-gray-100"
                      }`}
                    >
                      <td className="py-1 px-3">
                        <span className="font-medium text-gray-900 text-xs">
                          {vehicle.stock_number}
                        </span>
                      </td>
                      <td className="py-1 px-3">
                        <span className="font-medium text-blue-600 text-xs">
                          {vehicle.registration || "-"}
                        </span>
                      </td>
                      <td className="py-1 px-3">
                        <div>
                          <div className="font-medium text-gray-900 text-xs">
                            {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 leading-tight">
                            {vehicle.derivative && `${vehicle.derivative} • `}
                            {vehicle.year && `${vehicle.year} • `}
                            {vehicle.colour}
                            {vehicle.mileage &&
                              ` • ${vehicle.mileage.toLocaleString()}mi`}
                          </div>
                        </div>
                      </td>
                      <td className="py-1 px-3">
                        <span className="text-gray-900 text-xs">
                          {vehicle.customer_first_name}{" "}
                          {vehicle.customer_surname}
                        </span>
                      </td>
                      <td className="py-1 px-3">
                        <span className="text-gray-900 text-xs">
                          {vehicle.sale_date
                            ? new Date(vehicle.sale_date).toLocaleDateString(
                                "en-GB",
                              )
                            : "-"}
                        </span>
                      </td>
                      <td className="py-1 px-3 text-right">
                        <span className="font-semibold text-orange-600 text-xs">
                          £
                          {parseFloat(
                            vehicle.purchase_price_total || "0",
                          ).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-1 px-3 text-right">
                        <span className="font-semibold text-green-600 text-xs">
                          £
                          {parseFloat(
                            vehicle.total_sale_price || "0",
                          ).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-1 px-3 text-right">
                        <span
                          className={`font-semibold text-xs ${
                            parseFloat(vehicle.total_gp || "0") >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          £
                          {parseFloat(vehicle.total_gp || "0").toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
