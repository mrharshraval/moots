import { prisma } from "../../../database/index.js";

import { User, VerificationToken, Prisma } from "@prisma/client";

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findUserByIdentifier(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }

  async createUser(data: any, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx || prisma).user.create({ data });
  }

  async updateUser(email: string, data: any, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx || prisma).user.update({ where: { email }, data });
  }

  async updateUserById(id: string, data: any, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx || prisma).user.update({ where: { id }, data });
  }

  async deleteVerificationTokens(identifier: string, tx?: Prisma.TransactionClient) {
    return (tx || prisma).verificationToken.deleteMany({ where: { identifier } });
  }

  async createVerificationToken(data: { identifier: string; token: string; expires: Date }, tx?: Prisma.TransactionClient): Promise<VerificationToken> {
    return (tx || prisma).verificationToken.create({ data });
  }

  async findVerificationToken(identifier: string, token: string): Promise<VerificationToken | null> {
    return prisma.verificationToken.findFirst({
      where: { identifier, token },
    });
  }

  async deleteVerificationToken(token: string, tx?: Prisma.TransactionClient) {
    return (tx || prisma).verificationToken.delete({ where: { token } });
  }

  async findActorById(actorId: string, tx?: Prisma.TransactionClient) {
    return (tx || prisma).actor.findUnique({ where: { id: actorId } });
  }

  async getOrCreateActorForUser(userId: string, tx?: Prisma.TransactionClient) {
    const trx = tx || prisma;
    let actor = await trx.actor.findFirst({ where: { userId } });
    if (!actor) {
      actor = await trx.actor.create({
        data: {
          type: "USER",
          userId,
        },
      });
    }
    return actor;
  }

  async createGuestSession(ipAddress: string, userAgent: string, tx?: Prisma.TransactionClient) {
    const trx = tx || prisma;
    const { randomUUID, randomBytes } = await import("crypto");
    const guestToken = randomBytes(32).toString("hex");
    
    return trx.guestSession.create({
      data: {
        guestToken,
        deviceId: randomUUID(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        actors: {
          create: {
            type: "GUEST"
          }
        }
      },
      include: {
        actors: true
      }
    });
  }

  async promoteGuestSession(guestSessionId: string, userId: string, tx?: Prisma.TransactionClient) {
    const trx = tx || prisma;
    const guest = await trx.guestSession.findUnique({
      where: { id: guestSessionId },
      include: { actors: true }
    });

    if (!guest || !guest.actors || guest.actors.length === 0) return null;
    const actor = guest.actors[0];

    // Update Actor to point to User instead of GuestSession, and set type to USER
    await trx.actor.update({
      where: { id: actor.id },
      data: {
        type: "USER",
        userId: userId,
        guestSessionId: null
      }
    });

    // We can either delete or mark the guest session as inactive. Since we moved the actor, 
    // the guest session is orphaned. Let's delete it.
    await trx.guestSession.delete({
      where: { id: guestSessionId }
    });

    return actor;
  }
}
