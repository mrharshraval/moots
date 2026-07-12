import { z } from "zod";
import {
  GetUserConversationsSchema,
  UpdateConversationSettingsSchema,
  EndConversationSchema,
  RevealIdentityInternalSchema,
  CreateGroupConversationSchema,
  CreateGroupInviteSchema,
  JoinGroupInviteSchema,
  KickParticipantSchema,
  LeaveConversationSchema,
  UpdateParticipantRoleSchema
} from "@moots/contracts";

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

export type GetUserConversationsInput = z.infer<typeof GetUserConversationsSchema>;
export type UpdateConversationSettingsInput = z.infer<typeof UpdateConversationSettingsSchema>;
export type EndConversationInput = z.infer<typeof EndConversationSchema>;
export type RevealIdentityInternalInput = z.infer<typeof RevealIdentityInternalSchema>["body"];
export type CreateGroupConversationInput = z.infer<typeof CreateGroupConversationSchema>;
export type CreateGroupInviteInput = z.infer<typeof CreateGroupInviteSchema>;
export type JoinGroupInviteInput = z.infer<typeof JoinGroupInviteSchema>;
