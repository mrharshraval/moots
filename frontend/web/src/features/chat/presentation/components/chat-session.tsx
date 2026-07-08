"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/providers/auth-provider"
import { ArrowDown } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { useChatSession } from "@/features/chat/application/use-chat-session"
import { MessageList } from "@/features/chat/presentation/components/message-list"
import { ChatInput } from "@/features/chat/presentation/components/chat-input"
import { ActionBar } from "@/features/chat/presentation/components/action-bar"
import { SessionDisconnected } from "@/features/chat/presentation/components/session-disconnected"
import { TouchContextSheet } from "@/features/chat/presentation/components/touch-context-sheet"
import { useMatchmakingFlow } from "@/features/matchmaking"
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
    hasRevealedIdentity,
    partnerRevealedIdentity,
    connectionStatus,
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
    handleRevealIdentity,
    handleSendConnectionRequest,
    handleAcceptConnectionRequest,
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
    toggleCamera
  } = useChatSession(sessionId, session)

  const { startMatchmaking: startLocalMatching, cancelMatchmaking: cancelLocalMatching } = useMatchmakingFlow()

  // Page state computation
  const pageState = React.useMemo(() => {
    if (isStrangerDisconnected) return "disconnected"
    return isWsReady ? "active" : "matching"
  }, [isWsReady, isStrangerDisconnected])

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend(textareaRef)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Active or Disconnected (Engaged) */}
      {(pageState === "active" || (pageState === "disconnected" && isEngaged)) ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Action Bar */}
          {pageState === "active" && (
            <ActionBar
              partnerRevealedIdentity={partnerRevealedIdentity}
              connectionStatus={connectionStatus}
              hasRevealedIdentity={hasRevealedIdentity}
              isUserLoggedIn={!!session?.user}
              handleRevealIdentity={handleRevealIdentity}
              handleSendConnectionRequest={handleSendConnectionRequest}
              handleAcceptConnectionRequest={handleAcceptConnectionRequest}
              onVoiceCall={() => initiateCall("VOICE")}
              onVideoCall={() => initiateCall("VIDEO")}
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

            {/* Scenario 2: Engaged Conversation Ended Card */}
            {pageState === "disconnected" && isEngaged && (
              <SessionDisconnected 
                isEngaged={true} 
                peerDisplayName={peerDisplayName} 
                onFindMatch={() => startLocalMatching()}
                onChangeInterests={() => router.push("/chat")}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Scenario 1: No Engagement (Match Left) */}
      {pageState === "disconnected" && !isEngaged && (
        <SessionDisconnected 
          isEngaged={false} 
          peerDisplayName={peerDisplayName} 
          onFindMatch={() => startLocalMatching()}
          onChangeInterests={() => router.push("/chat")}
        />
      )}

      {/* Scroll to Bottom Button */}
      {showScrollBtn && pageState === "active" && (
        <Button variant="outline" size="icon" onClick={scrollToBottom} className="absolute bottom-28 left-1/2 -translate-x-1/2 size-9 rounded-full shadow-md z-30">
          <ArrowDown className="size-5" strokeWidth={2} />
        </Button>
      )}

      {/* Chat Input sticky bar */}
      {pageState === "active" && (
        <ChatInput
          inputText={inputText}
          handleInputChange={handleInputChange}
          handleKeyDown={handleKeyDown}
          editingMsg={editingMsg}
          setEditingMsg={setEditingMsg}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          peerDisplayName={peerDisplayName}
          send={() => handleSend(textareaRef)}
          isWsReady={isWsReady}
          setInputText={setInputText}
          textareaRef={textareaRef}
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
