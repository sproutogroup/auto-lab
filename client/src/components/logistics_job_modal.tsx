import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Calendar,
  MapPin,
  Users,
  Car,
  Search,
  CheckCircle,
  FileText,
  Settings,
  Phone,
  Clock,
  CreditCard,
  StickyNote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertJobSchema, InsertJob, Job } from "@/../../shared/schema";

interface LogisticsJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: Job | null;
  mode: "create" | "edit" | "view";
  selectedDate?: Date | null;
}

export default function LogisticsJobModal({
  isOpen,
  onClose,
  job,
  mode,
  selectedDate,
}: LogisticsJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  // Query for vehicles data
  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isOpen,
  });

  // Query for users (staff) data
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Query for customers data
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isOpen,
  });

  // Filter vehicles based on search
  const filteredVehicles = Array.isArray(vehicles)
    ? vehicles.filter(
        (vehicle) =>
          vehicle.registration
            ?.toLowerCase()
            .includes(vehicleSearch.toLowerCase()) ||
          vehicle.stock_number
            ?.toLowerCase()
            .includes(vehicleSearch.toLowerCase()),
      ) || []
    : [];

  const getDefaultValues = () => ({
    job_type: job?.job_type || "delivery",
    job_category: job?.job_category || "logistics",
    job_priority: job?.job_priority || "medium",
    job_status: job?.job_status || "pending",
    vehicle_id: job?.vehicle_id || null,
    customer_id: job?.customer_id || null,
    lead_id: job?.lead_id || null,
    assigned_to_id: job?.assigned_to_id || null,
    created_by_id: 1,
    scheduled_date: job?.scheduled_date || selectedDate || new Date(),
    estimated_duration_hours: job?.estimated_duration_hours || null,
    address_line_1: job?.address_line_1 || "",
    address_line_2: job?.address_line_2 || "",
    city: job?.city || "",
    county: job?.county || "",
    postcode: job?.postcode || "",
    contact_name: job?.contact_name || "",
    contact_phone: job?.contact_phone || "",
    estimated_cost: job?.estimated_cost || null,
    actual_cost: job?.actual_cost || null,
    hourly_rate: job?.hourly_rate || null,
    material_costs: job?.material_costs || null,
    external_costs: job?.external_costs || null,
    total_cost: job?.total_cost || null,
    external_reference: job?.external_reference || "",
    quality_check_required: job?.quality_check_required || false,
    quality_check_completed: job?.quality_check_completed || false,
    completion_notes: job?.completion_notes || "",
    issues_encountered: job?.issues_encountered || "",
    notes: job?.notes || "",
  });

  const form = useForm<any>({
    defaultValues: getDefaultValues(),
  });

  const createJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
      toast({
        title: "Success",
        description: "Job created successfully",
      });
      // Reset form after successful creation
      form.reset(getDefaultValues());
      setSelectedVehicle(null);
      setVehicleSearch("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/jobs/${job?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
      toast({
        title: "Success",
        description: "Job updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update job",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (selectedVehicle) {
      data.vehicle_id = selectedVehicle.id;
    }

    if (isEditMode) {
      updateJobMutation.mutate(data);
    } else {
      createJobMutation.mutate(data);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (job) {
        // Editing existing job
        const formData: any = {
          job_type: job.job_type || "delivery",
          job_category: job.job_category || "logistics",
          job_priority: job.job_priority || "medium",
          job_status: job.job_status || "pending",
          vehicle_id: job.vehicle_id || null,
          customer_id: job.customer_id || null,
          lead_id: job.lead_id || null,
          assigned_to_id: job.assigned_to_id || null,
          created_by_id: job.created_by_id || 1,
          scheduled_date: job.scheduled_date || new Date(),
          estimated_duration_hours: job.estimated_duration_hours || null,
          address_line_1: job.address_line_1 || "",
          address_line_2: job.address_line_2 || "",
          city: job.city || "",
          county: job.county || "",
          postcode: job.postcode || "",
          contact_name: job.contact_name || "",
          contact_phone: job.contact_phone || "",
          estimated_cost: job.estimated_cost || null,
          actual_cost: job.actual_cost || null,
          hourly_rate: job.hourly_rate || null,
          material_costs: job.material_costs || null,
          external_costs: job.external_costs || null,
          total_cost: job.total_cost || null,
          external_reference: job.external_reference || "",
          quality_check_required: job.quality_check_required || false,
          quality_check_completed: job.quality_check_completed || false,
          completion_notes: job.completion_notes || "",
          issues_encountered: job.issues_encountered || "",
          notes: job.notes || "",
        };

        Object.keys(formData).forEach((key) => {
          form.setValue(key as any, formData[key]);
        });

        // Set selected vehicle if job has one
        if (job.vehicle_id && Array.isArray(vehicles)) {
          const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
          if (vehicle) {
            setSelectedVehicle(vehicle);
            setVehicleSearch(
              `${vehicle.registration} - ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            );
          }
        }
      } else {
        // Creating new job - reset form with fresh defaults including selected date
        form.reset(getDefaultValues());
        setSelectedVehicle(null);
        setVehicleSearch("");
      }
    }
  }, [job, isOpen, form, vehicles, selectedDate]);

  const handleVehicleSelect = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setVehicleSearch(
      `${vehicle.registration} - ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    );
    form.setValue("vehicle_id", vehicle.id);
  };

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
    critical: "bg-purple-100 text-purple-800",
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    on_hold: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-gray-50 to-white">
        <DialogHeader className="pb-6 border-b border-gray-200">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {mode === "create"
                    ? "Schedule New Job"
                    : mode === "edit"
                      ? "Edit Job"
                      : "View Job"}
                </h2>
              </div>
            </div>
            {job && (
              <div className="flex items-center gap-2">
                <Badge
                  className={`${priorityColors[job.job_priority as keyof typeof priorityColors]} px-3 py-1 text-xs font-semibold`}
                >
                  {job.job_priority?.toUpperCase()}
                </Badge>
                <Badge
                  className={`${statusColors[job.job_status as keyof typeof statusColors]} px-3 py-1 text-xs font-semibold`}
                >
                  {job.job_status?.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {mode === "create"
              ? "Create a new logistics job with detailed information"
              : mode === "edit"
                ? "Update job details and assignments"
                : "Review job information"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Job Details Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <Settings className="h-4 w-4 text-red-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Job Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Job Type */}
                      <FormField
                        control={form.control}
                        name="job_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Job Type
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger className="border-gray-200 focus:border-red-400 focus:ring-red-400">
                                  <SelectValue placeholder="Select job type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="delivery">
                                  Delivery
                                </SelectItem>
                                <SelectItem value="collection">
                                  Collection
                                </SelectItem>
                                <SelectItem value="valuation">
                                  Valuation
                                </SelectItem>
                                <SelectItem value="inspection">
                                  Inspection
                                </SelectItem>
                                <SelectItem value="repair">Repair</SelectItem>
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="mot">MOT</SelectItem>
                                <SelectItem value="preparation">
                                  Preparation
                                </SelectItem>
                                <SelectItem value="photography">
                                  Photography
                                </SelectItem>
                                <SelectItem value="transport">
                                  Transport
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        {/* Job Priority */}
                        <FormField
                          control={form.control}
                          name="job_priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Priority
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isViewMode}
                              >
                                <FormControl>
                                  <SelectTrigger className="border-gray-200 focus:border-red-400 focus:ring-red-400">
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                  <SelectItem value="critical">
                                    Critical
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Job Status */}
                        <FormField
                          control={form.control}
                          name="job_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                Status
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={isViewMode}
                              >
                                <FormControl>
                                  <SelectTrigger className="border-gray-200 focus:border-red-400 focus:ring-red-400">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    Pending
                                  </SelectItem>
                                  <SelectItem value="assigned">
                                    Assigned
                                  </SelectItem>
                                  <SelectItem value="in_progress">
                                    In Progress
                                  </SelectItem>
                                  <SelectItem value="on_hold">
                                    On Hold
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    Completed
                                  </SelectItem>
                                  <SelectItem value="cancelled">
                                    Cancelled
                                  </SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Selection Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Car className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Vehicle Selection
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by registration or stock number..."
                          value={vehicleSearch}
                          onChange={(e) => setVehicleSearch(e.target.value)}
                          className="pl-10 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                          disabled={isViewMode}
                        />

                        {selectedVehicle && (
                          <div className="absolute right-3 top-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                      </div>

                      {vehicleSearch && !isViewMode && (
                        <div className="max-h-48 overflow-y-auto border rounded-lg bg-white shadow-sm">
                          {filteredVehicles.length > 0 ? (
                            filteredVehicles.map((vehicle: any) => (
                              <div
                                key={vehicle.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
                                onClick={() => handleVehicleSelect(vehicle)}
                              >
                                <div>
                                  <div className="font-medium">
                                    {vehicle.registration} - {vehicle.year}{" "}
                                    {vehicle.make} {vehicle.model}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Stock: {vehicle.stock_number} |{" "}
                                    {vehicle.department}
                                  </div>
                                </div>
                                {selectedVehicle?.id === vehicle.id && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-gray-500 text-center">
                              No vehicles found matching your search
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Location
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Address Line 1 */}
                      <FormField
                        control={form.control}
                        name="address_line_1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Address Line 1
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="House number and street name"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-green-400 focus:ring-green-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Address Line 2 */}
                      <FormField
                        control={form.control}
                        name="address_line_2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Address Line 2
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Flat, building, district (optional)"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-green-400 focus:ring-green-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* City and County */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">
                                City/Town
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter city or town"
                                  disabled={isViewMode}
                                  className="border-gray-200 focus:border-green-400 focus:ring-green-400"
                                  {...field}
                                />
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
                              <FormLabel className="text-sm font-medium text-gray-700">
                                County
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter county"
                                  disabled={isViewMode}
                                  className="border-gray-200 focus:border-green-400 focus:ring-green-400"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Postcode */}
                      <FormField
                        control={form.control}
                        name="postcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Postcode
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. SW1A 1AA"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-green-400 focus:ring-green-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Contact Information Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Phone className="h-4 w-4 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Contact Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Contact Name */}
                      <FormField
                        control={form.control}
                        name="contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Contact Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Contact person name"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Contact Phone */}
                      <FormField
                        control={form.control}
                        name="contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Contact Phone
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Phone number"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-purple-400 focus:ring-purple-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Timing & Duration Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Timing & Duration
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Scheduled Date */}
                      <FormField
                        control={form.control}
                        name="scheduled_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Scheduled Date
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                {...field}
                                value={
                                  field.value
                                    ? (() => {
                                        const date = new Date(field.value);
                                        const year = date.getFullYear();
                                        const month = String(
                                          date.getMonth() + 1,
                                        ).padStart(2, "0");
                                        const day = String(
                                          date.getDate(),
                                        ).padStart(2, "0");
                                        return `${year}-${month}-${day}`;
                                      })()
                                    : ""
                                }
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const [year, month, day] =
                                      e.target.value.split("-");
                                    const date = new Date(
                                      parseInt(year),
                                      parseInt(month) - 1,
                                      parseInt(day),
                                    );
                                    field.onChange(date);
                                  } else {
                                    field.onChange(null);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Estimated Duration */}
                      <FormField
                        control={form.control}
                        name="estimated_duration_hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Estimated Duration (hours)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Hours"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Cost Information Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Cost Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Estimated Cost */}
                      <FormField
                        control={form.control}
                        name="estimated_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Estimated Cost (£)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Actual Cost */}
                      <FormField
                        control={form.control}
                        name="actual_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Actual Cost (£)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Hourly Rate */}
                      <FormField
                        control={form.control}
                        name="hourly_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Hourly Rate (£)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Material Costs */}
                      <FormField
                        control={form.control}
                        name="material_costs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Material Costs (£)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* External Costs */}
                      <FormField
                        control={form.control}
                        name="external_costs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              External Costs (£)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Total Cost */}
                      <FormField
                        control={form.control}
                        name="total_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Total Cost (£)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                disabled={isViewMode}
                                className="border-gray-200 focus:border-yellow-400 focus:ring-yellow-400"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseFloat(e.target.value)
                                      : null,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Assignment Card */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Users className="h-4 w-4 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Assignment
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Assigned To */}
                      <FormField
                        control={form.control}
                        name="assigned_to_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Assigned To
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value ? parseInt(value) : null)
                              }
                              value={field.value ? field.value.toString() : ""}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger className="border-gray-200 focus:border-indigo-400 focus:ring-indigo-400">
                                  <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.isArray(users) &&
                                  users.map((user: any) => (
                                    <SelectItem
                                      key={user.id}
                                      value={user.id.toString()}
                                    >
                                      {user.username}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Customer */}
                      <FormField
                        control={form.control}
                        name="customer_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Customer
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value ? parseInt(value) : null)
                              }
                              value={field.value ? field.value.toString() : ""}
                              disabled={isViewMode}
                            >
                              <FormControl>
                                <SelectTrigger className="border-gray-200 focus:border-indigo-400 focus:ring-indigo-400">
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.isArray(customers) &&
                                  customers.map((customer: any) => (
                                    <SelectItem
                                      key={customer.id}
                                      value={customer.id.toString()}
                                    >
                                      {customer.first_name} {customer.last_name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section - Full Width */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <StickyNote className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Additional Notes
                  </h3>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional notes or instructions..."
                          disabled={isViewMode}
                          rows={4}
                          className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Action Buttons */}
              {!isViewMode && (
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={
                      createJobMutation.isPending || updateJobMutation.isPending
                    }
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createJobMutation.isPending || updateJobMutation.isPending
                    }
                    className="bg-red-600 hover:bg-red-700 px-6"
                  >
                    {createJobMutation.isPending || updateJobMutation.isPending
                      ? "Saving..."
                      : isEditMode
                        ? "Update Job"
                        : "Create Job"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
