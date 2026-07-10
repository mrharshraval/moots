import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { cn } from "@/shared/utils/utils"
import { MoreHorizontal, CornerUpLeft, SmilePlus, CheckCheck, ChevronDown, Copy, Edit3 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"

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
        <div key={i} className="border-l-2 border-border pl-3 my-1 text-muted-foreground italic">
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
  pageState
}: MessageListProps) {
  return (
    <div className="flex flex-col justify-end min-h-full px-6 pt-8 pb-4 gap-5 max-w-3xl mx-auto w-full">
      {messages.map((msg) => {
        const isUser = msg.sender === "user"
        const expanded = expandedMsgs.has(msg.id)
        const long = msg.content.length > 300
        const displayText = long && !expanded ? msg.content.slice(0, 300) + "…" : msg.content

        return (
          <div key={msg.id} className={cn("flex w-full group", isUser ? "justify-end" : "justify-start")}>
            {isUser ? (
              /* ── USER: right-aligned plain text ── */
              <div className="flex flex-col items-end gap-1 max-w-[65%]">
                {msg.replyTo && (
                  <div className="bg-muted/40 rounded-lg px-3 py-1.5 border-r-2 border-primary text-xs text-right max-w-full mb-1 opacity-80">
                    <span className="block font-semibold text-[10px] text-muted-foreground mb-0.5">
                      Replied to {msg.replyTo.sender === "user" ? "yourself" : peerDisplayName}
                    </span>
                    <span className="truncate block max-w-xs text-foreground/80">
                      {msg.replyTo.content}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 max-w-full justify-end w-full">
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
                            if (textareaRef.current) {
                              textareaRef.current.focus()
                            }
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
                        {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleReact(msg.id, emoji)
                            }}
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
                    className="bg-muted/70 dark:bg-muted/30 border border-border/40 text-foreground rounded-2xl px-4 py-2.5 shadow-xs text-left max-w-full relative shrink select-none touch-manipulation"
                  >
                    <div className="text-[15px] leading-relaxed text-foreground break-words w-full">
                      {renderContent(displayText)}
                    </div>
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="absolute -bottom-3 flex items-center gap-1.5 bg-background dark:bg-card border border-border/60 rounded-full px-2 py-0.5 text-[11px] shadow-xs z-10 right-4 select-none">
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
                {/* Status indicators */}
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
            ) : (
              /* ── STRANGER: avatar + bubble layout ── */
              <div className="flex flex-col items-start gap-1 max-w-[65%]">
                <div className="flex items-end gap-3 w-full">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-foreground/10">
                      {peerDisplayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {msg.replyTo && (
                      <div className="bg-muted/40 rounded-lg px-3 py-1.5 border-l-2 border-primary text-xs text-left max-w-full mb-0.5 opacity-80">
                        <span className="block font-semibold text-[10px] text-muted-foreground mb-0.5">
                          Replied to {msg.replyTo.sender === "user" ? "you" : peerDisplayName}
                        </span>
                        <span className="truncate block max-w-xs text-foreground/80">
                          {msg.replyTo.content}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 max-w-full w-full">
                      {/* Bubble */}
                      <div
                        {...getTouchHandlers(msg)}
                        className="bg-muted/70 dark:bg-muted/30 border border-border/40 rounded-2xl px-4 py-2.5 shadow-xs w-fit max-w-full text-left relative shrink select-none touch-manipulation"
                      >
                        <div className="text-[15px] leading-relaxed text-foreground break-words w-full">
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
                          <div className="absolute -bottom-3 flex items-center gap-1.5 bg-background dark:bg-card border border-border/60 rounded-full px-2 py-0.5 text-[11px] shadow-xs z-10 left-4 select-none">
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
                                  <TooltipContent>
                                    {who} reacted
                                  </TooltipContent>
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
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleReact(msg.id, emoji)
                                }}
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
        <div className="flex items-start gap-3 justify-start">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-xs font-semibold bg-foreground/10">
              {peerDisplayName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <TypingIndicator />
        </div>
      )}
    </div>
  )
}
