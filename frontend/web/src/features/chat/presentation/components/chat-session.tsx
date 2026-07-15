"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/providers/auth-provider"

import { Button } from "@/shared/ui/button"
import { useChatSession } from "@/features/chat/application/use-chat-session"
import { MessageList } from "@/features/chat/presentation/components/message-list"
import { MessageComposer } from "@/features/chat/presentation/components/composer"
import { ActionBar } from "@/features/chat/presentation/components/action-bar"
import { SessionDisconnected } from "@/features/chat/presentation/components/session-disconnected"
import { TouchContextSheet } from "@/features/chat/presentation/components/touch-context-sheet"
import { useMatchmakingFlow } from "@/features/matchmaking"
import { useMatchmakingStore } from "@/features/matchmaking/presentation/store/matchmaking-store"
import { useMessagesStore } from "@/features/chat/presentation/store/messages-store"
import { ConversationRepository } from "@/features/conversations/repositories/conversation.repository"
import { CallOverlay } from "./call-overlay"

export interface ChatSessionProps {
  sessionId: string
}

export function ChatSession({ sessionId }: ChatSessionProps) {
  const router = useRouter()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const { data: session } = useSession()

  const {
    userId,
    peerDisplayName,
    peerUsername,
    isStrangerDisconnected,
    setIsStrangerDisconnected,
    isTyping,
    isWsReady,
    inputText,
    setInputText,
    replyingTo,
    setReplyingTo,
    editingMsg,
    setEditingMsg,
    expandedMsgs,
    toggleExpand,
    handleReact,
    handleInputChange,
    handleSend,
    messages,
    isEngaged,
    lastUserMsgId,
    // Calling features
    callState,
    callType,
    isAudioMuted,
    isVideoMuted,
    localStream,
    remoteStream,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    conversationStatus,
    endedByActorId
  } = useChatSession(sessionId, session)

  const { startMatchmaking: startLocalMatching, cancelMatchmaking: cancelLocalMatching } = useMatchmakingFlow()
  const matchedSessionId = useMatchmakingStore((state) => state.matchedSessionId)
  const isNewMatch = matchedSessionId === sessionId

  // Page state computation
  const pageState = React.useMemo(() => {
    if (isStrangerDisconnected || conversationStatus === "ENDED") return "disconnected"
    // Only return matching state for brand new matches that are still connecting.
    // Existing chats should instantly be "active" to prevent layout shifts.
    return (isWsReady || !isNewMatch) ? "active" : "matching"
  }, [isWsReady, isStrangerDisconnected, isNewMatch, conversationStatus])

  const disconnectScenario = React.useMemo(() => {
    const hasMessages = messages.length > 0
    if (endedByActorId === userId) {
      return hasMessages ? "you_ended" : "you_left_early"
    } else {
      return hasMessages ? "other_ended_engaged" : "other_left_early"
    }
  }, [endedByActorId, userId, messages.length])

  // Scroll details
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }

  const scrollToBottom = () =>
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })

  // Mobile Touch handlers
  const lastTapRef = React.useRef<{ time: number; msgId: string } | null>(null)
  const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const [activeTouchMessage, setActiveTouchMessage] = React.useState<any | null>(null)
  const [showTouchSheet, setShowTouchSheet] = React.useState(false)

  const getTouchHandlers = (msg: any) => {
    return {
      onTouchStart: () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = setTimeout(() => {
          setActiveTouchMessage(msg)
          setShowTouchSheet(true)
          if (typeof window !== "undefined" && navigator.vibrate) {
            navigator.vibrate(50)
          }
        }, 500)
      },
      onTouchEnd: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
        const now = Date.now()
        const lastTap = lastTapRef.current
        if (lastTap && lastTap.msgId === msg.id && now - lastTap.time < 300) {
          handleReact(msg.id, "❤️")
          lastTapRef.current = null
          if (typeof window !== "undefined" && navigator.vibrate) {
            navigator.vibrate([40, 40])
          }
        } else {
          lastTapRef.current = { time: now, msgId: msg.id }
        }
      },
      onTouchMove: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
      },
    }
  }

  const handleSkip = React.useCallback(async () => {
    try {
      if (conversationStatus !== "ENDED") {
        // Optimistically show the end screen
        useMessagesStore.getState().updateConversation(sessionId, { status: "ENDED" })
        await ConversationRepository.endConversation(sessionId)
      } else {
        // If they press skip and it's already ended, take them back to the pool
        useMatchmakingStore.getState().setStatus("idle")
        router.push("/chat")
      }
    } catch (err) {
      console.error("Failed to skip conversation", err)
      useMatchmakingStore.getState().setStatus("idle")
      router.push("/chat")
    }
  }, [sessionId, conversationStatus, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(textareaRef)
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleSkip()
    }
  }

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if they are typing in an input (except our own textarea which we handle above)
      if (e.key === "Escape" && e.target instanceof Element && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        handleSkip()
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [handleSkip])

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Connecting State (Matches MatchmakerView layout to prevent flicker for NEW matches only) */}
      {pageState === "matching" && isNewMatch && (
        <div className="absolute inset-0 z-50 flex flex-col items-center pt-[22vh] pb-8 px-4 bg-background h-full w-full">
          <div className="flex flex-col items-center w-full max-w-[420px] text-center">
            <div className="mb-[16px] flex justify-center">
              <img
                src="/brand/brand-marks/monochrome/Balck%20Filled.svg"
                alt="Moots"
                className="h-[72px] w-[72px] opacity-40 dark:hidden object-contain"
              />
              <img
                src="/brand/brand-marks/monochrome/White%20Filled.svg"
                alt="Moots"
                className="h-[72px] w-[72px] opacity-40 hidden dark:block object-contain"
              />
            </div>
            <h1 className="text-[18px] leading-[26px] font-semibold text-foreground mb-2">
              Match Found
            </h1>
            <p className="text-[16px] leading-[24px] font-normal text-muted-foreground mb-[24px] w-full max-w-[420px]">
              Connecting to chat...
            </p>
            <div className="w-full flex flex-col items-center">
              <div className="flex flex-col gap-4 mb-[24px] justify-center items-center">
                <span className="text-sm text-primary font-medium select-none animate-pulse">
                  Opening conversation
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Layout (Active or Matching) */}
      {(pageState === "active" || pageState === "matching") ? (
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* Action Bar */}
          {(pageState === "active" || pageState === "matching") && conversationStatus !== "ENDED" && (
            <ActionBar
              isUserLoggedIn={!!session?.user}
              onVoiceCall={() => initiateCall("AUDIO")}
              onVideoCall={() => initiateCall("VIDEO")}
              connectionStatus="none"
              handleSendConnectionRequest={() => {}}
              handleAcceptConnectionRequest={() => {}}
            />
          )}

          {/* Messages Scroll Area */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar">
            <MessageList
              messages={messages}
              userId={userId}
              peerDisplayName={peerDisplayName}
              lastUserMsgId={lastUserMsgId}
              expandedMsgs={expandedMsgs}
              toggleExpand={toggleExpand}
              handleReact={handleReact}
              setEditingMsg={setEditingMsg}
              setReplyingTo={setReplyingTo}
              setInputText={setInputText}
              textareaRef={textareaRef}
              getTouchHandlers={getTouchHandlers}
              isTyping={isTyping}
              pageState={pageState}
            />
          </div>
        </div>
      ) : null}

      {/* Disconnected End Screen */}
      {pageState === "disconnected" && (
        <SessionDisconnected 
          scenario={disconnectScenario}
          onContinue={() => router.push("/chat?startMatching=true&from=end_screen")}
        />
      )}



      {/* Chat Input sticky bar */}
      {pageState === "active" && conversationStatus !== "ENDED" && (
        <MessageComposer
          inputText={inputText}
          handleInputChange={handleInputChange}
          editingMsg={editingMsg}
          setEditingMsg={setEditingMsg}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          peerDisplayName={peerDisplayName}
          send={() => handleSend(textareaRef)}
          isWsReady={isWsReady}
          setInputText={setInputText}
          textareaRef={textareaRef}
          onSkip={handleSkip}
        />
      )}
      
      {/* Mobile Touch Context Sheet */}
      {showTouchSheet && activeTouchMessage && (
        <TouchContextSheet
          activeMessage={activeTouchMessage}
          userId={userId}
          handleReact={handleReact}
          setReplyingTo={setReplyingTo}
          setEditingMsg={setEditingMsg}
          setInputText={setInputText}
          textareaRef={textareaRef}
          onClose={() => setShowTouchSheet(false)}
        />
      )}

      {/* Call Overlay */}
      <CallOverlay
        callState={callState}
        callType={callType}
        peerDisplayName={peerDisplayName}
        localStream={localStream}
        remoteStream={remoteStream}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        acceptCall={acceptCall}
        declineCall={declineCall}
        endCall={endCall}
        toggleMute={toggleMute}
        toggleCamera={toggleCamera}
      />
    </div>
  )
}
