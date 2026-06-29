import { Capability } from "../constants/capabilities.js";
import { ConversationPolicy } from "../types/conversation-policy.types.js";
import { POLICIES } from "../presets/default-policies.js";
import { prisma } from "../../../database/index.js";
import { AppError } from "../../../shared/errors/AppError.js";

export class CapabilityDeniedError extends AppError {
  constructor(context: { capability: Capability; policyId: string }) {
    super(
      `Capability '${context.capability}' is not granted by policy '${context.policyId}'`,
      403,
      'CAPABILITY_DENIED',
      context
    );
  }
}

export class PolicyService {
  async assertCapability(
    conversationId: string,
    capability:     Capability,
    actorId?:       string
  ): Promise<void> {
    const policy = await this.getPolicyForConversation(conversationId);

    if (!policy.capabilities.has(capability)) {
      await prisma.auditLog.create({
        data: {
          actorId: actorId || null,
          event: "CAPABILITY_DENIED",
          metadata: { conversationId, capability, policyId: policy.id },
        }
      });

      throw new CapabilityDeniedError({
        capability,
        policyId:   policy.id,
      });
    }
  }

  async getPolicyForConversation(conversationId: string): Promise<ConversationPolicy> {
    const conv = await prisma.conversation.findUniqueOrThrow({
      where:  { id: conversationId },
      select: { policyId: true },
    });
    const policy = Object.values(POLICIES).find(p => p.id === conv.policyId);
    if (!policy) {
      throw new Error(`Policy ${conv.policyId} not found`);
    }
    return policy;
  }
}
