import { z } from "zod";

export const ReportTargetTypeSchema = z.enum(["MESSAGE", "ACTOR"]);

export const CreateReportSchema = z.object({
  body: z.object({
    targetType: ReportTargetTypeSchema,
    messageId: z.string().optional(),
    reason: z.string().min(5, "Reason must be at least 5 characters long"),
  }).refine((data) => {
    if (data.targetType === "MESSAGE" && !data.messageId) {
      return false;
    }
    return true;
  }, {
    message: "messageId is required when reporting a message",
    path: ["messageId"],
  })
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
