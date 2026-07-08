import { prisma } from "../../../database/index.js";
import { ReportTargetType } from "@prisma/client";

export class ModerationRepository {
  async createReport(reporterId: string, targetType: ReportTargetType, reason: string, messageId?: string) {
    return prisma.report.create({
      data: {
        reporterId,
        targetType,
        reason,
        messageId,
      },
    });
  }

  async createAuditLog(actorId: string | null, event: string, metadata: any, ip: string | null) {
    return prisma.auditLog.create({
      data: {
        actorId,
        event,
        metadata,
        ip,
      },
    });
  }
}
