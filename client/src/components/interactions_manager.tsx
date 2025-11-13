import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Phone,
 Mail,
 MessageSquare,
 User,
 Calendar,
 Plus,
 Edit3,
 Clock,
 AlertCircle,
 CheckCircle,
 XCircle,
 Eye,
 ArrowRight,
 Send,
 Users,
 Car,
 FileText,
 Star,
 TrendingUp,
 Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Interaction, InsertInteraction, User as UserType } from "@shared/schema";
import { insertInteractionSchema } from "@shared/schema";

// Form schema for creating/editing interactions
const interactionFormSchema = z.object({
 interaction_type: z.string().min(1, "Communication type is required"),
 interaction_direction: z.enum(["inbound", "outbound"]),
 interaction_subject: z.string().min(1, "Subject is required"),
 interaction_notes: z.string().min(1, "Notes are required"),
 interaction_outcome: z.string().optional(),
 duration_minutes: z.number().optional(),
 follow_up_required: z.boolean().default(false),
 follow_up_date: z.string().optional(),
 follow_up_priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
 follow_up_notes: z.string().optional(),
 user_id: z.number().min(1, "Staff member is required"),
});

type InteractionFormData = z.infer<typeof interactionFormSchema>;

interface interactions_manager_props {
 leadId?: number;
 mode?: "add" | "edit" | "view";
}

