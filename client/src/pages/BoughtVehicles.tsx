import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
 ShoppingCart,
 Plus,
 Eye,
 Edit,
 Trash2,
 Calendar as CalendarIcon,
 Upload,
 X,
 Search,
 Car,
 DollarSign,
 Calculator,
 Clock,
 ZoomIn,
 ArrowLeft,
 ArrowRight,
 MapPin,
 Gauge,
 Palette,
 Settings,
 CreditCard,
 FileText,
 Image as ImageIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { BoughtVehicle, InsertBoughtVehicle } from "@shared/schema";

// Bought Vehicle Schema - uses dedicated schema
const boughtVehicleSchema = z.object({
 stock_number: z.string().min(1, "Stock number is required"),
 make: z.string().min(1, "Make is required"),
 model: z.string().min(1, "Model is required"),
 derivative: z.string().optional(),
 colour: z.string().optional(),
 mileage: z.number().min(0, "Mileage must be positive").optional(),
 year: z
  .number()
  .min(1900, "Year must be valid")
  .max(new Date().getFullYear() + 1)
  .optional(),
 registration: z.string().optional(),
 location: z.string().optional(),
 due_in: z.date().optional(),
 retail_price_1: z.number().min(0, "Price must be positive").optional(),
 retail_price_2: z.number().min(0, "Price must be positive").optional(),
 things_to_do: z.string().optional(),
 vehicle_images: z.array(z.string()).max(4, "Maximum 4 images allowed").optional(),
 status: z.string().default("AWAITING"),
});

type BoughtVehicleForm = z.infer<typeof boughtVehicleSchema>;

interface BoughtVehicleModalProps {
 vehicle?: BoughtVehicle | null;
 isOpen: boolean;
 onClose: () => void;
 mode: "create" | "edit" | "view";
 onEdit?: (vehicle: BoughtVehicle) => void;
}

