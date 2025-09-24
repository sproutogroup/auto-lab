# Phase 4: Notification Specification Report

## Dealership Management System - Business Event Notifications

**Document Version:** 1.0  
**Date:** July 16, 2025  
**Author:** System Architecture Team  
**Status:** Ready for Implementation

---

## Executive Summary

This document defines the comprehensive notification system for seven critical dealership business events, building upon the completed Phase 3 PWA push notification infrastructure. The system provides real-time alerts, role-based access control, and granular user preferences while maintaining cross-platform compatibility with iOS Safari, Android, and desktop browsers.

---

## 1. Event Specifications

### 1.1 Vehicle Updated

**Event Name:** `vehicle.updated`  
**Description:** Admin-only alert when vehicle information is modified in the Vehicle Master page  
**Trigger Location:** `client/src/pages/VehicleMaster.tsx` (VehicleModal save operation)

**Payload Shape:**

```typescript
{
  title: "Vehicle Updated",
  body: "User {username} updated '{registration}' - {field_name} changed",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "vehicle-updated",
  data: {
    event_type: "vehicle.updated",
    vehicle_id: number,
    vehicle_registration: string,
    field_name: string,
    old_value: string,
    new_value: string,
    updated_by: string,
    timestamp: string,
    url: "/vehicle-master"
  }
}
```

**Recipient Criteria:**

- Role: `admin` only
- Permission: `can_edit` on vehicles page
- Notification Preference: `inventory_notifications: true`

---

### 1.2 Vehicle Added

**Event Name:** `vehicle.added`  
**Description:** Alert when new vehicle is added to Vehicle Master  
**Trigger Location:** `client/src/pages/VehicleMaster.tsx` (VehicleModal create operation)

**Payload Shape:**

```typescript
{
  title: "New Vehicle Added",
  body: "User {username} added '{registration}' to Vehicle Master",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "vehicle-added",
  data: {
    event_type: "vehicle.added",
    vehicle_id: number,
    vehicle_registration: string,
    make: string,
    model: string,
    year: number,
    added_by: string,
    timestamp: string,
    url: "/vehicle-master"
  }
}
```

**Recipient Criteria:**

- Role: `admin`, `manager`
- Permission: `can_view` on vehicles page
- Notification Preference: `inventory_notifications: true`

---

### 1.3 Vehicle Sold

**Event Name:** `vehicle.sold`  
**Description:** Alert when vehicle status is changed to SOLD  
**Trigger Location:** `client/src/pages/VehicleMaster.tsx` (VehicleModal sales_status update)

**Payload Shape:**

```typescript
{
  title: "Vehicle Sold",
  body: "User {username} marked '{registration}' as sold - £{sale_price}",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "vehicle-sold",
  data: {
    event_type: "vehicle.sold",
    vehicle_id: number,
    vehicle_registration: string,
    make: string,
    model: string,
    sale_price: number,
    gross_profit: number,
    sold_by: string,
    timestamp: string,
    url: "/vehicle-master"
  }
}
```

**Recipient Criteria:**

- Role: `admin`, `manager`, `salesperson`
- Permission: `can_view` on vehicles page
- Notification Preference: `sales_notifications: true`

---

### 1.4 Vehicle Bought

**Event Name:** `vehicle.bought`  
**Description:** Alert when vehicle is added to Bought Vehicles page  
**Trigger Location:** `client/src/pages/BoughtVehicles.tsx` (Add vehicle modal)

**Payload Shape:**

```typescript
{
  title: "Vehicle Bought",
  body: "User {username} added a vehicle to Bought Vehicles",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "vehicle-bought",
  data: {
    event_type: "vehicle.bought",
    bought_vehicle_id: number,
    stock_number: string,
    make: string,
    model: string,
    registration: string,
    retail_price_1: number,
    added_by: string,
    timestamp: string,
    url: "/bought-vehicles"
  }
}
```

**Recipient Criteria:**

- Role: `admin`, `manager`
- Permission: `can_view` on bought vehicles page
- Notification Preference: `inventory_notifications: true`

