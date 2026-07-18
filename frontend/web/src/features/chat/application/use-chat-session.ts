"use client"

import * as React from "react"
import { Session } from "@/providers/auth-provider"
import { usePartnerStateStore } from "../presentation/store/partner-state-store"
import { useMessagesStore } from "@/features/chat"

// Sub-hooks
import { useWebSocketSession } from "./hooks/use-websocket-session"
import { useReadReceipts } from "./hooks/use-read-receipts"
import { useTypingIndicator } from "./hooks/use-typing-indicator"
import { useConnections } from "./hooks/use-connections"
import { useMediaStream } from "./hooks/use-media-stream"
import { useWebRTCCall } from "./hooks/use-webrtc-call"
import { useChatHistory } from "./hooks/use-chat-history"
import { useChatMessageState } from "./hooks/use-chat-message-state"
import { useChatComposer } from "./hooks/use-chat-composer"
import { useChatRealtimeSync } from "./hooks/use-chat-realtime-sync"


export function useChatSession(sessionId: string, session: Session | null) {
  // 1. Partner state store (Zustand) values needed for local computation or API compatibility
  const {
    peerNickname,
    peerUsername,
    peerActorId,
    isStrangerDisconnected,
    setIsStrangerDisconnected,
    isStrangerReconnecting,
    isReconnectingLocal,
    isWsReady,
    reset: resetPartnerState,
  } = usePartnerStateStore()

  // 2. Read receipts (focus/visibility triggers)
  const { sendReadReceipt } = useReadReceipts({ sessionId })

  // 3. WebSocket session lifecycle management
  useWebSocketSession({
    sessionId,
    session,
    onOpen: sendReadReceipt,
  })

  const { userId } = useChatHistory({ sessionId, session })
  
  const {
    replyingTo,
    setReplyingTo,
    editingMsg,
    setEditingMsg,
    expandedMsgs,
    toggleExpand,
    isEngaged,
    lastUserMsgId,
  } = useChatMessageState({ sessionId })

  const {
    inputText,
    setInputText,
    handleReact,
    handleInputChange,
    handleSend,
  } = useChatComposer({
    sessionId,
    isWsReady,
    replyingTo,
    editingMsg,
    setReplyingTo,
    setEditingMsg
  })


  // Realtime Sync logic (decoupled from service)
  useChatRealtimeSync(sessionId, userId, sendReadReceipt)

  // 5. Typing indicator listeners and cleanup
  const { isTyping } = useTypingIndicator({ sessionId })

  // 6. Connection request actions
  const {
    connectionStatus,
    handleSendConnectionRequest,
    handleAcceptConnectionRequest,
  } = useConnections({
    sessionId,
    session,
  })

  // 7. Media capture controls (mic/camera)
  const {
    localStream,
    localStreamRef,
    isAudioMuted,
    isVideoMuted,
    acquireStream,
    releaseStream,
    toggleMute,
    toggleCamera,
  } = useMediaStream()

  // 8. WebRTC Call states and signaling loop
  const {
    callState,
    callType,
    callId,
    remoteStream,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
  } = useWebRTCCall({
    sessionId,
    peerActorId,
    localStream,
    localStreamRef,
    acquireStream,
    releaseStream,
  })

  // 9. Peer display name computation
  const peerDisplayName = React.useMemo(() => {
    return peerUsername || peerNickname
  }, [peerUsername, peerNickname])

  // 10. Partner store cleanup on session change and unmount
  React.useEffect(() => {
    return () => {
      resetPartnerState()
    }
  }, [sessionId, resetPartnerState])

  const conversation = useMessagesStore((state) => 
    state.conversations?.find((c) => c.id === sessionId)
  )
  const conversationStatus = conversation?.status || "ACTIVE"
  const endedByActorId = conversation?.endedByActorId || null

  return {
    userId,
    peerNickname,
    peerUsername,
    peerDisplayName,
    isStrangerDisconnected,
    setIsStrangerDisconnected,
    isStrangerReconnecting,
    isReconnectingLocal,
    isTyping,
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
    handleSendConnectionRequest,
    handleAcceptConnectionRequest,
    handleInputChange,
    handleSend,
    isEngaged,
    lastUserMsgId,
    conversationStatus,
    endedByActorId,
    // Calling features
    callState,
    callType,
    callId,
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
  }
}
