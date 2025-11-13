import React, { useState, useEffect } from "react";
import { useNotifications } from "./NotificationProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "../hooks/use-toast";
import {
 Smartphone,
 Tablet,
 Monitor,
 Trash2,
 Settings,
 Bell,
 BellOff,
 CheckCircle,
 XCircle,
 AlertCircle,
 Loader2,
} from "lucide-react";

interface Device {
 id: number;
 device_token: string;
 platform: "ios" | "android" | "web";
 device_name?: string;
 device_model?: string;
 device_os?: string;
 os_version?: string;
 app_version?: string;
 push_enabled: boolean;
 badge_enabled: boolean;
 sound_enabled: boolean;
 timezone?: string;
 language?: string;
 is_active: boolean;
 last_active?: Date;
 created_at: Date;
 updated_at: Date;
}

export const DeviceManager: React.FC = () => {
 const {
  isInitialized,
  isRegistered,
  platform,
  deviceToken,
  notificationPermission,
  requestPermission,
  updateDeviceSettings,
  getUserDevices,
 } = useNotifications();

 const [devices, setDevices] = useState<Device[]>([]);
 const [loading, setLoading] = useState(true);
 const [updating, setUpdating] = useState<number | null>(null);

 useEffect(() => {
  if (isInitialized) {
   loadDevices();
  }
 }, [isInitialized]);

 const loadDevices = async () => {
  try {
   setLoading(true);
   const userDevices = await getUserDevices();
   setDevices(userDevices);
  } catch (error) {
   console.error("Failed to load devices:", error);
   toast({
    title: "Error",
    description: "Failed to load device information",
    variant: "destructive",
   });
  } finally {
   setLoading(false);
  }
 };

 const updateDevice = async (deviceId: number, settings: Partial<Device>) => {
  try {
   setUpdating(deviceId);
   await updateDeviceSettings(settings);
   await loadDevices(); // Refresh device list
  } catch (error) {
   console.error("Failed to update device:", error);
  } finally {
   setUpdating(null);
  }
 };

 const deleteDevice = async (deviceId: number) => {
  try {
   await fetch(`/api/devices/${deviceId}`, {
    method: "DELETE",
   });

   await loadDevices();
   toast({
    title: "Device Removed",
    description: "Device has been removed from your account",
   });
  } catch (error) {
   console.error("Failed to delete device:", error);
   toast({
    title: "Error",
    description: "Failed to remove device",
    variant: "destructive",
   });
  }
 };

 const testNotification = async () => {
  if (notificationPermission === "granted") {
   new Notification("Test Notification", {
    body: "This is a test notification from the dealership management system",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    tag: "test-notification",
    requireInteraction: false,
   });
  } else {
   toast({
    title: "Permission Required",
    description: "Please enable notifications first.",
    variant: "destructive",
   });
  }
 };

 const getDeviceIcon = (platform: string, deviceModel?: string) => {
  switch (platform) {
   case "ios":
    return deviceModel?.includes("iPad") ? (
     <Tablet className="h-5 w-5" />
    ) : (
     <Smartphone className="h-5 w-5" />
    );
   case "android":
    return <Smartphone className="h-5 w-5" />;
   case "web":
    return <Monitor className="h-5 w-5" />;
   default:
    return <Monitor className="h-5 w-5" />;
  }
 };

 const getStatusColor = (isActive: boolean) => {
  return isActive ? "bg-green-500" : "bg-gray-400";
 };

 const getPermissionStatus = () => {
  switch (notificationPermission) {
   case "granted":
    return {
     icon: <CheckCircle className="h-4 w-4 text-green-500" />,
     text: "Granted",
     color: "text-green-600",
    };
   case "denied":
    return {
     icon: <XCircle className="h-4 w-4 text-red-500" />,
     text: "Denied",
     color: "text-red-600",
    };
   case "default":
    return {
     icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
     text: "Not Asked",
     color: "text-yellow-600",
    };
   default:
    return {
     icon: <AlertCircle className="h-4 w-4 text-gray-500" />,
     text: "Unknown",
     color: "text-gray-600",
    };
  }
 };

 const formatLastActive = (lastActive?: Date) => {
  if (!lastActive) return "Never";
  const date = new Date(lastActive);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
 };

 const permissionStatus = getPermissionStatus();

 return (
  <div className="space-y-6">
   {/* Current Device Status */}
   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <Bell className="h-5 w-5" />
      Notification Status
     </CardTitle>
     <CardDescription>Current device and notification settings</CardDescription>
    </CardHeader>
    <CardContent>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
       <Label className="text-sm font-medium">Registration Status</Label>
       <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isRegistered ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm">{isRegistered ? "Registered" : "Not Registered"}</span>
       </div>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">Platform</Label>
       <div className="flex items-center gap-2">
        {getDeviceIcon(platform)}
        <span className="text-sm capitalize">{platform}</span>
       </div>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">Permission</Label>
       <div className="flex items-center gap-2">
        {permissionStatus.icon}
        <span className={`text-sm ${permissionStatus.color}`}>{permissionStatus.text}</span>
       </div>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">Actions</Label>
       <div className="flex gap-2">
        <Button
         size="sm"
         onClick={requestPermission}
         disabled={notificationPermission === "granted"}
         variant="outline"
        >
         Enable
        </Button>
        <Button
         size="sm"
         onClick={testNotification}
         disabled={notificationPermission !== "granted"}
         variant="outline"
        >
         Test
        </Button>
       </div>
      </div>
     </div>
    </CardContent>
   </Card>

   {/* Device List */}
   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <Settings className="h-5 w-5" />
      Registered Devices
     </CardTitle>
     <CardDescription>Manage your registered devices and notification preferences</CardDescription>
    </CardHeader>
    <CardContent>
     {loading ? (
      <div className="flex items-center justify-center py-8">
       <Loader2 className="h-6 w-6 animate-spin" />
       <span className="ml-2">Loading devices...</span>
      </div>
     ) : devices.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">No devices registered yet</div>
     ) : (
      <div className="space-y-4">
       {devices.map(device => (
        <div key={device.id} className="border rounded-lg p-4">
         <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
           {getDeviceIcon(device.platform, device.device_model)}
           <div>
            <div className="font-medium">{device.device_name || `${device.platform} Device`}</div>
            <div className="text-sm text-muted-foreground">
             {device.device_model} • {device.device_os} {device.os_version}
            </div>
           </div>
          </div>
          <div className="flex items-center gap-2">
           <Badge variant={device.is_active ? "default" : "secondary"}>
            {device.is_active ? "Active" : "Inactive"}
           </Badge>
           <Button size="sm" variant="destructive" onClick={() => deleteDevice(device.id)}>
            <Trash2 className="h-4 w-4" />
           </Button>
          </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center justify-between">
           <Label htmlFor={`push-${device.id}`} className="text-sm">
            Push Notifications
           </Label>
           <Switch
            id={`push-${device.id}`}
            checked={device.push_enabled}
            disabled={updating === device.id}
            onCheckedChange={checked => updateDevice(device.id, { push_enabled: checked })}
           />
          </div>

          <div className="flex items-center justify-between">
           <Label htmlFor={`badge-${device.id}`} className="text-sm">
            Badge Count
           </Label>
           <Switch
            id={`badge-${device.id}`}
            checked={device.badge_enabled}
            disabled={updating === device.id}
            onCheckedChange={checked => updateDevice(device.id, { badge_enabled: checked })}
           />
          </div>

          <div className="flex items-center justify-between">
           <Label htmlFor={`sound-${device.id}`} className="text-sm">
            Sound Alerts
           </Label>
           <Switch
            id={`sound-${device.id}`}
            checked={device.sound_enabled}
            disabled={updating === device.id}
            onCheckedChange={checked => updateDevice(device.id, { sound_enabled: checked })}
           />
          </div>
         </div>

         <div className="text-xs text-muted-foreground">
          Last active: {formatLastActive(device.last_active)} • Registered:{" "}
          {new Date(device.created_at).toLocaleDateString()}
         </div>
        </div>
       ))}
      </div>
     )}
    </CardContent>
   </Card>
  </div>
 );
};
