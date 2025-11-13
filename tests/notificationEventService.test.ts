import { NotificationEventService } from "../server/services/notificationEventService";
import { NOTIFICATION_REGISTRY } from "../server/config/notificationRegistry";
import {
 validateNotificationPermissions,
 validateEventPayload,
} from "../server/utils/notificationValidation";
import { storage } from "../server/storage";
import { WebPushService } from "../server/services/webPushService";

// Mock dependencies
jest.mock("../server/storage");
jest.mock("../server/services/webPushService");
jest.mock("../server/websocket", () => ({
 io: {
  sockets: {
   sockets: new Map(),
  },
 },
}));

describe("NotificationEventService", () => {
 let service: NotificationEventService;
 let mockStorage: jest.Mocked<typeof storage>;
 let mockWebPushService: jest.Mocked<WebPushService>;

 beforeEach(() => {
  jest.clearAllMocks();
  service = new NotificationEventService();
  mockStorage = storage as jest.Mocked<typeof storage>;
  mockWebPushService = WebPushService.getInstance() as jest.Mocked<WebPushService>;
 });

 describe("triggerEvent", () => {
  it("should reject unknown event types", async () => {
   const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

   await service.triggerEvent("unknown.event", {}, 1);

   expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown event type: unknown.event"));

   consoleSpy.mockRestore();
  });

  it("should only notify users with the right role and preferences", async () => {
   // Mock users
   const mockUsers = [
    { id: 1, role: "admin", is_active: true },
    { id: 2, role: "salesperson", is_active: true },
    { id: 3, role: "manager", is_active: true },
    { id: 4, role: "admin", is_active: false }, // inactive user
   ];

   // Mock user permissions
   const mockPermissions = [
    {
     user_id: 1,
     page_key: "vehicle-master",
     permission_level: "full_access",
    },
    { user_id: 2, page_key: "vehicle-master", permission_level: "hidden" },
    {
     user_id: 3,
     page_key: "vehicle-master",
     permission_level: "view_only",
    },
   ];

   // Mock notification preferences
   const mockPreferences = {
    notifications_enabled: true,
    push_notifications_enabled: true,
    inventory_notifications: true,
    vehicle_updated_enabled: true,
   };

   mockStorage.getUsers.mockResolvedValue(mockUsers);
   mockStorage.getUserPermissions.mockResolvedValue(mockPermissions);
   mockStorage.getNotificationPreferencesByUser.mockResolvedValue(mockPreferences);
   mockStorage.getUserById.mockImplementation(id => Promise.resolve(mockUsers.find(u => u.id === id)));
   mockStorage.createNotification.mockResolvedValue({
    id: 1,
    recipient_user_id: 1,
    title: "Vehicle Updated",
    body: "Test notification",
    created_at: new Date(),
    action_url: "/vehicle-master",
   });
   mockStorage.getPushSubscriptionsByUser.mockResolvedValue([]);

   const payload = {
    username: "testuser",
    registration: "ABC123",
    field_name: "colour",
    entity_id: 1,
    data: { url: "/vehicle-master" },
   };

   await service.triggerEvent("vehicle.updated", payload, 2);

   // Should only create notification for admin user (id: 1)
   // User 2 (salesperson) doesn't have right role for vehicle.updated
   // User 3 (manager) doesn't have right role for vehicle.updated
   // User 4 (admin) is inactive
   expect(mockStorage.createNotification).toHaveBeenCalledTimes(1);
   expect(mockStorage.createNotification).toHaveBeenCalledWith(
    expect.objectContaining({
     recipient_user_id: 1,
     title: "Vehicle Updated",
     body: "User testuser updated 'ABC123' - colour changed",
    }),
   );
  });

  it("should create notification record and call push/WebSocket services", async () => {
   const mockUsers = [{ id: 1, role: "admin", is_active: true }];

   const mockNotification = {
    id: 1,
    recipient_user_id: 1,
    title: "Vehicle Added",
    body: "Test notification",
    created_at: new Date(),
    action_url: "/vehicle-master",
   };

   const mockSubscriptions = [
    {
     id: 1,
     user_id: 1,
     endpoint: "https://test.endpoint.com",
     keys_p256dh: "test-key",
     keys_auth: "test-auth",
    },
   ];

   mockStorage.getUsers.mockResolvedValue(mockUsers);
   mockStorage.getUserById.mockResolvedValue(mockUsers[0]);
   mockStorage.getUserPermissions.mockResolvedValue([]);
   mockStorage.getNotificationPreferencesByUser.mockResolvedValue({
    notifications_enabled: true,
    push_notifications_enabled: true,
    inventory_notifications: true,
    vehicle_added_enabled: true,
   });
   mockStorage.createNotification.mockResolvedValue(mockNotification);
   mockStorage.getPushSubscriptionsByUser.mockResolvedValue(mockSubscriptions);
   mockWebPushService.sendWebPush.mockResolvedValue({
    success: true,
    subscription_id: 1,
   });

   const payload = {
    username: "testuser",
    registration: "ABC123",
    entity_id: 1,
    data: { url: "/vehicle-master" },
   };

   await service.triggerEvent("vehicle.added", payload, 2);

   // Verify notification was created
   expect(mockStorage.createNotification).toHaveBeenCalledWith(
    expect.objectContaining({
     recipient_user_id: 1,
     notification_type: "inventory",
     priority_level: "medium",
     title: "New Vehicle Added",
     body: "User testuser added 'ABC123' to Vehicle Master",
    }),
   );

   // Verify push notification was sent
   expect(mockWebPushService.sendWebPush).toHaveBeenCalledWith(
    mockSubscriptions[0],
    expect.objectContaining({
     title: "New Vehicle Added",
     body: "Test notification",
     icon: "/assets/icon-192.png",
    }),
   );
  });

  it("should skip notification for triggering user", async () => {
   const mockUsers = [
    { id: 1, role: "admin", is_active: true },
    { id: 2, role: "admin", is_active: true },
   ];

   mockStorage.getUsers.mockResolvedValue(mockUsers);
   mockStorage.getUserById.mockImplementation(id => Promise.resolve(mockUsers.find(u => u.id === id)));
   mockStorage.getUserPermissions.mockResolvedValue([]);
   mockStorage.getNotificationPreferencesByUser.mockResolvedValue({
    notifications_enabled: true,
    push_notifications_enabled: true,
    inventory_notifications: true,
    vehicle_added_enabled: true,
   });
   mockStorage.createNotification.mockResolvedValue({
    id: 1,
    recipient_user_id: 2,
    title: "Vehicle Added",
    body: "Test notification",
    created_at: new Date(),
    action_url: "/vehicle-master",
   });
   mockStorage.getPushSubscriptionsByUser.mockResolvedValue([]);

   const payload = {
    username: "testuser",
    registration: "ABC123",
    entity_id: 1,
    data: { url: "/vehicle-master" },
   };

   await service.triggerEvent("vehicle.added", payload, 1); // User 1 is the triggering user

   // Should only create notification for user 2, not user 1
   expect(mockStorage.createNotification).toHaveBeenCalledTimes(1);
   expect(mockStorage.createNotification).toHaveBeenCalledWith(
    expect.objectContaining({
     recipient_user_id: 2,
    }),
   );
  });
 });
});

