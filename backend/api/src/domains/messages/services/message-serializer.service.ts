import { Message, Persona, SerializedMessage } from '../dto/message.types.js';

export class MessageSerializer {
  serialize(
    message:    Message,
    personaMap: Map<string, Persona>,        // participantId â†’ persona
  ): SerializedMessage {

    const sender = { type: 'persona' as const, data: personaMap.get(message.senderParticipantId) };

    return {
      id:      message.id,
      sender,
      content: message.content,
      sentAt:  message.createdAt,
      metadata: (message as any).metadata,
      receipts: (message as any).receipts?.reduce((acc: any, r: any) => {
        acc[r.actorId] = r.status;
        return acc;
      }, {})
    };
  }
}
