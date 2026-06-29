import { Router } from "express";
import { ConversationsController } from "../controllers/conversations.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { GetUserConversationsSchema, UpdateConversationSettingsSchema, DeleteConversationSchema } from "../dto/conversations.dto.js";

export const conversationsRouter = Router();
const controller = new ConversationsController();

conversationsRouter.get("/",     authenticate, validateRequest(GetUserConversationsSchema),         controller.getUserConversations);
conversationsRouter.put("/:id/settings", authenticate, validateRequest(UpdateConversationSettingsSchema), controller.updateSettings);
conversationsRouter.delete("/:id",       authenticate, validateRequest(DeleteConversationSchema),          controller.deleteConversation);
