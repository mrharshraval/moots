"use client"

import * as React from "react"
import { useMessagesStore, Message } from "@/features/chat/presentation/store/messages-store"
import { useShallow } from "zustand/react/shallow"
import { TypingIndicator } from "./message-list/MessageBubble"
import { MessageNode } from "./message-list/MessageNode"
import { MessageActions } from "./message-list/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

import { useChatSessionContext } from "./chat-session-context"

interface MessageListProps {}

export function MessageList({}: MessageListProps) {
  const {
    sessionId,
    userId,
    peerDisplayName,
    lastUserMsgId,
    expandedMsgs,
    toggleExpand,
    handleReact,
    setEditingMsg,
    setReplyingTo,
    setInputText,
    textareaRef,
    isTyping,
    pageState,
  } = useChatSessionContext()
  const allIds = useMessagesStore(useShallow(state => state.messagesByChatId[sessionId]?.allIds || []))

  const handleReplyClick = React.useCallback((msg: Message) => {
    setReplyingTo(msg)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
    // We can briefly highlight the replying element here by scrolling it slightly if we want,
    // but the main effect is showing the reply preview above input.
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }, [setReplyingTo, textareaRef])

  const handleDeleteMessage = React.useCallback((id: string) => {
    useMessagesStore.getState().deleteMessage(sessionId, id)
  }, [sessionId])

  const actions = React.useMemo<MessageActions>(() => ({
    handleReact,
    setEditingMsg,
    setReplyingTo,
    setInputText,
    textareaRef,
    toggleExpand,
    handleReplyClick,
    handleDeleteMessage,
  }), [
    handleReact,
    setEditingMsg,
    setReplyingTo,
    setInputText,
    textareaRef,
    toggleExpand,
    handleReplyClick,
    handleDeleteMessage,
  ])

  return (
    <div className="flex flex-col justify-end min-h-full px-6 pt-8 pb-4 max-w-3xl mx-auto w-full">
      {allIds.map((id, index) => (
        <MessageNode
          key={id}
          sessionId={sessionId}
          messageId={id}
          prevMessageId={index > 0 ? allIds[index - 1] : undefined}
          nextMessageId={index < allIds.length - 1 ? allIds[index + 1] : undefined}
          isLastUserMsg={id === lastUserMsgId}
          expanded={expandedMsgs.has(id)}
          actions={actions}
        />
      ))}
      {isTyping && pageState === "active" && (
        <div className="flex items-start gap-3 justify-start mt-2">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs font-semibold bg-foreground/10">
              {peerDisplayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="bg-secondary text-secondary-foreground px-4 py-2 w-fit max-w-full rounded-[20px] rounded-tl-[5px] text-left">
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  )
}
