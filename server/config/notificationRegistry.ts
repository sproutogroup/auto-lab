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
  body_template: "User {username} updated '{registration}' - {field_name} changed",
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
  body_template: "User {username} marked '{registration}' as sold - £{sale_price}",
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
  body_template: "User {username} booked an appointment on {appointment_date}",
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
