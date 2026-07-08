import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { ModerationController } from "../controllers/moderation.controller.js";

export const moderationRouter = Router();
const controller = new ModerationController();

moderationRouter.post("/reports", authenticate, controller.createReport);
