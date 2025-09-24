import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  Calendar,
  Clock,
  Eye,
  Plus,
  Filter,
  Search,
  CheckCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import AppointmentCalendar from "@/components/appointment_calendar";
import AppointmentModal from "@/components/appointment_modal";
import AppointmentViewModal from "@/components/appointment_view_modal";
import type { Appointment } from "../../../shared/schema";

export default function Appointments() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAppointment, setViewingAppointment] =
    useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setEditingAppointment(null);
  };

  // Fetch appointment statistics
  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
  });

  const today = new Date();
  const todayAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.appointment_date);
    return appointmentDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter((apt: any) => {
    const appointmentDate = new Date(apt.appointment_date);
    return appointmentDate > today;
  });

  const completedAppointments = appointments.filter(
    (apt: any) => apt.status === "completed",
  );
  const confirmedAppointments = appointments.filter(
    (apt: any) => apt.status === "confirmed",
  );

  const getStatusBadge = (status: string) => {
    const statusColors = {
      scheduled: "bg-slate-100 text-slate-700 border border-slate-200",
      confirmed: "bg-slate-100 text-slate-700 border border-slate-200",
      completed: "bg-green-100 text-green-700 border border-green-200",
      cancelled: "bg-red-100 text-red-700 border border-red-200",
    };
    return (
      statusColors[status as keyof typeof statusColors] ||
      statusColors.scheduled
    );
  };

  const getTypeBadge = (type: string) => {
    const typeColors = {
      viewing: "bg-slate-100 text-slate-700 border border-slate-200",
      collection: "bg-blue-100 text-blue-700 border border-blue-200",
      drop_off: "bg-amber-100 text-amber-700 border border-amber-200",
      other: "bg-gray-100 text-gray-700 border border-gray-200",
    };
    return typeColors[type as keyof typeof typeColors] || typeColors.other;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="p-6 space-y-8">
        {/* Luxury Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-red-50 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Today's Schedule
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {todayAppointments.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Active appointments
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-green-50 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Confirmed
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {confirmedAppointments.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ready to proceed</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <CalendarCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Upcoming
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {upcomingAppointments.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Future bookings</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-purple-50 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Completed
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {completedAppointments.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Successfully finished
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Highlights - Luxury Design */}
        {todayAppointments.length > 0 && (
          <Card className="relative overflow-hidden bg-gradient-to-br from-white to-orange-50 border-0 shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <CardHeader className="bg-gradient-to-r from-white to-orange-50 border-b border-orange-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Today's Highlights
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    {todayAppointments.length} appointments scheduled for today
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {todayAppointments.slice(0, 4).map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="group relative overflow-hidden bg-gradient-to-r from-white to-orange-50 border border-orange-200 rounded-xl hover:shadow-lg transition-all duration-300"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-600"></div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-orange-200 min-w-[80px] shadow-sm">
                            <div className="text-sm font-bold text-gray-900">
                              {appointment.appointment_time}
                            </div>
                            <div className="text-xs text-gray-500">
                              {appointment.duration_minutes || 30}min
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {appointment.customer_name ||
                                  "Walk-in Customer"}
                              </h4>
                              <Badge
                                className={`px-3 py-1 ${getTypeBadge(appointment.appointment_type)} font-medium`}
                              >
                                {appointment.appointment_type
                                  ?.replace("_", " ")
                                  .toUpperCase()}
                              </Badge>
                            </div>

                            {appointment.notes && (
                              <p className="text-gray-600 text-sm">
                                {appointment.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <Badge
                          className={`px-4 py-2 text-sm font-medium ${getStatusBadge(appointment.status)}`}
                        >
                          {appointment.status === "completed"
                            ? "COMPLETE"
                            : appointment.status?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {todayAppointments.length > 4 && (
                  <div className="text-center py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-orange-600 hover:bg-orange-50 font-medium"
                    >
                      View {todayAppointments.length - 4} more appointments
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Area - Luxury Design */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-xl">
          {/* Luxury Header */}
          <CardHeader className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {viewMode === "calendar"
                      ? "Calendar View"
                      : "All Appointments"}
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    {appointments.length} appointments total
                  </p>
                </div>
              </div>

              {/* Luxury Toggle Controls */}
              <div className="flex items-center gap-4">
                <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                  <Button
                    variant={viewMode === "calendar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("calendar")}
                    className={`${viewMode === "calendar" ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md" : "hover:bg-gray-50"} transition-all duration-200`}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`${viewMode === "list" ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md" : "hover:bg-gray-50"} transition-all duration-200`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    List
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    onClick={() => setShowAppointmentModal(true)}
                    className="h-10 w-10 p-0 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl shadow-lg transition-all duration-200"
                  >
                    <Plus className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {viewMode === "calendar" ? (
              <AppointmentCalendar
                viewMode={viewMode}
                setViewMode={setViewMode}
                onNewAppointment={() => setShowAppointmentModal(true)}
              />
            ) : (
              <div className="space-y-2">
                {appointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="group relative overflow-hidden bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all duration-300"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-red-600"></div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Date/Time Card */}
                          <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-gray-200 min-w-[70px] shadow-sm">
                            <div className="text-sm font-bold text-gray-900">
                              {new Date(
                                appointment.appointment_date,
                              ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {appointment.appointment_time}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-base font-semibold text-gray-900">
                                {appointment.customer_name ||
                                  "Walk-in Customer"}
                              </h4>
                              <Badge
                                className={`px-2 py-0.5 text-xs ${getTypeBadge(appointment.appointment_type)} font-medium`}
                              >
                                {appointment.appointment_type
                                  ?.replace("_", " ")
                                  .toUpperCase()}
                              </Badge>
                            </div>

                            {appointment.notes && (
                              <p className="text-gray-600 text-xs">
                                {appointment.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            className={`px-3 py-1 text-xs font-medium ${getStatusBadge(appointment.status)}`}
                          >
                            {appointment.status === "completed"
                              ? "COMPLETE"
                              : appointment.status?.toUpperCase()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
                            onClick={() => {
                              setViewingAppointment(appointment);
                              setShowViewModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {appointments.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No appointments scheduled
                    </h3>
                    <p className="text-gray-600">
                      Create your first appointment to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={handleCloseAppointmentModal}
        appointment={editingAppointment}
      />

      {/* Appointment View Modal */}
      <AppointmentViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingAppointment(null);
        }}
        appointment={viewingAppointment}
        onEdit={(appointment) => {
          setEditingAppointment(appointment);
          setShowViewModal(false);
          setShowAppointmentModal(true);
        }}
      />
    </div>
  );
}