---

### 1.5 New Lead

**Event Name:** `lead.created`  
**Description:** Alert when new lead is created  
**Trigger Location:** `client/src/pages/Leads.tsx` (Lead creation modal)

**Payload Shape:**

```typescript
{
  title: "New Lead Created",
  body: "User {username} added a new lead: {lead_name}",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "lead-created",
  data: {
    event_type: "lead.created",
    lead_id: number,
    lead_name: string,
    lead_email: string,
    lead_phone: string,
    pipeline_stage: string,
    assigned_vehicle_registration: string,
    created_by: string,
    timestamp: string,
    url: "/leads"
  }
}
```

**Recipient Criteria:**

- Role: `admin`, `manager`, `salesperson`
- Permission: `can_view` on leads page
- Notification Preference: `customer_notifications: true`

---

### 1.6 Appointment Booked

**Event Name:** `appointment.booked`  
**Description:** Alert when appointment is scheduled  
**Trigger Location:** `client/src/pages/Appointments.tsx` (Appointment booking modal)

**Payload Shape:**

```typescript
{
  title: "Appointment Booked",
  body: "User {username} booked an appointment on {appointment_date}",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "appointment-booked",
  data: {
    event_type: "appointment.booked",
    appointment_id: number,
    appointment_type: string,
    appointment_date: string,
    appointment_time: string,
    customer_name: string,
    vehicle_registration: string,
    booked_by: string,
    timestamp: string,
    url: "/appointments"
  }
}
```

**Recipient Criteria:**

- Role: `admin`, `manager`, `salesperson`
- Permission: `can_view` on appointments page
- Notification Preference: `customer_notifications: true`

---

### 1.7 Job Booked

**Event Name:** `job.booked`  
**Description:** Alert when new job is scheduled  
**Trigger Location:** `client/src/pages/Calendar.tsx` (Job scheduling modal)

**Payload Shape:**

```typescript
{
  title: "Job Booked",
  body: "User {username} booked a new job: {job_type}",
  icon: "/assets/icon-192.png",
  badge: "/icons/badge-72x72.png",
  tag: "job-booked",
  data: {
    event_type: "job.booked",
    job_id: number,
    job_number: string,
    job_type: string,
    job_priority: string,
    vehicle_registration: string,
    assigned_to: string,
    scheduled_date: string,
    booked_by: string,
    timestamp: string,
    url: "/calendar"
  }
}
```

**Recipient Criteria:**

- Role: `admin`, `manager`
- Permission: `can_view` on calendar page
- Notification Preference: `staff_notifications: true`

---

## 2. Delivery Mechanism & Architecture

### 2.1 Event Listener Integration

**Core Service Location:** `server/services/notificationEventService.ts`

```typescript
export class NotificationEventService {
  private webPushService: WebPushService;
  private storage: IStorage;

  constructor() {
    this.webPushService = WebPushService.getInstance();
    this.storage = storage;
  }

  async triggerEvent(
    eventType: string,
    payload: any,
    triggeredBy: number,
  ): Promise<void> {
    const event = NOTIFICATION_REGISTRY[eventType];
    if (!event) return;

    const recipients = await this.getRecipients(event.recipient_criteria);

    for (const recipient of recipients) {
      const shouldNotify = await this.shouldNotifyUser(recipient.id, eventType);
      if (!shouldNotify) continue;

      // Create notification record
      const notification = await this.storage.createNotification({
        recipient_user_id: recipient.id,
        notification_type: event.category,
        priority_level: event.priority,
        title: this.populateTemplate(event.title_template, payload),
        body: this.populateTemplate(event.body_template, payload),
        action_url: event.action_url,
        related_entity_type: event.entity_type,
        related_entity_id: payload.entity_id,
        action_data: payload.data,
      });

      // Send push notification
      await this.sendPushNotification(recipient.id, notification);

      // Send WebSocket notification (fallback)
      await this.sendWebSocketNotification(recipient.id, notification);
    }
  }
}
```

### 2.2 Hook Integration Points

