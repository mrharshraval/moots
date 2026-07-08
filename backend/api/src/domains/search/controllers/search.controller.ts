import { Request, Response } from "express";
import { SearchService } from "../services/search.service.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { sendSuccess, sendError } from "../../../shared/utils/response.js";
import { SearchQuerySchema } from "../dto/search.dto.js";

export class SearchController {
  private service = new SearchService();

  search = asyncHandler(async (req: Request, res: Response) => {
    const actorId = req.user?.actorId;
    if (!actorId) {
      return sendError(res, "UNAUTHORIZED", "Not authenticated", [], 401);
    }

    const validation = SearchQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, "VALIDATION_ERROR", "Invalid search query", validation.error.issues, 400);
    }

    const results = await this.service.search(validation.data, actorId);
    return sendSuccess(res, results);
  });
}
