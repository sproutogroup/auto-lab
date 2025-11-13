import { Request, Response, NextFunction } from "express";
import logger, { logSecurityEvent, logError } from "../logger";

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
 const startTime = Date.now();

 res.on("finish", () => {
  const duration = Date.now() - startTime;
  const logData = {
   method: req.method,
   url: req.url,
   statusCode: res.statusCode,
   duration,
   userAgent: req.get("User-Agent"),
   ip: req.ip,
  };

  // Log slow requests with tiered warnings
  if (duration > 5000) {
   logger.error("Critical slow request detected", logData);
  } else if (duration > 2000) {
   logger.warn("Slow request detected", logData);
  } else if (duration > 1000) {
   logger.info("Moderate slow request detected", logData);
  }

  // Log errors
  if (res.statusCode >= 400) {
   logger.error("Request error", logData);
  }
 });

 next();
};

// Security monitoring middleware
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
 // Log suspicious patterns
 const suspiciousPatterns = [
  /\.\./, // Path traversal
  /<script/i, // XSS attempts
  /union\s+select/i, // SQL injection
  /exec\s*\(/i, // Command injection
 ];

 const requestData = JSON.stringify(req.body) + req.url + (req.get("User-Agent") || "");

 for (const pattern of suspiciousPatterns) {
  if (pattern.test(requestData)) {
   logSecurityEvent(
    "Suspicious request pattern",
    {
     pattern: pattern.toString(),
     url: req.url,
     method: req.method,
     ip: req.ip,
     userAgent: req.get("User-Agent"),
     body: req.body,
    },
    "high",
   );
   break;
  }
 }

 next();
};

// Error monitoring middleware
export const errorMonitor = (err: Error, req: Request, res: Response, next: NextFunction) => {
 logError(err, {
  url: req.url,
  method: req.method,
  ip: req.ip,
  userAgent: req.get("User-Agent"),
  body: req.body,
  user: req.user || null,
 });

 // Don't expose internal errors in production
 if (process.env.NODE_ENV === "production") {
  res.status(500).json({
   error: "Internal server error",
   requestId: (req as any).requestId,
  });
 } else {
  res.status(500).json({
   error: err.message,
   stack: err.stack,
   requestId: (req as any).requestId,
  });
 }
};

// Health check metrics
interface HealthMetrics {
 uptime: number;
 memoryUsage: NodeJS.MemoryUsage;
 cpuUsage: NodeJS.CpuUsage;
 timestamp: string;
}

export const getHealthMetrics = (): HealthMetrics => {
 return {
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage(),
  timestamp: new Date().toISOString(),
 };
};
