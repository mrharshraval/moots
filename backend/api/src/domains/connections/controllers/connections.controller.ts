import { Request, Response } from "express";
import { ConnectionsService } from "../services/connections.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { z } from "zod";

export class ConnectionsController {
  private service: ConnectionsService;

  constructor(deps?: { connectionsService: ConnectionsService }) {
    this.service = deps?.connectionsService || new ConnectionsService();
  }

  // Public API methods
  requestConnection = asyncHandler(async (req: Request, res: Response) => {
    const senderId = req.user!.actorId!;
    const { receiverId } = req.body;
    const connection = await this.service.requestConnection({ senderId, receiverId });
    return sendSuccess(res, connection);
  });

  acceptConnection = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user!.actorId!;
    const { connectionId } = req.body;
    const connection = await this.service.acceptConnectionById(connectionId, actorId);
    return sendSuccess(res, connection);
  });

  // Internal API methods
  createConnectionInternal = asyncHandler(async (req: Request, res: Response) => {
    const { actorId1, actorId2 } = z.object({ actorId1: z.string(), actorId2: z.string() }).parse(req.body);
    const connection = await this.service.requestConnection({ senderId: actorId1, receiverId: actorId2 });
    return sendSuccess(res, connection);
  });

  acceptConnectionInternal = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { actorId } = z.object({ actorId: z.string() }).parse(req.body);
    const connection = await this.service.acceptConnection(actorId, id);
    return sendSuccess(res, connection);
  });

  removeConnectionInternal = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { actorId } = z.object({ actorId: z.string() }).parse(req.body);
    const connection = await this.service.removeConnection(actorId, id);
    return sendSuccess(res, connection);
  });
}
