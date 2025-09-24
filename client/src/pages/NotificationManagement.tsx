import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Settings,
  BarChart3,
  Plus,
  Trash2,
  Users,
  Clock,
  Target,
  CheckCircle,
  TrendingUp,
  Filter,
  Car,
  UserPlus,
  Calendar,
  Briefcase,
  DollarSign,
  Package,
  AlertTriangle,
  Volume2,
  VolumeX,
  Smartphone,
  Brain,
  Activity,
  History,
  TestTube,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { NotificationTester } from "@/components/NotificationTester";

// Define the 7 actual notification events from the registry
const NOTIFICATION_EVENTS = [
  {
    key: "vehicle_updated",
    label: "Vehicle Updated",
    description: "When a vehicle is updated in the system",
    icon: <Car className="h-5 w-5" />,
    color: "bg-blue-500",
    category: "inventory",
    adminOnly: true,
  },
  {
    key: "vehicle_added",
    label: "New Vehicle Added",
    description: "When a new vehicle is added to Vehicle Master",
    icon: <Plus className="h-5 w-5" />,
    color: "bg-green-500",
    category: "inventory",
    adminOnly: false,
  },
  {
    key: "vehicle_sold",
    label: "Vehicle Sold",
    description: "When a vehicle is marked as sold",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "bg-emerald-500",
    category: "sales",
    adminOnly: false,
  },
  {
    key: "vehicle_bought",
    label: "Vehicle Bought",
    description: "When a vehicle is added to Bought Vehicles",
    icon: <Target className="h-5 w-5" />,
    color: "bg-purple-500",
    category: "inventory",
    adminOnly: false,
  },
  {
    key: "lead_created",
    label: "New Lead Created",
    description: "When a new lead is added to the system",
    icon: <UserPlus className="h-5 w-5" />,
    color: "bg-orange-500",
    category: "customer",
    adminOnly: false,
  },
  {
    key: "appointment_booked",
    label: "Appointment Booked",
    description: "When a new appointment is booked",
    icon: <Calendar className="h-5 w-5" />,
    color: "bg-indigo-500",
    category: "customer",
    adminOnly: false,
  },
  {
    key: "job_booked",
    label: "Job Booked",
    description: "When a new job is booked",
    icon: <Briefcase className="h-5 w-5" />,
    color: "bg-red-500",
    category: "staff",
    adminOnly: true,
  },
];

interface Notification {
  id: number;
  recipient_user_id: number;
  notification_type: string;
  priority_level: string;
  title: string;
  message: string;
  action_url?: string;
  status: string;
  delivered_at?: string;
  read_at?: string;
  dismissed_at?: string;
  created_at: string;
}

interface NotificationPreference {
  id: number;
  user_id: number;
  notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  max_notifications_per_hour: number;

  // Event-specific preferences (actual 7 events)
  vehicle_updated_enabled: boolean;
  vehicle_added_enabled: boolean;
  vehicle_sold_enabled: boolean;
  vehicle_bought_enabled: boolean;
  lead_created_enabled: boolean;
  appointment_booked_enabled: boolean;
  job_booked_enabled: boolean;
}

interface NotificationStats {
  total_notifications: string;
  unread_notifications: string;
  read_notifications: string;
  dismissed_notifications: string;
}

const NotificationManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("notifications");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Get current user info
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return await response.json();
    },
  });

  // More robust admin detection
  const isAdmin =
    currentUser?.user?.role === "admin" ||
    currentUser?.user?.username === "admin" ||
    currentUser?.user?.id === 1;

  // Debug admin detection
  if (currentUser) {
    console.log("🔍 Admin detection debug:", {
      currentUser: currentUser?.user,
      role: currentUser?.user?.role,
      username: currentUser?.user?.username,
      id: currentUser?.user?.id,
      isAdmin: isAdmin,
      totalEvents: NOTIFICATION_EVENTS.length,
      adminOnlyEvents: NOTIFICATION_EVENTS.filter((e) => e.adminOnly).length,
      userLoading: userLoading,
    });
  }

  // Show ALL events for admin users, filter out admin-only events for regular users
  const visibleEvents = isAdmin
    ? NOTIFICATION_EVENTS
    : NOTIFICATION_EVENTS.filter((event) => !event.adminOnly);

  if (currentUser) {
    console.log(
      "📋 Visible events:",
      visibleEvents.length,
      "events:",
      visibleEvents.map((e) => `${e.key} (adminOnly: ${e.adminOnly})`),
    );
  }

  // Queries
  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery({
      queryKey: ["/api/notifications"],
      queryFn: async () => {
        const response = await apiRequest("GET", "/api/notifications");
        return await response.json();
      },
    });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/notifications/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/notifications/stats");
      return await response.json();
    },
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/notifications/preferences"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/notifications/preferences",
      );
      return await response.json();
    },
  });

  // Mutations
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<NotificationPreference>) => {
      const response = await apiRequest(
        "PUT",
        "/api/notifications/preferences",
        preferences,
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/preferences"],
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/notifications/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/notifications/test", {
        type: "test",
        title: "Test Notification",
        message:
          "This is a test notification to verify the system is working correctly.",
        priority: "medium",
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test notification sent",
        description: "A test notification has been created and sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Helper functions
  const handlePreferenceToggle = (eventKey: string, enabled: boolean) => {
    const currentPrefs = preferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      [`${eventKey}_enabled`]: enabled,
    };
    updatePreferencesMutation.mutate(updatedPrefs);
  };

  const handleGeneralSettingToggle = (setting: string, enabled: boolean) => {
    const currentPrefs = preferences || {};
    const updatedPrefs = {
      ...currentPrefs,
      [setting]: enabled,
    };
    updatePreferencesMutation.mutate(updatedPrefs);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredNotifications = notifications.filter(
    (notification: Notification) => {
      const statusMatch =
        filterStatus === "all" || notification.status === filterStatus;
      const typeMatch =
        filterType === "all" || notification.notification_type === filterType;
      const priorityMatch =
        filterPriority === "all" ||
        notification.priority_level === filterPriority;
      return statusMatch && typeMatch && priorityMatch;
    },
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Notification Management
          </h1>
          <p className="text-gray-600">
            Manage system notifications and user preferences
          </p>
        </div>
        <Button
          onClick={() => testNotificationMutation.mutate()}
          className="bg-red-600 hover:bg-red-700"
          disabled={testNotificationMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Notification
        </Button>
      </div>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="smart-ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Smart AI
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Logging & Testing
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Notifications - Events and General Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  Configure your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      Enable Notifications
                    </span>
                  </div>
                  <Switch
                    checked={preferences?.notifications_enabled || false}
                    onCheckedChange={(enabled) =>
                      handleGeneralSettingToggle(
                        "notifications_enabled",
                        enabled,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      Push Notifications
                    </span>
                  </div>
                  <Switch
                    checked={preferences?.push_notifications_enabled || false}
                    onCheckedChange={(enabled) =>
                      handleGeneralSettingToggle(
                        "push_notifications_enabled",
                        enabled,
                      )
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Sound Alerts</span>
                  </div>
                  <Switch
                    checked={preferences?.sound_enabled || false}
                    onCheckedChange={(enabled) =>
                      handleGeneralSettingToggle("sound_enabled", enabled)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Vibration</span>
                  </div>
                  <Switch
                    checked={preferences?.vibration_enabled || false}
                    onCheckedChange={(enabled) =>
                      handleGeneralSettingToggle("vibration_enabled", enabled)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Notification Events
                </CardTitle>
                <CardDescription>
                  Enable or disable specific notification types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-72">
                  {userLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-gray-500">
                        Loading notification events...
                      </p>
                    </div>
                  ) : (
                    <>
                      {visibleEvents.map((event) => (
                        <div
                          key={event.key}
                          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${event.color} text-white`}
                            >
                              {event.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {event.label}
                                </span>
                                {event.adminOnly && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-red-50 text-red-700"
                                  >
                                    Admin Only
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {event.description}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={
                              preferences?.[`${event.key}_enabled`] || false
                            }
                            onCheckedChange={(enabled) =>
                              handlePreferenceToggle(event.key, enabled)
                            }
                          />
                        </div>
                      ))}
                      {/* Debug info */}
                      <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                        <p>
                          Debug: Total events: {NOTIFICATION_EVENTS.length},
                          Visible: {visibleEvents.length}
                        </p>
                        <p>Is Admin: {isAdmin ? "Yes" : "No"}</p>
                        <p>
                          User Role: {currentUser?.user?.role || "Not loaded"}
                        </p>
                        <p>
                          Admin-only events:{" "}
                          {NOTIFICATION_EVENTS.filter((e) => e.adminOnly)
                            .map((e) => e.key)
                            .join(", ")}
                        </p>
                      </div>
                    </>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Smart AI */}
        <TabsContent value="smart-ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Smart AI Notifications
              </CardTitle>
              <CardDescription>
                Configure AI-powered notification intelligence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-12">
                <Brain className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI-Powered Notifications
                </h3>
                <p className="text-gray-600 mb-6">
                  Smart AI will analyze your notification patterns and
                  automatically optimize delivery timing, priority levels, and
                  content personalization for maximum effectiveness.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Target className="h-8 w-8 text-blue-600 mb-2" />
                    <h4 className="font-medium text-blue-900">Smart Timing</h4>
                    <p className="text-sm text-blue-700">
                      AI learns your optimal notification times
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                    <h4 className="font-medium text-green-900">
                      Priority Learning
                    </h4>
                    <p className="text-sm text-green-700">
                      Automatically adjusts notification priorities
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Users className="h-8 w-8 text-purple-600 mb-2" />
                    <h4 className="font-medium text-purple-900">
                      Personalization
                    </h4>
                    <p className="text-sm text-purple-700">
                      Tailored content based on user behavior
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
                    <h4 className="font-medium text-orange-900">Analytics</h4>
                    <p className="text-sm text-orange-700">
                      Detailed insights on notification performance
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Logging & Testing */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notification History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Notification History
                </CardTitle>
                <CardDescription>View all past notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterPriority}
                    onValueChange={setFilterPriority}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-96">
                  {filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2" />
                      <p>No notifications found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredNotifications.map(
                        (notification: Notification) => (
                          <div
                            key={notification.id}
                            className="p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {notification.title}
                                  </span>
                                  <Badge
                                    className={`text-xs ${getPriorityColor(notification.priority_level)}`}
                                  >
                                    {notification.priority_level}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${getStatusColor(notification.status)}`}
                                  >
                                    {notification.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {formatDate(notification.created_at)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteNotificationMutation.mutate(
                                    notification.id,
                                  )
                                }
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Testing Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Testing Tools
                </CardTitle>
                <CardDescription>Test and debug notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Quick Test</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Send a test notification to verify the system is working
                  </p>
                  <Button
                    onClick={() => testNotificationMutation.mutate()}
                    disabled={testNotificationMutation.isPending}
                    className="w-full"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testNotificationMutation.isPending
                      ? "Sending..."
                      : "Send Test Notification"}
                  </Button>
                </div>

                {/* Notification Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats?.total_notifications || "0"}
                    </div>
                    <div className="text-sm text-blue-700">Total</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats?.read_notifications || "0"}
                    </div>
                    <div className="text-sm text-green-700">Read</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats?.unread_notifications || "0"}
                    </div>
                    <div className="text-sm text-yellow-700">Unread</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {stats?.dismissed_notifications || "0"}
                    </div>
                    <div className="text-sm text-red-700">Dismissed</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Advanced Testing</h4>
                  <NotificationTester />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationManagement;
