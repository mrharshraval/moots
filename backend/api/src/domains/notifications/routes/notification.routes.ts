import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";

export const notificationRoutes = Router();
const controller = new NotificationController();

// Use authentication middleware for all routes
notificationRoutes.use(authenticate);

notificationRoutes.get("/", controller.getNotifications);
notificationRoutes.patch("/:id/read", controller.markAsRead);
notificationRoutes.post("/read-all", controller.markAllAsRead);
