#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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

function setupSSL() {
  log("🔐 Setting up SSL/HTTPS Configuration...", "blue");
  log("=".repeat(50), "blue");

  // Create SSL directory
  const sslDir = "./ssl";
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
    log("✅ Created SSL directory", "green");
  }

  // Create SSL configuration file
  const sslConfig = `# SSL/HTTPS Configuration Guide

## For Production Deployment

### Option 1: Using Let's Encrypt (Recommended)

1. Install Certbot:
   \`\`\`bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   \`\`\`

2. Generate SSL certificates:
   \`\`\`bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   \`\`\`

3. Set environment variables:
   \`\`\`bash
   export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   export HTTPS_ENABLED=true
   \`\`\`

### Option 2: Using Cloudflare (Easy Setup)

1. Add your domain to Cloudflare
2. Set SSL/TLS encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Set environment variable:
   \`\`\`bash
   export CLOUDFLARE_SSL=true
   \`\`\`

### Option 3: Using Reverse Proxy (Nginx/Apache)

1. Configure Nginx with SSL:
   \`\`\`nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   \`\`\`

### Option 4: Replit Deployments (Automatic)

Replit Deployments automatically handle SSL/TLS:
- Certificates are managed automatically
- HTTPS is enabled by default
- No additional configuration needed

## Security Headers

The application includes comprehensive security headers:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Testing SSL Configuration

1. Test SSL certificate:
   \`\`\`bash
   openssl s_client -connect yourdomain.com:443
   \`\`\`

2. Check security headers:
   \`\`\`bash
   curl -I https://yourdomain.com
   \`\`\`

3. Use online tools:
   - SSL Labs: https://www.ssllabs.com/ssltest/
   - Security Headers: https://securityheaders.com/
`;

  fs.writeFileSync(path.join(sslDir, "setup-guide.md"), sslConfig);
  log("✅ Created SSL setup guide", "green");

  // Create HTTPS server configuration
  const httpsConfig = `// HTTPS Server Configuration
import https from 'https';
import fs from 'fs';
import express from 'express';
import { config } from '../config/environment.js';

export function createHTTPSServer(app) {
  if (process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true') {
    try {
      const privateKey = fs.readFileSync(process.env.SSL_KEY_PATH, 'utf8');
      const certificate = fs.readFileSync(process.env.SSL_CERT_PATH, 'utf8');
      
      const credentials = {
        key: privateKey,
        cert: certificate
      };
      
      const httpsServer = https.createServer(credentials, app);
      
      httpsServer.listen(config.server.port, config.server.host, () => {
        console.log(\`🔐 HTTPS Server running on port \${config.server.port}\`);
      });
      
      return httpsServer;
    } catch (error) {
      console.error('❌ Failed to create HTTPS server:', error.message);
      console.log('⚠️  Falling back to HTTP server');
      return null;
    }
  }
  
  return null;
}

// Force HTTPS redirect middleware
export function forceHTTPS(req, res, next) {
  if (process.env.NODE_ENV === 'production' && 
      process.env.HTTPS_ENABLED === 'true' && 
      req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(\`https://\${req.header('host')}\${req.url}\`);
  }
  next();
}
`;

  fs.writeFileSync(path.join(sslDir, "https-config.js"), httpsConfig);
  log("✅ Created HTTPS configuration", "green");

  // Create SSL check script
  const sslCheckScript = `#!/usr/bin/env node

import https from 'https';
import { URL } from 'url';

function checkSSL(domain) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'GET',
      rejectUnauthorized: true
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      const valid = res.socket.authorized;
      
      resolve({
        valid,
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        fingerprint: cert.fingerprint
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function validateSSL(domain) {
  try {
    console.log(\`🔍 Checking SSL certificate for \${domain}...\`);
    const result = await checkSSL(domain);
    
    if (result.valid) {
      console.log('✅ SSL certificate is valid');
      console.log(\`   Subject: \${result.subject.CN}\`);
      console.log(\`   Issuer: \${result.issuer.O}\`);
      console.log(\`   Valid from: \${result.validFrom}\`);
      console.log(\`   Valid to: \${result.validTo}\`);
    } else {
      console.log('❌ SSL certificate is invalid');
    }
    
    return result.valid;
  } catch (error) {
    console.error(\`❌ SSL check failed: \${error.message}\`);
    return false;
  }
}

// Check if domain is provided
const domain = process.argv[2];
if (!domain) {
  console.log('Usage: node ssl-check.js <domain>');
  console.log('Example: node ssl-check.js example.com');
  process.exit(1);
}

validateSSL(domain);
`;

  fs.writeFileSync(path.join(sslDir, "ssl-check.js"), sslCheckScript);
  log("✅ Created SSL validation script", "green");

  log("\n📋 SSL Setup Complete:", "green");
  log("   - SSL directory created", "reset");
  log("   - Setup guide created (ssl/setup-guide.md)", "reset");
  log("   - HTTPS configuration created (ssl/https-config.js)", "reset");
  log("   - SSL check script created (ssl/ssl-check.js)", "reset");

  log("\n💡 Next Steps:", "yellow");
  log("   1. Read ssl/setup-guide.md for detailed instructions", "reset");
  log(
    "   2. Choose your SSL provider (Let's Encrypt, Cloudflare, etc.)",
    "reset",
  );
  log("   3. Configure your domain and DNS settings", "reset");
  log("   4. Test SSL with: node ssl/ssl-check.js yourdomain.com", "reset");
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSSL();
}

export { setupSSL };
