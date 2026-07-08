import { CallsRepository } from "../repositories/calls.repository.js";
import { prisma } from "../../../database/index.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../../shared/errors/AppError.js";
import { EventBus } from "../../../shared/events/event-bus.js";
import { CallType, NotificationType } from "@prisma/client";
import { NotificationService } from "../../notifications/services/notification.service.js";

export class CallsService {
  private repository: CallsRepository;
  private notificationService: NotificationService;

  constructor() {
    this.repository = new CallsRepository();
    this.notificationService = new NotificationService();
  }

  async initiateCall(conversationId: string, actorId: string, type: CallType) {
    return prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { actorId_conversationId: { actorId, conversationId } }
      });

      if (!participant || participant.hasLeft) {
        throw new NotFoundError("Conversation not found");
      }

      const activeCall = await tx.call.findFirst({
        where: { conversationId, status: { in: ["RINGING", "ONGOING"] } }
      });

      if (activeCall) {
        throw new BadRequestError("An active call already exists in this conversation");
      }

      const call = await this.repository.createCall(conversationId, actorId, type, tx);

      const otherParticipants = await tx.participant.findMany({
        where: { conversationId, actorId: { not: actorId }, hasLeft: false },
        select: { actorId: true }
      });

      const participantIds = [actorId, ...otherParticipants.map(p => p.actorId)];

      await EventBus.publish(tx, "call.initiated", call.id, "Call", {
        callId: call.id,
        conversationId,
        initiatorActorId: actorId,
        type,
        participantIds
      });

      for (const p of otherParticipants) {
        await this.notificationService.createNotification(
          p.actorId,
          NotificationType.CALL_INVITATION,
          call.id,
          { callId: call.id, conversationId, initiatorActorId: actorId, type },
          undefined,
          `call_${call.id}_invite`
        );
      }

      return call;
    });
  }

  async answerCall(callId: string, actorId: string, action: "ACCEPT" | "DECLINE" | "CANCEL") {
    return prisma.$transaction(async (tx) => {
      const call = await this.repository.getCall(callId);
      if (!call) throw new NotFoundError("Call not found");
      if (call.status !== "RINGING") throw new BadRequestError("Call is no longer ringing");

      const isParticipant = call.conversation.participants.some(p => p.actorId === actorId && !p.hasLeft);
      if (!isParticipant) throw new ForbiddenError("Not a participant of this conversation");

      if (action === "ACCEPT") {
        await this.repository.updateCallStatus(callId, "ONGOING", tx);
        await this.repository.addParticipant(callId, actorId, tx);

        await EventBus.publish(tx, "call.accepted", callId, "Call", {
          callId,
          conversationId: call.conversationId,
          actorId
        });
      } else if (action === "DECLINE") {
        await this.repository.updateCallStatus(callId, "DECLINED", tx);
        
        await EventBus.publish(tx, "call.declined", callId, "Call", {
          callId,
          conversationId: call.conversationId,
          actorId
        });
      } else if (action === "CANCEL") {
        const isInitiator = call.participants.some(p => p.actorId === actorId);
        if (!isInitiator) throw new ForbiddenError("Only the initiator can cancel a ringing call");

        await this.repository.updateCallStatus(callId, "MISSED", tx);
        await EventBus.publish(tx, "call.missed", callId, "Call", { callId, conversationId: call.conversationId });

        const otherParticipants = await tx.participant.findMany({
          where: { conversationId: call.conversationId, actorId: { not: actorId }, hasLeft: false },
          select: { actorId: true }
        });
        for (const p of otherParticipants) {
          await this.notificationService.createNotification(
            p.actorId,
            NotificationType.MISSED_CALL,
            call.id,
            { callId: call.id, conversationId: call.conversationId },
            undefined,
            `call_${call.id}_missed`
          );
        }
      }

      return { message: `Call ${action.toLowerCase()}ed` };
    });
  }

  async endCall(callId: string, actorId: string) {
    return prisma.$transaction(async (tx) => {
      const call = await this.repository.getCall(callId);
      if (!call) throw new NotFoundError("Call not found");
      if (call.status === "ENDED" || call.status === "MISSED" || call.status === "DECLINED") {
        return { message: "Call already ended" };
      }

      const isParticipant = call.participants.some(p => p.actorId === actorId && !p.leftAt);
      if (!isParticipant && call.status === "ONGOING") {
        throw new ForbiddenError("You are not active in this call");
      }

      if (call.status === "RINGING") {
        await this.repository.updateCallStatus(callId, "MISSED", tx);
        await EventBus.publish(tx, "call.missed", callId, "Call", { callId, conversationId: call.conversationId });

        const otherParticipants = await tx.participant.findMany({
          where: { conversationId: call.conversationId, actorId: { not: actorId }, hasLeft: false },
          select: { actorId: true }
        });
        for (const p of otherParticipants) {
          await this.notificationService.createNotification(
            p.actorId,
            NotificationType.MISSED_CALL,
            call.id,
            { callId: call.id, conversationId: call.conversationId },
            undefined,
            `call_${call.id}_missed`
          );
        }
      } else {
        // If it's a group call, maybe just remove participant. If it's 1:1, end it.
        // For simplicity, ending the call for everyone if anyone hangs up 1:1. 
        // We'll just end it entirely for now.
        await this.repository.updateCallStatus(callId, "ENDED", tx);
        await EventBus.publish(tx, "call.ended", callId, "Call", { callId, conversationId: call.conversationId, actorId });
      }

      return { message: "Call ended" };
    });
  }
}