function BoughtVehicleModal({ vehicle, isOpen, onClose, mode, onEdit }: BoughtVehicleModalProps) {
 const queryClient = useQueryClient();
 const [uploadedImages, setUploadedImages] = useState<string[]>([]);
 const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
 const [isImageModalOpen, setIsImageModalOpen] = useState(false);

 const form = useForm<BoughtVehicleForm>({
  resolver: zodResolver(boughtVehicleSchema),
  defaultValues: {
   stock_number: "",
   make: "",
   model: "",
   derivative: "",
   colour: "",
   mileage: 0,
   year: new Date().getFullYear(),
   registration: "",
   location: "",
   due_in: undefined,
   retail_price_1: 0,
   retail_price_2: 0,
   things_to_do: "",
   vehicle_images: [],
   status: "AWAITING",
  },
 });

 // Update form values when vehicle data changes
 useEffect(() => {
  if (vehicle && isOpen) {
   form.reset({
    stock_number: vehicle.stock_number || "",
    make: vehicle.make || "",
    model: vehicle.model || "",
    derivative: vehicle.derivative || "",
    colour: vehicle.colour || "",
    mileage: vehicle.mileage || 0,
    year: vehicle.year || new Date().getFullYear(),
    registration: vehicle.registration || "",
    location: vehicle.location || "",
    due_in: vehicle.due_in ? new Date(vehicle.due_in) : undefined,
    retail_price_1: vehicle.retail_price_1 ? parseFloat(vehicle.retail_price_1.toString()) : 0,
    retail_price_2: vehicle.retail_price_2 ? parseFloat(vehicle.retail_price_2.toString()) : 0,
    things_to_do: vehicle.things_to_do || "",
    vehicle_images: vehicle.vehicle_images || [],
    status: vehicle.status || "AWAITING",
   });
  } else if (!vehicle && isOpen) {
   // Reset to empty values for create mode
   form.reset({
    stock_number: "",
    make: "",
    model: "",
    derivative: "",
    colour: "",
    mileage: 0,
    year: new Date().getFullYear(),
    registration: "",
    location: "",
    due_in: undefined,
    retail_price_1: 0,
    retail_price_2: 0,
    things_to_do: "",
    vehicle_images: [],
    status: "AWAITING",
   });
  }
 }, [vehicle, isOpen, form]);

 // Image handling functions
 const handleImageClick = (index: number) => {
  setSelectedImageIndex(index);
  setIsImageModalOpen(true);
 };

 const nextImage = () => {
  if (vehicle?.vehicle_images && selectedImageIndex !== null) {
   const newIndex = (selectedImageIndex + 1) % vehicle.vehicle_images.length;
   console.log("Next image:", selectedImageIndex, "->", newIndex);
   setSelectedImageIndex(newIndex);
  }
 };

 const prevImage = () => {
  if (vehicle?.vehicle_images && selectedImageIndex !== null) {
   const newIndex = selectedImageIndex === 0 ? vehicle.vehicle_images.length - 1 : selectedImageIndex - 1;
   console.log("Previous image:", selectedImageIndex, "->", newIndex);
   setSelectedImageIndex(newIndex);
  }
 };

 const createMutation = useMutation({
  mutationFn: async (data: BoughtVehicleForm) => {
   const vehicleData: InsertBoughtVehicle = {
    stock_number: data.stock_number,
    make: data.make,
    model: data.model,
    derivative: data.derivative,
    colour: data.colour,
    mileage: data.mileage,
    year: data.year,
    registration: data.registration,
    location: data.location,
    due_in: data.due_in ? new Date(data.due_in) : undefined,
    retail_price_1: data.retail_price_1?.toString(),
    retail_price_2: data.retail_price_2?.toString(),
    things_to_do: data.things_to_do,
    vehicle_images: data.vehicle_images,
    status: data.status,
   };

   return apiRequest("POST", "/api/bought-vehicles", vehicleData);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/bought-vehicles"] });
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
   toast({
    title: "Success",
    description: "Bought vehicle added successfully",
   });
   form.reset();
   onClose();
  },
  onError: error => {
   toast({
    title: "Error",
    description: "Failed to add bought vehicle",
    variant: "destructive",
   });
  },
 });

 const updateMutation = useMutation({
  mutationFn: async (data: BoughtVehicleForm) => {
   if (!vehicle) throw new Error("No vehicle to update");

   const vehicleData: Partial<InsertBoughtVehicle> = {
    stock_number: data.stock_number,
    make: data.make,
    model: data.model,
    derivative: data.derivative,
    colour: data.colour,
    mileage: data.mileage,
    year: data.year,
    registration: data.registration,
    location: data.location,
    due_in: data.due_in ? new Date(data.due_in) : undefined,
    retail_price_1: data.retail_price_1?.toString(),
    retail_price_2: data.retail_price_2?.toString(),
    things_to_do: data.things_to_do,
    vehicle_images: data.vehicle_images,
    status: data.status,
   };

   return apiRequest("PUT", `/api/bought-vehicles/${vehicle.id}`, vehicleData);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/bought-vehicles"] });
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
   toast({
    title: "Success",
    description: "Bought vehicle updated successfully",
   });
   onClose();
  },
  onError: error => {
   toast({
    title: "Error",
    description: "Failed to update bought vehicle",
    variant: "destructive",
   });
  },
 });

 const handleSubmit = (data: BoughtVehicleForm) => {
  if (mode === "create") {
   createMutation.mutate(data);
  } else if (mode === "edit") {
   updateMutation.mutate(data);
  }
 };

 const handleImageUpload = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
   const files = e.target.files;
   if (files) {
    const newImages = Array.from(files).slice(0, 4 - uploadedImages.length);
    const imageUrls = newImages.map(file => URL.createObjectURL(file));
    setUploadedImages(prev => [...prev, ...imageUrls]);
   }
  },
  [uploadedImages],
 );

 const removeImage = (index: number) => {
  setUploadedImages(prev => prev.filter((_, i) => i !== index));
 };

 const isReadOnly = mode === "view";

 // If in view mode, render luxury view modal
 if (mode === "view" && vehicle) {
  return (
   <>
    <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
      <div className="relative">
       {/* Header with vehicle title */}
       <div className="sticky top-0 z-10 bg-white border-b p-6">
        <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold text-gray-900">
           {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-lg text-gray-600 mt-1">
           {vehicle.derivative} • {vehicle.registration}
          </p>
         </div>
         <div className="flex items-center gap-3">
          <div
           className={`px-3 py-1 rounded-full text-sm font-medium ${
            vehicle.status === "AWAITING"
             ? "bg-orange-100 text-orange-800"
             : vehicle.status === "ARRIVED"
               ? "bg-blue-100 text-blue-800"
               : vehicle.status === "PROCESSED"
                 ? "bg-green-100 text-green-800"
                 : "bg-gray-100 text-gray-800"
           }`}
          >
           {vehicle.status}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
           <X className="h-5 w-5" />
          </Button>
         </div>
        </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
        {/* Left Column - Vehicle Images */}
        <div className="space-y-4">
         <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Vehicle Images
         </h3>

         {vehicle.vehicle_images && vehicle.vehicle_images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
           {vehicle.vehicle_images.map((image, index) => (
            <div
             key={index}
             className="relative group cursor-pointer overflow-hidden rounded-lg border"
             onClick={() => handleImageClick(index)}
            >
             <img
              src={image}
              alt={`Vehicle ${index + 1}`}
              className="w-full h-48 object-cover transition-transform group-hover:scale-105"
             />
             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
            </div>
           ))}
          </div>
         ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
           <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
           <p className="mt-2 text-gray-500">No images available</p>
          </div>
         )}
        </div>

        {/* Right Column - Vehicle Details */}
        <div className="space-y-6">
         {/* Basic Information */}
         <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
           <Car className="h-5 w-5" />
           Vehicle Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="text-sm font-medium text-gray-600">Stock Number</label>
            <p className="text-lg font-semibold text-gray-900">{vehicle.stock_number}</p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-600">Registration</label>
            <p className="text-lg font-semibold text-gray-900">{vehicle.registration || "N/A"}</p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
             <Palette className="h-4 w-4" />
             Colour
            </label>
            <p className="text-lg font-semibold text-gray-900">{vehicle.colour || "N/A"}</p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
             <Gauge className="h-4 w-4" />
             Mileage
            </label>
            <p className="text-lg font-semibold text-gray-900">
             {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} miles` : "N/A"}
            </p>
           </div>
          </div>
         </div>

         {/* Location & Timeline */}
         <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
           <MapPin className="h-5 w-5" />
           Location & Timeline
          </h3>
          <div className="grid grid-cols-1 gap-4">
           <div>
            <label className="text-sm font-medium text-gray-600">Current Location</label>
            <p className="text-lg font-semibold text-gray-900">{vehicle.location || "N/A"}</p>
           </div>
           {vehicle.due_in && (
            <div>
             <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              Due In
             </label>
             <p className="text-lg font-semibold text-gray-900">
              {format(new Date(vehicle.due_in), "EEEE, MMMM do, yyyy")}
             </p>
            </div>
           )}
          </div>
         </div>

         {/* Pricing Information */}
         <div className="bg-green-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
           <CreditCard className="h-5 w-5" />
           Pricing Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="text-sm font-medium text-gray-600">Retail Price 1</label>
            <p className="text-2xl font-bold text-green-600">
             {vehicle.retail_price_1
              ? `£${parseFloat(vehicle.retail_price_1.toString()).toLocaleString()}`
              : "N/A"}
            </p>
           </div>
           {vehicle.retail_price_2 && (
            <div>
             <label className="text-sm font-medium text-gray-600">Retail Price 2</label>
             <p className="text-2xl font-bold text-green-600">
              £{parseFloat(vehicle.retail_price_2.toString()).toLocaleString()}
             </p>
            </div>
           )}
          </div>
         </div>

         {/* Things To Do */}
         {vehicle.things_to_do && (
          <div className="bg-yellow-50 rounded-lg p-6">
           <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Things To Do
           </h3>
           <p className="text-gray-700 whitespace-pre-wrap">{vehicle.things_to_do}</p>
          </div>
         )}
        </div>
       </div>

       {/* Action Buttons */}
       <div className="sticky bottom-0 bg-white border-t p-6 flex justify-between">
        <Button variant="outline" onClick={onClose}>
         Close
        </Button>
        <div className="flex gap-2">
         <Button
          variant="outline"
          onClick={() => {
           if (vehicle && onEdit) {
            onClose();
            onEdit(vehicle);
           }
          }}
         >
          <Edit className="h-4 w-4 mr-2" />
          Edit Vehicle
         </Button>
        </div>
       </div>
      </div>
     </DialogContent>
    </Dialog>

    {/* Full-screen Image Modal */}
    {isImageModalOpen && vehicle.vehicle_images && selectedImageIndex !== null && (
     <Dialog open={isImageModalOpen} onOpenChange={() => setIsImageModalOpen(false)}>
      <DialogContent className="max-w-screen max-h-screen w-screen h-screen p-0 bg-black">
       <div className="relative w-full h-full flex items-center justify-center">
        <Button
         variant="ghost"
         size="sm"
         className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
         onClick={() => setIsImageModalOpen(false)}
        >
         <X className="h-6 w-6" />
        </Button>

        {vehicle.vehicle_images.length > 1 && (
         <>
          <Button
           variant="ghost"
           size="sm"
           className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
           onClick={prevImage}
          >
           <ArrowLeft className="h-8 w-8" />
          </Button>
          <Button
           variant="ghost"
           size="sm"
           className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:bg-white/20"
           onClick={nextImage}
          >
           <ArrowRight className="h-8 w-8" />
          </Button>
         </>
        )}

        <img
         src={vehicle.vehicle_images[selectedImageIndex]}
         alt={`Vehicle ${selectedImageIndex + 1}`}
         className="max-w-full max-h-full object-contain"
         onError={e => {
          console.error("Image failed to load:", vehicle.vehicle_images[selectedImageIndex]);
          e.currentTarget.style.display = "none";
         }}
         onLoad={() => {
          console.log("Image loaded successfully:", vehicle.vehicle_images[selectedImageIndex]);
         }}
        />

        {vehicle.vehicle_images.length > 1 && (
         <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/50 rounded-full px-4 py-2 text-white text-sm">
           {selectedImageIndex + 1} of {vehicle.vehicle_images.length}
          </div>
         </div>
        )}
       </div>
      </DialogContent>
     </Dialog>
    )}
   </>
  );
 }

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
     <DialogTitle>
      {mode === "create" && "Add New Bought Vehicle"}
      {mode === "edit" && "Edit Bought Vehicle"}
     </DialogTitle>
     <DialogDescription>
      {mode === "create" && "Add a new vehicle to the bought vehicles inventory"}
      {mode === "edit" && "Edit details of the bought vehicle"}
     </DialogDescription>
    </DialogHeader>

    <Form {...form}>
     <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {/* Stock Number */}
       <FormField
        control={form.control}
        name="stock_number"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Stock Number</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter stock number" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Make */}
       <FormField
        control={form.control}
        name="make"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Make</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter make" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Model */}
       <FormField
        control={form.control}
        name="model"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Model</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter model" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Derivative */}
       <FormField
        control={form.control}
        name="derivative"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Derivative</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter derivative" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Colour */}
       <FormField
        control={form.control}
        name="colour"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Colour</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter colour" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Mileage */}
       <FormField
        control={form.control}
        name="mileage"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Mileage</FormLabel>
          <FormControl>
           <Input
            type="number"
            {...field}
            disabled={isReadOnly}
            placeholder="Enter mileage"
            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Year */}
       <FormField
        control={form.control}
        name="year"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Year</FormLabel>
          <FormControl>
           <Input
            type="number"
            {...field}
            disabled={isReadOnly}
            placeholder="Enter year"
            onChange={e =>
             field.onChange(e.target.value ? parseInt(e.target.value) : new Date().getFullYear())
            }
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Registration */}
       <FormField
        control={form.control}
        name="registration"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Registration</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter registration" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Location */}
       <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Location</FormLabel>
          <FormControl>
           <Input {...field} disabled={isReadOnly} placeholder="Enter location" />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Due In */}
       <FormField
        control={form.control}
        name="due_in"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Due In</FormLabel>
          <Popover>
           <PopoverTrigger asChild>
            <FormControl>
             <Button variant="outline" className="w-full pl-3 text-left font-normal" disabled={isReadOnly}>
              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
             </Button>
            </FormControl>
           </PopoverTrigger>
           <PopoverContent className="w-auto p-0" align="start">
            <Calendar
             mode="single"
             selected={field.value}
             onSelect={field.onChange}
             disabled={date => date < new Date("1900-01-01")}
             initialFocus
            />
           </PopoverContent>
          </Popover>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Retail Price 1 */}
       <FormField
        control={form.control}
        name="retail_price_1"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Retail Price 1</FormLabel>
          <FormControl>
           <Input
            type="number"
            step="0.01"
            {...field}
            disabled={isReadOnly}
            placeholder="Enter retail price"
            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Retail Price 2 (Optional) */}
       <FormField
        control={form.control}
        name="retail_price_2"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Retail Price 2 (Optional)</FormLabel>
          <FormControl>
           <Input
            type="number"
            step="0.01"
            {...field}
            disabled={isReadOnly}
            placeholder="Enter retail price (optional)"
            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />
      </div>

      {/* Things To Do */}
      <FormField
       control={form.control}
       name="things_to_do"
       render={({ field }) => (
        <FormItem>
         <FormLabel>Things To Do</FormLabel>
         <FormControl>
          <Textarea
           {...field}
           disabled={isReadOnly}
           placeholder="Enter things to do for this vehicle..."
           className="min-h-[100px]"
          />
         </FormControl>
         <FormMessage />
        </FormItem>
       )}
      />

      {/* Vehicle Images */}
      <div className="space-y-4">
       <Label>Vehicle Images (Max 4)</Label>

       {!isReadOnly && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
         <Upload className="mx-auto h-12 w-12 text-gray-400" />
         <div className="mt-4">
          <Button
           type="button"
           variant="outline"
           onClick={() => document.getElementById("image-upload")?.click()}
           disabled={uploadedImages.length >= 4}
          >
           Select Images
          </Button>
          <input
           id="image-upload"
           type="file"
           multiple
           accept="image/*"
           className="hidden"
           onChange={handleImageUpload}
          />
         </div>
         <p className="mt-2 text-sm text-gray-500">Drag & drop images here, or click to select files</p>
        </div>
       )}

       {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {uploadedImages.map((image, index) => (
          <div key={index} className="relative">
           <img src={image} alt={`Vehicle ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
           {!isReadOnly && (
            <Button
             type="button"
             variant="destructive"
             size="sm"
             className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
             onClick={() => removeImage(index)}
            >
             <X className="h-3 w-3" />
            </Button>
           )}
          </div>
         ))}
        </div>
       )}
      </div>

      {/* Form Actions */}
      {!isReadOnly && (
       <div className="flex gap-2 pt-4">
        <Button
         type="submit"
         disabled={createMutation.isPending || updateMutation.isPending}
         className="bg-red-600 hover:bg-red-700"
        >
         {mode === "create" ? "Add Vehicle" : "Update Vehicle"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
         Cancel
        </Button>
       </div>
      )}
     </form>
    </Form>
   </DialogContent>
  </Dialog>
 );
}

