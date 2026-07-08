import { registerDependencies } from "../config/container.js";
registerDependencies();

import { prisma } from "../database/index.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";
import { requestContext } from "../shared/context.js";
import { authRateLimiter, readRateLimiter } from "../shared/middlewares/rate-limit.middleware.js";

import { authRouter } from "../domains/auth/index.js";
import { usersRouter } from "../domains/users/index.js";
import { conversationsRouter } from "../domains/conversations/index.js";
import { internalConversationsRouter } from "../domains/conversations/routes/conversations.internal.js";
import { connectionsRouter } from "../domains/connections/index.js";
import { internalConnectionsRouter } from "../domains/connections/routes/connections.internal.js";
import { messagesRouter } from "../domains/messages/routes/messages.routes.js";
import { internalMessagesRouter } from "../domains/messages/routes/messages.internal.js";
import { callsRouter } from "../domains/calls/routes/calls.routes.js";
import helmet from "helmet";
import { globalErrorHandler } from "../shared/middlewares/error.middleware.js";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiSpec } from "../docs/openapi.js";

const app = express();

app.use(helmet({
  // In development the frontend (localhost:3000) fetches from the API (localhost:3002).
  // Helmet's default `Cross-Origin-Resource-Policy: same-origin` header causes browsers
  // to block those cross-origin responses before the app can read them (incl. cookies).
  // We relax this to `same-site` in non-production so that cross-port localhost traffic works.
  crossOriginResourcePolicy: {
    policy: process.env.NODE_ENV === "production" ? "same-origin" : "same-site",
  },
}));
app.use(cors({
  origin:      env.ALLOWED_ORIGINS,
  credentials: true,
  methods:     ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));
app.use(express.json());
app.use(cookieParser());

// Anti-CSRF: Require a custom header (X-Request-ID or X-Requested-With) for state-changing requests
app.use((req, res, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (!safeMethods.includes(req.method)) {
    const hasCustomHeader = !!req.headers["x-request-id"] || !!req.headers["x-requested-with"];
    const hasInternalKey = !!req.headers["x-internal-service-key"];
    if (!hasCustomHeader && !hasInternalKey) {
      return res.status(403).json({ 
        success: false, 
        error: { code: "CSRF_ERROR", message: "CSRF protection: missing custom header" } 
      });
    }
  }
  next();
});

// Request Tracing and Logging Middleware
app.use((req, res, next) => {
  const requestId = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  requestContext.run({ requestId }, () => next());
});

import { pinoHttp } from "pino-http";
app.use(
  pinoHttp({
    logger,
    customProps: (req, res) => {
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      const ipStr = Array.isArray(clientIp) ? clientIp[0] : clientIp;
      return {
        requestId: (req as any).requestId,
        clientIp: ipStr,
      };
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

import { messagesRootRouter } from "../domains/messages/routes/messages.root.js";
import { searchRouter } from "../domains/search/index.js";
import { moderationRouter } from "../domains/moderation/index.js";
import { notificationRoutes } from "../domains/notifications/index.js";

// Domain Routes
app.use("/api/auth", authRateLimiter, authRouter);
app.use("/api/user", readRateLimiter, usersRouter);
app.use("/api/conversations", readRateLimiter, conversationsRouter);
app.use("/api/conversations/:id/messages", readRateLimiter, messagesRouter);
app.use("/api/messages", readRateLimiter, messagesRootRouter);
app.use("/api/connections", readRateLimiter, connectionsRouter);
app.use("/api/calls", readRateLimiter, callsRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/moderation", authRateLimiter, moderationRouter);
app.use("/api/notifications", readRateLimiter, notificationRoutes);

// Internal Routes (Bypass Rate Limiting)
app.use("/internal/v1/messages", internalMessagesRouter);
app.use("/internal/v1/connections", internalConnectionsRouter);
app.use("/internal/v1/conversations", internalConversationsRouter);

// API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiSpec()));

// PUBLIC: Liveness probe â€” is the process alive?
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

// PUBLIC: Readiness probe â€” can the service handle traffic?
app.get("/ready", async (_req, res) => {
  let dbStatus = "UP";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "DOWN";
  }
  const httpStatus = dbStatus === "UP" ? 200 : 503;
  res.status(httpStatus).json({ status: dbStatus === "UP" ? "OK" : "ERROR", db: dbStatus });
});

// Global Error Handler must be the last middleware
app.use(globalErrorHandler);

export default app;
