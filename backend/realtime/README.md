# Moots WebSocket Server

A production-grade, highly structured WebSocket server built with the `ws` library and `zod` for schema validation in Node.js. It manages real-time user matchmaking queues, secure chat sessions, typing statuses, reactions, read receipts, and connection heartbeats.

This service is optimized for deployment on Render.com and custom domain configurations (like `ws.moots.in`).

---

## 1. Directory Structure & Architecture

The server adopts a modular, service-based design to decouple connection logic, matchmaking state, active session lifetimes, and message routing.

```
backend/websocket/
├── package.json         # Server dependencies (ws, zod)
├── server.js            # Entrypoint coordinating connection setups & cleanup tasks
└── src/
    ├── config.js        # Global configuration (ports, origins, intervals)
    ├── types.js         # Zod schema definitions for incoming message validation
    ├── registry.js      # Connection registry (tracks connections without mutating ws)
    ├── matchmaking.js   # Matchmaking service (user queue & search algorithms)
    ├── session.js       # Session state service (active rooms & reconnect grace periods)
    └── messaging.js     # Centralized routing, validation, and structured logs
```

### Component Breakdown
1. **Entrypoint (`server.js`)**: Hooks standard `http` / `ws` event listeners to registry services.
2. **Registry (`src/registry.js`)**: Tracks socket lifecycles, maps unique connection IDs (UUID) to socket instances, and manages server-side ping/pong heartbeats.
3. **Matchmaking (`src/matchmaking.js`)**: Manages the user queue and executes the matching algorithm based on language, geographic region, and shared interests.
4. **Session (`src/session.js`)**: Manages chat rooms, stores messages, and administers disconnect timers (grace periods) to preserve sessions during network drops or page transitions.
5. **Messaging (`src/messaging.js`)**: Orchestrates schema validation, handles centralized message routing, and prints structured JSON-like logs containing `[request id]`, `[user id]`, `[session id]`, and `[connection id]`.

---

## 2. API Reference (Message schemas)

All incoming messages must be JSON strings with the structure `{ type: string, payload: object }`. The payload schema is strictly checked using `zod`.

### Matchmaking Events
#### `join-queue`
Adds a user to the matchmaking pool and executes the pairing search.
* **Payload Schema**:
  ```ts
  {
    userId: string;
    interests: string[];
    lang: string;
    country: string;
  }
  ```

#### `cancel-queue`
Removes a user from the matchmaking pool.
* **Payload Schema**:
  ```ts
  {
    userId: string;
  }
  ```

### Chat Events
#### `join-chat`
Connects a client to a matched active chat session.
* **Payload Schema**:
  ```ts
  {
    userId: string;
    sessionId: string;
  }
  ```
* **Server Response**:
  * Emits `chat-history` (containing array of past messages and `partnerJoined` status) to the joining client.
  * Emits `partner-joined` to the other user if they are online.

#### `send-message`
Transmits a text message to all participants in the session.
* **Payload Schema**:
  ```ts
  {
    userId: string;
    sessionId: string;
    content: string;
    replyTo?: {
      id: string;
      senderId: string;
      content: string;
    }
  }
  ```

#### `edit-message`
Edits the text of an existing message. Users can only edit messages they sent.
* **Payload Schema**:
  ```ts
  {
    userId: string;
    sessionId: string;
    messageId: string;
    newContent: string;
  }
  ```

#### `send-reaction`
Toggles an emoji reaction on a message. Emitting the same emoji toggles it off.
* **Payload Schema**:
  ```ts
  {
    userId: string;
    sessionId: string;
    messageId: string;
    emoji: string;
  }
  ```

#### `typing-status`
Broadcasts live typing status to the partner.
* **Payload Schema**:
  ```ts
  {
    userId: string;
    sessionId: string;
    isTyping: boolean;
  }
  ```

#### `read-messages`
Marks all messages sent by the partner in the session as read (`seen: true`).
* **Payload Schema**:
  ```ts
  {
    userId: string;
    sessionId: string;
  }
  ```

---

## 3. Production Deployment & Render Support

### Port Bindings
Render binds web services dynamically using the `PORT` environment variable (typically port `10000`). The server resolves this configuration automatically:
```js
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
```

### Connection Heartbeats
To prevent Render's reverse proxy from dropping idle connections (defaulting on a 30-second timeout), the server executes pings **every 20 seconds**. If a client does not acknowledge the ping in time, the connection is safely terminated and cleaned up.

### Reconnection Grace Period
When the frontend completes matchmaking, it transitions between pages, causing the client to intentionally close the matchmaking socket and open a new chat socket. 
1. The server isolates these connections by type (`"queue"` vs `"chat"`). 
2. When the matchmaking socket closes, it is cleaned up immediately.
3. When the chat socket closes, the server initializes a **30-second grace period timer** for that user.
4. If the client connects and joins the chat session on a new socket within 30 seconds, the timer is cleared and the session continues without interruption or notifying the partner.

---

## 4. Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm, pnpm, or yarn

### Installation
From this directory:
```bash
npm install
```

### Running Locally
To run the server in development mode (with watch/auto-reload):
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```