export default function BoughtVehicles() {
 const queryClient = useQueryClient();
 const [selectedVehicle, setSelectedVehicle] = useState<BoughtVehicle | null>(null);
 const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [searchTerm, setSearchTerm] = useState("");

 // Fetch bought vehicles from dedicated API
 const {
  data: boughtVehicles = [],
  isLoading,
  refetch,
 } = useQuery({
  queryKey: ["/api/bought-vehicles"],
  queryFn: async () => {
   const response = await apiRequest("GET", "/api/bought-vehicles");
   return response.json();
  },
 });

 // Ensure boughtVehicles is always an array
 const vehiclesList = Array.isArray(boughtVehicles) ? boughtVehicles : [];

 // Filter vehicles based on search term
 const filteredVehicles = vehiclesList.filter((vehicle: BoughtVehicle) => {
  const searchLower = searchTerm.toLowerCase();
  return (
   vehicle.stock_number?.toLowerCase().includes(searchLower) ||
   vehicle.make?.toLowerCase().includes(searchLower) ||
   vehicle.model?.toLowerCase().includes(searchLower) ||
   vehicle.registration?.toLowerCase().includes(searchLower)
  );
 });

 const deleteMutation = useMutation({
  mutationFn: async (vehicleId: number) => {
   return apiRequest("DELETE", `/api/bought-vehicles/${vehicleId}`);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/bought-vehicles"] });
   queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
   toast({
    title: "Success",
    description: "Vehicle deleted successfully",
   });
  },
  onError: error => {
   toast({
    title: "Error",
    description: "Failed to delete vehicle",
    variant: "destructive",
   });
  },
 });

 const handleAddNew = () => {
  setSelectedVehicle(null);
  setModalMode("create");
  setIsModalOpen(true);
 };

 const handleView = (vehicle: BoughtVehicle) => {
  setSelectedVehicle(vehicle);
  setModalMode("view");
  setIsModalOpen(true);
 };

 const handleEdit = (vehicle: BoughtVehicle) => {
  setSelectedVehicle(vehicle);
  setModalMode("edit");
  setIsModalOpen(true);
 };

 const handleDelete = (vehicle: BoughtVehicle) => {
  if (window.confirm("Are you sure you want to delete this vehicle?")) {
   deleteMutation.mutate(vehicle.id);
  }
 };

 return (
  <div className="p-6 space-y-6">
   {/* Stats Cards */}
   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card className="stats-card">
     <CardContent className="p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-sm text-gray-600">Total Vehicles</p>
        <p className="text-2xl font-bold text-gray-900">{filteredVehicles.length}</p>
       </div>
       <Car className="h-8 w-8 text-red-600" />
      </div>
     </CardContent>
    </Card>
    <Card className="stats-card">
     <CardContent className="p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-sm text-gray-600">Total Value</p>
        <p className="text-2xl font-bold text-gray-900">
         £
         {filteredVehicles
          .reduce((sum, vehicle) => {
           const value = vehicle.retail_price_1 ? parseFloat(vehicle.retail_price_1.toString()) : 0;
           return sum + value;
          }, 0)
          .toLocaleString()}
        </p>
       </div>
       <DollarSign className="h-8 w-8 text-green-600" />
      </div>
     </CardContent>
    </Card>
    <Card className="stats-card">
     <CardContent className="p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-sm text-gray-600">Average Value</p>
        <p className="text-2xl font-bold text-gray-900">
         £
         {filteredVehicles.length > 0
          ? Math.round(
             filteredVehicles.reduce((sum, vehicle) => {
              const value = vehicle.retail_price_1 ? parseFloat(vehicle.retail_price_1.toString()) : 0;
              return sum + value;
             }, 0) / filteredVehicles.length,
            ).toLocaleString()
          : "0"}
        </p>
       </div>
       <Calculator className="h-8 w-8 text-blue-600" />
      </div>
     </CardContent>
    </Card>
    <Card className="stats-card">
     <CardContent className="p-4">
      <div className="flex items-center justify-between">
       <div>
        <p className="text-sm text-gray-600">Awaiting</p>
        <p className="text-2xl font-bold text-gray-900">
         {filteredVehicles.filter(vehicle => vehicle.status === "AWAITING").length}
        </p>
       </div>
       <Clock className="h-8 w-8 text-purple-600" />
      </div>
     </CardContent>
    </Card>
   </div>

   {/* Action Bar */}
   <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
    <div className="flex gap-2">
     <Button onClick={handleAddNew} className="bg-red-600 hover:bg-red-700">
      <Plus className="h-4 w-4 mr-2" />
      Add New
     </Button>
     <Button variant="outline" onClick={() => refetch()}>
      <Eye className="h-4 w-4 mr-2" />
      View All
     </Button>
    </div>

    {/* Search */}
    <div className="relative">
     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
     <Input
      placeholder="Search vehicles..."
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      className="pl-10 w-64"
     />
    </div>
   </div>

   {/* Vehicles Grid */}
   {isLoading ? (
    <div className="text-center py-8">
     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
     <p className="mt-2 text-gray-600">Loading vehicles...</p>
    </div>
   ) : filteredVehicles.length === 0 ? (
    <div className="text-center py-12">
     <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
     <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
     <p className="text-gray-500 mb-6">
      {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first bought vehicle."}
     </p>
     <Button onClick={handleAddNew} className="bg-red-600 hover:bg-red-700">
      <Plus className="h-4 w-4 mr-2" />
      Add Vehicle
     </Button>
    </div>
   ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     {filteredVehicles.map((vehicle: BoughtVehicle) => (
      <Card key={vehicle.id} className="premium-card hover:shadow-lg transition-shadow">
       <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
         <div>
          <CardTitle className="text-lg">
           {vehicle.year} {vehicle.make} {vehicle.model}
          </CardTitle>
          <div className="text-sm text-gray-500 mt-1">
           Stock: {vehicle.stock_number} | {vehicle.registration}
          </div>
         </div>
         <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleView(vehicle)} className="h-8 w-8 p-0">
           <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicle)} className="h-8 w-8 p-0">
           <Edit className="h-4 w-4" />
          </Button>
          <Button
           variant="ghost"
           size="sm"
           onClick={() => handleDelete(vehicle)}
           className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
           <Trash2 className="h-4 w-4" />
          </Button>
         </div>
        </div>
       </CardHeader>
       <CardContent className="pt-0">
        <div className="space-y-2">
         <div className="flex justify-between text-sm">
          <span className="text-gray-600">Derivative:</span>
          <span>{vehicle.derivative || "N/A"}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span className="text-gray-600">Colour:</span>
          <span>{vehicle.colour || "N/A"}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span className="text-gray-600">Mileage:</span>
          <span>{vehicle.mileage ? `${vehicle.mileage.toLocaleString()} miles` : "N/A"}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span className="text-gray-600">Location:</span>
          <span>{vehicle.location || "N/A"}</span>
         </div>
         <div className="flex justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span
           className={`font-semibold ${
            vehicle.status === "AWAITING"
             ? "text-orange-600"
             : vehicle.status === "ARRIVED"
               ? "text-blue-600"
               : vehicle.status === "PROCESSED"
                 ? "text-green-600"
                 : "text-gray-600"
           }`}
          >
           {vehicle.status || "N/A"}
          </span>
         </div>
         <div className="flex justify-between text-sm">
          <span className="text-gray-600">Retail Price:</span>
          <span className="font-semibold text-green-600">
           {vehicle.retail_price_1
            ? `£${parseFloat(vehicle.retail_price_1.toString()).toLocaleString()}`
            : "N/A"}
          </span>
         </div>
         {vehicle.due_in && (
          <div className="flex justify-between text-sm">
           <span className="text-gray-600">Due In:</span>
           <span>{format(new Date(vehicle.due_in), "dd/MM/yyyy")}</span>
          </div>
         )}
        </div>
       </CardContent>
      </Card>
     ))}
    </div>
   )}

   {/* Modal */}
   <BoughtVehicleModal
    vehicle={selectedVehicle}
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    mode={modalMode}
    onEdit={handleEdit}
   />
  </div>
 );
}
