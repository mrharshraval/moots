import { z } from "zod";

export const UpdateSettingsSchema = z.object({
  body: z.object({
    username: z.string().optional(),
    name:     z.string().optional(),
    bio:      z.string().optional(),
    image:    z.string().url("Invalid image URL").optional(),
  }),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>["body"];
