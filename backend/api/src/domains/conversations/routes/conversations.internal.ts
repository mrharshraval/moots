import { Router } from "express";
import { resolve } from "../../../config/container.js";
import { requireInternalKey } from "../../../shared/middlewares/internal.middleware.js";

export const internalConversationsRouter = Router();
const getController = () => resolve("conversationsController");

internalConversationsRouter.post("/:id/reveal", requireInternalKey, (req, res, next) => getController().revealIdentityInternal(req, res, next));
