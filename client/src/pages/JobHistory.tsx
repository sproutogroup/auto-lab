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
  History,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  Wrench,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import LogisticsJobViewModal from "@/components/logistics_job_view_modal";
import { type Job } from "@shared/schema";

export default function JobHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Fetch jobs data
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Fetch vehicles for registration display
  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  // Fetch job statistics
  const { data: jobStats } = useQuery({
    queryKey: ["/api/jobs/stats"],
  });

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "failed":
        return "bg-red-200 text-red-900";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "on_hold":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "on_hold":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
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

  const getJobTypeIcon = (jobType: string) => {
    switch (jobType) {
      case "delivery":
      case "collection":
      case "transport":
        return <Truck className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getVehicleRegistration = (job: Job) => {
    if (!job.vehicle_id || !Array.isArray(vehicles)) return "N/A";
    const vehicle = vehicles.find((v: any) => v.id === job.vehicle_id);
    return vehicle?.registration || "N/A";
  };

  // Filter jobs based on search and filters - show completed, failed, and cancelled jobs
  const filteredJobs = Array.isArray(jobs)
    ? jobs.filter((job: any) => {
        // Show completed, failed, and cancelled jobs in job history
        const isHistoricalJob =
          job.job_status === "completed" ||
          job.job_status === "failed" ||
          job.job_status === "cancelled";

        const matchesSearch =
          searchQuery === "" ||
          job.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.job_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.job_description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesType = typeFilter === "all" || job.job_type === typeFilter;

        return isHistoricalJob && matchesSearch && matchesType;
      })
    : [];

  // Sort jobs by most recent first
  const sortedJobs = filteredJobs.sort((a: any, b: any) => {
    const dateA = new Date(
      a.created_at || a.actual_end_date || a.scheduled_end_date,
    );
    const dateB = new Date(
      b.created_at || b.actual_end_date || b.scheduled_end_date,
    );
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate statistics for historical jobs
  const completedJobs = filteredJobs.filter(
    (job: any) => job.job_status === "completed",
  );
  const failedJobs = filteredJobs.filter(
    (job: any) => job.job_status === "failed",
  );
  const cancelledJobs = filteredJobs.filter(
    (job: any) => job.job_status === "cancelled",
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <History className="h-8 w-8 text-red-600" />
          <div></div>
        </div>
        <Button variant="outline" className="bg-white">
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedJobs.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {failedJobs.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <XCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {cancelledJobs.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total History
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredJobs.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center justify-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
              <History className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                Historical Jobs (Completed, Failed, Cancelled)
              </span>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
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

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job History Table */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>Job History ({sortedJobs.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading job history...</div>
          ) : sortedJobs.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No job history found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your search filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Vehicle
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Title
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Type
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Priority
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Cost
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job: any) => (
                    <tr key={job.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-xs font-medium">
                        {getVehicleRegistration(job)}
                      </td>
                      <td className="p-2 text-xs">
                        <div className="flex items-center gap-2">
                          {getJobTypeIcon(job.job_type)}
                          <span>{job.job_title}</span>
                        </div>
                      </td>
                      <td className="p-2 text-xs capitalize">
                        {job.job_type?.replace("_", " ")}
                      </td>
                      <td className="p-2">
                        <Badge
                          className={`${getStatusColor(job.job_status)} text-xs`}
                          variant="outline"
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(job.job_status)}
                            {job.job_status?.replace("_", " ")}
                          </div>
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge
                          className={`${getPriorityColor(job.job_priority)} text-xs`}
                          variant="outline"
                        >
                          {job.job_priority}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs">
                        £{job.actual_cost || job.estimated_cost || "0.00"}
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Successful Completion Rate
                </span>
                <span className="font-semibold">
                  {filteredJobs.length > 0
                    ? Math.round(
                        (completedJobs.length / filteredJobs.length) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      filteredJobs.length > 0
                        ? (completedJobs.length / filteredJobs.length) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    {completedJobs.length}
                  </div>
                  <div className="text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">
                    {failedJobs.length}
                  </div>
                  <div className="text-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">
                    {cancelledJobs.length}
                  </div>
                  <div className="text-gray-500">Cancelled</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Average Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Job Cost</span>
                <span className="font-semibold">
                  £
                  {filteredJobs.length > 0
                    ? (
                        filteredJobs.reduce(
                          (sum: number, job: any) =>
                            sum +
                            parseFloat(
                              job.actual_cost || job.estimated_cost || "0",
                            ),
                          0,
                        ) / filteredJobs.length
                      ).toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Value</span>
                <span className="font-semibold">
                  £
                  {filteredJobs
                    .reduce(
                      (sum: number, job: any) =>
                        sum +
                        parseFloat(
                          job.actual_cost || job.estimated_cost || "0",
                        ),
                      0,
                    )
                    .toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Duration</span>
                <span className="font-semibold">
                  {filteredJobs.length > 0
                    ? (
                        filteredJobs.reduce(
                          (sum: number, job: any) =>
                            sum +
                            parseFloat(
                              job.actual_duration_hours ||
                                job.estimated_duration_hours ||
                                "0",
                            ),
                          0,
                        ) / filteredJobs.length
                      ).toFixed(1)
                    : "0.0"}
                  h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job View Modal */}
      <LogisticsJobViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
      />
    </div>
  );
}
