import { useState, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InvoiceT } from "@shared/schema";
import { Download } from "lucide-react";



import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Plus, Car, Trash2, Eye, Star, Activity, Calendar, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { log } from "console";
import { generateInvoicePdf } from "@/components/generateInvoicePdf";
import { generateInvoiceExcel } from "@/components/generateInvoiceExcel";

interface InvoiceFormData {
 invoice_no: string;
 tax_point: string;
 check_no: string;
 invoice_name_address: string;
 collection_address: string;
 issued_by: string;
 invoiced_by: string;

 make: string;
 model: string;
 chassis_no: string;
 registration: string;
 purchased_by: string;
 mot_end: string; // backend = timestamp, but form can keep string
 mileage: string; // backend = integer
 dor: string;
 colour: string;
 interior_colour: string;
 purchase_date: string; // backend = timestamp
 collection_date: string; // backend = timestamp

 description_of_goods: string;
 qty: string; // NOTE: Not present in backend — do you want to add?
 unit_price: string; // "
 actual_price: string; // "

 notes: string;

 bank_name: string;
 account_number: string;
 sort_code: string;
 ref: string;
 acc_name: string;

 sub_total: string;
 vat_at_20: string;
 total: string;
 deposit_paid: string;
 balance_due: string;
}

interface VehicleCondition {
 frontPaint: number;
 frontRustDust: number;
 frontDent: number;
 rearPaint: number;
 rearRustDust: number;
 rearDent: number;
 leftPaint: number;
 leftRustDust: number;
 leftDent: number;
 rightPaint: number;
 rightRustDust: number;
 rightDent: number;
 topPaint: number;
 topRustDust: number;
 topDent: number;
 wheelsFrontLeft: number;
 wheelsFrontRight: number;
 wheelsRearLeft: number;
 wheelsRearRight: number;
 windscreenChipped: boolean;
 additionalComments: string;
}

interface Invoice extends InvoiceFormData {
 id: number;
 uploadDate: string;
 vehicleCondition?: VehicleCondition;
}

