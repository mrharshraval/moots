import { prisma } from "../../../database/index.js";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export class ParticipantRepository {
  async createParticipant(
    conversationId: string, 
    actorId: string, 
    displayName?: string,
    tx?: Prisma.TransactionClient
  ) {
    const trx = tx || prisma;
    
    // Generate persona
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3", "#FFD733"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const avatarSeed = randomUUID();
    const finalDisplayName = displayName || `Anonymous User`;

    return trx.participant.create({
      data: {
        conversationId,
        actorId,
        persona: {
          create: {
            displayName: finalDisplayName,
            avatarSeed,
            color: randomColor
          }
        }
      }
    });
  }

  async getParticipant(conversationId: string, actorId: string) {
    return prisma.participant.findUnique({
      where: {
        actorId_conversationId: {
          actorId,
          conversationId
        }
      }
    });
  }

  async getParticipantsByConversation(conversationId: string) {
    return prisma.participant.findMany({
      where: { conversationId },
      include: {
        actor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          }
        }
      }
    });
  }

}
