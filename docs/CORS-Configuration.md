# CORS Configuration Documentation

## Overview

Cross-Origin Resource Sharing (CORS) has been configured to secure your dealership management system against unauthorized cross-origin requests while maintaining necessary API access.

## Features Implemented

### 1. Origin Validation

- **Development Mode**: Automatically allows all `localhost` and `127.0.0.1` origins with any port
- **Production Mode**: Strict origin validation with predefined allowed domains
- **Custom Domains**: Support for additional domains via `ALLOWED_ORIGINS` environment variable

### 2. Supported Origins

- `http://localhost:3000` and `http://localhost:5000` (development)
- `http://127.0.0.1:3000` and `http://127.0.0.1:5000` (development)
- `https://*.replit.app` (Replit production domains)
- `https://*.repl.co` (Replit legacy domains)
- `https://*.replit.dev` (Replit development domains)
- Custom domains from environment variables

### 3. Security Headers

- **Access-Control-Allow-Credentials**: `true` (enables cookies and auth headers)
- **Access-Control-Allow-Methods**: `GET, POST, PUT, DELETE, OPTIONS, PATCH`
- **Access-Control-Allow-Headers**: Comprehensive list including authentication headers
- **Access-Control-Max-Age**: `86400` (24-hour preflight cache)

### 4. Preflight Request Handling

- Proper OPTIONS request handling for complex requests
- Cached preflight responses for improved performance
- Legacy browser support with `optionsSuccessStatus: 200`

## Environment Variables

### ALLOWED_ORIGINS

Add custom domains to your environment:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

## Testing CORS

### Test Allowed Origin

```bash
curl -I -H "Origin: http://localhost:3000" http://localhost:5000/api/auth/user
```

**Expected**: `Access-Control-Allow-Origin: http://localhost:3000`

### Test Blocked Origin

```bash
curl -I -H "Origin: http://malicious-site.com" http://localhost:5000/api/auth/user
```

**Expected**: `500 Internal Server Error` with CORS blocking message

### Test Preflight Request

```bash
curl -I -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:5000/api/auth/login
```

**Expected**: `200 OK` with CORS headers

## Security Benefits

1. **Cross-Origin Attack Prevention**: Blocks unauthorized domains from accessing your API
2. **Credential Security**: Properly handles authentication cookies and headers
3. **Flexible Configuration**: Easy to add new domains without code changes
4. **Development Friendly**: Automatically allows localhost in development
5. **Production Ready**: Strict validation in production environments

## Monitoring

The system logs blocked CORS requests with:

```
CORS: Blocked request from origin: http://malicious-site.com
```

This helps identify potential security threats and debugging issues.

## Best Practices

1. **Keep Origins Minimal**: Only add necessary domains to `ALLOWED_ORIGINS`
2. **Use HTTPS**: Always use HTTPS for production domains
3. **Regular Review**: Periodically review and update allowed origins
4. **Monitor Logs**: Watch for unexpected CORS blocking messages
5. **Test Thoroughly**: Test CORS configuration with actual frontend applications

## Troubleshooting

### Common Issues

1. **CORS Error in Browser**: Check if your domain is in allowed origins
2. **Preflight Failures**: Ensure your request includes proper headers
3. **Credential Issues**: Verify `credentials: true` in your fetch requests
4. **Development Issues**: Check that localhost is working in development mode

### Debug Steps

1. Check browser developer console for CORS errors
2. Review server logs for CORS blocking messages
3. Test with curl commands to verify server configuration
4. Verify environment variables are loaded correctly
