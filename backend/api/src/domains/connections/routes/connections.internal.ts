import { Router } from "express";
import { resolve } from "../../../config/container.js";
import { requireInternalKey } from "../../../shared/middlewares/internal.middleware.js";

export const internalConnectionsRouter = Router();
const getController = () => resolve("connectionsController");

internalConnectionsRouter.post("/", requireInternalKey, (req, res, next) => getController().createConnectionInternal(req, res, next));
internalConnectionsRouter.post("/:id/accept", requireInternalKey, (req, res, next) => getController().acceptConnectionInternal(req, res, next));
internalConnectionsRouter.post("/:id/remove", requireInternalKey, (req, res, next) => getController().removeConnectionInternal(req, res, next));
