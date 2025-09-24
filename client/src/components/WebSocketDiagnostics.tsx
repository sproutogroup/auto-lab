import React, { useState, useEffect } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";
import { isMobileDevice, isIOS, isSafari } from "../utils/mobileWebSocket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  AlertCircle,
  CheckCircle,
  Clock,
  RotateCcw,
} from "lucide-react";

export const WebSocketDiagnostics: React.FC = () => {
  const { socket, isConnected, connectionStatus, reconnectAttempts } =
    useWebSocket();
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [connectionHistory, setConnectionHistory] = useState<
    Array<{ timestamp: Date; event: string; details?: any }>
  >([]);

  useEffect(() => {
    // Detect device information
    const info = {
      isMobile: isMobileDevice(),
      isIOS: isIOS(),
      isSafari: isSafari(),
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      connectionType: (navigator as any).connection?.effectiveType || "unknown",
    };
    setDeviceInfo(info);

    // Log connection events
    const logEvent = (event: string, details?: any) => {
      setConnectionHistory((prev) => [
        ...prev.slice(-9),
        { timestamp: new Date(), event, details },
      ]);
    };

    if (socket) {
      socket.on("connect", () => logEvent("Connected"));
      socket.on("disconnect", (reason) => logEvent("Disconnected", { reason }));
      socket.on("connect_error", (error) =>
        logEvent("Connection Error", { error: error.message }),
      );
      socket.on("reconnect", (attemptNumber) =>
        logEvent("Reconnected", { attemptNumber }),
      );
      socket.on("reconnect_attempt", (attemptNumber) =>
        logEvent("Reconnect Attempt", { attemptNumber }),
      );
      socket.on("reconnect_error", (error) =>
        logEvent("Reconnect Error", { error: error.message }),
      );
      socket.on("reconnect_failed", () => logEvent("Reconnect Failed"));
    }

    // Network status monitoring
    const handleOnline = () => logEvent("Network Online");
    const handleOffline = () => logEvent("Network Offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [socket]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "connecting":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case "reconnecting":
        return <RotateCcw className="h-4 w-4 text-orange-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "reconnecting":
        return "bg-orange-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const forceReconnect = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  const getTransportInfo = () => {
    if (!socket) return "No socket";
    return socket.io?.engine?.transport?.name || "Unknown";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            WebSocket Connection Status
          </CardTitle>
          <CardDescription>
            Real-time connection monitoring and diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium capitalize">{connectionStatus}</span>
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Transport:</span>{" "}
              {getTransportInfo()}
            </div>
            <div>
              <span className="font-medium">Reconnect Attempts:</span>{" "}
              {reconnectAttempts}
            </div>
            <div>
              <span className="font-medium">Network Status:</span>{" "}
              {navigator.onLine ? "Online" : "Offline"}
            </div>
            <div>
              <span className="font-medium">Socket ID:</span>{" "}
              {socket?.id || "None"}
            </div>
          </div>

          <Button
            onClick={forceReconnect}
            variant="outline"
            size="sm"
            disabled={!socket}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Force Reconnect
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {deviceInfo.isMobile ? (
              <Smartphone className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Device Type:</span>{" "}
              {deviceInfo.isMobile ? "Mobile" : "Desktop"}
            </div>
            <div>
              <span className="font-medium">iOS Device:</span>{" "}
              {deviceInfo.isIOS ? "Yes" : "No"}
            </div>
            <div>
              <span className="font-medium">Safari Browser:</span>{" "}
              {deviceInfo.isSafari ? "Yes" : "No"}
            </div>
            <div>
              <span className="font-medium">Connection Type:</span>{" "}
              {deviceInfo.connectionType}
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-medium">User Agent:</span>
            <div className="text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">
              {deviceInfo.userAgent}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection History</CardTitle>
          <CardDescription>Recent connection events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {connectionHistory.length === 0 ? (
              <div className="text-gray-500 text-sm">
                No events recorded yet
              </div>
            ) : (
              connectionHistory.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm border-b pb-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{event.event}</span>
                    {event.details && (
                      <span className="text-gray-500">
                        {typeof event.details === "object"
                          ? JSON.stringify(event.details)
                          : event.details}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSocketDiagnostics;
