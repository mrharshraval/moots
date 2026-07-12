"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { ChatSession } from "@/features/chat"
import { MatchmakerView } from "@/features/matchmaking"
import { useMessagesStore } from "@/features/chat/presentation/store/messages-store"

export default function ChatSessionPage() {
  const params = useParams()
  const sessionId = params?.sessionId as string

  const deletedChatIds = useMessagesStore(state => state.deletedChatIds)
  
  const isDeleted = deletedChatIds.includes(sessionId)

  React.useEffect(() => {
    if (isDeleted && typeof window !== 'undefined' && window.location.pathname !== '/chat') {
      window.history.replaceState(null, '', '/chat')
    }
  }, [isDeleted])
  
  if (isDeleted) {
    // Render the empty state directly. This naturally unmounts ChatSession,
    // which cleans up all websockets, timers, and active resources automatically.
    return <MatchmakerView />
  }

  return <ChatSession sessionId={sessionId} />
}
