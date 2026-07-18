"use client"

import * as React from "react"
import { useMessagesStore, Message } from "../../presentation/store/messages-store"

export interface UseChatMessageStateProps {
  sessionId: string;
}

export function useChatMessageState({ sessionId }: UseChatMessageStateProps) {
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = React.useState<Message | null>(null)
  const [expandedMsgs, setExpandedMsgs] = React.useState<Set<string>>(new Set())

  const normalizedData = useMessagesStore((state) => state.messagesByChatId[sessionId])
  
  const isEngaged = React.useMemo(() => {
    if (!normalizedData) return false;
    const { byId, allIds } = normalizedData;
    let hasUser = false;
    let hasStranger = false;
    for (const id of allIds) {
      if (byId[id].sender === "user") hasUser = true;
      if (byId[id].sender === "stranger") hasStranger = true;
      if (hasUser && hasStranger) return true;
    }
    return false;
  }, [normalizedData])

  const lastUserMsgId = React.useMemo(() => {
    if (!normalizedData) return undefined;
    const { byId, allIds } = normalizedData;
    for (let i = allIds.length - 1; i >= 0; i--) {
      if (byId[allIds[i]].sender === "user") return allIds[i];
    }
    return undefined;
  }, [normalizedData])

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedMsgs((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  return {
    replyingTo,
    setReplyingTo,
    editingMsg,
    setEditingMsg,
    expandedMsgs,
    toggleExpand,
    isEngaged,
    lastUserMsgId,
  }
}
