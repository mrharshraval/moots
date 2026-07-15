"use client"

import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { X, Reply } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { PreviewBubble } from "../PreviewBubble"

interface ComposerReplyPreviewProps {
  replyingTo: Message | null
  onCancel: () => void
  peerDisplayName: string
}

export function ComposerReplyPreview({ replyingTo, onCancel, peerDisplayName }: ComposerReplyPreviewProps) {
  if (!replyingTo) return null

  // Create a mock ReplyReference for the PreviewBubble
  const mockReplyRef = {
    id: replyingTo.id,
    type: "TEXT",
    content: replyingTo.content,
    sender: replyingTo.sender,
    edited: replyingTo.edited || false,
    deleted: false
  }

  return (
    <div className="w-full px-4 pt-3 pb-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="flex items-center gap-3 w-full">
        {/* Reply icon to signify context */}
        <Reply className="size-[13px] text-muted-foreground/60 shrink-0" strokeWidth={2.5} />

        <div className="flex-1 min-w-0">
          <PreviewBubble 
            reply={mockReplyRef} 
            originalIsUser={replyingTo.sender === "user"} 
          />
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          aria-label="Cancel reply"
          className="text-muted-foreground/60 hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 border-none bg-transparent outline-none transition-colors shrink-0"
        >
          <X className="size-[14px]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
