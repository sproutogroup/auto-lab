import { errorHandler } from "./errorHandler";

export interface SecurityConfig {
  maxRetries: number;
  retryDelay: number;
  maxRequestSize: number;
  allowedOrigins: string[];
  csrfProtection: boolean;
}

export class SecurityHelper {
  private static instance: SecurityHelper;
  private config: SecurityConfig;
  private retryAttempts = new Map<string, number>();
  private suspiciousActivity = new Set<string>();

  static getInstance(): SecurityHelper {
    if (!SecurityHelper.instance) {
      SecurityHelper.instance = new SecurityHelper();
    }
    return SecurityHelper.instance;
  }

  constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      allowedOrigins: ["https://your-domain.com"],
      csrfProtection: true,
    };
  }

  sanitizeInput(input: string): string {
    if (typeof input !== "string") return "";

    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+=/gi, "")
      .trim();
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone);
  }

  validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  checkRateLimit(identifier: string): boolean {
    const attempts = this.retryAttempts.get(identifier) || 0;
    if (attempts >= this.config.maxRetries) {
      this.suspiciousActivity.add(identifier);
      return false;
    }
    return true;
  }

  recordAttempt(identifier: string): void {
    const attempts = this.retryAttempts.get(identifier) || 0;
    this.retryAttempts.set(identifier, attempts + 1);

    // Clear after delay
    setTimeout(() => {
      this.retryAttempts.delete(identifier);
    }, this.config.retryDelay);
  }

  isOriginAllowed(origin: string): boolean {
    return (
      this.config.allowedOrigins.includes(origin) ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes(".replit.app")
    );
  }

  detectSuspiciousActivity(request: any): boolean {
    const suspicious = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      // Path traversal
      /\.\.[\/\\]/,
      // Command injection
      /[;&|`$]/,
    ];

    const requestString = JSON.stringify(request);
    return suspicious.some((pattern) => pattern.test(requestString));
  }

  secureApiCall(url: string, options: RequestInit = {}): Promise<Response> {
    const identifier = `${url}_${options.method || "GET"}`;

    if (!this.checkRateLimit(identifier)) {
      throw new Error("Rate limit exceeded");
    }

    // Add security headers
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Security-Policy": "default-src 'self'",
      },
    };

    // Validate request size
    if (options.body) {
      const bodySize = new Blob([options.body as string]).size;
      if (bodySize > this.config.maxRequestSize) {
        throw new Error("Request size too large");
      }
    }

    // Check for suspicious activity
    if (this.detectSuspiciousActivity(options.body)) {
      errorHandler.logError(
        new Error("Suspicious activity detected"),
        "Security",
      );
      throw new Error("Request blocked by security filter");
    }

    this.recordAttempt(identifier);

    return fetch(url, secureOptions).catch((error) => {
      errorHandler.handleApiError(error);
      throw error;
    });
  }

  clearSuspiciousActivity(): void {
    this.suspiciousActivity.clear();
    this.retryAttempts.clear();
  }
}

export const securityHelper = SecurityHelper.getInstance();
