import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestId, requestLogger } from "./logger";
import { performanceMonitor, securityMonitor } from "./middleware/monitoring";
import { checkBlocked, detectSuspicious } from "./middleware/security";
import path from "path";
import { fileURLToPath } from "url";


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// CORS Configuration
const corsOptions = {
 origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) return callback(null, true);

  // Default allowed origins
  const allowedOrigins = [
    "http://localhost:5173",
   "http://127.0.0.1:5173",      
   "http://localhost:3000",
   "http://localhost:5000",
   "http://127.0.0.1:3000",
   "http://127.0.0.1:5000",
   // Replit domains
   /^https:\/\/.*\.replit\.app$/,
   /^https:\/\/.*\.repl\.co$/,
   /^https:\/\/.*\.replit\.dev$/,
   // Custom domain
   "https://autolabdms.com",
   "https://www.autolabdms.com",
   "https://auto-lab.onrender.com",
   "https://auto-lab-nhle.onrender.com",
  ];

  // Add custom domains from environment variables
  const customOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];
  allowedOrigins.push(...customOrigins);

  // In development, be more permissive
  if (process.env.NODE_ENV === "development") {
   // Allow any localhost or 127.0.0.1 with any port
   if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return callback(null, true);
   }
  }

  // Check if origin matches any allowed patterns
  const isAllowed = allowedOrigins.some(allowedOrigin => {
   if (typeof allowedOrigin === "string") {
    return origin === allowedOrigin;
   } else if (allowedOrigin instanceof RegExp) {
    return allowedOrigin.test(origin);
   }
   return false;
  });

  if (isAllowed) {
   callback(null, true);
  } else {
   console.warn(`CORS: Blocked request from origin: ${origin}`);
   callback(new Error("Not allowed by CORS policy"));
  }
 },
 credentials: true, // Allow cookies and auth headers
 methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
 allowedHeaders: [
  "Origin",
  "X-Requested-With",
  "Content-Type",
  "Accept",
  "Authorization",
  "Cache-Control",
  "Pragma",
  "X-HTTP-Method-Override",
  "X-Forwarded-For",
  "X-Forwarded-Proto",
 ],
 exposedHeaders: ["X-Total-Count", "Link", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
 maxAge: process.env.NODE_ENV === "production" ? 300 : 0, // 5 minutes in production, no cache in dev
 optionsSuccessStatus: 200, // For legacy browser support
};

// CORS **before** uploads
app.use(cors(corsOptions));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// Security Headers with Helmet
app.use(
 helmet({
  contentSecurityPolicy: {
   directives: {
    defaultSrc: ["'self'"],
    styleSrc: [
     "'self'",
     "'unsafe-inline'", // Required for Tailwind CSS and inline styles
     "https://fonts.googleapis.com",
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    scriptSrc: [
     "'self'",
     process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "", // For Vite HMR in dev
     process.env.NODE_ENV === "development" ? "'unsafe-inline'" : "", // For inline scripts in dev
     "https://replit.com", // For Replit banner
    ].filter(Boolean),
    imgSrc: [
     "'self'",
     "data:",
     "blob:",
     "https:", // Allow HTTPS images
    ],
    connectSrc: [
     "'self'",
     "https://res.cloudinary.com",
     process.env.NODE_ENV === "development" ? "ws://localhost:*" : "",
     process.env.NODE_ENV === "development" ? "http://localhost:*" : "",
     process.env.NODE_ENV === "development" ? "wss://localhost:*" : "",
     process.env.NODE_ENV === "development" ? "https://localhost:*" : "",
     "ws:",
     "wss:",
    ].filter(Boolean),
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
   },
  },
  crossOriginEmbedderPolicy: false, // Disabled for compatibility
  hsts: {
   maxAge: 31536000, // 1 year
   includeSubDomains: true,
   preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
 }),
);

// Rate Limiting Configuration
const createRateLimit = (windowMs: number, max: number, message: string, skipSuccessfulRequests = false) => {
 return rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests,
  skip: req => {
   // Skip rate limiting for health checks, static assets, and development files
   return (
    req.path === "/health" ||
    req.path === "/api/health" ||
    req.path.startsWith("/assets/") ||
    req.path.startsWith("/src/") ||
    req.path.includes(".tsx") ||
    req.path.includes(".ts") ||
    req.path.includes(".js") ||
    req.path.includes(".css") ||
    req.path.includes(".json") ||
    (process.env.NODE_ENV === "development" && req.path.startsWith("/"))
   );
  },
  handler: (req, res) => {
   console.warn(
    `Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}, User-Agent: ${req.get("User-Agent")}`,
   );
   res.status(429).json({
    error: message,
    retryAfter: Math.round(windowMs / 1000),
   });
  },
 });
};

