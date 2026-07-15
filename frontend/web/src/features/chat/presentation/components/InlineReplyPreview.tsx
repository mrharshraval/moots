"use client"

import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { ReplyReference } from "@/features/chat/presentation/store/messages-store"

interface InlineReplyPreviewProps {
  reply: ReplyReference
  isUser: boolean           // whether the *reply message* is from the current user
  peerDisplayName: string
  /** messageId of the reply's original — used for scrolling */
  scrollTargetId: string
}

/**
 * Apple-inspired inline reply preview.
 * 
 * Replaces heavy pills/blocks with lightweight text and a curved CSS 
 * border that visually connects the quote to the reply bubble, mimicking
 * Apple Messages' thread connector but keeping the chronological layout.
 */
export function InlineReplyPreview({
  reply,
  isUser,
  peerDisplayName,
  scrollTargetId,
}: InlineReplyPreviewProps) {
  const handleClick = React.useCallback(() => {
    const el = document.getElementById(`msg-${scrollTargetId}`)
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    // Brief highlight flash
    el.classList.add("reply-highlight")
    setTimeout(() => el.classList.remove("reply-highlight"), 1400)
  }, [scrollTargetId])

  return (
    <button
      onClick={handleClick}
      aria-label="Jump to quoted message"
      className={cn(
        "relative flex flex-col text-left cursor-pointer border-none outline-none bg-transparent p-0",
        // The container needs enough padding to accommodate the absolute connector line
        "mb-1 w-fit max-w-[85%]",
        isUser ? "self-end pr-[28px]" : "self-start pl-[28px]",
        "hover:opacity-70 transition-opacity duration-200"
      )}
    >
      {/* 
        Connector Line 
        Uses absolute positioning and borders to draw the curved hook.
        It extends slightly below the button to meet the bubble.
      */}
      <div 
        className={cn(
          "absolute top-[8px] bottom-[-6px] w-[16px] border-muted-foreground/30",
          isUser 
            ? "right-[10px] border-r-[2px] border-b-[2px] rounded-br-[12px]" 
            : "left-[10px] border-l-[2px] border-b-[2px] rounded-bl-[12px]"
        )} 
      />

      {/* Quoted Content - Low emphasis typography */}
      <span className="text-[12.5px] leading-snug text-muted-foreground/90 line-clamp-1 font-medium tracking-tight">
        {reply.deleted ? <em>Deleted message</em> : reply.content}
      </span>
    </button>
  )
}
