"use client"

import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { cn } from "@/shared/utils/utils"
import { MoreHorizontal, CornerUpLeft, SmilePlus, CheckCheck, ChevronDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { getBubbleGeometry, BubbleTail, GroupPosition } from "./bubble-geometry"
import { PreviewBubble } from "./PreviewBubble"
import { ReplyConnectorSender, ReplyConnectorRecipient } from "./ReplyConnector"
interface MessageListProps {
  messages: Message[]
  userId: string
  peerDisplayName: string
  lastUserMsgId?: string
  expandedMsgs: Set<string>
  toggleExpand: (id: string) => void
  handleReact: (id: string, emoji: string) => void
  setEditingMsg: (msg: Message | null) => void
  setReplyingTo: (msg: Message | null) => void
  setInputText: (text: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  getTouchHandlers: (msg: Message) => any
  isTyping: boolean
  pageState: string
}

function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const isQuote = line.startsWith("->") || line.startsWith("> ")
    if (isQuote) {
      return (
        <div key={i} className="border-l-2 border-current pl-3 my-1 opacity-80 italic">
          {line.replace(/^-> /, "").replace(/^> /, "")}
        </div>
      )
    }
    return line ? <p key={i} className="mb-1 last:mb-0 break-words w-full">{line}</p> : <div key={i} className="h-3" />
  })
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
        />
      ))}
    </div>
  )
}

const EMOJI_QUICK = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

/** Returns true when this message should show the inline reply preview above it. */
function shouldShowReplyPreview(messages: Message[], index: number): boolean {
  const msg = messages[index]
  if (!msg.reply) return false

  const prev = index > 0 ? messages[index - 1] : null

  // Always show if this is the first message
  if (!prev) return true

  // A new preview is needed when:
  // 1. The previous message is from a different sender
  if (prev.sender !== msg.sender) return true

  // 2. The previous message has NO reply (conversation break)
  if (!prev.reply) return true

  // 3. The previous message replies to a DIFFERENT original message
  if (prev.reply.id !== msg.reply.id) return true

  // 4. Same sender, same replyTo → suppress (grouped run)
  return false
}

