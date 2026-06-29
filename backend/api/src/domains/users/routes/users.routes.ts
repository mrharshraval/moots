import { Router } from "express";
import { UsersController } from "../controllers/users.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { UpdateSettingsSchema } from "../dto/users.dto.js";

export const usersRouter = Router();
const controller = new UsersController();

usersRouter.put("/settings", authenticate, validateRequest(UpdateSettingsSchema), controller.updateSettings);
