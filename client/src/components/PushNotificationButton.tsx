import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { pushNotificationManager } from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";

interface PushNotificationButtonProps {
 userId: number;
}

export function PushNotificationButton({ userId }: PushNotificationButtonProps) {
 const [isSubscribed, setIsSubscribed] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const { toast } = useToast();

 // Check subscription status
 const { data: subscriptions } = useQuery({
  queryKey: ["/api/push/subscriptions"],
  queryFn: async () => {
   const response = await fetch("/api/push/subscriptions");
   if (!response.ok) throw new Error("Failed to fetch subscriptions");
   return response.json();
  },
 });

 useEffect(() => {
  const checkSubscription = async () => {
   const subscribed = await pushNotificationManager.isSubscribed();
   setIsSubscribed(subscribed);
  };

  checkSubscription();
 }, []);

 const handleToggleNotifications = async () => {
  setIsLoading(true);

  try {
   if (isSubscribed) {
    // Unsubscribe from notifications
    const success = await pushNotificationManager.unsubscribeFromPushNotifications();
    if (success) {
     setIsSubscribed(false);
     toast({
      title: "Push notifications disabled",
      description: "You will no longer receive push notifications on this device.",
     });
    }
   } else {
    // Check if we're on iOS Safari
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOSSafari) {
     // For iOS Safari, use local notifications instead of push notifications
     console.log("iOS Safari detected - using local notifications");

     try {
      // Request notification permission for local notifications
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
       setIsSubscribed(true);

       // Store iOS notification preference
       localStorage.setItem("ios_notifications_enabled", "true");
       localStorage.setItem("ios_user_id", userId.toString());

       // Show success message
       toast({
        title: "iOS Notifications Enabled",
        description: "Local notifications are now enabled. You'll receive notifications while using the app.",
       });

       // Test notification
       setTimeout(() => {
        new Notification("AUTOLAB Notifications", {
         body: "Notifications are now enabled for your iOS device!",
         icon: "/icons/icon-192x192.png",
        });
       }, 1000);
      } else {
       toast({
        title: "Permission Required",
        description: "Please allow notifications in Safari settings to receive updates.",
        variant: "destructive",
       });
      }
     } catch (error) {
      console.error("Error setting up iOS notifications:", error);
      toast({
       title: "Setup Error",
       description: "Failed to set up notifications. Please try again.",
       variant: "destructive",
      });
     }
     return;
    }

    // Check if PushManager is supported
    if (!("PushManager" in window)) {
     toast({
      title: "Push notifications not supported",
      description: "Your browser doesn't support push notifications.",
      variant: "destructive",
     });
     return;
    }

    // Subscribe to notifications
    console.log("Attempting to subscribe to push notifications...");
    const success = await pushNotificationManager.subscribeToPushNotifications(userId);
    console.log("Subscription result:", success);

    if (success) {
     setIsSubscribed(true);
     toast({
      title: "Push notifications enabled",
      description: "You will now receive push notifications on this device.",
     });
    } else {
     // Check the actual permission state
     const permission = Notification.permission;
     console.log("Current permission state:", permission);

     // Check if service worker is supported
     if (!("serviceWorker" in navigator)) {
      toast({
       title: "Service Worker not supported",
       description: "Your browser doesn't support service workers.",
       variant: "destructive",
      });
     } else if (permission === "granted") {
      toast({
       title: "Service Worker Issue",
       description: "Notifications are allowed but service worker failed to register.",
       variant: "destructive",
      });
     } else {
      toast({
       title: "Push notifications blocked",
       description: "Please allow notifications in your browser settings.",
       variant: "destructive",
      });
     }
    }
   }
  } catch (error) {
   console.error("Error toggling push notifications:", error);
   toast({
    title: "Error",
    description: "Failed to update push notification settings.",
    variant: "destructive",
   });
  } finally {
   setIsLoading(false);
  }
 };

 return (
  <Button variant="outline" size="sm" onClick={handleToggleNotifications} disabled={isLoading}>
   {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
  </Button>
 );
}
