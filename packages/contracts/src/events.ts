export interface PlatformEvent<T> {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  conversationId?: string;
  actorId?: string;
  payload: T;
}

export type WSInboundEventType =
  | "join-queue"
  | "cancel-queue"
  | "join-chat"
  | "send-message"
  | "edit-message"
  | "send-reaction"
  | "typing-status"
  | "read-messages"
  | "connection:request"
  | "connection:accepted"
  | "connection:removed"
  | "participant:identity-revealed"
  | "participant:identity-hidden";

export type WSOutboundEventType =
  | "match-found"
  | "waiting"
  | "partner-joined"
  | "chat-history"
  | "message"
  | "message-edited"
  | "reaction-update"
  | "partner-typing"
  | "partner-seen-messages"
  | "connection:request"
  | "connection:accepted"
  | "connection:removed"
  | "participant:identity-revealed"
  | "participant:identity-hidden"
  | "partner-disconnected"
  | "error";
