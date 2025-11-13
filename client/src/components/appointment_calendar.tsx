import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
 ChevronLeft,
 ChevronRight,
 Plus,
 Calendar,
 Clock,
 User,
 Car,
 Eye,
 Edit,
 Trash2,
 ArrowLeft,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppointmentModal from "./appointment_modal";
import AppointmentViewModal from "./appointment_view_modal";
import type { Appointment } from "../../../shared/schema";

interface AppointmentCalendarProps {
 viewMode: "calendar" | "list";
 setViewMode: (mode: "calendar" | "list") => void;
 onNewAppointment: () => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
 "January",
 "February",
 "March",
 "April",
 "May",
 "June",
 "July",
 "August",
 "September",
 "October",
 "November",
 "December",
];

export default function AppointmentCalendar({
 viewMode,
 setViewMode,
 onNewAppointment,
}: AppointmentCalendarProps) {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 const [showDayView, setShowDayView] = useState(false);
 const [showViewModal, setShowViewModal] = useState(false);
 const [viewingAppointment, setViewingAppointment] = useState<Appointment | undefined>();

 const { toast } = useToast();
 const queryClient = useQueryClient();

 // Fetch appointments for the current month
 const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
  queryKey: ["/api/appointments/month", currentDate.getFullYear(), currentDate.getMonth() + 1],
  queryFn: async () => {
   const response = await fetch(
    `/api/appointments/month/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`,
   );
   if (!response.ok) throw new Error("Failed to fetch appointments");
   return response.json();
  },
 });

 // Delete appointment mutation
 const deleteAppointmentMutation = useMutation({
  mutationFn: async (id: number) => {
   const response = await fetch(`/api/appointments/${id}`, {
    method: "DELETE",
   });
   if (!response.ok) throw new Error("Failed to delete appointment");
   return response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
   queryClient.invalidateQueries({ queryKey: ["/api/appointments/month"] });
   toast({
    title: "Success",
    description: "Appointment deleted successfully",
   });
  },
  onError: () => {
   toast({
    title: "Error",
    description: "Failed to delete appointment",
    variant: "destructive",
   });
  },
 });

 // Calendar calculations
 const calendarDays = useMemo(() => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const days = [];

  // Previous month's trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
   const date = new Date(year, month, -i);
   days.push({ date, isCurrentMonth: false });
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
   const date = new Date(year, month, day);
   days.push({ date, isCurrentMonth: true });
  }

  // Next month's leading days
  const remainingDays = 42 - days.length; // 6 rows × 7 days
  for (let day = 1; day <= remainingDays; day++) {
   const date = new Date(year, month + 1, day);
   days.push({ date, isCurrentMonth: false });
  }

  return days;
 }, [currentDate]);

 // Get appointments for a specific date
 const getAppointmentsForDate = (date: Date) => {
  return appointments.filter(appointment => {
   const appointmentDate = new Date(appointment.appointment_date);
   return appointmentDate.toDateString() === date.toDateString();
  });
 };

 // Get appointments for selected date
 const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

 const navigateMonth = (direction: "prev" | "next") => {
  setCurrentDate(prev => {
   const newDate = new Date(prev);
   if (direction === "prev") {
    newDate.setMonth(prev.getMonth() - 1);
   } else {
    newDate.setMonth(prev.getMonth() + 1);
   }
   return newDate;
  });
 };

 const handleDateClick = (date: Date) => {
  setSelectedDate(date);
  setShowDayView(true);
 };

 const handleEditAppointment = (appointment: Appointment) => {
  // Edit functionality would need to be handled by parent component
  console.log("Edit appointment:", appointment);
 };

 const handleDeleteAppointment = (appointment: Appointment) => {
  if (confirm("Are you sure you want to delete this appointment?")) {
   deleteAppointmentMutation.mutate(appointment.id);
  }
 };

 const getAppointmentTypeColor = (type: string) => {
  switch (type) {
   case "viewing":
    return "bg-blue-100 text-blue-800";
   case "collection":
    return "bg-green-100 text-green-800";
   case "drop_off":
    return "bg-orange-100 text-orange-800";
   case "other":
    return "bg-gray-100 text-gray-800";
   default:
    return "bg-gray-100 text-gray-800";
  }
 };

 const getStatusColor = (status: string) => {
  switch (status) {
   case "scheduled":
    return "bg-blue-100 text-blue-800";
   case "completed":
    return "bg-green-100 text-green-800";
   case "cancelled":
    return "bg-red-100 text-red-800";
   case "no_show":
    return "bg-gray-100 text-gray-800";
   default:
    return "bg-gray-100 text-gray-800";
  }
 };

 const today = new Date();
 const isToday = (date: Date) => date.toDateString() === today.toDateString();

 return (
  <div className="space-y-4 md:space-y-8">
   {/* Enhanced Calendar Header - Mobile Optimized */}
   <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gradient-to-r from-slate-50 to-white p-3 md:p-4 rounded-xl border border-slate-200 gap-3 md:gap-0">
    <div className="flex items-center gap-2 md:gap-4">
     <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
      <Button
       variant="ghost"
       size="sm"
       onClick={() => navigateMonth("prev")}
       className="flex items-center gap-2 hover:bg-slate-50 h-8 w-8 p-0"
      >
       <ChevronLeft className="h-3 w-3" />
      </Button>

      <div className="px-2 md:px-3 py-1">
       <h2 className="text-base md:text-lg font-semibold text-slate-900">
        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
       </h2>
      </div>

      <Button
       variant="ghost"
       size="sm"
       onClick={() => navigateMonth("next")}
       className="flex items-center gap-2 hover:bg-slate-50 h-8 w-8 p-0"
      >
       <ChevronRight className="h-3 w-3" />
      </Button>
     </div>

     <Button
      onClick={() => setCurrentDate(new Date())}
      variant="outline"
      size="sm"
      className="text-slate-600 hover:text-slate-900 h-8 text-xs md:text-sm"
     >
      Today
     </Button>
    </div>
   </div>

   {/* Modern Calendar Grid */}
   <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    {/* Sophisticated Day Headers - Mobile Optimized */}
    <div className="grid grid-cols-7 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
     {DAYS_OF_WEEK.map(day => (
      <div key={day} className="py-2 md:py-4 px-1 md:px-2 text-center">
       <div className="text-xs md:text-sm font-semibold text-slate-700 uppercase tracking-wide">
        <span className="md:hidden">{day.slice(0, 2)}</span>
        <span className="hidden md:inline">{day}</span>
       </div>
      </div>
     ))}
    </div>

    {/* Luxury Calendar Days */}
    <div className="grid grid-cols-7 divide-x divide-slate-100">
     {calendarDays.map(({ date, isCurrentMonth }, index) => {
      const dayAppointments = getAppointmentsForDate(date);
      const hasAppointments = dayAppointments.length > 0;

      return (
       <div
        key={index}
        onClick={() => isCurrentMonth && handleDateClick(date)}
        className={`
                  min-h-[80px] md:min-h-[140px] p-2 md:p-3 cursor-pointer transition-all duration-200 relative group
                  ${
                   isCurrentMonth
                    ? "bg-white hover:bg-gradient-to-br hover:from-slate-50 hover:to-white"
                    : "bg-slate-50/50"
                  }
                  ${
                   isToday(date)
                    ? "bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200"
                    : "border-b border-slate-100"
                  }
                  ${hasAppointments ? "shadow-sm" : ""}
                `}
       >
        {/* Date Number - Mobile Optimized */}
        <div className="flex items-center justify-between mb-2 md:mb-3">
         <div
          className={`
                    flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full font-semibold text-xs md:text-sm transition-all
                    ${isCurrentMonth ? "text-slate-900" : "text-slate-400"}
                    ${
                     isToday(date)
                      ? "bg-red-600 text-white shadow-lg"
                      : hasAppointments
                        ? "bg-blue-100 text-blue-800"
                        : ""
                    }
                  `}
         >
          {date.getDate()}
         </div>

         {hasAppointments && (
          <div className="flex items-center gap-1">
           <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></div>
           <span className="text-xs font-medium text-slate-600">{dayAppointments.length}</span>
          </div>
         )}
        </div>

        {/* Appointment Previews - Mobile Optimized */}
        <div className="space-y-1 md:space-y-1.5">
         {dayAppointments.slice(0, 1).map((appointment, idx) => (
          <div
           key={idx}
           className="bg-gradient-to-r from-slate-50 to-white p-1.5 md:p-2 rounded-lg border border-slate-100 hover:shadow-sm transition-all"
          >
           <div className="flex items-center gap-1 md:gap-2 mb-1">
            <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">{appointment.appointment_time}</span>
            <Badge
             className={`text-xs px-1 md:px-1.5 py-0.5 ${
              appointment.appointment_type === "viewing"
               ? "bg-purple-100 text-purple-700"
               : appointment.appointment_type === "collection"
                 ? "bg-emerald-100 text-emerald-700"
                 : appointment.appointment_type === "drop_off"
                   ? "bg-amber-100 text-amber-700"
                   : "bg-slate-100 text-slate-700"
             }`}
            >
             <span className="md:hidden">{appointment.appointment_type?.charAt(0).toUpperCase()}</span>
             <span className="hidden md:inline">
              {appointment.appointment_type?.replace("_", " ").toUpperCase()}
             </span>
            </Badge>
           </div>
           <div className="text-xs text-slate-600 truncate font-medium">
            {appointment.customer_name || "Walk-in"}
           </div>
          </div>
         ))}

         {dayAppointments.length > 1 && (
          <div className="text-xs text-center text-slate-500 py-1 bg-slate-50 rounded-lg">
           +{dayAppointments.length - 1} more
          </div>
         )}
        </div>

        {/* Quick Book Button - Mobile Optimized */}
        {isCurrentMonth && (
         <Button
          variant="ghost"
          size="sm"
          onClick={e => {
           e.stopPropagation();
           // Book appointment functionality would be handled by parent component
           console.log("Book appointment for date:", date);
          }}
          className="absolute bottom-1 right-1 md:bottom-2 md:right-2 h-6 w-6 md:h-7 md:w-7 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg"
         >
          <Plus className="h-2.5 w-2.5 md:h-3 md:w-3" />
         </Button>
        )}
       </div>
      );
     })}
    </div>
   </div>

   {/* Luxury Day View Modal */}
   <Dialog open={showDayView} onOpenChange={setShowDayView}>
    <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden bg-gradient-to-br from-white to-slate-50">
     <DialogHeader className="border-b border-slate-200 pb-6">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
        <div className="p-2 bg-red-50 rounded-xl border border-red-100">
         <Calendar className="h-6 w-6 text-red-600" />
        </div>
        <div>
         <DialogTitle className="text-2xl font-bold text-slate-900">
          {selectedDate?.toLocaleDateString("en-US", {
           weekday: "long",
           month: "long",
           day: "numeric",
          })}
         </DialogTitle>
         <p className="text-slate-600 mt-1">
          {selectedDateAppointments.length} appointment
          {selectedDateAppointments.length !== 1 ? "s" : ""} scheduled
         </p>
        </div>
       </div>

       <Button
        onClick={() => {
         setShowDayView(false);
         onNewAppointment();
        }}
        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg px-6 py-2.5 rounded-xl"
       >
        <Plus className="h-4 w-4 mr-2" />
        New Appointment
       </Button>
      </div>
     </DialogHeader>

     <div className="p-6 max-h-[60vh] overflow-y-auto">
      {/* Modern Time Slots Grid */}
      <div className="grid gap-3">
       {Array.from({ length: 18 }, (_, i) => {
        const hour = Math.floor(i / 2) + 8;
        const minute = (i % 2) * 30;
        const timeSlot = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

        const slotAppointments = selectedDateAppointments.filter(apt => apt.appointment_time === timeSlot);

        return (
         <div
          key={timeSlot}
          className="flex items-center gap-6 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-all"
         >
          <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-3 min-w-[80px]">
           <div className="text-lg font-bold text-slate-900">{timeSlot}</div>
           <div className="text-xs text-slate-500">30 min slot</div>
          </div>

          <div className="flex-1">
           {slotAppointments.length > 0 ? (
            <div className="space-y-3">
             {slotAppointments.map(appointment => (
              <div
               key={appointment.id}
               className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100"
              >
               <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                 <h4 className="font-semibold text-slate-900">
                  {appointment.customer_name || "Walk-in Customer"}
                 </h4>
                 <Badge
                  className={`px-3 py-1 ${
                   appointment.appointment_type === "viewing"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : appointment.appointment_type === "collection"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : appointment.appointment_type === "drop_off"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-50 text-slate-700 border border-slate-200"
                  }`}
                 >
                  {appointment.appointment_type?.replace("_", " ").toUpperCase()}
                 </Badge>
                 <Badge
                  className={`px-3 py-1 ${
                   appointment.status === "scheduled"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : appointment.status === "confirmed"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : appointment.status === "completed"
                        ? "bg-gray-50 text-gray-700 border border-gray-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                 >
                  {appointment.status?.toUpperCase()}
                 </Badge>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-600">
                 <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{appointment.duration_minutes || 30} minutes</span>
                 </div>
                 {appointment.vehicle_id && (
                  <div className="flex items-center gap-2">
                   <Car className="h-4 w-4" />
                   <span>Vehicle Assigned</span>
                  </div>
                 )}
                </div>

                {appointment.notes && (
                 <div className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded-lg">
                  {appointment.notes}
                 </div>
                )}
               </div>

               <div className="flex items-center gap-2 ml-4">
                <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                  setViewingAppointment(appointment);
                  setShowViewModal(true);
                 }}
                 className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600"
                >
                 <Eye className="h-4 w-4" />
                </Button>
                <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => {
                  setShowDayView(false);
                  handleEditAppointment(appointment);
                 }}
                 className="h-9 w-9 p-0 hover:bg-emerald-50 hover:text-emerald-600"
                >
                 <Edit className="h-4 w-4" />
                </Button>
                <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => handleDeleteAppointment(appointment)}
                 className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                >
                 <Trash2 className="h-4 w-4" />
                </Button>
               </div>
              </div>
             ))}
            </div>
           ) : (
            <Button
             variant="ghost"
             onClick={() => {
              setShowDayView(false);
              onNewAppointment();
             }}
             className="w-full justify-start text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-6 h-auto border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl"
            >
             <Plus className="h-5 w-5 mr-3" />
             <div className="text-left">
              <div className="font-medium">Available Slot</div>
              <div className="text-xs">Click to book an appointment</div>
             </div>
            </Button>
           )}
          </div>
         </div>
        );
       })}
      </div>
     </div>
    </DialogContent>
   </Dialog>

   {/* Appointment View Modal */}
   <AppointmentViewModal
    isOpen={showViewModal}
    onClose={() => {
     setShowViewModal(false);
     setViewingAppointment(undefined);
    }}
    appointment={viewingAppointment || null}
   />
  </div>
 );
}
