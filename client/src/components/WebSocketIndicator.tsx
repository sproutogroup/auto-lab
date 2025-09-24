import React from "react";
import {
  useConnectionStatus,
  useConnectedUsers,
} from "@/contexts/WebSocketContext";
import { ConnectionStatus } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Wifi,
  WifiOff,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Activity,
  User,
  Crown,
  Shield,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Connection status indicator component
export const WebSocketIndicator: React.FC = () => {
  const { connectionStatus, isConnected, reconnectAttempts } =
    useConnectionStatus();
  const connectedUsers = useConnectedUsers();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ConnectionStatus.CONNECTING:
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case ConnectionStatus.RECONNECTING:
        return <RotateCcw className="h-4 w-4 text-orange-500 animate-spin" />;
      case ConnectionStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case ConnectionStatus.DISCONNECTED:
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return "bg-green-500";
      case ConnectionStatus.CONNECTING:
        return "bg-yellow-500";
      case ConnectionStatus.RECONNECTING:
        return "bg-orange-500";
      case ConnectionStatus.ERROR:
        return "bg-red-500";
      case ConnectionStatus.DISCONNECTED:
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return "Connected";
      case ConnectionStatus.CONNECTING:
        return "Connecting...";
      case ConnectionStatus.RECONNECTING:
        return `Reconnecting... (${reconnectAttempts})`;
      case ConnectionStatus.ERROR:
        return "Connection Error";
      case ConnectionStatus.DISCONNECTED:
      default:
        return "Disconnected";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case "manager":
        return <Shield className="h-3 w-3 text-blue-500" />;
      case "salesperson":
        return <ShoppingCart className="h-3 w-3 text-green-500" />;
      default:
        return <User className="h-3 w-3 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "manager":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "salesperson":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status Indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={cn("h-2 w-2 rounded-full", getStatusColor())} />
          {isConnected && (
            <div
              className={cn(
                "absolute inset-0 h-2 w-2 rounded-full animate-ping",
                getStatusColor(),
              )}
            />
          )}
        </div>
        <span className="text-sm text-muted-foreground hidden sm:block">
          {getStatusText()}
        </span>
      </div>

      {/* Connected Users Indicator */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <Users className="h-4 w-4" />
            <span className="text-sm">{connectedUsers.length}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Connected Users
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {connectedUsers.length} online
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Users currently active in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <div className="space-y-2 p-4">
                  {connectedUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No users online</p>
                    </div>
                  ) : (
                    connectedUsers.map((user, index) => (
                      <div key={`${user.user_id}-${index}`}>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {getRoleIcon(user.role)}
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {user.username}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge
                                  className={cn(
                                    "text-xs py-0 px-1",
                                    getRoleBadgeColor(user.role),
                                  )}
                                >
                                  {user.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(user.last_activity).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                        {index < connectedUsers.length - 1 && (
                          <Separator className="my-1" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Detailed Status for Mobile */}
      <div className="sm:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              {getStatusIcon()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Connection Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm">{getStatusText()}</span>
              </div>
              {connectionStatus === ConnectionStatus.RECONNECTING && (
                <p className="text-xs text-muted-foreground">
                  Attempting to reconnect... ({reconnectAttempts}/5)
                </p>
              )}
              {connectionStatus === ConnectionStatus.ERROR && (
                <p className="text-xs text-red-500">
                  Unable to connect to real-time updates
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

// Connection status banner for critical disconnection states
export const ConnectionStatusBanner: React.FC = () => {
  const { connectionStatus, isConnected, reconnectAttempts } =
    useConnectionStatus();

  if (connectionStatus === ConnectionStatus.CONNECTED) {
    return null;
  }

  const getBannerColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTING:
        return "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300";
      case ConnectionStatus.RECONNECTING:
        return "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300";
      case ConnectionStatus.ERROR:
        return "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300";
      case ConnectionStatus.DISCONNECTED:
      default:
        return "bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-300";
    }
  };

  const getBannerMessage = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTING:
        return "Connecting to real-time updates...";
      case ConnectionStatus.RECONNECTING:
        return `Reconnecting to real-time updates... (${reconnectAttempts}/5)`;
      case ConnectionStatus.ERROR:
        return "Unable to connect to real-time updates. Some features may not work properly.";
      case ConnectionStatus.DISCONNECTED:
      default:
        return "Disconnected from real-time updates. Please refresh the page.";
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ConnectionStatus.CONNECTING:
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case ConnectionStatus.RECONNECTING:
        return <RotateCcw className="h-4 w-4 text-orange-500 animate-spin" />;
      case ConnectionStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case ConnectionStatus.DISCONNECTED:
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn("border-l-4 p-4 mb-4", getBannerColor())}>
      <div className="flex items-center">
        <div className="flex-shrink-0">{getStatusIcon()}</div>
        <div className="ml-3">
          <p className="text-sm font-medium">{getBannerMessage()}</p>
          {connectionStatus === ConnectionStatus.ERROR && (
            <p className="text-xs mt-1 opacity-75">
              Data may not be synchronized in real-time. Please refresh the page
              or check your connection.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketIndicator;
