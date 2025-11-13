#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

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

function runTests(testType = "all") {
 log(`🚀 Starting ${testType} test suite...`, "blue");

 const testFiles = {
  all: [
   "api.test.ts",
   "security.test.ts",
   "database.test.ts",
   "business-logic.test.ts",
   "performance.test.ts",
   "integration.test.ts",
  ],
  api: ["api.test.ts"],
  security: ["security.test.ts"],
  database: ["database.test.ts"],
  business: ["business-logic.test.ts"],
  performance: ["performance.test.ts"],
  integration: ["integration.test.ts"],
 };

 const filesToRun = testFiles[testType] || testFiles.all;

 try {
  // Check if database is available
  log("📋 Checking database connection...", "yellow");
  execSync("npm run db:push", { stdio: "inherit" });
  log("✅ Database connection verified", "green");

  // Run tests
  let allTestsPassed = true;
  const results = [];

  for (const testFile of filesToRun) {
   log(`\n🧪 Running ${testFile}...`, "blue");

   try {
    // Validate testFile to prevent command injection
    if (!/^[a-zA-Z0-9\-_.]+\.test\.ts$/.test(testFile)) {
     throw new Error(`Invalid test file name: ${testFile}`);
    }

    const output = execSync("npx jest tests/" + testFile + " --verbose", {
     encoding: "utf8",
     stdio: "pipe",
    });

    log(`✅ ${testFile} - PASSED`, "green");
    results.push({ file: testFile, status: "PASSED", output });
   } catch (error) {
    log(`❌ ${testFile} - FAILED`, "red");
    log(error.stdout || error.message, "red");
    results.push({
     file: testFile,
     status: "FAILED",
     output: error.stdout || error.message,
    });
    allTestsPassed = false;
   }
  }

  // Generate report
  log("\n📊 Test Results Summary:", "bold");
  log("=".repeat(50), "blue");

  results.forEach(result => {
   const statusColor = result.status === "PASSED" ? "green" : "red";
   log(`${result.file}: ${result.status}`, statusColor);
  });

  log("=".repeat(50), "blue");

  if (allTestsPassed) {
   log("🎉 All tests passed! System is production ready.", "green");
   return true;
  } else {
   log("⚠️  Some tests failed. Please review and fix issues.", "red");
   return false;
  }
 } catch (error) {
  log(`❌ Test execution failed: ${error.message}`, "red");
  return false;
 }
}

function runCoverage() {
 log("📊 Running test coverage analysis...", "blue");

 try {
  execSync("npx jest --coverage", { stdio: "inherit" });
  log("✅ Coverage report generated", "green");
 } catch (error) {
  log("❌ Coverage analysis failed", "red");
  console.error(error.message);
 }
}

function runPerformanceTests() {
 log("⚡ Running performance benchmarks...", "blue");

 try {
  execSync("npx jest tests/performance.test.ts --verbose", {
   stdio: "inherit",
  });
  log("✅ Performance tests completed", "green");
 } catch (error) {
  log("❌ Performance tests failed", "red");
  console.error(error.message);
 }
}

function runSecurityTests() {
 log("🔒 Running security validation tests...", "blue");

 try {
  execSync("npx jest tests/security.test.ts --verbose", { stdio: "inherit" });
  log("✅ Security tests completed", "green");
 } catch (error) {
  log("❌ Security tests failed", "red");
  console.error(error.message);
 }
}

// Main execution
const command = process.argv[2] || "all";
const validCommands = [
 "all",
 "api",
 "security",
 "database",
 "business",
 "performance",
 "integration",
 "coverage",
];

if (command === "coverage") {
 runCoverage();
} else if (command === "perf") {
 runPerformanceTests();
} else if (command === "sec") {
 runSecurityTests();
} else if (validCommands.includes(command)) {
 const success = runTests(command);
 process.exit(success ? 0 : 1);
} else {
 log("❌ Invalid command. Available commands:", "red");
 log("  all        - Run all tests", "blue");
 log("  api        - Run API tests only", "blue");
 log("  security   - Run security tests only", "blue");
 log("  database   - Run database tests only", "blue");
 log("  business   - Run business logic tests only", "blue");
 log("  performance - Run performance tests only", "blue");
 log("  integration - Run integration tests only", "blue");
 log("  coverage   - Run coverage analysis", "blue");
 log("  perf       - Run performance benchmarks", "blue");
 log("  sec        - Run security validation", "blue");
 process.exit(1);
}
