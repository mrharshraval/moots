# Moots Frontend (Next.js)

This is the Next.js client-side application for Moots, hosted on `moots.in`. It connects to the standalone WebSocket server running on `ws.moots.in` to support real-time user matchmaking and chat messaging.

---

## 1. Environment Configuration

The application dynamically resolves the WebSocket connection string using Next.js environment variables. You must specify the `NEXT_PUBLIC_WS_URL` variable. Next.js automatically bundles variables prefixed with `NEXT_PUBLIC_` to the client-side code.

Create a `.env` (or `.env.local`) file in this folder:

```env
# For Local Development (resolves to the local server port)
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# For Production Deployment
NEXT_PUBLIC_WS_URL=wss://ws.moots.in
```

If the environment variable is not defined, the client falls back to `ws://localhost:3001` automatically.

---

## 2. WebSocket Connection Hook (`useWebSocket`)

To maintain connection reliability, do **not** use the raw browser `new WebSocket()` API directly inside your pages. Instead, use the custom `useWebSocket` hook provided in [@/hooks/use-websocket](src/hooks/use-websocket.ts).

### Benefits of the Custom Hook:
- **Auto-reconnection**: Automatically reconnects if the network drops or the server restarts.
- **Exponential Backoff**: Spaces out reconnection retries (`3s`, `6s`, `12s`, etc.) to prevent DDoS-like behavior on the server.
- **Auto-cleanup**: Cleans up timers, handlers, and closes the socket cleanly on page transitions and component unmounts to prevent memory leaks.

### API Signature:
```typescript
import { useWebSocket } from "@/hooks/use-websocket";

const { socket, status, sendMessage, connect, disconnect } = useWebSocket(url, {
  enabled: true,            // Toggle to open/close connection dynamically
  shouldReconnect: true,    // Enable automatic reconnection on disconnection
  reconnectAttempts: 5,     // Number of connection retries
  reconnectInterval: 3000,  // Base interval in milliseconds
  onOpen: (event) => {},    // Fired on successful connection
  onClose: (event) => {},   // Fired on connection close
  onMessage: (event) => {}, // Fired when a message is received
  onError: (event) => {},   // Fired on connection error
});
```

---

## 3. Integration Examples

### Example A: Matchmaking Queue (`waiting/page.tsx`)
Connect to the server to join the waiting queue and wait for the `match-found` event:

```tsx
import { useWebSocket } from "@/hooks/use-websocket";

export default function QueueComponent({ userId }) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

  useWebSocket(userId ? wsUrl : null, {
    shouldReconnect: true,
    reconnectAttempts: 3,
    onOpen: (event) => {
      const ws = event.target as WebSocket;
      ws.send(
        JSON.stringify({
          type: "join-queue",
          payload: {
            userId,
            interests: ["gaming", "music"],
            lang: "en",
            country: "global",
          },
        })
      );
    },
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "match-found" && data.payload.sessionId) {
        // Redirect client to their new private chat room
        router.push(`/chat/${data.payload.sessionId}`);
      }
    },
  });

  return <div>Searching for a partner...</div>;
}
```

### Example B: Chat Message Feed (`chat/[sessionId]/page.tsx`)
Inside an active chat session room, use the hook to handle real-time messaging, typing indicators, and partner events:

```tsx
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

const { sendMessage } = useWebSocket(wsUrl, {
  onOpen: () => {
    sendMessage(
      JSON.stringify({
        type: "join-chat",
        payload: { userId, sessionId },
      })
    );
  },
  onMessage: (event) => {
    const { type, payload } = JSON.parse(event.data);
    switch (type) {
      case "chat-history":
        setMessages(payload.messages);
        break;
      case "message":
        setMessages((prev) => [...prev, payload]);
        break;
      case "partner-typing":
        setIsPartnerTyping(payload.isTyping);
        break;
      case "partner-disconnected":
        handlePartnerDisconnected();
        break;
    }
  },
});
```

---

## 4. UI Component Library (shadcn/ui)

This app uses standard `shadcn/ui` components. To add new UI components, run:

```bash
npx shadcn@latest add <component-name>
```

Import them into your code:
```tsx
import { Button } from "@/components/ui/button";
```
