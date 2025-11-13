import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
// import logger from '../utils/logger'; // Logger not available in client
// Simplified mobile detection
const isMobileDevice = () =>
 /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Simplified mobile error handler
const handleMobileWebSocketError = (socket: any, error: any) => {
 console.log("[WebSocket] Mobile error handler triggered:", {
  isMobile: isMobileDevice(),
  isIOSDevice: /iPad|iPhone|iPod/.test(navigator.userAgent),
  error: error.type || error.message || "websocket error",
 });
};

// Simplified mobile connection monitoring
const setupMobileConnectionMonitoring = (socket: any) => {
 const isMobile = isMobileDevice();
 if (!isMobile) return null;

 const cleanup = () => {
  // Mobile cleanup logic
 };

 return cleanup;
};

// WebSocket events enum
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

// WebSocket payload interface
interface WebSocketPayload {
 event: WebSocketEvent;
 data: any;
 user_id?: number;
 username?: string;
 timestamp: string;
 room?: string;
}

// Room definitions
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

// Connection status
export enum ConnectionStatus {
 DISCONNECTED = "disconnected",
 CONNECTING = "connecting",
 CONNECTED = "connected",
 RECONNECTING = "reconnecting",
 ERROR = "error",
}

// Connected user interface
interface ConnectedUser {
 user_id: number;
 username: string;
 role: string;
 connected_at: string;
 last_activity: string;
}

// WebSocket context type
interface WebSocketContextType {
 socket: Socket | null;
 isConnected: boolean;
 connectionStatus: ConnectionStatus;
 connectedUsers: ConnectedUser[];
 reconnectAttempts: number;
 joinRoom: (room: WebSocketRoom) => void;
 leaveRoom: (room: WebSocketRoom) => void;
 sendMessage: (event: string, data: any) => void;
 subscribeToEvent: (event: WebSocketEvent, callback: (data: any) => void) => () => void;
 unsubscribeFromEvent: (event: WebSocketEvent, callback: (data: any) => void) => void;
}