**Vehicle Operations:** `server/routes.ts`

```typescript
// POST /api/vehicles (create)
app.post("/api/vehicles", requireAuth, async (req, res) => {
  const vehicle = await storage.createVehicle(validatedData);

  // Trigger notification
  await notificationEventService.triggerEvent(
    "vehicle.added",
    {
      vehicle_id: vehicle.id,
      vehicle_registration: vehicle.registration,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      entity_id: vehicle.id,
      data: { url: "/vehicle-master" },
    },
    req.user.id,
  );

  res.json(vehicle);
});
```

**Lead Operations:** `server/routes.ts`

```typescript
// POST /api/leads (create)
app.post("/api/leads", requireAuth, async (req, res) => {
  const lead = await storage.createLead(validatedData);

  // Trigger notification
  await notificationEventService.triggerEvent(
    "lead.created",
    {
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      lead_email: lead.email,
      lead_phone: lead.phone,
      pipeline_stage: lead.pipeline_stage,
      entity_id: lead.id,
      data: { url: "/leads" },
    },
    req.user.id,
  );

  res.json(lead);
});
```

### 2.3 Fallback Mechanism

**WebSocket Integration:** `server/websocket.ts`

```typescript
export async function sendWebSocketNotification(
  userId: number,
  notification: Notification,
): Promise<void> {
  const userSockets = io.sockets.sockets;

  for (const [socketId, socket] of userSockets) {
    if (socket.data.userId === userId) {
      socket.emit("notification", {
        id: notification.id,
        type: notification.notification_type,
        title: notification.title,
        body: notification.body,
        timestamp: notification.created_at,
        action_url: notification.action_url,
      });
    }
  }
}
```

---

## 3. Notification Registry & Configuration

### 3.1 Centralized Registry

**File Location:** `server/config/notificationRegistry.ts`

```typescript
export interface NotificationEventConfig {
  event_type: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  title_template: string;
  body_template: string;
  action_url: string;
  entity_type: string;
  recipient_criteria: {
    roles: string[];
    permissions: string[];
    preference_key: string;
  };
}

export const NOTIFICATION_REGISTRY: Record<string, NotificationEventConfig> = {
  "vehicle.updated": {
    event_type: "vehicle.updated",
    category: "inventory",
    priority: "medium",
    title_template: "Vehicle Updated",
    body_template:
      "User {username} updated '{registration}' - {field_name} changed",
    action_url: "/vehicle-master",
    entity_type: "vehicle",
    recipient_criteria: {
      roles: ["admin"],
      permissions: ["can_edit"],
      preference_key: "inventory_notifications",
    },
  },
  "vehicle.added": {
    event_type: "vehicle.added",
    category: "inventory",
    priority: "medium",
    title_template: "New Vehicle Added",
    body_template: "User {username} added '{registration}' to Vehicle Master",
    action_url: "/vehicle-master",
    entity_type: "vehicle",
    recipient_criteria: {
      roles: ["admin", "manager"],
      permissions: ["can_view"],
      preference_key: "inventory_notifications",
    },
  },
  "vehicle.sold": {
    event_type: "vehicle.sold",
    category: "sales",
    priority: "high",
    title_template: "Vehicle Sold",
    body_template:
      "User {username} marked '{registration}' as sold - £{sale_price}",
    action_url: "/vehicle-master",
    entity_type: "vehicle",
    recipient_criteria: {
      roles: ["admin", "manager", "salesperson"],
      permissions: ["can_view"],
      preference_key: "sales_notifications",
    },
  },
  "vehicle.bought": {
    event_type: "vehicle.bought",
    category: "inventory",
    priority: "medium",
    title_template: "Vehicle Bought",
    body_template: "User {username} added a vehicle to Bought Vehicles",
    action_url: "/bought-vehicles",
    entity_type: "bought_vehicle",
    recipient_criteria: {
      roles: ["admin", "manager"],
      permissions: ["can_view"],
      preference_key: "inventory_notifications",
    },
  },
  "lead.created": {
    event_type: "lead.created",
    category: "customer",
    priority: "high",
    title_template: "New Lead Created",
    body_template: "User {username} added a new lead: {lead_name}",
    action_url: "/leads",
    entity_type: "lead",
    recipient_criteria: {
      roles: ["admin", "manager", "salesperson"],
      permissions: ["can_view"],
      preference_key: "customer_notifications",
    },
  },
  "appointment.booked": {
    event_type: "appointment.booked",
    category: "customer",
    priority: "medium",
    title_template: "Appointment Booked",
    body_template:
      "User {username} booked an appointment on {appointment_date}",
    action_url: "/appointments",
    entity_type: "appointment",
    recipient_criteria: {
      roles: ["admin", "manager", "salesperson"],
      permissions: ["can_view"],
      preference_key: "customer_notifications",
    },
  },
  "job.booked": {
    event_type: "job.booked",
    category: "staff",
    priority: "medium",
    title_template: "Job Booked",
    body_template: "User {username} booked a new job: {job_type}",
    action_url: "/calendar",
    entity_type: "job",
    recipient_criteria: {
      roles: ["admin", "manager"],
      permissions: ["can_view"],
      preference_key: "staff_notifications",
    },
  },
};
```

