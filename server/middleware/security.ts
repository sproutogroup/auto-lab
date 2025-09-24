import { Request, Response, NextFunction } from "express";
import logger from "../logger";

export interface SecurityMetrics {
  failedAttempts: number;
  blockedRequests: number;
  suspiciousActivity: number;
  rateLimitHits: number;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private suspiciousIPs = new Set<string>();
  private failedAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();
  private metrics: SecurityMetrics = {
    failedAttempts: 0,
    blockedRequests: 0,
    suspiciousActivity: 0,
    rateLimitHits: 0,
  };

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  recordFailedAttempt(ip: string): void {
    const current = this.failedAttempts.get(ip) || {
      count: 0,
      lastAttempt: new Date(),
    };
    current.count++;
    current.lastAttempt = new Date();
    this.failedAttempts.set(ip, current);
    this.metrics.failedAttempts++;

    // Block IP after 5 failed attempts within 15 minutes
    if (current.count >= 5) {
      this.suspiciousIPs.add(ip);
      logger.warn("IP blocked due to excessive failed attempts", {
        ip,
        attempts: current.count,
      });
    }
  }

  isBlocked(ip: string): boolean {
    const attempt = this.failedAttempts.get(ip);
    if (!attempt) return false;

    // Unblock after 15 minutes of no activity
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (attempt.lastAttempt < fifteenMinutesAgo) {
      this.failedAttempts.delete(ip);
      this.suspiciousIPs.delete(ip);
      return false;
    }

    return this.suspiciousIPs.has(ip);
  }

  detectSuspiciousActivity(req: Request): boolean {
    // Skip security checks for certain paths
    const skipPaths = [
      "/health",
      "/api/health",
      "/favicon.ico",
      "/assets/",
      "/src/",
      "/@vite/",
      "/node_modules/",
    ];

    if (skipPaths.some((path) => req.url?.startsWith(path))) {
      return false;
    }

    // Only check body and query parameters for suspicious content
    const checkContent = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const suspicious = [
      // SQL injection patterns - more specific
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\bFROM\b)/i,
      /(\b(OR|AND)\b.*\d+\s*=\s*\d+)/i,
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      // Path traversal
      /\.\.[\/\\]/,
      // Command injection - more specific
      /[;&|`]\s*(rm|cat|ls|pwd|whoami|id|uname)/i,
      // PHP code injection
      /<\?php/i,
    ];

    const isSuspicious = suspicious.some((pattern) =>
      pattern.test(checkContent),
    );

    if (isSuspicious) {
      this.metrics.suspiciousActivity++;
      logger.warn("Suspicious activity detected", {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        body: req.body,
      });
    }

    return isSuspicious;
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      failedAttempts: 0,
      blockedRequests: 0,
      suspiciousActivity: 0,
      rateLimitHits: 0,
    };
  }
}

export const securityManager = SecurityManager.getInstance();

// Middleware to check for blocked IPs
export const checkBlocked = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || req.connection.remoteAddress || "";

  if (securityManager.isBlocked(ip)) {
    securityManager.getMetrics().blockedRequests++;
    logger.warn("Request from blocked IP", { ip, url: req.url });
    return res.status(429).json({
      success: false,
      message: "Access temporarily restricted",
    });
  }

  next();
};

// Middleware to detect suspicious activity
export const detectSuspicious = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (securityManager.detectSuspiciousActivity(req)) {
    const ip = req.ip || req.connection.remoteAddress || "";
    securityManager.recordFailedAttempt(ip);
    return res.status(400).json({
      success: false,
      message: "Request blocked by security filter",
    });
  }

  next();
};

// Middleware to log security events
export const logSecurityEvent = (eventType: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Security event: ${eventType}`, {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });
    next();
  };
};
