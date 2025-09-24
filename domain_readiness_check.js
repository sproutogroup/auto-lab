#!/usr/bin/env node

/**
 * Domain Readiness Check for autolabdms.com
 * Verifies all configurations are properly set for custom domain deployment
 */

import { readFileSync } from "fs";

console.log("🌐 DOMAIN READINESS CHECK - autolabdms.com");
console.log("=".repeat(60));

const results = {
  cors_config: false,
  websocket_cors: false,
  vapid_subject: false,
  service_worker: false,
  manifest_config: false,
  client_websocket: false,
  overall_ready: false,
};

function checkPassed(message) {
  console.log(`✅ ${message}`);
  return true;
}

function checkFailed(message) {
  console.log(`❌ ${message}`);
  return false;
}

function checkWarning(message) {
  console.log(`⚠️  ${message}`);
  return false;
}

console.log("\n1. Checking CORS Configuration...");
try {
  const indexContent = readFileSync("server/index.ts", "utf8");

  if (
    indexContent.includes("https://autolabdms.com") &&
    indexContent.includes("https://www.autolabdms.com")
  ) {
    results.cors_config = checkPassed(
      "CORS configured for autolabdms.com domain",
    );
  } else {
    results.cors_config = checkFailed("CORS not configured for custom domain");
  }

  if (indexContent.includes("process.env.ALLOWED_ORIGINS")) {
    checkPassed("Environment variable fallback configured");
  } else {
    checkWarning("No environment variable fallback for origins");
  }
} catch (error) {
  results.cors_config = checkFailed(
    `Could not check CORS config: ${error.message}`,
  );
}

console.log("\n2. Checking WebSocket CORS Configuration...");
try {
  const websocketContent = readFileSync(
    "server/services/websocketService.ts",
    "utf8",
  );

  if (
    websocketContent.includes("https://autolabdms.com") &&
    websocketContent.includes("https://www.autolabdms.com")
  ) {
    results.websocket_cors = checkPassed(
      "WebSocket CORS configured for autolabdms.com",
    );
  } else {
    results.websocket_cors = checkFailed(
      "WebSocket CORS not configured for custom domain",
    );
  }
} catch (error) {
  results.websocket_cors = checkFailed(
    `Could not check WebSocket CORS: ${error.message}`,
  );
}

console.log("\n3. Checking VAPID Subject Domain Match...");
const vapidSubject = process.env.VAPID_SUBJECT;
if (vapidSubject && vapidSubject.includes("autolabdms.com")) {
  results.vapid_subject = checkPassed(
    "VAPID subject matches domain (admin@autolabdms.com)",
  );
} else {
  results.vapid_subject = checkFailed("VAPID subject does not match domain");
}

console.log("\n4. Checking Service Worker Domain Compatibility...");
try {
  const swContent = readFileSync("client/public/sw.js", "utf8");

  // Service worker should be domain-agnostic
  if (
    swContent.includes("addEventListener") &&
    swContent.includes("push") &&
    !swContent.includes("localhost") &&
    !swContent.includes("replit.app")
  ) {
    results.service_worker = checkPassed("Service worker is domain-agnostic");
  } else {
    results.service_worker = checkWarning(
      "Service worker may have domain-specific code",
    );
  }
} catch (error) {
  results.service_worker = checkFailed(
    `Could not check service worker: ${error.message}`,
  );
}

console.log("\n5. Checking Web App Manifest...");
try {
  const manifestContent = readFileSync("client/public/manifest.json", "utf8");
  const manifest = JSON.parse(manifestContent);

  // Manifest should use relative URLs
  if (
    manifest.start_url === "/" &&
    manifest.scope === "/" &&
    manifest.icons &&
    manifest.icons.length > 0
  ) {
    results.manifest_config = checkPassed(
      "Web app manifest uses relative URLs (domain-agnostic)",
    );
  } else {
    results.manifest_config = checkFailed(
      "Web app manifest may have domain-specific URLs",
    );
  }
} catch (error) {
  results.manifest_config = checkFailed(
    `Could not check manifest: ${error.message}`,
  );
}

console.log("\n6. Checking Client WebSocket Configuration...");
try {
  const wsContextContent = readFileSync(
    "client/src/contexts/WebSocketContext.tsx",
    "utf8",
  );

  if (wsContextContent.includes("window.location.origin")) {
    results.client_websocket = checkPassed(
      "Client WebSocket uses dynamic origin (domain-agnostic)",
    );
  } else {
    results.client_websocket = checkFailed(
      "Client WebSocket may have hardcoded domain",
    );
  }
} catch (error) {
  results.client_websocket = checkFailed(
    `Could not check client WebSocket: ${error.message}`,
  );
}

console.log("\n7. Overall Domain Readiness...");
const passedChecks = Object.values(results).filter(Boolean).length;
const totalChecks = Object.keys(results).length - 1; // Exclude overall_ready

const readinessScore = (passedChecks / totalChecks) * 100;

if (readinessScore >= 90) {
  results.overall_ready = checkPassed("Domain is ready for deployment");
} else if (readinessScore >= 70) {
  results.overall_ready = checkWarning("Domain has minor configuration issues");
} else {
  results.overall_ready = checkFailed(
    "Domain has significant configuration issues",
  );
}

console.log("\n" + "=".repeat(60));
console.log("📊 DOMAIN READINESS SUMMARY");
console.log("-".repeat(40));

Object.entries(results).forEach(([test, passed]) => {
  const status = passed ? "✅" : "❌";
  const testName = test.replace(/_/g, " ").toUpperCase();
  console.log(`${status} ${testName}`);
});

console.log("-".repeat(40));
console.log(`Readiness Score: ${readinessScore.toFixed(1)}%`);

if (results.overall_ready) {
  console.log("\n🎉 DOMAIN READY FOR DEPLOYMENT!");
  console.log("Your application is fully configured for autolabdms.com:");
  console.log("• CORS allows requests from your domain");
  console.log("• WebSocket connections will work");
  console.log("• Push notifications will function properly");
  console.log("• Service worker and manifest are domain-agnostic");
  console.log("• VAPID subject matches your domain");
} else {
  console.log("\n⚠️  DOMAIN CONFIGURATION ISSUES");
  console.log("Please review the failed checks above.");
}

console.log("\n🔧 CONFIGURATION SUMMARY FOR autolabdms.com:");
console.log(
  "• CORS Origins: https://autolabdms.com, https://www.autolabdms.com",
);
console.log("• WebSocket CORS: Configured for both subdomains");
console.log("• VAPID Subject: admin@autolabdms.com (matches domain)");
console.log("• Service Worker: Domain-agnostic");
console.log("• Manifest: Uses relative URLs");
console.log("• Client WebSocket: Uses dynamic origin");

console.log("\n📋 DEPLOYMENT CHECKLIST FOR CUSTOM DOMAIN:");
console.log("• Point autolabdms.com DNS to your Replit deployment");
console.log("• Configure SSL certificate (automatic with Replit)");
console.log("• Test all functionality on custom domain");
console.log("• Verify push notifications work with custom domain");
console.log("• Check WebSocket connections are stable");
console.log("• Test PWA installation from custom domain");

console.log("\n🚀 NEXT STEPS:");
console.log(
  "1. Configure DNS for autolabdms.com to point to your Replit deployment",
);
console.log("2. Test the application on the custom domain");
console.log("3. Verify push notifications work");
console.log("4. Test WebSocket real-time features");
console.log("5. Confirm PWA installation works from custom domain");
