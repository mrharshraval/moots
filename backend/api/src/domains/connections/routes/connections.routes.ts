import { Router } from "express";
import { ConnectionsController } from "../controllers/connections.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { RequestConnectionSchema, AcceptConnectionSchema } from "../dto/connections.dto.js";

export const connectionsRouter = Router();
const controller = new ConnectionsController();

connectionsRouter.post("/request", authenticate, validateRequest(RequestConnectionSchema), controller.requestConnection);
connectionsRouter.post("/accept",  authenticate, validateRequest(AcceptConnectionSchema),  controller.acceptConnection);
