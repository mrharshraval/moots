import * as React from "react"
import { MatchmakingStatus } from "../store/matchmaking-store"

interface MatchmakerProgressProps {
  status: MatchmakingStatus
}

export function MatchmakerProgress({ status }: MatchmakerProgressProps) {
  if (status === "idle") return null

  return (
    <div className="w-full flex flex-col items-center">
      {status === "searching" && (
        <div className="w-full max-w-[380px] flex flex-col gap-4 mb-[24px] animate-in fade-in duration-300">
          <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/50 w-1/3 animate-progress-slide rounded-full" />
          </div>
        </div>
      )}
      
      {status === "found" && (
        <div className="w-full max-w-[380px] flex flex-col gap-4 mb-[24px] animate-in fade-in zoom-in-95 duration-500">
          <p className="text-[14px] text-primary font-medium text-center animate-pulse">
            Opening conversation
          </p>
        </div>
      )}
    </div>
  )
}
