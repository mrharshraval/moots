import { Router } from "express";
import { UsersController } from "../controllers/users.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { UpdateSettingsSchema } from "@moots/contracts";

export const usersRouter = Router();
const controller = new UsersController();

usersRouter.get("/me", authenticate, controller.getMe);
usersRouter.put("/settings", authenticate, validateRequest(UpdateSettingsSchema), controller.updateSettings);
