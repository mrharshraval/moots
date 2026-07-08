import * as React from "react"
import { useMessagesStore, Message } from "../presentation/store/messages-store"
import { usePartnerStateStore } from "../presentation/store/partner-state-store"
import { ConversationRepository } from "@/features/conversations/repositories/conversation.repository"
import { ChatApi } from "../api/chat-api"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { getOrInitializeNickname } from "@/shared/utils/nickname"
import { Session } from "@/providers/auth-provider"

export function useChatSession(sessionId: string, session: Session | null) {
  const [userId, setUserId] = React.useState("")
  const [inputText, setInputText] = React.useState("")
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = React.useState<Message | null>(null)
  const [expandedMsgs, setExpandedMsgs] = React.useState<Set<string>>(new Set())

  // Zustand stores
  const messages = useMessagesStore((state) => state.messagesByChatId[sessionId]) ?? []
  const {
    peerNickname,
    peerUsername,
    isStrangerDisconnected,
    setIsStrangerDisconnected,
    isTyping,
    hasRevealedIdentity,
    partnerRevealedIdentity,
    connectionStatus,
    isWsReady,
    setPeerIdentity,
    setIsTyping,
    setHasRevealedIdentity,
    setPartnerRevealedIdentity,
    setConnectionStatus,
    setIsWsReady,
    reset: resetPartnerState
  } = usePartnerStateStore()

  const setMessages = React.useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    if (typeof updater === "function") {
      useMessagesStore.getState().setMessages(sessionId, updater(useMessagesStore.getState().messagesByChatId[sessionId] || []))
    } else {
      useMessagesStore.getState().setMessages(sessionId, updater)
    }
  }, [sessionId])

  const peerDisplayName = React.useMemo(() => {
    return peerUsername || peerNickname
  }, [peerUsername, peerNickname])

  const isEngaged = React.useMemo(() => {
    return messages.some((m) => m.sender === "user") && messages.some((m) => m.sender === "stranger")
  }, [messages])

  const lastUserMsgId = React.useMemo(() => {
    return [...messages].reverse().find((m) => m.sender === "user")?.id
  }, [messages])

  const sendReadReceipt = React.useCallback(() => {
    if (wsGateway.readyState === WebSocket.OPEN && document.visibilityState === "visible") {
      wsGateway.send("read-messages", { sessionId })
    }
  }, [sessionId])

  const handleReact = React.useCallback((id: string, emoji: string) => {
    if (wsGateway && isWsReady) {
      wsGateway.send("send-reaction", { sessionId, messageId: id, emoji })
    }
  }, [sessionId, isWsReady])

  const handleRevealIdentity = React.useCallback(() => {
    if (!session?.user) return
    wsGateway.send("participant:identity-revealed", {
      sessionId,
      username: session.user.name || (session.user as any).username,
      name: session.user.name,
      image: session.user.image,
    })
    setHasRevealedIdentity(true)
  }, [sessionId, session, setHasRevealedIdentity])

  const handleSendConnectionRequest = React.useCallback(() => {
    wsGateway.send("connection:request", { sessionId })
    setConnectionStatus("pending_sent")
  }, [sessionId, setConnectionStatus])

  const handleAcceptConnectionRequest = React.useCallback(() => {
    wsGateway.send("connection:accepted", { sessionId })
    setConnectionStatus("accepted")
  }, [sessionId, setConnectionStatus])

  const handleInputChange = React.useCallback((val: string) => {
    setInputText(val)
    if (wsGateway && isWsReady) {
      wsGateway.send("typing-status", { sessionId, isTyping: val.trim().length > 0 })
    }
  }, [sessionId, isWsReady])

  const handleSend = React.useCallback((textareaRef: React.RefObject<HTMLTextAreaElement | null>) => {
    const text = inputText.trim()
    if (!text || !wsGateway || !isWsReady || wsGateway.readyState !== WebSocket.OPEN) return

    const clientMessageId = `msg-${Math.random().toString(36).slice(2, 11)}`

    if (editingMsg) {
      wsGateway.send("edit-message", {
        sessionId,
        messageId: editingMsg.id || editingMsg.clientMessageId,
        content: text,
      })
      useMessagesStore.getState().updateMessage(sessionId, editingMsg.id || editingMsg.clientMessageId || "", {
        content: text,
      })
      setEditingMsg(null)
    } else {
      const optimisticMsg: Message = {
        id: clientMessageId,
        clientMessageId,
        sender: "user",
        status: "SENDING",
        content: text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              sender: replyingTo.sender,
              content: replyingTo.content,
            }
          : undefined,
      }
      
      useMessagesStore.getState().appendMessage(sessionId, optimisticMsg)

      wsGateway.send("send-message", {
        sessionId,
        clientMessageId,
        content: text,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderId: replyingTo.sender === "user" ? userId : "stranger-id",
              content: replyingTo.content,
            }
          : undefined,
      })
      setReplyingTo(null)

      useMessagesStore.getState().updateConversation(sessionId, {
        lastMessagePreview: text,
        lastActivityAt: optimisticMsg.time,
        updatedAt: optimisticMsg.time,
      })
    }

    setInputText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    wsGateway.send("typing-status", { sessionId, isTyping: false })
  }, [inputText, isWsReady, editingMsg, sessionId, replyingTo, userId])

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedMsgs((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  React.useEffect(() => {
    let uId = sessionStorage.getItem("moots_userId")
    if (!uId) {
      uId = `user-${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem("moots_userId", uId)
    }
    setUserId(uId)

    const handleOpen = () => {
      setIsWsReady(true)
      wsGateway.send("join-chat", {
        nickname: getOrInitializeNickname(),
        username: session?.user?.name || (session?.user as any)?.username || undefined,
        sessionId
      })
      setTimeout(sendReadReceipt, 100)
    }

    const handleClose = () => {
      setIsWsReady(false)
    }

    const handleChatHistory = (payload: any) => {
      const history = payload.messages.map((m: any) => ({
        id: m.id,
        clientMessageId: m.clientMessageId,
        status: "PERSISTED",
        sender: m.senderId === uId ? "user" : "stranger",
        content: m.content,
        time: m.time,
        seen: m.seen,
        edited: m.edited,
        reactions: m.reactions,
        replyTo: m.replyTo
          ? {
              id: m.replyTo.id,
              sender: m.replyTo.senderId === uId ? "user" : "stranger",
              content: m.replyTo.content,
            }
          : undefined,
      }))
      useMessagesStore.getState().setMessages(sessionId, history)
      setPeerIdentity(payload.partnerNickname || "Stranger", payload.partnerUsername || null)
      if (payload.selfId) {
        setUserId(payload.selfId)
        uId = payload.selfId 
        sessionStorage.setItem("moots_userId", payload.selfId)
      }
      ConversationRepository.fetchConversations().catch(console.error)
      sendReadReceipt()
    }

    const handleMessage = (payload: any) => {
      const newMsg: Message = {
        id: payload.id,
        clientMessageId: payload.clientMessageId,
        status: payload.status || "DELIVERED",
        sender: payload.senderId === uId ? "user" : "stranger",
        content: payload.content,
        time: payload.time,
        seen: payload.seen,
        edited: payload.edited,
        reactions: payload.reactions,
        replyTo: payload.replyTo
          ? {
              id: payload.replyTo.id,
              sender: payload.replyTo.senderId === uId ? "user" : "stranger",
              content: payload.replyTo.content,
            }
          : undefined,
      }

      useMessagesStore.getState().appendMessage(sessionId, newMsg)

      if (newMsg.sender === "stranger") {
        sendReadReceipt()
      }

      useMessagesStore.getState().updateConversation(sessionId, {
        lastMessagePreview: newMsg.content,
        lastActivityAt: newMsg.time,
        updatedAt: newMsg.time,
      })
    }

    const handleReactionUpdate = (payload: any) => {
      useMessagesStore.getState().updateMessage(sessionId, payload.messageId, { reactions: payload.reactions })
    }

    const handlePartnerSeenMessages = () => {
      setMessages((prev) =>
        prev.map((msg) => (msg.sender === "user" ? { ...msg, seen: true } : msg))
      )
    }

    const handleMessageEdited = (payload: any) => {
      useMessagesStore.getState().updateMessage(sessionId, payload.messageId, { content: payload.content, edited: payload.edited })
      setEditingMsg((curr) => (curr?.id === payload.messageId ? null : curr))
    }

    const handlePartnerTyping = (payload: any) => {
      setIsTyping(payload.isTyping)
    }

    const handlePartnerJoined = (payload: any) => {
      if (payload.partnerNickname || payload.partnerUsername) {
         setPeerIdentity(payload.partnerNickname || "Stranger", payload.partnerUsername || null)
      }
    }

    const handlePartnerDisconnected = () => {
      wsGateway.disconnect()
      setIsStrangerDisconnected(true)
    }

    const handleIdentityRevealed = (payload: any) => {
      setPartnerRevealedIdentity(true)
      if (payload.username || payload.name) {
        setPeerIdentity(payload.name || "Stranger", payload.username || null)
      }
    }

    const handleConnectionRequest = () => setConnectionStatus("pending_received")
    const handleConnectionAccepted = () => setConnectionStatus("accepted")

    wsGateway.on("open", handleOpen)
    wsGateway.on("close", handleClose)
    wsGateway.on("chat-history", handleChatHistory)
    wsGateway.on("message", handleMessage)
    wsGateway.on("reaction-update", handleReactionUpdate)
    wsGateway.on("partner-seen-messages", handlePartnerSeenMessages)
    wsGateway.on("message-edited", handleMessageEdited)
    wsGateway.on("partner-typing", handlePartnerTyping)
    wsGateway.on("partner-joined", handlePartnerJoined)
    wsGateway.on("partner-disconnected", handlePartnerDisconnected)
    wsGateway.on("participant:identity-revealed", handleIdentityRevealed)
    wsGateway.on("connection:request", handleConnectionRequest)
    wsGateway.on("connection:accepted", handleConnectionAccepted)

    window.addEventListener("focus", sendReadReceipt)
    document.addEventListener("visibilitychange", sendReadReceipt)

    wsGateway.connect()

    return () => {
      wsGateway.off("open", handleOpen)
      wsGateway.off("close", handleClose)
      wsGateway.off("chat-history", handleChatHistory)
      wsGateway.off("message", handleMessage)
      wsGateway.off("reaction-update", handleReactionUpdate)
      wsGateway.off("partner-seen-messages", handlePartnerSeenMessages)
      wsGateway.off("message-edited", handleMessageEdited)
      wsGateway.off("partner-typing", handlePartnerTyping)
      wsGateway.off("partner-joined", handlePartnerJoined)
      wsGateway.off("partner-disconnected", handlePartnerDisconnected)
      wsGateway.off("participant:identity-revealed", handleIdentityRevealed)
      wsGateway.off("connection:request", handleConnectionRequest)
      wsGateway.off("connection:accepted", handleConnectionAccepted)

      window.removeEventListener("focus", sendReadReceipt)
      document.removeEventListener("visibilitychange", sendReadReceipt)

      wsGateway.disconnect()
      resetPartnerState()
    }
  }, [sessionId, session, setPeerIdentity, setIsWsReady, setMessages, sendReadReceipt, setIsTyping, setIsStrangerDisconnected, setPartnerRevealedIdentity, setConnectionStatus, resetPartnerState])

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
    lastUserMsgId
  }
}
