import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import {
 Bot,
 Send,
 X,
 Minimize2,
 Maximize2,
 Loader2,
 RefreshCw,
 Sparkles,
 MessageSquare,
} from "lucide-react";

interface ChatMessage {
 id: string;
 type: "user" | "ai" | "system";
 content: string;
 timestamp: Date;
 suggestions?: string[];
}

interface AIConversationRequest {
 message: string;
 conversationHistory?: Array<{
  role: "user" | "assistant";
  content: string;
 }>;
}

interface AIConversationResponse {
 message: string;
 context_used: string[];
 suggestions?: string[];
}

export default function GlobalAIAssistant() {
 const [isOpen, setIsOpen] = useState(false);
 const [isMinimized, setIsMinimized] = useState(false);
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [inputQuery, setInputQuery] = useState("");
 const scrollAreaRef = useRef<HTMLDivElement>(null);

 // Quick query mutation for optimized common questions
 const quickQueryMutation = useMutation({
  mutationFn: async (query: string) => {
   const response = await apiRequest("POST", "/api/ai/quick-query", {
    query,
   });
   return await response.json();
  },
  onSuccess: response => {
   const aiMessage: ChatMessage = {
    id: Date.now().toString(),
    type: "ai",
    content: response.message,
    timestamp: new Date(),
    suggestions: response.suggestions,
   };
   setMessages(prev => [...prev, aiMessage]);
  },
  onError: error => {
   // Fallback to full AI conversation on quick query failure
   const lastUserMessage = messages[messages.length - 1];
   if (lastUserMessage && lastUserMessage.type === "user") {
    const conversationHistory = messages.slice(0, -1).map(msg => ({
     role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
     content: msg.content,
    }));
    chatMutation.mutate({
     message: lastUserMessage.content,
     conversationHistory,
    });
   }
  },
 });

 // Full AI conversation mutation
 const chatMutation = useMutation({
  mutationFn: async (request: AIConversationRequest) => {
   const response = await apiRequest("POST", "/api/ai-reports/conversation", request);
   return await response.json();
  },
  onSuccess: (response: AIConversationResponse) => {
   const aiMessage: ChatMessage = {
    id: Date.now().toString(),
    type: "ai",
    content: response.message,
    timestamp: new Date(),
    suggestions: response.suggestions,
   };
   setMessages(prev => [...prev, aiMessage]);
  },
  onError: (error: any) => {
   const errorMessage: ChatMessage = {
    id: Date.now().toString(),
    type: "system",
    content: `I apologize, but I encountered an error: ${error.message || "Unable to process your request"}. Please try again or contact support if the issue persists.`,
    timestamp: new Date(),
   };
   setMessages(prev => [...prev, errorMessage]);
  },
 });

 // Auto-scroll to bottom when new messages are added
 useEffect(() => {
  if (scrollAreaRef.current) {
   const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
   if (scrollContainer) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
   }
  }
 }, [messages]);

 // Initialize with welcome message when opened
 useEffect(() => {
  if (isOpen && messages.length === 0) {
   const welcomeMessage: ChatMessage = {
    id: "welcome",
    type: "ai",
    content:
     "Hello! I'm your AI assistant. I can help you with anything related to your dealership - from checking inventory and sales data to analyzing customer trends and business performance. What would you like to know?",
    timestamp: new Date(),
    suggestions: [
     "How many vehicles do we have in stock?",
     "Show me today's sales",
     "What are our top selling makes?",
     "Analyze customer trends",
    ],
   };
   setMessages([welcomeMessage]);
  }
 }, [isOpen, messages.length]);

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!inputQuery.trim() || chatMutation.isPending || quickQueryMutation.isPending) return;

  const userMessage: ChatMessage = {
   id: Date.now().toString(),
   type: "user",
   content: inputQuery,
   timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);

  // Try quick query first for common questions
  const lowerQuery = inputQuery.toLowerCase();

  const shouldUseQuickQuery =
   lowerQuery.includes("how many") ||
   lowerQuery.includes("inventory") ||
   lowerQuery.includes("sales today") ||
   lowerQuery.includes("top selling") ||
   lowerQuery.includes("top makes") ||
   lowerQuery.includes("selling makes") ||
   lowerQuery.includes("customer") ||
   lowerQuery.includes("lead");

  if (shouldUseQuickQuery) {
   quickQueryMutation.mutate(inputQuery);
  } else {
   // For complex queries, use full AI conversation
   const conversationHistory = messages.map(msg => ({
    role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
    content: msg.content,
   }));
   chatMutation.mutate({ message: inputQuery, conversationHistory });
  }

  setInputQuery("");
 };

 const handleQuickAction = (query: string) => {
  if (!query.trim() || chatMutation.isPending || quickQueryMutation.isPending) return;

  const userMessage: ChatMessage = {
   id: Date.now().toString(),
   type: "user",
   content: query,
   timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);

  // Try quick query first
  const lowerQuery = query.toLowerCase();
  if (
   lowerQuery.includes("how many") ||
   lowerQuery.includes("inventory") ||
   lowerQuery.includes("sales today") ||
   lowerQuery.includes("top selling") ||
   lowerQuery.includes("top makes") ||
   lowerQuery.includes("selling makes") ||
   lowerQuery.includes("customer") ||
   lowerQuery.includes("lead")
  ) {
   quickQueryMutation.mutate(query);
  } else {
   const conversationHistory = messages.map(msg => ({
    role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
    content: msg.content,
   }));
   chatMutation.mutate({ message: query, conversationHistory });
  }
 };

 const handleClearConversation = () => {
  setMessages([]);
 };

 const handleRetry = () => {
  if (messages.length > 0) {
   const lastUserMessage = messages.filter(msg => msg.type === "user").pop();
   if (lastUserMessage) {
    // Remove the last AI response if it was an error
    if (messages[messages.length - 1].type === "system") {
     setMessages(prev => prev.slice(0, -1));
    }

    const conversationHistory = messages.slice(0, -1).map(msg => ({
     role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
     content: msg.content,
    }));
    chatMutation.mutate({
     message: lastUserMessage.content,
     conversationHistory,
    });
   }
  }
 };

 return (
  <>
   {/* Floating AI Assistant Button */}
   <Button
    onClick={() => setIsOpen(true)}
    className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 z-50"
    size="icon"
   >
    <Bot className="h-6 w-6 text-white" />
   </Button>

   {/* AI Assistant Dialog */}
   <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent
     className={`${isMinimized ? "max-w-md" : "max-w-2xl"} ${isMinimized ? "h-[400px]" : "h-[600px]"} p-0 flex flex-col`}
     onInteractOutside={e => e.preventDefault()}
    >
     <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
      <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
        <Bot className="h-6 w-6" />
        <div>
         <DialogTitle className="text-lg font-semibold text-white">AI Assistant</DialogTitle>
         <DialogDescription className="text-blue-100 text-sm">
          Your intelligent dealership companion
         </DialogDescription>
        </div>
       </div>
       <div className="flex items-center gap-2">
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

     <div className="flex-1 flex flex-col p-6 overflow-hidden">
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
       <div className="space-y-4">
        {messages.map(message => (
         <div
          key={message.id}
          className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
         >
          <div
           className={`rounded-lg px-4 py-3 max-w-[80%] ${
            message.type === "user"
             ? "bg-blue-600 text-white"
             : message.type === "system"
               ? "bg-red-50 text-red-800 border border-red-200"
               : "bg-gray-100 text-gray-800 border border-gray-200"
           }`}
          >
           <div className="flex items-start gap-2">
            {message.type === "ai" && <Sparkles className="h-4 w-4 mt-0.5 text-purple-600" />}
            <div className="flex-1">
             <p className="text-sm whitespace-pre-wrap">{message.content}</p>
             <div className="text-xs opacity-70 mt-1">{format(new Date(message.timestamp), "HH:mm")}</div>
            </div>
           </div>
          </div>
         </div>
        ))}

        {(chatMutation.isPending || quickQueryMutation.isPending) && (
         <div className="flex justify-start">
          <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2">
           <Sparkles className="h-4 w-4 text-purple-600" />
           <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
           <span className="text-sm text-gray-700">AI is thinking...</span>
          </div>
         </div>
        )}

        {messages.length > 0 && messages[messages.length - 1].suggestions && (
         <div className="flex justify-start">
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 max-w-[80%]">
           <div className="text-sm font-medium mb-2 flex items-center gap-2 text-purple-800">
            <MessageSquare className="h-4 w-4" />
            Try asking:
           </div>
           <div className="flex flex-wrap gap-2">
            {messages[messages.length - 1].suggestions?.map((suggestion, index) => (
             <Button
              key={index}
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs bg-white hover:bg-purple-100 border-purple-300"
              onClick={() => handleQuickAction(suggestion)}
              disabled={chatMutation.isPending || quickQueryMutation.isPending}
             >
              {suggestion}
             </Button>
            ))}
           </div>
          </div>
         </div>
        )}
       </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="mt-4 space-y-3">
       {messages.length > 1 && (
        <div className="flex items-center gap-2">
         <Button size="sm" variant="outline" onClick={handleClearConversation} className="text-xs">
          Clear Chat
         </Button>
         {messages.length > 0 && messages[messages.length - 1].type === "system" && (
          <Button size="sm" variant="outline" onClick={handleRetry} className="text-xs">
           <RefreshCw className="h-3 w-3 mr-1" />
           Retry
          </Button>
         )}
        </div>
       )}

       <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
         <Input
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          placeholder="Ask me anything about your dealership..."
          className="flex-1"
          disabled={chatMutation.isPending || quickQueryMutation.isPending}
         />
         <Button
          type="submit"
          disabled={!inputQuery.trim() || chatMutation.isPending || quickQueryMutation.isPending}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
         >
          <Send className="h-4 w-4" />
         </Button>
        </div>
       </form>
      </div>
     </div>
    </DialogContent>
   </Dialog>
  </>
 );
}
