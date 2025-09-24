import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Receipt,
  Plus,
  Upload,
  X,
  FileText,
  File,
  FileSpreadsheet,
  Image,
  Activity,
  Calendar,
  Car,
  User,
  Eye,
  ExternalLink,
  Trash2,
  TrendingUp,
  Truck,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SalesInvoice, InsertSalesInvoice } from "@shared/schema";

export default function SalesInvoice() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<SalesInvoice | null>(
    null,
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    seller_name: "",
    registration: "",
    date_of_sale: "",
    delivery_collection: "",
    make: "",
    model: "",
    customer_name: "",
    notes: "",
    paid_in_full: false,
    finance: false,
    part_exchange: false,
    documents_to_sign: false,
    tags: [] as string[],
  });

  // Query to fetch sales invoices
  const { data: invoices = [], isLoading } = useQuery<SalesInvoice[]>({
    queryKey: ["/api/sales-invoices"],
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  // Query to fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/sales-invoices-stats"],
  });

  // Mutation to create sales invoice
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/sales-invoices", {
        method: "POST",
        body: data,
      });
      if (!response.ok) throw new Error("Failed to upload sales invoice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/sales-invoices-stats"],
      });
      setIsUploadModalOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Sales invoice uploaded successfully",
      });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to upload sales invoice" });
    },
  });

  // Mutation to delete sales invoice
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/sales-invoices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete invoice");
      }
      return response.json();
    },
    onSuccess: () => {
      // Force refetch the data to ensure UI is in sync
      queryClient.refetchQueries({ queryKey: ["/api/sales-invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/sales-invoices-stats"] });
      toast({
        title: "Success",
        description: "Sales invoice deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      // If the invoice was already deleted, just refresh the data
      if (error.message && error.message.includes("not found")) {
        queryClient.refetchQueries({ queryKey: ["/api/sales-invoices"] });
        queryClient.refetchQueries({ queryKey: ["/api/sales-invoices-stats"] });
        toast({ title: "Info", description: "Invoice was already deleted" });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete sales invoice",
        });
      }
    },
  });

  const resetForm = () => {
    setFormData({
      seller_name: "",
      registration: "",
      date_of_sale: "",
      delivery_collection: "",
      make: "",
      model: "",
      customer_name: "",
      notes: "",
      paid_in_full: false,
      finance: false,
      part_exchange: false,
      documents_to_sign: false,
      tags: [],
    });
    setUploadFile(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFile) {
      toast({ title: "Error", description: "Please select a file to upload" });
      return;
    }

    if (!formData.seller_name || !formData.customer_name) {
      toast({
        title: "Error",
        description: "Seller name and customer name are required",
      });
      return;
    }

    const submitData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "tags") {
        submitData.append(key, JSON.stringify(value));
      } else {
        submitData.append(key, value.toString());
      }
    });
    submitData.append("document", uploadFile);

    createMutation.mutate(submitData);
  };

  const getFileIcon = (documentType: string) => {
    const type = documentType?.toLowerCase();
    if (type?.includes("pdf"))
      return <FileText className="h-4 w-4 text-red-600" />;
    if (type?.includes("doc"))
      return <File className="h-4 w-4 text-blue-600" />;
    if (type?.includes("xls"))
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    if (type?.includes("jpg") || type?.includes("png"))
      return <Image className="h-4 w-4 text-purple-600" />;
    return <File className="h-4 w-4 text-gray-600" />;
  };

  const getDeliveryTypeBadge = (type: string) => {
    switch (type) {
      case "delivery":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "collection":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
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
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Invoice
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalInvoices}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deliveries</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalByDeliveryType?.delivery || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Collections</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalByDeliveryType?.collection || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recent Uploads</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.recentUploads?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-red-600" />
              <span>Upload Sales Invoice Document</span>
            </DialogTitle>
            <DialogDescription>
              Upload a sales invoice document with vehicle and customer
              information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Document Upload</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
                  dragOver
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(uploadFile.type)}
                      <div>
                        <p className="font-medium">{uploadFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(uploadFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop files here or click to upload
                    </p>
                    <p className="text-gray-500 mb-4">
                      PDF, Word, Excel, or image files up to 10MB
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("file-upload")?.click()
                      }
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="seller_name">Seller *</Label>
                  <Input
                    id="seller_name"
                    value={formData.seller_name}
                    onChange={(e) =>
                      setFormData({ ...formData, seller_name: e.target.value })
                    }
                    placeholder="Enter seller name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="registration">Registration</Label>
                  <Input
                    id="registration"
                    value={formData.registration}
                    onChange={(e) =>
                      setFormData({ ...formData, registration: e.target.value })
                    }
                    placeholder="Enter vehicle registration"
                  />
                </div>

                <div>
                  <Label htmlFor="date_of_sale">Date of Sale</Label>
                  <Input
                    id="date_of_sale"
                    type="date"
                    value={formData.date_of_sale}
                    onChange={(e) =>
                      setFormData({ ...formData, date_of_sale: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="delivery_collection">
                    Delivery / Collection
                  </Label>
                  <Select
                    value={formData.delivery_collection}
                    onValueChange={(value) =>
                      setFormData({ ...formData, delivery_collection: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="collection">Collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    placeholder="Enter vehicle make"
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    placeholder="Enter vehicle model"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_name: e.target.value,
                      })
                    }
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Invoice Details
                  </Label>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="paid_in_full"
                      checked={formData.paid_in_full}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, paid_in_full: !!checked })
                      }
                    />
                    <Label htmlFor="paid_in_full">Paid in Full</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="finance"
                      checked={formData.finance}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, finance: !!checked })
                      }
                    />
                    <Label htmlFor="finance">Finance</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="part_exchange"
                      checked={formData.part_exchange}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, part_exchange: !!checked })
                      }
                    />
                    <Label htmlFor="part_exchange">Part Exchange</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="documents_to_sign"
                      checked={formData.documents_to_sign}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          documents_to_sign: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="documents_to_sign">Documents to Sign</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Uploading..." : "Upload Invoice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Viewing Modal */}
      {viewingInvoice && (
        <Dialog
          open={!!viewingInvoice}
          onOpenChange={() => setViewingInvoice(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-red-600" />
                <span>Sales Invoice Details</span>
              </DialogTitle>
              <DialogDescription>
                View complete sales invoice information and document details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Seller</Label>
                  <p className="text-gray-900">{viewingInvoice.seller_name}</p>
                </div>
                <div>
                  <Label className="font-medium">Customer</Label>
                  <p className="text-gray-900">
                    {viewingInvoice.customer_name}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Registration</Label>
                  <p className="text-gray-900">
                    {viewingInvoice.registration || "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Sale Date</Label>
                  <p className="text-gray-900">
                    {viewingInvoice.date_of_sale
                      ? new Date(
                          viewingInvoice.date_of_sale,
                        ).toLocaleDateString()
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Vehicle</Label>
                  <p className="text-gray-900">
                    {viewingInvoice.make && viewingInvoice.model
                      ? `${viewingInvoice.make} ${viewingInvoice.model}`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Delivery/Collection</Label>
                  <p className="text-gray-900">
                    {viewingInvoice.delivery_collection
                      ? viewingInvoice.delivery_collection
                          .charAt(0)
                          .toUpperCase() +
                        viewingInvoice.delivery_collection.slice(1)
                      : "Not specified"}
                  </p>
                </div>
              </div>

              {viewingInvoice.notes && (
                <div>
                  <Label className="font-medium">Notes</Label>
                  <p className="text-gray-900">{viewingInvoice.notes}</p>
                </div>
              )}

              <div>
                <Label className="font-medium">Invoice Status</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge
                    variant={
                      viewingInvoice.paid_in_full ? "default" : "secondary"
                    }
                  >
                    {viewingInvoice.paid_in_full
                      ? "Paid in Full"
                      : "Not Paid in Full"}
                  </Badge>
                  <Badge
                    variant={viewingInvoice.finance ? "default" : "secondary"}
                  >
                    {viewingInvoice.finance ? "Finance" : "No Finance"}
                  </Badge>
                  <Badge
                    variant={
                      viewingInvoice.part_exchange ? "default" : "secondary"
                    }
                  >
                    {viewingInvoice.part_exchange
                      ? "Part Exchange"
                      : "No Part Exchange"}
                  </Badge>
                  <Badge
                    variant={
                      viewingInvoice.documents_to_sign
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {viewingInvoice.documents_to_sign
                      ? "Documents to Sign"
                      : "No Documents to Sign"}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const filename = viewingInvoice.document_path
                      .split("/")
                      .pop();
                    window.open(
                      `/api/uploads/sales-invoices/${filename}`,
                      "_blank",
                    );
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Document
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Invoice Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-red-600" />
              <span>Sales Invoice Documents</span>
            </div>
            <div className="text-sm text-gray-500">
              {invoices.length}{" "}
              {invoices.length === 1 ? "document" : "documents"}
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
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No invoices uploaded yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start by uploading your first sales invoice document.
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
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
                      Seller
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale Date
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid in Full
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Finance
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Exchange
                    </th>
                    <th className="text-center p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documents to Sign
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
                  {invoices.map((invoice: SalesInvoice, index) => (
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
                            <div className="text-xs text-gray-500">
                              {formatFileSize(invoice.document_size || 0)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Seller */}
                      <td className="p-3 text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.seller_name}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-3 text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.customer_name}
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
                            <span className="text-xs text-gray-400">
                              Not specified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sale Date */}
                      <td className="p-3 text-center">
                        {invoice.date_of_sale ? (
                          <div className="flex items-center justify-center space-x-1 text-sm text-gray-900">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(
                                invoice.date_of_sale,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not specified
                          </span>
                        )}
                      </td>

                      {/* Delivery/Collection Type */}
                      <td className="p-3 text-center">
                        {invoice.delivery_collection ? (
                          <Badge
                            className={getDeliveryTypeBadge(
                              invoice.delivery_collection,
                            )}
                          >
                            {invoice.delivery_collection === "delivery"
                              ? "Delivery"
                              : "Collection"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Not specified
                          </span>
                        )}
                      </td>

                      {/* Paid in Full */}
                      <td className="p-3 text-center">
                        {invoice.paid_in_full ? (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Finance */}
                      <td className="p-3 text-center">
                        {invoice.finance ? (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
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
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Documents to Sign */}
                      <td className="p-3 text-center">
                        {invoice.documents_to_sign ? (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Upload Date */}
                      <td className="p-3 text-center">
                        <div className="text-sm text-gray-900">
                          {new Date(invoice.upload_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(invoice.upload_date).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" },
                          )}
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
                              const filename = invoice.document_path
                                .split("/")
                                .pop();
                              window.open(
                                `/api/uploads/sales-invoices/${filename}`,
                                "_blank",
                              );
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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  "Are you sure you want to delete this invoice?",
                                )
                              ) {
                                deleteMutation.mutate(invoice.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
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
    </div>
  );
}