// Create WebSocket context
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// WebSocket provider component
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [socket, setSocket] = useState<Socket | null>(null);
 const [isConnected, setIsConnected] = useState(false);
 const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
 const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
 const [reconnectAttempts, setReconnectAttempts] = useState(0);

 const queryClient = useQueryClient();
 const { user } = useAuth();
 const { toast } = useToast();

 // Use refs to avoid dependency issues
 const eventSubscriptionsRef = useRef<Map<WebSocketEvent, Set<(data: any) => void>>>(new Map());
 const socketRef = useRef<Socket | null>(null);
 const isConnectedRef = useRef(false);
 const userRef = useRef(user);

 // Update refs when values change
 useEffect(() => {
  socketRef.current = socket;
 }, [socket]);

 useEffect(() => {
  isConnectedRef.current = isConnected;
 }, [isConnected]);

 useEffect(() => {
  userRef.current = user;
 }, [user]);

 // Trigger event callbacks
 const triggerEventCallbacks = useCallback((event: WebSocketEvent, payload: WebSocketPayload) => {
  const callbacks = eventSubscriptionsRef.current.get(event);
  if (callbacks) {
   callbacks.forEach(callback => {
    try {
     callback(payload);
    } catch (error) {
     console.error(`Error in WebSocket event callback for ${event}:`, error);
    }
   });
  }
 }, []);

 // Setup event listeners
 const setupEventListeners = useCallback(
  (socket: Socket) => {
   console.log("[WebSocket] Setting up event listeners");

   // Vehicle events
   socket.on(WebSocketEvent.VEHICLE_CREATED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] *** VEHICLE_CREATED RECEIVED *** - Frontend event listener triggered");
    console.log("[WebSocket] Vehicle created event payload:", payload);
    console.log("[WebSocket] Invalidating dashboard stats cache immediately...");
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/stock-age/analytics"],
    });
    console.log("[WebSocket] Triggering dashboard refetch for vehicle creation...");
    queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
    triggerEventCallbacks(WebSocketEvent.VEHICLE_CREATED, payload);
   });

   socket.on(WebSocketEvent.VEHICLE_UPDATED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] *** VEHICLE_UPDATED RECEIVED *** - Frontend event listener triggered");
    console.log("[WebSocket] Vehicle updated event payload:", payload);
    console.log("[WebSocket] Invalidating dashboard stats cache immediately...");
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/stock-age/analytics"],
    });
    console.log("[WebSocket] Triggering dashboard refetch...");
    queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
    triggerEventCallbacks(WebSocketEvent.VEHICLE_UPDATED, payload);
   });

   socket.on(WebSocketEvent.VEHICLE_DELETED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] Vehicle deleted event received:", payload);
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/stock-age/analytics"],
    });
    triggerEventCallbacks(WebSocketEvent.VEHICLE_DELETED, payload);
   });

   socket.on(WebSocketEvent.VEHICLE_IMPORTED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/stock-age/analytics"],
    });
    triggerEventCallbacks(WebSocketEvent.VEHICLE_IMPORTED, payload);

    toast({
     title: "Vehicles Imported",
     description: `${payload.data.count} vehicles have been imported successfully.`,
    });
   });

   // Customer events
   socket.on(WebSocketEvent.CUSTOMER_CREATED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] Customer created event received:", payload);
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/customers/crm-stats"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    triggerEventCallbacks(WebSocketEvent.CUSTOMER_CREATED, payload);
   });

   socket.on(WebSocketEvent.CUSTOMER_UPDATED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] Customer updated event received:", payload);
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/customers/crm-stats"],
    });
    triggerEventCallbacks(WebSocketEvent.CUSTOMER_UPDATED, payload);
   });

   socket.on(WebSocketEvent.CUSTOMER_DELETED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] Customer deleted event received:", payload);
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/customers/crm-stats"],
    });
    triggerEventCallbacks(WebSocketEvent.CUSTOMER_DELETED, payload);
   });

   // Lead events
   socket.on(WebSocketEvent.LEAD_CREATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    triggerEventCallbacks(WebSocketEvent.LEAD_CREATED, payload);
   });

   socket.on(WebSocketEvent.LEAD_UPDATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    triggerEventCallbacks(WebSocketEvent.LEAD_UPDATED, payload);
   });

   socket.on(WebSocketEvent.LEAD_DELETED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    triggerEventCallbacks(WebSocketEvent.LEAD_DELETED, payload);
   });

   socket.on(WebSocketEvent.LEAD_CONVERTED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    triggerEventCallbacks(WebSocketEvent.LEAD_CONVERTED, payload);

    toast({
     title: "Lead Converted",
     description: "Lead has been successfully converted to customer.",
    });
   });

   // Job events
   socket.on(WebSocketEvent.JOB_CREATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    triggerEventCallbacks(WebSocketEvent.JOB_CREATED, payload);
   });

   socket.on(WebSocketEvent.JOB_UPDATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    triggerEventCallbacks(WebSocketEvent.JOB_UPDATED, payload);
   });

   socket.on(WebSocketEvent.JOB_DELETED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
    triggerEventCallbacks(WebSocketEvent.JOB_DELETED, payload);
   });

   // Appointment events
   socket.on(WebSocketEvent.APPOINTMENT_CREATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    triggerEventCallbacks(WebSocketEvent.APPOINTMENT_CREATED, payload);
   });

   socket.on(WebSocketEvent.APPOINTMENT_UPDATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    triggerEventCallbacks(WebSocketEvent.APPOINTMENT_UPDATED, payload);
   });

   socket.on(WebSocketEvent.APPOINTMENT_DELETED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    triggerEventCallbacks(WebSocketEvent.APPOINTMENT_DELETED, payload);
   });

   // Dashboard events - with global dashboard stats invalidation
   socket.on(WebSocketEvent.DASHBOARD_STATS_UPDATED, (payload: WebSocketPayload) => {
    console.log(
     "[WebSocket] *** GLOBAL DASHBOARD_STATS_UPDATED RECEIVED *** - Frontend event listener triggered",
    );
    console.log("[WebSocket] Dashboard stats update payload:", payload);
    console.log("[WebSocket] Trigger reason:", payload?.data?.trigger);
    console.log("[WebSocket] Invalidating all dashboard cache...");
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/customers/crm-stats"],
    });
    console.log("[WebSocket] Force refetching dashboard stats for immediate update...");
    queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
    triggerEventCallbacks(WebSocketEvent.DASHBOARD_STATS_UPDATED, payload);
   });

   socket.on(WebSocketEvent.STOCK_ANALYTICS_UPDATED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] Stock analytics updated event received:", payload);
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/stock-age/analytics"],
    });
    triggerEventCallbacks(WebSocketEvent.STOCK_ANALYTICS_UPDATED, payload);
   });

   socket.on(WebSocketEvent.SALES_ANALYTICS_UPDATED, (payload: WebSocketPayload) => {
    console.log("[WebSocket] Sales analytics updated event received:", payload);
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    queryClient.invalidateQueries({
     queryKey: ["/api/customers/crm-stats"],
    });
    triggerEventCallbacks(WebSocketEvent.SALES_ANALYTICS_UPDATED, payload);
   });

   // Notification events
   socket.on(WebSocketEvent.NOTIFICATION_CREATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    triggerEventCallbacks(WebSocketEvent.NOTIFICATION_CREATED, payload);
   });

   socket.on(WebSocketEvent.NOTIFICATION_READ, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    triggerEventCallbacks(WebSocketEvent.NOTIFICATION_READ, payload);
   });

   socket.on(WebSocketEvent.NOTIFICATION_DELETED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    triggerEventCallbacks(WebSocketEvent.NOTIFICATION_DELETED, payload);
   });

   // Document events
   socket.on(WebSocketEvent.DOCUMENT_UPLOADED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({
     queryKey: ["/api/purchase-invoices"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
    triggerEventCallbacks(WebSocketEvent.DOCUMENT_UPLOADED, payload);
   });

   socket.on(WebSocketEvent.DOCUMENT_DELETED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({
     queryKey: ["/api/purchase-invoices"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
    triggerEventCallbacks(WebSocketEvent.DOCUMENT_DELETED, payload);
   });

   // Pinned message events
   socket.on(WebSocketEvent.PINNED_MESSAGE_CREATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
    triggerEventCallbacks(WebSocketEvent.PINNED_MESSAGE_CREATED, payload);
   });

   socket.on(WebSocketEvent.PINNED_MESSAGE_UPDATED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
    triggerEventCallbacks(WebSocketEvent.PINNED_MESSAGE_UPDATED, payload);
   });

   socket.on(WebSocketEvent.PINNED_MESSAGE_DELETED, (payload: WebSocketPayload) => {
    queryClient.invalidateQueries({ queryKey: ["/api/pinned-messages"] });
    triggerEventCallbacks(WebSocketEvent.PINNED_MESSAGE_DELETED, payload);
   });

   // System events
   socket.on(WebSocketEvent.SYSTEM_MAINTENANCE, (payload: WebSocketPayload) => {
    toast({
     title: "System Maintenance",
     description: payload.data.message,
     variant: "destructive",
    });
    triggerEventCallbacks(WebSocketEvent.SYSTEM_MAINTENANCE, payload);
   });

   socket.on(WebSocketEvent.SYSTEM_UPDATE, (payload: WebSocketPayload) => {
    toast({
     title: "System Updated",
     description: `System has been updated to version ${payload.data.version}.`,
    });
    triggerEventCallbacks(WebSocketEvent.SYSTEM_UPDATE, payload);
   });
  },
  [queryClient, toast, triggerEventCallbacks],
 );

 // Initialize WebSocket connection
 const initializeSocket = useCallback(() => {
  if (!user || socket) return;

  console.log("[WebSocket] Initializing connection for user:", user.username);
  setConnectionStatus(ConnectionStatus.CONNECTING);

  // Use simplified socket configuration
  const newSocket = io({
   path: "/socket.io",
   transports: ["polling", "websocket"],
   upgrade: true,
   auth: {
    user_id: user.id,
    username: user.username,
    role: user.role,
   },
   // Connection stability settings
   timeout: 20000,
   forceNew: false,
   reconnection: true,
   reconnectionAttempts: 10,
   reconnectionDelay: 1000,
   reconnectionDelayMax: 5000,
   autoConnect: true,
   withCredentials: true,
  });

  console.log("[WebSocket] Using socket configuration:", {
   isMobile: isMobileDevice(),
   transports: ["polling", "websocket"],
   upgrade: true,
  });

  // Connection handlers
  newSocket.on("connect", () => {
   console.log("[WebSocket] Connected successfully");
   setIsConnected(true);
   setConnectionStatus(ConnectionStatus.CONNECTED);
   setReconnectAttempts(0);

   // Authenticate user
   newSocket.emit("authenticate", {
    user_id: user.id,
    username: user.username,
    role: user.role,
   });
  });

  newSocket.on("disconnect", reason => {
   console.log("[WebSocket] Disconnected:", reason);
   setIsConnected(false);
   setConnectionStatus(ConnectionStatus.DISCONNECTED);
   setConnectedUsers([]);
  });

  newSocket.on("reconnect", attemptNumber => {
   console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
   setIsConnected(true);
   setConnectionStatus(ConnectionStatus.CONNECTED);
   setReconnectAttempts(0);
  });

  newSocket.on("reconnect_attempt", attemptNumber => {
   console.log(`[WebSocket] Reconnection attempt ${attemptNumber}`);
   setConnectionStatus(ConnectionStatus.RECONNECTING);
   setReconnectAttempts(attemptNumber);
  });

  newSocket.on("connect_error", error => {
   console.error("[WebSocket] Connection error:", error);
   setIsConnected(false);
   setConnectionStatus(ConnectionStatus.ERROR);
   setReconnectAttempts(prev => prev + 1);

   // Use mobile-specific error handling
   handleMobileWebSocketError(error, newSocket);

   // Show error toast only for significant errors
   if (reconnectAttempts < 3) {
    toast({
     title: "Connection Error",
     description: "Unable to connect to the server. Retrying...",
     variant: "destructive",
    });
   }
  });

  newSocket.on("reconnect_error", error => {
   console.error("[WebSocket] Reconnection error:", error);
   setConnectionStatus(ConnectionStatus.ERROR);
  });

  newSocket.on("reconnect_failed", () => {
   console.error("[WebSocket] Reconnection failed");
   setConnectionStatus(ConnectionStatus.ERROR);
   toast({
    title: "Connection Failed",
    description: "Unable to reconnect to the server. Please refresh the page.",
    variant: "destructive",
   });
  });

  newSocket.on("authenticated", data => {
   console.log("[WebSocket] Authentication successful");
   setConnectedUsers(data.connected_users || []);

   // Auto-join essential rooms after authentication
   setTimeout(() => {
    console.log("[WebSocket] Auto-joining essential rooms");
    newSocket.emit("join_room", WebSocketRoom.ALL_USERS);
    newSocket.emit("join_room", WebSocketRoom.VEHICLE_UPDATES);
    newSocket.emit("join_room", WebSocketRoom.CUSTOMER_UPDATES);
    newSocket.emit("join_room", WebSocketRoom.DASHBOARD_UPDATES);
    newSocket.emit("join_room", WebSocketRoom.NOTIFICATION_UPDATES);

    // Join role-specific rooms
    if (userRef.current?.role === "admin") {
     newSocket.emit("join_room", WebSocketRoom.ADMIN_USERS);
    } else if (userRef.current?.role === "manager") {
     newSocket.emit("join_room", WebSocketRoom.MANAGER_USERS);
    } else if (userRef.current?.role === "sales") {
     newSocket.emit("join_room", WebSocketRoom.SALES_USERS);
    }
   }, 100); // Small delay to ensure connection is fully established
  });

  newSocket.on("connected_users_updated", data => {
   console.log("[WebSocket] Connected users updated");
   setConnectedUsers(data.connected_users || []);
  });

  newSocket.on("room_joined", data => {
   console.log(`[WebSocket] Successfully joined room: ${data.room}`);
  });

  newSocket.on("room_left", data => {
   console.log(`[WebSocket] Successfully left room: ${data.room}`);
  });

  // Event listeners for real-time updates
  setupEventListeners(newSocket);

  // Setup mobile connection monitoring
  const mobileCleanup = setupMobileConnectionMonitoring(newSocket);

  setSocket(newSocket);

  // Store cleanup function for mobile monitoring
  if (mobileCleanup) {
   (newSocket as any).mobileCleanup = mobileCleanup;
  }
 }, [user?.id, setupEventListeners]);

 // Initialize socket when user changes
 useEffect(() => {
  if (user) {
   initializeSocket();
  } else {
   // Cleanup when user logs out
   if (socket) {
    socket.disconnect();
    setSocket(null);
    setIsConnected(false);
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    setConnectedUsers([]);
   }
  }

  return () => {
   if (socket) {
    // Clean up mobile monitoring
    if ((socket as any).mobileCleanup) {
     (socket as any).mobileCleanup();
    }
    socket.disconnect();
   }
  };
 }, [user?.id]);

 // Room management
 const joinRoom = useCallback((room: WebSocketRoom) => {
  if (socketRef.current && isConnectedRef.current) {
   socketRef.current.emit("join_room", room);
  }
 }, []);

 const leaveRoom = useCallback((room: WebSocketRoom) => {
  if (socketRef.current && isConnectedRef.current) {
   socketRef.current.emit("leave_room", room);
  }
 }, []);

 const sendMessage = useCallback((event: string, data: any) => {
  if (socketRef.current && isConnectedRef.current) {
   socketRef.current.emit(event, data);
  }
 }, []);

 // Event subscription management
 const subscribeToEvent = useCallback((event: WebSocketEvent, callback: (data: any) => void) => {
  const callbacks = eventSubscriptionsRef.current.get(event) || new Set();
  callbacks.add(callback);
  eventSubscriptionsRef.current.set(event, callbacks);

  return () => {
   const callbacks = eventSubscriptionsRef.current.get(event);
   if (callbacks) {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
     eventSubscriptionsRef.current.delete(event);
    }
   }
  };
 }, []);

 const unsubscribeFromEvent = useCallback((event: WebSocketEvent, callback: (data: any) => void) => {
  const callbacks = eventSubscriptionsRef.current.get(event);
  if (callbacks) {
   callbacks.delete(callback);
   if (callbacks.size === 0) {
    eventSubscriptionsRef.current.delete(event);
   }
  }
 }, []);

 const value: WebSocketContextType = {
  socket,
  isConnected,
  connectionStatus,
  connectedUsers,
  reconnectAttempts,
  joinRoom,
  leaveRoom,
  sendMessage,
  subscribeToEvent,
  unsubscribeFromEvent,
 };

 return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

// Custom hooks
export const useWebSocket = () => {
 const context = useContext(WebSocketContext);
 if (context === undefined) {
  throw new Error("useWebSocket must be used within a WebSocketProvider");
 }
 return context;
};

export const useConnectionStatus = () => {
 const { connectionStatus, isConnected, reconnectAttempts } = useWebSocket();
 return { connectionStatus, isConnected, reconnectAttempts };
};

export const useConnectedUsers = () => {
 const { connectedUsers } = useWebSocket();
 return connectedUsers;
};

export const useWebSocketEvent = (event: WebSocketEvent, callback: (data: any) => void) => {
 const { subscribeToEvent } = useWebSocket();

 useEffect(() => {
  const unsubscribe = subscribeToEvent(event, callback);
  return unsubscribe;
 }, [event, callback, subscribeToEvent]);
};