export function Interactions_Manager({ leadId, mode = "view" }: interactions_manager_props) {
 const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
 const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
 const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
 const { toast } = useToast();
 const queryClient = useQueryClient();

 // Fetch interactions for this lead
 const { data: interactions = [], isLoading: isLoadingInteractions } = useQuery<Interaction[]>({
  queryKey: [`/api/leads/${leadId}/interactions`],
  enabled: !!leadId,
 });

 // Fetch users for staff assignment
 const { data: users = [] } = useQuery<UserType[]>({
  queryKey: ["/api/users"],
 });

 // Form for adding/editing interactions
 const form = useForm<InteractionFormData>({
  resolver: zodResolver(interactionFormSchema),
  defaultValues: {
   interaction_type: "",
   interaction_direction: "outbound",
   interaction_subject: "",
   interaction_notes: "",
   interaction_outcome: "",
   duration_minutes: undefined,
   follow_up_required: false,
   follow_up_date: "",
   follow_up_priority: "medium",
   follow_up_notes: "",
   user_id: 1, // Default to first user
  },
 });

 // Create interaction mutation
 const createInteractionMutation = useMutation({
  mutationFn: async (data: InteractionFormData) => {
   const transformedData = {
    ...data,
    lead_id: leadId,
    duration_minutes: data.duration_minutes || null,
    follow_up_date: data.follow_up_date ? new Date(data.follow_up_date).toISOString() : null,
    follow_up_notes: data.follow_up_notes || null,
    interaction_outcome: data.interaction_outcome || null,
   };

   return await apiRequest("/api/interactions", "POST", transformedData);
  },
  onSuccess: () => {
   toast({
    title: "Success",
    description: "Interaction added successfully",
   });
   queryClient.invalidateQueries({
    queryKey: ["/api/leads", leadId, "interactions"],
   });
   setIsAddDialogOpen(false);
   form.reset();
  },
  onError: error => {
   toast({
    title: "Error",
    description: "Failed to add interaction. Please try again.",
    variant: "destructive",
   });
  },
 });

 const onSubmit = (data: InteractionFormData) => {
  createInteractionMutation.mutate(data);
 };

 // Communication type options with icons
 const communicationTypes = [
  { value: "phone_call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "in_person", label: "In Person", icon: User },
  { value: "test_drive", label: "Test Drive", icon: Car },
  { value: "viewing", label: "Vehicle Viewing", icon: Eye },
  { value: "follow_up", label: "Follow Up", icon: ArrowRight },
  { value: "quote_sent", label: "Quote Sent", icon: Send },
  {
   value: "finance_discussion",
   label: "Finance Discussion",
   icon: TrendingUp,
  },
  { value: "objection_handling", label: "Objection Handling", icon: Target },
  { value: "closing_attempt", label: "Closing Attempt", icon: Star },
 ];

 // Outcome options with colors
 const outcomeOptions = [
  { value: "positive", label: "Positive", color: "green" },
  { value: "neutral", label: "Neutral", color: "gray" },
  { value: "negative", label: "Negative", color: "red" },
  { value: "no_answer", label: "No Answer", color: "yellow" },
  { value: "callback_requested", label: "Callback Requested", color: "blue" },
  {
   value: "appointment_scheduled",
   label: "Appointment Scheduled",
   color: "purple",
  },
  { value: "sale_progressed", label: "Sale Progressed", color: "green" },
  { value: "lost_lead", label: "Lost Lead", color: "red" },
 ];

 // Get icon for communication type
 const getTypeIcon = (type: string) => {
  const typeOption = communicationTypes.find(t => t.value === type);
  return typeOption ? typeOption.icon : FileText;
 };

 // Get badge color for outcome
 const getOutcomeBadgeColor = (outcome: string) => {
  const outcomeOption = outcomeOptions.find(o => o.value === outcome);
  return outcomeOption?.color || "gray";
 };

 // Format date
 const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
 };

 // If no lead ID, show message
 if (!leadId) {
  return (
   <Card>
    <CardHeader>
     <CardTitle>Interactions</CardTitle>
     <CardDescription>Interaction tracking is available for existing leads</CardDescription>
    </CardHeader>
    <CardContent>
     <div className="text-center py-8 text-muted-foreground">
      Save the lead first to start tracking interactions
     </div>
    </CardContent>
   </Card>
  );
 }

 return (
  <div className="space-y-6">
   {/* Header with Add Button */}
   <div className="flex justify-between items-center">
    <div>
     <h3 className="text-lg font-semibold">Interaction History</h3>
     <p className="text-sm text-muted-foreground">Track all communications and follow-ups with this lead</p>
    </div>
    {mode !== "view" && (
     <Button onClick={() => setIsAddDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
      <Plus className="h-4 w-4 mr-2" />
      Add Interaction
     </Button>
    )}
   </div>

   {/* Interactions List */}
   <div className="space-y-4">
    {isLoadingInteractions ? (
     <div className="text-center py-8">Loading interactions...</div>
    ) : interactions.length === 0 ? (
     <Card>
      <CardContent className="pt-6">
       <div className="text-center py-8 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No interactions recorded yet</p>
        <p className="text-sm">Start by adding your first interaction with this lead</p>
       </div>
      </CardContent>
     </Card>
    ) : (
     interactions.map((interaction: Interaction) => {
      const TypeIcon = getTypeIcon(interaction.interaction_type);
      return (
       <Card key={interaction.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
         <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
           <div className="flex-shrink-0">
            <TypeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
           </div>
           <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
             <h4 className="font-medium truncate">{interaction.interaction_subject}</h4>
             <Badge variant="outline" className="capitalize">
              {interaction.interaction_type.replace("_", " ")}
             </Badge>
             <Badge
              variant={interaction.interaction_direction === "inbound" ? "default" : "secondary"}
              className="capitalize"
             >
              {interaction.interaction_direction}
             </Badge>
             {interaction.interaction_outcome && (
              <Badge
               variant="outline"
               className={`capitalize border-${getOutcomeBadgeColor(interaction.interaction_outcome)}-300 text-${getOutcomeBadgeColor(interaction.interaction_outcome)}-700`}
              >
               {interaction.interaction_outcome.replace("_", " ")}
              </Badge>
             )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{interaction.interaction_notes}</p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
             <span className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(interaction.created_at)}
             </span>
             {interaction.duration_minutes && (
              <span className="flex items-center">
               <Clock className="h-3 w-3 mr-1" />
               {interaction.duration_minutes} minutes
              </span>
             )}
             {interaction.follow_up_required && (
              <span className="flex items-center text-orange-600">
               <AlertCircle className="h-3 w-3 mr-1" />
               Follow-up required
              </span>
             )}
            </div>
            {interaction.follow_up_required && interaction.follow_up_date && (
             <div className="mt-2 p-2 bg-orange-50 rounded-md">
              <div className="flex items-center space-x-2">
               <AlertCircle className="h-4 w-4 text-orange-600" />
               <span className="text-sm text-orange-700">
                Follow-up scheduled: {formatDate(interaction.follow_up_date)}
               </span>
               <Badge variant="outline" className="capitalize">
                {interaction.follow_up_priority}
               </Badge>
              </div>
              {interaction.follow_up_notes && (
               <p className="text-sm text-orange-700 mt-1 ml-6">{interaction.follow_up_notes}</p>
              )}
             </div>
            )}
           </div>
          </div>
         </div>
        </CardContent>
       </Card>
      );
     })
    )}
   </div>

   {/* Add Interaction Dialog */}
   <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
     <DialogHeader>
      <DialogTitle>Add New Interaction</DialogTitle>
      <DialogDescription>Record a new communication or activity with this lead</DialogDescription>
     </DialogHeader>

     <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
       <div className="grid grid-cols-2 gap-4">
        {/* Communication Type */}
        <FormField
         control={form.control}
         name="interaction_type"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Communication Type</FormLabel>
           <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
             <SelectTrigger>
              <SelectValue placeholder="Select type" />
             </SelectTrigger>
            </FormControl>
            <SelectContent>
             {communicationTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
               <div className="flex items-center space-x-2">
                <type.icon className="h-4 w-4" />
                <span>{type.label}</span>
               </div>
              </SelectItem>
             ))}
            </SelectContent>
           </Select>
           <FormMessage />
          </FormItem>
         )}
        />

        {/* Direction */}
        <FormField
         control={form.control}
         name="interaction_direction"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Direction</FormLabel>
           <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
             <SelectTrigger>
              <SelectValue placeholder="Select direction" />
             </SelectTrigger>
            </FormControl>
            <SelectContent>
             <SelectItem value="inbound">Inbound (Customer contacted us)</SelectItem>
             <SelectItem value="outbound">Outbound (We contacted customer)</SelectItem>
            </SelectContent>
           </Select>
           <FormMessage />
          </FormItem>
         )}
        />
       </div>

       {/* Subject */}
       <FormField
        control={form.control}
        name="interaction_subject"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Subject</FormLabel>
          <FormControl>
           <Input placeholder="e.g., Initial inquiry about BMW 3 Series" {...field} />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Notes */}
       <FormField
        control={form.control}
        name="interaction_notes"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
           <Textarea
            placeholder="Detailed notes about the interaction..."
            className="min-h-[100px]"
            {...field}
           />
          </FormControl>
          <FormMessage />
         </FormItem>
        )}
       />

       <div className="grid grid-cols-2 gap-4">
        {/* Outcome */}
        <FormField
         control={form.control}
         name="interaction_outcome"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Outcome (Optional)</FormLabel>
           <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
             <SelectTrigger>
              <SelectValue placeholder="Select outcome" />
             </SelectTrigger>
            </FormControl>
            <SelectContent>
             {outcomeOptions.map(outcome => (
              <SelectItem key={outcome.value} value={outcome.value}>
               {outcome.label}
              </SelectItem>
             ))}
            </SelectContent>
           </Select>
           <FormMessage />
          </FormItem>
         )}
        />

        {/* Duration */}
        <FormField
         control={form.control}
         name="duration_minutes"
         render={({ field }) => (
          <FormItem>
           <FormLabel>Duration (Minutes)</FormLabel>
           <FormControl>
            <Input
             type="number"
             placeholder="e.g., 15"
             {...field}
             onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
            />
           </FormControl>
           <FormMessage />
          </FormItem>
         )}
        />
       </div>

       {/* Staff Member */}
       <FormField
        control={form.control}
        name="user_id"
        render={({ field }) => (
         <FormItem>
          <FormLabel>Staff Member</FormLabel>
          <Select onValueChange={value => field.onChange(parseInt(value))} value={field.value.toString()}>
           <FormControl>
            <SelectTrigger>
             <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
           </FormControl>
           <SelectContent>
            {users.map((user: UserType) => (
             <SelectItem key={user.id} value={user.id.toString()}>
              {user.first_name} {user.last_name}
             </SelectItem>
            ))}
           </SelectContent>
          </Select>
          <FormMessage />
         </FormItem>
        )}
       />

       {/* Follow-up Section */}
       <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <FormField
         control={form.control}
         name="follow_up_required"
         render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between">
           <div className="space-y-0.5">
            <FormLabel>Follow-up Required</FormLabel>
            <div className="text-sm text-muted-foreground">Schedule a follow-up for this interaction</div>
           </div>
           <FormControl>
            <input
             type="checkbox"
             checked={field.value}
             onChange={field.onChange}
             className="h-4 w-4 text-red-600"
            />
           </FormControl>
          </FormItem>
         )}
        />

        {form.watch("follow_up_required") && (
         <div className="grid grid-cols-2 gap-4">
          <FormField
           control={form.control}
           name="follow_up_date"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Follow-up Date</FormLabel>
             <FormControl>
              <Input type="datetime-local" {...field} />
             </FormControl>
             <FormMessage />
            </FormItem>
           )}
          />

          <FormField
           control={form.control}
           name="follow_up_priority"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Priority</FormLabel>
             <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
               <SelectTrigger>
                <SelectValue placeholder="Select priority" />
               </SelectTrigger>
              </FormControl>
              <SelectContent>
               <SelectItem value="low">Low</SelectItem>
               <SelectItem value="medium">Medium</SelectItem>
               <SelectItem value="high">High</SelectItem>
               <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
             </Select>
             <FormMessage />
            </FormItem>
           )}
          />
         </div>
        )}

        {form.watch("follow_up_required") && (
         <FormField
          control={form.control}
          name="follow_up_notes"
          render={({ field }) => (
           <FormItem>
            <FormLabel>Follow-up Notes</FormLabel>
            <FormControl>
             <Textarea
              placeholder="Additional notes for the follow-up..."
              className="min-h-[60px]"
              {...field}
             />
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />
        )}
       </div>

       {/* Form Actions */}
       <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
         Cancel
        </Button>
        <Button
         type="submit"
         disabled={createInteractionMutation.isPending}
         className="bg-red-600 hover:bg-red-700"
        >
         {createInteractionMutation.isPending ? "Adding..." : "Add Interaction"}
        </Button>
       </div>
      </form>
     </Form>
    </DialogContent>
   </Dialog>
  </div>
 );
}
