import { z } from "zod";

export enum BroadcastRule {
  TO_SELF = "TO_SELF",
  TO_CONVERSATION = "TO_CONVERSATION",
  TO_USER = "TO_USER",
  TO_ALL_USER_DEVICES = "TO_ALL_USER_DEVICES",
}

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

export const ConversationProvisionedEventSchema = z.object({
  conversationId: z.string(),
  actorId1: z.string(),
  actorId2: z.string(),
  policyId: z.string(),
  metadata: z.any().optional(),
});

export const MessagePersistedEventSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderActorId: z.string(),
  sender: z.object({
    type: z.enum(["profile", "persona"]),
    data: z.any(),
  }),
  content: z.string(),
  createdAt: z.string(),
  clientMessageId: z.string().optional(),
  replyToId: z.string().nullable().optional(),
});

export const MessageDeletedEventSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
});

export const MessageEditedEventSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  content: z.string(),
});

export const ReactionUpdatedEventSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  reactions: z.record(z.string(), z.array(z.string())),
});

export const ParticipantReadEventSchema = z.object({
  conversationId: z.string(),
  actorId: z.string(),
});

export const ConnectionRequestedEventSchema = z.object({
  connectionId: z.string(),
  senderActorId: z.string(),
  receiverActorId: z.string(),
});

export const ConnectionAcceptedEventSchema = z.object({
  connectionId: z.string(),
  actorId1: z.string(),
  actorId2: z.string(),
});

export const ConnectionRemovedEventSchema = z.object({
  connectionId: z.string(),
  actorId1: z.string(),
  actorId2: z.string(),
});


export const ConversationHiddenEventSchema = z.object({
  conversationId: z.string(),
  actorId: z.string(),
  hiddenAt: z.string(),
  broadcastRule: z.nativeEnum(BroadcastRule).optional(),
});

export const ConversationEndedEventSchema = z.object({
  conversationId: z.string(),
  endedAt: z.string(),
  endedByActorId: z.string().optional(),
  broadcastRule: z.nativeEnum(BroadcastRule).optional(),
});

export const ParticipantJoinedEventSchema = z.object({
  conversationId: z.string(),
  actorId: z.string(),
  role: z.string(),
});

export const ParticipantLeftEventSchema = z.object({
  conversationId: z.string(),
  actorId: z.string(),
  kickedBy: z.string().optional(),
  broadcastRule: z.nativeEnum(BroadcastRule).optional(),
});

export const ParticipantRoleUpdatedEventSchema = z.object({
  conversationId: z.string(),
  actorId: z.string(),
  role: z.string(),
});

export const CallInitiatedEventSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
  initiatorActorId: z.string(),
  type: z.string(),
  participantIds: z.array(z.string()).optional(),
});

export const CallAcceptedEventSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
  actorId: z.string(),
});

export const CallDeclinedEventSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
  actorId: z.string(),
});

export const CallMissedEventSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
});

export const CallEndedEventSchema = z.object({
  callId: z.string(),
  conversationId: z.string(),
  actorId: z.string().optional(),
});

export const NotificationCreatedEventSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  type: z.string(),
  entityId: z.string().nullable().optional(),
  payload: z.any(),
  createdAt: z.string(),
});

export const ConnectionRejectedEventSchema = z.object({
  connectionId: z.string(),
  actorId1: z.string(),
  actorId2: z.string(),
});

export const ConnectionCancelledEventSchema = z.object({
  connectionId: z.string(),
  actorId1: z.string(),
  actorId2: z.string(),
});

export const DomainEventSchema = z.discriminatedUnion("eventType", [
  z.object({ eventType: z.literal("notification.created"), payload: NotificationCreatedEventSchema }),
  z.object({ eventType: z.literal("conversation.provisioned"), payload: ConversationProvisionedEventSchema }),
  z.object({ eventType: z.literal("message.persisted"), payload: MessagePersistedEventSchema }),
  z.object({ eventType: z.literal("message.deleted"), payload: MessageDeletedEventSchema }),
  z.object({ eventType: z.literal("message.edited"), payload: MessageEditedEventSchema }),
  z.object({ eventType: z.literal("reaction.updated"), payload: ReactionUpdatedEventSchema }),
  z.object({ eventType: z.literal("participant.read"), payload: ParticipantReadEventSchema }),
  z.object({ eventType: z.literal("connection.requested"), payload: ConnectionRequestedEventSchema }),
  z.object({ eventType: z.literal("connection.accepted"), payload: ConnectionAcceptedEventSchema }),
  z.object({ eventType: z.literal("connection.removed"), payload: ConnectionRemovedEventSchema }),
  z.object({ eventType: z.literal("connection.rejected"), payload: ConnectionRejectedEventSchema }),
  z.object({ eventType: z.literal("connection.cancelled"), payload: ConnectionCancelledEventSchema }),
  z.object({ eventType: z.literal("participant.joined"), payload: ParticipantJoinedEventSchema }),
  z.object({ eventType: z.literal("participant.left"), payload: ParticipantLeftEventSchema }),
  z.object({ eventType: z.literal("participant.role_updated"), payload: ParticipantRoleUpdatedEventSchema }),
  z.object({ eventType: z.literal("call.initiated"), payload: CallInitiatedEventSchema }),
  z.object({ eventType: z.literal("call.accepted"), payload: CallAcceptedEventSchema }),
  z.object({ eventType: z.literal("call.declined"), payload: CallDeclinedEventSchema }),
  z.object({ eventType: z.literal("call.missed"), payload: CallMissedEventSchema }),
  z.object({ eventType: z.literal("call.ended"), payload: CallEndedEventSchema }),
  z.object({ eventType: z.literal("conversation.hidden"), payload: ConversationHiddenEventSchema }),
  z.object({ eventType: z.literal("conversation.ended"), payload: ConversationEndedEventSchema }),
]);

export type DomainEvent = z.infer<typeof DomainEventSchema>;

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
  | "connection:reject"
  | "connection:cancel"
  | "webrtc:offer"
  | "webrtc:answer"
  | "webrtc:ice-candidate";

export type WSOutboundEventType =
  | "match-found"
  | "waiting"
  | "partner-joined"
  | "chat-history"
  | "message"
  | "message-persisted"
  | "message-edited"
  | "reaction-update"
  | "partner-typing"
  | "partner-seen-messages"
  | "connection:request"
  | "connection:accepted"
  | "connection:removed"
  | "connection:rejected"
  | "connection:cancelled"
  | "partner-disconnected"
  | "notification-received"
  | "error"
  | "call:incoming"
  | "call:accepted"
  | "call:declined"
  | "call:ended"
  | "conversation:ended"
  | "conversation:hidden"
  | "webrtc:offer"
  | "webrtc:answer"
  | "webrtc:ice-candidate";
