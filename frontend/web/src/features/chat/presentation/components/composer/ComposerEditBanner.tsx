import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { X, Pencil } from "lucide-react"

interface ComposerEditBannerProps {
  editingMsg: Message | null
  onCancel: () => void
}

export function ComposerEditBanner({ editingMsg, onCancel }: ComposerEditBannerProps) {
  if (!editingMsg) return null

  return (
    <div className="w-full px-4 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-foreground shrink-0">
            <Pencil className="size-5" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col min-w-0 gap-0.5">
            {/*
             * Label: 12px / semibold / foreground.
             * Consistent with reply preview label sizing — 12px minimum.
             */}
            <span className="text-[12px] leading-[16px] font-semibold text-foreground">
              Editing message
            </span>
            {/*
             * Content preview: 13px / normal / 75% foreground.
             * The user must be able to read the text they're editing.
             * 13px is the established secondary content size in the composer system.
             */}
            <span className="text-[13px] leading-[18px] font-normal text-foreground/75 truncate max-w-[240px] md:max-w-lg">
              {editingMsg.content}
            </span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted border-none bg-transparent outline-none transition-colors shrink-0 ml-2"
        >
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
