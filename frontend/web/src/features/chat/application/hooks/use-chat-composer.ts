"use client"

import * as React from "react"
import { useMessagesStore, Message } from "../../presentation/store/messages-store"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export interface UseChatComposerProps {
  sessionId: string;
  isWsReady: boolean;
  replyingTo: Message | null;
  editingMsg: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  setEditingMsg: (msg: Message | null) => void;
}

export function useChatComposer({
  sessionId,
  isWsReady,
  replyingTo,
  editingMsg,
  setReplyingTo,
  setEditingMsg
}: UseChatComposerProps) {
  const [inputText, setInputText] = React.useState("")

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

      const nowIso = new Date().toISOString()
      useMessagesStore.getState().updateConversation(sessionId, {
        lastMessagePreview: text,
        lastActivityAt: nowIso,
        updatedAt: nowIso,
      })
    }

    setInputText("")
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    wsGateway.send("typing-status", { sessionId, isTyping: false })
  }, [inputText, isWsReady, editingMsg, sessionId, replyingTo, setEditingMsg, setReplyingTo])

  return {
    inputText,
    setInputText,
    handleReact,
    handleInputChange,
    handleSend
  }
}
