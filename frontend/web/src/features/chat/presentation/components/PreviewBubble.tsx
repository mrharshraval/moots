"use client"

import * as React from "react"
import { cn } from "@/shared/utils/utils"
import { ReplyReference } from "@/features/chat/presentation/store/messages-store"

interface PreviewBubbleProps {
  reply: ReplyReference
  originalIsUser: boolean
  onClick?: () => void
}

/**
 * Renders a miniature, hollowed-out version of the original message bubble.
 * 
 * In the Moots design system, the preview is not an abstract card, but a literal 
 * scaled-down outlined message bubble preserving the speaker's geometry and colors.
 */
export function PreviewBubble({ reply, originalIsUser, onClick }: PreviewBubbleProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Jump to quoted message"
      className={cn(
        "relative flex items-center text-left cursor-pointer border bg-background p-0 outline-none transition-opacity duration-200 hover:opacity-70",
        // Geometry: Normal message sizing
        "rounded-[20px] px-4 py-2 w-fit max-w-full",
        originalIsUser
          ? "border-primary text-primary" // Hollow User bubble
          : "border-secondary-foreground/20 text-muted-foreground" // Hollow Stranger bubble
      )}
    >
      <span className="text-[15px] leading-relaxed line-clamp-1 break-words w-full">
        {reply.deleted ? <em className="opacity-70">Deleted message</em> : reply.content}
      </span>
    </button>
  )
}
