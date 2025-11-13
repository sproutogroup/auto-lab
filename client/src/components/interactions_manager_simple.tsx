import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Phone, Mail, MessageSquare, User, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Interaction, User as UserType } from "@shared/schema";

// Form schema for creating interactions
const interaction_form_schema = z.object({
 interaction_type: z.string().min(1, "Communication type is required"),
 interaction_direction: z.enum(["inbound", "outbound"]),
 interaction_date: z.string().min(1, "Date is required"),
 interaction_notes: z.string().min(1, "Notes are required"),
 interaction_outcome: z.string().optional(),
 duration_minutes: z.number().optional(),
 follow_up_required: z.boolean().default(false),
 follow_up_date: z.string().optional(),
 follow_up_priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
 follow_up_notes: z.string().optional(),
 user_id: z.number().min(1, "Staff member is required"),
});

type InteractionFormData = z.infer<typeof interaction_form_schema>;

interface SimpleInteractionsManagerProps {
 leadId?: number;
 mode?: "add" | "edit" | "view";
 onInteractionProgress?: (inProgress: boolean) => void;
}

export function SimpleInteractionsManager({
 leadId,
 mode = "view",
 onInteractionProgress,
}: SimpleInteractionsManagerProps) {
 const [is_add_dialog_open, set_is_add_dialog_open] = useState(false);
 const { toast } = useToast();
 const queryClient = useQueryClient();

 // Fetch interactions for this lead
 const { data: interactions = [], isLoading: is_loading_interactions } = useQuery<Interaction[]>({
  queryKey: [`/api/leads/${leadId}/interactions`],
  enabled: !!leadId,
 });

 // Fetch users for staff assignment
 const { data: users = [] } = useQuery<UserType[]>({
  queryKey: ["/api/users"],
 });

 // Form for adding interactions
 const form = useForm<InteractionFormData>({
  resolver: zodResolver(interaction_form_schema),
  defaultValues: {
   interaction_type: "",
   interaction_direction: "outbound",
   interaction_date: "",
   interaction_notes: "",
   interaction_outcome: "",
   duration_minutes: undefined,
   follow_up_required: false,
   follow_up_date: "",
   follow_up_priority: "medium",
   follow_up_notes: "",
   user_id: 2, // Default to system user
  },
 });

 // Update user_id when users data loads
 useEffect(() => {
  if (users.length > 0 && !form.getValues("user_id")) {
   form.setValue("user_id", users[0].id);
  }
 }, [users, form]);

 // Create interaction mutation
 const create_interaction_mutation = useMutation({
  mutationFn: async (data: InteractionFormData) => {
   // Set interaction progress flag
   onInteractionProgress?.(true);

   const transformed_data = {
    lead_id: leadId,
    user_id: data.user_id,
    interaction_type: data.interaction_type,
    interaction_direction: data.interaction_direction,
    interaction_subject: data.interaction_date, // Map date to subject field for API compatibility
    interaction_notes: data.interaction_notes,
    interaction_outcome: data.interaction_outcome || null,
    duration_minutes: data.duration_minutes || null,
    follow_up_required: data.follow_up_required,
    follow_up_date: data.follow_up_date,
    follow_up_priority: data.follow_up_priority,
    follow_up_notes: data.follow_up_notes || null,
   };

   const response = await apiRequest("POST", "/api/interactions", transformed_data);
   return await response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({
    queryKey: [`/api/leads/${leadId}/interactions`],
   });
   set_is_add_dialog_open(false);
   form.reset();
   toast({
    title: "Success",
    description: "Interaction added successfully",
   });

   // Clear interaction progress flag after a short delay to allow for any lead updates
   setTimeout(() => {
    onInteractionProgress?.(false);
   }, 1000);
  },
  onError: error => {
   // Clear interaction progress flag on error
   onInteractionProgress?.(false);

   toast({
    title: "Error",
    description: "Failed to add interaction",
    variant: "destructive",
   });
  },
 });

 const on_submit = (data: InteractionFormData) => {
  // Validate required fields
  if (!data.interaction_type || !data.interaction_direction || !data.interaction_notes) {
   toast({
    title: "Validation Error",
    description: "Please fill in all required fields",
    variant: "destructive",
   });
   return;
  }

  create_interaction_mutation.mutate(data);
 };

 const format_date = (dateString: string | Date | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
 };

 const get_interaction_icon = (type: string) => {
  switch (type) {
   case "phone_call":
    return <Phone className="h-4 w-4" />;
   case "email":
    return <Mail className="h-4 w-4" />;
   case "sms":
    return <MessageSquare className="h-4 w-4" />;
   case "in_person":
    return <User className="h-4 w-4" />;
   case "test_drive":
    return <Calendar className="h-4 w-4" />;
   default:
    return <Clock className="h-4 w-4" />;
  }
 };

 const get_interaction_badge_color = (type: string) => {
  switch (type) {
   case "phone_call":
    return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
   case "email":
    return "bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-800 dark:text-stone-300";
   case "sms":
    return "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300";
   case "in_person":
    return "bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300";
   case "test_drive":
    return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
   default:
    return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
  }
 };

 if (is_loading_interactions) {
  return (
   <div className="space-y-4">
    <div className="h-8 bg-gray-200 rounded animate-pulse" />
    <div className="h-32 bg-gray-200 rounded animate-pulse" />
   </div>
  );
 }

 // If no lead ID, show message
 if (!leadId) {
  return (
   <Card>
    <CardHeader>
     <CardTitle>Interactions</CardTitle>
     <CardDescription>Save the lead first to start tracking interactions</CardDescription>
    </CardHeader>
    <CardContent>
     <div className="text-center py-8 text-muted-foreground">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
       <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
       <p className="text-sm">Interaction tracking will be available after saving the lead</p>
      </div>
     </div>
    </CardContent>
   </Card>
  );
 }

 return (
  <div className="space-y-6">
   {/* Header - Mobile Optimized */}
   <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
    <div>
     <h3 className="text-base sm:text-lg font-semibold">Interactions</h3>
     <p className="text-xs sm:text-sm text-gray-500">Communication history and follow-ups</p>
    </div>
    {mode !== "view" && (
     <Dialog open={is_add_dialog_open} onOpenChange={set_is_add_dialog_open}>
      <DialogTrigger asChild>
       <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto h-10 sm:h-auto">
        <Plus className="h-4 w-4 mr-2" />
        Add Interaction
       </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
       <DialogHeader>
        <DialogTitle className="text-lg sm:text-xl">Add New Interaction</DialogTitle>
        <DialogDescription>
         Record a new interaction with the customer including communication type and details
        </DialogDescription>
       </DialogHeader>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(on_submit)} className="space-y-3 sm:space-y-4">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Communication Type */}
          <FormField
           control={form.control}
           name="interaction_type"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Communication Type</FormLabel>
             <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
               <SelectTrigger>
                <SelectValue placeholder="Select type" />
               </SelectTrigger>
              </FormControl>
              <SelectContent>
               <SelectItem value="phone_call">Phone Call</SelectItem>
               <SelectItem value="email">Email</SelectItem>
               <SelectItem value="sms">SMS</SelectItem>
               <SelectItem value="in_person">In Person</SelectItem>
               <SelectItem value="test_drive">Test Drive</SelectItem>
               <SelectItem value="viewing">Viewing</SelectItem>
               <SelectItem value="follow_up">Follow Up</SelectItem>
               <SelectItem value="quote_sent">Quote Sent</SelectItem>
               <SelectItem value="finance_discussion">Finance Discussion</SelectItem>
               <SelectItem value="objection_handling">Objection Handling</SelectItem>
               <SelectItem value="closing_attempt">Closing Attempt</SelectItem>
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
             <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
               <SelectTrigger>
                <SelectValue />
               </SelectTrigger>
              </FormControl>
              <SelectContent>
               <SelectItem value="inbound">Inbound</SelectItem>
               <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
             </Select>
             <FormMessage />
            </FormItem>
           )}
          />
         </div>

         {/* Date */}
         <FormField
          control={form.control}
          name="interaction_date"
          render={({ field }) => (
           <FormItem>
            <FormLabel>Date</FormLabel>
            <FormControl>
             <Input type="date" {...field} />
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
              placeholder="Detailed notes about the interaction"
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
             <FormLabel>Outcome</FormLabel>
             <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
               <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
               </SelectTrigger>
              </FormControl>
              <SelectContent>
               <SelectItem value="positive">Positive</SelectItem>
               <SelectItem value="neutral">Neutral</SelectItem>
               <SelectItem value="negative">Negative</SelectItem>
               <SelectItem value="no_answer">No Answer</SelectItem>
               <SelectItem value="callback_requested">Callback Requested</SelectItem>
               <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
               <SelectItem value="sale_progressed">Sale Progressed</SelectItem>
               <SelectItem value="lost_lead">Lost Lead</SelectItem>
              </SelectContent>
             </Select>
             <FormMessage />
            </FormItem>
           )}
          />

          {/* Staff Member */}
          <FormField
           control={form.control}
           name="user_id"
           render={({ field }) => (
            <FormItem>
             <FormLabel>Staff Member</FormLabel>
             <Select
              onValueChange={value => field.onChange(parseInt(value))}
              defaultValue={field.value?.toString()}
             >
              <FormControl>
               <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
               </SelectTrigger>
              </FormControl>
              <SelectContent>
               {users.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                 {user.first_name || user.username} {user.last_name || ""}
                </SelectItem>
               ))}
              </SelectContent>
             </Select>
             <FormMessage />
            </FormItem>
           )}
          />
         </div>

         {/* Follow-up Section */}
         <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <FormField
           control={form.control}
           name="follow_up_required"
           render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
             <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
             </FormControl>
             <div className="space-y-1 leading-none">
              <FormLabel className="text-sm sm:text-base">Follow-up Required</FormLabel>
             </div>
            </FormItem>
           )}
          />

          {form.watch("follow_up_required") && (
           <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
             <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
               <FormItem>
                <FormLabel className="text-sm sm:text-base">Follow-up Date</FormLabel>
                <FormControl>
                 <Input type="date" {...field} className="h-10 sm:h-auto" />
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
                <FormLabel className="text-sm sm:text-base">Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                 <FormControl>
                  <SelectTrigger className="h-10 sm:h-auto">
                   <SelectValue />
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

            <FormField
             control={form.control}
             name="follow_up_notes"
             render={({ field }) => (
              <FormItem>
               <FormLabel>Follow-up Notes</FormLabel>
               <FormControl>
                <Textarea placeholder="Notes for the follow-up" {...field} />
               </FormControl>
               <FormMessage />
              </FormItem>
             )}
            />
           </>
          )}
         </div>

         <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={() => set_is_add_dialog_open(false)}>
           Cancel
          </Button>
          <Button
           type="submit"
           className="bg-red-600 hover:bg-red-700"
           disabled={create_interaction_mutation.isPending}
          >
           {create_interaction_mutation.isPending ? "Adding..." : "Add Interaction"}
          </Button>
         </div>
        </form>
       </Form>
      </DialogContent>
     </Dialog>
    )}
   </div>

   {/* Interactions List - Mobile Optimized */}
   <div className="space-y-3 sm:space-y-4">
    {interactions.length === 0 ? (
     <Card className="sm:py-4">
      <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8">
       <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-3 sm:mb-4" />
       <p className="text-gray-500 text-center text-sm sm:text-base">No interactions recorded yet</p>
       <p className="text-xs sm:text-sm text-gray-400 text-center mt-1 sm:mt-2">
        Add your first interaction to start tracking communication
       </p>
      </CardContent>
     </Card>
    ) : (
     interactions.map((interaction: Interaction) => (
      <Card key={interaction.id} className="hover:shadow-md transition-shadow border-0 shadow-sm">
       <CardContent className="p-3 sm:p-6">
        {/* Mobile Header - Compact */}
        <div className="flex items-start space-x-3 sm:space-x-4 mb-3 sm:mb-4">
         <div className="p-2 sm:p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg flex-shrink-0">
          {get_interaction_icon(interaction.interaction_type || "unknown")}
         </div>
         <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
           <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white truncate">
             {interaction.interaction_subject}
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
             {(interaction.interaction_type || "unknown").replace("_", " ")} •{" "}
             {format_date(interaction.created_at)}
            </p>
           </div>
           <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-2 sm:mt-0 sm:ml-4">
            <Badge
             variant="outline"
             className="capitalize bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-xs"
            >
             {interaction.interaction_direction}
            </Badge>
            {interaction.interaction_outcome && (
             <Badge
              className={`text-xs ${
               interaction.interaction_outcome === "positive"
                ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                : interaction.interaction_outcome === "negative"
                  ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                  : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
             >
              {interaction.interaction_outcome.replace("_", " ")}
             </Badge>
            )}
           </div>
          </div>
         </div>
        </div>

        {/* Interaction Content - Mobile Optimized */}
        <div className="ml-0 sm:ml-16 space-y-2 sm:space-y-3">
         <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
           {interaction.interaction_notes}
          </p>
         </div>

         {/* Follow-up Section - Mobile Optimized */}
         {interaction.follow_up_required && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
           <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">
             Follow-up Required
            </span>
           </div>
           {interaction.follow_up_date && (
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 mb-1">
             <span className="font-medium">Due:</span> {format_date(interaction.follow_up_date)}
            </p>
           )}
           {interaction.follow_up_notes && (
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">
             {interaction.follow_up_notes}
            </p>
           )}
          </div>
         )}
        </div>
       </CardContent>
      </Card>
     ))
    )}
   </div>
  </div>
 );
}
