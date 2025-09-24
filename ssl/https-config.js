// HTTPS Server Configuration
import https from "https";
import fs from "fs";
import express from "express";
import { config } from "../config/environment.js";

export function createHTTPSServer(app) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.HTTPS_ENABLED === "true"
  ) {
    try {
      const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, "utf8");
      const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, "utf8");

      const credentials = {
        key: privateKey,
        cert: certificate,
      };

      const httpsServer = https.createServer(credentials, app);

      httpsServer.listen(config.server.port, config.server.host, () => {
        console.log(`🔐 HTTPS Server running on port ${config.server.port}`);
      });

      return httpsServer;
    } catch (error) {
      console.error("❌ Failed to create HTTPS server:", error.message);
      console.log("⚠️  Falling back to HTTP server");
      return null;
    }
  }

  return null;
}

// Force HTTPS redirect middleware
export function forceHTTPS(req, res, next) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.HTTPS_ENABLED === "true" &&
    req.header("x-forwarded-proto") !== "https"
  ) {
    return res.redirect(`https://${req.header("host")}${req.url}`);
  }
  next();
}
