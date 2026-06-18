import { z } from "zod";

// schemas for incoming payloads

export const JoinQueuePayloadSchema = z.object({
  userId: z.string().min(1),
  interests: z.array(z.string()),
  lang: z.string().min(1),
  country: z.string().min(1),
});

export const CancelQueuePayloadSchema = z.object({
  userId: z.string().min(1),
});

export const JoinChatPayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});

export const SendMessagePayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  content: z.string().min(1),
  replyTo: z.object({
    id: z.string(),
    senderId: z.string(),
    content: z.string(),
  }).optional(),
});

export const EditMessagePayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
  newContent: z.string().min(1),
});

export const SendReactionPayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1),
});

export const TypingStatusPayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  isTyping: z.boolean(),
});

export const ReadMessagesPayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});

// Central inbound message schema unioned on 'type'
export const InboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join-queue"), payload: JoinQueuePayloadSchema }),
  z.object({ type: z.literal("cancel-queue"), payload: CancelQueuePayloadSchema }),
  z.object({ type: z.literal("join-chat"), payload: JoinChatPayloadSchema }),
  z.object({ type: z.literal("send-message"), payload: SendMessagePayloadSchema }),
  z.object({ type: z.literal("edit-message"), payload: EditMessagePayloadSchema }),
  z.object({ type: z.literal("send-reaction"), payload: SendReactionPayloadSchema }),
  z.object({ type: z.literal("typing-status"), payload: TypingStatusPayloadSchema }),
  z.object({ type: z.literal("read-messages"), payload: ReadMessagesPayloadSchema }),
]);
