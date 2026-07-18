import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { formatMessageTime } from "@/shared/utils/date"

interface MessageStatusProps {
  msg: Message
  isAbsoluteLast: boolean
  expanded: boolean
}

export function MessageStatus({ msg, isAbsoluteLast, expanded }: MessageStatusProps) {
  const formattedTime = formatMessageTime(msg.time)

  if (msg.sender !== "user") {
    // For incoming messages, only display timestamp when expanded
    if (!expanded) return null
    return (
      <div className="flex flex-col items-start mt-1 ml-1">
        <span className="text-[10px] text-muted-foreground/60">{formattedTime}</span>
      </div>
    )
  }

  const isSending = msg.status === "SENDING"
  const isFailed = msg.status === "FAILED"
  const isSeen = msg.seen

  // For outgoing messages, align to the right
  return (
    <div className="flex flex-col items-end mt-1 mr-1">
      {expanded && <span className="text-[10px] text-muted-foreground/60">{formattedTime}</span>}
      {isFailed && <span className="text-[10px] text-destructive font-medium">Failed</span>}
      {isSending && <span className="text-[10px] text-muted-foreground/60">Sending...</span>}
      {isAbsoluteLast && isSeen && <span className="text-[10px] text-blue-500 font-medium">Read</span>}
    </div>
  )
}

