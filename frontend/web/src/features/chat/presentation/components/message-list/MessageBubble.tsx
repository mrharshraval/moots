import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { BubbleTail } from "../bubble-geometry"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { MESSAGE_TRUNCATE_LENGTH } from "@/features/chat/application/utils/constants"
import { ChevronDown } from "lucide-react"

export function renderContent(text: string) {
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

export function TypingIndicator() {
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

interface MessageBubbleProps {
  msg: Message
  isUser: boolean
  geometry: ReturnType<typeof import("../bubble-geometry").getBubbleGeometry>
  expanded: boolean
  onToggleExpand: () => void
}

export function MessageBubble({
  msg,
  isUser,
  geometry,
  expanded,
  onToggleExpand,
}: MessageBubbleProps) {
  const long = msg.content.length > MESSAGE_TRUNCATE_LENGTH
  const displayText = long && !expanded ? msg.content.slice(0, MESSAGE_TRUNCATE_LENGTH) + "…" : msg.content

  return (
    <div
      className={cn(
        "px-4 py-2 w-fit max-w-full text-left relative shrink select-none touch-manipulation",
        isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        geometry.classes
      )}
    >
      {geometry.hasTail && <BubbleTail isUser={isUser} />}
      <div className="text-[15px] leading-relaxed break-words w-full">
        {renderContent(displayText)}
        {long && (
          <button
            onClick={onToggleExpand}
            className="text-xs font-semibold mt-2 opacity-80 hover:opacity-100 flex items-center gap-1"
          >
            {expanded ? "Show less" : "Read more"}
            <ChevronDown className={cn("size-3 transition-transform", expanded ? "rotate-180" : "")} />
          </button>
        )}
      </div>
    </div>
  )
}
