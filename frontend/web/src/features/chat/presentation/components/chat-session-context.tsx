"use client"

import * as React from "react"
import { useChatSession } from "@/features/chat/application/use-chat-session"
import { useSession } from "@/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useChatScroll } from "@/features/chat/application/hooks/use-chat-scroll"
import { useMatchmakingStore } from "@/features/matchmaking/presentation/store/matchmaking-store"
import { useMessagesStore } from "@/features/chat/presentation/store/messages-store"
import { useConversationActions } from "@/features/conversations/hooks/use-conversation-actions"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export interface ChatSessionContextValue extends ReturnType<typeof useChatSession> {
  sessionId: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  pageState: "history" | "disconnected" | "active" | "matching";
  disconnectScenario: "you_ended" | "you_left_early" | "other_ended_engaged" | "other_left_early";
  handleSkip: () => void;
  // Scroll
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showScrollBtn: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  // Wrapped action
  handleSendWrapped: () => void;
}

const ChatSessionContext = React.createContext<ChatSessionContextValue | null>(null)

export function useChatSessionContext() {
  const context = React.useContext(ChatSessionContext)
  if (!context) {
    throw new Error("useChatSessionContext must be used within a ChatSessionProvider")
  }
  return context
}

export function ChatSessionProvider({ sessionId, children }: { sessionId: string; children: React.ReactNode }) {
  const router = useRouter()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const { data: session } = useSession()

  const chatSessionData = useChatSession(sessionId, session)
  const {
    userId,
    isStrangerDisconnected,
    isWsReady,
    isEngaged,
    handleReact,
    handleSend,
    conversationStatus,
    endedByActorId,
  } = chatSessionData

  const matchedSessionId = useMatchmakingStore((state) => state.matchedSessionId)
  const isNewMatch = matchedSessionId === sessionId
  
  const { endConversation } = useConversationActions()

  // 1. Scroll logic
  const { scrollRef, showScrollBtn, handleScroll, scrollToBottom } = useChatScroll({ sessionId })

  // 3. Page state computation
  const pageState = React.useMemo(() => {
    if (conversationStatus === "ENDED" && !isNewMatch) return "history"
    if (isStrangerDisconnected || conversationStatus === "ENDED") return "disconnected"
    return (isWsReady || !isNewMatch) ? "active" : "matching"
  }, [isWsReady, isStrangerDisconnected, isNewMatch, conversationStatus])

  const disconnectScenario = React.useMemo(() => {
    if (endedByActorId === userId) {
      return isEngaged ? "you_ended" : "you_left_early"
    } else {
      return isEngaged ? "other_ended_engaged" : "other_left_early"
    }
  }, [endedByActorId, userId, isEngaged])

  // 4. Skip/Leave Handler
  const handleSkip = React.useCallback(async () => {
    try {
      if (conversationStatus !== "ENDED") {
        useMessagesStore.getState().updateConversation(sessionId, { status: "ENDED" })
        if (wsGateway && wsGateway.readyState === WebSocket.OPEN) {
          wsGateway.send("leave-chat", { sessionId })
        }
        await endConversation(sessionId)
      } else {
        useMatchmakingStore.getState().setStatus("idle")
        router.push("/chat")
      }
    } catch (err) {
      console.error("Failed to skip conversation", err)
      useMatchmakingStore.getState().setStatus("idle")
      router.push("/chat")
    }
  }, [sessionId, conversationStatus, router, endConversation])

  const handleSendWrapped = React.useCallback(() => {
    handleSend(textareaRef)
  }, [handleSend, textareaRef])

  const value: ChatSessionContextValue = {
    ...chatSessionData,
    sessionId,
    textareaRef,
    pageState,
    disconnectScenario,
    handleSkip,
    scrollRef,
    showScrollBtn,
    scrollToBottom,
    handleScroll,
    handleSendWrapped,
  }

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  )
}
