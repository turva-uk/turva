# Caddy Reverse Proxy

Caddy serves as Turva's edge router, handling all incoming HTTP requests and routing them to the appropriate backend service. This document describes why and how Caddy is used, but alternative reverse proxies (NGINX, Traefik, HAProxy) can fulfill the same role.

## Purpose

The reverse proxy is the single entry point for all HTTP traffic, routing requests to:

- **Frontend SPA** (React application)
- **Backend API** (FastAPI server)

## Why Caddy?

Caddy was chosen for:

1. **Automatic HTTPS**: Obtains and renews TLS certificates automatically
2. **Simple Configuration**: Caddyfile syntax is intuitive
3. **Modern Protocol Support**: HTTP/2 and HTTP/3 by default
4. **Zero-downtime reloads**: Graceful configuration updates

Other reverse proxies can provide similar functionality with different trade-offs.

## Routing Strategy

```text
http://localhost → Caddy
                     ↓
                     ├─→ /api/* → backend:8000
                     └─→ /*     → frontend:5173
```

Path-based routing ensures clean separation:

- **`/api/*`**: All API endpoints prefixed with `/api`
- **`/*`**: Catch-all for frontend (React Router handles client-side routing)

## Development vs Production

### Development

- Direct proxy to development servers (Vite, FastAPI)
- Hot reload and WebSocket support
- HTTP (not HTTPS) for simplicity
- Verbose logging for debugging

### Production

- Serve static build artifacts
- Automatic HTTPS with certificate management
- Compression (gzip/brotli)
- Security headers
- Request/response caching

## Key Responsibilities

### TLS Termination

Handle HTTPS encryption at the edge:

- Automatic certificate acquisition (Let's Encrypt)
- Certificate renewal before expiration
- Redirect HTTP → HTTPS

### Load Balancing

Distribute traffic across multiple backend instances:

- Round-robin, least connections, IP hash, etc.
- Health checks and automatic failover
- Circuit breaking on failures

### Security Headers

Add security headers to responses:

- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`

### CORS Management

While the backend typically handles CORS, the reverse proxy can:

- Add default CORS headers
- Enforce additional security policies
- Block unauthorized origins

## Performance Features

### Connection Pooling

Maintain persistent connections to upstream services to reduce latency.

### Compression

Automatically compress responses (gzip, brotli, zstd) based on client support.

### HTTP/2 and HTTP/3

Modern protocols enabled by default for better performance.

## Alternatives

If not using Caddy, similar functionality can be achieved with:

- **NGINX**: Industry standard, highly configurable, requires manual TLS setup
- **Traefik**: Auto-discovery, great for containers, more complex configuration
- **HAProxy**: High performance, TCP load balancing, less feature-rich for HTTP
- **Cloud Load Balancers**: AWS ALB, GCP Load Balancer, Azure Application Gateway

The choice depends on deployment environment, team expertise, and specific requirements.

## Configuration Principles

Regardless of reverse proxy choice:

1. **Single entry point**: All traffic flows through one place
2. **Path-based routing**: Clear URL structure
3. **TLS everywhere**: Encrypt in production
4. **Health checks**: Monitor upstream services
5. **Logging**: Track requests for debugging and audit

## Related Documentation

- [Architecture Overview](index.md)
- [Frontend Architecture](frontend.md)
- [Backend Architecture](backend.md)
