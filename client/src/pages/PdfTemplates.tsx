import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown } from "lucide-react";

export default function PdfTemplates() {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-6"></div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Document Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Create and manage PDF templates for various business documents.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            This section will contain PDF template functionality.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
