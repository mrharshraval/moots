import * as React from "react"
import { RefreshCw, Sparkles, SmilePlus } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { ComposerState } from "./types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface ComposerLeftActionProps {
  state: ComposerState
  onSkip: () => void
}

export function ComposerLeftAction({ state, onSkip }: ComposerLeftActionProps) {
  // In the reference image, the Skip button has a red circular background ONLY in the "Skip chat" view.
  // We'll mimic this by giving it a strong red tint when empty, and a lighter tint when typing.
  const isEmpty = state === "empty" || state === "idle"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSkip}
          disabled={state === "disabled" || state === "sending"}
          className={cn(
            "flex items-center justify-center size-8 rounded-full transition-colors cursor-pointer border-none outline-none shrink-0",
            "bg-transparent text-red-500 hover:bg-red-500 hover:text-white"
          )}
        >
          <RefreshCw className="size-5" strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent>Skip chat</TooltipContent>
    </Tooltip>
  )
}

interface ComposerRightActionProps {
  state: ComposerState
}

export function ComposerRightAction({ state }: ComposerRightActionProps) {
  return (
    <button
      disabled={state === "disabled" || state === "sending"}
      className="flex items-center justify-center size-8 rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer border-none outline-none shrink-0"
    >
      <SmilePlus className="size-5" strokeWidth={1.75} />
    </button>
  )
}
