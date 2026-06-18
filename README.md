# Moots System & WebSocket Architecture Documentation

This repository houses the code for **Moots**, a real-time matching and random chat application. The system is split into two primary segments:
1. **Frontend**: Next.js client application hosted on `moots.in`.
2. **Backend**: Standalone WebSocket server hosted on `ws.moots.in` using the `ws` package.

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

The WebSocket server coordinates the real-time matching queue, monitors client heartbeats, and routes chat session events (typing status, messaging, edits, and reactions) directly between paired users without database bottleneck constraints.

---

## 2. Local Development Mode

To run the application locally on your developer machine:

### A. Run the WebSocket Server (`backend/ws`)
1. Navigate to the server folder:
   ```bash
   cd backend/ws
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

## 3. Production Deployment Mode

In production, the frontend is served at `moots.in`, and the WebSocket service runs on a dedicated domain at `ws.moots.in` behind an SSL/TLS-terminated Nginx proxy.

### A. WebSocket Server Daemon (PM2 Setup)
PM2 is used to run the node server continuously in the background, restarting it automatically if it crashes or the VM reboots.

```bash
cd backend/ws
npm install -g pm2

# Start the server daemon with environment setup
NODE_ENV=production PORT=3001 pm2 start server.js --name "moots-ws-server"

# Persist server state on boot
pm2 startup
pm2 save
```

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

## 4. WebSocket Protocol Schemas & Events

Clients and servers communicate by passing stringified JSON events using a `{ type: string, payload: object }` structure.

### Client-to-Server Actions

#### `join-queue`
Enters the matchmaking queue with preferences.
```json
{
  "type": "join-queue",
  "payload": {
    "userId": "user-abcdefg",
    "interests": ["gaming", "music"],
    "lang": "en",
    "country": "global"
  }
}
```

#### `send-message`
Sends a message inside an active chat session.
```json
{
  "type": "send-message",
  "payload": {
    "userId": "user-abcdefg",
    "sessionId": "session-12345",
    "content": "Hello stranger!"
  }
}
```

#### `typing-status`
Notifies the partner of typing status.
```json
{
  "type": "typing-status",
  "payload": {
    "userId": "user-abcdefg",
    "sessionId": "session-12345",
    "isTyping": true
  }
}
```

### Server-to-Client Responses

#### `match-found`
Broadcasted to both users when matched.
```json
{
  "type": "match-found",
  "payload": {
    "sessionId": "session-12345",
    "peerId": "user-98765"
  }
}
```

#### `partner-disconnected`
Sent to the remaining partner when a peer closes their connection.
```json
{
  "type": "partner-disconnected",
  "payload": {
    "partnerId": "user-98765"
  }
}
```

---

## 5. Security & Connection Best Practices

### Backend Standards (Implemented)
1. **Cross-Site WebSocket Hijacking (CSWSH) Mitigation**: In production, the server validates the incoming HTTP `Origin` header. If the origin is not explicitly `https://moots.in` or `https://ws.moots.in`, the request is denied with a `1008` policy exception code.
2. **Heartbeat Pings**: The server triggers a `ping` request to all active connections every 30 seconds. If a client fails to reply with a `pong` before the next check, the connection is terminated (`ws.terminate()`) to prune stale connections.
3. **Graceful Terminations**: Listens for termination signals (`SIGINT`, `SIGTERM`) to gracefully exit, sending a `1001` (Going Away) close frame to connected clients and shutting down sockets before terminating the process.

### Frontend Standards (Implemented)
1. **Reconnection Hook**: Clients connect via the [@/hooks/use-websocket](frontend/web/src/hooks/use-websocket.ts) hook. If the connection drops unexpectedly, it tries to reconnect automatically.
2. **Exponential Backoff**: Reconnection attempts are spaced out using an exponential backoff formula (`reconnectInterval * 2^attempts`) to avoid DDOS-ing the backend server.
3. **Resource Cleanup**: Subscribes to window focus events for read-receipt updates and cleans up timers/connections automatically on component unmounts to prevent memory leaks.
