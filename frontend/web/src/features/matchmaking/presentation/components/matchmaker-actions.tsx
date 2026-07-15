import * as React from "react"
import { Button } from "@/shared/ui/button"
import { MatchmakingStatus } from "../store/matchmaking-store"

interface MatchmakerActionsProps {
  status: MatchmakingStatus
  onStart: () => void
  onCancel: () => void
}

export function MatchmakerActions({ status, onStart, onCancel }: MatchmakerActionsProps) {
  return (
    <div className="h-[40px] w-full flex justify-center">
      {status === "idle" && (
        <Button
          onClick={onStart}
          className="h-[40px] rounded-full px-[32px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium animate-in fade-in group"
        >
          Continue
        </Button>
      )}
      
      {status === "searching" && (
        <Button
          variant="outline"
          onClick={onCancel}
          className="h-[40px] rounded-full px-[32px] bg-background border-border text-foreground hover:bg-muted font-medium animate-in fade-in duration-300"
        >
          Cancel
        </Button>
      )}
    </div>
  )
}
