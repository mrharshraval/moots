export interface Participant {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  email: string | null;
}

export interface Conversation {
  id: string;
  kind: string;
  type: string;
  name: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  unreadCount: number;
  participants: Participant[];
  lastMessagePreview: string | null;
  lastMessageId: string | null;
  status: string;
  lastActivityAt: string;
  updatedAt: string;
  expiresAt: string | null;
}
