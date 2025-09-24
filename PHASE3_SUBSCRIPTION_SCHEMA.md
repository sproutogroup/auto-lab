# Phase 3 - Client-Side PWA Push Subscription Schema

## JSON Schema for POST /api/subscriptions

PWA-compatible subscription endpoint for client-side push notification management.

### Request Body Schema

```json
{
  "type": "object",
  "properties": {
    "user_id": {
      "type": "integer",
      "description": "ID of the user creating the subscription"
    },
    "endpoint": {
      "type": "string",
      "description": "Push service endpoint URL from PushSubscription",
      "example": "https://fcm.googleapis.com/fcm/send/..."
    },
    "keys": {
      "type": "object",
      "properties": {
        "p256dh": {
          "type": "string",
          "description": "P-256 ECDH public key for encryption"
        },
        "auth": {
          "type": "string",
          "description": "Authentication secret for encryption"
        }
      },
      "required": ["p256dh", "auth"]
    },
    "device_type": {
      "type": "string",
      "enum": ["iOS", "Android", "Windows", "macOS", "Desktop"],
      "description": "Device type for targeting"
    },
    "user_agent": {
      "type": "string",
      "description": "Browser user agent string"
    }
  },
  "required": ["user_id", "endpoint", "keys", "device_type", "user_agent"]
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether subscription was created successfully"
    },
    "subscription_id": {
      "type": "integer",
      "description": "ID of the created subscription"
    },
    "message": {
      "type": "string",
      "description": "Success or error message"
    }
  },
  "required": ["success", "message"]
}
```

## Example Usage

### JavaScript Subscription Flow

```javascript
// Phase 3: Complete subscription flow
const registration = await navigator.serviceWorker.register("/sw.js");
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});

// Send subscription to server
const response = await fetch("/api/subscriptions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    user_id: currentUser.id,
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    device_type: getDeviceType(),
    user_agent: navigator.userAgent,
  }),
});

const result = await response.json();
console.log("Subscription result:", result);
```

### Notification Payload Schema

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Notification title"
    },
    "body": {
      "type": "string",
      "description": "Notification body text"
    },
    "icon": {
      "type": "string",
      "description": "URL to notification icon",
      "default": "/icons/icon-192x192.png"
    },
    "url": {
      "type": "string",
      "description": "URL to open when notification is clicked",
      "default": "/"
    },
    "tag": {
      "type": "string",
      "description": "Notification tag for grouping",
      "default": "autolab-notification"
    },
    "notification_id": {
      "type": "integer",
      "description": "Database notification ID for analytics"
    },
    "type": {
      "type": "string",
      "description": "Notification type for handling",
      "enum": [
        "general",
        "dm",
        "mention",
        "group_invite",
        "lead",
        "vehicle",
        "appointment"
      ]
    }
  },
  "required": ["title", "body"]
}
```
