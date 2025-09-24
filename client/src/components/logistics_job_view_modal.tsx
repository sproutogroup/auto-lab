import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Truck,
  Wrench,
  CheckCircle,
  Edit,
  Package,
  FileText,
  Settings,
  DollarSign,
  Users,
  Clock3,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type Job } from "@shared/schema";

interface LogisticsJobViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onEdit?: () => void;
}

const JOB_TYPE_ICONS = {
  delivery: Truck,
  collection: Truck,
  valuation: CheckCircle,
  inspection: CheckCircle,
  repair: Wrench,
  service: Wrench,
  mot: CheckCircle,
  preparation: Wrench,
  photography: CheckCircle,
  transport: Truck,
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "urgent":
      return "bg-red-100 text-red-800";
    case "critical":
      return "bg-red-200 text-red-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-gray-100 text-gray-800";
    case "assigned":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "on_hold":
      return "bg-orange-100 text-orange-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "failed":
      return "bg-red-200 text-red-900";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const capitalize = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1);

export default function LogisticsJobViewModal({
  isOpen,
  onClose,
  job,
  onEdit,
}: LogisticsJobViewModalProps) {
  if (!job) return null;

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isOpen && !!job.vehicle_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isOpen,
  });

  const JobIcon =
    JOB_TYPE_ICONS[job.job_type as keyof typeof JOB_TYPE_ICONS] || Wrench;

  // Find the vehicle associated with this job
  const jobVehicle =
    Array.isArray(vehicles) && job.vehicle_id
      ? vehicles.find((vehicle: any) => vehicle.id === job.vehicle_id)
      : null;

  // Find the assigned user
  const assignedUser =
    Array.isArray(users) && job.assigned_to_id
      ? users.find((user: any) => user.id === job.assigned_to_id)
      : null;

  // Find the user who created the job
  const createdByUser =
    Array.isArray(users) && job.created_by_id
      ? users.find((user: any) => user.id === job.created_by_id)
      : null;

  // Find the customer
  const jobCustomer =
    Array.isArray(customers) && job.customer_id
      ? customers.find((customer: any) => customer.id === job.customer_id)
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl lg:max-w-7xl max-w-[95vw] max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
        <DialogHeader className="pb-4 lg:pb-8 border-b border-gray-200">
          {/* Mobile Header */}
          <div className="flex lg:hidden flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <JobIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {jobVehicle?.registration || "No Vehicle Assigned"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 font-medium">
                    {job.job_number}
                  </DialogDescription>
                </div>
              </div>
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50 px-4 py-2 h-auto"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`${getPriorityColor(job.job_priority)} px-3 py-1 text-xs font-semibold rounded-full`}
              >
                {capitalize(job.job_priority)}
              </Badge>
              <Badge
                className={`${getStatusColor(job.job_status)} px-3 py-1 text-xs font-semibold rounded-full`}
              >
                {capitalize(job.job_status.replace("_", " "))}
              </Badge>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <JobIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-bold text-gray-900 mb-2">
                  {jobVehicle?.registration || "No Vehicle Assigned"}
                </DialogTitle>
                <DialogDescription className="text-lg text-gray-600 font-medium">
                  {job.job_number}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                className={`${getPriorityColor(job.job_priority)} px-4 py-2 text-sm font-semibold rounded-full`}
              >
                {capitalize(job.job_priority)}
              </Badge>
              <Badge
                className={`${getStatusColor(job.job_status)} px-4 py-2 text-sm font-semibold rounded-full`}
              >
                {capitalize(job.job_status.replace("_", " "))}
              </Badge>
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50 px-6 py-2 h-auto"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 lg:space-y-8 py-4 lg:py-8">
          {/* Primary Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Job Information Card */}
            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
              <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-red-50 to-red-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red-500 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Job Type
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {capitalize(job.job_type)}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Category
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {capitalize(job.job_category)}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Priority
                  </p>
                  <Badge
                    className={`${getPriorityColor(job.job_priority)} text-xs lg:text-sm px-2 lg:px-3 py-1 font-semibold`}
                  >
                    {capitalize(job.job_priority)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Status
                  </p>
                  <Badge
                    className={`${getStatusColor(job.job_status)} text-xs lg:text-sm px-2 lg:px-3 py-1 font-semibold`}
                  >
                    {capitalize(job.job_status.replace("_", " "))}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Assignment & Timing Card */}
            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
              <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  Assignment & Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Assigned To
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {assignedUser ? assignedUser.username : "Unassigned"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Estimated Duration
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.estimated_duration_hours
                      ? `${job.estimated_duration_hours} hours`
                      : "Not specified hours"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Scheduled Date
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.scheduled_date
                      ? new Date(job.scheduled_date).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Created By
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {createdByUser
                      ? createdByUser.username
                      : `User ID: ${job.created_by_id}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location & Contact Card */}
            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
              <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  Location & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Address Line 1
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.address_line_1 || "Not specified"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    City
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.city || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Postcode
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.postcode || "Not specified"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Vehicle & Customer Card */}
            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
              <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Truck className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  Vehicle & Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Vehicle
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {jobVehicle
                      ? `${jobVehicle.registration} - ${jobVehicle.year} ${jobVehicle.make} ${jobVehicle.model}`
                      : "No vehicle assigned"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Customer
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {jobCustomer
                      ? `${jobCustomer.first_name} ${jobCustomer.last_name}`
                      : "No customer assigned"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Lead
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.lead_id
                      ? `Lead ID: ${job.lead_id}`
                      : "No lead associated"}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    External Reference
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.external_reference || "None"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Information Card */}
            <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
              <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  Cost Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Estimated Cost
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.estimated_cost
                      ? `£${job.estimated_cost}`
                      : "Not specified"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Actual Cost
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.actual_cost ? `£${job.actual_cost}` : "Not recorded"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Hourly Rate
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.hourly_rate
                      ? `£${job.hourly_rate}/hr`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Total Cost
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.total_cost ? `£${job.total_cost}` : "Not calculated"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quality & Completion Card */}
          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
            <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-teal-50 to-teal-100 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                Quality & Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Quality Check Required
                  </p>
                  <Badge
                    className={`text-xs lg:text-sm px-2 lg:px-3 py-1 font-semibold ${job.quality_check_required ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    {job.quality_check_required ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Quality Check Completed
                  </p>
                  <Badge
                    className={`text-xs lg:text-sm px-2 lg:px-3 py-1 font-semibold ${job.quality_check_completed ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    {job.quality_check_completed ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timing Details Card */}
          <Card className="border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white job-view-mobile-card">
            <CardHeader className="pb-3 lg:pb-6 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-lg lg:text-xl font-bold text-gray-900">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Clock3 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                </div>
                Timing Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Created At
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.created_at
                      ? new Date(job.created_at).toLocaleString()
                      : "Not recorded"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Updated At
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.updated_at
                      ? new Date(job.updated_at).toLocaleString()
                      : "Not updated"}
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-3 lg:pb-4">
                  <p className="text-xs lg:text-sm font-semibold text-gray-700 mb-1 lg:mb-2">
                    Actual Duration
                  </p>
                  <p className="text-sm lg:text-base text-gray-900 font-medium">
                    {job.actual_duration_hours
                      ? `${job.actual_duration_hours} hours`
                      : "Not completed"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 lg:pt-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 lg:h-auto px-6 lg:px-4 text-base lg:text-sm font-medium"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
