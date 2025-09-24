// Service Worker for Push Notifications - iOS Safari Compatible
console.log("Service Worker loading...");

const CACHE_NAME = "autolab-v1";
const urlsToCache = ["/", "/offline.html"];

// Install event - cache resources with iOS Safari compatibility
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Cache opened, adding URLs...");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("URLs cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Cache failed:", error);
        return self.skipWaiting();
      }),
  );
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network with Chrome CSP filtering
self.addEventListener("fetch", (event) => {
  // Block requests to replit.com to prevent CSP violations
  if (event.request.url.includes("replit.com")) {
    event.respondWith(new Response("", { status: 204 }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    }),
  );
});

// Push event - handle incoming push notifications (Phase 3 Implementation)
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  let notificationData = {
    title: "AUTOLAB Notification",
    body: "You have a new notification",
    icon: "/icons/icon-192x192.png",
    url: "/",
    tag: "autolab-notification",
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log("Push notification data:", notificationData);
    } catch (error) {
      console.error("Error parsing push data:", error);
    }
  }

  // Phase 3: Enhanced notification options with PWA-optimized display
  const options = {
    body: notificationData.body || "You have a new notification",
    icon: notificationData.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: notificationData.tag || "autolab-notification",
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: notificationData.url || "/",
      notification_id: notificationData.notification_id,
      timestamp: Date.now(),
      type: notificationData.type || "general",
    },
    actions: [
      {
        action: "view",
        title: "View",
        icon: "/icons/icon-32x32.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
        icon: "/icons/icon-32x32.png",
      },
    ],
  };

  // iOS Safari compatibility - simpler notification options
  const isIOSSafari =
    navigator.userAgent.includes("iPhone") ||
    navigator.userAgent.includes("iPad");
  if (isIOSSafari) {
    options.requireInteraction = false;
    delete options.actions;
    delete options.badge;
    delete options.vibrate;
  }

  // Phase 3: Show notification and handle display
  const promiseChain = self.registration.showNotification(
    notificationData.title || "AUTOLAB Notification",
    options,
  );

  event.waitUntil(promiseChain);
});

// Notification click event - Phase 3 Enhanced with PWA focus/open handling
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === "dismiss") {
    // Just close the notification
    return;
  }

  // Phase 3: Enhanced app focus or open logic for PWA
  const urlToOpen = notificationData.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Phase 3: Check if there's already a window/tab open with the app
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          // Focus any existing app window (not just exact URL match)
          if (client.url.includes(self.location.origin) && "focus" in client) {
            console.log("Focusing existing app window");
            return client.focus().then(() => {
              // Navigate to the specific URL after focusing
              return client.postMessage({
                type: "NAVIGATE_TO",
                url: urlToOpen,
              });
            });
          }
        }

        // Phase 3: If no app window is open, open a new one
        if (clients.openWindow) {
          console.log("Opening new app window:", urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      }),
  );

  // Phase 3: Send analytics event back to the main thread
  if (notificationData.notification_id) {
    event.waitUntil(
      fetch("/api/notifications/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notification_id: notificationData.notification_id,
          event_type: action === "view" ? "clicked" : "opened",
          timestamp: new Date().toISOString(),
        }),
      }).catch((error) => {
        console.error("Failed to send analytics:", error);
      }),
    );
  }
});

// Notification close event
self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);

  const notificationData = event.notification.data || {};

  // Send analytics event for notification dismissal
  if (notificationData.notification_id) {
    event.waitUntil(
      fetch("/api/notifications/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notification_id: notificationData.notification_id,
          event_type: "dismissed",
          timestamp: new Date().toISOString(),
        }),
      }).catch((error) => {
        console.error("Failed to send analytics:", error);
      }),
    );
  }
});

// Background sync for offline notifications - Phase 3 Enhanced
self.addEventListener("sync", (event) => {
  console.log("Background sync event:", event.tag);

  if (event.tag === "push-notification-sync") {
    event.waitUntil(
      // Phase 3: Sync any pending notifications when back online
      fetch("/api/notifications/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          sync_type: "push_notifications",
        }),
      })
        .then((response) => {
          console.log("Notification sync successful:", response.status);
          return response.json();
        })
        .then((data) => {
          console.log("Sync response:", data);

          // Phase 3: Show any pending notifications that were queued offline
          if (
            data.pending_notifications &&
            data.pending_notifications.length > 0
          ) {
            data.pending_notifications.forEach((notification) => {
              self.registration.showNotification(notification.title, {
                body: notification.body,
                icon: notification.icon || "/icons/icon-192x192.png",
                tag: notification.tag || "autolab-sync",
                data: notification.data,
              });
            });
          }
        })
        .catch((error) => {
          console.error("Failed to sync notifications:", error);
        }),
    );
  }
});

// Message event for communication with main thread - Phase 3 Enhanced
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  // Phase 3: Handle navigation requests from notification clicks
  if (event.data && event.data.type === "NAVIGATE_TO") {
    // This will be handled by the main thread
    console.log("Navigation request received:", event.data.url);
  }

  // Phase 3: Handle push subscription updates
  if (event.data && event.data.type === "UPDATE_SUBSCRIPTION") {
    console.log("Push subscription update requested");
    // Trigger subscription refresh
    event.ports[0].postMessage({ type: "SUBSCRIPTION_UPDATE_REQUIRED" });
  }
});
