import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";

export default function Tasks() {
 return (
  <div className="p-6 space-y-6">
   <Card className="premium-card">
    <CardHeader>
     <CardTitle>Task Management</CardTitle>
    </CardHeader>
    <CardContent>
     <p className="text-gray-600">Create, assign, and track tasks across your dealership operations.</p>
     <div className="mt-4 text-sm text-gray-500">
      This section will contain task management functionality.
     </div>
    </CardContent>
   </Card>
  </div>
 );
}
