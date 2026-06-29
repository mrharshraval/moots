// Express module augmentation â€” adds req.user to all Request objects.
// Import this file once (it is imported by authenticate.middleware.ts).

import "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user: {
        actorId: string;
      };
    }
  }
}
