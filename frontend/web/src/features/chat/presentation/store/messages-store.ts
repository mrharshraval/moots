import { create } from "zustand"

export interface User {
  id: string
  name: string | null
  username: string | null
  image: string | null
  email: string | null
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
  replyTo?: {
    id: string
    sender: "user" | "stranger"
    content: string
  }
}

export interface Conversation {
  id: string
  kind: string
  type: string
  name: string | null
  isPinned: boolean
  isArchived: boolean
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

interface MessagesState {
  conversations: Conversation[]
  isLoading: boolean
  error: string | null
  filter: "all" | "archived" | "requests" | "history"
  searchQuery: string
  selectedChatId: string | null
  
  nextCursor: string | null
  hasMore: boolean
  
  messagesByChatId: Record<string, Message[]>
  deletedChatIds: string[]
  
  setFilter: (filter: "all" | "archived" | "requests" | "history") => void
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
}

export const useMessagesStore = create<MessagesState>((set) => ({
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
          return { ...c, lastMessagePreview: message.content, updatedAt: message.createdAt || new Date().toISOString(), unreadCount: c.unreadCount + 1 }
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
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [conversationId]: messages,
      },
    }))
  },

  appendMessage: (conversationId: string, message: Message) => {
    set((state) => {
      const existing = state.messagesByChatId[conversationId] || []
      
      if (message.clientMessageId) {
        const index = existing.findIndex(m => m.clientMessageId === message.clientMessageId)
        if (index !== -1) {
          const updated = [...existing]
          updated[index] = { ...updated[index], ...message }
          return {
            messagesByChatId: { ...state.messagesByChatId, [conversationId]: updated },
          }
        }
      } else if (message.id) {
         const index = existing.findIndex(m => m.id === message.id)
         if (index !== -1) {
            const updated = [...existing]
            updated[index] = { ...updated[index], ...message }
            return {
              messagesByChatId: { ...state.messagesByChatId, [conversationId]: updated },
            }
         }
      }

      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [conversationId]: [...existing, message],
        },
      }
    })
  },

  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
    set((state) => {
      const existing = state.messagesByChatId[conversationId] || []
      return {
        messagesByChatId: {
          ...state.messagesByChatId,
          [conversationId]: existing.map((m) =>
            m.id === messageId || (m.clientMessageId && m.clientMessageId === messageId)
              ? { ...m, ...updates }
              : m
          ),
        },
      }
    })
  },
}))
