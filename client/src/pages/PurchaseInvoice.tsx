import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
 FileText,
 Upload,
 Eye,
 Download,
 ExternalLink,
 Trash2,
 Plus,
 Calendar,
 Car,
 User,
 Building,
 FileCheck,
 Activity,
 TrendingUp,
} from "lucide-react";
import type { PurchaseInvoice } from "@shared/schema";

interface UploadFormData {
 buyer_name: string;
 description: string;
 registration: string;
 purchase_date: string;
 make: string;
 model: string;
 seller_type: string;
 estimated_collection_date: string;
 outstanding_finance: boolean;
 part_exchange: boolean;
 tags: string;
}

export default function PurchaseInvoice() {
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [isDragOver, setIsDragOver] = useState(false);
 const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
 const [viewingInvoice, setViewingInvoice] = useState<PurchaseInvoice | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const { toast } = useToast();
 const queryClient = useQueryClient();

 const [formData, setFormData] = useState<UploadFormData>({
  buyer_name: "",
  description: "",
  registration: "",
  purchase_date: "",
  make: "",
  model: "",
  seller_type: "",
  estimated_collection_date: "",
  outstanding_finance: false,
  part_exchange: false,
  tags: "",
 });

 // Fetch purchase invoices
 const { data: invoices = [], isLoading } = useQuery({
  queryKey: ["/api/purchase-invoices"],
 });

 // Fetch statistics
 const { data: stats } = useQuery({
  queryKey: ["/api/purchase-invoices-stats"],
 });

 // Upload mutation
 const uploadMutation = useMutation({
  mutationFn: async (data: FormData) => {
   const response = await fetch("/api/purchase-invoices", {
    method: "POST",
    body: data,
   });
   if (!response.ok) {
    throw new Error("Failed to upload invoice");
   }
   return response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
   queryClient.invalidateQueries({
    queryKey: ["/api/purchase-invoices-stats"],
   });
   setIsUploadModalOpen(false);
   setSelectedFile(null);
   setFormData({
    buyer_name: "",
    description: "",
    registration: "",
    purchase_date: "",
    make: "",
    model: "",
    seller_type: "",
    estimated_collection_date: "",
    outstanding_finance: false,
    part_exchange: false,
    tags: "",
   });
   toast({
    title: "Success",
    description: "Purchase invoice uploaded successfully",
   });
  },
  onError: error => {
   toast({
    title: "Error",
    description: "Failed to upload purchase invoice",
    variant: "destructive",
   });
  },
 });

 // Delete mutation
 const deleteMutation = useMutation({
  mutationFn: async (id: number) => {
   const response = await fetch(`/api/purchase-invoices/${id}`, {
    method: "DELETE",
   });
   if (!response.ok) {
    throw new Error("Failed to delete invoice");
   }
   return response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
   queryClient.invalidateQueries({
    queryKey: ["/api/purchase-invoices-stats"],
   });
   toast({
    title: "Success",
    description: "Purchase invoice deleted successfully",
   });
  },
  onError: () => {
   toast({
    title: "Error",
    description: "Failed to delete purchase invoice",
    variant: "destructive",
   });
  },
 });

 const handleFileSelect = (file: File) => {
  if (file.size > 10 * 1024 * 1024) {
   toast({
    title: "Error",
    description: "File size must be less than 10MB",
    variant: "destructive",
   });
   return;
  }

  const allowedTypes = [
   "application/pdf",
   "application/msword",
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
   "application/vnd.ms-excel",
   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   "image/jpeg",
   "image/jpg",
   "image/png",
  ];

  if (!allowedTypes.includes(file.type)) {
   toast({
    title: "Error",
    description: "Only PDF, Word, Excel, and image files are allowed",
    variant: "destructive",
   });
   return;
  }

  setSelectedFile(file);
 };

 const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  const files = Array.from(e.dataTransfer.files);
  if (files.length > 0) {
   handleFileSelect(files[0]);
  }
 };

 const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (files && files.length > 0) {
   handleFileSelect(files[0]);
  }
 };

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedFile) {
   toast({
    title: "Error",
    description: "Please select a file to upload",
    variant: "destructive",
   });
   return;
  }

  if (!formData.buyer_name) {
   toast({
    title: "Error",
    description: "Buyer name is required",
    variant: "destructive",
   });
   return;
  }

  const uploadFormData = new FormData();
  uploadFormData.append("document", selectedFile);

  Object.entries(formData).forEach(([key, value]) => {
   if (value !== null && value !== undefined) {
    uploadFormData.append(key, value.toString());
   }
  });

  uploadMutation.mutate(uploadFormData);
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

 const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
 };

 return (
  <div className="p-6 space-y-6">
   {/* Header */}
   <div className="mb-6">
    <div className="flex items-center justify-between">
     <div className="flex items-center space-x-2 mb-2"></div>
     <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
      <DialogTrigger asChild>
       <Button className="bg-red-600 hover:bg-red-700 text-white">
        <Plus className="h-4 w-4 mr-2" />
        Upload Invoice
       </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
       <DialogHeader>
        <DialogTitle className="flex items-center space-x-2">
         <Upload className="h-5 w-5 text-red-600" />
         <span>Upload Purchase Invoice Document</span>
        </DialogTitle>
        <DialogDescription>
         Upload a purchase invoice document with vehicle and seller information
        </DialogDescription>
       </DialogHeader>

       <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div
         className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver ? "border-red-400 bg-red-50" : "border-gray-300"
         }`}
         onDragOver={e => {
          e.preventDefault();
          setIsDragOver(true);
         }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={handleDrop}
        >
         <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
         {selectedFile ? (
          <div className="space-y-2">
           <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
           <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
           <Button type="button" variant="outline" size="sm" onClick={() => setSelectedFile(null)}>
            Remove
           </Button>
          </div>
         ) : (
          <div className="space-y-2">
           <p className="text-sm text-gray-600">
            <Button
             type="button"
             variant="link"
             className="text-red-600 hover:text-red-700 p-0"
             onClick={() => fileInputRef.current?.click()}
            >
             Choose a file
            </Button>{" "}
            or drag and drop
           </p>
           <p className="text-xs text-gray-500">PDF, Word, Excel, and image files, up to 10.48576MB</p>
          </div>
         )}
         <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
         />
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Buyer */}
         <div className="md:col-span-2">
          <Label htmlFor="buyer_name" className="text-sm font-medium">
           Buyer <span className="text-red-500">*</span>
           <span className="text-xs text-gray-500 ml-1">(Recommended - will be shown in document list)</span>
          </Label>
          <Input
           id="buyer_name"
           placeholder="Enter the buyer's name"
           value={formData.buyer_name}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             buyer_name: e.target.value,
            }))
           }
           className="mt-1"
           required
          />
         </div>

         {/* Description */}
         <div className="md:col-span-2">
          <Label htmlFor="description" className="text-sm font-medium">
           Description <span className="text-xs text-gray-500">(Optional)</span>
          </Label>
          <Textarea
           id="description"
           placeholder="Additional notes or description"
           value={formData.description}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             description: e.target.value,
            }))
           }
           className="mt-1"
           rows={3}
          />
         </div>

         {/* Registration & Purchase Date */}
         <div>
          <Label htmlFor="registration">Registration</Label>
          <Input
           id="registration"
           placeholder="Vehicle registration"
           value={formData.registration}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             registration: e.target.value,
            }))
           }
           className="mt-1"
          />
         </div>
         <div>
          <Label htmlFor="purchase_date">Date of Purchase</Label>
          <Input
           id="purchase_date"
           type="date"
           value={formData.purchase_date}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             purchase_date: e.target.value,
            }))
           }
           className="mt-1"
          />
         </div>

         {/* Make & Model */}
         <div>
          <Label htmlFor="make">Make</Label>
          <Input
           id="make"
           placeholder="Vehicle make"
           value={formData.make}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             make: e.target.value,
            }))
           }
           className="mt-1"
          />
         </div>
         <div>
          <Label htmlFor="model">Model</Label>
          <Input
           id="model"
           placeholder="Vehicle model"
           value={formData.model}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             model: e.target.value,
            }))
           }
           className="mt-1"
          />
         </div>

         {/* Seller Type & Collection Date */}
         <div>
          <Label htmlFor="seller_type">Seller</Label>
          <Select
           value={formData.seller_type}
           onValueChange={value => setFormData(prev => ({ ...prev, seller_type: value }))}
          >
           <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select seller type" />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="dealer">Dealer</SelectItem>
            <SelectItem value="trade">Trade</SelectItem>
            <SelectItem value="auction">Auction</SelectItem>
            <SelectItem value="lease_return">Lease Return</SelectItem>
           </SelectContent>
          </Select>
         </div>
         <div>
          <Label htmlFor="estimated_collection_date">Estimated Collection Date</Label>
          <Input
           id="estimated_collection_date"
           type="date"
           value={formData.estimated_collection_date}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             estimated_collection_date: e.target.value,
            }))
           }
           className="mt-1"
          />
         </div>

         {/* Checkboxes */}
         <div className="md:col-span-2 flex space-x-6">
          <div className="flex items-center space-x-2">
           <Checkbox
            id="outstanding_finance"
            checked={formData.outstanding_finance}
            onCheckedChange={checked =>
             setFormData(prev => ({
              ...prev,
              outstanding_finance: checked as boolean,
             }))
            }
           />
           <Label htmlFor="outstanding_finance" className="text-sm">
            Outstanding Finance
           </Label>
          </div>
          <div className="flex items-center space-x-2">
           <Checkbox
            id="part_exchange"
            checked={formData.part_exchange}
            onCheckedChange={checked =>
             setFormData(prev => ({
              ...prev,
              part_exchange: checked as boolean,
             }))
            }
           />
           <Label htmlFor="part_exchange" className="text-sm">
            Part Exchange
           </Label>
          </div>
         </div>

         {/* Tags */}
         <div className="md:col-span-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
           id="tags"
           placeholder="Enter tags separated by commas (e.g. urgent, warranty, inspection)"
           value={formData.tags}
           onChange={e =>
            setFormData(prev => ({
             ...prev,
             tags: e.target.value,
            }))
           }
           className="mt-1"
          />
         </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
         <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
          Cancel
         </Button>
         <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={uploadMutation.isPending}>
          {uploadMutation.isPending ? "Uploading..." : "Upload Invoice"}
         </Button>
        </div>
       </form>
      </DialogContent>
     </Dialog>
    </div>
    <p className="text-gray-600">
     Upload and manage purchase invoice documents with comprehensive tracking and searchability.
    </p>
   </div>

   {/* Statistics Cards */}
   {stats && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
     <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
       <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
       <FileCheck className="h-4 w-4 text-blue-600" />
      </CardHeader>
      <CardContent>
       <div className="text-2xl font-bold">{stats.totalInvoices}</div>
      </CardContent>
     </Card>

     <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
       <CardTitle className="text-sm font-medium">Private Sales</CardTitle>
       <User className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
       <div className="text-2xl font-bold">{stats.totalBySellerType.private || 0}</div>
      </CardContent>
     </Card>

     <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
       <CardTitle className="text-sm font-medium">Dealer Sales</CardTitle>
       <Building className="h-4 w-4 text-purple-600" />
      </CardHeader>
      <CardContent>
       <div className="text-2xl font-bold">{stats.totalBySellerType.dealer || 0}</div>
      </CardContent>
     </Card>

     <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
       <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
       <TrendingUp className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
       <div className="text-2xl font-bold">{stats.recentUploads.length}</div>
      </CardContent>
     </Card>
    </div>
   )}

   {/* Invoice Grid */}
   <Card>
    <CardHeader>
     <CardTitle className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
       <Activity className="h-5 w-5 text-red-600" />
       <span>Purchase Invoice Documents</span>
      </div>
      <div className="text-sm text-gray-500">
       {invoices.length} {invoices.length === 1 ? "document" : "documents"}
      </div>
     </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
     {isLoading ? (
      <div className="text-center py-8">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
       <p className="text-gray-500 mt-2">Loading invoices...</p>
      </div>
     ) : invoices.length === 0 ? (
      <div className="text-center py-12">
       <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
       <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices uploaded yet</h3>
       <p className="text-gray-500 mb-4">Start by uploading your first purchase invoice document.</p>
       <Button onClick={() => setIsUploadModalOpen(true)} className="bg-red-600 hover:bg-red-700">
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
           Document
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Buyer
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Vehicle
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Seller Type
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Purchase Date
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Collection Date
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Finance
          </th>
          <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
           Part Exchange
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
         {invoices.map((invoice: PurchaseInvoice, index) => (
          <tr
           key={invoice.id}
           className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
          >
           {/* Document */}
           <td className="p-3 text-center">
            <div className="flex items-center justify-center space-x-2">
             {getFileIcon(invoice.document_type)}
             <div>
              <div
               className="text-sm font-medium text-gray-900 truncate max-w-[200px]"
               title={invoice.document_filename}
              >
               {invoice.document_filename}
              </div>
              <div className="text-xs text-gray-500">{formatFileSize(invoice.document_size || 0)}</div>
             </div>
            </div>
           </td>

           {/* Buyer */}
           <td className="p-3 text-center">
            <div className="text-sm font-medium text-gray-900">{invoice.buyer_name}</div>
            {invoice.description && (
             <div className="text-xs text-gray-500 truncate max-w-[150px]" title={invoice.description}>
              {invoice.description}
             </div>
            )}
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

           {/* Seller Type */}
           <td className="p-3 text-center">
            {invoice.seller_type ? (
             <Badge className={getSellerTypeBadge(invoice.seller_type)}>
              {invoice.seller_type.replace("_", " ")}
             </Badge>
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
            {invoice.estimated_collection_date ? (
             <div className="text-sm text-gray-900">
              {new Date(invoice.estimated_collection_date).toLocaleDateString()}
             </div>
            ) : (
             <span className="text-xs text-gray-400">Not specified</span>
            )}
           </td>

           {/* Finance */}
           <td className="p-3 text-center">
            {invoice.outstanding_finance ? (
             <div className="flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
               <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
              </div>
             </div>
            ) : (
             <div className="flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
               <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
              </div>
             </div>
            )}
           </td>

           {/* Part Exchange */}
           <td className="p-3 text-center">
            {invoice.part_exchange ? (
             <div className="flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
               <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
               </svg>
              </div>
             </div>
            ) : (
             <div className="flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
               <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
              </div>
             </div>
            )}
           </td>

           {/* Upload Date */}
           <td className="p-3 text-center">
            <div className="text-sm text-gray-900">{new Date(invoice.upload_date).toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">
             {new Date(invoice.upload_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
              onClick={() => {
               const filename = invoice.document_path.split("/").pop();
               window.open(`/api/uploads/purchase-invoices/${filename}`, "_blank");
              }}
              className="h-8 w-8 p-0"
              title="Open Document"
             >
              <ExternalLink className="h-4 w-4" />
             </Button>
             <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
               if (confirm("Are you sure you want to delete this invoice?")) {
                deleteMutation.mutate(invoice.id);
               }
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
     <DialogContent className="max-w-2xl">
      <DialogHeader>
       <DialogTitle className="flex items-center space-x-2">
        <Eye className="h-5 w-5 text-red-600" />
        <span>Invoice Details - {viewingInvoice.buyer_name}</span>
       </DialogTitle>
       <DialogDescription>View complete purchase invoice information and document details</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
        <div>
         <Label className="text-sm font-medium text-gray-700">Buyer Name</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.buyer_name}</p>
        </div>
        {viewingInvoice.registration && (
         <div>
          <Label className="text-sm font-medium text-gray-700">Registration</Label>
          <p className="text-sm text-gray-900">{viewingInvoice.registration}</p>
         </div>
        )}
        {viewingInvoice.make && (
         <div>
          <Label className="text-sm font-medium text-gray-700">Make</Label>
          <p className="text-sm text-gray-900">{viewingInvoice.make}</p>
         </div>
        )}
        {viewingInvoice.model && (
         <div>
          <Label className="text-sm font-medium text-gray-700">Model</Label>
          <p className="text-sm text-gray-900">{viewingInvoice.model}</p>
         </div>
        )}
        {viewingInvoice.seller_type && (
         <div>
          <Label className="text-sm font-medium text-gray-700">Seller Type</Label>
          <Badge className={getSellerTypeBadge(viewingInvoice.seller_type)}>
           {viewingInvoice.seller_type.replace("_", " ")}
          </Badge>
         </div>
        )}
        {viewingInvoice.purchase_date && (
         <div>
          <Label className="text-sm font-medium text-gray-700">Purchase Date</Label>
          <p className="text-sm text-gray-900">
           {new Date(viewingInvoice.purchase_date).toLocaleDateString()}
          </p>
         </div>
        )}
        {viewingInvoice.estimated_collection_date && (
         <div>
          <Label className="text-sm font-medium text-gray-700">Estimated Collection</Label>
          <p className="text-sm text-gray-900">
           {new Date(viewingInvoice.estimated_collection_date).toLocaleDateString()}
          </p>
         </div>
        )}
        <div>
         <Label className="text-sm font-medium text-gray-700">Document</Label>
         <div className="flex items-center space-x-2">
          {getFileIcon(viewingInvoice.document_type)}
          <span className="text-sm text-gray-900">{viewingInvoice.document_filename}</span>
          <span className="text-xs text-gray-500">({formatFileSize(viewingInvoice.document_size || 0)})</span>
         </div>
        </div>
       </div>

       {viewingInvoice.description && (
        <div>
         <Label className="text-sm font-medium text-gray-700">Description</Label>
         <p className="text-sm text-gray-900">{viewingInvoice.description}</p>
        </div>
       )}

       <div className="flex space-x-4">
        {viewingInvoice.outstanding_finance && (
         <Badge variant="outline" className="text-yellow-700 border-yellow-300">
          Outstanding Finance
         </Badge>
        )}
        {viewingInvoice.part_exchange && (
         <Badge variant="outline" className="text-blue-700 border-blue-300">
          Part Exchange
         </Badge>
        )}
       </div>

       {viewingInvoice.tags && viewingInvoice.tags.length > 0 && (
        <div>
         <Label className="text-sm font-medium text-gray-700">Tags</Label>
         <div className="flex flex-wrap gap-1 mt-1">
          {viewingInvoice.tags.map((tag, index) => (
           <Badge key={index} variant="secondary" className="text-xs">
            {tag}
           </Badge>
          ))}
         </div>
        </div>
       )}

       <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
         variant="outline"
         onClick={() => {
          const filename = viewingInvoice.document_path.split("/").pop();
          window.open(`/api/uploads/purchase-invoices/${filename}`, "_blank");
         }}
        >
         <ExternalLink className="h-4 w-4 mr-2" />
         Open Document
        </Button>
        <Button onClick={() => setViewingInvoice(null)}>Close</Button>
       </div>
      </div>
     </DialogContent>
    </Dialog>
   )}
  </div>
 );
}
