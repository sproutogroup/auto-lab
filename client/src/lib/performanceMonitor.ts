export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: "timing" | "counter" | "gauge";
  tags?: Record<string, string>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private maxMetrics = 1000;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers(): void {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric(
              "page_load_time",
              navEntry.loadEventEnd - navEntry.fetchStart,
              "timing",
            );
            this.recordMetric(
              "dom_content_loaded",
              navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
              "timing",
            );
          }
        }
      });

      try {
        navObserver.observe({ entryTypes: ["navigation"] });
        this.observers.push(navObserver);
      } catch (err) {
        console.warn("Navigation observer not supported");
      }

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric("resource_load_time", entry.duration, "timing", {
              resource: entry.name,
              initiatorType: resourceEntry.initiatorType,
            });
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ["resource"] });
        this.observers.push(resourceObserver);
      } catch (err) {
        console.warn("Resource observer not supported");
      }

      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "longtask") {
            this.recordMetric("long_task_duration", entry.duration, "timing");
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ["longtask"] });
        this.observers.push(longTaskObserver);
      } catch (err) {
        console.warn("Long task observer not supported");
      }
    }
  }

  recordMetric(
    name: string,
    value: number,
    type: "timing" | "counter" | "gauge",
    tags?: Record<string, string>,
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type,
      tags,
    };

    this.metrics.push(metric);

    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations with tiered warnings
    if (type === "timing") {
      if (value > 5000) {
        console.error(
          `Critical slow operation detected: ${name} took ${value}ms`,
        );
      } else if (value > 2000) {
        console.warn(`Slow operation detected: ${name} took ${value}ms`);
      } else if (value > 1000) {
        console.info(
          `Moderate slow operation detected: ${name} took ${value}ms`,
        );
      }
    }
  }

  measureApiCall<T>(
    apiCall: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const startTime = performance.now();

    return apiCall().then(
      (result) => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_${operationName}_duration`, duration, "timing");
        this.recordMetric(`api_${operationName}_success`, 1, "counter");
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_${operationName}_duration`, duration, "timing");
        this.recordMetric(`api_${operationName}_error`, 1, "counter");
        throw error;
      },
    );
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((metric) => metric.name === name);
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
