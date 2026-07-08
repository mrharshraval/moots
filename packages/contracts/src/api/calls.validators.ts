import { z } from "zod";

export const InitiateCallSchema = z.object({
  body: z.object({
    conversationId: z.string().min(1),
    type: z.enum(["AUDIO", "VIDEO"]),
  })
});

export const AnswerCallSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    action: z.enum(["ACCEPT", "DECLINE", "CANCEL"]),
  })
});

export const EndCallSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  })
});
