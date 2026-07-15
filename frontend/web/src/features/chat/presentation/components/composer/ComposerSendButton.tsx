import * as React from "react"
import { ArrowUp, Loader2 } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { ComposerState } from "./types"

interface ComposerSendButtonProps {
  state: ComposerState
  onClick: () => void
}

export function ComposerSendButton({ state, onClick }: ComposerSendButtonProps) {
  const isVisible = state === "typing" || state === "multiline" || state === "sending" || state === "edit" || state === "reply"
  const isSending = state === "sending"

  return (
    <button
      onClick={onClick}
      disabled={isSending || state === "disabled"}
      className={cn(
        "flex items-center justify-center size-8 rounded-full transition-all duration-200 cursor-pointer border-none outline-none shrink-0 overflow-hidden",
        isVisible 
          ? "ml-2 opacity-100 scale-100 bg-primary text-primary-foreground hover:bg-primary/90" 
          : "opacity-0 scale-50 pointer-events-none w-0 h-0 m-0",
        isSending && "cursor-not-allowed opacity-80"
      )}
    >
      {isSending ? (
        <Loader2 className="size-5 animate-spin" strokeWidth={1.75} />
      ) : (
        <ArrowUp className="size-5" strokeWidth={1.75} />
      )}
    </button>
  )
}
