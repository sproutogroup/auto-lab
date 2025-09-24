import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File } from "lucide-react";

export default function CollectionForms() {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-6"></div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Vehicle Collection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Manage vehicle collection forms and documentation for customer
            pickups.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            This section will contain collection forms functionality.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
