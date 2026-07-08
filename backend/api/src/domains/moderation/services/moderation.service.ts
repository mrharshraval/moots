import { ModerationRepository } from "../repositories/moderation.repository.js";
import { CreateReportInput } from "../dto/moderation.dto.js";
import { ReportTargetType } from "@prisma/client";

export class ModerationService {
  private repository = new ModerationRepository();

  async reportTarget(reporterId: string, data: CreateReportInput["body"], ip: string) {
    const report = await this.repository.createReport(
      reporterId,
      data.targetType as ReportTargetType,
      data.reason,
      data.messageId
    );

    await this.repository.createAuditLog(
      reporterId,
      "REPORT_CREATED",
      { reportId: report.id, targetType: data.targetType, messageId: data.messageId },
      ip
    );

    return report;
  }
}
