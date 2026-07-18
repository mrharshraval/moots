import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { useMessagesStore, Message } from "@/features/chat/presentation/store/messages-store"
import { useShallow } from "zustand/react/shallow"
import { PreviewBubble } from "../PreviewBubble"
import { MessageBubble } from "./MessageBubble"
import { MessageActionStrip } from "./MessageActionStrip"
import { MessageReactions } from "./MessageReactions"
import { MessageStatus } from "./MessageStatus"
import { ReplyConnector } from "./ReplyConnector"
import { getBubbleGeometry } from "../bubble-geometry"
import { MessageActions } from "./types"
import {
  shouldShowReplyPreview,
  getMessageGroupPosition,
  calculateMessageSpacingClass,
} from "@/features/chat/application/utils/message-utils"
import { REPLY_HIGHLIGHT_DURATION } from "@/features/chat/application/utils/constants"
import { shouldShowDateSeparator, formatDateSeparator } from "@/shared/utils/date"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/shared/ui/context-menu"
import { MessageMenuItems } from "./MessageContextMenu"

interface MessageNodeProps {
  sessionId: string
  messageId: string
  prevMessageId?: string
  nextMessageId?: string
  isLastUserMsg: boolean
  expanded: boolean
  actions: MessageActions
}

export const MessageNode = React.memo(function MessageNode({
  sessionId,
  messageId,
  prevMessageId,
  nextMessageId,
  isLastUserMsg,
  expanded,
  actions,
}: MessageNodeProps) {
  // Subscribe specifically to THIS message's updates
  const msg = useMessagesStore(useShallow(state => state.messagesByChatId[sessionId]?.byId[messageId]))
  
  // We don't want to re-render simply if prevMsg text changes, but we do care about sender/reply changes for grouping.
  // For strict atomic rendering, we just fetch it. If it updates, we might re-render, but it's acceptable.
  const prevMsg = useMessagesStore(useShallow(state => prevMessageId ? state.messagesByChatId[sessionId]?.byId[prevMessageId] : undefined))
  const nextMsg = useMessagesStore(useShallow(state => nextMessageId ? state.messagesByChatId[sessionId]?.byId[nextMessageId] : undefined))

  if (!msg) return null

  const isUser = msg.sender === "user"
  const originalIsUser = msg.reply?.sender === "user"
  const isCrossScreen = msg.reply ? isUser !== originalIsUser : false
  
  const groupPosition = getMessageGroupPosition(msg, prevMsg, nextMsg)
  const geometry = getBubbleGeometry(groupPosition, isUser)
  const spacingClass = calculateMessageSpacingClass(msg, prevMsg)
  const showReplyPreview = shouldShowReplyPreview(msg, prevMsg)
  const showDateSeparator = shouldShowDateSeparator(prevMsg?.time, msg.time)

  const handlePreviewClick = React.useCallback(() => {
    if (!msg.reply) return
    const target = document.getElementById(`msg-${msg.reply.id}`)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" })
      target.classList.add("reply-highlight")
      setTimeout(() => target.classList.remove("reply-highlight"), REPLY_HIGHLIGHT_DURATION)
    }
  }, [msg.reply])

  return (
    <>
      {showDateSeparator && (
        <div className="flex w-full justify-center my-6">
          <span className="text-xs font-medium text-muted-foreground/50">
            {formatDateSeparator(msg.time)}
          </span>
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            id={`msg-${msg.id}`}
            className={cn(
              "flex flex-col w-full group relative z-10",
              spacingClass,
              showDateSeparator ? "mt-2" : ""
            )}
          >
            {/* 1. Reply Preview Row */}
            {msg.reply && showReplyPreview && (
              <div className={cn("flex w-full relative", originalIsUser ? "justify-end" : "justify-start")}>
                
                {/* Recipient perspective: ┌── anchored to bottom of Preview Row */}
                {!isUser && <ReplyConnector isUser={isUser} originalIsUser={originalIsUser} />}

                <div className="relative mb-1 shrink-0 max-w-[75vw] sm:max-w-[60vw]">
                  <PreviewBubble
                    reply={msg.reply}
                    originalIsUser={originalIsUser}
                    onClick={handlePreviewClick}
                  />
                </div>
              </div>
            )}

            {/* 2. Main Row (Bubble & Action Strip) */}
            <div className={cn("flex w-full relative z-20", msg.reply && showReplyPreview ? "mt-4" : "", isUser ? "justify-end" : "justify-start")}>
              
              {/* Sender perspective: └── anchored to top of Reply Row */}
              {isUser && msg.reply && showReplyPreview && <ReplyConnector isUser={isUser} originalIsUser={originalIsUser} />}

              {/* Bubble Block */}
              <div className={cn("flex relative max-w-full", isUser ? "items-center justify-end" : "items-end")}>

                {/* User Action Strip (Left of Bubble) */}
                {isUser && <MessageActionStrip msg={msg} actions={actions} className="absolute right-[100%] mr-2" />}

                {/* Bubble Container */}
                <div className="relative shrink min-w-0 w-fit max-w-[65vw] sm:max-w-[60vw]">
                  <MessageBubble
                    msg={msg}
                    isUser={isUser}
                    geometry={geometry}
                    expanded={expanded}
                    onToggleExpand={() => actions.toggleExpand(msg.id)}
                  />
                  <MessageReactions msg={msg} isUser={isUser} onReact={(emoji) => actions.handleReact(msg.id, emoji)} />
                </div>

                {/* Stranger Action Strip (Right of Bubble) */}
                {!isUser && <MessageActionStrip msg={msg} actions={actions} />}
              </div>
            </div>

            {/* Status indicator */}
            <div className={cn("w-full flex mt-1", isUser ? "justify-end" : "justify-start")}>
              <MessageStatus msg={msg} isAbsoluteLast={!nextMessageId} expanded={expanded} />
            </div>
          </div>
        </ContextMenuTrigger>
        {isUser && (
          <ContextMenuContent className="w-48">
            <MessageMenuItems msg={msg} actions={actions} />
          </ContextMenuContent>
        )}
      </ContextMenu>
    </>
  )
})
