import { Router } from "express";
import { ConversationsController } from "../controllers/conversations.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { GetUserConversationsSchema, UpdateConversationSettingsSchema, EndConversationSchema, CreateGroupConversationSchema, CreateGroupInviteSchema, JoinGroupInviteSchema, KickParticipantSchema, LeaveConversationSchema, UpdateParticipantRoleSchema, HideConversationSchema, UnhideConversationSchema } from "@moots/contracts";

export const conversationsRouter = Router();
const controller = new ConversationsController();

conversationsRouter.get("/",     authenticate, validateRequest(GetUserConversationsSchema),         controller.getUserConversations);
conversationsRouter.post("/group", authenticate, validateRequest(CreateGroupConversationSchema), controller.createGroup);
conversationsRouter.post("/:id/invites", authenticate, validateRequest(CreateGroupInviteSchema), controller.createInvite);
conversationsRouter.post("/join/:code", authenticate, validateRequest(JoinGroupInviteSchema), controller.joinInvite);
conversationsRouter.put("/:id/settings", authenticate, validateRequest(UpdateConversationSettingsSchema), controller.updateSettings);
conversationsRouter.post("/:id/end",       authenticate, validateRequest(EndConversationSchema),             controller.endConversation);
conversationsRouter.delete("/:id/participants/:targetActorId", authenticate, validateRequest(KickParticipantSchema), controller.kickParticipant);
conversationsRouter.post("/:id/leave", authenticate, validateRequest(LeaveConversationSchema), controller.leaveConversation);
conversationsRouter.patch("/:id/hide", authenticate, validateRequest(HideConversationSchema), controller.hideConversation);
conversationsRouter.patch("/:id/unhide", authenticate, validateRequest(UnhideConversationSchema), controller.unhideConversation);
conversationsRouter.put("/:id/participants/:targetActorId/role", authenticate, validateRequest(UpdateParticipantRoleSchema), controller.updateParticipantRole);
