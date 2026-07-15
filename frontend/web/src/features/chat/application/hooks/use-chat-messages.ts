"use client"

import * as React from "react"
import { useMessagesStore, Message, mapSerializedMessage } from "../../presentation/store/messages-store"
import { usePartnerStateStore } from "../../presentation/store/partner-state-store"
import { ConversationRepository } from "@/features/conversations/repositories/conversation.repository"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export interface UseChatMessagesProps {
  sessionId: string;
  isWsReady: boolean;
  sendReadReceipt: () => void;
}

export function useChatMessages({
  sessionId,
  isWsReady,
  sendReadReceipt,
}: UseChatMessagesProps) {
  const [userId, setUserId] = React.useState("")
  const [inputText, setInputText] = React.useState("")
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = React.useState<Message | null>(null)
  const [expandedMsgs, setExpandedMsgs] = React.useState<Set<string>>(new Set())
  const [peerActorId, setPeerActorId] = React.useState<string | null>(null)

  const userIdRef = React.useRef(userId)
  React.useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const messages = useMessagesStore((state) => state.messagesByChatId[sessionId]) ?? []

  const {
    setPeerIdentity,
    setIsStrangerDisconnected,
    setIsWsReady,
  } = usePartnerStateStore()

  const setMessages = React.useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    if (typeof updater === "function") {
      useMessagesStore.getState().setMessages(sessionId, updater(useMessagesStore.getState().messagesByChatId[sessionId] || []))
    } else {
      useMessagesStore.getState().setMessages(sessionId, updater)
    }
  }, [sessionId])

  const handleReact = React.useCallback((id: string, emoji: string) => {
    if (wsGateway && isWsReady) {
      wsGateway.send("send-reaction", { sessionId, messageId: id, emoji })
    }
  }, [sessionId, isWsReady])

  const handleInputChange = React.useCallback((val: string) => {
    setInputText(val)
    if (wsGateway && isWsReady) {
      wsGateway.send("typing-status", { sessionId, isTyping: val.trim().length > 0 })
    }
  }, [sessionId, isWsReady])

  const handleSend = React.useCallback((textareaRef: React.RefObject<HTMLTextAreaElement | null>) => {
    const text = inputText.trim()
    if (!text || !wsGateway || !isWsReady || wsGateway.readyState !== WebSocket.OPEN) return

    const clientMessageId = `msg-${crypto.randomUUID()}`

    if (editingMsg) {
      wsGateway.send("edit-message", {
        sessionId,
        messageId: editingMsg.id || editingMsg.clientMessageId,
        newContent: text,
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
        reply: replyingTo
          ? {
              id: replyingTo.id,
              type: "TEXT",
              content: replyingTo.content,
              sender: replyingTo.sender,
              edited: false,
              deleted: false,
            }
          : undefined,
      }
      
      useMessagesStore.getState().appendMessage(sessionId, optimisticMsg)

      wsGateway.send("send-message", {
        sessionId,
        clientMessageId,
        content: text,
        replyTo: replyingTo ? { id: replyingTo.id } : undefined,
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
      textareaRef.current.focus()
    }

    wsGateway.send("typing-status", { sessionId, isTyping: false })
  }, [inputText, isWsReady, editingMsg, sessionId, replyingTo])

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
      uId = `user-${crypto.randomUUID()}`
      sessionStorage.setItem("moots_userId", uId)
    }
    setUserId(uId)

    const handleChatHistory = (payload: any) => {
      if (payload.partnerId) {
        setPeerActorId(payload.partnerId)
      }
      const history = payload.messages.map((m: any) => ({
        ...mapSerializedMessage(m, userIdRef.current),
        status: "PERSISTED" as const,
      }))
      useMessagesStore.getState().setMessages(sessionId, history)
      setPeerIdentity(payload.partnerNickname || "Stranger", payload.partnerUsername || null)
      if (payload.selfId) {
        setUserId(payload.selfId)
        sessionStorage.setItem("moots_userId", payload.selfId)
      }
      ConversationRepository.fetchConversations().catch(console.error)
      setIsWsReady(true)
      sendReadReceipt()
    }

    const handleMessage = (payload: any) => {
      const newMsg = mapSerializedMessage(payload, userIdRef.current);

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
      setMessages((prev: Message[]) =>
        prev.map((msg) => (msg.sender === "user" ? { ...msg, seen: true } : msg))
      )
    }

    const handleMessageEdited = (payload: any) => {
      useMessagesStore.getState().updateMessage(sessionId, payload.messageId, { content: payload.content, edited: payload.edited })
      setEditingMsg((curr) => (curr?.id === payload.messageId ? null : curr))
    }

    const handlePartnerJoined = (payload: any) => {
      if (payload.partnerNickname || payload.partnerUsername) {
         setPeerIdentity(payload.partnerNickname || "Stranger", payload.partnerUsername || null)
      }
      if (payload.partnerId) {
        setPeerActorId(payload.partnerId)
      }
    }

    const handlePartnerDisconnected = () => {
      wsGateway.disconnect()
      setIsStrangerDisconnected(true)
    }

    wsGateway.on("chat-history", handleChatHistory)
    wsGateway.on("message", handleMessage)
    wsGateway.on("reaction-update", handleReactionUpdate)
    wsGateway.on("partner-seen-messages", handlePartnerSeenMessages)
    wsGateway.on("message-edited", handleMessageEdited)
    wsGateway.on("partner-joined", handlePartnerJoined)
    wsGateway.on("partner-disconnected", handlePartnerDisconnected)

    return () => {
      wsGateway.off("chat-history", handleChatHistory)
      wsGateway.off("message", handleMessage)
      wsGateway.off("reaction-update", handleReactionUpdate)
      wsGateway.off("partner-seen-messages", handlePartnerSeenMessages)
      wsGateway.off("message-edited", handleMessageEdited)
      wsGateway.off("partner-joined", handlePartnerJoined)
      wsGateway.off("partner-disconnected", handlePartnerDisconnected)
    }
  }, [sessionId, setMessages, setPeerIdentity, setIsStrangerDisconnected, setIsWsReady, sendReadReceipt])

  const isEngaged = React.useMemo(() => {
    return messages.some((m) => m.sender === "user") && messages.some((m) => m.sender === "stranger")
  }, [messages])

  const lastUserMsgId = React.useMemo(() => {
    return [...messages].reverse().find((m) => m.sender === "user")?.id
  }, [messages])

  return {
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
  }
}
