import { z } from "zod";

export const RequestConnectionSchema = z.object({
  body: z.object({
    receiverId: z.string().min(1, "Receiver ID is required"),
  }),
});

export const AcceptConnectionSchema = z.object({
  body: z.object({
    connectionId: z.string().min(1, "Connection ID is required"),
  }),
});

export type RequestConnectionInput = z.infer<typeof RequestConnectionSchema>["body"];
export type AcceptConnectionInput = z.infer<typeof AcceptConnectionSchema>["body"];
