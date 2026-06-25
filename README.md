# Moots System & WebSocket Architecture Documentation

This repository houses the code for **Moots**, a real-time matchmaking and messaging application. The system is split into two primary segments:
1. **Frontend**: Next.js client application hosted on `moots.in`.
2. **Backend**: Standalone production-grade WebSocket server hosted on `ws.moots.in` using the `ws` package.

---

## 1. System Overview

```
   ┌──────────────────────────────────────────────────────────┐
   │                  Frontend (moots.in)                     │
   │           Next.js / React Client Application             │
   └────────────────────────────┬─────────────────────────────┘
                                │ WebSocket Connection
                                │ (wss://ws.moots.in)
                                ▼
   ┌──────────────────────────────────────────────────────────┐
   │             WebSocket Server (ws.moots.in)               │
   │               Standalone Node.js Service                 │
   └──────────────────────────────────────────────────────────┘
```

The WebSocket server coordinates the real-time matching queue, monitors client heartbeats, and routes chat session events (typing status, messaging, edits, and reactions) directly between paired users.

---

## 2. Workspace Layout

### Backend Service (`backend/realtime`)
- **`server.js`**: Server entrypoint managing WebSocket instantiation and connection handshakes.
- **`src/config.js`**: Global configuration values (ports, allowed origins, timeouts).
- **`src/types.js`**: Zod schema definitions validating inbound message payloads.
- **`src/registry.js`**: Connection registry managing connection metadata without direct socket mutations.
- **`src/matchmaking.js`**: Matchmaking service controlling the queue and matching algorithms.
- **`src/session.js`**: Session manager controlling active chat rooms and reconnection timeouts.
- **`src/messaging.js`**: Messaging controller managing message routing and structured JSON logs.

### Frontend Client (`frontend/web`)
- **`src/app/(dashboard)`**: Houses the page layouts and main dashboard routing.
  - `/chat` — Queue configuration and interest selection.
  - `/chat/[sessionId]` — Main chat feed and interactive panel.
  - `/notifications` — High-fidelity notification feed.
  - `/friends` — Friend lists (Online, All, Pending, Blocked) and search filters.
  - `/groups` — Public group discovery and creation dialog.
- **`src/hooks/use-websocket.ts`**: Core React hook managing connection lifecycles, exponential backoffs, and auto-cleanup.

---

## 3. Local Development Mode

To run the application locally on your developer machine:

### A. Run the WebSocket Server (`backend/realtime`)
1. Navigate to the server folder:
   ```bash
   cd backend/realtime
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server in watch/development mode (runs on port `3001` by default):
   ```bash
   npm run dev
   ```

### B. Run the Frontend Client (`frontend/web`)
1. Navigate to the client folder:
   ```bash
   cd frontend/web
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a local environment file `.env.local` to point to the local WebSocket server:
   ```env
   NEXT_PUBLIC_WS_URL=ws://localhost:3001
   ```
4. Start the frontend:
   ```bash
   pnpm run dev
   ```

---

## 4. Production Deployment Mode

In production, the frontend is served at `moots.in`, and the WebSocket service runs on a dedicated domain at `ws.moots.in` behind Render's proxy or an SSL/TLS-terminated Nginx proxy.

### A. Render.com Deployment
The server is fully optimized to run on Render.com:
- Automatically binds to the assigned dynamic port (`process.env.PORT`).
- Utilizes a **20-second heartbeat check** to prevent Render's HTTP proxy from terminating idle connections on its 30-second timeout.
- Implements a **30-second reconnection grace period** to preserve active chat sessions while users transition from the matchmaking queue to their new chat page.

### B. Nginx Reverse Proxy Configuration (`ws.moots.in`)
The WebSocket protocol starts as an HTTP/1.1 request and is "Upgraded" to a TCP connection. Nginx must be configured to pass these hop-by-hop headers.

Example configuration for `/etc/nginx/sites-available/ws.moots.in`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ws.moots.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ws.moots.in;

    # SSL Certificates managed by Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/ws.moots.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ws.moots.in/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;

        # Core WebSocket upgrade headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Remote IP forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Keep connection open (prevents Nginx from dropping idle connections)
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Enable configuration and reload:
```bash
sudo ln -s /etc/nginx/sites-available/ws.moots.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Security & Connection Best Practices

### Backend Standards
1. **Cross-Site WebSocket Hijacking (CSWSH) Mitigation**: In production, the server validates the incoming HTTP `Origin` header. Allowed origins include `https://moots.in`, `https://www.moots.in`, and `https://ws.moots.in`.
2. **Heartbeat Pings**: The server triggers a `ping` request to all active connections every 20 seconds. If a client fails to reply with a `pong` before the next check, the connection is terminated (`ws.terminate()`).
3. **Graceful Terminations**: Listens for termination signals (`SIGINT`, `SIGTERM`) to gracefully exit, sending a `1001` (Going Away) close frame to connected clients and shutting down sockets before terminating the process.

### Frontend Standards
1. **Reconnection Hook**: Clients connect via the [@/hooks/use-websocket](frontend/web/src/hooks/use-websocket.ts) hook. If the connection drops unexpectedly, it tries to reconnect automatically.
2. **Exponential Backoff**: Reconnection attempts are spaced out using an exponential backoff formula (`reconnectInterval * 2^attempts`) to avoid overloading the backend.
3. **Resource Cleanup**: Subscribes to window focus events for read-receipt updates and cleans up timers/connections automatically on component unmounts to prevent memory leaks.
