#!/usr/bin/env node

import https from "https";
import { URL } from "url";

function checkSSL(domain) {
 return new Promise((resolve, reject) => {
  const options = {
   hostname: domain,
   port: 443,
   path: "/",
   method: "GET",
   rejectUnauthorized: true,
  };

  const req = https.request(options, res => {
   const cert = res.socket.getPeerCertificate();
   const valid = res.socket.authorized;

   resolve({
    valid,
    subject: cert.subject,
    issuer: cert.issuer,
    validFrom: cert.valid_from,
    validTo: cert.valid_to,
    fingerprint: cert.fingerprint,
   });
  });

  req.on("error", err => {
   reject(err);
  });

  req.end();
 });
}

async function validateSSL(domain) {
 try {
  console.log(`🔍 Checking SSL certificate for ${domain}...`);
  const result = await checkSSL(domain);

  if (result.valid) {
   console.log("✅ SSL certificate is valid");
   console.log(`   Subject: ${result.subject.CN}`);
   console.log(`   Issuer: ${result.issuer.O}`);
   console.log(`   Valid from: ${result.validFrom}`);
   console.log(`   Valid to: ${result.validTo}`);
  } else {
   console.log("❌ SSL certificate is invalid");
  }

  return result.valid;
 } catch (error) {
  console.error(`❌ SSL check failed: ${error.message}`);
  return false;
 }
}

// Check if domain is provided
const domain = process.argv[2];
if (!domain) {
 console.log("Usage: node ssl-check.js <domain>");
 console.log("Example: node ssl-check.js example.com");
 process.exit(1);
}

validateSSL(domain);
