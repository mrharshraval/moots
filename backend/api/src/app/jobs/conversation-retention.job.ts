import { prisma } from "../../database/index.js";
import { logger } from "../../shared/logger.js";

// Run retention cleanup every 10 minutes
export function startConversationRetentionJob() {
  const TEN_MINUTES = 10 * 60 * 1000;
  
  setInterval(async () => {
    try {
      const now = new Date();
      let deletedCount = 0;
      
      // Find all ENDED conversations that have expired and are not retention-locked
      const expiredConversations = await prisma.conversation.findMany({
        where: { 
          kind: 'MATCH',
          status: 'ENDED',
          expiresAt: { lte: now },
          retentionLock: false
        },
        select: {
          id: true,
          participants: { select: { actorId: true } }
        }
      });

      for (const conv of expiredConversations) {
        // Clear activeMatchConversationId for participants
        for (const p of conv.participants) {
          await prisma.actor.update({
            where: { id: p.actorId },
            data: { activeMatchConversationId: null }
          });
        }
        await prisma.conversation.delete({
          where: { id: conv.id }
        });
        deletedCount++;
      }
      
      if (deletedCount > 0) {
        logger.info({ count: deletedCount }, "Conversation retention job removed expired conversations");
      }
    } catch (error) {
      logger.error({ error }, "Error running conversation retention job");
    }
  }, TEN_MINUTES);
  
  logger.info("Conversation retention job started");
}
