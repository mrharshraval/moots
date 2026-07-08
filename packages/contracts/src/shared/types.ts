export type ActorType = "USER" | "GUEST" | "BOT" | "SUPPORT" | "AI";
export type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED" | "REMOVED";
export type ConversationStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type ConversationType = "DIRECT" | "GROUP";
export type IdentityState = "ANONYMOUS" | "PENDING_REVEAL" | "REVEALED" | "VERIFIED" | "ORGANIZATION";
export type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER";
export type ContentType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
export type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
export type ReceiptStatus = "SENT" | "DELIVERED" | "READ";
export type CallType = "AUDIO" | "VIDEO";
export type CallStatus = "RINGING" | "ONGOING" | "ENDED" | "MISSED" | "DECLINED";
export type ReportTargetType = "MESSAGE" | "ACTOR";
export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

// Common DTOs
export interface ActorDto {
  id: string;
  type: ActorType;
}

export interface UserDto {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
}

export interface ParticipantDto {
  id: string;
  actorId: string;
  conversationId: string;
  role: ParticipantRole;
  identityState: IdentityState;
  persona: {
    displayName: string;
    avatarSeed: string;
    color: string | null;
  } | null;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderParticipantId: string | null;
  senderDisplayNameSnapshot: string | null;
  content: string;
  contentType: ContentType;
  clientMessageId: string;
  createdAt: string;
  isEdited: boolean;
  replyToId: string | null;
  metadata: {
    mentions?: string[];
    linkPreview?: {
      title: string;
      url: string;
      image?: string;
    };
  } | null;
  receipts?: Record<string, ReceiptStatus>; // mapping of actorId to ReceiptStatus
}

export interface ConversationDto {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  status: ConversationStatus;
  lastMessageId: string | null;
  lastMessagePreview: string | null;
  lastActivityAt: string;
}