describe("validateNotificationPermissions", () => {
 beforeEach(() => {
  jest.clearAllMocks();
 });

 it("should return false for unknown event type", async () => {
  const result = await validateNotificationPermissions(1, "unknown.event");
  expect(result).toBe(false);
 });

 it("should return false for inactive user", async () => {
  const mockUser = { id: 1, role: "admin", is_active: false };
  mockStorage.getUserById.mockResolvedValue(mockUser);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(false);
 });

 it("should return false for wrong user role", async () => {
  const mockUser = { id: 1, role: "salesperson", is_active: true };
  mockStorage.getUserById.mockResolvedValue(mockUser);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(false);
 });

 it("should return false for hidden page permissions", async () => {
  const mockUser = { id: 1, role: "admin", is_active: true };
  const mockPermissions = [{ user_id: 1, page_key: "vehicle-master", permission_level: "hidden" }];

  mockStorage.getUserById.mockResolvedValue(mockUser);
  mockStorage.getUserPermissions.mockResolvedValue(mockPermissions);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(false);
 });

 it("should return false for disabled global notifications", async () => {
  const mockUser = { id: 1, role: "admin", is_active: true };
  const mockPreferences = {
   notifications_enabled: false,
   push_notifications_enabled: true,
   inventory_notifications: true,
   vehicle_updated_enabled: true,
  };

  mockStorage.getUserById.mockResolvedValue(mockUser);
  mockStorage.getUserPermissions.mockResolvedValue([]);
  mockStorage.getNotificationPreferencesByUser.mockResolvedValue(mockPreferences);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(false);
 });

 it("should return false for disabled category notifications", async () => {
  const mockUser = { id: 1, role: "admin", is_active: true };
  const mockPreferences = {
   notifications_enabled: true,
   push_notifications_enabled: true,
   inventory_notifications: false,
   vehicle_updated_enabled: true,
  };

  mockStorage.getUserById.mockResolvedValue(mockUser);
  mockStorage.getUserPermissions.mockResolvedValue([]);
  mockStorage.getNotificationPreferencesByUser.mockResolvedValue(mockPreferences);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(false);
 });

 it("should return false for disabled event-specific notifications", async () => {
  const mockUser = { id: 1, role: "admin", is_active: true };
  const mockPreferences = {
   notifications_enabled: true,
   push_notifications_enabled: true,
   inventory_notifications: true,
   vehicle_updated_enabled: false,
  };

  mockStorage.getUserById.mockResolvedValue(mockUser);
  mockStorage.getUserPermissions.mockResolvedValue([]);
  mockStorage.getNotificationPreferencesByUser.mockResolvedValue(mockPreferences);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(false);
 });

 it("should return true for valid permissions and preferences", async () => {
  const mockUser = { id: 1, role: "admin", is_active: true };
  const mockPreferences = {
   notifications_enabled: true,
   push_notifications_enabled: true,
   inventory_notifications: true,
   vehicle_updated_enabled: true,
  };

  mockStorage.getUserById.mockResolvedValue(mockUser);
  mockStorage.getUserPermissions.mockResolvedValue([]);
  mockStorage.getNotificationPreferencesByUser.mockResolvedValue(mockPreferences);

  const result = await validateNotificationPermissions(1, "vehicle.updated");
  expect(result).toBe(true);
 });
});