### 3.2 Schema Updates

**Notification Preferences Enhancement:**

```typescript
// Update shared/schema.ts - notification_preferences table
export const notification_preferences = pgTable("notification_preferences", {
  // ... existing fields ...

  // Event-specific preferences
  vehicle_updated_enabled: boolean("vehicle_updated_enabled").default(true),
  vehicle_added_enabled: boolean("vehicle_added_enabled").default(true),
  vehicle_sold_enabled: boolean("vehicle_sold_enabled").default(true),
  vehicle_bought_enabled: boolean("vehicle_bought_enabled").default(true),
  lead_created_enabled: boolean("lead_created_enabled").default(true),
  appointment_booked_enabled: boolean("appointment_booked_enabled").default(
    true,
  ),
  job_booked_enabled: boolean("job_booked_enabled").default(true),

  // ... rest of existing fields
});
```

---

## 4. User Preferences & Access Control

### 4.1 Role-Based Default Subscriptions

```typescript
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  admin: {
    vehicle_updated_enabled: true,
    vehicle_added_enabled: true,
    vehicle_sold_enabled: true,
    vehicle_bought_enabled: true,
    lead_created_enabled: true,
    appointment_booked_enabled: true,
    job_booked_enabled: true,
  },
  manager: {
    vehicle_updated_enabled: false,
    vehicle_added_enabled: true,
    vehicle_sold_enabled: true,
    vehicle_bought_enabled: true,
    lead_created_enabled: true,
    appointment_booked_enabled: true,
    job_booked_enabled: true,
  },
  salesperson: {
    vehicle_updated_enabled: false,
    vehicle_added_enabled: false,
    vehicle_sold_enabled: true,
    vehicle_bought_enabled: false,
    lead_created_enabled: true,
    appointment_booked_enabled: true,
    job_booked_enabled: false,
  },
};
```

### 4.2 Permission Validation

```typescript
export async function validateNotificationPermissions(
  userId: number,
  eventType: string,
): Promise<boolean> {
  const user = await storage.getUserById(userId);
  if (!user) return false;

  const event = NOTIFICATION_REGISTRY[eventType];
  if (!event) return false;

  // Check role permissions
  if (!event.recipient_criteria.roles.includes(user.role)) {
    return false;
  }

  // Check page-specific permissions
  const userPermissions = await storage.getUserPermissions(userId);
  const pagePermission = userPermissions.find(
    (p) => p.page_key === event.action_url.replace("/", ""),
  );

  if (!pagePermission || pagePermission.permission_level === "hidden") {
    return false;
  }

  // Check notification preferences
  const preferences = await storage.getNotificationPreferencesByUser(userId);
  if (!preferences) return true; // Default to enabled

  const preferenceKey = `${eventType.replace(".", "_")}_enabled`;
  return preferences[preferenceKey] !== false;
}
```

