import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { cn } from "@/shared/utils/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface MessageReactionsProps {
  msg: Message
  isUser: boolean
  onReact: (emoji: string) => void
}

export function MessageReactions({ msg, isUser, onReact }: MessageReactionsProps) {
  if (!msg.reactions || Object.keys(msg.reactions).length === 0) return null

  return (
    <div className={cn("absolute -bottom-3 flex gap-1 z-30", isUser ? "right-2" : "left-2")}>
      {Object.entries(msg.reactions).map(([emoji, users]) => (
        <Tooltip key={emoji}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onReact(emoji)}
              className="bg-background border border-border/50 rounded-full px-1.5 py-0.5 text-[11px] shadow-sm flex items-center gap-1 hover:bg-muted transition-colors cursor-pointer"
            >
              <span>{emoji}</span>
              <span className="text-muted-foreground font-medium">{users.length}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            {users.join(", ")} reacted with {emoji}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
