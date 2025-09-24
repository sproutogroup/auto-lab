import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Sparkles,
  Target,
  Clock,
  Send,
  Zap,
  TrendingUp,
  MessageSquare,
  Settings,
  Lightbulb,
  Star,
  ArrowRight,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SmartNotificationGeneratorProps {
  onClose?: () => void;
}

const SmartNotificationGenerator = ({
  onClose,
}: SmartNotificationGeneratorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("generate");
  const [context, setContext] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityData, setEntityData] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [customInstructions, setCustomInstructions] = useState("");
  const [optimizeId, setOptimizeId] = useState("");
  const [followUpId, setFollowUpId] = useState("");
  const [userResponse, setUserResponse] = useState("");
  const [dealershipData, setDealershipData] = useState("");
  const [timeframe, setTimeframe] = useState("today");

  // Generate smart notification
  const generateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/notifications/smart", data),
    onSuccess: (data) => {
      toast({
        title: "Smart Notification Created",
        description: "AI-powered notification generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      if (onClose) onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate smart notification",
        variant: "destructive",
      });
    },
  });

  // Optimize notification
  const optimizeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/notifications/${id}/optimize`, {}),
    onSuccess: (data) => {
      toast({
        title: "Notification Optimized",
        description: "Notification content optimized for better engagement",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to optimize notification",
        variant: "destructive",
      });
    },
  });

  // Generate follow-up
  const followUpMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      apiRequest("POST", `/api/notifications/${id}/follow-up`, {
        userResponse: response,
      }),
    onSuccess: (data) => {
      if (data.notification) {
        toast({
          title: "Follow-up Generated",
          description: "Intelligent follow-up notification created",
        });
      } else {
        toast({
          title: "No Follow-up Needed",
          description: "AI determined no follow-up is necessary",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate follow-up",
        variant: "destructive",
      });
    },
  });

  // Predict notifications
  const predictMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/notifications/predict", data),
    onSuccess: (data) => {
      toast({
        title: "Predictions Generated",
        description: `AI predicted ${data.predictions.length} potential notifications`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to predict notifications",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    let parsedEntityData = {};
    try {
      parsedEntityData = entityData ? JSON.parse(entityData) : {};
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Entity data must be valid JSON",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      context,
      entityType,
      entityData: parsedEntityData,
      urgency,
      customInstructions: customInstructions || undefined,
    });
  };

  const handleOptimize = () => {
    if (!optimizeId) {
      toast({
        title: "Missing ID",
        description: "Please enter a notification ID to optimize",
        variant: "destructive",
      });
      return;
    }
    optimizeMutation.mutate(optimizeId);
  };

  const handleFollowUp = () => {
    if (!followUpId || !userResponse) {
      toast({
        title: "Missing Information",
        description: "Please enter notification ID and user response",
        variant: "destructive",
      });
      return;
    }
    followUpMutation.mutate({ id: followUpId, response: userResponse });
  };

  const handlePredict = () => {
    let parsedDealershipData = {};
    try {
      parsedDealershipData = dealershipData ? JSON.parse(dealershipData) : {};
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Dealership data must be valid JSON",
        variant: "destructive",
      });
      return;
    }

    predictMutation.mutate({
      dealershipData: parsedDealershipData,
      timeframe,
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <CardTitle>AI-Powered Smart Notifications</CardTitle>
        </div>
        <CardDescription>
          Generate intelligent, context-aware notifications using OpenAI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="optimize" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Optimize
            </TabsTrigger>
            <TabsTrigger value="follow-up" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Follow-up
            </TabsTrigger>
            <TabsTrigger value="predict" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Predict
            </TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="context">Context Description</Label>
                  <Textarea
                    id="context"
                    placeholder="Describe the situation or event that triggered this notification..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="entityData">Entity Data (JSON)</Label>
                  <Textarea
                    id="entityData"
                    placeholder='{"id": 123, "name": "John Doe", "status": "active"}'
                    value={entityData}
                    onChange={(e) => setEntityData(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="customInstructions">
                    Custom Instructions
                  </Label>
                  <Textarea
                    id="customInstructions"
                    placeholder="Any specific instructions for the AI..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!context || !entityType || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Smart Notification
                </>
              )}
            </Button>
          </TabsContent>

          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="optimizeId">Notification ID</Label>
                <Input
                  id="optimizeId"
                  placeholder="Enter notification ID to optimize"
                  value={optimizeId}
                  onChange={(e) => setOptimizeId(e.target.value)}
                />
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Optimization Benefits
                  </span>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Improved engagement and clarity</li>
                  <li>• Professional luxury brand tone</li>
                  <li>• Better call-to-action effectiveness</li>
                  <li>• Personalized messaging</li>
                </ul>
              </div>
              <Button
                onClick={handleOptimize}
                disabled={!optimizeId || optimizeMutation.isPending}
                className="w-full"
              >
                {optimizeMutation.isPending ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Optimize Notification
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Follow-up Tab */}
          <TabsContent value="follow-up" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="followUpId">Original Notification ID</Label>
                <Input
                  id="followUpId"
                  placeholder="Enter original notification ID"
                  value={followUpId}
                  onChange={(e) => setFollowUpId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="userResponse">User Response</Label>
                <Select value={userResponse} onValueChange={setUserResponse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user response" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="ignored">Ignored</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleFollowUp}
                disabled={
                  !followUpId || !userResponse || followUpMutation.isPending
                }
                className="w-full"
              >
                {followUpMutation.isPending ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Generate Follow-up
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Predict Tab */}
          <TabsContent value="predict" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="dealershipData">Dealership Data (JSON)</Label>
                <Textarea
                  id="dealershipData"
                  placeholder='{"sales": [...], "inventory": [...], "customers": [...]}'
                  value={dealershipData}
                  onChange={(e) => setDealershipData(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="timeframe">Prediction Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    Prediction Features
                  </span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Inventory management alerts</li>
                  <li>• Sales opportunity notifications</li>
                  <li>• Customer follow-up reminders</li>
                  <li>• Financial milestone alerts</li>
                </ul>
              </div>
              <Button
                onClick={handlePredict}
                disabled={predictMutation.isPending}
                className="w-full"
              >
                {predictMutation.isPending ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Predict Notifications
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SmartNotificationGenerator;
