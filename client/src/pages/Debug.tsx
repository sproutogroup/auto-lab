// TODO: remove this Debug component before going to prod.
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Play,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Development-only component for testing push notifications
export default function DebugPage() {
  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [logs, setLogs] = useState<
    Array<{
      timestamp: string;
      message: string;
      type: "info" | "error" | "success";
    }>
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Debug tools are not available in production.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  useEffect(() => {
    // Gather device information
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      serviceWorkerSupport: "serviceWorker" in navigator,
      pushManagerSupport: "PushManager" in window,
      notificationSupport: "Notification" in window,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSecure:
        location.protocol === "https:" || location.hostname === "localhost",
    };
    setDeviceInfo(info);
  }, []);

  const addLog = (
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    const timestamp = new Date().toISOString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const generateSubscription = async () => {
    setIsGenerating(true);

    try {
      addLog("Starting push subscription generation...", "info");

      // Check support
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker not supported");
      }
      if (!("PushManager" in window)) {
        throw new Error("Push Manager not supported");
      }
      if (!("Notification" in window)) {
        throw new Error("Notifications not supported");
      }

      addLog("✓ All push notification APIs supported", "success");

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(`Notification permission denied: ${permission}`);
      }
      addLog("✓ Notification permission granted", "success");

      // Register service worker
      await navigator.serviceWorker.register("/sw.js");
      const registration = await navigator.serviceWorker.ready;
      addLog("✓ Service Worker registered and ready", "success");

      // VAPID public key from Phase 3.1
      const vapidPublicKey =
        "BAo_FnrKbB2p6gzRN8xTF65HGV94Xu-TSYf2VfaaISf9_Gn5j91I5X8v_1pb48aRFwV_dZrvUdVSWKRMDDVKHu8";
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      addLog("✓ VAPID key converted to Uint8Array", "success");

      // Generate subscription
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey,
      });

      setSubscription(sub);
      addLog("✓ Browser subscription generated successfully", "success");

      // Debug subscription object structure
      addLog(
        `Subscription object structure: ${JSON.stringify(Object.keys(sub))}`,
        "info",
      );
      addLog(
        `Subscription keys available: ${sub.keys ? JSON.stringify(Object.keys(sub.keys)) : "No keys object"}`,
        "info",
      );

      // Handle different subscription key formats (iOS vs other browsers)
      let p256dhKey, authKey;

      // Helper function to convert ArrayBuffer to base64 string
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      };

      if (sub.keys && sub.keys.p256dh && sub.keys.auth) {
        // Standard format - check if they're ArrayBuffers (iOS) or strings (other browsers)
        if (sub.keys.p256dh instanceof ArrayBuffer) {
          addLog(
            "Converting iOS ArrayBuffer keys to base64 strings...",
            "info",
          );
          p256dhKey = arrayBufferToBase64(sub.keys.p256dh);
          authKey = arrayBufferToBase64(sub.keys.auth);
        } else {
          // Already strings
          p256dhKey = sub.keys.p256dh;
          authKey = sub.keys.auth;
        }
      } else if (sub.getKey) {
        // iOS Safari format - use getKey method
        try {
          const p256dhBuffer = sub.getKey("p256dh");
          const authBuffer = sub.getKey("auth");

          if (p256dhBuffer instanceof ArrayBuffer) {
            addLog(
              "Converting iOS getKey() ArrayBuffer results to base64...",
              "info",
            );
            p256dhKey = arrayBufferToBase64(p256dhBuffer);
            authKey = arrayBufferToBase64(authBuffer);
          } else {
            p256dhKey = p256dhBuffer;
            authKey = authBuffer;
          }
        } catch (e) {
          addLog(`getKey method failed: ${e.message}`, "error");
        }
      }

      if (!p256dhKey || !authKey) {
        // Try to extract keys from the subscription object directly
        addLog(
          "Attempting to extract keys from subscription object...",
          "info",
        );
        const subStr = JSON.stringify(sub);
        addLog(`Full subscription object: ${subStr}`, "info");

        // Manual key extraction for iOS
        if (sub.keys) {
          const keysObj = sub.keys;
          let rawP256dh =
            keysObj.p256dh || keysObj["p256dh"] || Object.values(keysObj)[0];
          let rawAuth =
            keysObj.auth || keysObj["auth"] || Object.values(keysObj)[1];

          if (rawP256dh instanceof ArrayBuffer) {
            p256dhKey = arrayBufferToBase64(rawP256dh);
          } else {
            p256dhKey = rawP256dh;
          }

          if (rawAuth instanceof ArrayBuffer) {
            authKey = arrayBufferToBase64(rawAuth);
          } else {
            authKey = rawAuth;
          }
        }
      }

      if (!p256dhKey || !authKey) {
        throw new Error(
          "Unable to extract subscription keys - iOS Safari may have different key structure",
        );
      }

      const subscriptionObject = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: p256dhKey,
          auth: authKey,
        },
      };

      addLog(`Subscription endpoint: ${sub.endpoint}`, "info");
      addLog(
        `Keys extracted: p256dh=${p256dhKey.substring(0, 20)}..., auth=${authKey.substring(0, 20)}...`,
        "info",
      );
      addLog(
        `Key lengths: p256dh=${p256dhKey.length} chars, auth=${authKey.length} chars`,
        "info",
      );

      // Register with API
      addLog("Registering subscription with API...", "info");
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: 1,
          endpoint: sub.endpoint,
          keys: {
            p256dh: p256dhKey,
            auth: authKey,
          },
          device_type: deviceInfo?.isIOS ? "iOS" : "Browser",
          user_agent: navigator.userAgent,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubscriptionId(result.subscription_id);
        addLog(
          `✓ Subscription registered with ID: ${result.subscription_id}`,
          "success",
        );
      } else {
        throw new Error(`API registration failed: ${result.message}`);
      }
    } catch (error: any) {
      addLog(`Subscription generation failed: ${error.message}`, "error");
      console.error("Subscription error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendTestPush = async () => {
    if (!subscriptionId) {
      addLog("No subscription ID available", "error");
      return;
    }

    setIsSending(true);

    try {
      addLog(`Sending test push to subscription ID: ${subscriptionId}`, "info");

      const response = await fetch("/api/notifications/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
          notification: {
            title: "🔔 In-App Test",
            body: "Push from in-app debug UI",
            icon: "/assets/icon-192.png",
            url: "/inbox",
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        addLog("✓ Test push sent successfully!", "success");
        addLog(`Server response: ${JSON.stringify(result, null, 2)}`, "info");
      } else {
        throw new Error(`Push test failed: ${result.message}`);
      }
    } catch (error: any) {
      addLog(`Push test failed: ${error.message}`, "error");
      console.error("Push test error:", error);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Debug - Push Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Development-only testing interface for PWA push notifications
        </p>
        <Badge variant="outline" className="mt-2">
          Phase 3.3 - In-App Push Test UI
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Device Information
            </CardTitle>
            <CardDescription>
              Current device and browser capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deviceInfo && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Platform:</span>
                  <span className="font-mono">{deviceInfo.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span>iOS Device:</span>
                  <Badge variant={deviceInfo.isIOS ? "default" : "secondary"}>
                    {deviceInfo.isIOS ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Service Worker:</span>
                  <Badge
                    variant={
                      deviceInfo.serviceWorkerSupport
                        ? "default"
                        : "destructive"
                    }
                  >
                    {deviceInfo.serviceWorkerSupport
                      ? "Supported"
                      : "Not Supported"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Push Manager:</span>
                  <Badge
                    variant={
                      deviceInfo.pushManagerSupport ? "default" : "destructive"
                    }
                  >
                    {deviceInfo.pushManagerSupport
                      ? "Supported"
                      : "Not Supported"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Notifications:</span>
                  <Badge
                    variant={
                      deviceInfo.notificationSupport ? "default" : "destructive"
                    }
                  >
                    {deviceInfo.notificationSupport
                      ? "Supported"
                      : "Not Supported"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Secure Context:</span>
                  <Badge
                    variant={deviceInfo.isSecure ? "default" : "destructive"}
                  >
                    {deviceInfo.isSecure ? "HTTPS" : "HTTP"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Subscription Status
            </CardTitle>
            <CardDescription>
              Current push subscription information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionId ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">
                    Active Subscription
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ID: <span className="font-mono">{subscriptionId}</span>
                </div>
                {subscription && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Endpoint:{" "}
                    <span className="font-mono text-xs">
                      {subscription.endpoint.substring(0, 50)}...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  No active subscription
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>
            Generate subscriptions and send test push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={generateSubscription}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Subscription"}
            </Button>

            <Button
              onClick={sendTestPush}
              disabled={isSending || !subscriptionId}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isSending ? "Sending..." : "Send Test Push"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Debug Logs</span>
            <Button
              onClick={clearLogs}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear Log
            </Button>
          </CardTitle>
          <CardDescription>Real-time logs and server responses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2 text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.type)}
                    <span className="text-gray-400 text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                    {log.message}
                  </pre>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Development Warning */}
      <Alert className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Development Only:</strong> This debug interface is
          automatically hidden in production builds. Remove this component
          before deploying to production.
        </AlertDescription>
      </Alert>
    </div>
  );
}
