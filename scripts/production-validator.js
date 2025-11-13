#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
 green: "\x1b[32m",
 red: "\x1b[31m",
 yellow: "\x1b[33m",
 blue: "\x1b[34m",
 reset: "\x1b[0m",
 bold: "\x1b[1m",
};

function log(message, color = "reset") {
 console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvironment() {
 const errors = [];

 // Check required environment variables
 if (!process.env.DATABASE_URL) {
  errors.push("DATABASE_URL is required");
 }

 if (!process.env.SESSION_SECRET) {
  errors.push("SESSION_SECRET is required");
 }

 if (process.env.NODE_ENV === "production") {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
   errors.push("SESSION_SECRET must be at least 32 characters in production");
  }

  if (!process.env.ALLOWED_ORIGINS) {
   errors.push("ALLOWED_ORIGINS should be set in production");
  }
 }

 // Check database URL format
 if (process.env.DATABASE_URL) {
  try {
   new URL(process.env.DATABASE_URL);
  } catch {
   errors.push("DATABASE_URL must be a valid URL");
  }
 }

 return {
  valid: errors.length === 0,
  errors,
 };
}

function getEnvironmentInfo() {
 return {
  nodeEnv: process.env.NODE_ENV || "development",
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

function validateProductionEnvironment() {
 log("🔍 Validating Production Environment...", "blue");
 log("=".repeat(50), "blue");

 const validation = validateEnvironment();
 const envInfo = getEnvironmentInfo();

 // Environment validation
 if (validation.valid) {
  log("✅ Environment variables validation: PASSED", "green");
 } else {
  log("❌ Environment variables validation: FAILED", "red");
  validation.errors.forEach(error => {
   log(`   - ${error}`, "red");
  });
  return false;
 }

 // Check Node.js version
 const nodeVersion = process.version;
 const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
 if (majorVersion >= 18) {
  log(`✅ Node.js version: ${nodeVersion} (supported)`, "green");
 } else {
  log(`❌ Node.js version: ${nodeVersion} (unsupported, need >= 18)`, "red");
  return false;
 }

 // Check database connection
 try {
  log("📊 Testing database connection...", "yellow");
  execSync("npm run db:push", { stdio: "pipe" });
  log("✅ Database connection: PASSED", "green");
 } catch (error) {
  log("❌ Database connection: FAILED", "red");
  log(`   Error: ${error.message}`, "red");
  return false;
 }

 // Check required directories
 const requiredDirs = ["./logs", "./uploads"];
 requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
   fs.mkdirSync(dir, { recursive: true });
   log(`✅ Created directory: ${dir}`, "green");
  } else {
   log(`✅ Directory exists: ${dir}`, "green");
  }
 });

 // Check SSL/HTTPS requirements
 if (process.env.NODE_ENV === "production") {
  if (!process.env.HTTPS_ENABLED && !process.env.SSL_KEY_PATH) {
   log("⚠️  SSL/HTTPS not configured - ensure reverse proxy handles SSL", "yellow");
  } else {
   log("✅ SSL/HTTPS configuration detected", "green");
  }
 }

 // Security checks
 log("🔒 Security Configuration Check:", "blue");

 if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
  log("✅ Session secret: SECURE", "green");
 } else {
  log("❌ Session secret: INSECURE (must be at least 32 characters)", "red");
  return false;
 }

 if (process.env.ALLOWED_ORIGINS) {
  log("✅ CORS origins: CONFIGURED", "green");
 } else {
  log("⚠️  CORS origins: NOT SET (will allow all origins)", "yellow");
 }

 // Performance checks
 log("⚡ Performance Configuration:", "blue");

 const memoryUsage = process.memoryUsage();
 const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);

 if (memoryMB < 512) {
  log(`✅ Memory usage: ${memoryMB}MB (optimal)`, "green");
 } else if (memoryMB < 1024) {
  log(`⚠️  Memory usage: ${memoryMB}MB (moderate)`, "yellow");
 } else {
  log(`❌ Memory usage: ${memoryMB}MB (high)`, "red");
 }

 // Build validation
 try {
  log("🏗️  Testing build process...", "yellow");
  execSync("npm run build", { stdio: "pipe" });
  log("✅ Build process: PASSED", "green");
 } catch (error) {
  log("❌ Build process: FAILED", "red");
  log(`   Error: ${error.message}`, "red");
  return false;
 }

 log("\n📋 Environment Information:", "blue");
 log(`   Node Environment: ${envInfo.nodeEnv}`, "reset");
 log(`   Node Version: ${envInfo.nodeVersion}`, "reset");
 log(`   Platform: ${envInfo.platform}`, "reset");
 log(`   Architecture: ${envInfo.arch}`, "reset");
 log(`   Process ID: ${envInfo.pid}`, "reset");
 log(`   Uptime: ${Math.round(envInfo.uptime)}s`, "reset");

 log("\n🎉 Production validation completed successfully!", "green");
 return true;
}

function generateProductionChecklist() {
 log("\n📋 Production Deployment Checklist:", "blue");
 log("=".repeat(50), "blue");

 const checklist = [
  "Set NODE_ENV=production",
  "Configure strong SESSION_SECRET (32+ chars)",
  "Set DATABASE_URL to production database",
  "Configure ALLOWED_ORIGINS for your domain",
  "Set up SSL/TLS certificates",
  "Configure automated backups",
  "Set up monitoring and alerting",
  "Configure log rotation",
  "Set up health check monitoring",
  "Configure firewall rules",
  "Set up domain and DNS",
  "Test all authentication flows",
  "Validate rate limiting works",
  "Run security audit",
  "Perform load testing",
  "Set up error tracking",
  "Configure CDN for static assets",
  "Set up database connection pooling",
  "Configure graceful shutdown",
  "Set up process manager (PM2)",
 ];

 checklist.forEach((item, index) => {
  log(`${index + 1}. ${item}`, "reset");
 });

 log("\n💡 Additional Security Recommendations:", "yellow");
 log("   - Enable database query logging in production", "reset");
 log("   - Set up intrusion detection system", "reset");
 log("   - Configure automated security updates", "reset");
 log("   - Set up backup verification testing", "reset");
 log("   - Enable audit logging for sensitive operations", "reset");
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
 const isValid = validateProductionEnvironment();
 generateProductionChecklist();

 if (!isValid) {
  process.exit(1);
 }
}

export { validateProductionEnvironment };
