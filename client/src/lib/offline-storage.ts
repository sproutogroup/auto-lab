// Offline Storage Management for AUTOLAB PWA
// Implementing comprehensive offline data storage with snake_case naming conventions

export interface OfflineAction {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  endpoint: string;
  data: any;
  timestamp: number;
  retry_count: number;
  max_retries: number;
}

export interface OfflineData {
  vehicles: any[];
  customers: any[];
  dashboard_stats: any;
  last_sync: number;
}

class OfflineStorageManager {
  private db_name = "autolab_offline_db";
  private db_version = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.init_database();
  }

  // Initialize IndexedDB database
  private async init_database(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.db_name, this.db_version);

      request.onerror = () => {
        console.error("[PWA] Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("[PWA] IndexedDB initialized successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        if (!db.objectStoreNames.contains("offline_actions")) {
          db.createObjectStore("offline_actions", { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains("offline_data")) {
          db.createObjectStore("offline_data", { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains("cache_data")) {
          db.createObjectStore("cache_data", { keyPath: "key" });
        }
      };
    });
  }

  // Store offline action
  async store_offline_action(
    action: Omit<OfflineAction, "id" | "timestamp" | "retry_count">,
  ): Promise<void> {
    if (!this.db) await this.init_database();

    const offline_action: OfflineAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retry_count: 0,
      max_retries: action.max_retries || 3,
    };

    const transaction = this.db!.transaction(["offline_actions"], "readwrite");
    const store = transaction.objectStore("offline_actions");

    return new Promise((resolve, reject) => {
      const request = store.add(offline_action);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all offline actions
  async get_offline_actions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(["offline_actions"], "readonly");
    const store = transaction.objectStore("offline_actions");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove offline action
  async remove_offline_action(id: string): Promise<void> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(["offline_actions"], "readwrite");
    const store = transaction.objectStore("offline_actions");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline actions count
  async get_offline_actions_count(): Promise<number> {
    try {
      if (!this.db) await this.init_database();

      const transaction = this.db!.transaction(["offline_actions"], "readonly");
      const store = transaction.objectStore("offline_actions");

      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("[PWA] Failed to get offline actions count:", error);
      return 0;
    }
  }

  // Store offline data
  async store_offline_data(key: string, data: any): Promise<void> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(["offline_data"], "readwrite");
    const store = transaction.objectStore("offline_data");

    return new Promise((resolve, reject) => {
      const request = store.put({ key, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline data
  async get_offline_data(key: string): Promise<any> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(["offline_data"], "readonly");
    const store = transaction.objectStore("offline_data");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data);
      request.onerror = () => reject(request.error);
    });
  }

  // Store cache data
  async store_cache_data(
    key: string,
    data: any,
    ttl: number = 3600000,
  ): Promise<void> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(["cache_data"], "readwrite");
    const store = transaction.objectStore("cache_data");

    return new Promise((resolve, reject) => {
      const request = store.put({
        key,
        data,
        timestamp: Date.now(),
        expires: Date.now() + ttl,
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cache data
  async get_cache_data(key: string): Promise<any> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(["cache_data"], "readonly");
    const store = transaction.objectStore("cache_data");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expires > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all offline data
  async clear_all_data(): Promise<void> {
    if (!this.db) await this.init_database();

    const transaction = this.db!.transaction(
      ["offline_actions", "offline_data", "cache_data"],
      "readwrite",
    );

    return Promise.all([
      this.clear_store(transaction, "offline_actions"),
      this.clear_store(transaction, "offline_data"),
      this.clear_store(transaction, "cache_data"),
    ]).then(() => {});
  }

  private clear_store(
    transaction: IDBTransaction,
    store_name: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(store_name);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const offline_storage = new OfflineStorageManager();
