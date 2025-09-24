import winston from "winston";

// Create Winston logger with structured format
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "dealership-management" },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

// Add file transport for production
if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.json(),
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.json(),
    }),
  );
}

// Create request ID middleware
export const requestId = (req: any, res: any, next: any) => {
  req.requestId = Math.random().toString(36).substr(2, 9);
  req.startTime = Date.now();
  next();
};

// Create request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - req.startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user?.id || null,
      username: req.user?.username || null,
    };

    if (res.statusCode >= 400) {
      logger.error("Request failed", logData);
    } else {
      logger.info("Request completed", logData);
    }

    return originalSend.call(this, data);
  };

  next();
};

// Database query logger
export const logDatabaseQuery = (
  query: string,
  params: any[] = [],
  duration: number,
) => {
  logger.debug("Database query", {
    query,
    params,
    duration,
    timestamp: new Date().toISOString(),
  });
};

// Business operation logger
export const logBusinessOperation = (
  operation: string,
  data: any,
  userId?: number,
) => {
  logger.info("Business operation", {
    operation,
    data,
    userId,
    timestamp: new Date().toISOString(),
  });
};

// Security event logger
export const logSecurityEvent = (
  event: string,
  details: any,
  severity: "low" | "medium" | "high" = "medium",
) => {
  logger.warn("Security event", {
    event,
    details,
    severity,
    timestamp: new Date().toISOString(),
  });
};

// Error logger with context
export const logError = (error: Error, context: any = {}) => {
  logger.error("Application error", {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
