# SSL/HTTPS Configuration Guide

## For Production Deployment

### Option 1: Using Let's Encrypt (Recommended)

1. Install Certbot:

   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. Generate SSL certificates:

   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. Set environment variables:
   ```bash
   export SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   export SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   export HTTPS_ENABLED=true
   ```

### Option 2: Using Cloudflare (Easy Setup)

1. Add your domain to Cloudflare
2. Set SSL/TLS encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Set environment variable:
   ```bash
   export CLOUDFLARE_SSL=true
   ```

### Option 3: Using Reverse Proxy (Nginx/Apache)

1. Configure Nginx with SSL:
   ```nginx
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
   ```

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

   ```bash
   openssl s_client -connect yourdomain.com:443
   ```

2. Check security headers:

   ```bash
   curl -I https://yourdomain.com
   ```

3. Use online tools:
   - SSL Labs: https://www.ssllabs.com/ssltest/
   - Security Headers: https://securityheaders.com/
