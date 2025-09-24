import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarIcon,
  Car,
  User,
  ArrowRight,
  Phone,
  Mail,
  Repeat,
  CreditCard,
  Search,
  X,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  Lead,
  Vehicle,
  Interaction,
  InsertInteraction,
} from "@shared/schema";

const leadFormSchema = z.object({
  title: z.string().default("none"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  primary_phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  customer_status: z.string().default("prospect"),
  credit_rating: z.string().optional(),
  finance_preference: z.string().optional(),
  marketing_communications: z.boolean().default(false),
  email_communications: z.boolean().default(false),
  phone_communications: z.boolean().default(false),

  // Vehicle preferences and assignment
  assigned_vehicle_id: z.number().optional(),
  vehicle_interests: z.string().optional(),
  budget_min: z.union([z.string(), z.number()]).optional(),
  budget_max: z.union([z.string(), z.number()]).optional(),
  finance_required: z.boolean().default(false),
  trade_in_vehicle: z.string().optional(),
  trade_in_value: z.union([z.string(), z.number()]).optional(),
  vehicle_enquiry_notes: z.string().optional(),
  has_part_exchange: z.boolean().default(false),
  part_exchange_registration: z.string().optional(),
  part_exchange_mileage: z.string().optional(),
  part_exchange_damage: z.string().optional(),
  part_exchange_colour: z.string().optional(),
  finance_preference_type: z.string().optional(),

  // Lead pipeline
  lead_source: z.string().min(1, "Lead source is required"),
  pipeline_stage: z.string().default("new"),
  lead_quality: z.string().default("unqualified"),
  priority: z.string().default("medium"),

  // Assignment and tracking
  assigned_salesperson_id: z.number().optional(),
  lost_reason: z.string().optional(),

  // Interaction tracking
  last_contact_date: z.string().optional(),
  next_follow_up_date: z.string().optional(),
  contact_attempts: z.union([z.string(), z.number()]).default("0"),

  // Notes
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  marketing_consent: z.boolean().default(false),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead;
  mode: "add" | "edit" | "view";
}

export default function Lead_Modal({
  isOpen,
  onClose,
  lead,
  mode,
}: LeadModalProps) {
  const isViewMode = mode === "view";
  const [activeTab, setActiveTab] = useState("details");
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [showNewInteraction, setShowNewInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    interaction_type: "",
    interaction_direction: "",
    interaction_outcome: "",
    interaction_subject: "",
    interaction_notes: "",
    follow_up_required: false,
    follow_up_date: "",
    follow_up_priority: "medium",
    follow_up_notes: "",
    duration_minutes: undefined as number | undefined,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch vehicles for assignment
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  // Fetch interactions for this lead
  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: [`/api/leads/${lead?.id}/interactions`],
    enabled: !!lead?.id && mode === "edit",
  });

  // Filter stock vehicles for assignment
  const stockVehicles = vehicles.filter(
    (vehicle) => vehicle.sales_status?.toLowerCase() === "stock",
  );

  // Filter vehicles based on search query
  const filteredVehicles =
    vehicleSearchQuery.length > 0
      ? stockVehicles.filter(
          (vehicle) =>
            vehicle.registration
              ?.toLowerCase()
              .includes(vehicleSearchQuery.toLowerCase()) ||
            vehicle.stock_number
              ?.toLowerCase()
              .includes(vehicleSearchQuery.toLowerCase()),
        )
      : [];

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      title: "none",
      first_name: "",
      last_name: "",
      email: "",
      primary_phone: "",
      secondary_phone: "",
      customer_status: "prospect",
      credit_rating: "Unknown",
      finance_preference: "Unknown",
      marketing_communications: false,
      email_communications: false,
      phone_communications: false,
      assigned_vehicle_id: undefined,
      vehicle_interests: "",
      budget_min: "",
      budget_max: "",
      finance_required: false,
      trade_in_vehicle: "",
      trade_in_value: "",
      vehicle_enquiry_notes: "",
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
      assigned_salesperson_id: undefined,
      lost_reason: "",
      last_contact_date: "",
      next_follow_up_date: "",
      contact_attempts: "0",
      notes: "",
      internal_notes: "",
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
          customer_status: "prospect",
          credit_rating: "Unknown",
          finance_preference: "Unknown",
          marketing_communications: lead.marketing_consent || false,
          email_communications: false,
          phone_communications: false,
          assigned_vehicle_id: lead.assigned_vehicle_id || undefined,
          vehicle_interests: lead.vehicle_interests || "",
          budget_min: lead.budget_min ? lead.budget_min.toString() : "",
          budget_max: lead.budget_max ? lead.budget_max.toString() : "",
          finance_required: lead.finance_required || false,
          trade_in_vehicle: lead.trade_in_vehicle || "",
          trade_in_value: lead.trade_in_value
            ? lead.trade_in_value.toString()
            : "",
          vehicle_enquiry_notes: lead.notes || "",
          has_part_exchange: false,
          part_exchange_registration: "",
          part_exchange_mileage: "",
          part_exchange_damage: "",
          part_exchange_colour: "",
          finance_preference_type: "",
          lead_source: lead.lead_source || "",
          pipeline_stage: lead.pipeline_stage || "new",
          lead_quality: lead.lead_quality || "unqualified",
          priority: lead.priority || "medium",
          assigned_salesperson_id: lead.assigned_salesperson_id || undefined,
          lost_reason: lead.lost_reason || "",
          last_contact_date: lead.last_contact_date
            ? format(new Date(lead.last_contact_date), "yyyy-MM-dd")
            : "",
          next_follow_up_date: lead.next_follow_up_date
            ? format(new Date(lead.next_follow_up_date), "yyyy-MM-dd")
            : "",
          contact_attempts: (lead.contact_attempts || 0).toString(),
          notes: lead.notes || "",
          internal_notes: lead.internal_notes || "",
          marketing_consent: lead.marketing_consent || false,
        });
      } else if (mode === "add") {
        // Fresh form for new lead - reset all fields to defaults
        form.reset({
          title: "none",
          first_name: "",
          last_name: "",
          email: "",
          primary_phone: "",
          secondary_phone: "",
          customer_status: "prospect",
          credit_rating: "Unknown",
          finance_preference: "Unknown",
          marketing_communications: false,
          email_communications: false,
          phone_communications: false,
          assigned_vehicle_id: undefined,
          vehicle_interests: "",
          budget_min: "",
          budget_max: "",
          finance_required: false,
          trade_in_vehicle: "",
          trade_in_value: "",
          vehicle_enquiry_notes: "",
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
          assigned_salesperson_id: undefined,
          lost_reason: "",
          last_contact_date: "",
          next_follow_up_date: "",
          contact_attempts: "0",
          notes: "",
          internal_notes: "",
          marketing_consent: false,
        });
      }
      // Reset vehicle search when modal opens
      setVehicleSearchQuery("");
    }
  }, [isOpen, lead, mode, form]);

  // Create/Update lead mutation
  const leadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      const url = mode === "edit" ? `/api/leads/${lead?.id}` : "/api/leads";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${mode === "edit" ? "update" : "create"} lead`,
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({
        title: "Success",
        description: `Lead ${mode === "edit" ? "updated" : "created"} successfully`,
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
    leadMutation.mutate(data);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "qualified":
        return "bg-green-100 text-green-800";
      case "test_drive_booked":
        return "bg-purple-100 text-purple-800";
      case "test_drive_completed":
        return "bg-indigo-100 text-indigo-800";
      case "negotiating":
        return "bg-orange-100 text-orange-800";
      case "deposit_taken":
        return "bg-emerald-100 text-emerald-800";
      case "finance_pending":
        return "bg-cyan-100 text-cyan-800";
      case "converted":
        return "bg-green-500 text-white";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {mode === "edit"
                  ? "Edit Lead"
                  : mode === "view"
                    ? "View Lead"
                    : "New Lead"}
              </DialogTitle>
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
              </div>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={
              isViewMode
                ? (e) => e.preventDefault()
                : form.handleSubmit(onSubmit)
            }
            className="space-y-6"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">
                  Lead Details & Vehicle Assignment
                </TabsTrigger>
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
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isViewMode}
                            >
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
                              <Input {...field} disabled={isViewMode} />
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
                              <Input {...field} disabled={isViewMode} />
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
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="AutoTrader">
                                  AutoTrader
                                </SelectItem>
                                <SelectItem value="Facebook Marketplace">
                                  Facebook Marketplace
                                </SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                                <SelectItem value="Walk-in">Walk-in</SelectItem>
                                <SelectItem value="Referral">
                                  Referral
                                </SelectItem>
                                <SelectItem value="Phone Inquiry">
                                  Phone Inquiry
                                </SelectItem>
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
                        <h3 className="text-sm font-medium text-gray-700">
                          Contact Information
                        </h3>
                      </div>

                      {/* Email Address */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                {...field}
                                disabled={isViewMode}
                              />
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
                              <Input {...field} disabled={isViewMode} />
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
                              <Input {...field} disabled={isViewMode} />
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
                                    onChange={(e) =>
                                      field.onChange(e.target.checked)
                                    }
                                    className="h-4 w-4 text-red-600"
                                    disabled={isViewMode}
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor="marketing_communications"
                                  className="text-sm font-normal"
                                >
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
                          <FormLabel>
                            Assign Stock Vehicle by Registration (Optional)
                          </FormLabel>
                          <div className="space-y-2">
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Search by registration number or stock number..."
                                  value={vehicleSearchQuery}
                                  onChange={(e) =>
                                    setVehicleSearchQuery(e.target.value)
                                  }
                                  className="pr-10"
                                  disabled={isViewMode}
                                />
                                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              </div>
                            </FormControl>

                            {vehicleSearchQuery &&
                              filteredVehicles.length > 0 && (
                                <div className="border rounded-md max-h-48 overflow-y-auto bg-white shadow-sm">
                                  {filteredVehicles.map((vehicle) => (
                                    <div
                                      key={vehicle.id}
                                      className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                                        field.value === vehicle.id
                                          ? "bg-blue-50 border-blue-200"
                                          : ""
                                      }`}
                                      onClick={() => {
                                        field.onChange(vehicle.id);
                                        setVehicleSearchQuery(
                                          vehicle.registration ||
                                            vehicle.stock_number ||
                                            "",
                                        );
                                      }}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium text-sm">
                                            {vehicle.registration ||
                                              "No registration"}
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({vehicle.stock_number})
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            {vehicle.make} {vehicle.model}{" "}
                                            {vehicle.derivative}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {vehicle.year} • {vehicle.colour} •{" "}
                                            {vehicle.mileage?.toLocaleString()}{" "}
                                            miles
                                          </div>
                                        </div>
                                        {field.value === vehicle.id && (
                                          <Check className="h-4 w-4 text-blue-600" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                            {vehicleSearchQuery &&
                              filteredVehicles.length === 0 && (
                                <div className="text-sm text-gray-500 p-2 text-center">
                                  No vehicles found matching "
                                  {vehicleSearchQuery}"
                                </div>
                              )}

                            {field.value && (
                              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border">
                                <span className="text-sm text-blue-800">
                                  Selected:{" "}
                                  {stockVehicles.find(
                                    (v) => v.id === field.value,
                                  )?.registration ||
                                    stockVehicles.find(
                                      (v) => v.id === field.value,
                                    )?.stock_number ||
                                    "Unknown vehicle"}
                                </span>
                                {!isViewMode && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      field.onChange(undefined);
                                      setVehicleSearchQuery("");
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
                              disabled={isViewMode}
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
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                disabled={isViewMode}
                              />
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
                              <Input
                                type="number"
                                placeholder="50000"
                                {...field}
                                disabled={isViewMode}
                              />
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
                              {["Hatchback", "Estate", "Coupe", "MPV"].map(
                                (type) => (
                                  <div
                                    key={type}
                                    className="flex items-center space-x-2"
                                  >
                                    <input
                                      type="radio"
                                      id={`vehicle_${type.toLowerCase()}`}
                                      name="vehicle_interests"
                                      checked={field.value === type}
                                      onChange={() => field.onChange(type)}
                                      className="h-4 w-4 text-red-600"
                                      disabled={isViewMode}
                                    />
                                    <FormLabel
                                      htmlFor={`vehicle_${type.toLowerCase()}`}
                                      className="text-sm font-normal"
                                    >
                                      {type}
                                    </FormLabel>
                                  </div>
                                ),
                              )}
                            </div>
                            <div className="space-y-2">
                              {[
                                "SUV",
                                "Convertible",
                                "Sedan/Saloon",
                                "Van",
                              ].map((type) => (
                                <div
                                  key={type}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="radio"
                                    id={`vehicle_${type.toLowerCase().replace("/", "_")}`}
                                    name="vehicle_interests"
                                    checked={field.value === type}
                                    onChange={() => field.onChange(type)}
                                    className="h-4 w-4 text-red-600"
                                    disabled={isViewMode}
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
                              disabled={isViewMode}
                            />
                          </FormControl>
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
                            <FormLabel>
                              Customer has part exchange vehicle
                            </FormLabel>
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
                              disabled={isViewMode}
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
                                <Input
                                  placeholder="e.g., AB12 XYZ"
                                  {...field}
                                  disabled={isViewMode}
                                />
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
                                <Input
                                  placeholder="e.g., 45,000"
                                  {...field}
                                  disabled={isViewMode}
                                />
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
                                <Input
                                  placeholder="e.g., Blue"
                                  {...field}
                                  disabled={isViewMode}
                                />
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
                                  disabled={isViewMode}
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
                              {["HP", "PCP"].map((type) => (
                                <div
                                  key={type}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="radio"
                                    id={`finance_${type.toLowerCase()}`}
                                    name="finance_preference_type"
                                    checked={field.value === type}
                                    onChange={() => field.onChange(type)}
                                    className="h-4 w-4 text-red-600"
                                    disabled={isViewMode}
                                  />
                                  <FormLabel
                                    htmlFor={`finance_${type.toLowerCase()}`}
                                    className="text-sm font-normal"
                                  >
                                    {type === "HP"
                                      ? "Hire Purchase (HP)"
                                      : "Personal Contract Purchase (PCP)"}
                                  </FormLabel>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-2">
                              {["Cash", "Combination"].map((type) => (
                                <div
                                  key={type}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="radio"
                                    id={`finance_${type.toLowerCase()}`}
                                    name="finance_preference_type"
                                    checked={field.value === type}
                                    onChange={() => field.onChange(type)}
                                    className="h-4 w-4 text-red-600"
                                    disabled={isViewMode}
                                  />
                                  <FormLabel
                                    htmlFor={`finance_${type.toLowerCase()}`}
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
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">
                                  Contacted
                                </SelectItem>
                                <SelectItem value="qualified">
                                  Qualified
                                </SelectItem>
                                <SelectItem value="test_drive_booked">
                                  Test Drive Booked
                                </SelectItem>
                                <SelectItem value="test_drive_completed">
                                  Test Drive Completed
                                </SelectItem>
                                <SelectItem value="negotiating">
                                  Negotiating
                                </SelectItem>
                                <SelectItem value="deposit_taken">
                                  Deposit Taken
                                </SelectItem>
                                <SelectItem value="finance_pending">
                                  Finance Pending
                                </SelectItem>
                                <SelectItem value="converted">
                                  Converted
                                </SelectItem>
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
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select quality" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unqualified">
                                  Unqualified
                                </SelectItem>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                                <SelectItem value="hot">Hot</SelectItem>
                                <SelectItem value="qualified">
                                  Qualified
                                </SelectItem>
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
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isViewMode}
                          >
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
                <Card>
                  <CardHeader>
                    <CardTitle>Interaction History</CardTitle>
                    <CardDescription>
                      Track all communications and follow-ups with this lead
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      Interaction system available for existing leads
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={leadMutation.isPending}
              >
                Cancel
              </Button>
              {!isViewMode && (
                <Button
                  type="submit"
                  disabled={leadMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {leadMutation.isPending
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
