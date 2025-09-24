import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Truck,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Filter,
  Search,
  Package,
  AlertCircle,
  UserCheck,
  Trash2,
  Plus,
  MoreVertical,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import LogisticsJobModal from "@/components/logistics_job_modal";
import LogisticsJobViewModal from "@/components/logistics_job_view_modal";
import { type Job } from "@shared/schema";

const JOB_TYPE_ICONS = {
  delivery: Truck,
  collection: Truck,
  valuation: CheckCircle,
  inspection: CheckCircle,
  repair: Package,
  service: Package,
  mot: CheckCircle,
  preparation: Package,
  photography: CheckCircle,
  transport: Truck,
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-800" },
  { value: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-800" },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "on_hold",
    label: "On Hold",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-100 text-green-800",
  },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "failed", label: "Failed", color: "bg-red-200 text-red-900" },
];

// Active status options for filtering (excludes final states)
const ACTIVE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-800" },
  { value: "assigned", label: "Assigned", color: "bg-blue-100 text-blue-800" },
  {
    value: "in_progress",
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "on_hold",
    label: "On Hold",
    color: "bg-orange-100 text-orange-800",
  },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
  { value: "critical", label: "Critical", color: "bg-red-200 text-red-900" },
];

export default function Schedule() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">(
    "create",
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Fetch vehicles for registration display
  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  // Fetch users for staff assignment
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Job status update mutation
  const updateJobStatusMutation = useMutation({
    mutationFn: async ({
      jobId,
      status,
    }: {
      jobId: number;
      status: string;
    }) => {
      return await apiRequest("PUT", `/api/jobs/${jobId}`, {
        job_status: status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
      toast({
        title: "Job Updated",
        description: "Job status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    },
  });

  // Job delete mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest("DELETE", `/api/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
      toast({
        title: "Job Deleted",
        description: "Job has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getVehicleRegistration = (job: Job) => {
    if (!job.vehicle_id || !Array.isArray(vehicles)) return job.job_number;
    const vehicle = vehicles.find((v: any) => v.id === job.vehicle_id);
    return vehicle?.registration || job.job_number;
  };

  const getStaffName = (userId: number | null) => {
    if (!userId || !Array.isArray(users)) return "Unassigned";
    const user = users.find((u: any) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : "Unassigned";
  };

  const getCustomerName = (customerId: number | null) => {
    if (!customerId || !Array.isArray(customers)) return "No Customer";
    const customer = customers.find((c: any) => c.id === customerId);
    return customer
      ? `${customer.first_name} ${customer.last_name}`
      : "No Customer";
  };

  const getStatusColor = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return statusOption?.color || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return priorityOption?.color || "bg-gray-100 text-gray-800";
  };

  const getJobTypeIcon = (jobType: string) => {
    const IconComponent =
      JOB_TYPE_ICONS[jobType as keyof typeof JOB_TYPE_ICONS] || Package;
    return <IconComponent className="w-4 h-4" />;
  };

  // Filter jobs based on search and filters - only show active jobs
  const filteredJobs = Array.isArray(jobs)
    ? jobs.filter((job: Job) => {
        // Only show active jobs (exclude completed, failed, cancelled - these go to Job History)
        const isActiveJob =
          job.job_status !== "completed" &&
          job.job_status !== "failed" &&
          job.job_status !== "cancelled";

        const matchesSearch =
          getVehicleRegistration(job)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          job.job_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCustomerName(job.customer_id)
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all" || job.job_status === statusFilter;
        const matchesPriority =
          priorityFilter === "all" || job.job_priority === priorityFilter;
        const matchesType = typeFilter === "all" || job.job_type === typeFilter;

        return (
          isActiveJob &&
          matchesSearch &&
          matchesStatus &&
          matchesPriority &&
          matchesType
        );
      })
    : [];

  // Handle job actions
  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setIsViewModalOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setModalMode("edit");
    setIsJobModalOpen(true);
  };

  const handleMarkComplete = (job: Job) => {
    if (updateJobStatusMutation.isPending) return;
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: "completed",
    });
  };

  const handleMarkInProgress = (job: Job) => {
    if (updateJobStatusMutation.isPending) return;
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: "in_progress",
    });
  };

  const handleMarkOnHold = (job: Job) => {
    if (updateJobStatusMutation.isPending) return;
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: "on_hold",
    });
  };

  const handleMarkPending = (job: Job) => {
    if (updateJobStatusMutation.isPending) return;
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: "pending",
    });
  };

  const handleStatusChange = (job: Job, newStatus: string) => {
    updateJobStatusMutation.mutate({
      jobId: job.id,
      status: newStatus,
    });
  };

  const handleDeleteJob = (job: Job) => {
    if (
      window.confirm(
        `Are you sure you want to delete this job? This action cannot be undone.`,
      )
    ) {
      deleteJobMutation.mutate(job.id);
    }
  };

  const handleCloseModals = () => {
    setIsJobModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedJob(null);
    setModalMode("create");
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not scheduled";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Statistics - only for active (non-completed) jobs
  const totalJobs = filteredJobs.length;
  const pendingJobs = filteredJobs.filter(
    (job) => job.job_status === "pending",
  ).length;
  const assignedJobs = filteredJobs.filter(
    (job) => job.job_status === "assigned",
  ).length;
  const inProgressJobs = filteredJobs.filter(
    (job) => job.job_status === "in_progress",
  ).length;

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
            Schedule
          </h1>
        </div>
        <Button
          onClick={() => {
            setSelectedJob(null);
            setModalMode("create");
            setIsJobModalOpen(true);
          }}
          className="bg-red-600 hover:bg-red-700 h-12 sm:h-auto w-full sm:w-auto"
        >
          <Package className="w-4 h-4 mr-2" />
          Schedule New Job
        </Button>
      </div>

      {/* Statistics Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  Total Jobs
                </p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {totalJobs}
                </p>
              </div>
              <Package className="h-6 w-6 lg:h-8 lg:w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  Pending
                </p>
                <p className="text-lg lg:text-2xl font-bold text-yellow-600">
                  {pendingJobs}
                </p>
              </div>
              <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  Assigned
                </p>
                <p className="text-lg lg:text-2xl font-bold text-blue-600">
                  {assignedJobs}
                </p>
              </div>
              <UserCheck className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  In Progress
                </p>
                <p className="text-lg lg:text-2xl font-bold text-green-600">
                  {inProgressJobs}
                </p>
              </div>
              <AlertCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Mobile Optimized */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Mobile Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {ACTIVE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Priority
                </label>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="collection">Collection</SelectItem>
                    <SelectItem value="valuation">Valuation</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="mot">MOT</SelectItem>
                    <SelectItem value="preparation">Preparation</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 opacity-0">
                  Clear
                </label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setTypeFilter("all");
                  }}
                  className="h-12 text-base w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-red-600" />
              <span>Active Jobs</span>
            </div>
            <div className="text-sm text-gray-500">
              {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No jobs found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ||
                statusFilter !== "all" ||
                priorityFilter !== "all" ||
                typeFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Get started by scheduling your first job."}
              </p>
              <Button
                onClick={() => {
                  setSelectedJob(null);
                  setModalMode("create");
                  setIsJobModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Job
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block lg:hidden space-y-4 p-4">
                {filteredJobs.map((job: Job) => (
                  <Card
                    key={job.id}
                    className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                              {getJobTypeIcon(job.job_type)}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {getVehicleRegistration(job)}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewJob(job)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditJob(job)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {job.job_status === "assigned" && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkInProgress(job)}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Job
                                </DropdownMenuItem>
                              )}
                              {job.job_status === "in_progress" && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkComplete(job)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Complete Job
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteJob(job)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              TYPE
                            </div>
                            <div className="text-sm font-medium capitalize">
                              {job.job_type}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              STATUS
                            </div>
                            <Badge
                              className={`${getStatusColor(job.job_status)} text-xs`}
                            >
                              {job.job_status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              PRIORITY
                            </div>
                            <Badge
                              className={`${getPriorityColor(job.job_priority)} text-xs`}
                            >
                              {job.job_priority?.toUpperCase()}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              ASSIGNED TO
                            </div>
                            <div className="text-sm font-medium">
                              {getStaffName(job.assigned_to_id)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              CUSTOMER
                            </div>
                            <div className="text-sm font-medium">
                              {getCustomerName(job.customer_id)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">
                              SCHEDULED
                            </div>
                            <div className="text-sm font-medium">
                              {job.scheduled_date
                                ? formatDate(job.scheduled_date)
                                : "Not scheduled"}
                            </div>
                          </div>
                        </div>

                        {/* Address */}
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            ADDRESS
                          </div>
                          <div className="text-sm font-medium">
                            {job.address_line_1 || "Not specified"}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex space-x-2 pt-2">
                          {job.job_status === "assigned" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkInProgress(job)}
                              disabled={updateJobStatusMutation.isPending}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white h-8 flex-1"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Start
                            </Button>
                          )}
                          {job.job_status === "in_progress" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkComplete(job)}
                              disabled={updateJobStatusMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white h-8 flex-1"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewJob(job)}
                            className="h-8 flex-1"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden lg:block">
                <div className="overflow-auto rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Vehicle
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Type
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Status
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Priority
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Assigned To
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Customer
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Scheduled
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          Address
                        </th>
                        <th className="text-center py-2 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredJobs.map((job: Job, index) => (
                        <tr
                          key={job.id}
                          className={`hover:bg-blue-50/30 transition-all duration-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}
                        >
                          {/* Vehicle */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <div className="text-xs font-semibold text-gray-900">
                              {getVehicleRegistration(job)}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <div className="text-xs font-medium text-gray-900 capitalize">
                              {job.job_type}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <Badge
                              className={`${getStatusColor(job.job_status)} px-2 py-1 text-xs font-semibold rounded-full`}
                            >
                              {job.job_status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <Badge
                              className={`${getPriorityColor(job.job_priority)} px-2 py-1 text-xs font-semibold rounded-full`}
                            >
                              {job.job_priority?.toUpperCase()}
                            </Badge>
                          </td>

                          {/* Assigned To */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <div className="text-xs font-medium text-gray-900">
                              {getStaffName(job.assigned_to_id)}
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <div className="text-xs font-medium text-gray-900">
                              {getCustomerName(job.customer_id)}
                            </div>
                          </td>

                          {/* Scheduled */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            {job.scheduled_date && (
                              <div className="text-xs font-medium text-gray-900">
                                {formatDate(job.scheduled_date)}
                              </div>
                            )}
                          </td>

                          {/* Address */}
                          <td className="py-3 px-2 text-center border-r border-gray-200">
                            <div className="text-xs font-medium text-gray-900 truncate max-w-[120px] mx-auto">
                              {job.address_line_1 || "Not specified"}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {/* Quick Action - Primary Status Change */}
                              {job.job_status === "assigned" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkInProgress(job)}
                                  disabled={updateJobStatusMutation.isPending}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 h-8 px-3"
                                  title="Start Job"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Start
                                </Button>
                              )}

                              {job.job_status === "in_progress" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkComplete(job)}
                                  disabled={updateJobStatusMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white border-0 h-8 px-3"
                                  title="Complete Job"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Complete
                                </Button>
                              )}

                              {job.job_status === "on_hold" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkInProgress(job)}
                                  disabled={updateJobStatusMutation.isPending}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 h-8 px-3"
                                  title="Resume Job"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Resume
                                </Button>
                              )}

                              {/* Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 border-gray-200 hover:bg-gray-50"
                                    title="More Actions"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48"
                                >
                                  {/* View and Edit */}
                                  <DropdownMenuItem
                                    onClick={() => handleViewJob(job)}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEditJob(job)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Job
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {/* Status Changes */}
                                  {job.job_status !== "pending" && (
                                    <DropdownMenuItem
                                      onClick={() => handleMarkPending(job)}
                                      disabled={
                                        updateJobStatusMutation.isPending
                                      }
                                      className="cursor-pointer"
                                    >
                                      <RotateCcw className="w-4 h-4 mr-2" />
                                      Mark as Pending
                                    </DropdownMenuItem>
                                  )}

                                  {job.job_status !== "in_progress" &&
                                    job.job_status !== "completed" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleMarkInProgress(job)
                                        }
                                        disabled={
                                          updateJobStatusMutation.isPending
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Play className="w-4 h-4 mr-2" />
                                        Mark as In Progress
                                      </DropdownMenuItem>
                                    )}

                                  {job.job_status !== "on_hold" &&
                                    job.job_status !== "completed" && (
                                      <DropdownMenuItem
                                        onClick={() => handleMarkOnHold(job)}
                                        disabled={
                                          updateJobStatusMutation.isPending
                                        }
                                        className="cursor-pointer"
                                      >
                                        <Pause className="w-4 h-4 mr-2" />
                                        Put On Hold
                                      </DropdownMenuItem>
                                    )}

                                  {job.job_status !== "completed" && (
                                    <DropdownMenuItem
                                      onClick={() => handleMarkComplete(job)}
                                      disabled={
                                        updateJobStatusMutation.isPending
                                      }
                                      className="cursor-pointer text-green-600"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Mark as Complete
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  {/* Delete */}
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteJob(job)}
                                    disabled={deleteJobMutation.isPending}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Job
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <LogisticsJobModal
        isOpen={isJobModalOpen}
        onClose={handleCloseModals}
        job={selectedJob}
        mode={modalMode}
      />

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
