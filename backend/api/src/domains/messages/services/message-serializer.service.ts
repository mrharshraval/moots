import { IdentityState } from "@prisma/client";
import { Message, Persona, UserProfile, SerializedMessage } from "../types/message.types.js";

export class MessageSerializer {
  serialize(
    message:    Message,
    revealMap:  Map<string, IdentityState>,  // participantId â†’ state
    personaMap: Map<string, Persona>,        // participantId â†’ persona
    profileMap: Map<string, UserProfile>,    // participantId â†’ profile (only if REVEALED)
  ): SerializedMessage {

    const state  = revealMap.get(message.senderParticipantId);
    
    // If state is REVEALED or VERIFIED, or ORGANIZATION, we return profile
    // Else we return persona
    const isRevealed = state === 'REVEALED' || state === 'VERIFIED' || state === 'ORGANIZATION';
    
    const sender = isRevealed
      ? { type: 'profile' as const, data: profileMap.get(message.senderParticipantId) }
      : { type: 'persona' as const, data: personaMap.get(message.senderParticipantId) };

    return {
      id:      message.id,
      sender,
      content: message.content,
      sentAt:  message.createdAt,
    };
  }
}
