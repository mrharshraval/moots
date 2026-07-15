import * as React from "react"
import { useMessagesStore } from "@/features/chat"
import { ConversationRepository } from "../repositories/conversation.repository"

export function useConversations() {
  const filter = useMessagesStore((state) => state.filter)
  const setFilter = useMessagesStore((state) => state.setFilter)
  const searchQuery = useMessagesStore((state) => state.searchQuery)
  const setSearchQuery = useMessagesStore((state) => state.setSearchQuery)
  const conversations = useMessagesStore((state) => state.conversations)
  const isLoading = useMessagesStore((state) => state.isLoading)
  const hasMore = useMessagesStore((state) => state.hasMore)
  const nextCursor = useMessagesStore((state) => state.nextCursor)

  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  const [now, setNow] = React.useState(Date.now())

  React.useEffect(() => {
    ConversationRepository.fetchConversations().catch(console.error)
    
    // Timer to re-evaluate expiresAt periodically
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    if (!hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const state = useMessagesStore.getState()
        if (entries[0].isIntersecting && nextCursor && !state.isLoading) {
          ConversationRepository.fetchConversations(nextCursor).catch(console.error)
        }
      },
      { threshold: 1.0 }
    )

    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    observerRef.current = observer

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [hasMore, nextCursor])

  const filteredConversations = React.useMemo(() => {
    let filtered = conversations || []
    
    // Always exclude conversations the user has left
    filtered = filtered.filter(c => !c.leftAt)

    if (filter === "archived") {
      // Archived: archivedAt is set (represented as isArchived boolean from API)
      filtered = filtered.filter(c => c.isArchived)
    } else if (filter === "favorites") {
      // Favorites: favoritedAt is set (represented as isFavorited boolean from API)
      filtered = filtered.filter(c => c.isFavorited)
    } else if (filter === "requests") {
      // Requests are derived from the connections/group-requests APIs, not conversations
      filtered = []
    } else if (filter === "history") {
      // History: MATCH conversations that have ENDED and haven't expired yet
      filtered = filtered.filter(c =>
        c.kind === "MATCH" &&
        c.status === "ENDED" &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > now)
      )
    } else {
      // "all" tab spec: FRIEND/GROUP always visible + MATCH only if ACTIVE
      // Hidden (hiddenAt) and archived conversations are excluded
      filtered = filtered.filter(c =>
        !c.hiddenAt &&
        !c.isArchived &&
        (c.kind === "MATCH" ? c.status === "ACTIVE" : true)
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.participants.some(p => p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)) ||
        c.lastMessagePreview?.toLowerCase().includes(q)
      )
    }

    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      
      const timeA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
      const timeB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
      return timeB - timeA
    })
  }, [conversations, filter, searchQuery, now])

  return {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    filteredConversations,
    loadMoreRef,
    hasMore,
    updateSettings: ConversationRepository.updateConversationSettings,
    endConversation: ConversationRepository.endConversation,
    hideConversation: ConversationRepository.hideConversation
  }
}
