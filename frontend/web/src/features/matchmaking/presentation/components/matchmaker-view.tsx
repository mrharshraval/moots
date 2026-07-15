"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useMatchmakingFlow } from "../../application/use-matchmaking-flow"
import { useMatchmakingStore } from "../store/matchmaking-store"
import { MatchmakerHeader } from "./matchmaker-header"
import { MatchmakerProgress } from "./matchmaker-progress"
import { MatchmakerActions } from "./matchmaker-actions"

export function MatchmakerView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { status, interests, startMatchmaking, cancelMatchmaking } = useMatchmakingFlow()
  
  // We grab searchStartedAt from store because it's only needed by Header
  const searchStartedAt = useMatchmakingStore((state) => state.searchStartedAt)
  const startMatchingFlag = searchParams.get("startMatching")
  const fromEndScreen = searchParams.get("from") === "end_screen"

  // Auto-start if parameter is present
  React.useEffect(() => {
    if (startMatchingFlag === "true" && status === "idle") {
      startMatchmaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMatchingFlag, status])

  // If the user navigates back to this view (e.g. from an ended chat) and the global store is still "found", reset it.
  React.useEffect(() => {
    if (useMatchmakingStore.getState().status === "found") {
      useMatchmakingStore.getState().setStatus("idle")
    }
  }, [])

  const handleCancel = () => {
    cancelMatchmaking()
    if (fromEndScreen) {
      router.back()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center pt-[22vh] pb-8 px-4 bg-background h-full w-full relative">
      <div className="flex flex-col items-center w-full max-w-[420px] text-center">
        <MatchmakerHeader 
          status={status} 
          interests={interests} 
          searchStartedAt={searchStartedAt} 
        />
        <MatchmakerProgress status={status} />
        <MatchmakerActions 
          status={status} 
          onStart={() => startMatchmaking()} 
          onCancel={handleCancel} 
        />
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[13px] text-muted-foreground">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  )
}
