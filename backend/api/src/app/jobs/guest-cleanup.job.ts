import { prisma } from "../../database/index.js";
import { logger } from "../../shared/logger.js";

// Run cleanup every hour
export function startGuestCleanupJob() {
  const ONE_HOUR = 60 * 60 * 1000;
  
  setInterval(async () => {
    try {
      const now = new Date();
      
      const expiredSessions = await prisma.guestSession.findMany({
        where: { expiresAt: { lt: now } },
        select: { id: true, actors: { select: { id: true } } }
      });

      if (expiredSessions.length > 0) {
        const actorIds = expiredSessions.flatMap(s => s.actors.map(a => a.id));

        // 1. Manually delete Participants to satisfy Actor -> Participant restrict constraint
        if (actorIds.length > 0) {
          await prisma.participant.deleteMany({
            where: { actorId: { in: actorIds } }
          });
        }

        // 2. Safely delete GuestSessions (which cascades to Actor)
        const sessionIds = expiredSessions.map(s => s.id);
        const { count } = await prisma.guestSession.deleteMany({
          where: { id: { in: sessionIds } }
        });

        logger.info({ count }, "Guest cleanup job removed expired sessions");
      }
    } catch (error) {
      logger.error({ error }, "Error running guest cleanup job");
    }
  }, ONE_HOUR);
  
  logger.info("Guest cleanup job started");
}
