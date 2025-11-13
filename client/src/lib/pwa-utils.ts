// PWA Utilities for AUTOLAB Dealership Management System
// Implementing comprehensive PWA functionality with snake_case naming conventions

import { Workbox } from "workbox-window";

// PWA installation and service worker management
export class PWAManager {
 private service_worker: Workbox | null = null;
 private install_prompt_event: BeforeInstallPromptEvent | null = null;
 private is_installed = false;
 private is_online = navigator.onLine;
 private online_callbacks: Array<(online: boolean) => void> = [];
 private install_callbacks: Array<(event: BeforeInstallPromptEvent) => void> = [];

 constructor() {
  this.init_service_worker();
  this.setup_install_prompt();
  this.setup_network_listeners();
  this.check_app_installation();
 }

 // Initialize service worker
 private init_service_worker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
   this.service_worker = new Workbox("/sw.js");

   // Service worker events
   this.service_worker.addEventListener("installed", event => {
    if (event.isUpdate) {
     this.show_update_notification();
    }
   });

   this.service_worker.addEventListener("waiting", event => {
    this.show_update_notification();
   });

   this.service_worker.addEventListener("controlling", event => {
    window.location.reload();
   });

   // Register service worker
   this.service_worker
    .register()
    .then(() => {
     console.log("[PWA] Service worker registered successfully");
    })
    .catch(error => {
     console.error("[PWA] Service worker registration failed:", error);
    });
  }
 }

 // Setup install prompt handling
 private setup_install_prompt() {
  window.addEventListener("beforeinstallprompt", (event: BeforeInstallPromptEvent) => {
   event.preventDefault();
   this.install_prompt_event = event;

   // Notify callbacks
   this.install_callbacks.forEach(callback => callback(event));

   console.log("[PWA] Install prompt event captured");
  });

  window.addEventListener("appinstalled", () => {
   this.is_installed = true;
   this.install_prompt_event = null;
   console.log("[PWA] App installed successfully");
  });
 }

 // Setup network status listeners
 private setup_network_listeners() {
  window.addEventListener("online", () => {
   this.is_online = true;
   this.notify_online_status(true);
   console.log("[PWA] Network online");
  });

  window.addEventListener("offline", () => {
   this.is_online = false;
   this.notify_online_status(false);
   console.log("[PWA] Network offline");
  });
 }

 // Check if app is already installed
 private check_app_installation() {
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
   this.is_installed = true;
  } else if (window.navigator && (window.navigator as any).standalone === true) {
   this.is_installed = true;
  }
 }

 // Show update notification
 private show_update_notification() {
  if (this.service_worker) {
   const update_available = confirm("A new version of AUTOLAB is available. Would you like to update now?");

   if (update_available) {
    this.service_worker.messageSkipWaiting();
   }
  }
 }

 // Notify online status change
 private notify_online_status(online: boolean) {
  this.online_callbacks.forEach(callback => callback(online));
 }

 // Public API methods
 public async install_app(): Promise<boolean> {
  if (!this.install_prompt_event) {
   console.log("[PWA] Install prompt not available");
   return false;
  }

  try {
   const result = await this.install_prompt_event.prompt();
   const choice = await result.userChoice;

   if (choice === "accepted") {
    console.log("[PWA] User accepted install prompt");
    return true;
   } else {
    console.log("[PWA] User dismissed install prompt");
    return false;
   }
  } catch (error) {
   console.error("[PWA] Install prompt error:", error);
   return false;
  }
 }

 public is_installable(): boolean {
  return this.install_prompt_event !== null;
 }

 public is_app_installed(): boolean {
  return this.is_installed;
 }

 public is_app_online(): boolean {
  return this.is_online;
 }

 public on_install_available(callback: (event: BeforeInstallPromptEvent) => void) {
  this.install_callbacks.push(callback);
 }

 public on_online_change(callback: (online: boolean) => void) {
  this.online_callbacks.push(callback);
 }

 public async update_service_worker(): Promise<void> {
  if (this.service_worker) {
   await this.service_worker.messageSkipWaiting();
  }
 }
}

// Create singleton instance
export const pwa_manager = new PWAManager();

// Offline storage management
export class OfflineStorageManager {
 private db_name = "autolab_offline_storage";
 private db_version = 1;
 private db: IDBDatabase | null = null;

 constructor() {
  this.init_database();
 }

 private async init_database(): Promise<void> {
  try {
   this.db = await this.open_database();
   console.log("[PWA] Offline storage initialized");
  } catch (error) {
   console.error("[PWA] Failed to initialize offline storage:", error);
  }
 }

 private open_database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
   const request = indexedDB.open(this.db_name, this.db_version);

   request.onerror = () => reject(request.error);
   request.onsuccess = () => resolve(request.result);

