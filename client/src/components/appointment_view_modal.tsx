import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  FileText,
  Eye,
  X,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Lead, Vehicle } from "../../../shared/schema";

interface AppointmentViewModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointmentId: number) => void;
  onMarkComplete?: (appointmentId: number) => void;
}

export default function AppointmentViewModal({
  appointment,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMarkComplete,
}: AppointmentViewModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch leads for customer information
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Fetch vehicles for vehicle information
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  // Delete appointment mutation
  const deleteAppointment = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/month"] });
      toast({
        title: "Appointment deleted",
        description: "The appointment has been successfully deleted.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark complete mutation
  const markComplete = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PUT", `/api/appointments/${id}`, {
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/month"] });
      toast({
        title: "Appointment completed",
        description: "The appointment has been marked as completed.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!appointment) return null;

  const associatedLead = appointment.lead_id
    ? leads.find((lead) => lead.id === appointment.lead_id)
    : null;
  const associatedVehicle = appointment.vehicle_id
    ? vehicles.find((vehicle) => vehicle.id === appointment.vehicle_id)
    : null;

  const formatDate = (dateString: string | Date) => {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAppointmentTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "viewing":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "collection":
        return "bg-green-100 text-green-800 border-green-200";
      case "drop_off":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "other":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden bg-white">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                <Eye className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Appointment Overview
                </DialogTitle>
                <DialogDescription className="text-gray-600 text-sm mt-1">
                  Comprehensive appointment details and customer information
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={`px-3 py-1 text-xs font-medium border ${
                  appointment.status === "scheduled"
                    ? "bg-gray-100 text-gray-700 border-gray-200"
                    : appointment.status === "confirmed"
                      ? "bg-gray-100 text-gray-700 border-gray-200"
                      : appointment.status === "completed"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {appointment.status?.toUpperCase() || "SCHEDULED"}
              </Badge>
              <Badge
                className={`px-3 py-1 text-xs font-medium border ${
                  appointment.appointment_type === "viewing"
                    ? "bg-gray-100 text-gray-700 border-gray-200"
                    : appointment.appointment_type === "collection"
                      ? "bg-gray-100 text-gray-700 border-gray-200"
                      : appointment.appointment_type === "drop_off"
                        ? "bg-gray-100 text-gray-700 border-gray-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                {appointment.appointment_type
                  ?.replace("_", " ")
                  .toUpperCase() || "OTHER"}
              </Badge>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                {appointment.status !== "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markComplete.mutate(appointment.id)}
                    disabled={markComplete.isPending}
                    className="bg-green-50 border-green-200 hover:bg-green-100 text-green-700 hover:text-green-800 text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(appointment)}
                  className="bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700 hover:text-gray-800 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAppointment.mutate(appointment.id)}
                  disabled={deleteAppointment.isPending}
                  className="bg-red-50 border-red-200 hover:bg-red-100 text-red-700 hover:text-red-800 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-6">
          {/* Date & Time Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Date & Time
                </h3>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    Appointment Date
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDate(appointment.appointment_date)}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    Time Slot
                  </div>
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatTime(appointment.appointment_time)}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">
                    Duration
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {appointment.duration_minutes || 60} minutes
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Customer Information
                </h3>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    Customer Name
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {appointment.customer_name || associatedLead
                      ? `${associatedLead?.first_name || ""} ${associatedLead?.last_name || ""}`.trim() ||
                        appointment.customer_name ||
                        "Walk-in Customer"
                      : "Walk-in Customer"}
                  </div>
                </div>

                {(appointment.customer_phone ||
                  associatedLead?.primary_phone) && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Phone Number
                    </div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Phone className="h-3 w-3" />
                      <span className="text-sm font-semibold">
                        {appointment.customer_phone ||
                          associatedLead?.primary_phone}
                      </span>
                    </div>
                  </div>
                )}

                {(appointment.customer_email || associatedLead?.email) && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Email Address
                    </div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Mail className="h-3 w-3" />
                      <span className="text-sm font-semibold">
                        {appointment.customer_email || associatedLead?.email}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Information Section */}
          {associatedVehicle && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                    <Car className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Vehicle Information
                  </h3>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Vehicle Details
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {associatedVehicle.year} {associatedVehicle.make}{" "}
                      {associatedVehicle.model}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Stock Number
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {associatedVehicle.stock_number}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Registration
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {associatedVehicle.registration || "Not available"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {appointment.notes && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg border border-gray-200">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Appointment Notes
                  </h3>
                </div>
              </div>

              <div className="p-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-900 whitespace-pre-wrap text-sm leading-relaxed">
                    {appointment.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
