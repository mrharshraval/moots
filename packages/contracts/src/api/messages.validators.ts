import { z } from "zod";

export const CreateMessageInternalSchema = z.object({
  body: z.object({
    conversationId: z.string(),
    senderParticipantId: z.string(),
    content: z.string(),
    contentType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE']).optional(),
    clientMessageId: z.string().optional(),
    replyToId: z.string().optional(),
  })
});

export const EditMessageInternalSchema = z.object({
  body: z.object({
    newContent: z.string(),
    actorId: z.string(),
  })
});

export const ReactionInternalSchema = z.object({
  body: z.object({
    emoji: z.string(),
    actorId: z.string(),
  })
});

export const ReadInternalSchema = z.object({
  body: z.object({
    conversationId: z.string(),
    actorId: z.string(),
  })
});
