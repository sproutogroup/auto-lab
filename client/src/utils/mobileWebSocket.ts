/**
 * Mobile WebSocket Utilities
 * Provides optimized WebSocket connection management for mobile devices
 */

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

export const isSafari = (): boolean => {
  return (
    /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  );
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const getMobileOptimizedSocketOptions = () => {
  const isMobile = isMobileDevice();
  const isIOSDevice = isIOS();
  const isSafariDevice = isSafari();

  // Base options for all devices
  const baseOptions = {
    path: "/ws",
    transports: ["polling", "websocket"] as const,
    upgrade: true,
    timeout: 45000,
    forceNew: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    tryAllTransports: true,
    closeOnBeforeunload: false,
  };

  // Mobile-specific optimizations
  if (isMobile) {
    return {
      ...baseOptions,
      // Force polling first for mobile devices
      transports: ["polling", "websocket"] as const,
      upgrade: false, // Disable upgrade for mobile initially
      rememberUpgrade: false,
      reconnectionAttempts: 15, // More attempts for mobile
      reconnectionDelay: 3000, // Longer delay for mobile
      reconnectionDelayMax: 15000,
      timeout: 60000, // Longer timeout for mobile
    };
  }

  // iOS/Safari specific optimizations
  if (isIOSDevice || isSafariDevice) {
    return {
      ...baseOptions,
      transports: ["polling"] as const, // Use polling only for iOS/Safari
      upgrade: false,
      rememberUpgrade: false,
      reconnectionAttempts: 20,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 20000,
      timeout: 60000,
    };
  }

  return baseOptions;
};

/**
 * Handle mobile-specific WebSocket errors
 */
export const handleMobileWebSocketError = (error: any, socket: any) => {
  const isMobile = isMobileDevice();
  const isIOSDevice = isIOS();

  console.log("[WebSocket] Mobile error handler triggered:", {
    isMobile,
    isIOSDevice,
    error: error.message || error,
  });

  if (isMobile && socket) {
    // Force polling for mobile devices on error
    if (socket.io.opts.transports[0] !== "polling") {
      socket.io.opts.transports = ["polling"];
      socket.io.opts.upgrade = false;
      socket.io.opts.rememberUpgrade = false;
      console.log(
        "[WebSocket] Switched to polling-only for mobile error recovery",
      );
    }
  }

  if (isIOSDevice && socket) {
    // iOS specific error handling
    socket.io.opts.transports = ["polling"];
    socket.io.opts.upgrade = false;
    socket.io.opts.rememberUpgrade = false;
    socket.io.opts.forceNew = true;
    console.log("[WebSocket] Applied iOS-specific error recovery");
  }
};

/**
 * Mobile-specific connection monitoring
 */
export const setupMobileConnectionMonitoring = (socket: any) => {
  const isMobile = isMobileDevice();

  if (!isMobile) return;

  // Page visibility change handler for mobile
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      console.log("[WebSocket] Page became visible, checking connection...");
      if (socket && !socket.connected) {
        console.log(
          "[WebSocket] Attempting to reconnect after visibility change...",
        );
        socket.connect();
      }
    } else {
      console.log("[WebSocket] Page became hidden");
    }
  };

  // Network status change handler for mobile
  const handleOnline = () => {
    console.log("[WebSocket] Network came online, checking connection...");
    if (socket && !socket.connected) {
      console.log(
        "[WebSocket] Attempting to reconnect after network restoration...",
      );
      socket.connect();
    }
  };

  const handleOffline = () => {
    console.log("[WebSocket] Network went offline");
  };

  // Add event listeners
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};
