import { Message, Persona, SerializedMessage, ReplyReference } from '../dto/message.types.js';

export class MessageSerializer {
  serialize(
    message:    Message & { replyTo?: any, receipts?: any, sender?: any },
    personaMap: Map<string, Persona>,
  ): SerializedMessage {

    const personaData = personaMap.get(message.senderParticipantId);
    const sender = { 
      type: 'persona' as const, 
      data: {
        ...personaData,
        actorId: message.sender?.actorId,
      }
    };

    const serialized: SerializedMessage = {
      id:      message.id,
      sender,
      content: message.content,
      sentAt:  message.createdAt,
      metadata: (message as any).metadata,
      receipts: message.receipts?.reduce((acc: any, r: any) => {
        acc[r.actorId] = r.status;
        return acc;
      }, {})
    };

    if (message.replyTo) {
      serialized.reply = this.serializeReply(message.replyTo, personaMap);
    }

    return serialized;
  }

  private serializeReply(
    replyMessage: any,
    personaMap: Map<string, Persona>
  ): ReplyReference {
    const personaData = personaMap.get(replyMessage.senderParticipantId);
    const sender = { 
      type: 'persona' as const, 
      data: {
        ...personaData,
        actorId: replyMessage.sender?.actorId,
      }
    };

    return {
      id: replyMessage.id,
      type: replyMessage.contentType,
      content: replyMessage.content,
      sender,
      edited: replyMessage.isEdited || false,
      deleted: replyMessage.deletedAt !== null,
    };
  }
}
