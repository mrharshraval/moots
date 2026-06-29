import { ContentType, IdentityState } from "@prisma/client";

export interface Message {
  id:                  string;
  conversationId:      string;
  senderParticipantId: string;
  content:             string;
  contentType:         ContentType;
  replyToId:           string | null;
  clientMessageId:     string;
  createdAt:           Date;
  deletedAt:           Date | null;
}

export interface Persona {
  participantId: string;
  displayName:   string;
  avatarSeed:    string;
  color:         string;
}

export interface UserProfile {
  id:          string;
  name:        string | null;
  username:    string | null;
  image:       string | null;
}

export interface SerializedMessage {
  id:      string;
  sender:  { type: 'persona', data: Persona | undefined } | { type: 'profile', data: UserProfile | undefined };
  content: string;
  sentAt:  Date;
}
