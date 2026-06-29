import { createContainer, asClass, asValue, InjectionMode } from "awilix";
import { logger } from "../shared/logger.js";
import { prisma } from "../database/index.js";
import { EmailService } from "../lib/email.service.js";

import { AuthService } from "../domains/auth/services/auth.service.js";
import { AuthController } from "../domains/auth/controllers/auth.controller.js";

import { MessagesService } from "../domains/messages/services/messages.service.js";
import { MessagesController } from "../domains/messages/controllers/messages.controller.js";

import { ConnectionsService } from "../domains/connections/services/connections.service.js";
import { ConnectionsController } from "../domains/connections/controllers/connections.controller.js";

import { ConversationsService } from "../domains/conversations/services/conversations.service.js";
import { ConversationsController } from "../domains/conversations/controllers/conversations.controller.js";
import { RedisService } from "../lib/redis.service.js";

// Setup DI Container
export const container = createContainer({
  injectionMode: InjectionMode.PROXY,
});

// Define the dependencies interface for type safety (can be expanded later)
export interface Cradle {
  logger: typeof logger;
  prisma: typeof prisma;
  emailService: EmailService;
  authService: AuthService;
  authController: AuthController;
  messagesService: MessagesService;
  messagesController: MessagesController;
  connectionsService: ConnectionsService;
  connectionsController: ConnectionsController;
  conversationsService: ConversationsService;
  conversationsController: ConversationsController;
  redisService: RedisService;
}

export function registerDependencies() {
  container.register({
    logger: asValue(logger),
    prisma: asValue(prisma),
    emailService: asClass(EmailService).singleton(),
    authService: asClass(AuthService).singleton(),
    authController: asClass(AuthController).singleton(),
    messagesService: asClass(MessagesService).singleton(),
    messagesController: asClass(MessagesController).singleton(),
    connectionsService: asClass(ConnectionsService).singleton(),
    connectionsController: asClass(ConnectionsController).singleton(),
    conversationsService: asClass(ConversationsService).singleton(),
    conversationsController: asClass(ConversationsController).singleton(),
    redisService: asClass(RedisService).singleton(),
  });
}

// Resolve helper
export function resolve<K extends keyof Cradle>(name: K): Cradle[K] {
  return container.resolve<Cradle[K]>(name);
}
