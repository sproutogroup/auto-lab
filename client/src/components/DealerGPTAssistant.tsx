import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
 Bot,
 Send,
 X,
 Minimize2,
 Maximize2,
 Loader2,
 Sparkles,
 MessageSquare,
 AlertTriangle,
 Lightbulb,
 TrendingUp,
 Target,
 Clock,
 CheckCircle,
 AlertCircle,
 Brain,
 Zap,
 Eye,
 Heart,
 Settings,
} from "lucide-react";

interface ChatMessage {
 id: string;
 type: "user" | "ai" | "system";
 content: string;
 timestamp: Date;
 suggestions?: string[];
 insights?: any[];
 proactiveAlerts?: any[];
 responseTime?: number;
}

interface DealerGPTRequest {
 message: string;
 userId: number;
 sessionId?: string;
 context?: any;
}

interface DealerGPTResponse {
 message: string;
 contextUsed: string[];
 suggestions: string[];
 insights?: any[];
 proactiveAlerts?: any[];
 sessionId: string;
 responseTime: number;
}

interface InsightCardProps {
 insight: any;
 onAcknowledge: (id: number) => void;
}

const InsightCard = ({ insight, onAcknowledge }: InsightCardProps) => {
 const getPriorityColor = (priority: string) => {
  switch (priority) {
   case "urgent":
    return "bg-red-100 text-red-800 border-red-200";
   case "high":
    return "bg-orange-100 text-orange-800 border-orange-200";
   case "medium":
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
   case "low":
    return "bg-blue-100 text-blue-800 border-blue-200";
   default:
    return "bg-gray-100 text-gray-800 border-gray-200";
  }
 };

 const getTypeIcon = (type: string) => {
  switch (type) {
   case "alert":
    return <AlertTriangle className="h-4 w-4" />;
   case "recommendation":
    return <Lightbulb className="h-4 w-4" />;
   case "pattern":
    return <TrendingUp className="h-4 w-4" />;
   case "forecast":
    return <Target className="h-4 w-4" />;
   default:
    return <AlertCircle className="h-4 w-4" />;
  }
 };

 return (
  <Card className="mb-2 border-l-4 border-l-blue-500">
   <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
     <div className="flex items-center gap-2">
      {getTypeIcon(insight.insight_type)}
      <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
     </div>
     <div className="flex items-center gap-2">
      <Badge className={`text-xs ${getPriorityColor(insight.priority)}`}>{insight.priority}</Badge>
      <Button size="sm" variant="ghost" onClick={() => onAcknowledge(insight.id)} className="h-6 w-6 p-0">
       <CheckCircle className="h-3 w-3" />
      </Button>
     </div>
    </div>
   </CardHeader>
   <CardContent className="pt-0">
    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
    {insight.recommendation && (
     <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
      <strong>Recommendation:</strong> {insight.recommendation}
     </div>
    )}
   </CardContent>
  </Card>
 );
};

