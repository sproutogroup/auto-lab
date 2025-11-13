import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Users, Eye, MoreVertical, Calendar } from "lucide-react";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface PinMessageCardProps {
 message: PinnedMessage;
 currentUser: User | null;
 onEdit: (message: PinnedMessage) => void;
 onDelete: (messageId: number) => void;
 getPriorityColor: (priority: string) => string;
 getPriorityIcon: (priority: string) => React.ReactNode;
 getVisibilityText: (message: PinnedMessage) => string;
}

export function PinMessageCard({
 message,
 currentUser,
 onEdit,
 onDelete,
 getPriorityColor,
 getPriorityIcon,
 getVisibilityText,
}: PinMessageCardProps) {
 const [isExpanded, setIsExpanded] = useState(false);

 const canEditOrDelete =
  currentUser && (currentUser.id === message.author_id || currentUser.role === "admin");

 const getColorTheme = (theme: string) => {
  switch (theme) {
   case "yellow":
    return "bg-yellow-50 border-yellow-200";
   case "blue":
    return "bg-blue-50 border-blue-200";
   case "green":
    return "bg-green-50 border-green-200";
   case "red":
    return "bg-red-50 border-red-200";
   case "purple":
    return "bg-purple-50 border-purple-200";
   default:
    return "bg-yellow-50 border-yellow-200";
  }
 };

 const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
   day: "numeric",
   month: "short",
   year: "numeric",
   hour: "2-digit",
   minute: "2-digit",
  });
 };

 const shouldTruncate = message.content.length > 150;
 const displayContent =
  shouldTruncate && !isExpanded ? message.content.substring(0, 150) + "..." : message.content;

 return (
  <Card className={`${getColorTheme(message.color_theme)} transition-all duration-200 hover:shadow-md`}>
   <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
     <div className="flex-1">
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{message.title}</h3>
      <div className="flex items-center gap-2 text-xs text-gray-600">
       <span>by {message.author_name}</span>
       <span>•</span>
       <span>{formatDate(message.created_at)}</span>
      </div>
     </div>

     {canEditOrDelete && (
      <DropdownMenu>
       <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
         <MoreVertical className="h-4 w-4" />
        </Button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(message)}>
         <Edit2 className="h-4 w-4 mr-2" />
         Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-600">
         <Trash2 className="h-4 w-4 mr-2" />
         Delete
        </DropdownMenuItem>
       </DropdownMenuContent>
      </DropdownMenu>
     )}
    </div>

    {/* Priority and Visibility Badges */}
    <div className="flex items-center gap-2 mt-2">
     <Badge className={`${getPriorityColor(message.priority)} text-xs`}>
      {getPriorityIcon(message.priority)}
      <span className="ml-1 capitalize">{message.priority}</span>
     </Badge>

     <Badge variant="outline" className="text-xs">
      {message.is_public ? (
       <>
        <Users className="h-3 w-3 mr-1" />
        {getVisibilityText(message)}
       </>
      ) : (
       <>
        <Eye className="h-3 w-3 mr-1" />
        {getVisibilityText(message)}
       </>
      )}
     </Badge>
    </div>
   </CardHeader>

   <CardContent className="pt-0">
    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayContent}</div>

    {shouldTruncate && (
     <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsExpanded(!isExpanded)}
      className="mt-2 p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
     >
      {isExpanded ? "Show less" : "Show more"}
     </Button>
    )}

    {message.expires_at && (
     <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
      <Calendar className="h-3 w-3" />
      <span>Expires: {formatDate(message.expires_at)}</span>
     </div>
    )}
   </CardContent>
  </Card>
 );
}
