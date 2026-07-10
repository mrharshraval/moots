"use client"

import * as React from "react"
import { Session } from "@/providers/auth-provider"
import { usePartnerStateStore } from "../presentation/store/partner-state-store"

// Sub-hooks
import { useWebSocketSession } from "./hooks/use-websocket-session"
import { useReadReceipts } from "./hooks/use-read-receipts"
import { useTypingIndicator } from "./hooks/use-typing-indicator"
import { useIdentityReveal } from "./hooks/use-identity-reveal"
import { useMediaStream } from "./hooks/use-media-stream"
import { useWebRTCCall } from "./hooks/use-webrtc-call"
import { useChatMessages } from "./hooks/use-chat-messages"

export function useChatSession(sessionId: string, session: Session | null) {
  // 1. Partner state store (Zustand) values needed for local computation or API compatibility
  const {
    peerNickname,
    peerUsername,
    isStrangerDisconnected,
    setIsStrangerDisconnected,
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

  // 4. Chat messages, status updates, sending/editing messages
  const {
    userId,
    inputText,
    setInputText,
    replyingTo,
    setReplyingTo,
    editingMsg,
    setEditingMsg,
    expandedMsgs,
    peerActorId,
    messages,
    isEngaged,
    lastUserMsgId,
    toggleExpand,
    handleReact,
    handleInputChange,
    handleSend,
  } = useChatMessages({
    sessionId,
    isWsReady,
    sendReadReceipt,
  })

  // 5. Typing indicator listeners and cleanup
  const { isTyping } = useTypingIndicator({ sessionId })

  // 6. Identity reveal and connection request actions
  const {
    hasRevealedIdentity,
    partnerRevealedIdentity,
    connectionStatus,
    handleRevealIdentity,
    handleSendConnectionRequest,
    handleAcceptConnectionRequest,
  } = useIdentityReveal({
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

  // 10. Partner store cleanup on unmount
  React.useEffect(() => {
    return () => {
      resetPartnerState()
    }
  }, [resetPartnerState])

  return {
    userId,
    peerNickname,
    peerUsername,
    peerDisplayName,
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
