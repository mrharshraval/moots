import { z } from "zod";

export const GetUserConversationsSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit:  z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export interface ConversationSummaryDTO {
  id: string;
  type: string;
  name: string | null;
  status: string;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  unreadCount: number;
  participants: Array<{
    id:       string;
    name:     string | null;
    username: string | null;
    image:    string | null;
    email:    string;
  }>;
  lastMessagePreview: string | null;
  lastMessageId: string | null;
  lastActivityAt: Date | string;
  updatedAt: Date | string;
}

export const UpdateConversationSettingsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Conversation ID is required"),
  }),
  body: z.object({
    isPinned:    z.boolean().optional(),
    isArchived:  z.boolean().optional(),
    isMuted:     z.boolean().optional(),
    unreadCount: z.number().int().min(0).optional(),
  }),
});

export const DeleteConversationSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Conversation ID is required"),
  }),
  body: z.object({
    clearOnly: z.boolean().optional(),
  }),
});

export type GetUserConversationsInput = z.infer<typeof GetUserConversationsSchema>;
export type UpdateConversationSettingsInput = z.infer<typeof UpdateConversationSettingsSchema>;
export type DeleteConversationInput = z.infer<typeof DeleteConversationSchema>;
