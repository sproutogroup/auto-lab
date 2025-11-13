import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function StockSummary() {
 return (
  <div className="p-6 space-y-6">
   <div className="mb-6">
    <div className="flex items-center space-x-2 mb-2">
     <ClipboardList className="h-6 w-6 text-red-600" />
     <h1 className="text-2xl font-semibold text-gray-900">Stock Summary</h1>
    </div>
   </div>

   <Card className="premium-card">
    <CardHeader>
     <CardTitle>Inventory Overview</CardTitle>
    </CardHeader>
    <CardContent>
     <p className="text-gray-600">
      View comprehensive stock summaries, inventory levels, and stock valuation reports.
     </p>
     <div className="mt-4 text-sm text-gray-500">This section will contain stock summary functionality.</div>
    </CardContent>
   </Card>
  </div>
 );
}
