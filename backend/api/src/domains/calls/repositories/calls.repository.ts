import { prisma } from "../../../database/index.js";
import { Prisma, CallType, CallStatus } from "@prisma/client";

export class CallsRepository {
  async createCall(conversationId: string, initiatorActorId: string, type: CallType, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.call.create({
      data: {
        conversationId,
        type,
        status: "RINGING",
        participants: {
          create: {
            actorId: initiatorActorId,
            joinedAt: new Date()
          }
        }
      },
      include: { participants: true, conversation: { include: { participants: true } } }
    });
  }

  async getCall(callId: string) {
    return prisma.call.findUnique({
      where: { id: callId },
      include: { participants: true, conversation: { include: { participants: true } } }
    });
  }

  async updateCallStatus(callId: string, status: CallStatus, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.call.update({
      where: { id: callId },
      data: { 
        status,
        endedAt: status === "ENDED" || status === "MISSED" || status === "DECLINED" ? new Date() : undefined
      }
    });
  }

  async addParticipant(callId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.callParticipant.upsert({
      where: { callId_actorId: { callId, actorId } },
      create: {
        callId,
        actorId,
        joinedAt: new Date(),
      },
      update: {
        joinedAt: new Date(),
        leftAt: null
      }
    });
  }

  async removeParticipant(callId: string, actorId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.callParticipant.update({
      where: { callId_actorId: { callId, actorId } },
      data: { leftAt: new Date() }
    });
  }
}
