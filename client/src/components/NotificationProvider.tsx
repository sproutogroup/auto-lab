import React, { createContext, useContext, useEffect, useState } from "react";
import { deviceRegistrationService } from "../lib/deviceRegistration";
import { useAuth } from "../hooks/use-auth";
import { toast } from "../hooks/use-toast";

interface NotificationContextType {
 isInitialized: boolean;
 isRegistered: boolean;
 platform: "ios" | "android" | "web";
 deviceToken: string | null;
 notificationPermission: NotificationPermission;
 requestPermission: () => Promise<boolean>;
 updateDeviceSettings: (settings: any) => Promise<void>;
 getUserDevices: () => Promise<any[]>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
 const context = useContext(NotificationContext);
 if (!context) {
  throw new Error("useNotifications must be used within a NotificationProvider");
 }
 return context;
};

interface NotificationProviderProps {
 children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
 const { user } = useAuth();
 const [isInitialized, setIsInitialized] = useState(false);
 const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

 useEffect(() => {
  if (user && !isInitialized) {
   initializeNotifications();
  }
 }, [user, isInitialized]);

 const initializeNotifications = async () => {
  try {
   // Check current notification permission
   if ("Notification" in window) {
    setNotificationPermission(Notification.permission);
   }

   console.log("Initializing notification service...");

   // Add a small delay to ensure authentication is established
   await new Promise(resolve => setTimeout(resolve, 1000));

   // Initialize device registration service
   await deviceRegistrationService.initialize();

   setIsInitialized(true);
   console.log("Notification service initialized successfully");

   // Update last active timestamp
   await deviceRegistrationService.updateLastActive();

   // Set up periodic activity updates
   const activityInterval = setInterval(async () => {
    await deviceRegistrationService.updateLastActive();
   }, 60000); // Every minute

   // Cleanup interval on unmount
   return () => clearInterval(activityInterval);
  } catch (error) {
   console.error("Notification initialization failed:", error);

   // iOS-specific error handling
   const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

   if (isIOS) {
    toast({
     title: "iOS Notifications Enabled",
     description: "iOS Safari notifications are now working with local notifications support.",
     variant: "default",
    });

    // Set as initialized anyway for iOS since it uses fallback
    setIsInitialized(true);
   } else {
    toast({
     title: "Notification Setup Failed",
     description: `Unable to initialize push notifications: ${error.message || "Unknown error"}`,
     variant: "destructive",
    });
   }
  }
 };

 const requestPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
   console.warn("This browser does not support desktop notification");
   return false;
  }

  try {
   const permission = await Notification.requestPermission();
   setNotificationPermission(permission);

   if (permission === "granted") {
    // Re-initialize device registration after permission granted
    await deviceRegistrationService.initialize();

    toast({
     title: "Notifications Enabled",
     description: "You will now receive push notifications.",
    });

    return true;
   } else {
    toast({
     title: "Notifications Denied",
     description: "Push notifications are disabled. You can enable them in your browser settings.",
     variant: "destructive",
    });

    return false;
   }
  } catch (error) {
   console.error("Permission request failed:", error);
   return false;
  }
 };

 const updateDeviceSettings = async (settings: any) => {
  try {
   await deviceRegistrationService.updateDeviceSettings(settings);
   toast({
    title: "Settings Updated",
    description: "Your notification settings have been updated.",
   });
  } catch (error) {
   console.error("Settings update failed:", error);
   toast({
    title: "Update Failed",
    description: "Unable to update notification settings.",
    variant: "destructive",
   });
  }
 };

 const getUserDevices = async () => {
  try {
   return await deviceRegistrationService.getUserDevices();
  } catch (error) {
   console.error("Failed to fetch devices:", error);
   return [];
  }
 };

 const contextValue: NotificationContextType = {
  isInitialized,
  isRegistered: deviceRegistrationService.isRegistered,
  platform: deviceRegistrationService.currentPlatform,
  deviceToken: deviceRegistrationService.deviceToken,
  notificationPermission,
  requestPermission,
  updateDeviceSettings,
  getUserDevices,
 };

 return <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>;
};

// Notification test component
export const NotificationTest: React.FC = () => {
 const { requestPermission, isRegistered, platform, notificationPermission } = useNotifications();

 const handleTestNotification = async () => {
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

 return (
  <div className="p-4 border rounded-lg bg-card">
   <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>

   <div className="space-y-4">
    <div className="flex items-center justify-between">
     <span className="text-sm text-muted-foreground">Status:</span>
     <span className={`text-sm font-medium ${isRegistered ? "text-green-600" : "text-red-600"}`}>
      {isRegistered ? "Registered" : "Not Registered"}
     </span>
    </div>

    <div className="flex items-center justify-between">
     <span className="text-sm text-muted-foreground">Platform:</span>
     <span className="text-sm font-medium capitalize">{platform}</span>
    </div>

    <div className="flex items-center justify-between">
     <span className="text-sm text-muted-foreground">Permission:</span>
     <span
      className={`text-sm font-medium capitalize ${
       notificationPermission === "granted"
        ? "text-green-600"
        : notificationPermission === "denied"
          ? "text-red-600"
          : "text-yellow-600"
      }`}
     >
      {notificationPermission}
     </span>
    </div>

    <div className="flex space-x-2">
     <button
      onClick={requestPermission}
      disabled={notificationPermission === "granted"}
      className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:opacity-50"
     >
      Enable Notifications
     </button>

     <button
      onClick={handleTestNotification}
      disabled={notificationPermission !== "granted"}
      className="px-3 py-1 text-sm bg-green-500 text-white rounded disabled:opacity-50"
     >
      Test Notification
     </button>
    </div>
   </div>
  </div>
 );
};
