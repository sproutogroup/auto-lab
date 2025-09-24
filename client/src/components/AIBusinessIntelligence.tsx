import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import {
  Brain,
  Send,
  User,
  AlertCircle,
  Loader2,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Car,
  Users,
  Calendar,
  Target,
  Bot,
  RefreshCw,
} from "lucide-react";

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

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const quickActions = [
  {
    label: "Sales Summary",
    query: "Give me a comprehensive sales summary for this month",
  },
  {
    label: "Stock Report",
    query: "Show me our current stock levels and aging inventory",
  },
  {
    label: "Customer Analytics",
    query: "Analyze our customer data and purchase patterns",
  },
  {
    label: "Finance Overview",
    query:
      "Provide a financial overview including profit margins and cash flow",
  },
  {
    label: "Team Performance",
    query: "How is our sales team performing this quarter?",
  },
  {
    label: "Inventory Optimization",
    query: "What recommendations do you have for inventory optimization?",
  },
];

export default function AIBusinessIntelligence() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with a welcome message
  useEffect(() => {
    if (!isInitialized) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        type: "ai",
        content:
          "Hello! I'm your AI Business Intelligence Assistant. I have access to all your dealership data including sales, inventory, customers, leads, and financial information. How can I help you analyze your business today?",
        timestamp: new Date(),
        suggestions: [
          "Show me today's performance summary",
          "What's our current inventory status?",
          "How are our sales trending this month?",
        ],
      };
      setMessages([welcomeMessage]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Try quick query first for common questions
  const quickQueryMutation = useMutation({
    mutationFn: (query: string) =>
      apiRequest("POST", "/api/ai/quick-query", { query }),
    onSuccess: (response: any) => {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "ai",
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error: any) => {
      // If quick query fails, fall back to full AI conversation
      if (error.fallback) {
        const conversationHistory = messages.map((msg) => ({
          role:
            msg.type === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
        }));
        chatMutation.mutate({
          message: messages[messages.length - 1].content,
          conversationHistory,
        });
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: "system",
          content: `I apologize, but I encountered an error. Please try again.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
  });

  const chatMutation = useMutation({
    mutationFn: (request: AIConversationRequest) => {
      console.log("Sending request to AI:", request);
      return apiRequest("POST", "/api/ai/conversation", request);
    },
    onSuccess: (response: AIConversationResponse) => {
      console.log("AI response received:", response);
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "ai",
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error: any) => {
      console.error("AI conversation error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "system",
        content: `I apologize, but I encountered an error: ${error.message || "Unable to process your request"}. Please try again or contact support if the issue persists.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !inputQuery.trim() ||
      chatMutation.isPending ||
      quickQueryMutation.isPending
    )
      return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Try quick query first for common questions
    const lowerQuery = inputQuery.toLowerCase();
    if (
      lowerQuery.includes("how many") ||
      lowerQuery.includes("inventory") ||
      lowerQuery.includes("sales today") ||
      lowerQuery.includes("top selling")
    ) {
      quickQueryMutation.mutate(inputQuery);
    } else {
      // For complex queries, use full AI conversation
      const conversationHistory = messages.map((msg) => ({
        role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));
      chatMutation.mutate({ message: inputQuery, conversationHistory });
    }

    setInputQuery("");
  };

  const handleQuickAction = (query: string) => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query,
      timestamp: new Date(),
    };

    // Build conversation history for context
    const conversationHistory = messages.map((msg) => ({
      role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate({ message: query, conversationHistory });
  };

  const handleClearConversation = () => {
    setMessages([]);
    setIsInitialized(false);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages
        .filter((msg) => msg.type === "user")
        .pop();
      if (lastUserMessage) {
        const conversationHistory = messages.slice(0, -1).map((msg) => ({
          role:
            msg.type === "user" ? ("user" as const) : ("assistant" as const),
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
    <div className="h-full flex flex-col">
      <div className="flex-1 flex gap-4">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  AI Business Intelligence Assistant
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" />
                    GPT-4o
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearConversation}
                    className="h-8 px-3"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm">
                        Welcome! I'm your AI business intelligence assistant.
                        Ask me anything about your dealership operations, sales
                        performance, inventory management, or customer
                        analytics.
                      </p>
                    </div>
                  )}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.type === "user"
                            ? "bg-blue-600 text-white"
                            : message.type === "ai"
                              ? "bg-gray-100 text-gray-900 border border-gray-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                          {message.type === "user" ? (
                            <User className="h-4 w-4" />
                          ) : message.type === "ai" ? (
                            <Brain className="h-4 w-4 text-blue-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {message.type === "user"
                            ? "You"
                            : message.type === "ai"
                              ? "AI Assistant"
                              : "System"}
                        </div>
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                          {message.type === "system" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleRetry}
                              className="h-6 px-2 text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {(chatMutation.isPending || quickQueryMutation.isPending) && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-700">
                          AI is analyzing your request...
                        </span>
                      </div>
                    </div>
                  )}

                  {messages.length > 0 &&
                    messages[messages.length - 1].suggestions && (
                      <div className="flex justify-start">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 max-w-[80%]">
                          <div className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-800">
                            <Lightbulb className="h-4 w-4" />
                            Suggested follow-up questions:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {messages[messages.length - 1].suggestions?.map(
                              (suggestion, index) => (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs bg-white hover:bg-blue-100 border-blue-300"
                                  onClick={() => handleQuickAction(suggestion)}
                                  disabled={chatMutation.isPending}
                                >
                                  {suggestion}
                                </Button>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </ScrollArea>

              <div className="mt-4 space-y-3">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickAction(action.query)}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit}>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask me about sales, inventory, customers, or any business metric..."
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      className="flex-1"
                      disabled={chatMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={chatMutation.isPending || !inputQuery.trim()}
                    >
                      {chatMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions Panel */}
        {messages.length > 0 &&
          messages[messages.length - 1].type === "ai" &&
          messages[messages.length - 1].suggestions && (
            <div className="w-80">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Follow-up Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {messages[messages.length - 1].suggestions?.map(
                        (suggestion, idx) => (
                          <Button
                            key={idx}
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction(suggestion)}
                            className="w-full justify-start text-xs"
                          >
                            {suggestion}
                          </Button>
                        ),
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
      </div>
    </div>
  );
}
