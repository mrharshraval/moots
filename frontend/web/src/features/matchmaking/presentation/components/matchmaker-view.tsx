"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/shared/ui/button"
import { useMatchmakingFlow } from "../../application/use-matchmaking-flow"
import { POPULAR_TOPICS } from "./interest-selector"

export function MatchmakerView() {
  const searchParams = useSearchParams()
  const { status, seconds, interests, startMatchmaking, cancelMatchmaking } = useMatchmakingFlow()

  const startMatchingFlag = searchParams.get("startMatching")

  // Auto-start if parameter is present
  React.useEffect(() => {
    if (startMatchingFlag === "true" && status === "idle") {
      startMatchmaking()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMatchingFlag, status])

  const formatInterestsString = () => {
    if (interests.length === 0) return "Random vibe"
    return interests
      .map((tag: string) => {
        const predefined = POPULAR_TOPICS.find((t: any) => t.id === tag)
        return predefined ? predefined.label : tag.charAt(0).toUpperCase() + tag.slice(1)
      })
      .join(" • ")
  }

  const title = React.useMemo(() => {
    if (status === "idle") return "Meet someone new"
    if (status === "searching") return seconds < 15 ? "Finding someone interesting" : "Searching for a great match"
    return "Match Found"
  }, [status, seconds])

  const subtitle = React.useMemo(() => {
    if (status === "idle") return "Find your next great conversation partner"
    if (status === "searching") return seconds < 15 ? "Looking for a compatible conversation partner" : "This is taking a little longer than usual"
    return `Shared interests: ${formatInterestsString()}`
  }, [status, seconds, interests])

  return (
    <div className="flex-1 flex flex-col items-center pt-[22vh] pb-8 px-4 bg-background h-full w-full relative">
      <div className="flex flex-col items-center w-full max-w-[420px] text-center">

        <div className="mb-[16px] flex justify-center">
          <img
            src="/brand/brand-marks/monochrome/Balck%20Filled.svg"
            alt="Moots"
            className="h-[72px] w-[72px] opacity-40 dark:hidden object-contain"
          />
          <img
            src="/brand/brand-marks/monochrome/White%20Filled.svg"
            alt="Moots"
            className="h-[72px] w-[72px] opacity-40 hidden dark:block object-contain"
          />
        </div>

        {/* TITLE */}
        <h1 className="text-[18px] leading-[26px] font-semibold text-foreground mb-2 transition-colors duration-300">
          {title}
        </h1>

        {/* SUBTITLE */}
        <p className="text-[16px] leading-[24px] font-normal text-muted-foreground mb-[24px] w-full transition-colors duration-300 max-w-[420px]">
          {subtitle}
        </p>

        {/* DYNAMIC CONTENT AREA (Only visible in searching/found states) */}
        <div className="w-full flex flex-col items-center">
          {status === "searching" && (
            <div className="w-full max-w-[380px] flex flex-col gap-4 mb-[24px] animate-in fade-in duration-300">
              <div className="w-full h-1 bg-muted rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/50 w-1/3 animate-progress-slide rounded-full" />
              </div>
            </div>
          )}

          {status === "found" && (
            <div className="flex flex-col gap-4 mb-[24px] justify-center items-center animate-in zoom-in-95 duration-200">
              <span className="text-sm text-primary font-medium select-none animate-pulse">
                Opening conversation
              </span>
            </div>
          )}
        </div>

        {/* PRIMARY BUTTON */}
        <div className="h-[40px] w-full flex justify-center">
          {status === "idle" && (
            <Button
              onClick={() => startMatchmaking()}
              className="h-[40px] rounded-full px-[32px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium animate-in fade-in"
            >
              Continue
            </Button>
          )}
          {status === "searching" && (
            <Button
              variant="outline"
              onClick={cancelMatchmaking}
              className="h-[40px] rounded-full px-[32px] font-medium bg-background border-border animate-in fade-in"
            >
              Cancel
            </Button>
          )}
        </div>
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