export default function SalesInvoices() {
 const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceT | null>(null);
 


 const queryClient = useQueryClient();

 const { data: invoicesData = [], isLoading } = useQuery<any>({
  queryKey: ["/api/sales-invoices"],
 });

 

 const [formData, setFormData] = useState<InvoiceFormData>({
  invoice_no: "",
  tax_point: "",
  check_no: "",
  invoice_name_address: "",
  collection_address: "",
  issued_by: "",
  invoiced_by: "",

  make: "",
  model: "",
  chassis_no: "",
  registration: "",
  purchased_by: "",
  mot_end: "",
  mileage: "",
  dor: "",
  colour: "",
  interior_colour: "",
  purchase_date: "",
  collection_date: "",

  description_of_goods: "",
  qty: "",
  unit_price: "",
  actual_price: "",

  notes: "",

  bank_name: "",
  account_number: "",
  sort_code: "",
  ref: "",
  acc_name: "",

  sub_total: "",
  vat_at_20: "",
  total: "",
  deposit_paid: "",
  balance_due: "",
 });

 const [vehicleCondition, setVehicleCondition] = useState<VehicleCondition>({
  frontPaint: 0,
  frontRustDust: 0,
  frontDent: 0,
  rearPaint: 0,
  rearRustDust: 0,
  rearDent: 0,
  leftPaint: 0,
  leftRustDust: 0,
  leftDent: 0,
  rightPaint: 0,
  rightRustDust: 0,
  rightDent: 0,
  topPaint: 0,
  topRustDust: 0,
  topDent: 0,
  wheelsFrontLeft: 0,
  wheelsFrontRight: 0,
  wheelsRearLeft: 0,
  wheelsRearRight: 0,
  windscreenChipped: false,
  additionalComments: "",
 });

 // Upload mutation
 const uploadMutation = useMutation({
  mutationFn: async (fd: FormData) => {
    const res = await fetch("/api/sales-invoices", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      let errMsg = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json().catch(() => null);
        if (body?.message) errMsg = body.message;
        else if (body) errMsg = JSON.stringify(body);
      } catch {}
      throw new Error(`Upload failed: ${errMsg}`);
    }

    return res.json();
  },

  onSuccess: () => {
    resetForm();
    setIsUploadModalOpen(false);
    toast({
      title: "Success",
      description: "Invoice uploaded!",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
  },

  onError: (err: any) => {
    toast({
      title: "Error",
      description: err?.message ?? "Failed to upload invoice",
      variant: "destructive",
    });
  },
});

 // Delete mutation
const deleteMutation = useMutation({
  mutationFn: async (id: number) => {
    const response = await fetch(`/api/sales-invoices/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete invoice");
    }

    // 204 No Content => no body to parse
    if (response.status === 204) {
      return; // success, no data
    }

    // otherwise parse JSON if present
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
    toast({
      title: "Success",
      description: "Invoice deleted successfully",
    });
  },
  onError: () => {
    toast({
      title: "Error",
      description: "Failed to delete invoice",
      variant: "destructive",
    });
  },
});



 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const uploadFormData = new FormData();

  // append existing flat fields from formData state
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      uploadFormData.append(key, value.toString());
    }
  });

  // call your mutation with the prepared FormData
  uploadMutation.mutate(uploadFormData);
};


 const resetForm = () => {
  setFormData({
   invoice_no: "",
   tax_point: "",
   check_no: "",
   invoice_name_address: "",
   collection_address: "",
   issued_by: "",
   invoiced_by: "",

   make: "",
   model: "",
   chassis_no: "",
   registration: "",
   purchased_by: "",
   mot_end: "",
   mileage: "",
   dor: "",
   colour: "",
   interior_colour: "",
   purchase_date: "",
   collection_date: "",

   description_of_goods: "",
   qty: "",
   unit_price: "",
   actual_price: "",

   notes: "",

   bank_name: "",
   account_number: "",
   sort_code: "",
   ref: "",
   acc_name: "",

   sub_total: "",
   vat_at_20: "",
   total: "",
   deposit_paid: "",
   balance_due: "",
  });

  setVehicleCondition({
   frontPaint: 0,
   frontRustDust: 0,
   frontDent: 0,
   rearPaint: 0,
   rearRustDust: 0,
   rearDent: 0,
   leftPaint: 0,
   leftRustDust: 0,
   leftDent: 0,
   rightPaint: 0,
   rightRustDust: 0,
   rightDent: 0,
   topPaint: 0,
   topRustDust: 0,
   topDent: 0,
   wheelsFrontLeft: 0,
   wheelsFrontRight: 0,
   wheelsRearLeft: 0,
   wheelsRearRight: 0,
   windscreenChipped: false,
   additionalComments: "",
  });
 };

 
  const getFileIcon = (type: string) => {
   if (type === "pdf") return <FileText className="h-4 w-4 text-red-600" />;
   if (type === "doc" || type === "docx") return <FileText className="h-4 w-4 text-blue-600" />;
   if (type === "xls" || type === "xlsx") return <FileText className="h-4 w-4 text-green-600" />;
   return <FileText className="h-4 w-4 text-gray-600" />;
  };

  const getSellerTypeBadge = (type: string) => {
  const colors = {
   private: "bg-blue-100 text-blue-800",
   dealer: "bg-green-100 text-green-800",
   trade: "bg-purple-100 text-purple-800",
   auction: "bg-yellow-100 text-yellow-800",
   lease_return: "bg-gray-100 text-gray-800",
  };
  return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
 };


 return (
  <div className="p-6 space-y-6">
   <div className="flex items-center justify-between mb-6">
    <div>
     <h1 className="text-2xl font-bold text-gray-900">Purchase Invoices</h1>
     <p className="text-gray-600">Manage vehicle purchase invoices and inspection records</p>
    </div>
    <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
     <DialogTrigger asChild>
      <Button className="bg-red-600 hover:bg-red-700 text-white">
       <Plus className="h-4 w-4 mr-2" />
       Create Invoice
      </Button>
     </DialogTrigger>
     <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
       <DialogTitle className="flex items-center space-x-2">
        <FileText className="h-5 w-5 text-red-600" />
        <span>Purchase Invoice</span>
       </DialogTitle>
       <DialogDescription>Complete the invoice and vehicle inspection details</DialogDescription>
      </DialogHeader>

      {/* Create Invoice */}
      <form onSubmit={handleSubmit} className="space-y-6">
       {/* Invoice Header */}
       <Card>
        <CardHeader>
         <CardTitle className="text-sm">Invoice Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
         <div>
          <Label>Invoice No.</Label>
          <Input
           value={formData.invoice_no}
           onChange={e => setFormData({ ...formData, invoice_no: e.target.value })}
          />
         </div>
         <div>
          <Label>Tax Point</Label>
          <Input
           value={formData.tax_point}
           onChange={e => setFormData({ ...formData, tax_point: e.target.value })}
          />
         </div>
         <div>
          <Label>Check No.</Label>
          <Input
           value={formData.check_no}
           onChange={e => setFormData({ ...formData, check_no: e.target.value })}
          />
         </div>
        </CardContent>
       </Card>

       {/* Addresses */}
       <Card>
        <CardHeader>
         <CardTitle className="text-sm">Addresses</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
         <div>
          <Label>Invoice Name & Address</Label>
          <Textarea
           value={formData.invoice_name_address}
           onChange={e => setFormData({ ...formData, invoice_name_address: e.target.value })}
           rows={4}
          />
         </div>
         <div>
          <Label>Collection Address</Label>
          <Textarea
           value={formData.collection_address}
           onChange={e => setFormData({ ...formData, collection_address: e.target.value })}
           rows={4}
          />
         </div>
         <div>
          <Label>Issued By</Label>
          <Input
           value={formData.issued_by}
           onChange={e => setFormData({ ...formData, issued_by: e.target.value })}
          />
         </div>
         <div>
          <Label>Invoiced By</Label>
          <Input
           value={formData.invoiced_by}
           onChange={e => setFormData({ ...formData, invoiced_by: e.target.value })}
          />
         </div>
        </CardContent>
       </Card>

       {/* Vehicle Details */}
       <Card>
        <CardHeader>
         <CardTitle className="text-sm">Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
         <div>
          <Label>Make</Label>
          <Input value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} />
         </div>
         <div>
          <Label>Model</Label>
          <Input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
         </div>
         <div>
          <Label>Chassis No.</Label>
          <Input
           value={formData.chassis_no}
           onChange={e => setFormData({ ...formData, chassis_no: e.target.value })}
          />
         </div>
         <div>
          <Label>Registration</Label>
          <Input
           value={formData.registration}
           onChange={e => setFormData({ ...formData, registration: e.target.value })}
          />
         </div>
         <div>
          <Label>Purchased By</Label>
          <Input
           value={formData.purchased_by}
           onChange={e => setFormData({ ...formData, purchased_by: e.target.value })}
          />
         </div>
         <div>
          <Label>MOT End</Label>
          <Input
           type="date"
           value={formData.mot_end}
           onChange={e => setFormData({ ...formData, mot_end: e.target.value })}
          />
         </div>
         <div>
          <Label>Mileage</Label>
          <Input
           type="number"
           value={formData.mileage}
           onChange={e => setFormData({ ...formData, mileage: e.target.value })}
          />
         </div>
         <div>
          <Label>D.O.R</Label>
          <Input value={formData.dor} onChange={e => setFormData({ ...formData, dor: e.target.value })} />
         </div>
         <div>
          <Label>Colour</Label>
          <Input
           value={formData.colour}
           onChange={e => setFormData({ ...formData, colour: e.target.value })}
          />
         </div>
         <div>
          <Label>Interior Colour</Label>
          <Input
           value={formData.interior_colour}
           onChange={e => setFormData({ ...formData, interior_colour: e.target.value })}
          />
         </div>
         <div>
          <Label>Purchase Date</Label>
          <Input
           type="date"
           value={formData.purchase_date}
           onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
          />
         </div>
         <div>
          <Label>Collection Date</Label>
          <Input
           type="date"
           value={formData.collection_date}
           onChange={e => setFormData({ ...formData, collection_date: e.target.value })}
          />
         </div>
        </CardContent>
       </Card>

       {/* Goods & Pricing */}
       <Card>
        <CardHeader>
         <CardTitle className="text-sm">Description of Goods & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
         <div>
          <Label>Description of Goods</Label>
          <Textarea
           value={formData.description_of_goods}
           onChange={e => setFormData({ ...formData, description_of_goods: e.target.value })}
           rows={3}
          />
         </div>
         <div className="grid grid-cols-3 gap-4">
          <div>
           <Label>QTY</Label>
           <Input value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} />
          </div>
          <div>
           <Label>Unit Price</Label>
           <Input
            value={formData.unit_price}
            onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
           />
          </div>
          <div>
           <Label>Actual Price</Label>
           <Input
            value={formData.actual_price}
            onChange={e => setFormData({ ...formData, actual_price: e.target.value })}
           />
          </div>
         </div>
         <div>
          <Label>Notes</Label>
          <Textarea
           value={formData.notes}
           onChange={e => setFormData({ ...formData, notes: e.target.value })}
           rows={2}
          />
         </div>
        </CardContent>
       </Card>

       {/* Payment Details */}
       <Card>
        <CardHeader>
         <CardTitle className="text-sm">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
         <div className="space-y-4">
          <div>
           <Label>Bank Name</Label>
           <Input
            value={formData.bank_name}
            onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
           />
          </div>
          <div>
           <Label>Account Number</Label>
           <Input
            value={formData.account_number}
            onChange={e => setFormData({ ...formData, account_number: e.target.value })}
           />
          </div>
          <div>
           <Label>Sort Code</Label>
           <Input
            value={formData.sort_code}
            onChange={e => setFormData({ ...formData, sort_code: e.target.value })}
           />
          </div>
          <div>
           <Label>Ref</Label>
           <Input value={formData.ref} onChange={e => setFormData({ ...formData, ref: e.target.value })} />
          </div>
          <div>
           <Label>Acc Name</Label>
           <Input
            value={formData.acc_name}
            onChange={e => setFormData({ ...formData, acc_name: e.target.value })}
           />
          </div>
         </div>
         <div className="space-y-4">
          <div>
           <Label>Sub Total</Label>
           <Input
            type="number"
            value={formData.sub_total}
            onChange={e => setFormData({ ...formData, sub_total: e.target.value })}
           />
          </div>
          <div>
           <Label>VAT at 20%</Label>
           <Input
            type="number"
            value={formData.vat_at_20}
            onChange={e => setFormData({ ...formData, vat_at_20: e.target.value })}
           />
          </div>
          <div>
           <Label>Total</Label>
           <Input
            type="number"
            value={formData.total}
            onChange={e => setFormData({ ...formData, total: e.target.value })}
           />
          </div>
          <div>
           <Label>Deposit Paid</Label>
           <Input
            value={formData.deposit_paid}
            type="number"
            onChange={e => setFormData({ ...formData, deposit_paid: e.target.value })}
           />
          </div>
          <div>
           <Label>Balance Due</Label>
           <Input
            value={formData.balance_due}
            type="number"
            onChange={e => setFormData({ ...formData, balance_due: e.target.value })}
            className="bg-yellow-100"
           />
          </div>
         </div>
        </CardContent>
       </Card>

       {/* Vehicle Inspection */}
       <Card className="flex flex-col justify-between">
        <CardHeader>
         <CardTitle className="text-sm flex items-center gap-2">
          <Car className="h-4 w-4" />
          Vehicle Inspection Sheet
         </CardTitle>
        </CardHeader>

        <div className="w-full px-7 pb-7">
         <Label>Additional Comments</Label>
         <Textarea
          value={vehicleCondition.additionalComments}
          onChange={e => setVehicleCondition({ ...vehicleCondition, additionalComments: e.target.value })}
          rows={3}
          placeholder="Enter any additional inspection notes..."
         />
        </div>
       </Card>

       <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
         Cancel
        </Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
         Save Invoice
        </Button>
       </div>
      </form>
     </DialogContent>
    </Dialog>
   </div>

   <Card>
    <CardHeader>
     <CardTitle className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
       <Activity className="h-5 w-5 text-blue-600" />
       <span>Card Invoice Documents</span>
      </div>
      <div className="text-sm text-gray-500">
       {invoicesData.length} {invoicesData.length === 1 ? "document" : "documents"}
      </div>
     </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
     {isLoading ? (
      <div className="text-center py-8">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
       <p className="text-gray-500 mt-2">Loading invoices...</p>
      </div>
     ) : invoicesData.length === 0 ? (
      <div className="text-center py-12">
       <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
       <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices uploaded yet</h3>
       <p className="text-gray-500 mb-4">Start by uploading your first card invoice document.</p>
       <Button onClick={() => setIsUploadModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white">
        <Plus className="h-4 w-4 mr-2" />
        Upload First Invoice
       </Button>
      </div>
     ) : (
      <div className="overflow-auto">
       <table className="w-full">
        <thead>
         <tr className="border-b border-gray-200 bg-gray-50/50">
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Invoice No
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Seller
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Vehicle
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Purchased By
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Purchase Date
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Collection Date
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Total Amount
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Excel
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Upload Date
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Actions
          </th>
         </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
         {invoicesData?.map((invoice: InvoiceT, index: number) => (
          <tr
           key={invoice.id}
           className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
          >
           {/* Invoice No */}
           <td className="p-3 text-center">
            <div className="text-sm font-semibold text-gray-900">{invoice.invoice_no}</div>
           </td>

           {/* Seller */}
           <td className="p-3 text-center">
            <div
             className="text-sm font-medium text-gray-900 truncate max-w-[150px]"
             title={invoice.invoice_name_address ?? ""}
            >
             {invoice.invoice_name_address}
            </div>
           </td>

           {/* Vehicle */}
           <td className="p-3 text-center">
            <div className="space-y-1">
             {invoice.registration && (
              <div className="flex items-center justify-center space-x-1 text-sm font-medium text-gray-900">
               <Car className="h-3 w-3" />
               <span>{invoice.registration}</span>
              </div>
             )}
             {invoice.make && invoice.model && (
              <div className="text-xs text-gray-600">
               {invoice.make} {invoice.model}
              </div>
             )}
             {!invoice.registration && !invoice.make && (
              <span className="text-xs text-gray-400">Not specified</span>
             )}
            </div>
           </td>

           {/* Purchased By */}
           <td className="p-3 text-center">
            {invoice.purchased_by ? (
             <div className="text-sm text-gray-900">{invoice.purchased_by}</div>
            ) : (
             <span className="text-xs text-gray-400">Not specified</span>
            )}
           </td>

           {/* Purchase Date */}
           <td className="p-3 text-center">
            {invoice.purchase_date ? (
             <div className="flex items-center justify-center space-x-1 text-sm text-gray-900">
              <Calendar className="h-3 w-3" />
              <span>{new Date(invoice.purchase_date).toLocaleDateString()}</span>
             </div>
            ) : (
             <span className="text-xs text-gray-400">Not specified</span>
            )}
           </td>

           {/* Collection Date */}
           <td className="p-3 text-center">
            {invoice.collection_date ? (
             <div className="text-sm text-gray-900">
              {new Date(invoice.collection_date).toLocaleDateString()}
             </div>
            ) : (
             <span className="text-xs text-gray-400">Not specified</span>
            )}
           </td>

           {/* Total Amount */}
           <td className="p-3 text-center">{invoice.total}</td>

           {/* Payment Status */}
           {/* <td className="p-3 text-center">{invoice.balance_due}</td> */}

           <td className="text-center">
            <button onClick={() => generateInvoicePdf(invoice)}>
             <Download size={20} />
            </button>
           </td>

           

           {/* Upload Date */}
           <td className="p-3 text-center">
            <div className="text-sm text-gray-900">
             {new Date(invoice.upload_date as Date).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-500">
             {new Date(invoice.upload_date as Date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
             })}
            </div>
           </td>

           {/* Actions */}
           <td className="p-3 text-center">
            <div className="flex items-center justify-center space-x-1">
             <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingInvoice(invoice)}
              className="h-8 w-8 p-0"
              title="View Details"
             >
              <Eye className="h-4 w-4" />
             </Button>

             <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
               deleteMutation.mutate(invoice.id);
              }}
              title="Delete Invoice"
             >
              <Trash2 className="h-4 w-4" />
             </Button>
            </div>
           </td>
          </tr>
         ))}
        </tbody>
       </table>
      </div>
     )}
    </CardContent>
   </Card>

   {/* View Invoice Dialog */}
   {viewingInvoice && (
    <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
     <DialogContent className="max-w-2xl max-h-[80%] overflow-y-scroll">
      <DialogHeader>
       <DialogTitle className="flex items-center space-x-2">
        <Eye className="h-5 w-5 text-red-600" />
        <span>Invoice Details - {viewingInvoice.invoice_no}</span>
       </DialogTitle>
       <DialogDescription>View complete invoice information and document details</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
       {/* GRID FIELDS */}
       <div className="grid grid-cols-2 gap-4">
        <div>
         <Label className="text-sm font-medium text-gray-700">Invoice No</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.invoice_no}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Tax Point</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.tax_point}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Check No</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.check_no}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Invoice Name / Address</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.invoice_name_address}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Collection Address</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.collection_address}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Issued By</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.issued_by}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Invoiced By</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.invoiced_by}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Make</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.make}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Model</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.model}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Chassis No</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.chassis_no}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Registration</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.registration}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Purchased By</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.purchased_by}</p>
        </div>

        {viewingInvoice.mot_end && (
         <div>
          <Label className="text-sm font-medium text-gray-700">MOT End</Label>
          <p className="text-sm text-gray-900">{new Date(viewingInvoice.mot_end).toLocaleDateString()}</p>
         </div>
        )}

        <div>
         <Label className="text-sm font-medium text-gray-700">Mileage</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.mileage}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">DOR</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.dor}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Colour</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.colour}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Interior Colour</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.interior_colour}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Purchase Date</Label>
         <p className="text-sm text-gray-900">
          {new Date(viewingInvoice.purchase_date as Date).toLocaleDateString()}
         </p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Collection Date</Label>
         <p className="text-sm text-gray-900">
          {new Date(viewingInvoice.collection_date as Date).toLocaleDateString()}
         </p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Bank Name</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.bank_name}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Account Number</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.account_number}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Sort Code</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.sort_code}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Ref</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.ref}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Account Name</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.acc_name}</p>
        </div>
       </div>

       {/* TOTALS */}
       <div className="grid grid-cols-2 gap-4">
        <div>
         <Label className="text-sm font-medium text-gray-700">Sub Total</Label>
         <p className="text-sm text-gray-900">£{viewingInvoice.sub_total}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">VAT @ 20%</Label>
         <p className="text-sm text-gray-900">£{viewingInvoice.vat_at_20}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Total</Label>
         <p className="text-sm text-gray-900">£{viewingInvoice.total}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Deposit Paid</Label>
         <p className="text-sm text-gray-900">£{viewingInvoice.deposit_paid}</p>
        </div>

        <div>
         <Label className="text-sm font-medium text-gray-700">Balance Due</Label>
         <p className="text-sm text-gray-900">£{viewingInvoice.balance_due}</p>
        </div>
       </div>

       {/* DESCRIPTION */}
       {viewingInvoice.description_of_goods && (
        <div>
         <Label className="text-sm font-medium text-gray-700">Description of Goods</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.description_of_goods}</p>
        </div>
       )}

       {viewingInvoice.notes && (
        <div>
         <Label className="text-sm font-medium text-gray-700">Notes</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.notes}</p>
        </div>
       )}
      </div>
     </DialogContent>
    </Dialog>
   )}
  </div>
 );
}
