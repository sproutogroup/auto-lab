import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { WebSocketEvent } from "@/contexts/WebSocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CreatePinModal } from "./CreatePinModal";
import { PinMessageCard } from "./PinMessageCard";
import { Plus, StickyNote, Users, AlertCircle, Star, Clock } from "lucide-react";

interface PinnedMessage {
 id: number;
 title: string;
 content: string;
 author_id: number;
 author_name: string;
 author_username: string;
 is_public: boolean;
 target_user_ids: number[] | null;
 priority: string;
 color_theme: string;
 is_pinned: boolean;
 expires_at: string | null;
 created_at: string;
 updated_at: string;
}

interface User {
 id: number;
 username: string;
 first_name: string;
 last_name: string;
 role: string;
}

export function PinBoard() {
 const { user } = useAuth();
 const { toast } = useToast();
 const queryClient = useQueryClient();
 const { subscribeToEvent } = useWebSocket();
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [editingMessage, setEditingMessage] = useState<PinnedMessage | null>(null);

 // WebSocket event listeners for real-time updates
 useEffect(() => {
  if (!subscribeToEvent) return;

  const unsubscribeCreated = subscribeToEvent(WebSocketEvent.PINNED_MESSAGE_CREATED, data => {
   queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
   if (data.author !== user?.username) {
    toast({
     title: "New Pin",
     description: `${data.author} created a new pin: ${data.message.title}`,
    });
   }
  });

  const unsubscribeUpdated = subscribeToEvent(WebSocketEvent.PINNED_MESSAGE_UPDATED, data => {
   queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
   if (data.author !== user?.username) {
    toast({
     title: "Pin Updated",
     description: `${data.author} updated a pin: ${data.message.title}`,
    });
   }
  });

  const unsubscribeDeleted = subscribeToEvent(WebSocketEvent.PINNED_MESSAGE_DELETED, data => {
   queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
   if (data.author !== user?.username) {
    toast({
     title: "Pin Deleted",
     description: `${data.author} deleted a pin`,
    });
   }
  });

  return () => {
   unsubscribeCreated();
   unsubscribeUpdated();
   unsubscribeDeleted();
  };
 }, [subscribeToEvent, queryClient, toast, user?.username]);

 // Fetch pinned messages
 const { data: messages = [], isLoading: messagesLoading } = useQuery<PinnedMessage[]>({
  queryKey: ["/api/pinned-messages"],
 });

 // Fetch active users for user selection
 const { data: users = [] } = useQuery<User[]>({
  queryKey: ["/api/users/active"],
 });

 // Delete message mutation
 const deleteMutation = useMutation({
  mutationFn: async (messageId: number) => {
   const response = await fetch(`/api/pinned-messages/${messageId}`, {
    method: "DELETE",
   });
   if (!response.ok) throw new Error("Failed to delete message");
   return response.json();
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
   toast({
    title: "Success",
    description: "Message deleted successfully",
   });
  },
  onError: error => {
   toast({
    title: "Error",
    description: "Failed to delete message",
    variant: "destructive",
   });
  },
 });

 const handleDeleteMessage = (messageId: number) => {
  deleteMutation.mutate(messageId);
 };

 const handleEditMessage = (message: PinnedMessage) => {
  setEditingMessage(message);
  setShowCreateModal(true);
 };

 const handleCloseModal = () => {
  setShowCreateModal(false);
  setEditingMessage(null);
 };

 const getPriorityColor = (priority: string) => {
  switch (priority) {
   case "urgent":
    return "bg-red-100 border-red-200 text-red-800";
   case "high":
    return "bg-orange-100 border-orange-200 text-orange-800";
   case "normal":
    return "bg-blue-100 border-blue-200 text-blue-800";
   case "low":
    return "bg-gray-100 border-gray-200 text-gray-800";
   default:
    return "bg-blue-100 border-blue-200 text-blue-800";
  }
 };

 const getPriorityIcon = (priority: string) => {
  switch (priority) {
   case "urgent":
    return <AlertCircle className="h-3 w-3" />;
   case "high":
    return <Star className="h-3 w-3" />;
   case "normal":
    return <Clock className="h-3 w-3" />;
   case "low":
    return <Clock className="h-3 w-3" />;
   default:
    return <Clock className="h-3 w-3" />;
  }
 };

 const getVisibilityText = (message: PinnedMessage) => {
  if (message.is_public) {
   return "Everyone";
  } else if (message.target_user_ids && message.target_user_ids.length > 0) {
   const targetUsers = users.filter(u => message.target_user_ids?.includes(u.id));
   if (targetUsers.length === 1) {
    return `${targetUsers[0].first_name} ${targetUsers[0].last_name}`;
   } else {
    return `${targetUsers.length} users`;
   }
  }
  return "Private";
 };

 if (messagesLoading) {
  return (
   <div className="space-y-4">
    <div className="flex items-center justify-between">
     <Skeleton className="h-8 w-48" />
     <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {[...Array(6)].map((_, i) => (
      <Skeleton key={i} className="h-48 w-full" />
     ))}
    </div>
   </div>
  );
 }

 return (
  <div className="space-y-6">
   {/* Header */}
   <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
     <div className="p-2 bg-yellow-100 rounded-lg">
      <StickyNote className="h-6 w-6 text-yellow-600" />
     </div>
     <div>
      <h2 className="text-xl font-semibold text-gray-900">Pin Board</h2>
      <p className="text-sm text-gray-600">
       {messages.length} {messages.length === 1 ? "message" : "messages"} pinned
      </p>
     </div>
    </div>
    <Button onClick={() => setShowCreateModal(true)} className="bg-yellow-600 hover:bg-yellow-700">
     <Plus className="h-4 w-4 mr-2" />
     Create Pin
    </Button>
   </div>

   {/* Messages Grid */}
   {messages.length === 0 ? (
    <Card className="p-8 text-center">
     <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-gray-100 rounded-full">
       <StickyNote className="h-8 w-8 text-gray-400" />
      </div>
      <div>
       <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
       <p className="text-gray-600 mb-4">Be the first to pin a message to the board!</p>
       <Button onClick={() => setShowCreateModal(true)} className="bg-yellow-600 hover:bg-yellow-700">
        <Plus className="h-4 w-4 mr-2" />
        Create First Pin
       </Button>
      </div>
     </div>
    </Card>
   ) : (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {messages.map(message => (
      <PinMessageCard
       key={message.id}
       message={message}
       currentUser={user}
       onEdit={handleEditMessage}
       onDelete={handleDeleteMessage}
       getPriorityColor={getPriorityColor}
       getPriorityIcon={getPriorityIcon}
       getVisibilityText={getVisibilityText}
      />
     ))}
    </div>
   )}

   {/* Create/Edit Modal */}
   <CreatePinModal
    isOpen={showCreateModal}
    onClose={handleCloseModal}
    editingMessage={editingMessage}
    users={users}
   />
  </div>
 );
}
