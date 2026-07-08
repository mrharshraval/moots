import { z } from "zod";

// schemas for incoming payloads

export const JoinQueuePayloadSchema = z.object({
  nickname: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  interests: z.array(z.string()),
  lang: z.string().min(1),
  country: z.string().min(1),
});

export const CancelQueuePayloadSchema = z.object({
});

export const JoinChatPayloadSchema = z.object({
  nickname: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  sessionId: z.string().min(1),
});

export const DeleteMessagePayloadSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
});

export const SendMessagePayloadSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1),
  clientMessageId: z.string().optional(),
  replyTo: z.object({
    id: z.string(),
    senderId: z.string(),
    content: z.string(),
  }).optional(),
});

export const EditMessagePayloadSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
  newContent: z.string().min(1),
});

export const SendReactionPayloadSchema = z.object({
  sessionId: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1),
});

export const TypingStatusPayloadSchema = z.object({
  sessionId: z.string().min(1),
  isTyping: z.boolean(),
});

export const ReadMessagesPayloadSchema = z.object({
  sessionId: z.string().min(1),
});

export const GenericPartnerEventPayloadSchema = z.object({
  sessionId: z.string().min(1),
});

export const IdentityRevealedPayloadSchema = z.object({
  sessionId: z.string().min(1),
  username: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

export const AuthenticatePayloadSchema = z.object({
  token: z.string().min(1),
});

export const WebRTCOfferPayloadSchema = z.object({
  sessionId: z.string().min(1),
  callId: z.string().min(1),
  targetActorId: z.string().min(1),
  offer: z.any(), // RTCSessionDescriptionInit
});

export const WebRTCAnswerPayloadSchema = z.object({
  sessionId: z.string().min(1),
  callId: z.string().min(1),
  targetActorId: z.string().min(1),
  answer: z.any(), // RTCSessionDescriptionInit
});

export const WebRTCIceCandidatePayloadSchema = z.object({
  sessionId: z.string().min(1),
  callId: z.string().min(1),
  targetActorId: z.string().min(1),
  candidate: z.any(), // RTCIceCandidateInit
});

// Central inbound message schema unioned on 'type'
export const InboundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("authenticate"), payload: AuthenticatePayloadSchema }),
  z.object({ type: z.literal("join-queue"), payload: JoinQueuePayloadSchema }),
  z.object({ type: z.literal("cancel-queue"), payload: CancelQueuePayloadSchema }),
  z.object({ type: z.literal("join-chat"), payload: JoinChatPayloadSchema }),
  z.object({ type: z.literal("delete-message"), payload: DeleteMessagePayloadSchema }),
  z.object({ type: z.literal("send-message"), payload: SendMessagePayloadSchema }),
  z.object({ type: z.literal("edit-message"), payload: EditMessagePayloadSchema }),
  z.object({ type: z.literal("send-reaction"), payload: SendReactionPayloadSchema }),
  z.object({ type: z.literal("typing-status"), payload: TypingStatusPayloadSchema }),
  z.object({ type: z.literal("read-messages"), payload: ReadMessagesPayloadSchema }),
  z.object({ type: z.literal("connection:request"), payload: GenericPartnerEventPayloadSchema }),
  z.object({ type: z.literal("connection:accepted"), payload: GenericPartnerEventPayloadSchema }),
  z.object({ type: z.literal("connection:removed"), payload: GenericPartnerEventPayloadSchema }),
  z.object({ type: z.literal("participant:identity-revealed"), payload: IdentityRevealedPayloadSchema }),
  z.object({ type: z.literal("participant:identity-hidden"), payload: GenericPartnerEventPayloadSchema }),
  z.object({ type: z.literal("webrtc:offer"), payload: WebRTCOfferPayloadSchema }),
  z.object({ type: z.literal("webrtc:answer"), payload: WebRTCAnswerPayloadSchema }),
  z.object({ type: z.literal("webrtc:ice-candidate"), payload: WebRTCIceCandidatePayloadSchema }),
]);