export default function DealerGPTAssistant() {
 const [isOpen, setIsOpen] = useState(false);
 const [isMinimized, setIsMinimized] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [inputQuery, setInputQuery] = useState("");
 const [currentSessionId, setCurrentSessionId] = useState<string>("");
 const [showInsights, setShowInsights] = useState(false);
 const scrollAreaRef = useRef<HTMLDivElement>(null);

 // Get user info
 const { data: user } = useQuery({
  queryKey: ["/api/auth/user"],
  staleTime: 5 * 60 * 1000,
 });

 // Get startup greeting
 const { data: startupGreeting, isLoading: isLoadingGreeting } = useQuery({
  queryKey: ["/api/dealergpt/greeting"],
  enabled: isOpen && messages.length === 0,
 });

 // Process conversation mutation
 const conversationMutation = useMutation({
  mutationFn: async (request: DealerGPTRequest) => {
   const response = await apiRequest("POST", "/api/dealergpt/conversation", request);
   return await response.json();
  },
  onSuccess: (response: DealerGPTResponse) => {
   const aiMessage: ChatMessage = {
    id: Date.now().toString(),
    type: "ai",
    content: response.message,
    timestamp: new Date(),
    suggestions: response.suggestions,
    insights: response.insights,
    proactiveAlerts: response.proactiveAlerts,
    responseTime: response.responseTime,
   };

   setMessages(prev => [...prev, aiMessage]);
   setCurrentSessionId(response.sessionId);
  },
  onError: (error: any) => {
   const errorMessage: ChatMessage = {
    id: Date.now().toString(),
    type: "system",
    content: `I apologize, but I encountered an error: ${error.message || "Unable to process your request"}. Please try again.`,
    timestamp: new Date(),
   };
   setMessages(prev => [...prev, errorMessage]);
  },
 });

 // Acknowledge insight mutation
 const acknowledgeInsightMutation = useMutation({
  mutationFn: async (insightId: number) => {
   const response = await apiRequest("POST", `/api/dealergpt/insights/${insightId}/acknowledge`, {});
   return await response.json();
  },
  onSuccess: () => {
   // Remove acknowledged insight from messages
   setMessages(prev =>
    prev.map(msg => ({
     ...msg,
     proactiveAlerts: msg.proactiveAlerts?.filter(alert => alert.id !== acknowledgeInsightMutation.variables),
    })),
   );
  },
 });

 // Auto-scroll to bottom
 useEffect(() => {
  if (scrollAreaRef.current) {
   const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
   if (scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
   }
  }
 }, [messages]);

 // Initialize with startup greeting
 useEffect(() => {
  if (isOpen && startupGreeting && messages.length === 0) {
   const greetingMessage: ChatMessage = {
    id: "startup",
    type: "ai",
    content: startupGreeting.message,
    timestamp: new Date(),
    suggestions: startupGreeting.suggestions,
    insights: startupGreeting.insights,
    proactiveAlerts: startupGreeting.proactiveAlerts,
    responseTime: startupGreeting.responseTime,
   };
   setMessages([greetingMessage]);
   setCurrentSessionId(startupGreeting.sessionId);
  }
 }, [isOpen, startupGreeting, messages.length]);

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputQuery.trim() || !user?.id) return;

  const userMessage: ChatMessage = {
   id: Date.now().toString(),
   type: "user",
   content: inputQuery,
   timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);

  conversationMutation.mutate({
   message: inputQuery,
   userId: user.id,
   sessionId: currentSessionId,
  });

  setInputQuery("");
 };

 const handleSuggestionClick = (suggestion: string) => {
  if (!user?.id) return;

  const userMessage: ChatMessage = {
   id: Date.now().toString(),
   type: "user",
   content: suggestion,
   timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);

  conversationMutation.mutate({
   message: suggestion,
   userId: user.id,
   sessionId: currentSessionId,
  });
 };

 const handleAcknowledgeInsight = (insightId: number) => {
  acknowledgeInsightMutation.mutate(insightId);
 };

 const getActiveInsights = () => {
  const latestMessage = messages[messages.length - 1];
  return latestMessage?.proactiveAlerts || [];
 };

 const activeInsights = getActiveInsights();

 return (
  <>
   {/* Floating Action Button */}
   <div className="fixed bottom-6 right-6 z-50">
    <div className="relative">
     {/* Notification Badge */}
     {activeInsights.length > 0 && (
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold z-10">
       {activeInsights.length}
      </div>
     )}

     <Button
      onClick={() => setIsOpen(true)}
      className="rounded-full h-14 w-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
      size="icon"
     >
      <Brain className="h-7 w-7 text-white" />
     </Button>
    </div>
   </div>

   {/* DealerGPT Dialog */}
   <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent
     className={`${isMinimized ? "max-w-md" : "max-w-4xl"} ${isMinimized ? "h-[500px]" : "h-[700px]"} p-0 flex flex-col`}
     onInteractOutside={e => e.preventDefault()}
    >
     <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
        <div className="relative">
         <Bot className="h-8 w-8" />
         {activeInsights.length > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
           {activeInsights.length}
          </div>
         )}
        </div>
        <div>
         <DialogTitle className="text-xl font-bold text-white">DealerGPT</DialogTitle>
         <DialogDescription className="text-blue-100 text-sm">
          Your intelligent dealership assistant
         </DialogDescription>
        </div>
       </div>
       <div className="flex items-center gap-2">
        <Button
         size="icon"
         variant="ghost"
         className="h-8 w-8 text-white hover:bg-white/20"
         onClick={() => setShowInsights(!showInsights)}
        >
         <Zap className="h-4 w-4" />
        </Button>
        <Button
         size="icon"
         variant="ghost"
         className="h-8 w-8 text-white hover:bg-white/20"
         onClick={() => setIsMinimized(!isMinimized)}
        >
         {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button
         size="icon"
         variant="ghost"
         className="h-8 w-8 text-white hover:bg-white/20"
         onClick={() => setIsOpen(false)}
        >
         <X className="h-4 w-4" />
        </Button>
       </div>
      </div>
     </DialogHeader>

     <div className="flex-1 flex overflow-hidden">
      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!isMinimized && showInsights ? "w-2/3" : "w-full"}`}>
       {/* Messages */}
       <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {isLoadingGreeting && messages.length === 0 ? (
         <div className="flex items-center justify-center h-full">
          <div className="text-center">
           <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
           <p className="text-gray-500">Initializing DealerGPT...</p>
          </div>
         </div>
        ) : (
         <div className="space-y-4">
          {messages.map(message => (
           <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
           >
            <div
             className={`max-w-[80%] rounded-lg p-3 ${
              message.type === "user"
               ? "bg-blue-500 text-white"
               : message.type === "system"
                 ? "bg-red-100 text-red-800 border border-red-200"
                 : "bg-gray-100 text-gray-800"
             }`}
            >
             <div className="whitespace-pre-wrap">{message.content}</div>

             {message.type === "ai" && (
              <div className="mt-2 text-xs text-gray-500">
               {message.responseTime && (
                <span className="flex items-center gap-1">
                 <Clock className="h-3 w-3" />
                 {message.responseTime}ms
                </span>
               )}
              </div>
             )}

             {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-3 space-y-1">
               <p className="text-xs font-medium text-gray-600">Suggestions:</p>
               {message.suggestions.map((suggestion, idx) => (
                <Button
                 key={idx}
                 variant="outline"
                 size="sm"
                 className="text-xs mr-1 mb-1"
                 onClick={() => handleSuggestionClick(suggestion)}
                >
                 {suggestion}
                </Button>
               ))}
              </div>
             )}
            </div>
           </div>
          ))}
         </div>
        )}
       </ScrollArea>

       {/* Input */}
       <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
         <Input
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          placeholder="Ask me anything about your dealership..."
          className="flex-1"
          disabled={conversationMutation.isPending}
         />
         <Button
          type="submit"
          disabled={conversationMutation.isPending || !inputQuery.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
         >
          {conversationMutation.isPending ? (
           <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
           <Send className="h-4 w-4" />
          )}
         </Button>
        </form>
       </div>
      </div>

      {/* Insights Sidebar */}
      {!isMinimized && showInsights && (
       <>
        <Separator orientation="vertical" />
        <div className="w-1/3 bg-gray-50 p-4 overflow-y-auto">
         <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-800">Active Insights</h3>
         </div>

         {activeInsights.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
           <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
           <p className="text-sm">No active insights</p>
          </div>
         ) : (
          <div className="space-y-2">
           {activeInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} onAcknowledge={handleAcknowledgeInsight} />
           ))}
          </div>
         )}
        </div>
       </>
      )}
     </div>
    </DialogContent>
   </Dialog>
  </>
 );
}
