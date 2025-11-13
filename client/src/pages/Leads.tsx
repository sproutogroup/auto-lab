import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 Plus,
 Search,
 Filter,
 User,
 Car,
 Phone,
 Mail,
 Calendar,
 TrendingUp,
 Users,
 Target,
 Award,
 Eye,
 Edit,
 Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Lead_Modal from "@/components/lead_modal";
import type { Lead, Vehicle } from "@shared/schema";

export default function Leads() {
 const [search_term, set_search_term] = useState("");
 const [stage_filter, set_stage_filter] = useState("all");
 const [source_filter, set_source_filter] = useState("all");
 const [quality_filter, set_quality_filter] = useState("all");
 const [is_lead_modal_open, set_is_lead_modal_open] = useState(false);
 const [selected_lead, set_selected_lead] = useState<Lead | undefined>();
 const [modal_mode, set_modal_mode] = useState<"add" | "edit" | "view">("add");

 const { toast } = useToast();
 const query_client = useQueryClient();

 // Fetch leads
 const { data: leads = [], is_loading } = useQuery<Lead[]>({
  queryKey: ["/api/leads"],
 });

 // Fetch vehicles for assignment display
 const { data: vehicles = [] } = useQuery<Vehicle[]>({
  queryKey: ["/api/vehicles"],
 });

 // Fetch lead statistics
 const { data: lead_stats } = useQuery<{
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  hotLeads: number;
  conversionRate: number;
  leadsByStage: Array<{ stage: string; count: number }>;
  leadsBySource: Array<{ source: string; count: number }>;
  topPerformers: Array<{
   salespersonId: number;
   name: string;
   leadsAssigned: number;
   conversions: number;
   conversionRate: number;
  }>;
 }>({
  queryKey: ["/api/leads/stats"],
 });

 // Delete lead mutation
 const deleteLead = useMutation({
  mutationFn: async (id: number) => {
   const response = await fetch(`/api/leads/${id}`, {
    method: "DELETE",
   });
   if (!response.ok) throw new Error("Failed to delete lead");
   return response.json();
  },
  onSuccess: () => {
   query_client.invalidateQueries({ queryKey: ["/api/leads"] });
   query_client.invalidateQueries({ queryKey: ["/api/leads/stats"] });
   toast({
    title: "Success",
    description: "Lead deleted successfully",
   });
  },
  onError: (error: Error) => {
   toast({
    title: "Error",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 // Filter leads based on search and filters
 const filtered_leads = leads.filter(lead => {
  const matchesSearch =
   lead.first_name?.toLowerCase().includes(search_term.toLowerCase()) ||
   lead.last_name?.toLowerCase().includes(search_term.toLowerCase()) ||
   lead.email?.toLowerCase().includes(search_term.toLowerCase()) ||
   lead.primary_phone?.includes(search_term);

  const matchesStage = stage_filter === "all" || lead.pipeline_stage === stage_filter;
  const matchesSource = source_filter === "all" || lead.lead_source === source_filter;
  const matchesQuality = quality_filter === "all" || lead.lead_quality === quality_filter;

  return matchesSearch && matchesStage && matchesSource && matchesQuality;
 });

 const handle_edit_lead = (lead: Lead) => {
  set_selected_lead(lead);
  set_modal_mode("edit");
  set_is_lead_modal_open(true);
 };

 const handle_view_lead = (lead: Lead) => {
  set_selected_lead(lead);
  set_modal_mode("view");
  set_is_lead_modal_open(true);
 };

 const handleAddLead = () => {
  set_selected_lead(undefined);
  set_modal_mode("add");
  set_is_lead_modal_open(true);
 };

 const handle_delete_lead = (id: number) => {
  if (confirm("Are you sure you want to delete this lead?")) {
   deleteLead.mutate(id);
  }
 };

 const getStageColor = (stage: string) => {
  switch (stage) {
   case "new":
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
   case "contacted":
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
   case "qualified":
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
   case "test_drive_booked":
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
   case "test_drive_completed":
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
   case "negotiating":
    return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
   case "deposit_taken":
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
   case "finance_pending":
    return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300";
   case "converted":
    return "bg-green-500 text-white";
   case "lost":
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
   default:
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
 };

 const getQualityColor = (quality: string) => {
  switch (quality) {
   case "hot":
    return "bg-red-500 text-white";
   case "warm":
    return "bg-orange-500 text-white";
   case "cold":
    return "bg-blue-500 text-white";
   case "unqualified":
    return "bg-gray-500 text-white";
   default:
    return "bg-gray-500 text-white";
  }
 };

 const getPriorityColor = (priority: string) => {
  switch (priority) {
   case "urgent":
    return "bg-red-600 text-white";
   case "high":
    return "bg-orange-600 text-white";
   case "medium":
    return "bg-yellow-600 text-white";
   case "low":
    return "bg-green-600 text-white";
   default:
    return "bg-gray-600 text-white";
  }
 };

 if (is_loading) {
  return (
   <div className="p-6">
    <div className="animate-pulse space-y-4">
     <div className="h-8 bg-gray-200 rounded w-1/4"></div>
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
       <div key={i} className="h-24 bg-gray-200 rounded"></div>
      ))}
     </div>
    </div>
   </div>
  );
 }

 return (
  <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
   {/* Statistics Cards - Moved to Top */}

   {/* Statistics Cards - Matching Schedule Page Layout */}
   {lead_stats && (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
     <Card className="border-l-4 border-l-gray-500">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">Total Leads</p>
         <p className="text-lg lg:text-2xl font-bold text-gray-900">{lead_stats.totalLeads}</p>
        </div>
        <Users className="h-6 w-6 lg:h-8 lg:w-8 text-gray-500" />
       </div>
      </CardContent>
     </Card>

     <Card className="border-l-4 border-l-red-500">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">Hot Leads</p>
         <p className="text-lg lg:text-2xl font-bold text-red-600">{lead_stats.hotLeads}</p>
        </div>
        <Target className="h-6 w-6 lg:h-8 lg:w-8 text-red-500" />
       </div>
      </CardContent>
     </Card>

     <Card className="border-l-4 border-l-green-500">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">Conversion Rate</p>
         <p className="text-lg lg:text-2xl font-bold text-green-600">
          {lead_stats.conversionRate.toFixed(1)}%
         </p>
        </div>
        <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
       </div>
      </CardContent>
     </Card>

     <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-3 lg:p-4">
       <div className="flex items-center justify-between">
        <div>
         <p className="text-xs lg:text-sm font-medium text-gray-600">New Leads</p>
         <p className="text-lg lg:text-2xl font-bold text-blue-600">{lead_stats.newLeads}</p>
        </div>
        <Award className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
       </div>
      </CardContent>
     </Card>
    </div>
   )}

   {/* Search and Filter Controls - Horizontal Layout */}
   <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
    {/* Search Input */}
    <div className="relative flex-1">
     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
     <Input
      placeholder="Search leads by name, email, or phone..."
      value={search_term}
      onChange={e => set_search_term(e.target.value)}
      className="pl-10 text-base"
      style={{ fontSize: "16px" }}
     />
    </div>

    {/* Filter Controls */}
    <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
     <Select value={stage_filter} onValueChange={set_stage_filter}>
      <SelectTrigger className="w-[140px] sm:w-[160px]">
       <SelectValue placeholder="All Stages" />
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="all">All Stages</SelectItem>
       <SelectItem value="new">New</SelectItem>
       <SelectItem value="contacted">Contacted</SelectItem>
       <SelectItem value="qualified">Qualified</SelectItem>
       <SelectItem value="test_drive_booked">Test Drive Booked</SelectItem>
       <SelectItem value="test_drive_completed">Test Drive Completed</SelectItem>
       <SelectItem value="negotiating">Negotiating</SelectItem>
       <SelectItem value="deposit_taken">Deposit Taken</SelectItem>
       <SelectItem value="finance_pending">Finance Pending</SelectItem>
       <SelectItem value="converted">Converted</SelectItem>
       <SelectItem value="lost">Lost</SelectItem>
      </SelectContent>
     </Select>

     <Select value={quality_filter} onValueChange={set_quality_filter}>
      <SelectTrigger className="w-[130px] sm:w-[150px]">
       <SelectValue placeholder="All Quality" />
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="all">All Quality</SelectItem>
       <SelectItem value="hot">Hot</SelectItem>
       <SelectItem value="warm">Warm</SelectItem>
       <SelectItem value="cold">Cold</SelectItem>
       <SelectItem value="unqualified">Unqualified</SelectItem>
      </SelectContent>
     </Select>

     <Select value={source_filter} onValueChange={set_source_filter}>
      <SelectTrigger className="w-[130px] sm:w-[150px]">
       <SelectValue placeholder="All Sources" />
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="all">All Sources</SelectItem>
       <SelectItem value="AutoTrader">AutoTrader</SelectItem>
       <SelectItem value="Facebook Marketplace">Facebook</SelectItem>
       <SelectItem value="Website">Website</SelectItem>
       <SelectItem value="Walk-in">Walk-in</SelectItem>
       <SelectItem value="Referral">Referral</SelectItem>
       <SelectItem value="Phone Inquiry">Phone</SelectItem>
      </SelectContent>
     </Select>
    </div>

    {/* Add New Lead Button */}
    <Button onClick={handleAddLead} className="bg-red-600 hover:bg-red-700 h-10 w-10 p-0 shrink-0">
     <Plus className="w-4 h-4" />
    </Button>
   </div>

   {/* Professional Leads Grid - Desktop */}
   <Card className="hidden md:block">
    <CardContent className="p-0">
     {/* Grid Header */}
     <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
       <div className="col-span-3">NAME</div>
       <div className="col-span-3">VEHICLE</div>
       <div className="col-span-2">LAST CONTACT</div>
       <div className="col-span-2">STAGE</div>
       <div className="col-span-2">ACTIONS</div>
      </div>
     </div>

     {/* Grid Rows */}
     <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {filtered_leads.map(lead => {
       const assignedVehicle = vehicles.find(v => v.id === lead.assigned_vehicle_id);
       const lastContactDate = lead.last_contact_date
        ? new Date(lead.last_contact_date).toLocaleDateString("en-GB", {
           day: "2-digit",
           month: "short",
           year: "numeric",
          })
        : "No contact";

       return (
        <div
         key={lead.id}
         className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
        >
         {/* Name Column */}
         <div className="col-span-3 flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
           <User className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
           <div className="font-medium text-gray-900 dark:text-white truncate">
            {lead.first_name} {lead.last_name}
           </div>
           <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {lead.email || lead.primary_phone || "No contact info"}
           </div>
          </div>
         </div>

         {/* Vehicle Column */}
         <div className="col-span-3 flex items-center">
          <div className="min-w-0">
           {assignedVehicle ? (
            <>
             <div className="font-medium text-gray-900 dark:text-white truncate">
              {assignedVehicle.year} {assignedVehicle.make} {assignedVehicle.model}
             </div>
             <div className="text-sm text-gray-500 dark:text-gray-400">
              Reg: {assignedVehicle.registration || assignedVehicle.stock_number}
             </div>
            </>
           ) : (
            <span className="text-gray-400 dark:text-gray-500 italic">No vehicle assigned</span>
           )}
          </div>
         </div>

         {/* Last Contact Column */}
         <div className="col-span-2 flex items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">{lastContactDate}</span>
         </div>

         {/* Stage Column */}
         <div className="col-span-2 flex items-center">
          <Badge className={`text-xs ${getStageColor(lead.pipeline_stage || "new")}`}>
           {lead.pipeline_stage?.replace(/_/g, " ") || "New"}
          </Badge>
         </div>

         {/* Actions Column */}
         <div className="col-span-2 flex items-center space-x-2">
          <Button
           size="sm"
           variant="outline"
           onClick={() => handle_view_lead(lead)}
           className="px-3 h-8"
           title="View Lead"
          >
           <Eye className="w-4 h-4" />
          </Button>
          <Button
           size="sm"
           variant="outline"
           onClick={() => handle_edit_lead(lead)}
           className="px-3 h-8"
           title="Edit Lead"
          >
           <Edit className="w-4 h-4" />
          </Button>
          <Button
           size="sm"
           variant="destructive"
           onClick={() => handle_delete_lead(lead.id)}
           className="px-3 h-8"
           title="Delete Lead"
          >
           <Trash2 className="w-4 h-4" />
          </Button>
         </div>
        </div>
       );
      })}
     </div>
    </CardContent>
   </Card>

   {/* Mobile Lead Cards */}
   <div className="md:hidden space-y-3">
    {filtered_leads.map(lead => {
     const assignedVehicle = vehicles.find(v => v.id === lead.assigned_vehicle_id);
     const lastContactDate = lead.last_contact_date
      ? new Date(lead.last_contact_date).toLocaleDateString("en-GB", {
         day: "2-digit",
         month: "short",
         year: "numeric",
        })
      : "No contact";

     return (
      <Card key={lead.id} className="p-3 hover:shadow-md transition-shadow">
       <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
         <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
           <User className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
           <div className="font-medium text-gray-900 dark:text-white text-sm">
            {lead.first_name} {lead.last_name}
           </div>
          </div>
         </div>
         <Badge className={`text-xs ${getStageColor(lead.pipeline_stage || "new")}`}>
          {lead.pipeline_stage?.replace(/_/g, " ") || "New"}
         </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2">
         <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Contact:</span>
          <span>{lead.email || lead.primary_phone || "No contact info"}</span>
         </div>

         <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Vehicle:</span>
          <span>
           {assignedVehicle ? (
            `${assignedVehicle.year} ${assignedVehicle.make} ${assignedVehicle.model}`
           ) : (
            <span className="italic">No vehicle assigned</span>
           )}
          </span>
         </div>

         <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Last Contact:</span>
          <span>{lastContactDate}</span>
         </div>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
         <Button
          size="sm"
          variant="outline"
          onClick={() => handle_view_lead(lead)}
          className="flex-1 h-8 text-xs"
         >
          <Eye className="w-3 h-3 mr-1" />
          View
         </Button>
         <Button
          size="sm"
          variant="outline"
          onClick={() => handle_edit_lead(lead)}
          className="flex-1 h-8 text-xs"
         >
          <Edit className="w-3 h-3 mr-1" />
          Edit
         </Button>
         <Button
          size="sm"
          variant="destructive"
          onClick={() => handle_delete_lead(lead.id)}
          className="px-2 h-8"
         >
          <Trash2 className="w-3 h-3" />
         </Button>
        </div>
       </div>
      </Card>
     );
    })}
   </div>

   {filtered_leads.length === 0 && (
    <Card>
     <CardContent className="text-center py-8 sm:py-6">
      <User className="h-12 w-12 text-gray-400 mx-auto mb-4 sm:h-8 sm:w-8 sm:mb-3" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 sm:text-base sm:mb-1">
       No leads found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 sm:text-sm">
       {search_term || stage_filter !== "all" || source_filter !== "all" || quality_filter !== "all"
        ? "Try adjusting your search criteria"
        : "Get started by adding your first lead"}
      </p>
     </CardContent>
    </Card>
   )}

   {/* Lead Modal */}
   <Lead_Modal
    isOpen={is_lead_modal_open}
    onClose={() => set_is_lead_modal_open(false)}
    lead={selected_lead}
    mode={modal_mode}
   />
  </div>
 );
}
