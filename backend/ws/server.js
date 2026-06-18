import { WebSocketServer } from "ws";

// Determine the port from environment variable or default to 3001
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Initialize the WebSocket Server
const wss = new WebSocketServer({ port: PORT });

// Helper to log with formatted timestamp and levels
function log(msg, level = "info") {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  const prefix = `[${ts}] [WS Server]`;
  if (level === "warn") {
    console.warn(`${prefix} ⚠️  ${msg}`);
  } else if (level === "error") {
    console.error(`${prefix} ❌  ${msg}`);
  } else {
    console.log(`${prefix} 🟢  ${msg}`);
  }
}

function getStats() {
  return `(Clients: ${wss.clients.size} | Queue: ${waitingQueue.length} | Sessions: ${Object.keys(activeSessions).length})`;
}

log(`Starting WebSocket server on port ${PORT}...`);

let waitingQueue = [];
let activeSessions = {}; // sessionId -> { users: [u1, u2], sockets: { u1: ws, u2: ws }, messages: [] }

function removeUser(userId) {
  waitingQueue = waitingQueue.filter((u) => u.userId !== userId);
  
  // Clean up existing sessions
  for (const sessionId in activeSessions) {
    const session = activeSessions[sessionId];
    if (session.users.includes(userId)) {
      delete session.sockets[userId];
      // Notify partner
      const partnerId = session.users.find((id) => id !== userId);
      if (partnerId && session.sockets[partnerId]) {
        session.sockets[partnerId].send(
          JSON.stringify({
            type: "partner-disconnected",
            payload: { partnerId: userId },
          })
        );
      }
      if (Object.keys(session.sockets).length === 0) {
        delete activeSessions[sessionId];
      }
    }
  }
}

wss.on("listening", () => {
  log(`WebSocket server is listening on port ${PORT}`);
});

