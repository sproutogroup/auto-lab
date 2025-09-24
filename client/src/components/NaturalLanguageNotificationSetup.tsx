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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Zap,
  Clock,
  User,
  Car,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ParsedNotificationRule {
  trigger: string;
  condition?: string;
  action: string;
  priority: string;
  recipients: string[];
  message_template?: string;
  confidence: number;
}

interface NotificationRule {
  id: number;
  rule_name: string;
  trigger_event: string;
  condition_logic?: string;
  notification_template: string;
  priority_level: string;
  target_recipients: string[];
  is_active: boolean;
  created_at: string;
}

const NaturalLanguageNotificationSetup = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userPrompt, setUserPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRule, setParsedRule] = useState<ParsedNotificationRule | null>(
    null,
  );
  const [existingRules, setExistingRules] = useState<NotificationRule[]>([]);

  // Parse natural language input
  const parsePromptMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest(
        "POST",
        "/api/notifications/parse-rule",
        { prompt },
      );
      return await response.json();
    },
    onSuccess: (data: ParsedNotificationRule) => {
      setParsedRule(data);
      setIsProcessing(false);
      toast({
        title: "Notification Rule Parsed",
        description: `Found ${data.trigger} trigger with ${Math.round(data.confidence * 100)}% confidence`,
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to parse notification rule",
        variant: "destructive",
      });
    },
  });

  // Create notification rule
  const createRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      const response = await apiRequest(
        "POST",
        "/api/notifications/rules",
        rule,
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notification Rule Created",
        description:
          "Your notification rule is now active and will trigger automatically",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/rules"] });
      setParsedRule(null);
      setUserPrompt("");
      loadExistingRules();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create notification rule",
        variant: "destructive",
      });
    },
  });

  const loadExistingRules = async () => {
    try {
      const response = await apiRequest("GET", "/api/notifications/rules");
      const rules = await response.json();
      setExistingRules(rules);
    } catch (error) {
      console.error("Failed to load existing rules:", error);
    }
  };

  const handleParsePrompt = () => {
    if (!userPrompt.trim()) return;
    setIsProcessing(true);
    parsePromptMutation.mutate(userPrompt);
  };

  const handleCreateRule = () => {
    if (!parsedRule) return;

    // Transform the parsed rule to match the API expectations
    const ruleData = {
      trigger: parsedRule.trigger,
      condition: parsedRule.condition,
      priority: parsedRule.priority,
      recipients: parsedRule.recipients,
      message_template: parsedRule.message_template,
      confidence: parsedRule.confidence,
      originalPrompt: userPrompt,
    };

    createRuleMutation.mutate(ruleData);
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger.toLowerCase()) {
      case "lead_created":
        return <User className="h-4 w-4" />;
      case "vehicle_added":
        return <Car className="h-4 w-4" />;
      case "appointment_scheduled":
        return <Calendar className="h-4 w-4" />;
      case "sale_completed":
        return <DollarSign className="h-4 w-4" />;
      case "task_overdue":
        return <Clock className="h-4 w-4" />;
      case "performance_alert":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const examplePrompts = [
    "Send a notification when a lead is created",
    "Notify me when a vehicle is added to inventory",
    "Alert the sales team when an appointment is scheduled",
    "Send a notification when a sale is completed",
    "Notify managers when a task is overdue",
    "Alert when inventory is low",
    "Send notifications for high-value leads",
    "Notify when customer interaction is needed",
  ];

  return (
    <div className="space-y-6">
      {/* Natural Language Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Natural Language Notification Setup
          </CardTitle>
          <CardDescription>
            Simply describe when you want to be notified, and AI will set up the
            rule automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Describe your notification rule</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., 'Send a notification when a lead is created' or 'Alert me when inventory is low'"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-between items-center">
            <Button
              onClick={handleParsePrompt}
              disabled={!userPrompt.trim() || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Parse Rule
                </>
              )}
            </Button>

            {parsedRule && (
              <Button
                onClick={handleCreateRule}
                disabled={createRuleMutation.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Create Rule
              </Button>
            )}
          </div>

          {/* Example Prompts */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Example prompts:</Label>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setUserPrompt(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parsed Rule Preview */}
      {parsedRule && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Lightbulb className="h-5 w-5" />
              Parsed Notification Rule
            </CardTitle>
            <CardDescription className="text-blue-700">
              Review the interpreted rule before creating it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-blue-900">
                  Trigger Event
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  {getTriggerIcon(parsedRule.trigger)}
                  <span className="text-sm">
                    {parsedRule.trigger.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-blue-900">
                  Priority
                </Label>
                <div className="mt-1">
                  <Badge className={getPriorityColor(parsedRule.priority)}>
                    {parsedRule.priority}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-blue-900">
                  Recipients
                </Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {parsedRule.recipients.map((recipient, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {recipient}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-blue-900">
                  Confidence
                </Label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {Math.round(parsedRule.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            </div>

            {parsedRule.condition && (
              <div>
                <Label className="text-sm font-medium text-blue-900">
                  Condition
                </Label>
                <p className="text-sm text-blue-700 mt-1">
                  {parsedRule.condition}
                </p>
              </div>
            )}

            {parsedRule.message_template && (
              <div>
                <Label className="text-sm font-medium text-blue-900">
                  Message Template
                </Label>
                <p className="text-sm text-blue-700 mt-1 italic">
                  "{parsedRule.message_template}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Active Notification Rules
          </CardTitle>
          <CardDescription>
            Currently active notification rules that will trigger automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {existingRules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No active notification rules yet</p>
                <p className="text-sm">
                  Create your first rule using natural language above
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {existingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {getTriggerIcon(rule.trigger_event)}
                      <div>
                        <p className="font-medium">{rule.rule_name}</p>
                        <p className="text-sm text-gray-600">
                          {rule.trigger_event.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(rule.priority_level)}>
                        {rule.priority_level}
                      </Badge>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default NaturalLanguageNotificationSetup;