// Global rate limiter - More permissive for development
const globalLimiter = createRateLimit(
 15 * 60 * 1000, // 15 minutes
 process.env.NODE_ENV === "development" ? 1000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
 "Too many requests from this IP, please try again later.",
);

// Strict rate limiter for auth endpoints - 5 requests per 15 minutes
const authLimiter = createRateLimit(
 15 * 60 * 1000, // 15 minutes
 5,
 "Too many authentication attempts, please try again later.",
);

// API rate limiter - 1000 requests per hour for authenticated requests
const apiLimiter = createRateLimit(
 60 * 60 * 1000, // 1 hour
 1000,
 "API rate limit exceeded, please try again later.",
 true, // Skip successful requests
);

// Speed limiter - slow down after many requests
const speedLimiter = slowDown({
 windowMs: 15 * 60 * 1000, // 15 minutes
 delayAfter: process.env.NODE_ENV === "development" ? 200 : 50, // More permissive in dev
 delayMs: () => 500, // Add 500ms delay per request after delayAfter
 maxDelayMs: 20000, // Max delay of 20 seconds
 skip: req => {
  return (
   req.path === "/health" ||
   req.path === "/api/health" ||
   req.path.startsWith("/assets/") ||
   req.path.startsWith("/src/") ||
   req.path.includes(".tsx") ||
   req.path.includes(".ts") ||
   req.path.includes(".js") ||
   req.path.includes(".css") ||
   req.path.includes(".json") ||
   (process.env.NODE_ENV === "development" && req.path.startsWith("/"))
  );
 },
});

// Apply rate limiting middleware
app.use(globalLimiter);
app.use(speedLimiter);

// Apply auth-specific rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/logout", authLimiter);

// Apply API rate limiting to all API routes
app.use("/api", apiLimiter);

// Body parsing middleware (after rate limiting to prevent large payload attacks)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Add monitoring middleware
app.use(requestId);
app.use(performanceMonitor);
app.use(securityMonitor);
app.use(requestLogger);

// Add custom security middleware
app.use(checkBlocked);
app.use(detectSuspicious);

// Add cache control middleware to prevent stale content after deployment
app.use((req, res, next) => {
 const url = req.path;

 // For HTML files and API endpoints - prevent caching
 if (url.endsWith(".html") || url.startsWith("/api/") || url === "/") {
  res.set({
   "Cache-Control": "no-cache, no-store, must-revalidate",
   Pragma: "no-cache",
   Expires: "0",
  });
 }
 // For static assets (JS, CSS, images) - short cache with etag validation
 else if (url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
  res.set({
   "Cache-Control": "public, max-age=300, must-revalidate", // 5 minutes
   ETag: `"${Date.now()}"`, // Simple ETag based on deployment time
  });
 }
 // For service worker - never cache to ensure updates
 else if (url.includes("sw.js") || url.includes("service-worker")) {
  res.set({
   "Cache-Control": "no-cache, no-store, must-revalidate",
   Pragma: "no-cache",
   Expires: "0",
  });
 }

 next();
});

app.use((req, res, next) => {
 const start = Date.now();
 const path = req.path;
 let capturedJsonResponse: Record<string, any> | undefined = undefined;

 const originalResJson = res.json;
 res.json = function (bodyJson, ...args) {
  capturedJsonResponse = bodyJson;
  return originalResJson.apply(res, [bodyJson, ...args]);
 };

 res.on("finish", () => {
  const duration = Date.now() - start;
  if (path.startsWith("/api")) {
   let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
   if (capturedJsonResponse) {
    logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
   }

   if (logLine.length > 80) {
    logLine = logLine.slice(0, 79) + "…";
   }

   log(logLine);
  }
 });

 next();
});

(async () => {
 const server = await registerRoutes(app);

 app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
 });

 // importantly only setup vite in development and after
 // setting up all the other routes so the catch-all route
 // doesn't interfere with the other routes
 if (app.get("env") === "development") {
  await setupVite(app, server);
 } else {
  serveStatic(app);
 }

 // ALWAYS serve the app on port 5000
 // this serves both the API and the client.
 // It is the only port that is not firewalled.
 const port = 5000;
 const host = process.platform === "win32" ? "127.0.0.1" : "0.0.0.0";

 if (process.platform === "win32") {
  server.listen(port, host, () => {
   log(`🚀 Dev server running at http://${host}:${port}`);
  });
 } else {
  server.listen({ port, host, reusePort: true }, () => {
   log(`🚀 Server running at http://${host}:${port}`);
  });
 }
})();