wss.on("connection", (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // 1. Origin Verification (Security Standard to prevent Cross-Site WebSocket Hijacking - CSWSH)
  if (process.env.NODE_ENV === "production") {
    const allowedOrigins = ["https://moots.in", "https://ws.moots.in"];
    if (!origin || !allowedOrigins.includes(origin)) {
      log(`Connection rejected. Unauthorized origin: ${origin} (IP: ${clientIp})`, "warn");
      ws.close(1008, "Unauthorized Origin");
      return;
    }
  }

  log(`Client connected: IP: ${clientIp} | Origin: ${origin || "None"} | Stats: ${getStats()}`);

  // Heartbeat setup
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage);
      const { type, payload } = data;
      
      switch (type) {
        case "join-queue": {
          const { userId, interests, lang, country } = payload;
          ws.userId = userId; // Bind userId to ws
          log(`User ${userId} joining queue. Lang: ${lang}, Region: ${country}, Interests: ${interests} | Stats: ${getStats()}`);
          
          removeUser(userId);

          // Try to match
          let bestCandidate = null;
          let bestScore = -1;

          for (const peer of waitingQueue) {
            if (peer.userId === userId) continue;
            if (peer.lang !== lang) continue;

            let score = 0;
            if (country !== "global" && peer.country !== "global") {
              if (country === peer.country) {
                score += 10;
              } else {
                continue;
              }
            } else {
              score += 5;
            }

            const sharedInterests = interests.filter((i) => peer.interests.includes(i));
            if (interests.length > 0 || peer.interests.length > 0) {
              if (sharedInterests.length > 0) {
                score += sharedInterests.length * 20;
              }
            } else {
              score += 10;
            }

            if (score > bestScore) {
              bestScore = score;
              bestCandidate = peer;
            }
          }

          if (bestCandidate) {
            waitingQueue = waitingQueue.filter((u) => u.userId !== bestCandidate.userId);
            const sessionId = `session-${Math.random().toString(36).slice(2, 11)}`;

            activeSessions[sessionId] = {
              users: [userId, bestCandidate.userId],
              sockets: {
                [userId]: ws,
                [bestCandidate.userId]: bestCandidate.ws,
              },
              messages: [],
            };

            ws.send(JSON.stringify({ type: "match-found", payload: { sessionId, peerId: bestCandidate.userId } }));
            bestCandidate.ws.send(JSON.stringify({ type: "match-found", payload: { sessionId, peerId: userId } }));
            log(`Match found: Session ${sessionId} between ${userId} and ${bestCandidate.userId} | Stats: ${getStats()}`);
          } else {
            waitingQueue.push({ userId, ws, interests, lang, country });
            ws.send(JSON.stringify({ type: "waiting", payload: {} }));
          }
          break;
        }

        case "cancel-queue": {
          const { userId } = payload;
          log(`User ${userId} cancelled matching | Stats: ${getStats()}`);
          removeUser(userId);
          break;
        }

        case "join-chat": {
          const { userId, sessionId } = payload;
          ws.userId = userId; // Bind userId to ws
          log(`User ${userId} joining chat session ${sessionId} | Stats: ${getStats()}`);

          if (!activeSessions[sessionId]) {
            activeSessions[sessionId] = {
              users: [userId],
              sockets: { [userId]: ws },
              messages: [],
            };
          } else {
            if (!activeSessions[sessionId].users.includes(userId)) {
              activeSessions[sessionId].users.push(userId);
            }
            activeSessions[sessionId].sockets[userId] = ws;
          }

          const session = activeSessions[sessionId];
          ws.send(
            JSON.stringify({
              type: "chat-history",
              payload: {
                messages: session.messages,
                partnerJoined: session.users.length > 1,
              },
            })
          );

          const partnerId = session.users.find((id) => id !== userId);
          if (partnerId && session.sockets[partnerId]) {
            session.sockets[partnerId].send(
              JSON.stringify({
                type: "partner-joined",
                payload: { partnerId: userId },
              })
            );
          }
          break;
        }

        case "read-messages": {
          const { userId, sessionId } = payload;
          const session = activeSessions[sessionId];
          if (!session) return;

          let updated = false;
          session.messages.forEach((m) => {
            if (m.senderId !== userId && !m.seen) {
              m.seen = true;
              updated = true;
            }
          });

          if (updated) {
            const partnerId = session.users.find((id) => id !== userId);
            if (partnerId && session.sockets[partnerId]) {
              session.sockets[partnerId].send(
                JSON.stringify({
                  type: "partner-seen-messages",
                  payload: {},
                })
              );
            }
          }
          break;
        }

        case "send-message": {
          const { userId, sessionId, content, replyTo } = payload;
          const session = activeSessions[sessionId];
          if (!session) return;

          const msg = {
            id: Date.now().toString(),
            senderId: userId,
            content,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            reactions: {}, // Map of emoji -> userIds[]
            seen: false, // Default to false; must be marked read by recipient focus
            replyTo: replyTo ? {
              id: replyTo.id,
              senderId: replyTo.senderId,
              content: replyTo.content
            } : undefined
          };

          session.messages.push(msg);

          // Broadcast to both session users
          session.users.forEach((uid) => {
            if (session.sockets[uid]) {
              session.sockets[uid].send(JSON.stringify({ type: "message", payload: msg }));
            }
          });
          break;
        }

        case "edit-message": {
          const { userId, sessionId, messageId, newContent } = payload;
          const session = activeSessions[sessionId];
          if (!session) return;

          const msg = session.messages.find((m) => m.id === messageId);
          if (msg && msg.senderId === userId) {
            msg.content = newContent;
            msg.edited = true;

            // Broadcast edit update to both users
            session.users.forEach((uid) => {
              if (session.sockets[uid]) {
                session.sockets[uid].send(
                  JSON.stringify({
                    type: "message-edited",
                    payload: { messageId, content: newContent, edited: true },
                  })
                );
              }
            });
          }
          break;
        }

        case "send-reaction": {
          const { userId, sessionId, messageId, emoji } = payload;
          const session = activeSessions[sessionId];
          if (!session) return;

          const msg = session.messages.find((m) => m.id === messageId);
          if (msg) {
            msg.reactions = msg.reactions || {};
            
            // Remove user from any other emoji reactions on this message
            for (const key in msg.reactions) {
              if (key !== emoji) {
                msg.reactions[key] = msg.reactions[key].filter((id) => id !== userId);
                if (msg.reactions[key].length === 0) {
                  delete msg.reactions[key];
                }
              }
            }

            // Toggle user on the selected emoji
            const list = msg.reactions[emoji] || [];
            const exists = list.includes(userId);
            
            msg.reactions[emoji] = exists ? list.filter((id) => id !== userId) : [...list, userId];

            if (msg.reactions[emoji].length === 0) {
              delete msg.reactions[emoji];
            }

            // Broadcast reaction update
            session.users.forEach((uid) => {
              if (session.sockets[uid]) {
                session.sockets[uid].send(
                  JSON.stringify({
                    type: "reaction-update",
                    payload: { messageId, reactions: msg.reactions },
                  })
                );
              }
            });
          }
          break;
        }

        case "typing-status": {
          const { userId, sessionId, isTyping } = payload;
          const session = activeSessions[sessionId];
          if (!session) return;

          const partnerId = session.users.find((id) => id !== userId);
          if (partnerId && session.sockets[partnerId]) {
            session.sockets[partnerId].send(
              JSON.stringify({
                type: "partner-typing",
                payload: { isTyping },
              })
            );
          }
          break;
        }

        default:
          log(`Unknown action type: ${type}`, "warn");
      }
    } catch (e) {
      log(`Error parsing incoming websocket message: ${e.message}`, "error");
    }
  });

  ws.on("close", () => {
    const userStr = ws.userId ? `User: ${ws.userId}` : "Unidentified User";
    log(`Client disconnected: ${userStr} | IP: ${clientIp} | Stats: ${getStats()}`);
    
    // Scan all queues/sessions to remove this socket connection
    waitingQueue = waitingQueue.filter((u) => u.ws !== ws);

    for (const sessionId in activeSessions) {
      const session = activeSessions[sessionId];
      for (const userId in session.sockets) {
        if (session.sockets[userId] === ws) {
          delete session.sockets[userId];
          // Notify partner
          const partnerId = session.users.find((id) => id !== userId);
          if (partnerId && session.sockets[partnerId]) {
            session.sockets[partnerId].send(
              JSON.stringify({
                type: "partner-disconnected",
                payload: { partnerId: userId },
              })
            );
          }
        }
      }
      if (Object.keys(session.sockets).length === 0) {
        delete activeSessions[sessionId];
      }
    }
  });

  ws.on("error", (error) => {
    log(`Client connection error from ${clientIp}: ${error.message}`, "error");
  });
});

// Setup interval to ping clients and keep connections alive (every 30 seconds)
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      log(`Terminating inactive connection`, "warn");
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => {
  clearInterval(interval);
});

wss.on("error", (error) => {
  log(`Server error occurred: ${error.message}`, "error");
});

// Graceful shutdown on process termination signals (SIGTERM, SIGINT)
const shutdown = (signal) => {
  log(`Received ${signal}. Closing server gracefully...`, "warn");
  
  // Close all active connections
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.close(1001, "Server is shutting down");
    }
  });

  wss.close(() => {
    log('Server closed. Exiting process.', "warn");
    process.exit(0);
  });

  // Force exit after 5 seconds if connection cleanup takes too long
  setTimeout(() => {
    log('Force exiting after timeout.', "error");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
