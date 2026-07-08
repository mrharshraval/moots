import { Router } from "express";
import { CallsController } from "../controllers/calls.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate.middleware.js";
import { authenticate } from "../../../shared/middlewares/authenticate.middleware.js";
import { InitiateCallSchema, AnswerCallSchema, EndCallSchema } from "@moots/contracts";

export const callsRouter = Router();
const controller = new CallsController();

callsRouter.post("/", authenticate, validateRequest(InitiateCallSchema), controller.initiateCall);
callsRouter.post("/:id/answer", authenticate, validateRequest(AnswerCallSchema), controller.answerCall);
callsRouter.post("/:id/end", authenticate, validateRequest(EndCallSchema), controller.endCall);
