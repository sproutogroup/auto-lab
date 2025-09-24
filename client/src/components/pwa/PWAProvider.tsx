// PWA Provider Component for AUTOLAB Dealership Management System
// Implementing comprehensive PWA context with snake_case naming conventions

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { PWAManager } from "@/lib/pwa-utils";
import { offline_storage } from "@/lib/offline-storage";

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// PWA Context interface
interface PWAContextType {
  // Installation state
  is_installable: boolean;
  is_installed: boolean;
  install_app: () => Promise<boolean>;
  show_install_prompt: boolean;

  // Network state
  is_online: boolean;

  // Service worker state
  is_service_worker_ready: boolean;
  update_available: boolean;
  update_service_worker: () => Promise<void>;

  // Offline functionality
  offline_actions_count: number;
  sync_offline_actions: () => Promise<void>;

  // PWA features
  notification_permission: NotificationPermission;
  request_notification_permission: () => Promise<NotificationPermission>;

  // UI state
  show_offline_banner: boolean;
  dismiss_offline_banner: () => void;
  show_install_banner: boolean;
  dismiss_install_banner: () => void;
}

// Create PWA context
const PWAContext = createContext<PWAContextType | null>(null);

// PWA Provider props
interface PWAProviderProps {
  children: ReactNode;
}

// PWA Provider component
export function PWAProvider({ children }: PWAProviderProps) {
  // Installation state
  const [is_installable, set_is_installable] = useState(false);
  const [is_installed, set_is_installed] = useState(false);
  const [install_prompt_event, set_install_prompt_event] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show_install_prompt, set_show_install_prompt] = useState(false);

  // Network state
  const [is_online, set_is_online] = useState(navigator.onLine);

  // Service worker state
  const [is_service_worker_ready, set_is_service_worker_ready] =
    useState(false);
  const [update_available, set_update_available] = useState(false);

  // Offline functionality
  const [offline_actions_count, set_offline_actions_count] = useState(0);

  // Notification permission
  const [notification_permission, set_notification_permission] =
    useState<NotificationPermission>("default");

  // UI state
  const [show_offline_banner, set_show_offline_banner] = useState(false);
  const [show_install_banner, set_show_install_banner] = useState(false);

  // PWA Manager instance
  const [pwa_manager] = useState(() => new PWAManager());

  // Initialize PWA functionality
  useEffect(() => {
    // Check initial installation state
    set_is_installed(false);
    set_is_installable(false);

    // Check initial network state
    set_is_online(navigator.onLine);

    // Check notification permission
    if ("Notification" in window) {
      set_notification_permission(Notification.permission);
    }

    // Setup PWA event listeners
    setup_pwa_listeners();

    // Load offline actions count
    load_offline_actions_count();

    console.log("[PWA] PWA Provider initialized");
  }, []);

  // Setup PWA event listeners
  const setup_pwa_listeners = () => {
    // Network status listeners
    const handle_online = () => {
      set_is_online(true);
      set_show_offline_banner(false);
      // Sync offline actions when back online
      sync_offline_actions();
    };

    const handle_offline = () => {
      set_is_online(false);
      set_show_offline_banner(true);
    };

    window.addEventListener("online", handle_online);
    window.addEventListener("offline", handle_offline);

    // Install prompt listener
    const handle_install_prompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      set_install_prompt_event(event);
      set_is_installable(true);
      set_show_install_prompt(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handle_install_prompt as EventListener,
    );

    // Cleanup function
    return () => {
      window.removeEventListener("online", handle_online);
      window.removeEventListener("offline", handle_offline);
      window.removeEventListener(
        "beforeinstallprompt",
        handle_install_prompt as EventListener,
      );
    };
  };

  // Load offline actions count
  const load_offline_actions_count = async () => {
    try {
      const count = await offline_storage.get_offline_actions_count();
      set_offline_actions_count(count);
    } catch (error) {
      console.error("[PWA] Failed to load offline actions count:", error);
    }
  };

  // Install app function
  const install_app = async (): Promise<boolean> => {
    try {
      if (!install_prompt_event) {
        console.log("[PWA] No install prompt available");
        return false;
      }

      const user_choice = await install_prompt_event.prompt();
      const success = user_choice.outcome === "accepted";

      if (success) {
        set_is_installed(true);
        set_is_installable(false);
        set_show_install_prompt(false);
        set_show_install_banner(false);

        // Track installation
        console.log("[PWA] App installed successfully");
      }
      return success;
    } catch (error) {
      console.error("[PWA] Installation failed:", error);
      return false;
    }
  };

  // Update service worker
  const update_service_worker = async (): Promise<void> => {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        set_update_available(false);
        console.log("[PWA] Service worker updated");
      }
    } catch (error) {
      console.error("[PWA] Service worker update failed:", error);
    }
  };

  // Sync offline actions
  const sync_offline_actions = async (): Promise<void> => {
    if (!is_online) {
      console.log("[PWA] Cannot sync offline actions - no network");
      return;
    }

    try {
      const actions = await offline_storage.get_offline_actions();
      const completed_action_ids: string[] = [];

      for (const action of actions) {
        try {
          const response = await fetch(action.endpoint, {
            method: action.type,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(action.data),
          });

          if (response.ok) {
            completed_action_ids.push(action.id);
            console.log("[PWA] Synced offline action:", action.endpoint);
          }
        } catch (error) {
          console.error("[PWA] Failed to sync action:", action.endpoint, error);
        }
      }

      // Remove completed actions
      for (const id of completed_action_ids) {
        await offline_storage.remove_offline_action(id);
      }

      if (completed_action_ids.length > 0) {
        await load_offline_actions_count();
      }

      console.log("[PWA] Offline actions sync completed");
    } catch (error) {
      console.error("[PWA] Offline actions sync failed:", error);
    }
  };

  // Request notification permission
  const request_notification_permission =
    async (): Promise<NotificationPermission> => {
      if (!("Notification" in window)) {
        console.log("[PWA] Notifications not supported");
        return "denied";
      }

      try {
        const permission = await Notification.requestPermission();
        set_notification_permission(permission);
        return permission;
      } catch (error) {
        console.error(
          "[PWA] Failed to request notification permission:",
          error,
        );
        return "denied";
      }
    };

  // Dismiss offline banner
  const dismiss_offline_banner = () => {
    set_show_offline_banner(false);
  };

  // Dismiss install banner
  const dismiss_install_banner = () => {
    set_show_install_banner(false);
  };

  // Context value
  const context_value: PWAContextType = {
    // Installation state
    is_installable,
    is_installed,
    install_app,
    show_install_prompt,

    // Network state
    is_online,

    // Service worker state
    is_service_worker_ready,
    update_available,
    update_service_worker,

    // Offline functionality
    offline_actions_count,
    sync_offline_actions,

    // PWA features
    notification_permission,
    request_notification_permission,

    // UI state
    show_offline_banner,
    dismiss_offline_banner,
    show_install_banner,
    dismiss_install_banner,
  };

  return (
    <PWAContext.Provider value={context_value}>{children}</PWAContext.Provider>
  );
}

// Custom hook to use PWA context
export function usePWA(): PWAContextType {
  const context = useContext(PWAContext);

  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }

  return context;
}

// Export context for advanced usage
export { PWAContext };