describe("validateEventPayload", () => {
 it("should return false for unknown event type", () => {
  const result = validateEventPayload("unknown.event", {});
  expect(result).toBe(false);
 });

 it("should return false for invalid payload", () => {
  const result = validateEventPayload("vehicle.updated", null);
  expect(result).toBe(false);
 });

 it("should return false for vehicle.updated missing required fields", () => {
  const result = validateEventPayload("vehicle.updated", {
   username: "test",
  });
  expect(result).toBe(false);
 });

 it("should return true for valid vehicle.updated payload", () => {
  const payload = {
   username: "testuser",
   registration: "ABC123",
   field_name: "colour",
  };
  const result = validateEventPayload("vehicle.updated", payload);
  expect(result).toBe(true);
 });

 it("should return true for valid lead.created payload", () => {
  const payload = {
   username: "testuser",
   lead_name: "John Doe",
  };
  const result = validateEventPayload("lead.created", payload);
  expect(result).toBe(true);
 });
});

describe("NOTIFICATION_REGISTRY", () => {
 it("should have all seven event types defined", () => {
  const expectedEvents = [
   "vehicle.updated",
   "vehicle.added",
   "vehicle.sold",
   "vehicle.bought",
   "lead.created",
   "appointment.booked",
   "job.booked",
  ];

  expectedEvents.forEach(eventType => {
   expect(NOTIFICATION_REGISTRY[eventType]).toBeDefined();
   expect(NOTIFICATION_REGISTRY[eventType].event_type).toBe(eventType);
  });
 });

 it("should have correct recipient criteria for vehicle.updated", () => {
  const event = NOTIFICATION_REGISTRY["vehicle.updated"];
  expect(event.recipient_criteria.roles).toEqual(["admin"]);
  expect(event.recipient_criteria.preference_key).toBe("inventory_notifications");
  expect(event.category).toBe("inventory");
  expect(event.priority).toBe("medium");
 });

 it("should have correct recipient criteria for vehicle.sold", () => {
  const event = NOTIFICATION_REGISTRY["vehicle.sold"];
  expect(event.recipient_criteria.roles).toEqual(["admin", "manager", "salesperson"]);
  expect(event.recipient_criteria.preference_key).toBe("sales_notifications");
  expect(event.category).toBe("sales");
  expect(event.priority).toBe("high");
 });

 it("should have correct recipient criteria for lead.created", () => {
  const event = NOTIFICATION_REGISTRY["lead.created"];
  expect(event.recipient_criteria.roles).toEqual(["admin", "manager", "salesperson"]);
  expect(event.recipient_criteria.preference_key).toBe("customer_notifications");
  expect(event.category).toBe("customer");
  expect(event.priority).toBe("high");
 });
});
