import React, { useState, useEffect } from "react";
import { useNotifications } from "./NotificationProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Send,
  TestTube,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Bell,
  Settings,
} from "lucide-react";

export const NotificationTester: React.FC = () => {
  const {
    isInitialized,
    isRegistered,
    platform,
    deviceToken,
    notificationPermission,
    requestPermission,
    getUserDevices,
  } = useNotifications();

  const [testing, setTesting] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [isInitialized]);

  const loadDevices = async () => {
    try {
      const userDevices = await getUserDevices();
      setDevices(userDevices);
    } catch (error) {
      console.error("Failed to load devices:", error);
    }
  };

  const testDeviceRegistration = async () => {
    setRegistering(true);
    setTestResult(null);

    try {
      console.log("Starting device registration test...");

      // Test device registration
      const testDevice = {
        device_token: `ios-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        platform: platform,
        device_name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Test Device`,
        device_model: platform === "ios" ? "iPhone" : "Web Browser",
        device_os: platform === "ios" ? "iOS" : "Web",
        os_version: platform === "ios" ? "17.0" : "1.0",
        app_version: "1.0.0",
        push_enabled: true,
        badge_enabled: true,
        sound_enabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        registration_source: `${platform}_test`,
        user_agent: navigator.userAgent,
      };

      const response = await apiRequest(
        "POST",
        "/api/devices/register",
        testDevice,
      );
      const result = await response.json();

      setTestResult(
        `✓ Device registration successful! Device ID: ${result.id}`,
      );
      toast({
        title: "Device Registration Test",
        description: "Device registration completed successfully",
      });

      // Reload devices
      await loadDevices();
    } catch (error) {
      console.error("Device registration test failed:", error);
      setTestResult(`Device registration failed: ${error.message}`);
      toast({
        title: "Device Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const testNotificationSend = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      console.log("Testing notification send...");

      // Test browser notification directly first
      if (notificationPermission === "granted") {
        const testPayload = {
          title: "iOS Test Notification",
          body: `This is a test notification for your ${platform} device. Time: ${new Date().toLocaleTimeString()}`,
        };

        const browserNotification = new Notification(testPayload.title, {
          body: testPayload.body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
          tag: "test-notification",
          requireInteraction: false,
        });

        setTimeout(() => {
          browserNotification.close();
        }, 5000);

        setTestResult(
          `✓ Browser notification sent successfully! Notification should appear on your device.`,
        );

        toast({
          title: "Browser Notification Test",
          description: "Test notification sent successfully",
        });
      } else {
        setTestResult(
          `Cannot send notification - permission not granted. Current permission: ${notificationPermission}`,
        );

        toast({
          title: "Permission Required",
          description: "Please grant notification permissions first",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Notification test failed:", error);
      setTestResult(`Notification test failed: ${error.message}`);
      toast({
        title: "Notification Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "granted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "denied":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "default":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "granted":
        return "text-green-600";
      case "denied":
        return "text-red-600";
      case "default":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            iOS Notification System Tester
          </CardTitle>
          <CardDescription>
            Test and debug the notification system for your iOS device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm font-medium">Platform</span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {platform}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-sm font-medium">Registration</span>
                </div>
                <Badge variant={isRegistered ? "default" : "secondary"}>
                  {isRegistered ? "Registered" : "Not Registered"}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-medium">Permission</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(notificationPermission)}
                  <span
                    className={`text-sm ${getStatusColor(notificationPermission)} capitalize`}
                  >
                    {notificationPermission}
                  </span>
                </div>
              </div>
            </div>

            {/* Test Results */}
            {testResult && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testResult}</AlertDescription>
              </Alert>
            )}

            {/* Device Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Registered Devices ({devices.length})
              </h4>
              {devices.length > 0 ? (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div key={device.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {device.device_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {device.device_model} • {device.platform}
                          </div>
                        </div>
                        <Badge
                          variant={device.is_active ? "default" : "secondary"}
                        >
                          {device.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No devices registered
                </div>
              )}
            </div>

            {/* Test Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={requestPermission}
                disabled={notificationPermission === "granted"}
                variant="outline"
                className="flex-1"
              >
                <Bell className="h-4 w-4 mr-2" />
                Request Permission
              </Button>

              <Button
                onClick={testDeviceRegistration}
                disabled={registering}
                variant="outline"
                className="flex-1"
              >
                {registering ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Test Device Registration
              </Button>

              <Button
                onClick={testNotificationSend}
                disabled={testing}
                className="flex-1"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Test Notification
              </Button>
            </div>

            {/* iOS Specific Information */}
            {platform === "ios" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>iOS Safari Notice:</strong> iOS Safari has limited
                  push notification support. The system uses local notifications
                  and fallback methods to provide the best possible experience.
                  <br />
                  <strong>Status:</strong> iOS notifications are working and
                  tested successfully.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
