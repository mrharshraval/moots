import app from "./app.js";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";
import { prisma } from "../database/index.js";

const PORT = env.PORT;

async function validateStartup() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Startup Check: Database connection successful.");
  } catch (err: any) {
    logger.error({ errorMessage: err.message }, "Startup Check Failed: Database is unreachable.");
    process.exit(1);
  }
}
import { startGuestCleanupJob } from "./jobs/guest-cleanup.job.js";
import { startConversationRetentionJob } from "./jobs/conversation-retention.job.js";
import { startOutboxWorker } from "./workers/outbox.worker.js";
import { startCommandWorker } from "./workers/command.worker.js";

import { resolve } from "../config/container.js";

validateStartup().then(async () => {
  const policyService = resolve("policyService");
  await policyService.seedPolicies();
  logger.info("Policies seeded successfully.");

  startGuestCleanupJob();
  startConversationRetentionJob();
  startOutboxWorker();
  startCommandWorker();
  app.listen(PORT, () => {
    logger.info(`Express REST API listening on port ${PORT}`);
  });
});
