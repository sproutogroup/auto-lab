import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, Mail, MapPin, Edit, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@shared/schema";

const customerFormSchema = z.object({
 first_name: z.string().min(1, "First name is required"),
 last_name: z.string().min(1, "Last name is required"),
 email: z.string().email("Invalid email address").optional().or(z.literal("")),
 phone: z.string().optional(),
 mobile: z.string().optional(),
 address: z.string().optional(),
 city: z.string().optional(),
 county: z.string().optional(),
 postcode: z.string().optional(),
 notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerModalProps {
 isOpen: boolean;
 onClose: () => void;
 customer?: Customer;
 mode: "add" | "edit" | "view";
}

export default function CustomerModal({ isOpen, onClose, customer, mode }: CustomerModalProps) {
 const is_view_mode = mode === "view";
 const { toast } = useToast();
 const query_client = useQueryClient();

 const form = useForm<CustomerFormData>({
  resolver: zodResolver(customerFormSchema),
  defaultValues: {
   first_name: "",
   last_name: "",
   email: "",
   phone: "",
   mobile: "",
   address: "",
   city: "",
   county: "",
   postcode: "",
   notes: "",
  },
 });

 // Reset form when modal opens or customer/mode changes
 useEffect(() => {
  if (isOpen) {
   if (customer && (mode === "edit" || mode === "view")) {
    form.reset({
     first_name: customer.first_name || "",
     last_name: customer.last_name || "",
     email: customer.email || "",
     phone: customer.phone || "",
     mobile: customer.mobile || "",
     address: customer.address || "",
     city: customer.city || "",
     county: customer.county || "",
     postcode: customer.postcode || "",
     notes: customer.notes || "",
    });
   } else if (mode === "add") {
    form.reset({
     first_name: "",
     last_name: "",
     email: "",
     phone: "",
     mobile: "",
     address: "",
     city: "",
     county: "",
     postcode: "",
     notes: "",
    });
   }
  }
 }, [isOpen, customer, mode, form]);

 // Create/Update customer mutation
 const customer_mutation = useMutation({
  mutationFn: async (data: CustomerFormData) => {
   const url = mode === "edit" ? `/api/customers/${customer?.id}` : "/api/customers";
   const method = mode === "edit" ? "PUT" : "POST";

   const response = await fetch(url, {
    method,
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
   });

   if (!response.ok) {
    throw new Error(`Failed to ${mode === "edit" ? "update" : "create"} customer`);
   }

   return response.json();
  },
  onSuccess: () => {
   query_client.invalidateQueries({ queryKey: ["/api/customers"] });
   query_client.invalidateQueries({ queryKey: ["/api/customers/stats"] });
   toast({
    title: "Success",
    description: `Customer ${mode === "edit" ? "updated" : "created"} successfully`,
   });
   onClose();
  },
  onError: (error: Error) => {
   toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 const onSubmit = (data: CustomerFormData) => {
  customer_mutation.mutate(data);
 };

 const getCustomerStatus = () => {
  // For now, we'll just return "Active" as the default
  return "Active";
 };

 const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
   case "active":
    return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
   case "inactive":
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
   case "prospect":
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
   default:
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
  }
 };

 // Show view mode for converted customers
 if (is_view_mode && customer) {
  return (
   <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl">
     <DialogHeader>
      <div className="flex items-center justify-between">
       <div>
        <DialogTitle className="text-xl">
         {customer.first_name} {customer.last_name}
        </DialogTitle>
        <DialogDescription>Customer information and details</DialogDescription>
       </div>
       <Badge className={getStatusColor(getCustomerStatus())}>{getCustomerStatus()}</Badge>
      </div>
     </DialogHeader>

     <div className="space-y-4">
      {/* Personal Information */}
      <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <User className="h-5 w-5" />
         Personal Information
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</label>
          <p className="text-sm mt-1">{customer.first_name || "Not provided"}</p>
         </div>
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</label>
          <p className="text-sm mt-1">{customer.last_name || "Not provided"}</p>
         </div>
        </div>
       </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <Phone className="h-5 w-5" />
         Contact Information
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
          <p className="text-sm mt-1">{customer.email || "Not provided"}</p>
         </div>
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
          <p className="text-sm mt-1">{customer.phone || "Not provided"}</p>
         </div>
        </div>
        <div>
         <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mobile</label>
         <p className="text-sm mt-1">{customer.mobile || "Not provided"}</p>
        </div>
       </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <MapPin className="h-5 w-5" />
         Address Information
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-3">
        <div>
         <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
         <p className="text-sm mt-1">{customer.address || "Not provided"}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">City</label>
          <p className="text-sm mt-1">{customer.city || "Not provided"}</p>
         </div>
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">County</label>
          <p className="text-sm mt-1">{customer.county || "Not provided"}</p>
         </div>
         <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Postcode</label>
          <p className="text-sm mt-1">{customer.postcode || "Not provided"}</p>
         </div>
        </div>
       </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
       <Card>
        <CardHeader>
         <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
         <p className="text-sm text-gray-600 dark:text-gray-300">{customer.notes}</p>
        </CardContent>
       </Card>
      )}
     </div>

     <div className="flex justify-end pt-4 border-t">
      <Button
       type="button"
       onClick={onClose}
       className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
      >
       Close
      </Button>
     </div>
    </DialogContent>
   </Dialog>
  );
 }

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent className="max-w-2xl">
    <DialogHeader>
     <DialogTitle>{mode === "edit" ? "Edit Customer" : "New Customer"}</DialogTitle>
     <DialogDescription>
      {mode === "edit" ? "Update customer information and details" : "Add a new customer to your database"}
     </DialogDescription>
    </DialogHeader>

    <Form {...form}>
     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Personal Information */}
      <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <User className="h-5 w-5" />
         Personal Information
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
         <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
           <FormItem>
            <FormLabel>First Name</FormLabel>
            <FormControl>
             <Input placeholder="First name" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
         <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
           <FormItem>
            <FormLabel>Last Name</FormLabel>
            <FormControl>
             <Input placeholder="Last name" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
        </div>
       </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <Phone className="h-5 w-5" />
         Contact Information
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
         <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
           <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
             <Input placeholder="Email address" type="email" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
         <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
           <FormItem>
            <FormLabel>Phone</FormLabel>
            <FormControl>
             <Input placeholder="Phone number" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
        </div>
        <FormField
         control={form.control}
         name="mobile"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Mobile</FormLabel>
           <FormControl>
            <Input placeholder="Mobile number" {...field} />
           </FormControl>
           <FormMessage />
          </FormItem>
         )}
        />
       </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <MapPin className="h-5 w-5" />
         Address Information
        </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
        <FormField
         control={form.control}
         name="address"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Address</FormLabel>
           <FormControl>
            <Input placeholder="Street address" {...field} />
           </FormControl>
           <FormMessage />
          </FormItem>
         )}
        />
        <div className="grid grid-cols-3 gap-4">
         <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
           <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
             <Input placeholder="City" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
         <FormField
          control={form.control}
          name="county"
          render={({ field }) => (
           <FormItem>
            <FormLabel>County</FormLabel>
            <FormControl>
             <Input placeholder="County" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
         <FormField
          control={form.control}
          name="postcode"
          render={({ field }) => (
           <FormItem>
            <FormLabel>Postcode</FormLabel>
            <FormControl>
             <Input placeholder="Postcode" {...field} />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
        </div>
       </CardContent>
      </Card>

      {/* Notes */}
      <Card>
       <CardHeader>
        <CardTitle>Notes</CardTitle>
       </CardHeader>
       <CardContent>
        <FormField
         control={form.control}
         name="notes"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Additional Notes</FormLabel>
           <FormControl>
            <Textarea
             placeholder="Any additional notes about this customer..."
             className="min-h-[80px]"
             {...field}
            />
           </FormControl>
           <FormMessage />
          </FormItem>
         )}
        />
       </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
       <Button type="button" variant="outline" onClick={onClose} disabled={customer_mutation.isPending}>
        Cancel
       </Button>
       <Button
        type="submit"
        disabled={customer_mutation.isPending}
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
       >
        {customer_mutation.isPending ? "Saving..." : mode === "edit" ? "Update Customer" : "Create Customer"}
       </Button>
      </div>
     </form>
    </Form>
   </DialogContent>
  </Dialog>
 );
}
