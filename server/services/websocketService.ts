import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { User } from "../../shared/schema";
import logger from "../logger";

// WebSocket event types for real-time updates
export enum WebSocketEvent {
 // Vehicle events
 VEHICLE_CREATED = "vehicle:created",
 VEHICLE_UPDATED = "vehicle:updated",
 VEHICLE_DELETED = "vehicle:deleted",
 VEHICLE_STATUS_CHANGED = "vehicle:status_changed",
 VEHICLE_IMPORTED = "vehicle:imported",

 // Customer events
 CUSTOMER_CREATED = "customer:created",
 CUSTOMER_UPDATED = "customer:updated",
 CUSTOMER_DELETED = "customer:deleted",
 CUSTOMER_INTERACTION_ADDED = "customer:interaction_added",

 // Lead events
 LEAD_CREATED = "lead:created",
 LEAD_UPDATED = "lead:updated",
 LEAD_DELETED = "lead:deleted",
 LEAD_CONVERTED = "lead:converted",
 LEAD_STAGE_CHANGED = "lead:stage_changed",
 LEAD_INTERACTION_ADDED = "lead:interaction_added",

 // Job/Schedule events
 JOB_CREATED = "job:created",
 JOB_UPDATED = "job:updated",
 JOB_DELETED = "job:deleted",
 JOB_STATUS_CHANGED = "job:status_changed",
 JOB_ASSIGNED = "job:assigned",

 // Appointment events
 APPOINTMENT_CREATED = "appointment:created",
 APPOINTMENT_UPDATED = "appointment:updated",
 APPOINTMENT_DELETED = "appointment:deleted",
 APPOINTMENT_STATUS_CHANGED = "appointment:status_changed",

 // Dashboard events
 DASHBOARD_STATS_UPDATED = "dashboard:stats_updated",
 STOCK_ANALYTICS_UPDATED = "stock:analytics_updated",
 SALES_ANALYTICS_UPDATED = "sales:analytics_updated",

 // User events
 USER_CREATED = "user:created",
 USER_UPDATED = "user:updated",
 USER_DELETED = "user:deleted",
 USER_PERMISSIONS_UPDATED = "user:permissions_updated",
 USER_ONLINE = "user:online",
 USER_OFFLINE = "user:offline",

 // Notification events
 NOTIFICATION_CREATED = "notification:created",
 NOTIFICATION_READ = "notification:read",
 NOTIFICATION_DELETED = "notification:deleted",

 // Document events
 DOCUMENT_UPLOADED = "document:uploaded",
 DOCUMENT_DELETED = "document:deleted",

 // Pinned message events
 PINNED_MESSAGE_CREATED = "pinned_message_created",
 PINNED_MESSAGE_UPDATED = "pinned_message_updated",
 PINNED_MESSAGE_DELETED = "pinned_message_deleted",

 // Connection events
 CONNECTION_ESTABLISHED = "connection:established",
 CONNECTION_LOST = "connection:lost",
 CONNECTION_RESTORED = "connection:restored",

 // System events
 SYSTEM_MAINTENANCE = "system:maintenance",
 SYSTEM_UPDATE = "system:update",
}

// Interface for WebSocket payload
interface WebSocketPayload {
 event: WebSocketEvent;
 data: any;
 user_id?: number;
 username?: string;
 timestamp: string;
 room?: string;
}

// Room definitions for targeted broadcasting
export enum WebSocketRoom {
 ALL_USERS = "all_users",
 ADMIN_USERS = "admin_users",
 MANAGER_USERS = "manager_users",
 SALES_USERS = "sales_users",
 VEHICLE_UPDATES = "vehicle_updates",
 CUSTOMER_UPDATES = "customer_updates",
 LEAD_UPDATES = "lead_updates",
 JOB_UPDATES = "job_updates",
 APPOINTMENT_UPDATES = "appointment_updates",
 DASHBOARD_UPDATES = "dashboard_updates",
 NOTIFICATION_UPDATES = "notification_updates",
}

// Connected users tracking
interface ConnectedUser {
 socket_id: string;
 user_id: number;
 username: string;
 role: string;
 connected_at: Date;
 last_activity: Date;
}

