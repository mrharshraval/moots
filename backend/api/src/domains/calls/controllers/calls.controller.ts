import { Request, Response } from "express";
import { CallsService } from "../services/calls.service.js";
import { sendSuccess } from "../../../shared/utils/response.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { InitiateCallInput, AnswerCallInput } from "../dto/calls.dto.js";

export class CallsController {
  private service: CallsService;

  constructor() {
    this.service = new CallsService();
  }

  initiateCall = asyncHandler(async (req: Request<{}, {}, InitiateCallInput>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { conversationId, type } = req.body;

    const call = await this.service.initiateCall(conversationId, actorId, type);
    return sendSuccess(res, { call }, { status: 201 });
  });

  answerCall = asyncHandler(async (req: Request<{ id: string }, {}, AnswerCallInput>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;
    const { action } = req.body;

    const result = await this.service.answerCall(id, actorId, action);
    return sendSuccess(res, result);
  });

  endCall = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const actorId = req.user!.actorId!;
    const { id } = req.params;

    const result = await this.service.endCall(id, actorId);
    return sendSuccess(res, result);
  });
}
