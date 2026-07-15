import { Router } from "express";
import { resolve } from "../../../config/container.js";
import { requireInternalKey } from "../../../shared/middlewares/internal.middleware.js";

export const internalConversationsRouter = Router();
const getController = () => resolve("conversationsController");

internalConversationsRouter.get("/:id/session-metadata", requireInternalKey, (req, res, next) => getController().getSessionMetadata(req, res, next));
