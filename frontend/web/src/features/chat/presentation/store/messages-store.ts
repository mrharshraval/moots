import { create } from "zustand"

export interface User {
  id: string
  name: string | null
  username: string | null
  image: string | null
  email: string | null
}

export interface ReplyReference {
  id: string
  type: string
  content: string
  sender: "user" | "stranger"
  edited: boolean
  deleted: boolean
}

export interface Message {
  id: string
  clientMessageId?: string
  conversationId?: string
  senderId?: string
  sender: "user" | "stranger"
  status?: "SENDING" | "DELIVERED" | "PERSISTED" | "FAILED"
  content: string
  time: string
  createdAt?: string
  updatedAt?: string
  seen?: boolean
  edited?: boolean
  reactions?: Record<string, string[]>
  reply?: ReplyReference
}

export function mapSerializedMessage(payload: any, currentUserId: string): Message {
  const senderId = payload.senderActorId || payload.sender?.data?.actorId;
  const isUser = senderId === currentUserId;

  let mappedReply: ReplyReference | undefined = undefined;
  if (payload.reply) {
    const replySenderId = payload.reply.senderActorId || payload.reply.sender?.data?.actorId;
    const isReplyUser = replySenderId === currentUserId;
    
    mappedReply = {
      id: payload.reply.id,
      type: payload.reply.type || "TEXT",
      content: payload.reply.content,
      sender: isReplyUser ? "user" : "stranger",
      edited: payload.reply.edited || false,
      deleted: payload.reply.deleted || false,
    };
  }

  return {
    id: payload.id,
    clientMessageId: payload.clientMessageId,
    status: payload.status || "DELIVERED",
    sender: isUser ? "user" : "stranger",
    content: payload.content,
    time: payload.time || payload.sentAt || new Date().toISOString(),
    seen: payload.seen || false,
    edited: payload.edited || false,
    reactions: payload.reactions || {},
    reply: mappedReply,
  };
}

export interface Conversation {
  id: string
  kind: string
  type: string
  name: string | null
  isPinned: boolean
  isArchived: boolean
  isFavorited: boolean
  isMuted: boolean
  unreadCount: number
  participants: User[]
  lastMessagePreview: string | null
  lastMessageId: string | null
  status: string
  lastActivityAt: string
  updatedAt: string
  hiddenAt: string | null
  leftAt: string | null
  endedAt: string | null
  expiresAt: string | null
  endedByActorId: string | null
}

interface NormalizedMessages {
  byId: Record<string, Message>
  allIds: string[]
}

interface MessagesState {
  conversations: Conversation[]
  isLoading: boolean
  error: string | null
  filter: "all" | "archived" | "requests" | "history" | "favorites"
  searchQuery: string
  selectedChatId: string | null
  
  nextCursor: string | null
  hasMore: boolean
  
  messagesByChatId: Record<string, NormalizedMessages>
  deletedChatIds: string[]
  
  setFilter: (filter: "all" | "archived" | "requests" | "history" | "favorites") => void
  setSearchQuery: (query: string) => void
  setSelectedChatId: (id: string | null) => void
  setConversations: (conversations: Conversation[], nextCursor: string | null, hasMore: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  
  addMessage: (conversationId: string, message: Message) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  appendMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void
  deleteMessage: (conversationId: string, messageId: string) => void
}

export const useMessagesStore = create<MessagesState>()((set) => ({
  conversations: [],
  isLoading: false,
  error: null,
  filter: "all",
  searchQuery: "",
  selectedChatId: null,

  nextCursor: null,
  hasMore: true,

  messagesByChatId: {},
  deletedChatIds: [],

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedChatId: (selectedChatId) => set({ selectedChatId }),
  setConversations: (conversations, nextCursor, hasMore) => set({ conversations, nextCursor, hasMore }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addMessage: (conversationId: string, message: Message) => {
    set((state) => ({
      conversations: (state.conversations || []).map((c) => {
        if (c.id === conversationId) {
          return { 
            ...c, 
            lastMessagePreview: message.content, 
            updatedAt: message.createdAt || new Date().toISOString(), 
            unreadCount: message.sender === "user" ? c.unreadCount : c.unreadCount + 1 
          }
        }
        return c
      }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }))
  },

  updateConversation: (id: string, updates: Partial<Conversation>) => {
    set((state) => ({
      conversations: (state.conversations || []).map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }))
  },

  setMessages: (conversationId: string, messages: Message[]) => {
    const byId: Record<string, Message> = {}
    const allIds: string[] = []
    messages.forEach((m) => {
      const key = m.id || m.clientMessageId
      if (key) {
        byId[key] = m
        allIds.push(key)
      }
    })
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [conversationId]: { byId, allIds },
      },
    }))
  },

  appendMessage: (conversationId: string, message: Message) => {
    set((state) => {
      const existing = state.messagesByChatId[conversationId] || { byId: {}, allIds: [] }
      const key = message.clientMessageId || message.id
      if (!key) return state

      // Is it a brand new message?
      if (!existing.byId[message.id] && (!message.clientMessageId || !existing.byId[message.clientMessageId])) {
        // It does not exist by ID nor by clientMessageId, append it.
        return {
          messagesByChatId: {
            ...state.messagesByChatId,
            [conversationId]: {
              byId: { ...existing.byId, [key]: message },
              allIds: [...existing.allIds, key],
            },
          },
        }
      }

      // It exists. We need to find the old key.
      const oldKey = existing.byId[message.id] 
        ? message.id 
        : (message.clientMessageId && existing.byId[message.clientMessageId] 
            ? message.clientMessageId 
            : null);

      if (oldKey) {
        const newKey = message.id || oldKey; // prefer the real ID
        
        const newById = { ...existing.byId }
        const updatedMsg = { ...newById[oldKey], ...message }
        
        if (newKey !== oldKey) {
          // Remap the key
          delete newById[oldKey]
          newById[newKey] = updatedMsg
          
          const newAllIds = existing.allIds.map(id => id === oldKey ? newKey : id)
          
          return {
            messagesByChatId: {
              ...state.messagesByChatId,
              [conversationId]: {
                byId: newById,
                allIds: newAllIds,
              }
            }
          }
        } else {
          // Same key
          newById[oldKey] = updatedMsg
          return {
            messagesByChatId: {
              ...state.messagesByChatId,
              [conversationId]: {
                ...existing,
                byId: newById,
              }
            }
          }
        }
      }

      return state;
    })
  },

  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
    set((state) => {
      const existing = state.messagesByChatId[conversationId]
      if (!existing) return state
      
      const msgToUpdate = existing.byId[messageId]
      if (!msgToUpdate) return state

      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [conversationId]: {
            ...existing,
            byId: {
              ...existing.byId,
              [messageId]: { ...msgToUpdate, ...updates },
            },
          },
        },
      }
    })
  },

  deleteMessage: (conversationId: string, messageId: string) => {
    set((state) => {
      const existing = state.messagesByChatId[conversationId]
      if (!existing) return state

      const newById = { ...existing.byId }
      delete newById[messageId]

      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [conversationId]: {
            ...existing,
            byId: newById,
            allIds: existing.allIds.filter((id) => id !== messageId),
          },
        },
      }
    })
  },
}))
