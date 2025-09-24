import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Car,
  Phone,
  Mail,
  FileText,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Lead, Vehicle } from "../../../shared/schema";

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment;
  selectedDate?: Date;
  selectedTime?: string;
}

export default function AppointmentModal({
  isOpen,
  onClose,
  appointment,
  selectedDate,
  selectedTime,
}: AppointmentModalProps) {
  const [formData, setFormData] = useState({
    lead_id: "",
    vehicle_id: "",
    appointment_date: selectedDate
      ? selectedDate.toISOString().split("T")[0]
      : "",
    appointment_time: selectedTime || "09:00",
    appointment_type: "viewing",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    notes: "",
    duration_minutes: 60,
    assigned_to_id: 1, // Default system user
  });

  const [customerSource, setCustomerSource] = useState<"lead" | "manual">(
    "lead",
  );
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leads for customer selection
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    enabled: isOpen,
  });

  // Fetch vehicles for optional assignment
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: isOpen,
  });

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.stock_number
        ?.toLowerCase()
        .includes(vehicleSearch.toLowerCase()) ||
      vehicle.registration
        ?.toLowerCase()
        .includes(vehicleSearch.toLowerCase()) ||
      `${vehicle.year} ${vehicle.make} ${vehicle.model}`
        .toLowerCase()
        .includes(vehicleSearch.toLowerCase()),
  );

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to create appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/month"] });
      toast({
        title: "Success",
        description: "Appointment booked successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to book appointment",
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/appointments/${appointment?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to update appointment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/month"] });
      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    },
  });

  // Initialize form data when appointment is provided for editing
  useEffect(() => {
    if (appointment) {
      setFormData({
        lead_id: appointment.lead_id?.toString() || "",
        vehicle_id: appointment.vehicle_id?.toString() || "",
        appointment_date: appointment.appointment_date
          ? new Date(appointment.appointment_date).toISOString().split("T")[0]
          : "",
        appointment_time: appointment.appointment_time || "09:00",
        appointment_type: appointment.appointment_type || "viewing",
        customer_name: appointment.customer_name || "",
        customer_phone: appointment.customer_phone || "",
        customer_email: appointment.customer_email || "",
        notes: appointment.notes || "",
        duration_minutes: appointment.duration_minutes || 60,
        assigned_to_id: appointment.assigned_to_id || 1,
      });

      if (appointment.lead_id) {
        setCustomerSource("lead");
        const lead = leads.find((l) => l.id === appointment.lead_id);
        if (lead) setSelectedLead(lead);
      } else {
        setCustomerSource("manual");
      }
    } else if (selectedDate) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const localDateString = `${year}-${month}-${day}`;

      setFormData((prev) => ({
        ...prev,
        appointment_date: localDateString,
        appointment_time: selectedTime || "09:00",
      }));
    }
  }, [appointment, selectedDate, selectedTime, leads]);

  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find((l) => l.id.toString() === leadId);
    if (lead) {
      setSelectedLead(lead);
      setFormData((prev) => ({
        ...prev,
        lead_id: leadId,
        customer_name: `${lead.first_name} ${lead.last_name}`,
        customer_phone: lead.primary_phone || "",
        customer_email: lead.email || "",
      }));
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setFormData((prev) => ({ ...prev, vehicle_id: vehicleId }));
    setVehicleSearch("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const appointmentData = {
      ...formData,
      lead_id:
        customerSource === "lead" ? parseInt(formData.lead_id) || null : null,
      vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null,
      appointment_date: new Date(formData.appointment_date),
    };

    if (appointment) {
      updateAppointmentMutation.mutate(appointmentData);
    } else {
      createAppointmentMutation.mutate(appointmentData);
    }
  };

  const appointmentTypes = [
    { value: "viewing", label: "Viewing", icon: "👁️" },
    { value: "collection", label: "Collection", icon: "🚗" },
    { value: "drop_off", label: "Drop Off", icon: "📦" },
    { value: "other", label: "Other", icon: "📋" },
  ];

  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-600" />
              {appointment ? "Edit Appointment" : "Book New Appointment"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {appointment
              ? "Modify appointment details and customer information"
              : "Schedule a new appointment with customer details"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customer & Appointment Details */}
            <div className="space-y-6">
              {/* Customer Selection */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </Label>

                <RadioGroup
                  value={customerSource}
                  onValueChange={(value) =>
                    setCustomerSource(value as "lead" | "manual")
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lead" id="lead" />
                    <Label htmlFor="lead" className="text-sm">
                      Select from Leads
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="text-sm">
                      Enter Manually
                    </Label>
                  </div>
                </RadioGroup>

                {customerSource === "lead" ? (
                  <div className="space-y-3">
                    <Select
                      value={formData.lead_id}
                      onValueChange={handleLeadSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead..." />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {lead.first_name} {lead.last_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {lead.lead_quality || "New"}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedLead && (
                      <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          <span>
                            {selectedLead.primary_phone || "No phone"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3" />
                          <span>{selectedLead.email || "No email"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label
                        htmlFor="customer_name"
                        className="text-sm font-medium text-gray-700"
                      >
                        Customer Name
                      </Label>
                      <Input
                        id="customer_name"
                        value={formData.customer_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customer_name: e.target.value,
                          }))
                        }
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="customer_phone"
                        className="text-sm font-medium text-gray-700"
                      >
                        Phone Number
                      </Label>
                      <Input
                        id="customer_phone"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customer_phone: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="customer_email"
                        className="text-sm font-medium text-gray-700"
                      >
                        Email Address
                      </Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            customer_email: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Date & Time
                </Label>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="appointment_date"
                      className="text-sm font-medium text-gray-700"
                    >
                      Date
                    </Label>
                    <Input
                      id="appointment_date"
                      type="date"
                      value={formData.appointment_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          appointment_date: e.target.value,
                        }))
                      }
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="appointment_time"
                      className="text-sm font-medium text-gray-700"
                    >
                      Time
                    </Label>
                    <Select
                      value={formData.appointment_time}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          appointment_time: value,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select time..." />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Appointment Type */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">
                  Appointment Type
                </Label>

                <RadioGroup
                  value={formData.appointment_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      appointment_type: value,
                    }))
                  }
                  className="grid grid-cols-2 gap-4"
                >
                  {appointmentTypes.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-center space-x-2"
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <Label
                        htmlFor={type.value}
                        className="text-sm flex items-center gap-2"
                      >
                        <span>{type.icon}</span>
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Right Column - Vehicle & Additional Details */}
            <div className="space-y-6">
              {/* Vehicle Assignment */}
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle Assignment (Optional)
                </Label>

                <div className="space-y-3">
                  <Input
                    placeholder="Search by stock number, registration, or vehicle details..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full"
                  />

                  {vehicleSearch && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      {filteredVehicles.slice(0, 5).map((vehicle) => (
                        <div
                          key={vehicle.id}
                          onClick={() =>
                            handleVehicleSelect(vehicle.id.toString())
                          }
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-xs text-gray-600">
                                {vehicle.stock_number} • {vehicle.registration}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {vehicle.sales_status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.vehicle_id && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      {(() => {
                        const vehicle = vehicles.find(
                          (v) => v.id.toString() === formData.vehicle_id,
                        );
                        return vehicle ? (
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-xs text-gray-600">
                                {vehicle.stock_number} • {vehicle.registration}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  vehicle_id: "",
                                }))
                              }
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-4">
                <Label
                  htmlFor="duration"
                  className="text-sm font-medium text-gray-700"
                >
                  Duration (minutes)
                </Label>
                <Select
                  value={formData.duration_minutes.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      duration_minutes: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <Label
                  htmlFor="notes"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Add any additional notes about this appointment..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={
                createAppointmentMutation.isPending ||
                updateAppointmentMutation.isPending
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createAppointmentMutation.isPending ||
                updateAppointmentMutation.isPending
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {createAppointmentMutation.isPending ||
              updateAppointmentMutation.isPending
                ? "Saving..."
                : appointment
                  ? "Update Appointment"
                  : "Book Appointment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
