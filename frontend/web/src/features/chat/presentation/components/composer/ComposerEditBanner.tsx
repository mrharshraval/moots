import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { X, Pencil } from "lucide-react"
import { PreviewBubble } from "../PreviewBubble"

interface ComposerEditBannerProps {
  editingMsg: Message | null
  onCancel: () => void
}

export function ComposerEditBanner({ editingMsg, onCancel }: ComposerEditBannerProps) {
  if (!editingMsg) return null

  const mockReplyRef = {
    id: editingMsg.id,
    type: "TEXT",
    content: editingMsg.content,
    sender: editingMsg.sender,
    edited: editingMsg.edited || false,
    deleted: false
  }

  return (
    <div className="w-full px-4 pt-3 pb-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="flex items-center gap-3 w-full">
        <Pencil className="size-[13px] text-muted-foreground/60 shrink-0" strokeWidth={2.5} />
        <div className="flex-1 min-w-0">
          <PreviewBubble 
            reply={mockReplyRef} 
            originalIsUser={editingMsg.sender === "user"} 
          />
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel edit"
          className="text-muted-foreground/60 hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 border-none bg-transparent outline-none transition-colors shrink-0"
        >
          <X className="size-[14px]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
