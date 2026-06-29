import { prisma } from "../../database/index.js";
import { logger } from "../../shared/logger.js";

// Run cleanup every hour
export function startGuestCleanupJob() {
  const ONE_HOUR = 60 * 60 * 1000;
  
  setInterval(async () => {
    try {
      const now = new Date();
      
      const { count } = await prisma.guestSession.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });
      
      if (count > 0) {
        logger.info({ count }, "Guest cleanup job removed expired sessions");
      }
    } catch (error) {
      logger.error({ error }, "Error running guest cleanup job");
    }
  }, ONE_HOUR);
  
  logger.info("Guest cleanup job started");
}
