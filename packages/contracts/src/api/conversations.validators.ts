import { z } from "zod";

export const GetUserConversationsSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit:  z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

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

export const RevealIdentityInternalSchema = z.object({
  body: z.object({
    actorId: z.string(),
  })
});

export const CreateGroupConversationSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Group name is required"),
    participantActorIds: z.array(z.string()).optional(),
  })
});

export const CreateGroupInviteSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    maxUses: z.number().int().min(1).optional(),
    expiresInMs: z.number().int().min(1000).optional(),
  })
});

export const JoinGroupInviteSchema = z.object({
  params: z.object({
    code: z.string().min(1),
  })
});

export const KickParticipantSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    targetActorId: z.string().min(1),
  })
});

export const LeaveConversationSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  })
});

export const UpdateParticipantRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    targetActorId: z.string().min(1),
  }),
  body: z.object({
    role: z.enum(["MEMBER", "ADMIN"]),
  })
});
