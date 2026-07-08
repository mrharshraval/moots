import { z } from "zod";

export const SearchTypeSchema = z.enum(["all", "users", "conversations", "messages"]);

export const SearchQuerySchema = z.object({
  q: z.string().min(2, "Search query must be at least 2 characters long"),
  type: SearchTypeSchema.optional().default("all"),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
