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
    
    // Filter out hidden and left conversations
    filtered = filtered.filter(c => !c.hiddenAt && !c.leftAt)
    
    if (filter === "archived") {
      filtered = filtered.filter(c => c.isArchived)
    } else if (filter === "requests") {
      filtered = []
    } else if (filter === "history") {
      filtered = filtered.filter(c => c.kind === "MATCH" && c.status === "ENDED" && (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now()))
    } else {
      // "all" tab
      filtered = filtered.filter(c => c.kind !== "MATCH" && !c.isArchived && c.status !== "ENDED")
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
