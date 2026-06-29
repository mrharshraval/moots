import { Router } from "express";
import { resolve } from "../../../config/container.js";
import { requireInternalKey } from "../../../shared/middlewares/internal.middleware.js";

export const internalMessagesRouter = Router();
const getController = () => resolve("messagesController");

internalMessagesRouter.post("/", requireInternalKey, (req, res, next) => getController().createInternal(req, res, next));
internalMessagesRouter.post("/:id/edit", requireInternalKey, (req, res, next) => getController().editInternal(req, res, next));
internalMessagesRouter.post("/:id/reaction", requireInternalKey, (req, res, next) => getController().reactionInternal(req, res, next));
internalMessagesRouter.post("/read", requireInternalKey, (req, res, next) => getController().readInternal(req, res, next));