---

## 5. UI Integration

### 5.1 Notification Settings Page Updates

**File Location:** `client/src/pages/NotificationManagement.tsx`

```typescript
export function NotificationEventSettings() {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);

  const eventSettings = [
    {
      key: 'vehicle_updated_enabled',
      label: 'Vehicle Updated',
      description: 'Notify when vehicle information is modified (Admin only)',
      category: 'Inventory'
    },
    {
      key: 'vehicle_added_enabled',
      label: 'Vehicle Added',
      description: 'Notify when new vehicle is added to inventory',
      category: 'Inventory'
    },
    {
      key: 'vehicle_sold_enabled',
      label: 'Vehicle Sold',
      description: 'Notify when vehicle status changes to sold',
      category: 'Sales'
    },
    // ... other events
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Business Event Notifications</h3>

        {eventSettings.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between py-3 border-b">
            <div>
              <h4 className="font-medium">{setting.label}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{setting.description}</p>
              <span className="text-xs text-blue-600 dark:text-blue-400">{setting.category}</span>
            </div>
            <Switch
              checked={preferences?.[setting.key] !== false}
              onCheckedChange={(checked) => handlePreferenceChange(setting.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5.2 Notification List Updates

**File Location:** `client/src/components/NotificationList.tsx`

```typescript
export function NotificationList() {
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => fetch('/api/notifications').then(res => res.json())
  });

  const getEventIcon = (notificationType: string) => {
    const iconMap = {
      'inventory': Car,
      'sales': TrendingUp,
      'customer': Users,
      'staff': Calendar
    };
    return iconMap[notificationType] || Bell;
  };

  return (
    <div className="space-y-2">
      {notifications?.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          icon={getEventIcon(notification.notification_type)}
        />
      ))}
    </div>
  );
}
```

---

## 6. Implementation Timeline

### Phase 4.1: Core Infrastructure (Week 1)

- [ ] Create `NotificationEventService` class
- [ ] Implement `notificationRegistry.ts` configuration
- [ ] Update database schema for event-specific preferences
- [ ] Add validation utilities

### Phase 4.2: Event Integration (Week 2)

- [ ] Integrate hooks into vehicle operations
- [ ] Integrate hooks into lead operations
- [ ] Integrate hooks into appointment operations
- [ ] Integrate hooks into job operations

### Phase 4.3: UI Integration (Week 3)

- [ ] Update notification settings page
- [ ] Enhance notification list component
- [ ] Add event-specific icons and styling
- [ ] Implement preference management

### Phase 4.4: Testing & Optimization (Week 4)

- [ ] Cross-platform testing (iOS, Android, Desktop)
- [ ] Performance optimization
- [ ] Error handling and fallbacks
- [ ] User acceptance testing

---

## 7. Success Metrics

### 7.1 Technical Metrics

- **Delivery Rate:** >95% successful push notifications
- **Response Time:** <500ms from event trigger to notification sent
- **Cross-Platform Support:** 100% compatibility with iOS Safari, Android Chrome, Desktop browsers
- **Error Rate:** <2% notification failures

### 7.2 Business Metrics

- **User Engagement:** >80% of users enable at least 3 event notifications
- **Response Time:** <30 seconds average time from notification to user action
- **Completion Rate:** >70% of notifications result in user navigation to target page

---

## 8. Conclusion

This specification provides a comprehensive framework for implementing the seven critical dealership notification events. The system leverages the existing Phase 3 PWA infrastructure while adding sophisticated business logic, role-based access control, and granular user preferences.

The implementation follows established patterns in the codebase, maintains snake_case standardization, and ensures seamless integration with the existing dealership management system. The modular design allows for easy addition of new notification events in the future without disrupting existing functionality.

Upon completion of Phase 4, the system will provide enterprise-grade notification capabilities that enhance workflow efficiency, improve customer service, and maintain real-time visibility across all dealership operations.

---

**Next Steps:** Proceed with Phase 4.1 implementation or request approval for deployment to autolabdms.com domain.
