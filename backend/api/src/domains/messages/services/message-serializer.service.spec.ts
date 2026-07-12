import { describe, it, expect } from 'vitest';
import { MessageSerializer } from './message-serializer.service.js';
import { Message, Persona, UserProfile } from "../dto/message.types.js";

describe('MessageSerializer', () => {
  it('should serialize with persona', () => {
    const serializer = new MessageSerializer();
    const msg = { id: 'msg1', senderParticipantId: 'p1', content: 'hello', createdAt: new Date() } as Message;
    
    const personaMap = new Map<string, Persona>();
    personaMap.set('p1', { displayName: 'Ghost', avatarSeed: '123' } as Persona);

    const result = serializer.serialize(msg, personaMap);

    expect(result.id).toBe('msg1');
    expect(result.content).toBe('hello');
    expect(result.sender.type).toBe('persona');
    if (result.sender.type === 'persona') {
      expect(result.sender.data?.displayName).toBe('Ghost');
    }
  });

  it('should serialize without persona if not found', () => {
    const serializer = new MessageSerializer();
    const msg = { id: 'msg2', senderParticipantId: 'p2', content: 'world', createdAt: new Date() } as Message;
    
    const personaMap = new Map<string, Persona>();

    const result = serializer.serialize(msg, personaMap);

    expect(result.sender.type).toBe('persona');
    if (result.sender.type === 'persona') {
      expect(result.sender.data).toBeUndefined();
    }
  });
});
