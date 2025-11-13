import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, User, ArrowRight, Phone, Mail, Repeat, CreditCard, Search, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Lead, Vehicle, Interaction, InsertInteraction } from "@shared/schema";
import { SimpleInteractionsManager } from "./interactions_manager_simple";

const leadFormSchema = z.object({
 title: z.string().default("none"),
 first_name: z.string().min(1, "First name is required"),
 last_name: z.string().min(1, "Last name is required"),
 email: z.string().email("Invalid email address").optional().or(z.literal("")),
 primary_phone: z.string().optional(),
 secondary_phone: z.string().optional(),
 marketing_communications: z.boolean().default(false),

 // Vehicle preferences and assignment
 assigned_vehicle_id: z.number().optional(),
 vehicle_interests: z.string().optional(),
 budget_min: z.string().optional(),
 budget_max: z.string().optional(),
 vehicle_enquiry_notes: z.string().optional(),
 finance_required: z.boolean().default(false),
 trade_in_vehicle: z.string().optional(),
 trade_in_value: z.string().optional(),

 // Part exchange details
 has_part_exchange: z.boolean().default(false),
 part_exchange_registration: z.string().optional(),
 part_exchange_mileage: z.string().optional(),
 part_exchange_damage: z.string().optional(),
 part_exchange_colour: z.string().optional(),

 // Finance preferences
 finance_preference_type: z.string().optional(),

 // Lead pipeline
 lead_source: z.string().min(1, "Lead source is required"),
 pipeline_stage: z.string().default("new"),
 lead_quality: z.string().default("unqualified"),
 priority: z.string().default("medium"),

 // Notes
 notes: z.string().optional(),
 marketing_consent: z.boolean().default(false),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadModalProps {
 isOpen: boolean;
 onClose: () => void;
 lead?: Lead;
 mode: "add" | "edit" | "view";
}

export default function Lead_Modal({ isOpen, onClose, lead, mode }: LeadModalProps) {
 const is_view_mode = mode === "view";
 const [active_tab, set_active_tab] = useState("details");
 const [vehicle_search_query, set_vehicle_search_query] = useState("");
 const [should_close_on_success, set_should_close_on_success] = useState(false);
 const [is_interaction_in_progress, set_is_interaction_in_progress] = useState(false);
 const { toast } = useToast();
 const query_client = useQueryClient();

 // Fetch vehicles for assignment
 const { data: vehicles = [] } = useQuery<Vehicle[]>({
  queryKey: ["/api/vehicles"],
 });

 // Fetch interactions for this lead
 const { data: interactions = [] } = useQuery<Interaction[]>({
  queryKey: [`/api/leads/${lead?.id}/interactions`],
  enabled: !!lead?.id && (mode === "edit" || mode === "view"),
 });

 // Filter stock vehicles for assignment
 const stock_vehicles = vehicles.filter(vehicle => vehicle.sales_status?.toLowerCase() === "stock");

 // Filter vehicles based on search query
 const filtered_vehicles =
  vehicle_search_query.length > 0
   ? stock_vehicles.filter(
      vehicle =>
       vehicle.registration?.toLowerCase().includes(vehicle_search_query.toLowerCase()) ||
       vehicle.stock_number?.toLowerCase().includes(vehicle_search_query.toLowerCase()),
     )
   : [];

 // Find assigned vehicle for view mode
 const assigned_vehicle = lead?.assigned_vehicle_id
  ? vehicles.find(v => v.id === lead.assigned_vehicle_id)
  : null;

 const form = useForm<LeadFormData>({
  resolver: zodResolver(leadFormSchema),
  defaultValues: {
   title: "none",
   first_name: "",
   last_name: "",
   email: "",
   primary_phone: "",
   secondary_phone: "",
   marketing_communications: false,
   assigned_vehicle_id: undefined,
   vehicle_interests: "",
   budget_min: "",
   budget_max: "",
   vehicle_enquiry_notes: "",
   finance_required: false,
   trade_in_vehicle: "",
   trade_in_value: "",
   has_part_exchange: false,
   part_exchange_registration: "",
   part_exchange_mileage: "",
   part_exchange_damage: "",
   part_exchange_colour: "",
   finance_preference_type: "",
   lead_source: "",
   pipeline_stage: "new",
   lead_quality: "unqualified",
   priority: "medium",
   notes: "",
   marketing_consent: false,
  },
 });

 // Reset form when modal opens or lead/mode changes
 useEffect(() => {
  if (isOpen) {
   if (lead && (mode === "edit" || mode === "view")) {
    form.reset({
     title: "none",
     first_name: lead.first_name || "",
     last_name: lead.last_name || "",
     email: lead.email || "",
     primary_phone: lead.primary_phone || "",
     secondary_phone: lead.secondary_phone || "",
     marketing_communications: lead.marketing_consent || false,
     assigned_vehicle_id: lead.assigned_vehicle_id || undefined,
     vehicle_interests: lead.vehicle_interests || "",
     budget_min: lead.budget_min ? lead.budget_min.toString() : "",
     budget_max: lead.budget_max ? lead.budget_max.toString() : "",
     vehicle_enquiry_notes: lead.notes || "",
     finance_required: lead.finance_required || false,
     trade_in_vehicle: lead.trade_in_vehicle || "",
     trade_in_value: lead.trade_in_value ? lead.trade_in_value.toString() : "",
     has_part_exchange: !!lead.part_exchange_registration,
     part_exchange_registration: lead.part_exchange_registration || "",
     part_exchange_mileage: lead.part_exchange_mileage || "",
     part_exchange_damage: lead.part_exchange_damage || "",
     part_exchange_colour: lead.part_exchange_colour || "",
     finance_preference_type: lead.finance_preference_type || "",
     lead_source: lead.lead_source || "",
     pipeline_stage: lead.pipeline_stage || "new",
     lead_quality: lead.lead_quality || "unqualified",
     priority: lead.priority || "medium",
     notes: lead.notes || "",
     marketing_consent: lead.marketing_consent || false,
    });
   } else if (mode === "add") {
    form.reset({
     title: "none",
     first_name: "",
     last_name: "",
     email: "",
     primary_phone: "",
     secondary_phone: "",
     marketing_communications: false,
     assigned_vehicle_id: undefined,
     vehicle_interests: "",
     budget_min: "",
     budget_max: "",
     vehicle_enquiry_notes: "",
     finance_required: false,
     trade_in_vehicle: "",
     trade_in_value: "",
     has_part_exchange: false,
     part_exchange_registration: "",
     part_exchange_mileage: "",
     part_exchange_damage: "",
     part_exchange_colour: "",
     finance_preference_type: "",
     lead_source: "",
     pipeline_stage: "new",
     lead_quality: "unqualified",
     priority: "medium",
     notes: "",
     marketing_consent: false,
    });
   }
   set_vehicle_search_query("");
  }
 }, [isOpen, lead, mode, form]);

 // Create/Update lead mutation
 const lead_mutation = useMutation({
  mutationFn: async (data: LeadFormData) => {
   const url = mode === "edit" ? `/api/leads/${lead?.id}` : "/api/leads";
   const method = mode === "edit" ? "PUT" : "POST";

   // Transform the data to match the expected format
   const transformedData = {
    ...data,
    budget_min: data.budget_min ? Number(data.budget_min) || null : null,
    budget_max: data.budget_max ? Number(data.budget_max) || null : null,
    trade_in_value: data.trade_in_value ? Number(data.trade_in_value) || null : null,
    contact_attempts: 0,
    // Don't send has_part_exchange field - it's UI only
    has_part_exchange: undefined,
   };

   const response = await fetch(url, {
    method,
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify(transformedData),
   });

   if (!response.ok) {
    throw new Error(`Failed to ${mode === "edit" ? "update" : "create"} lead`);
   }

   return response.json();
  },
  onSuccess: () => {
   query_client.invalidateQueries({ queryKey: ["/api/leads"] });
   query_client.invalidateQueries({ queryKey: ["/api/leads/stats"] });
   toast({
    title: "Success",
    description: `Lead ${mode === "edit" ? "updated" : "created"} successfully`,
   });
   // Only close modal if the update was triggered by explicit user form submission
   // In edit mode, don't auto-close (likely from automatic updates like interaction creation)
   if (should_close_on_success) {
    onClose();
    set_should_close_on_success(false);
   } else if (mode === "add") {
    // Always close when creating new leads
    onClose();
   } else if (is_interaction_in_progress || active_tab === "interactions") {
    // Don't close if interaction is in progress or user is on interactions tab
    console.log("Preventing modal close - interaction in progress or on interactions tab");
   }
  },
  onError: (error: Error) => {
   toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 // Convert lead to customer mutation
 const convert_mutation = useMutation({
  mutationFn: async () => {
   if (!lead) throw new Error("No lead selected");

   // Map lead data to simplified customer structure
   const customerData = {
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email || "",
    phone: lead.primary_phone || "",
    mobile: lead.secondary_phone || "",
    address: "", // Will be filled by user in conversion form
    city: "",
    county: "",
    postcode: "",
    notes: lead.notes || "",
   };

   const response = await fetch(`/api/leads/${lead.id}/convert`, {
    method: "POST",
    headers: {
     "Content-Type": "application/json",
    },
    body: JSON.stringify(customerData),
   });

   if (!response.ok) {
    throw new Error("Failed to convert lead to customer");
   }

   return response.json();
  },
  onSuccess: () => {
   query_client.invalidateQueries({ queryKey: ["/api/leads"] });
   query_client.invalidateQueries({ queryKey: ["/api/customers"] });
   query_client.invalidateQueries({ queryKey: ["/api/leads/stats"] });
   query_client.invalidateQueries({ queryKey: ["/api/customers/stats"] });
   toast({
    title: "Success",
    description: "Lead converted to customer successfully",
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

 const onSubmit = (data: LeadFormData) => {
  set_should_close_on_success(true);
  lead_mutation.mutate(data);
 };

 const handleConvertToCustomer = () => {
  if (confirm("Are you sure you want to convert this lead to a customer?")) {
   convert_mutation.mutate();
  }
 };

 const getStageColor = (stage: string) => {
  switch (stage) {
   case "new":
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
   case "contacted":
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
   case "qualified":
    return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
   case "test_drive_booked":
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
   case "test_drive_completed":
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300";
   case "negotiating":
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
   case "deposit_taken":
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300";
   case "finance_pending":
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300";
   case "converted":
    return "bg-green-500 text-white dark:bg-green-600";
   case "lost":
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
   default:
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
 };

 const getPriorityColor = (priority: string) => {
  switch (priority) {
   case "low":
    return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
   case "medium":
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
   case "high":
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
   case "urgent":
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
   default:
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
 };

 const getQualityColor = (quality: string) => {
  switch (quality) {
   case "unqualified":
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
   case "cold":
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
   case "warm":
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
   case "hot":
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
   case "qualified":
    return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
   default:
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
 };

 // Create a luxury view mode experience
 if (is_view_mode && lead) {
  return (
   <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 sm:max-w-[95vw] sm:max-h-[90vh] sm:m-2">
     <DialogHeader className="border-b pb-6 sm:pb-4">
      {/* Mobile Header */}
      <div className="sm:hidden">
       <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-white">
         <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
         <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
          {lead.first_name} {lead.last_name}
         </DialogTitle>
         <DialogDescription className="text-sm text-gray-600 dark:text-gray-300">
          Lead Information & History
         </DialogDescription>
        </div>
       </div>
       <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${getStageColor(lead.pipeline_stage || "new")} text-xs font-medium px-2 py-1`}>
         {lead.pipeline_stage?.replace(/_/g, " ").toUpperCase() || "NEW"}
        </Badge>
        <Badge className={`${getPriorityColor(lead.priority || "medium")} text-xs font-medium px-2 py-1`}>
         {lead.priority?.toUpperCase() || "MEDIUM"}
        </Badge>
       </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between">
       <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-full text-white">
         <User className="h-6 w-6" />
        </div>
        <div>
         <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
          {lead.first_name} {lead.last_name}
         </DialogTitle>
         <DialogDescription className="text-gray-600 dark:text-gray-300 mt-1">
          Lead Information & Interaction History
         </DialogDescription>
        </div>
       </div>
       <div className="flex items-center gap-3">
        <Badge className={`${getStageColor(lead.pipeline_stage || "new")} text-sm font-medium px-3 py-1`}>
         {lead.pipeline_stage?.replace(/_/g, " ").toUpperCase() || "NEW"}
        </Badge>
        <Badge className={`${getPriorityColor(lead.priority || "medium")} text-sm font-medium px-3 py-1`}>
         {lead.priority?.toUpperCase() || "MEDIUM"}
        </Badge>
       </div>
      </div>
     </DialogHeader>

     <div className="py-6 sm:py-4">
      <Tabs value={active_tab} onValueChange={set_active_tab}>
       {/* Mobile Tabs */}
       <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 sm:hidden">
        <TabsTrigger
         value="details"
         className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
        >
         Details
        </TabsTrigger>
        <TabsTrigger
         value="pipeline"
         className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
        >
         Pipeline
        </TabsTrigger>
        <TabsTrigger
         value="interactions"
         className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs px-2 py-2"
        >
         Interactions
        </TabsTrigger>
       </TabsList>

       {/* Desktop Tabs */}
       <TabsList className="hidden sm:grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <TabsTrigger
         value="details"
         className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
         Lead Details & Vehicle Assignment
        </TabsTrigger>
        <TabsTrigger
         value="pipeline"
         className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
         Pipeline Management
        </TabsTrigger>
        <TabsTrigger
         value="interactions"
         className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
        >
         Interactions
        </TabsTrigger>
       </TabsList>

       {/* Lead Details & Vehicle Assignment Tab */}
       <TabsContent value="details" className="space-y-6 mt-6 sm:space-y-4 sm:mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
         {/* Personal Information Card */}
         <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-700/40">
          <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg sm:py-3">
           <CardTitle className="flex items-center gap-2 sm:text-base">
            <User className="h-5 w-5 sm:h-4 sm:w-4" />
            Personal Information
           </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 sm:p-4 sm:space-y-3">
           <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-3">
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Title</label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.title && lead.title !== "none"
               ? lead.title.charAt(0).toUpperCase() + lead.title.slice(1)
               : "Not specified"}
             </p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Lead Source
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.lead_source || "Not specified"}
             </p>
            </div>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Full Name
            </label>
            <p className="text-xl font-bold text-gray-900 dark:text-white sm:text-lg">
             {lead.first_name} {lead.last_name}
            </p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Lead Created
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.createdAt
              ? new Date(lead.createdAt).toLocaleDateString("en-GB", {
                 weekday: "long",
                 year: "numeric",
                 month: "long",
                 day: "numeric",
                })
              : "Not specified"}
            </p>
           </div>
          </CardContent>
         </Card>

         {/* Contact Information Card */}
         <Card className="shadow-lg border-0 bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800/40 dark:to-stone-700/40">
          <CardHeader className="bg-gradient-to-r from-stone-600 to-stone-700 text-white rounded-t-lg sm:py-3">
           <CardTitle className="flex items-center gap-2 sm:text-base">
            <Phone className="h-5 w-5 sm:h-4 sm:w-4" />
            Contact Information
           </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 sm:p-4 sm:space-y-3">
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Email Address
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.email || "Not provided"}
            </p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Primary Phone
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.primary_phone || "Not provided"}
            </p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Secondary Phone
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.secondary_phone || "Not provided"}
            </p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Marketing Consent
            </label>
            <div className="flex items-center gap-2 mt-1">
             {lead.marketing_consent ? (
              <Check className="h-4 w-4 text-green-600 sm:h-3 sm:w-3" />
             ) : (
              <X className="h-4 w-4 text-red-600 sm:h-3 sm:w-3" />
             )}
             <span className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.marketing_consent ? "Consented" : "Not consented"}
             </span>
            </div>
           </div>
          </CardContent>
         </Card>
        </div>

        {/* Vehicle Assignment Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-700/40">
         <CardHeader className="bg-gradient-to-r from-zinc-600 to-zinc-700 text-white rounded-t-lg sm:py-3">
          <CardTitle className="flex items-center gap-2 sm:text-base">
           <Car className="h-5 w-5 sm:h-4 sm:w-4" />
           Vehicle Assignment & Preferences
          </CardTitle>
         </CardHeader>
         <CardContent className="p-6 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
           <div className="space-y-4 sm:space-y-3">
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Assigned Vehicle
             </label>
             {assigned_vehicle ? (
              <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border sm:p-2">
               <p className="font-bold text-gray-900 dark:text-white sm:text-sm">
                {assigned_vehicle.registration || "No registration"}
                <span className="ml-2 text-sm text-gray-500 sm:text-xs">
                 ({assigned_vehicle.stock_number})
                </span>
               </p>
               <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-xs">
                {assigned_vehicle.make} {assigned_vehicle.model} {assigned_vehicle.derivative}
               </p>
               <p className="text-sm text-gray-500 sm:text-xs">
                {assigned_vehicle.year} • {assigned_vehicle.colour} •{" "}
                {assigned_vehicle.mileage?.toLocaleString()} miles
               </p>
              </div>
             ) : (
              <p className="text-gray-500 italic sm:text-sm">No vehicle assigned</p>
             )}
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Vehicle Interests
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.vehicle_interests || "Not specified"}
             </p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Budget Range
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.budget_min && lead.budget_max
               ? `£${Number(lead.budget_min).toLocaleString()} - £${Number(lead.budget_max).toLocaleString()}`
               : lead.budget_min
                 ? `From £${Number(lead.budget_min).toLocaleString()}`
                 : lead.budget_max
                   ? `Up to £${Number(lead.budget_max).toLocaleString()}`
                   : "Not specified"}
             </p>
            </div>
           </div>
           <div className="space-y-4 sm:space-y-3">
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Vehicle Enquiry Notes
             </label>
             <p className="text-gray-900 dark:text-white sm:text-sm">{lead.notes || "No notes provided"}</p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Finance Preference
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.finance_preference_type || "Not specified"}
             </p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Finance Required
             </label>
             <div className="flex items-center gap-2 mt-1">
              {lead.finance_required ? (
               <Check className="h-4 w-4 text-green-600 sm:h-3 sm:w-3" />
              ) : (
               <X className="h-4 w-4 text-red-600 sm:h-3 sm:w-3" />
              )}
              <span className="text-gray-900 dark:text-white font-medium sm:text-sm">
               {lead.finance_required ? "Yes" : "No"}
              </span>
             </div>
            </div>
           </div>
          </div>
         </CardContent>
        </Card>

        {/* Part Exchange Card */}
        {(lead.part_exchange_registration ||
         lead.part_exchange_mileage ||
         lead.part_exchange_colour ||
         lead.part_exchange_damage) && (
         <Card className="shadow-lg border-0 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800/40 dark:to-neutral-700/40">
          <CardHeader className="bg-gradient-to-r from-neutral-600 to-neutral-700 text-white rounded-t-lg sm:py-3">
           <CardTitle className="flex items-center gap-2 sm:text-base">
            <Repeat className="h-5 w-5 sm:h-4 sm:w-4" />
            Part Exchange Details
           </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-4">
           <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-3">
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Registration
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.part_exchange_registration || "Not specified"}
             </p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Mileage
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.part_exchange_mileage || "Not specified"}
             </p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Colour</label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.part_exchange_colour || "Not specified"}
             </p>
            </div>
            <div>
             <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
              Condition Notes
             </label>
             <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
              {lead.part_exchange_damage || "Not specified"}
             </p>
            </div>
           </div>
          </CardContent>
         </Card>
        )}
       </TabsContent>

       {/* Pipeline Management Tab */}
       <TabsContent value="pipeline" className="space-y-6 mt-6 sm:space-y-4 sm:mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-4">
         {/* Pipeline Status Card */}
         <Card className="shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-700/40">
          <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-t-lg sm:py-3">
           <CardTitle className="sm:text-base">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 sm:p-4 sm:space-y-3">
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Current Stage
            </label>
            <div className="mt-2 sm:mt-1">
             <Badge
              className={`${getStageColor(lead.pipeline_stage || "new")} text-sm font-medium px-3 py-1 sm:text-xs sm:px-2`}
             >
              {lead.pipeline_stage?.replace(/_/g, " ").toUpperCase() || "NEW"}
             </Badge>
            </div>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Lead Quality
            </label>
            <div className="mt-2 sm:mt-1">
             <Badge
              className={`${getQualityColor(lead.lead_quality || "unqualified")} text-sm font-medium px-3 py-1 sm:text-xs sm:px-2`}
             >
              {lead.lead_quality?.toUpperCase() || "UNQUALIFIED"}
             </Badge>
            </div>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Priority Level
            </label>
            <div className="mt-2 sm:mt-1">
             <Badge
              className={`${getPriorityColor(lead.priority || "medium")} text-sm font-medium px-3 py-1 sm:text-xs sm:px-2`}
             >
              {lead.priority?.toUpperCase() || "MEDIUM"}
             </Badge>
            </div>
           </div>
          </CardContent>
         </Card>

         {/* Contact Tracking Card */}
         <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-700/40">
          <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg sm:py-3">
           <CardTitle className="sm:text-base">Contact Tracking</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 sm:p-4 sm:space-y-3">
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Last Contact
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.last_contact_date
              ? new Date(lead.last_contact_date).toLocaleDateString("en-GB", {
                 weekday: "long",
                 year: "numeric",
                 month: "long",
                 day: "numeric",
                })
              : "No contact recorded"}
            </p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Next Follow-up
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.next_follow_up_date
              ? new Date(lead.next_follow_up_date).toLocaleDateString("en-GB", {
                 weekday: "long",
                 year: "numeric",
                 month: "long",
                 day: "numeric",
                })
              : "No follow-up scheduled"}
            </p>
           </div>
           <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
             Contact Attempts
            </label>
            <p className="text-gray-900 dark:text-white font-medium sm:text-sm">
             {lead.contact_attempts || 0}
            </p>
           </div>
          </CardContent>
         </Card>
        </div>
       </TabsContent>

       {/* Interactions Tab */}
       <TabsContent value="interactions" className="space-y-6 mt-6 sm:space-y-4 sm:mt-4">
        <SimpleInteractionsManager
         leadId={lead?.id}
         mode={mode}
         onInteractionProgress={set_is_interaction_in_progress}
        />
       </TabsContent>
      </Tabs>

      {/* Close Button */}
      <div className="flex justify-end pt-6 border-t sm:pt-4">
       <Button
        type="button"
        onClick={onClose}
        className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200 sm:w-full sm:px-4 sm:py-3"
       >
        Close
       </Button>
      </div>
     </div>
    </DialogContent>
   </Dialog>
  );
 }

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-[95vw] sm:max-h-[95vh] sm:m-2">
    <DialogHeader className="sm:pb-4">
     {/* Mobile Header */}
     <div className="sm:hidden">
      <DialogTitle className="text-lg">
       {mode === "edit" ? "Edit Lead" : mode === "view" ? "View Lead" : "New Lead"}
      </DialogTitle>
      <DialogDescription className="text-sm">
       {mode === "edit"
        ? "Update lead information and track progress"
        : mode === "view"
          ? "View lead information and history"
          : "Add a new lead to your pipeline"}
      </DialogDescription>
      {mode === "edit" && lead && (
       <div className="mt-2">
        <Badge className={getStageColor(lead.pipeline_stage || "new")}>
         {lead.pipeline_stage?.replace(/_/g, " ") || "New"}
        </Badge>
       </div>
      )}
     </div>

     {/* Desktop Header */}
     <div className="hidden sm:flex items-center justify-between">
      <div>
       <DialogTitle>{mode === "edit" ? "Edit Lead" : mode === "view" ? "View Lead" : "New Lead"}</DialogTitle>
       <DialogDescription>
        {mode === "edit"
         ? "Update lead information and track progress through the sales pipeline"
         : mode === "view"
           ? "View lead information and interaction history"
           : "Add a new lead to your sales pipeline"}
       </DialogDescription>
      </div>
      {mode === "edit" && lead && (
       <div className="flex items-center gap-2">
        <Badge className={getStageColor(lead.pipeline_stage || "new")}>
         {lead.pipeline_stage?.replace(/_/g, " ") || "New"}
        </Badge>
        {lead.pipeline_stage !== "converted" && lead.pipeline_stage !== "lost" && (
         <Button
          variant="outline"
          size="sm"
          onClick={handleConvertToCustomer}
          disabled={convert_mutation.isPending}
          className="text-green-600 border-green-600 hover:bg-green-50"
         >
          <ArrowRight className="h-4 w-4 mr-1" />
          Convert to Customer
         </Button>
        )}
       </div>
      )}
     </div>
    </DialogHeader>

    <Form {...form}>
     <form
      onSubmit={is_view_mode ? e => e.preventDefault() : form.handleSubmit(onSubmit)}
      className="space-y-6 sm:space-y-4"
     >
      <Tabs value={active_tab} onValueChange={set_active_tab}>
       {/* Mobile Tabs */}
       <TabsList className="grid w-full grid-cols-3 sm:hidden">
        <TabsTrigger value="details" className="text-xs">
         Details
        </TabsTrigger>
        <TabsTrigger value="pipeline" className="text-xs">
         Pipeline
        </TabsTrigger>
        <TabsTrigger value="interactions" className="text-xs">
         Interactions
        </TabsTrigger>
       </TabsList>

       {/* Desktop Tabs */}
       <TabsList className="hidden sm:grid w-full grid-cols-3">
        <TabsTrigger value="details">Lead Details & Vehicle Assignment</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline Management</TabsTrigger>
        <TabsTrigger value="interactions">Interactions</TabsTrigger>
       </TabsList>

       {/* Combined Lead Details & Vehicle Assignment Tab */}
       <TabsContent value="details" className="space-y-6">
        {/* Personal Information Card */}
        <Card>
         <CardHeader>
          <CardTitle className="flex items-center gap-2">
           <User className="h-5 w-5" />
           Personal Information
          </CardTitle>
         </CardHeader>
         <CardContent className="grid grid-cols-12 gap-6">
          {/* Left Column - Personal Information */}
          <div className="col-span-6 space-y-4">
           {/* Title */}
           <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Title</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={is_view_mode}>
               <FormControl>
                <SelectTrigger>
                 <SelectValue placeholder="None" />
                </SelectTrigger>
               </FormControl>
               <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="mr">Mr</SelectItem>
                <SelectItem value="mrs">Mrs</SelectItem>
                <SelectItem value="miss">Miss</SelectItem>
                <SelectItem value="ms">Ms</SelectItem>
                <SelectItem value="dr">Dr</SelectItem>
                <SelectItem value="prof">Prof</SelectItem>
               </SelectContent>
              </Select>
              <FormMessage />
             </FormItem>
            )}
           />

           {/* First Name */}
           <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
             <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl>
               <Input {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />

           {/* Last Name */}
           <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl>
               <Input {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />

           {/* Lead Source */}
           <FormField
            control={form.control}
            name="lead_source"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Lead Source *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={is_view_mode}>
               <FormControl>
                <SelectTrigger>
                 <SelectValue placeholder="Select source" />
                </SelectTrigger>
               </FormControl>
               <SelectContent>
                <SelectItem value="AutoTrader">AutoTrader</SelectItem>
                <SelectItem value="Facebook Marketplace">Facebook Marketplace</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
                <SelectItem value="Phone Inquiry">Phone Inquiry</SelectItem>
               </SelectContent>
              </Select>
              <FormMessage />
             </FormItem>
            )}
           />
          </div>

          {/* Right Column - Contact Information */}
          <div className="col-span-6 space-y-4">
           <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Contact Information</h3>
           </div>

           {/* Email Address */}
           <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
               <Input type="email" {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />

           {/* Primary Phone */}
           <FormField
            control={form.control}
            name="primary_phone"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Primary Phone</FormLabel>
              <FormControl>
               <Input {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />

           {/* Secondary Phone */}
           <FormField
            control={form.control}
            name="secondary_phone"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Secondary Phone</FormLabel>
              <FormControl>
               <Input {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />

           {/* Communication Consent */}
           <FormField
            control={form.control}
            name="marketing_communications"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Communication Consent</FormLabel>
              <div className="space-y-2">
               <div className="flex items-center space-x-2">
                <FormControl>
                 <input
                  type="checkbox"
                  id="marketing_communications"
                  checked={field.value}
                  onChange={e => field.onChange(e.target.checked)}
                  className="h-4 w-4 text-red-600"
                  disabled={is_view_mode}
                 />
                </FormControl>
                <FormLabel htmlFor="marketing_communications" className="text-sm font-normal">
                 Marketing Communications
                </FormLabel>
               </div>
              </div>
              <FormMessage />
             </FormItem>
            )}
           />
          </div>
         </CardContent>
        </Card>

        {/* Vehicle Assignment Card */}
        <Card>
         <CardHeader>
          <CardTitle className="flex items-center gap-2">
           <Car className="h-5 w-5" />
           Vehicle Assignment
          </CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
          {/* Stock Vehicle Registration Search */}
          <FormField
           control={form.control}
           name="assigned_vehicle_id"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Assign Stock Vehicle by Registration (Optional)</FormLabel>
             <div className="space-y-2">
              <FormControl>
               <div className="relative">
                <Input
                 placeholder="Search by registration number or stock number..."
                 value={vehicle_search_query}
                 onChange={e => set_vehicle_search_query(e.target.value)}
                 className="pr-10"
                 disabled={is_view_mode}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
               </div>
              </FormControl>

              {vehicle_search_query && filtered_vehicles.length > 0 && (
               <div className="border rounded-md max-h-48 overflow-y-auto bg-white shadow-sm">
                {filtered_vehicles.map(vehicle => (
                 <div
                  key={vehicle.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                   field.value === vehicle.id ? "bg-blue-50 border-blue-200" : ""
                  }`}
                  onClick={() => {
                   field.onChange(vehicle.id);
                   set_vehicle_search_query(vehicle.registration || vehicle.stock_number || "");
                  }}
                 >
                  <div className="flex justify-between items-start">
                   <div>
                    <div className="font-medium text-sm">
                     {vehicle.registration || "No registration"}
                     <span className="ml-2 text-xs text-gray-500">({vehicle.stock_number})</span>
                    </div>
                    <div className="text-xs text-gray-600">
                     {vehicle.make} {vehicle.model} {vehicle.derivative}
                    </div>
                    <div className="text-xs text-gray-500">
                     {vehicle.year} • {vehicle.colour} • {vehicle.mileage?.toLocaleString()} miles
                    </div>
                   </div>
                   {field.value === vehicle.id && <Check className="h-4 w-4 text-blue-600" />}
                  </div>
                 </div>
                ))}
               </div>
              )}

              {vehicle_search_query && filtered_vehicles.length === 0 && (
               <div className="text-sm text-gray-500 p-2 text-center">
                No vehicles found matching "{vehicle_search_query}"
               </div>
              )}

              {field.value && (
               <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border">
                <span className="text-sm text-blue-800">
                 Selected:{" "}
                 {stock_vehicles.find(v => v.id === field.value)?.registration ||
                  stock_vehicles.find(v => v.id === field.value)?.stock_number ||
                  "Unknown vehicle"}
                </span>
                {!is_view_mode && (
                 <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                   field.onChange(undefined);
                   set_vehicle_search_query("");
                  }}
                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                 >
                  <X className="h-3 w-3" />
                 </Button>
                )}
               </div>
              )}
             </div>
             <FormMessage />
            </FormItem>
           )}
          />

          {/* Vehicle Enquiry Notes */}
          <FormField
           control={form.control}
           name="vehicle_enquiry_notes"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Vehicle Enquiry Notes</FormLabel>
             <FormControl>
              <Textarea
               placeholder="Notes about customer's vehicle enquiry, specific requirements, or preferences..."
               className="min-h-[80px]"
               {...field}
               disabled={is_view_mode}
              />
             </FormControl>
             <FormMessage />
            </FormItem>
           )}
          />

          {/* Budget Range */}
          <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="budget_min"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Budget Min (£)</FormLabel>
              <FormControl>
               <Input type="number" placeholder="0" {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />

           <FormField
            control={form.control}
            name="budget_max"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Budget Max (£)</FormLabel>
              <FormControl>
               <Input type="number" placeholder="50000" {...field} disabled={is_view_mode} />
              </FormControl>
              <FormMessage />
             </FormItem>
            )}
           />
          </div>

          {/* Vehicle Interests */}
          <FormField
           control={form.control}
           name="vehicle_interests"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Vehicle Interests</FormLabel>
             <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
               {["Hatchback", "Estate", "Coupe", "MPV"].map(type => (
                <div key={type} className="flex items-center space-x-2">
                 <input
                  type="radio"
                  id={`vehicle_${type.toLowerCase()}`}
                  name="vehicle_interests"
                  checked={field.value === type}
                  onChange={() => field.onChange(type)}
                  className="h-4 w-4 text-red-600"
                  disabled={is_view_mode}
                 />
                 <FormLabel htmlFor={`vehicle_${type.toLowerCase()}`} className="text-sm font-normal">
                  {type}
                 </FormLabel>
                </div>
               ))}
              </div>
              <div className="space-y-2">
               {["SUV", "Convertible", "Sedan/Saloon", "Van"].map(type => (
                <div key={type} className="flex items-center space-x-2">
                 <input
                  type="radio"
                  id={`vehicle_${type.toLowerCase().replace("/", "_")}`}
                  name="vehicle_interests"
                  checked={field.value === type}
                  onChange={() => field.onChange(type)}
                  className="h-4 w-4 text-red-600"
                  disabled={is_view_mode}
                 />
                 <FormLabel
                  htmlFor={`vehicle_${type.toLowerCase().replace("/", "_")}`}
                  className="text-sm font-normal"
                 >
                  {type}
                 </FormLabel>
                </div>
               ))}
              </div>
             </div>
             <FormMessage />
            </FormItem>
           )}
          />
         </CardContent>
        </Card>

        {/* Part Exchange Details Card */}
        <Card>
         <CardHeader>
          <CardTitle className="flex items-center gap-2">
           <Repeat className="h-5 w-5" />
           Part Exchange Details
          </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
          {/* Part Exchange Toggle */}
          <FormField
           control={form.control}
           name="has_part_exchange"
           render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
             <div className="space-y-0.5">
              <FormLabel>Customer has part exchange vehicle</FormLabel>
              <div className="text-sm text-muted-foreground">
               Enable to capture part exchange vehicle details
              </div>
             </div>
             <FormControl>
              <input
               type="checkbox"
               checked={field.value}
               onChange={field.onChange}
               className="h-4 w-4 text-red-600"
               disabled={is_view_mode}
              />
             </FormControl>
            </FormItem>
           )}
          />

          {/* Part Exchange Details - Only show when toggled */}
          {form.watch("has_part_exchange") && (
           <div className="grid grid-cols-2 gap-4 pt-2">
            <FormField
             control={form.control}
             name="part_exchange_registration"
             render={({ field }) => (
              <FormItem>
               <FormLabel>Registration Number</FormLabel>
               <FormControl>
                <Input placeholder="e.g., AB12 XYZ" {...field} disabled={is_view_mode} />
               </FormControl>
               <FormMessage />
              </FormItem>
             )}
            />

            <FormField
             control={form.control}
             name="part_exchange_mileage"
             render={({ field }) => (
              <FormItem>
               <FormLabel>Mileage</FormLabel>
               <FormControl>
                <Input placeholder="e.g., 45,000" {...field} disabled={is_view_mode} />
               </FormControl>
               <FormMessage />
              </FormItem>
             )}
            />

            <FormField
             control={form.control}
             name="part_exchange_colour"
             render={({ field }) => (
              <FormItem>
               <FormLabel>Colour</FormLabel>
               <FormControl>
                <Input placeholder="e.g., Blue" {...field} disabled={is_view_mode} />
               </FormControl>
               <FormMessage />
              </FormItem>
             )}
            />

            <FormField
             control={form.control}
             name="part_exchange_damage"
             render={({ field }) => (
              <FormItem>
               <FormLabel>Damage/Condition Notes</FormLabel>
               <FormControl>
                <Input
                 placeholder="e.g., Minor scratches, excellent condition"
                 {...field}
                 disabled={is_view_mode}
                />
               </FormControl>
               <FormMessage />
              </FormItem>
             )}
            />
           </div>
          )}
         </CardContent>
        </Card>

        {/* Finance & Budget Preferences Card */}
        <Card>
         <CardHeader>
          <CardTitle className="flex items-center gap-2">
           <CreditCard className="h-5 w-5" />
           Finance & Budget Preferences
          </CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
          {/* Finance Preference Type */}
          <FormField
           control={form.control}
           name="finance_preference_type"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Finance Preference</FormLabel>
             <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
               {["HP", "PCP"].map(type => (
                <div key={type} className="flex items-center space-x-2">
                 <input
                  type="radio"
                  id={`finance_${type.toLowerCase()}`}
                  name="finance_preference_type"
                  checked={field.value === type}
                  onChange={() => field.onChange(type)}
                  className="h-4 w-4 text-red-600"
                  disabled={is_view_mode}
                 />
                 <FormLabel htmlFor={`finance_${type.toLowerCase()}`} className="text-sm font-normal">
                  {type === "HP" ? "Hire Purchase (HP)" : "Personal Contract Purchase (PCP)"}
                 </FormLabel>
                </div>
               ))}
              </div>
              <div className="space-y-2">
               {["Cash", "Combination"].map(type => (
                <div key={type} className="flex items-center space-x-2">
                 <input
                  type="radio"
                  id={`finance_${type.toLowerCase()}`}
                  name="finance_preference_type"
                  checked={field.value === type}
                  onChange={() => field.onChange(type)}
                  className="h-4 w-4 text-red-600"
                  disabled={is_view_mode}
                 />
                 <FormLabel htmlFor={`finance_${type.toLowerCase()}`} className="text-sm font-normal">
                  {type}
                 </FormLabel>
                </div>
               ))}
              </div>
             </div>
             <FormMessage />
            </FormItem>
           )}
          />

          {/* Finance Required */}
          <FormField
           control={form.control}
           name="finance_required"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Finance Required</FormLabel>
             <div className="flex items-center space-x-2">
              <FormControl>
               <input
                type="checkbox"
                id="finance_required"
                checked={field.value}
                onChange={e => field.onChange(e.target.checked)}
                className="h-4 w-4 text-red-600"
                disabled={is_view_mode}
               />
              </FormControl>
              <FormLabel htmlFor="finance_required" className="text-sm font-normal">
               Customer requires finance assistance
              </FormLabel>
             </div>
             <FormMessage />
            </FormItem>
           )}
          />

          {/* Additional Notes */}
          <FormField
           control={form.control}
           name="notes"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Additional Notes</FormLabel>
             <FormControl>
              <Textarea
               placeholder="Any additional notes or requirements..."
               className="min-h-[80px]"
               {...field}
               disabled={is_view_mode}
              />
             </FormControl>
             <FormMessage />
            </FormItem>
           )}
          />
         </CardContent>
        </Card>
       </TabsContent>

       {/* Pipeline Management Tab */}
       <TabsContent value="pipeline" className="space-y-6">
        <Card>
         <CardHeader>
          <CardTitle>Sales Pipeline Management</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="pipeline_stage"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Pipeline Stage</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={is_view_mode}>
               <FormControl>
                <SelectTrigger>
                 <SelectValue placeholder="Select stage" />
                </SelectTrigger>
               </FormControl>
               <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="test_drive_booked">Test Drive Booked</SelectItem>
                <SelectItem value="test_drive_completed">Test Drive Completed</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="deposit_taken">Deposit Taken</SelectItem>
                <SelectItem value="finance_pending">Finance Pending</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
               </SelectContent>
              </Select>
              <FormMessage />
             </FormItem>
            )}
           />

           <FormField
            control={form.control}
            name="lead_quality"
            render={({ field }) => (
             <FormItem>
              <FormLabel>Lead Quality</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={is_view_mode}>
               <FormControl>
                <SelectTrigger>
                 <SelectValue placeholder="Select quality" />
                </SelectTrigger>
               </FormControl>
               <SelectContent>
                <SelectItem value="unqualified">Unqualified</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
               </SelectContent>
              </Select>
              <FormMessage />
             </FormItem>
            )}
           />
          </div>

          <FormField
           control={form.control}
           name="priority"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Priority</FormLabel>
             <Select onValueChange={field.onChange} value={field.value} disabled={is_view_mode}>
              <FormControl>
               <SelectTrigger>
                <SelectValue placeholder="Select priority" />
               </SelectTrigger>
              </FormControl>
              <SelectContent>
               <SelectItem value="low">Low</SelectItem>
               <SelectItem value="medium">Medium</SelectItem>
               <SelectItem value="high">High</SelectItem>
               <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
             </Select>
             <FormMessage />
            </FormItem>
           )}
          />
         </CardContent>
        </Card>
       </TabsContent>

       {/* Interactions Tab */}
       <TabsContent value="interactions" className="space-y-6">
        <SimpleInteractionsManager
         leadId={lead?.id}
         mode={mode}
         onInteractionProgress={set_is_interaction_in_progress}
        />
       </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
       <Button type="button" variant="outline" onClick={onClose} disabled={lead_mutation.isPending}>
        Cancel
       </Button>
       {!is_view_mode && (
        <Button type="submit" disabled={lead_mutation.isPending} className="bg-red-600 hover:bg-red-700">
         {lead_mutation.isPending
          ? mode === "edit"
            ? "Updating..."
            : "Creating..."
          : mode === "edit"
            ? "Update Lead"
            : "Create Lead"}
        </Button>
       )}
      </div>
     </form>
    </Form>
   </DialogContent>
  </Dialog>
 );
}
