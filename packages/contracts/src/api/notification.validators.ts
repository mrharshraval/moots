import { z } from "zod";

export const NotificationTypeSchema = z.enum([
  "NEW_MESSAGE",
  "MESSAGE_REPLY",
  "MENTION",
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "GROUP_INVITE",
  "CALL_INVITATION",
  "MISSED_CALL",
  "REPORT_UPDATE",
  "MODERATION_ACTION",
  "SYSTEM",
]);

export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  entityId: z.string().nullable(),
  payload: z.any(),
  isRead: z.boolean(),
  createdAt: z.string().or(z.date()),
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  nextCursor: z.string().optional(),
  unreadCount: z.number(),
});

export const MarkAsReadRequestSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const MarkAllAsReadRequestSchema = z.object({});