   request.onupgradeneeded = event => {
    const db = (event.target as IDBOpenDBRequest).result;

    // Create object stores for different data types
    this.create_object_stores(db);
   };
  });
 }

 private create_object_stores(db: IDBDatabase): void {
  // Vehicle data store
  if (!db.objectStoreNames.contains("vehicles")) {
   const vehicle_store = db.createObjectStore("vehicles", { keyPath: "id" });
   vehicle_store.createIndex("stock_number", "stock_number", {
    unique: false,
   });
   vehicle_store.createIndex("sales_status", "sales_status", {
    unique: false,
   });
  }

  // Customer data store
  if (!db.objectStoreNames.contains("customers")) {
   const customer_store = db.createObjectStore("customers", {
    keyPath: "id",
   });
   customer_store.createIndex("email", "email", { unique: false });
   customer_store.createIndex("phone", "phone", { unique: false });
  }

  // Dashboard stats store
  if (!db.objectStoreNames.contains("dashboard_stats")) {
   const stats_store = db.createObjectStore("dashboard_stats", {
    keyPath: "id",
   });
   stats_store.createIndex("timestamp", "timestamp", { unique: false });
  }

  // Offline actions queue
  if (!db.objectStoreNames.contains("offline_actions")) {
   const actions_store = db.createObjectStore("offline_actions", {
    keyPath: "id",
    autoIncrement: true,
   });
   actions_store.createIndex("endpoint", "endpoint", { unique: false });
   actions_store.createIndex("timestamp", "timestamp", { unique: false });
  }
 }

 // Store data offline
 public async store_data(store_name: string, data: any): Promise<void> {
  if (!this.db) {
   throw new Error("Database not initialized");
  }

  const transaction = this.db.transaction([store_name], "readwrite");
  const store = transaction.objectStore(store_name);

  await store.put(data);
 }

 // Retrieve data offline
 public async get_data(store_name: string, key: any): Promise<any> {
  if (!this.db) {
   throw new Error("Database not initialized");
  }

  const transaction = this.db.transaction([store_name], "readonly");
  const store = transaction.objectStore(store_name);

  return new Promise((resolve, reject) => {
   const request = store.get(key);
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(request.error);
  });
 }

 // Get all data from store
 public async get_all_data(store_name: string): Promise<any[]> {
  if (!this.db) {
   throw new Error("Database not initialized");
  }

  const transaction = this.db.transaction([store_name], "readonly");
  const store = transaction.objectStore(store_name);

  return new Promise((resolve, reject) => {
   const request = store.getAll();
   request.onsuccess = () => resolve(request.result);
   request.onerror = () => reject(request.error);
  });
 }

 // Queue offline action
 public async queue_offline_action(action: OfflineAction): Promise<void> {
  const action_with_timestamp = {
   ...action,
   timestamp: Date.now(),
  };

  await this.store_data("offline_actions", action_with_timestamp);
 }

 // Get queued offline actions
 public async get_queued_actions(): Promise<OfflineAction[]> {
  return await this.get_all_data("offline_actions");
 }

 // Clear completed offline actions
 public async clear_completed_actions(action_ids: number[]): Promise<void> {
  if (!this.db) {
   throw new Error("Database not initialized");
  }

  const transaction = this.db.transaction(["offline_actions"], "readwrite");
  const store = transaction.objectStore("offline_actions");

  for (const id of action_ids) {
   await store.delete(id);
  }
 }
}

// Types for offline functionality
export interface OfflineAction {
 id?: number;
 endpoint: string;
 method: string;
 data: any;
 timestamp: number;
 retry_count?: number;
}

export interface BeforeInstallPromptEvent extends Event {
 prompt(): Promise<{ userChoice: Promise<string> }>;
 userChoice: Promise<string>;
}

// Create singleton instance
export const offline_storage = new OfflineStorageManager();

// Utility functions for PWA features
export function is_pwa_supported(): boolean {
 return "serviceWorker" in navigator && "indexedDB" in window;
}

export function get_pwa_display_mode(): string {
 if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
  return "standalone";
 }

 if (window.navigator && (window.navigator as any).standalone === true) {
  return "standalone";
 }

 return "browser";
}

export function is_ios(): boolean {
 return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function is_android(): boolean {
 return /Android/.test(navigator.userAgent);
}

export function show_install_instructions(): void {
 const display_mode = get_pwa_display_mode();

 if (display_mode === "standalone") {
  console.log("[PWA] App is already installed");
  return;
 }

 if (is_ios()) {
  alert('To install AUTOLAB:\n\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Tap "Add"');
 } else if (is_android()) {
  alert('To install AUTOLAB:\n\n1. Tap the menu button (⋮)\n2. Select "Add to Home screen"\n3. Tap "Add"');
 } else {
  alert(
   'To install AUTOLAB:\n\n1. Click the install button in the address bar\n2. Or use the browser menu to "Install app"',
  );
 }
}

console.log("[PWA] PWA utilities loaded");
