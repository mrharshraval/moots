import { z } from "zod"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export type ChatEventType = 
  | "chat-history"
  | "message"
  | "reaction-update"
  | "partner-seen-messages"
  | "message-edited"
  | "partner-joined"
  | "partner-disconnected"
  | "partner-reconnecting"
  | "partner-reconnected";

export type ChatEventCallback<T = any> = (payload: T) => void;

const MessageSchema = z.object({
  id: z.string(),
  clientMessageId: z.string().optional(),
  status: z.string().optional(),
  senderActorId: z.string().optional(),
  sender: z.unknown().optional(),
  content: z.string(),
  time: z.string().optional(),
  sentAt: z.string().optional(),
  seen: z.boolean().optional(),
  edited: z.boolean().optional(),
  reactions: z.record(z.string(), z.array(z.string())).optional(),
  reply: z.unknown().optional()
})

const ChatHistoryPayloadSchema = z.object({
  partnerId: z.string().optional(),
  partnerNickname: z.string().optional(),
  partnerUsername: z.string().nullable().optional(),
  selfId: z.string().optional(),
  messages: z.array(MessageSchema),
})

const ReactionUpdatePayloadSchema = z.object({
  messageId: z.string(),
  reactions: z.record(z.string(), z.array(z.string())),
})

const MessageEditedPayloadSchema = z.object({
  messageId: z.string(),
  content: z.string(),
  edited: z.boolean(),
})

const PartnerJoinedPayloadSchema = z.object({
  partnerNickname: z.string().optional(),
  partnerUsername: z.string().nullable().optional(),
  partnerId: z.string().optional(),
})

export class ChatRealtimeService {
  private static instance: ChatRealtimeService;
  private listeners: Map<ChatEventType, Set<ChatEventCallback>> = new Map();

  private constructor() {
    this.bindEvents();
  }

  public on<T>(event: ChatEventType, callback: ChatEventCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as ChatEventCallback);
  }

  public off<T>(event: ChatEventType, callback: ChatEventCallback<T>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback as ChatEventCallback);
    }
  }

  private emit(event: ChatEventType, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(payload);
        } catch (e) {
          console.error(`Error in ChatRealtimeService listener for ${event}:`, e);
        }
      });
    }
  }

  public static getInstance(): ChatRealtimeService {
    if (!ChatRealtimeService.instance) {
      ChatRealtimeService.instance = new ChatRealtimeService();
    }
    return ChatRealtimeService.instance;
  }





  private bindEvents() {
    wsGateway.on("chat-history", this.handleChatHistory.bind(this))
    wsGateway.on("message", this.handleMessage.bind(this))
    wsGateway.on("reaction-update", this.handleReactionUpdate.bind(this))
    wsGateway.on("partner-seen-messages", this.handlePartnerSeenMessages.bind(this))
    wsGateway.on("message-edited", this.handleMessageEdited.bind(this))
    wsGateway.on("partner-joined", this.handlePartnerJoined.bind(this))
    wsGateway.on("partner-disconnected", this.handlePartnerDisconnected.bind(this))
    wsGateway.on("partner-reconnecting", this.handlePartnerReconnecting.bind(this))
    wsGateway.on("partner-reconnected", this.handlePartnerReconnected.bind(this))
  }

  private handleChatHistory(rawPayload: unknown) {
    try {
      const payload = ChatHistoryPayloadSchema.parse(rawPayload);
      if (payload.selfId) {
        sessionStorage.setItem("moots_userId", payload.selfId);
      }
      this.emit("chat-history", payload);
    } catch (e) {
      console.error("Zod Validation Error in chat-history", e);
    }
  }

  private handleMessage(rawPayload: unknown) {
    try {
      const payload = MessageSchema.parse(rawPayload);
      this.emit("message", payload);
      // We do not assume sender === "stranger" here for read receipts,
      // as mapping the payload to local Message format happens in the store.
      // But we can check senderActorId if needed, or let the store do it.
    } catch (e) {
      console.error("Zod Validation Error in message", e);
    }
  }

  private handleReactionUpdate(rawPayload: unknown) {
    try {
      const payload = ReactionUpdatePayloadSchema.parse(rawPayload);
      this.emit("reaction-update", payload);
    } catch (e) {
      console.error("Zod Validation Error in reaction-update", e);
    }
  }

  private handlePartnerSeenMessages() {
    this.emit("partner-seen-messages");
  }

  private handleMessageEdited(rawPayload: unknown) {
    try {
      const payload = MessageEditedPayloadSchema.parse(rawPayload);
      this.emit("message-edited", payload);
    } catch (e) {
      console.error("Zod Validation Error in message-edited", e);
    }
  }

  private handlePartnerJoined(rawPayload: unknown) {
    try {
      const payload = PartnerJoinedPayloadSchema.parse(rawPayload);
      this.emit("partner-joined", payload);
    } catch (e) {
      console.error("Zod Validation Error in partner-joined", e);
    }
  }

  private handlePartnerDisconnected() {
    wsGateway.disconnect();
    this.emit("partner-disconnected");
  }

  private handlePartnerReconnecting() {
    this.emit("partner-reconnecting");
  }

  private handlePartnerReconnected() {
    this.emit("partner-reconnected");
  }
}

export const chatRealtimeService = ChatRealtimeService.getInstance();
