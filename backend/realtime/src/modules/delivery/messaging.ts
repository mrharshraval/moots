import { registry } from "../registry/registry.js";
import { structuredLog } from "../../lib/logger.js";
import { wsMessagesTotal } from "../../lib/metrics.js";
import { validateInboundMessage } from "./message.validator.js";
import { handleParsedMessage } from "./message.handler.js";

export class MessagingService {
  async handleMessage(connectionId: string, rawMessage: string) {
    const conn = registry.get(connectionId);
    if (!conn) {
      console.error(`Received message for unregistered connection: ${connectionId}`);
      return;
    }

    if (!conn.rateLimiter.allow()) {
      structuredLog("RATE_LIMIT_EXCEEDED", connectionId, { details: "Client sent messages too fast" }, "warn", conn);
      conn.ws.send(JSON.stringify({ 
        type: "error", 
        payload: { success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded. Please wait a moment.", details: [] } } 
      }));
      return;
    }

    const validation = validateInboundMessage(connectionId, rawMessage, conn);
    if (!validation.success) {
      conn.ws.send(JSON.stringify({ 
        type: "error", 
        payload: { success: false, error: { code: "VALIDATION_ERROR", message: validation.error, details: [] } } 
      }));
      return;
    }

    const parsedMessage = validation.data as { type: string, payload: any };
    const { type, payload } = parsedMessage;
    const actorId = conn.actorId;
    const sessionId = ("sessionId" in payload && payload.sessionId) ? payload.sessionId : "N/A";

    structuredLog(type, connectionId, { requestId: validation.requestId, actorId, sessionId }, "info", conn);
    wsMessagesTotal.inc({ type, direction: "inbound" });

    if (type !== "authenticate" && !actorId) {
      conn.ws.send(JSON.stringify({ 
        type: "error", 
        payload: { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized. Please authenticate first.", details: [] } } 
      }));
      return;
    }

    await handleParsedMessage(connectionId, type, payload, conn, validation.requestId!);
  }
}

export const messagingService = new MessagingService();
