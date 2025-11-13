# Security Configuration Documentation

## Overview

Comprehensive security hardening has been implemented including security headers, rate limiting, and monitoring to protect your dealership management system against common web vulnerabilities and attacks.

## Security Headers (Helmet.js)

### Content Security Policy (CSP)

- **Default Source**: `'self'` - Only allow resources from same origin
- **Style Source**: Allows inline styles for Tailwind CSS and Google Fonts
- **Script Source**: Allows `'unsafe-eval'` only in development for Vite HMR
- **Image Source**: Allows data URLs, blobs, and HTTPS images
- **Connect Source**: Allows WebSocket connections for development
- **Object/Frame Source**: Blocked to prevent embedding attacks

### Additional Security Headers

- **HSTS**: 1-year max-age with subdomain inclusion and preload
- **X-Content-Type-Options**: `nosniff` to prevent MIME type sniffing
- **X-Frame-Options**: `SAMEORIGIN` to prevent clickjacking
- **X-XSS-Protection**: Disabled (modern browsers use CSP instead)
- **Referrer Policy**: `strict-origin-when-cross-origin`
- **Cross-Origin Policies**: Same-origin restrictions

## Rate Limiting

### Global Rate Limiting

- **Limit**: 100 requests per 15 minutes (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- **Window**: 15 minutes
- **Response**: 429 status with retry-after header
- **Exclusions**: Health checks and static assets

### Authentication Rate Limiting

- **Endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
- **Limit**: 5 requests per 15 minutes
- **Purpose**: Prevent brute force attacks
- **Logging**: Logs failed attempts with IP and User-Agent

### API Rate Limiting

- **Scope**: All `/api/*` endpoints
- **Limit**: 1000 requests per hour
- **Behavior**: Skips successful requests for better user experience
- **Headers**: Includes rate limit information in response headers

### Speed Limiting (Slow Down)

- **Threshold**: 50 requests per 15 minutes at full speed
- **Delay**: 500ms per request after threshold
- **Max Delay**: 20 seconds maximum
- **Purpose**: Gradual slowdown instead of hard blocking

## Health Check Endpoints

### Basic Health Check (`/health`)

```json
{
 "status": "healthy",
 "timestamp": "2025-07-08T13:43:34.470Z",
 "uptime": 16.603976369,
 "environment": "development",
 "version": "1.0.0"
}
```

### Detailed Health Check (`/api/health`)

```json
{
 "status": "healthy",
 "timestamp": "2025-07-08T13:43:34.470Z",
 "uptime": 16.603976369,
 "environment": "development",
 "version": "1.0.0",
 "database": {
  "status": "connected",
  "responseTime": "686ms"
 },
 "memory": {
  "used": 279,
  "total": 306,
  "unit": "MB"
 }
}
```

## Environment Variables

### Rate Limiting Configuration

```bash
# Maximum requests per 15-minute window
RATE_LIMIT_MAX_REQUESTS=100
```

## Security Testing

### Test Security Headers

```bash
curl -I http://localhost:5000/api/auth/user
```

**Expected Headers:**

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`

### Test Rate Limiting

```bash
# Test auth rate limiting (should block after 5 attempts)
for i in {1..6}; do
  curl -s -w "Status: %{http_code}\n" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}' \
    http://localhost:5000/api/auth/login
  sleep 1
done
```

### Test Health Checks

```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check with database test
curl http://localhost:5000/api/health
```

## Security Benefits

### Protection Against Common Attacks

1. **XSS (Cross-Site Scripting)**: CSP headers prevent script injection
2. **Clickjacking**: X-Frame-Options prevents embedding in iframes
3. **MIME Sniffing**: X-Content-Type-Options prevents content type confusion
4. **Brute Force**: Rate limiting on authentication endpoints
5. **DDoS**: Global rate limiting and speed limiting
6. **MITM**: HSTS enforces HTTPS connections
7. **Data Leakage**: Referrer policy controls information leakage

### Rate Limiting Benefits

1. **Brute Force Protection**: Limits authentication attempts
2. **DDoS Mitigation**: Prevents overwhelming the server
3. **Resource Protection**: Preserves server resources
4. **Fair Usage**: Ensures equitable access for all users
5. **Attack Detection**: Logs suspicious activity

## Monitoring and Logging

### Rate Limit Violations

```
Rate limit exceeded for IP: 127.0.0.1, Path: /, User-Agent: curl/8.11.1
```

### Health Check Monitoring

- Use `/health` for basic uptime monitoring
- Use `/api/health` for detailed system status
- Monitor database response times
- Track memory usage trends

## Production Considerations

### Load Balancer Configuration

- Configure health checks to use `/health` endpoint
- Set appropriate timeout values (recommended: 30 seconds)
- Monitor both endpoints for comprehensive health status

### Security Monitoring

1. **Set up alerts** for repeated rate limit violations
2. **Monitor CSP violations** in browser console
3. **Track authentication failures** from rate limiting logs
4. **Monitor memory usage** from health checks

### Rate Limit Tuning

- Adjust `RATE_LIMIT_MAX_REQUESTS` based on traffic patterns
- Monitor legitimate users hitting limits
- Consider IP whitelisting for trusted sources
- Implement user-based rate limiting for authenticated requests

## Troubleshooting

### Common Issues

1. **CSP Violations**
   - Check browser console for blocked resources
   - Adjust CSP directives if legitimate resources are blocked

2. **Rate Limit Issues**
   - Legitimate users hitting limits: Increase thresholds
   - API clients affected: Implement exponential backoff

3. **Health Check Failures**
   - Database connectivity issues
   - High memory usage warnings
   - Long response times

### Debug Commands

```bash
# Check all security headers
curl -I http://localhost:5000/health | grep -E "(Policy|Security|Frame|Content)"

# Test rate limiting thresholds
curl -w "%{http_code}" http://localhost:5000/api/auth/user

# Monitor health status
watch -n 5 'curl -s http://localhost:5000/api/health | jq .'
```

## Best Practices

1. **Regular Updates**: Keep security middleware updated
2. **Monitoring**: Set up alerting for security violations
3. **Testing**: Regularly test security configurations
4. **Documentation**: Keep security policies documented
5. **Incident Response**: Have procedures for security incidents
