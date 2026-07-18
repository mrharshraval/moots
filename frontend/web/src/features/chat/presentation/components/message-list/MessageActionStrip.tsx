import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { MoreHorizontal, CornerUpLeft, SmilePlus } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { MessageActions } from "./types"
import { EMOJI_QUICK_ACTIONS } from "@/features/chat/application/utils/constants"
import { MessageMenuItems } from "./MessageContextMenu"

interface MessageActionStripProps {
  msg: Message
  actions: MessageActions
  className?: string
}

export function MessageActionStrip({ msg, actions, className }: MessageActionStripProps) {
  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0", className)}>
      {msg.sender === "user" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
              <MoreHorizontal className="size-4.5" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-36" align="end">
            <MessageMenuItems msg={msg} actions={actions} asDropdown={true} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => actions.handleReplyClick(msg)}
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
          {EMOJI_QUICK_ACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); actions.handleReact(msg.id, emoji) }}
              className="hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              <span className="text-xl">{emoji}</span>
            </button>
          ))}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
