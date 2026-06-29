import { Router } from "express";
import { resolve } from "../../../config/container.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";

export const messagesRouter = Router({ mergeParams: true });

// Lazily resolve controller after DI container is populated
const getController = () => resolve("messagesController");

// This matches /api/conversations/:id/messages
messagesRouter.get("/", authenticate, (req, res, next) => getController().getHistory(req, res, next));