class WebSocketService {
 private io: SocketIOServer;
 private connectedUsers: Map<string, ConnectedUser> = new Map();
 private userSocketMap: Map<number, string[]> = new Map(); // Track multiple connections per user

 constructor(httpServer: HTTPServer) {
  // Log environment variables for debugging
  console.log("[WebSocket] Environment check:");
  console.log("  NODE_ENV:", process.env.NODE_ENV);
  console.log("  REPL_SLUG:", process.env.REPL_SLUG);
  console.log("  REPL_OWNER:", process.env.REPL_OWNER);
  console.log("  ALLOWED_ORIGINS:", process.env.ALLOWED_ORIGINS);

  // Determine allowed origins - include both local and Replit domains in development
  const isReplit = process.env.REPL_SLUG && process.env.REPL_OWNER;
  const allowedOrigins = [
   // Always allow localhost for development
   "http://localhost:3000",
   "http://localhost:5000",
   "http://127.0.0.1:3000",
   "http://127.0.0.1:5000",
   // Production domain
   "https://autolabdms.com",
   "https://www.autolabdms.com",
   // Replit domain patterns
   /^https:\/\/.*\.replit\.app$/,
   /^https:\/\/.*\.repl\.co$/,
   /^https:\/\/.*\.replit\.dev$/,
  ];

  // Add current Replit deployment URLs if available
  if (isReplit) {
   allowedOrigins.push(
    `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.repl.co`,
    `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.app`,
    `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.dev`,
   );
  }

  // Add additional allowed origins from environment
  if (process.env.ALLOWED_ORIGINS) {
   allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()));
  }

  console.log("[WebSocket] Allowed origins:", JSON.stringify(allowedOrigins, null, 2));

  this.io = new SocketIOServer(httpServer, {
   cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
   },
   path: "/socket.io",
   allowEIO3: true,
   transports: ["websocket", "polling"],
   upgradeTimeout: 60000, // Increased from 30s
   pingTimeout: 60000, // Increased from 25s
   pingInterval: 30000, // Increased from 20s
   allowUpgrades: true,
   cookie: false,
   serveClient: false,
   connectTimeout: 60000, // Increased from 45s
   maxHttpBufferSize: 1e6,
  });

  this.setupEventHandlers();
  logger.info("WebSocket service initialized");
 }

 private setupEventHandlers() {
  this.io.on("connection", socket => {
   logger.info(`WebSocket connection established: ${socket.id}`);

   // Handle user authentication
   socket.on("authenticate", (userData: { user_id: number; username: string; role: string }) => {
    this.handleUserAuthentication(socket, userData);
   });

   // Handle room joining
   socket.on("join_room", (room: WebSocketRoom) => {
    this.handleRoomJoin(socket, room);
   });

   // Handle room leaving
   socket.on("leave_room", (room: WebSocketRoom) => {
    this.handleRoomLeave(socket, room);
   });

   // Handle ping/pong for connection health
   socket.on("ping", () => {
    socket.emit("pong");
   });

   // Handle user activity tracking
   socket.on("user_activity", () => {
    this.updateUserActivity(socket.id);
   });

   // Handle disconnection
   socket.on("disconnect", reason => {
    this.handleDisconnection(socket, reason);
   });

   // Handle connection errors
   socket.on("connect_error", error => {
    logger.error(`WebSocket connection error: ${error.message}`);
   });
  });
 }

 private handleUserAuthentication(
  socket: any,
  userData: { user_id: number; username: string; role: string },
 ) {
  const connectedUser: ConnectedUser = {
   socket_id: socket.id,
   user_id: userData.user_id,
   username: userData.username,
   role: userData.role,
   connected_at: new Date(),
   last_activity: new Date(),
  };

  // Store user connection
  this.connectedUsers.set(socket.id, connectedUser);

  // Track multiple connections per user
  const userSockets = this.userSocketMap.get(userData.user_id) || [];
  userSockets.push(socket.id);
  this.userSocketMap.set(userData.user_id, userSockets);

  // Join user to appropriate rooms based on role
  this.joinDefaultRooms(socket, userData.role);

  // Notify other users about new connection
  this.broadcastToRoom(
   WebSocketRoom.ALL_USERS,
   WebSocketEvent.USER_ONLINE,
   {
    user_id: userData.user_id,
    username: userData.username,
    role: userData.role,
   },
   userData.user_id,
  );

  // Send connection confirmation
  socket.emit("authenticated", {
   message: "Successfully authenticated",
   connected_users: this.getConnectedUsersList(),
  });

  // Broadcast updated connected users list to all users
  this.broadcastConnectedUsersUpdate();

  logger.info(`User authenticated: ${userData.username} (${userData.user_id}) - Socket: ${socket.id}`);
 }

 private joinDefaultRooms(socket: any, role: string) {
  // All users join the main room
  socket.join(WebSocketRoom.ALL_USERS);

  // Role-based room assignment
  if (role === "admin") {
   socket.join(WebSocketRoom.ADMIN_USERS);
  } else if (role === "manager") {
   socket.join(WebSocketRoom.MANAGER_USERS);
  } else if (role === "salesperson") {
   socket.join(WebSocketRoom.SALES_USERS);
  }

  // Join update rooms
  socket.join(WebSocketRoom.VEHICLE_UPDATES);
  socket.join(WebSocketRoom.CUSTOMER_UPDATES);
  socket.join(WebSocketRoom.LEAD_UPDATES);
  socket.join(WebSocketRoom.JOB_UPDATES);
  socket.join(WebSocketRoom.APPOINTMENT_UPDATES);
  socket.join(WebSocketRoom.DASHBOARD_UPDATES);
  socket.join(WebSocketRoom.NOTIFICATION_UPDATES);
 }

 private handleRoomJoin(socket: any, room: WebSocketRoom) {
  socket.join(room);
  logger.info(`Socket ${socket.id} joined room: ${room}`);

  // Send confirmation back to client
  socket.emit("room_joined", { room, success: true });
 }

 private handleRoomLeave(socket: any, room: WebSocketRoom) {
  socket.leave(room);
  logger.info(`Socket ${socket.id} left room: ${room}`);

  // Send confirmation back to client
  socket.emit("room_left", { room, success: true });
 }

 private updateUserActivity(socketId: string) {
  const user = this.connectedUsers.get(socketId);
  if (user) {
   user.last_activity = new Date();
   this.connectedUsers.set(socketId, user);
  }
 }

 private handleDisconnection(socket: any, reason: string) {
  const user = this.connectedUsers.get(socket.id);
  if (user) {
   // Remove from connected users
   this.connectedUsers.delete(socket.id);

   // Remove from user socket map
   const userSockets = this.userSocketMap.get(user.user_id) || [];
   const filteredSockets = userSockets.filter(s => s !== socket.id);

   if (filteredSockets.length === 0) {
    // User has no more connections
    this.userSocketMap.delete(user.user_id);

    // Notify other users about user going offline
    this.broadcastToRoom(
     WebSocketRoom.ALL_USERS,
     WebSocketEvent.USER_OFFLINE,
     {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
     },
     user.user_id,
    );

    // Broadcast updated connected users list to all users
    this.broadcastConnectedUsersUpdate();
   } else {
    // User still has other connections
    this.userSocketMap.set(user.user_id, filteredSockets);
   }

   logger.info(
    `User disconnected: ${user.username} (${user.user_id}) - Socket: ${socket.id} - Reason: ${reason}`,
   );
  }
 }

 private getConnectedUsersList() {
  const users = Array.from(this.connectedUsers.values());
  const uniqueUsers = new Map();

  users.forEach(user => {
   uniqueUsers.set(user.user_id, {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    connected_at: user.connected_at,
    last_activity: user.last_activity,
   });
  });

  return Array.from(uniqueUsers.values());
 }

 private broadcastConnectedUsersUpdate() {
  const connectedUsers = this.getConnectedUsersList();
  this.io.to(WebSocketRoom.ALL_USERS).emit("connected_users_updated", {
   connected_users: connectedUsers,
  });
 }

 // Public methods for broadcasting events
 public broadcastToAll(event: WebSocketEvent, data: any, excludeUserId?: number) {
  this.broadcast(WebSocketRoom.ALL_USERS, event, data, excludeUserId);
 }

 public broadcastToRoom(room: WebSocketRoom, event: WebSocketEvent, data: any, excludeUserId?: number) {
  this.broadcast(room, event, data, excludeUserId);
 }

 public broadcastToUser(userId: number, event: WebSocketEvent, data: any) {
  const userSockets = this.userSocketMap.get(userId) || [];
  userSockets.forEach(socketId => {
   this.io.to(socketId).emit(event, this.createPayload(event, data, userId));
  });
 }

 public broadcastToAdmins(event: WebSocketEvent, data: any) {
  this.broadcast(WebSocketRoom.ADMIN_USERS, event, data);
 }

 public broadcastToManagers(event: WebSocketEvent, data: any) {
  this.broadcast(WebSocketRoom.MANAGER_USERS, event, data);
 }

 public broadcastToSales(event: WebSocketEvent, data: any) {
  this.broadcast(WebSocketRoom.SALES_USERS, event, data);
 }

 private broadcast(room: WebSocketRoom, event: WebSocketEvent, data: any, excludeUserId?: number) {
  const payload = this.createPayload(event, data);

  // Get room size for debugging
  const roomSize = this.io.sockets.adapter.rooms.get(room)?.size || 0;
  const roomClients = Array.from(this.io.sockets.adapter.rooms.get(room) || []);

  console.log(`[WebSocket] ============= BROADCAST START =============`);
  console.log(`[WebSocket] broadcast - Room: ${room}, Event: ${event}, Clients: ${roomSize}`);
  console.log(`[WebSocket] broadcast - Room clients:`, roomClients);
  console.log(`[WebSocket] broadcast - Payload:`, JSON.stringify(payload, null, 2));

  // List all active rooms for debugging
  console.log(`[WebSocket] Active rooms:`, Array.from(this.io.sockets.adapter.rooms.keys()));

  if (roomSize === 0) {
   console.log(`[WebSocket] ⚠️  WARNING: No clients in room ${room} to receive ${event} event`);
   console.log(`[WebSocket] Available rooms and their sizes:`);
   this.io.sockets.adapter.rooms.forEach((sockets, roomName) => {
    console.log(`[WebSocket]   Room: ${roomName} - Size: ${sockets.size}`);
   });
  }

  try {
   if (excludeUserId) {
    // Exclude specific user's sockets
    const excludeSockets = this.userSocketMap.get(excludeUserId) || [];
    console.log(
     `[WebSocket] Broadcasting to room ${room} excluding user ${excludeUserId} sockets:`,
     excludeSockets,
    );
    this.io.to(room).except(excludeSockets).emit(event, payload);
   } else {
    console.log(`[WebSocket] Broadcasting to all ${roomSize} clients in room ${room}`);
    this.io.to(room).emit(event, payload);
   }
   console.log(`[WebSocket] ✅ Broadcast successful for ${event} to ${room}`);
  } catch (error) {
   console.error(`[WebSocket] ❌ Broadcast failed for ${event} to ${room}:`, error);
  }

  console.log(`[WebSocket] ============= BROADCAST END =============`);
  logger.info(`Broadcast to room ${room}: ${event} (${roomSize} clients)`);
 }

 private createPayload(event: WebSocketEvent, data: any, userId?: number): WebSocketPayload {
  return {
   event,
   data,
   user_id: userId,
   timestamp: new Date().toISOString(),
   room: undefined,
  };
 }

 // Vehicle-related broadcasts
 public broadcastVehicleCreated(vehicle: any, userId?: number) {
  logger.info(
   `Broadcasting vehicle created: ${JSON.stringify({
    vehicle_id: vehicle?.id,
    stock_number: vehicle?.stock_number,
   })}`,
  );
  this.broadcastToRoom(WebSocketRoom.VEHICLE_UPDATES, WebSocketEvent.VEHICLE_CREATED, vehicle, userId);
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "vehicle_created" },
   userId,
  );
 }

 public broadcastVehicleUpdated(vehicle: any, userId?: number) {
  console.log(`[WebSocket Service] *** BROADCASTING VEHICLE UPDATED ***`);
  console.log(`[WebSocket Service] Vehicle ID: ${vehicle?.id}, Stock: ${vehicle?.stock_number}`);
  console.log(`[WebSocket Service] Connected users count: ${this.connectedUsers.size}`);
  console.log(`[WebSocket Service] Available rooms:`, Array.from(this.io.sockets.adapter.rooms.keys()));

  logger.info(
   `Broadcasting vehicle updated: ${JSON.stringify({
    vehicle_id: vehicle?.id,
    stock_number: vehicle?.stock_number,
   })}`,
  );

  console.log(`[WebSocket Service] Broadcasting VEHICLE_UPDATED to VEHICLE_UPDATES room...`);
  this.broadcastToRoom(WebSocketRoom.VEHICLE_UPDATES, WebSocketEvent.VEHICLE_UPDATED, vehicle, userId);

  console.log(`[WebSocket Service] Broadcasting DASHBOARD_STATS_UPDATED to DASHBOARD_UPDATES room...`);
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "vehicle_updated" },
   userId,
  );

  console.log(`[WebSocket Service] *** VEHICLE UPDATE BROADCAST COMPLETE ***`);
 }

 public broadcastVehicleDeleted(vehicleId: number, userId?: number) {
  console.log(`[WebSocket] Starting broadcastVehicleDeleted for vehicle ${vehicleId}`);
  console.log(`[WebSocket] Connected users count: ${this.connectedUsers.size}`);
  console.log(`[WebSocket] Available rooms:`, Array.from(this.io.sockets.adapter.rooms.keys()));

  logger.info(`Broadcasting vehicle deleted: ${vehicleId}`);

  console.log(`[WebSocket] Broadcasting VEHICLE_DELETED to VEHICLE_UPDATES room...`);
  this.broadcastToRoom(
   WebSocketRoom.VEHICLE_UPDATES,
   WebSocketEvent.VEHICLE_DELETED,
   { id: vehicleId },
   userId,
  );

  console.log(`[WebSocket] Broadcasting DASHBOARD_STATS_UPDATED to DASHBOARD_UPDATES room...`);
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "vehicle_deleted" },
   userId,
  );

  console.log(`[WebSocket] Vehicle deletion broadcast complete for vehicle ${vehicleId}`);
 }

 public broadcastVehicleStatusChanged(
  vehicleId: number,
  oldStatus: string,
  newStatus: string,
  userId?: number,
 ) {
  this.broadcastToRoom(
   WebSocketRoom.VEHICLE_UPDATES,
   WebSocketEvent.VEHICLE_STATUS_CHANGED,
   {
    id: vehicleId,
    old_status: oldStatus,
    new_status: newStatus,
   },
   userId,
  );
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "vehicle_status_changed" },
   userId,
  );
 }

 public broadcastVehicleImported(count: number, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.VEHICLE_UPDATES, WebSocketEvent.VEHICLE_IMPORTED, { count }, userId);
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "vehicle_imported" },
   userId,
  );
 }

 // Customer-related broadcasts
 public broadcastCustomerCreated(customer: any, userId?: number) {
  logger.info(
   `Broadcasting customer created: ${JSON.stringify({
    customer_id: customer?.id,
    name: customer?.name,
   })}`,
  );
  this.broadcastToRoom(WebSocketRoom.CUSTOMER_UPDATES, WebSocketEvent.CUSTOMER_CREATED, customer, userId);
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "customer_created" },
   userId,
  );
 }

 public broadcastCustomerUpdated(customer: any, userId?: number) {
  logger.info(
   `Broadcasting customer updated: ${JSON.stringify({
    customer_id: customer?.id,
    name: customer?.name,
   })}`,
  );
  this.broadcastToRoom(WebSocketRoom.CUSTOMER_UPDATES, WebSocketEvent.CUSTOMER_UPDATED, customer, userId);
 }

 public broadcastCustomerDeleted(customerId: number, userId?: number) {
  logger.info(`Broadcasting customer deleted: ${customerId}`);
  this.broadcastToRoom(
   WebSocketRoom.CUSTOMER_UPDATES,
   WebSocketEvent.CUSTOMER_DELETED,
   { id: customerId },
   userId,
  );
 }

 public broadcastCustomerInteractionAdded(interaction: any, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.CUSTOMER_UPDATES,
   WebSocketEvent.CUSTOMER_INTERACTION_ADDED,
   interaction,
   userId,
  );
 }

 // Lead-related broadcasts
 public broadcastLeadCreated(lead: any, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.LEAD_UPDATES, WebSocketEvent.LEAD_CREATED, lead, userId);
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger: "lead_created" },
   userId,
  );
 }

 public broadcastLeadUpdated(lead: any, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.LEAD_UPDATES, WebSocketEvent.LEAD_UPDATED, lead, userId);
 }

 public broadcastLeadDeleted(leadId: number, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.LEAD_UPDATES, WebSocketEvent.LEAD_DELETED, { id: leadId }, userId);
 }

 public broadcastLeadConverted(leadId: number, customerId: number, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.LEAD_UPDATES,
   WebSocketEvent.LEAD_CONVERTED,
   {
    lead_id: leadId,
    customer_id: customerId,
   },
   userId,
  );
  this.broadcastToRoom(
   WebSocketRoom.CUSTOMER_UPDATES,
   WebSocketEvent.CUSTOMER_CREATED,
   {
    converted_from_lead: leadId,
   },
   userId,
  );
 }

 public broadcastLeadStageChanged(leadId: number, oldStage: string, newStage: string, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.LEAD_UPDATES,
   WebSocketEvent.LEAD_STAGE_CHANGED,
   {
    id: leadId,
    old_stage: oldStage,
    new_stage: newStage,
   },
   userId,
  );
 }

 public broadcastLeadInteractionAdded(interaction: any, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.LEAD_UPDATES,
   WebSocketEvent.LEAD_INTERACTION_ADDED,
   interaction,
   userId,
  );
 }

 // Job-related broadcasts
 public broadcastJobCreated(job: any, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.JOB_UPDATES, WebSocketEvent.JOB_CREATED, job, userId);
 }

 public broadcastJobUpdated(job: any, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.JOB_UPDATES, WebSocketEvent.JOB_UPDATED, job, userId);
 }

 public broadcastJobDeleted(jobId: number, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.JOB_UPDATES, WebSocketEvent.JOB_DELETED, { id: jobId }, userId);
 }

 public broadcastJobStatusChanged(jobId: number, oldStatus: string, newStatus: string, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.JOB_UPDATES,
   WebSocketEvent.JOB_STATUS_CHANGED,
   {
    id: jobId,
    old_status: oldStatus,
    new_status: newStatus,
   },
   userId,
  );
 }

 public broadcastJobAssigned(jobId: number, assignedTo: number, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.JOB_UPDATES,
   WebSocketEvent.JOB_ASSIGNED,
   {
    id: jobId,
    assigned_to: assignedTo,
   },
   userId,
  );
 }

 // Appointment-related broadcasts
 public broadcastAppointmentCreated(appointment: any, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.APPOINTMENT_UPDATES,
   WebSocketEvent.APPOINTMENT_CREATED,
   appointment,
   userId,
  );
 }

 public broadcastAppointmentUpdated(appointment: any, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.APPOINTMENT_UPDATES,
   WebSocketEvent.APPOINTMENT_UPDATED,
   appointment,
   userId,
  );
 }

 public broadcastAppointmentDeleted(appointmentId: number, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.APPOINTMENT_UPDATES,
   WebSocketEvent.APPOINTMENT_DELETED,
   { id: appointmentId },
   userId,
  );
 }

 public broadcastAppointmentStatusChanged(
  appointmentId: number,
  oldStatus: string,
  newStatus: string,
  userId?: number,
 ) {
  this.broadcastToRoom(
   WebSocketRoom.APPOINTMENT_UPDATES,
   WebSocketEvent.APPOINTMENT_STATUS_CHANGED,
   {
    id: appointmentId,
    old_status: oldStatus,
    new_status: newStatus,
   },
   userId,
  );
 }

 // Dashboard-related broadcasts
 public broadcastDashboardStatsUpdated(trigger: string, userId?: number) {
  this.broadcastToRoom(
   WebSocketRoom.DASHBOARD_UPDATES,
   WebSocketEvent.DASHBOARD_STATS_UPDATED,
   { trigger },
   userId,
  );
 }

 public broadcastStockAnalyticsUpdated(userId?: number) {
  this.broadcastToRoom(WebSocketRoom.DASHBOARD_UPDATES, WebSocketEvent.STOCK_ANALYTICS_UPDATED, {}, userId);
 }

 public broadcastSalesAnalyticsUpdated(userId?: number) {
  this.broadcastToRoom(WebSocketRoom.DASHBOARD_UPDATES, WebSocketEvent.SALES_ANALYTICS_UPDATED, {}, userId);
 }

 // User-related broadcasts
 public broadcastUserCreated(user: any, userId?: number) {
  this.broadcastToAdmins(WebSocketEvent.USER_CREATED, user);
 }

 public broadcastUserUpdated(user: any, userId?: number) {
  this.broadcastToAdmins(WebSocketEvent.USER_UPDATED, user);
 }

 public broadcastUserDeleted(deletedUserId: number, userId?: number) {
  this.broadcastToAdmins(WebSocketEvent.USER_DELETED, { id: deletedUserId });
 }

 public broadcastUserPermissionsUpdated(affectedUserId: number, permissions: any, userId?: number) {
  this.broadcastToAdmins(WebSocketEvent.USER_PERMISSIONS_UPDATED, {
   user_id: affectedUserId,
   permissions,
  });
  // Also notify the affected user
  this.broadcastToUser(affectedUserId, WebSocketEvent.USER_PERMISSIONS_UPDATED, permissions);
 }

 // Notification-related broadcasts
 public broadcastNotificationCreated(notification: any, targetUserId?: number) {
  if (targetUserId) {
   this.broadcastToUser(targetUserId, WebSocketEvent.NOTIFICATION_CREATED, notification);
  } else {
   this.broadcastToRoom(
    WebSocketRoom.NOTIFICATION_UPDATES,
    WebSocketEvent.NOTIFICATION_CREATED,
    notification,
   );
  }
 }

 public broadcastNotificationRead(notificationId: number, userId: number) {
  this.broadcastToUser(userId, WebSocketEvent.NOTIFICATION_READ, {
   id: notificationId,
  });
 }

 public broadcastNotificationDeleted(notificationId: number, userId: number) {
  this.broadcastToUser(userId, WebSocketEvent.NOTIFICATION_DELETED, {
   id: notificationId,
  });
 }

 // Document-related broadcasts
 public broadcastDocumentUploaded(document: any, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.ALL_USERS, WebSocketEvent.DOCUMENT_UPLOADED, document, userId);
 }

 public broadcastDocumentDeleted(documentId: number, userId?: number) {
  this.broadcastToRoom(WebSocketRoom.ALL_USERS, WebSocketEvent.DOCUMENT_DELETED, { id: documentId }, userId);
 }

 // System-related broadcasts
 public broadcastSystemMaintenance(message: string) {
  this.broadcastToAll(WebSocketEvent.SYSTEM_MAINTENANCE, { message });
 }

 public broadcastSystemUpdate(version: string, features: string[]) {
  this.broadcastToAll(WebSocketEvent.SYSTEM_UPDATE, { version, features });
 }

 // Health and monitoring
 public getConnectionStats() {
  return {
   total_connections: this.connectedUsers.size,
   unique_users: this.userSocketMap.size,
   connected_users: this.getConnectedUsersList(),
   rooms: Object.values(WebSocketRoom),
  };
 }

 public isUserConnected(userId: number): boolean {
  return this.userSocketMap.has(userId);
 }

 public getUserConnectionCount(userId: number): number {
  return this.userSocketMap.get(userId)?.length || 0;
 }
}

export default WebSocketService;
