# Moots WebSocket Server

A standalone, lightweight WebSocket server built with the `ws` library in Node.js. It manages live matching queues, user chat sessions, messaging, typing status notifications, message updates, and reactions for `moots.in`.

This server is designed for deployment on `ws.moots.in`.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or another package manager

### Installation
From the root of the project or directly in this folder:
```bash
cd backend/ws
npm install
```

### Running Locally
To start the WebSocket server in production mode:
```bash
npm start
```

To start the WebSocket server in development mode (with auto-reload on changes):
```bash
npm run dev
```

---

## Production Deployment on `ws.moots.in`

To host this WebSocket server as a standalone service on `ws.moots.in` pointing to your backend server, follow these steps:

### 1. Process Management with PM2
To keep the WebSocket server running continuously in the background and automatically restart on failure or reboot, use **PM2**:

```bash
# Install PM2 globally
npm install -g pm2

# Start the server with a customized name and environment variables
PORT=3001 pm2 start server.js --name "moots-ws"

# Ensure PM2 restarts on system reboot
pm2 startup
pm2 save
```

### 2. Nginx Reverse Proxy Configuration
Place the WebSocket server behind Nginx to handle SSL/TLS termination, map port `80`/`443` to the local port (e.g., `3001`), and enable connection upgrading.

Create or update your Nginx configuration block (e.g. `/etc/nginx/sites-available/ws.moots.in`):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ws.moots.in;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ws.moots.in;

    # SSL Certificates (managed by Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/ws.moots.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ws.moots.in/privkey.pem;

    # WebSocket Proxy Settings
    location / {
        proxy_pass http://127.0.0.1:3001;
        
        # Core headers needed to upgrade HTTP to WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts (prevent connection drop by Nginx)
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ws.moots.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Frontend Integration

To connect the frontend hosted on `moots.in` to `ws.moots.in`, configure your environment variables:

### Next.js / React Environment Variable Setup

In the frontend repository, add/modify your `.env` or `.env.production`:

```env
# For Local Development
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# For Production
NEXT_PUBLIC_WS_URL=wss://ws.moots.in
```

### React / React Hooks Connection Example

```tsx
import React, { useEffect, useState, useRef } from 'react';

// Automatically resolves to production URL or local development fallback
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export function useChatWebSocket(userId: string) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WEBSOCKET_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Moots WebSocket');
      // Example: Join matching queue on open
      ws.send(JSON.stringify({
        type: 'join-queue',
        payload: {
          userId,
          interests: ['coding', 'music'],
          lang: 'en',
          country: 'global'
        }
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received action:', data.type, data.payload);
      // Handle different types: 'match-found', 'message', 'partner-typing', etc.
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  const sendAction = (type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return { sendAction };
}
```
