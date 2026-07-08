import { Router } from "express";
import { ConversationsController } from "../controllers/conversations.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { GetUserConversationsSchema, UpdateConversationSettingsSchema, DeleteConversationSchema, CreateGroupConversationSchema, CreateGroupInviteSchema, JoinGroupInviteSchema, KickParticipantSchema, LeaveConversationSchema, UpdateParticipantRoleSchema } from "@moots/contracts";

export const conversationsRouter = Router();
const controller = new ConversationsController();

conversationsRouter.get("/",     authenticate, validateRequest(GetUserConversationsSchema),         controller.getUserConversations);
conversationsRouter.post("/group", authenticate, validateRequest(CreateGroupConversationSchema), controller.createGroup);
conversationsRouter.post("/:id/invites", authenticate, validateRequest(CreateGroupInviteSchema), controller.createInvite);
conversationsRouter.post("/join/:code", authenticate, validateRequest(JoinGroupInviteSchema), controller.joinInvite);
conversationsRouter.put("/:id/settings", authenticate, validateRequest(UpdateConversationSettingsSchema), controller.updateSettings);
conversationsRouter.delete("/:id",       authenticate, validateRequest(DeleteConversationSchema),          controller.deleteConversation);
conversationsRouter.delete("/:id/participants/:targetActorId", authenticate, validateRequest(KickParticipantSchema), controller.kickParticipant);
conversationsRouter.post("/:id/leave", authenticate, validateRequest(LeaveConversationSchema), controller.leaveConversation);
conversationsRouter.put("/:id/participants/:targetActorId/role", authenticate, validateRequest(UpdateParticipantRoleSchema), controller.updateParticipantRole);
