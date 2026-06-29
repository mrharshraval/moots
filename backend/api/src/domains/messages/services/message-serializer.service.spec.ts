import { describe, it, expect } from 'vitest';
import { MessageSerializer } from './message-serializer.service.js';
import { IdentityState } from '@prisma/client';
import { Message, Persona, UserProfile } from '../types/message.types.js';

describe('MessageSerializer', () => {
  it('should serialize with persona if state is ANONYMOUS', () => {
    const serializer = new MessageSerializer();
    const msg = { id: 'msg1', senderParticipantId: 'p1', content: 'hello', createdAt: new Date() } as Message;
    
    const revealMap = new Map<string, IdentityState>();
    revealMap.set('p1', 'ANONYMOUS');
    
    const personaMap = new Map<string, Persona>();
    personaMap.set('p1', { displayName: 'Ghost', avatarSeed: '123' } as Persona);
    
    const profileMap = new Map<string, UserProfile>();

    const result = serializer.serialize(msg, revealMap, personaMap, profileMap);

    expect(result.id).toBe('msg1');
    expect(result.content).toBe('hello');
    expect(result.sender.type).toBe('persona');
    if (result.sender.type === 'persona') {
      expect(result.sender.data?.displayName).toBe('Ghost');
    }
  });

  it('should serialize with profile if state is REVEALED', () => {
    const serializer = new MessageSerializer();
    const msg = { id: 'msg2', senderParticipantId: 'p2', content: 'world', createdAt: new Date() } as Message;
    
    const revealMap = new Map<string, IdentityState>();
    revealMap.set('p2', 'REVEALED');
    
    const personaMap = new Map<string, Persona>();
    const profileMap = new Map<string, UserProfile>();
    profileMap.set('p2', { name: 'Alice', username: 'alice' } as UserProfile);

    const result = serializer.serialize(msg, revealMap, personaMap, profileMap);

    expect(result.sender.type).toBe('profile');
    if (result.sender.type === 'profile') {
      expect(result.sender.data?.name).toBe('Alice');
    }
  });
});
