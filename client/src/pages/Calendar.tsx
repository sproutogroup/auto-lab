import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, Truck, MapPin, Clock, User, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import LogisticsJobModal from "@/components/logistics_job_modal";
import LogisticsJobViewModal from "@/components/logistics_job_view_modal";
import { type Job } from "@shared/schema";

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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [isJobModalOpen, setIsJobModalOpen] = useState(false);
 const [isViewModalOpen, setIsViewModalOpen] = useState(false);
 const [selectedJob, setSelectedJob] = useState<Job | null>(null);
 const [selectedDate, setSelectedDate] = useState<Date | null>(null);
 const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");

 const { data: jobs = [], isLoading } = useQuery<Job[]>({
  queryKey: ["/api/jobs"],
 });

 const { data: vehicles = [] } = useQuery({
  queryKey: ["/api/vehicles"],
 });

 const { data: jobStats = {} } = useQuery<{
  totalJobs?: string;
  pendingJobs?: string;
  inProgressJobs?: string;
  completedJobs?: string;
 }>({
  queryKey: ["/api/jobs/stats"],
 });

 // Helper function to get vehicle registration for a job
 const getVehicleRegistration = (job: Job) => {
  if (!job.vehicle_id || !Array.isArray(vehicles)) return job.job_number;
  const vehicle = vehicles.find((v: any) => v.id === job.vehicle_id);
  return vehicle?.registration || job.job_number;
 };

 const navigateMonth = (direction: "prev" | "next") => {
  const newDate = new Date(currentDate);
  if (direction === "prev") {
   newDate.setMonth(currentDate.getMonth() - 1);
  } else {
   newDate.setMonth(currentDate.getMonth() + 1);
  }
  setCurrentDate(newDate);
 };

 const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
   days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
   days.push(new Date(year, month, day));
  }

  return days;
 };

 const getJobsForDate = (date: Date | null) => {
  if (!date) return [];
  const dateStr = date.toISOString().split("T")[0];
  return jobs.filter((job: Job) => {
   if (!job.scheduled_date) return false;
   const jobDate = new Date(job.scheduled_date).toISOString().split("T")[0];
   return jobDate === dateStr;
  });
 };

 const handleDateClick = (date: Date) => {
  setSelectedDate(date);
  setSelectedJob(null);
  setModalMode("create");
  setIsJobModalOpen(true);
 };

 const handleJobClick = (job: Job) => {
  setSelectedJob(job);
  setIsViewModalOpen(true);
 };

 const handleEditJob = (job: Job) => {
  setSelectedJob(job);
  setModalMode("edit");
  setIsViewModalOpen(false);
  setIsJobModalOpen(true);
 };

 const handleCloseModals = () => {
  setIsJobModalOpen(false);
  setIsViewModalOpen(false);
  setSelectedJob(null);
  setSelectedDate(null);
  setModalMode("create");
 };

 const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
   case "pending":
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
   case "assigned":
    return "bg-blue-100 text-blue-800 border-blue-200";
   case "in_progress":
    return "bg-purple-100 text-purple-800 border-purple-200";
   case "completed":
    return "bg-green-100 text-green-800 border-green-200";
   case "cancelled":
    return "bg-red-100 text-red-800 border-red-200";
   default:
    return "bg-gray-100 text-gray-800 border-gray-200";
  }
 };

 const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
   case "urgent":
    return "border-l-red-500";
   case "high":
    return "border-l-orange-500";
   case "medium":
    return "border-l-yellow-500";
   case "low":
    return "border-l-green-500";
   default:
    return "border-l-gray-500";
  }
 };

 const getJobTypeIcon = (jobType: string) => {
  switch (jobType.toLowerCase()) {
   case "delivery":
    return <Truck className="h-3 w-3" />;
   case "collection":
    return <Package className="h-3 w-3" />;
   case "transport":
    return <MapPin className="h-3 w-3" />;
   default:
    return <Clock className="h-3 w-3" />;
  }
 };

 const days = getDaysInMonth(currentDate);

 return (
  <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div className="flex items-center space-x-3">
     <CalendarIcon className="h-6 w-6 lg:h-8 lg:w-8 text-red-600" />
     <div>
      <h1 className="text-lg lg:text-2xl font-bold text-gray-900">Calendar</h1>
     </div>
    </div>
    <Button
     onClick={() => setIsJobModalOpen(true)}
     className="bg-red-600 hover:bg-red-700 text-white h-12 lg:h-auto px-4 lg:px-6 text-sm lg:text-base"
    >
     <Plus className="h-4 w-4 mr-2" />
     <span className="hidden sm:inline">Schedule Job</span>
     <span className="sm:hidden">Schedule</span>
    </Button>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
    {/* Statistics Cards */}
    <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
     <Card className="border-l-4 border-l-blue-500 calendar-mobile-card">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">Total Jobs</p>
         <p className="text-lg lg:text-2xl font-bold text-gray-900">{jobStats?.totalJobs || 0}</p>
        </div>
        <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
       </div>
      </CardContent>
     </Card>

     <Card className="border-l-4 border-l-yellow-500 calendar-mobile-card">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">Pending</p>
         <p className="text-lg lg:text-2xl font-bold text-gray-900">{jobStats?.pendingJobs || 0}</p>
        </div>
        <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500" />
       </div>
      </CardContent>
     </Card>

     <Card className="border-l-4 border-l-purple-500 calendar-mobile-card">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">In Progress</p>
         <p className="text-lg lg:text-2xl font-bold text-gray-900">{jobStats?.inProgressJobs || 0}</p>
        </div>
        <Truck className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500" />
       </div>
      </CardContent>
     </Card>

     <Card className="border-l-4 border-l-green-500 calendar-mobile-card">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">Completed</p>
         <p className="text-lg lg:text-2xl font-bold text-gray-900">{jobStats?.completedJobs || 0}</p>
        </div>
        <Package className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
       </div>
      </CardContent>
     </Card>
    </div>

    {/* Calendar */}
    <div className="lg:col-span-4">
     <Card className="premium-card calendar-mobile-card">
      <CardHeader className="p-3 lg:p-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4">
         <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth("prev")}
          className="h-12 lg:h-auto px-3 lg:px-4 text-base lg:text-sm"
         >
          ←
         </Button>
         <h2 className="text-lg lg:text-xl font-semibold">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
         </h2>
         <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth("next")}
          className="h-12 lg:h-auto px-3 lg:px-4 text-base lg:text-sm"
         >
          →
         </Button>
        </div>
        <Button
         variant="outline"
         size="sm"
         onClick={() => setCurrentDate(new Date())}
         className="h-12 lg:h-auto px-3 lg:px-4 text-base lg:text-sm"
        >
         Today
        </Button>
       </div>
      </CardHeader>
      <CardContent className="p-3 lg:p-6">
       <div className="grid grid-cols-7 gap-1 lg:gap-2">
        {/* Day headers */}
        {DAYS.map(day => (
         <div key={day} className="p-2 text-center text-xs lg:text-sm font-medium text-gray-500 border-b">
          {day}
         </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
         const dayJobs = getJobsForDate(day);
         const isToday = day && day.toDateString() === new Date().toDateString();

         return (
          <div
           key={index}
           className={`min-h-[60px] lg:min-h-[120px] p-1 border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
            isToday ? "bg-red-50 border-red-200" : ""
           } ${!day ? "bg-gray-50" : ""}`}
           onClick={() => day && handleDateClick(day)}
          >
           {day && (
            <>
             <div
              className={`text-xs lg:text-sm font-medium mb-1 ${isToday ? "text-red-600" : "text-gray-900"}`}
             >
              {day.getDate()}
             </div>
             <div className="space-y-1 lg:space-y-2">
              {dayJobs.slice(0, 2).map((job: Job) => (
               <div
                key={job.id}
                className={`p-1 rounded text-xs border-l-2 cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(job.job_status)} ${getPriorityColor(job.job_priority)}`}
                onClick={e => {
                 e.stopPropagation();
                 handleJobClick(job);
                }}
               >
                <div className="flex items-center gap-1">
                 {getJobTypeIcon(job.job_type)}
                 <span className="truncate font-medium">{getVehicleRegistration(job)}</span>
                </div>
                <div className="truncate lg:block hidden">{job.job_type}</div>
               </div>
              ))}
              {dayJobs.length > 2 && (
               <div className="text-xs text-gray-500 pl-1">+{dayJobs.length - 2} more</div>
              )}
             </div>
            </>
           )}
          </div>
         );
        })}
       </div>
      </CardContent>
     </Card>
    </div>
   </div>

   {/* Job Modal */}
   <LogisticsJobModal
    isOpen={isJobModalOpen}
    onClose={handleCloseModals}
    job={selectedJob}
    mode={modalMode}
    selectedDate={selectedDate}
   />

   {/* Job View Modal */}
   {selectedJob && (
    <LogisticsJobViewModal
     isOpen={isViewModalOpen}
     onClose={handleCloseModals}
     job={selectedJob}
     onEdit={() => handleEditJob(selectedJob)}
    />
   )}
  </div>
 );
}