export function MessageList({
  messages,
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
  getTouchHandlers,
  isTyping,
  pageState,
}: MessageListProps) {
  return (
    <div className="flex flex-col justify-end min-h-full px-6 pt-8 pb-4 max-w-3xl mx-auto w-full">
      {messages.map((msg, index) => {
        const prevMsg = index > 0 ? messages[index - 1] : null
        const isConsecutive = prevMsg && prevMsg.sender === msg.sender
        const isUser = msg.sender === "user"
        const expanded = expandedMsgs.has(msg.id)
        const long = msg.content.length > 300
        const displayText = long && !expanded ? msg.content.slice(0, 300) + "…" : msg.content

        // Reply preview grouping logic
        const showReplyPreview = shouldShowReplyPreview(messages, index)
        const showReplyPreviewNext = index < messages.length - 1 ? shouldShowReplyPreview(messages, index + 1) : false

        const isConsecutivePrev = prevMsg && prevMsg.sender === msg.sender && !showReplyPreview
        const isConsecutiveNext = index < messages.length - 1 && messages[index + 1].sender === msg.sender && !showReplyPreviewNext

        const isStandalone = !isConsecutivePrev && !isConsecutiveNext
        const isFirst = !isConsecutivePrev && isConsecutiveNext
        const isLast = isConsecutivePrev && !isConsecutiveNext

        const groupPosition: GroupPosition = isStandalone ? "standalone" : isFirst ? "first" : isLast ? "last" : "middle"
        const geometry = getBubbleGeometry(groupPosition, isUser)

        const isGroupContinuation =
          msg.reply &&
          prevMsg?.reply?.id === msg.reply.id &&
          prevMsg?.sender === msg.sender

        const spacingClass = index === 0
          ? "mt-0"
          : isGroupContinuation
            ? "mt-1"           // tight — same reply group
            : isConsecutive
              ? "mt-1"         // tight — consecutive same sender
              : "mt-5"         // normal break

        return (
          <div
            key={msg.id}
            id={`msg-${msg.id}`}
            className={cn(
              "flex w-full group",
              isUser ? "justify-end" : "justify-start",
              spacingClass,
            )}
          >
            {isUser ? (
              /* ── USER: right-aligned ── */
              <div className={cn("flex flex-col items-end relative z-10 shrink", msg.reply && showReplyPreview ? "w-full" : "max-w-[65%]")}>
                {/* Preview bubble */}
                {msg.reply && showReplyPreview && (
                  <div className="relative self-start mb-1">
                    <PreviewBubble
                      reply={msg.reply}
                      originalIsUser={msg.reply.sender === "user"}
                      onClick={() => {
                        const target = document.getElementById(`msg-${msg.reply!.id}`)
                        if (target) {
                          target.scrollIntoView({ behavior: "smooth", block: "center" })
                          target.classList.add("reply-highlight")
                          setTimeout(() => target.classList.remove("reply-highlight"), 1500)
                        }
                      }}
                    />
                    {/* ╰-shape connector with rounded caps */}
                    <svg
                      width="32"
                      height="24"
                      viewBox="0 0 32 24"
                      fill="none"
                      className="absolute top-[100%] mt-[16px] left-[24px] text-muted-foreground/30 z-0"
                    >
                      <path d="M 2 2 L 2 10 A 12 12 0 0 0 14 22 L 30 22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                )}

                {/* Main row */}
                <div className={cn("flex flex-col items-end w-full", msg.reply && showReplyPreview ? "mt-1.5" : "")}>
                  {/* Action strip + main bubble */}
                  <div className="flex items-center gap-2 max-w-full justify-end relative z-20">
                    {/* Action strip: left of bubble */}
                    <div className="flex items-center gap-1 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                            <MoreHorizontal className="size-4.5" strokeWidth={1.75} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-3 bg-popover border border-border/40 rounded-xl shadow-lg flex flex-col gap-1 text-xs text-foreground z-50">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Message Details</span>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Sent:</span>
                            <span className="font-semibold">{msg.time}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-semibold">
                              {msg.seen ? "Seen" : msg.status === "SENDING" ? "Sending" : msg.status === "DELIVERED" ? "Delivered" : msg.status === "PERSISTED" ? "Sent" : msg.status === "FAILED" ? "Failed to send" : "Sent"}
                              {msg.edited && " (Edited)"}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingMsg(msg)
                              setReplyingTo(null)
                              setInputText(msg.content)
                              if (textareaRef.current) textareaRef.current.focus()
                            }}
                            className="w-full text-left mt-2 pt-2 border-t border-border/40 hover:text-primary transition-colors cursor-pointer font-medium"
                          >
                            Edit Message
                          </button>
                        </PopoverContent>
                      </Popover>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40"
                          >
                            <CornerUpLeft className="size-4.5" strokeWidth={1.75} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Reply</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                            <SmilePlus className="size-4.5" strokeWidth={1.75} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="flex items-center gap-1 p-1 bg-popover border border-border rounded-full shadow-lg">
                          {EMOJI_QUICK.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReact(msg.id, emoji) }}
                              className="hover:scale-125 hover:bg-muted active:scale-95 transition-all cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-full border-none bg-transparent outline-none"
                            >
                              {emoji}
                            </button>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Bubble */}
                    <div
                      {...getTouchHandlers(msg)}
                      className={cn(
                        "bg-primary text-primary-foreground px-4 py-2 text-left max-w-full relative shrink select-none touch-manipulation",
                        geometry.classes
                      )}
                    >
                      {geometry.hasTail && <BubbleTail isUser={true} />}
                      <div className="text-[15px] leading-relaxed break-words w-full">
                        {renderContent(displayText)}
                      </div>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="absolute -bottom-3 flex items-center gap-1.5 bg-background dark:bg-card border border-border/60 rounded-full px-2 py-0.5 text-[11px] z-10 right-4 select-none">
                          {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                            const hasYou = userIds.includes(userId)
                            const hasStranger = userIds.some((id) => id !== userId)
                            let who = ""
                            if (hasYou && hasStranger) who = `You and ${peerDisplayName}`
                            else if (hasYou) who = "You"
                            else if (hasStranger) who = peerDisplayName
                            return (
                              <Tooltip key={emoji}>
                                <TooltipTrigger asChild>
                                  <span className="cursor-pointer flex items-center gap-0.5 font-medium">
                                    <span>{emoji}</span>
                                    {userIds.length > 1 && <span className="text-[10px] text-muted-foreground">{userIds.length}</span>}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{who}</TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {long && (
                    <button
                      onClick={() => toggleExpand(msg.id)}
                      className="text-[10px] font-semibold text-primary/70 hover:text-primary mt-0.5 mr-2 cursor-pointer bg-transparent border-none outline-none"
                    >
                      {expanded ? "Show Less" : "Read More"}
                    </button>
                  )}

                  {/* Status indicator — only on the last user message */}
                  {lastUserMsgId === msg.id && (
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5 mr-2 font-medium flex items-center gap-1">
                      {msg.seen ? (
                        <span className="text-primary flex items-center gap-0.5"><CheckCheck className="w-3 h-3" /> Seen</span>
                      ) : msg.status === "SENDING" ? (
                        <span>Sending</span>
                      ) : msg.status === "DELIVERED" ? (
                        <span>Delivered</span>
                      ) : (
                        <span>Sent</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── STRANGER: left-aligned ── */
              <div className={cn("flex flex-col items-start relative z-10 min-w-0 flex-1", msg.reply && showReplyPreview ? "w-full" : "max-w-[65%]")}>
                {/* Preview bubble */}
                {msg.reply && showReplyPreview && (
                  <div className="relative self-end mb-1">
                    <PreviewBubble
                      reply={msg.reply}
                      originalIsUser={msg.reply.sender === "user"}
                      onClick={() => {
                        const target = document.getElementById(`msg-${msg.reply!.id}`)
                        if (target) {
                          target.scrollIntoView({ behavior: "smooth", block: "center" })
                          target.classList.add("reply-highlight")
                          setTimeout(() => target.classList.remove("reply-highlight"), 1500)
                        }
                      }}
                    />
                  </div>
                )}

                {/* Main bubble + action strip */}
                <div className={cn("flex items-end w-full relative", msg.reply && showReplyPreview ? "mt-4" : "")}>
                  {/* ╭-shape connector with rounded caps */}
                  {msg.reply && showReplyPreview && (
                    <svg
                      width="32"
                      height="24"
                      viewBox="0 0 32 24"
                      fill="none"
                      className="absolute bottom-[100%] left-[24px] text-muted-foreground/30 z-0 mb-[16px]"
                    >
                      <path d="M 2 22 L 2 14 A 12 12 0 0 1 14 2 L 30 2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  )}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 max-w-full w-full relative z-20">
                      {/* Bubble */}
                      <div
                        {...getTouchHandlers(msg)}
                        className={cn(
                          "bg-secondary text-secondary-foreground px-4 py-2 w-fit max-w-full text-left relative shrink select-none touch-manipulation",
                          geometry.classes
                        )}
                      >
                        {geometry.hasTail && <BubbleTail isUser={false} />}
                        <div className="text-[15px] leading-relaxed break-words w-full">
                          {renderContent(displayText)}
                          {long && (
                            <button
                              onClick={() => toggleExpand(msg.id)}
                              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none"
                            >
                              {expanded ? "Show less" : "Show more"}
                              <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="absolute -bottom-3 flex items-center gap-1.5 bg-background dark:bg-card border border-border/60 rounded-full px-2 py-0.5 text-[11px] z-10 left-4 select-none">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                              const hasYou = userIds.includes(userId)
                              const hasStranger = userIds.some((id) => id !== userId)
                              let who = ""
                              if (hasYou && hasStranger) who = `You and ${peerDisplayName}`
                              else if (hasYou) who = "You"
                              else if (hasStranger) who = peerDisplayName
                              return (
                                <Tooltip key={emoji}>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-pointer flex items-center gap-0.5 font-medium">
                                      <span>{emoji}</span>
                                      {userIds.length > 1 && <span className="text-[10px] text-muted-foreground">{userIds.length}</span>}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{who} reacted</TooltipContent>
                                </Tooltip>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action strip: right of bubble */}
                      <div className="flex items-center gap-1 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                              <SmilePlus className="size-4.5" strokeWidth={1.75} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="flex items-center gap-1 p-1 bg-popover border border-border rounded-full shadow-lg">
                            {EMOJI_QUICK.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReact(msg.id, emoji) }}
                                className="hover:scale-125 hover:bg-muted active:scale-95 transition-all cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-full border-none bg-transparent outline-none"
                              >
                                {emoji}
                              </button>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40"
                            >
                              <CornerUpLeft className="size-4.5" strokeWidth={1.75} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Reply</TooltipContent>
                        </Tooltip>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                              <MoreHorizontal className="size-4.5" strokeWidth={1.75} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-3 bg-popover border border-border/40 rounded-xl shadow-lg flex flex-col gap-1 text-xs text-foreground z-50">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Message Details</span>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Sent:</span>
                              <span className="font-semibold">{msg.time}</span>
                            </div>
                            {msg.edited && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Edited:</span>
                                <span className="font-semibold">Yes</span>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Typing indicator */}
      {isTyping && pageState === "active" && (
        <div className={cn("flex items-start justify-start", messages.length > 0 && messages[messages.length - 1].sender !== "user" ? "mt-1" : "mt-5")}>
          <TypingIndicator />
        </div>
      )}
    </div>
  )
}
