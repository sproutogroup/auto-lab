import { z } from "zod";

// Environment validation schema
const environmentSchema = z.object({
 NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
 DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
 SESSION_SECRET: z
  .string()
  .min(32, "SESSION_SECRET must be at least 32 characters"),
 ALLOWED_ORIGINS: z.string().optional(),
 PORT: z.string().transform(Number).default("5000"),
 LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
 MAX_FILE_SIZE: z.string().transform(Number).default("10485760"), // 10MB
 RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default("100"),
});

// Parse and validate environment variables
export const env = environmentSchema.parse(process.env);

// Environment-specific configurations
export const config = {
 // Database
 database: {
  url: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production",
  pool: {
   min: 2,
   max: 10,
   idleTimeoutMillis: 30000,
   connectionTimeoutMillis: 5000,
  },
 },

 // Server
 server: {
  port: env.PORT,
  host: "127.0.0.1",
  timeout: 30000,
 },

 // Security
 security: {
  sessionSecret: env.SESSION_SECRET,
  allowedOrigins: env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [],
  rateLimiting: {
   maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
   windowMs: 15 * 60 * 1000, // 15 minutes
   authMaxRequests: 5,
   apiMaxRequests: 1000,
  },
  cors: {
   credentials: true,
   optionsSuccessStatus: 200,
  },
 },

 // File uploads
 uploads: {
  maxFileSize: env.MAX_FILE_SIZE,
  allowedTypes: [
   "image/jpeg",
   "image/png",
   "image/gif",
   "application/pdf",
   "application/msword",
   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  uploadPath: "./uploads",
 },

 // Logging
 logging: {
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === "production" ? "json" : "combined",
  directory: "./logs",
  maxSize: "20m",
  maxFiles: "14d",
 },

 // Monitoring
 monitoring: {
  slowQueryThreshold: 1000, // 1 second
  slowRequestThreshold: 2000, // 2 seconds
  healthCheckInterval: 30000, // 30 seconds
  metricsRetentionDays: 30,
 },

 // Business rules
 business: {
  maxVehicleAge: 50, // years
  maxCustomerAge: 150, // years
  defaultCurrency: "GBP",
  defaultTimezone: "Europe/London",
  financialYearStart: { month: 3, day: 1 }, // April 1st
 },
};

// Validation functions
export function validateEnvironment(): { valid: boolean; errors: string[] } {
 const errors: string[] = [];

 // Check required environment variables
 if (!process.env.DATABASE_URL) {
  errors.push("DATABASE_URL is required");
 }

 if (!process.env.SESSION_SECRET) {
  errors.push("SESSION_SECRET is required");
 }

 if (env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
   errors.push("SESSION_SECRET must be at least 32 characters in production");
  }

  if (!process.env.ALLOWED_ORIGINS) {
   errors.push("ALLOWED_ORIGINS should be set in production");
  }
 }

 // Check database connectivity
 try {
  new URL(env.DATABASE_URL);
 } catch {
  errors.push("DATABASE_URL must be a valid URL");
 }

 return {
  valid: errors.length === 0,
  errors,
 };
}

// Environment info for debugging
export function getEnvironmentInfo() {
 return {
  nodeEnv: env.NODE_ENV,
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  pid: process.pid,
  cwd: process.cwd(),
  timestamp: new Date().toISOString(),
 };
}

// Feature flags based on environment
export const features = {
 enableMetrics: env.NODE_ENV !== "test",
 enablePerformanceMonitoring: env.NODE_ENV === "production",
 enableDebugLogging: env.NODE_ENV === "development",
 enableSecurityHeaders: env.NODE_ENV === "production",
 enableRateLimiting: env.NODE_ENV !== "development",
 enableCors: true,
 enableCompression: env.NODE_ENV === "production",
 enableHttpsRedirect: env.NODE_ENV === "production",
};

export default {
 env,
 config,
 validateEnvironment,
 getEnvironmentInfo,
 features,
};
