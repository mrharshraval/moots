import * as React from "react"
import { MatchmakingStatus } from "../store/matchmaking-store"
import { getTitle, getSubtitle } from "../utils/matchmaker-content"
import { useElapsedTime } from "../utils/use-elapsed-time"

interface MatchmakerHeaderProps {
  status: MatchmakingStatus
  interests: string[]
  searchStartedAt: number | null
}

export function MatchmakerHeader({ status, interests, searchStartedAt }: MatchmakerHeaderProps) {
  const elapsedSeconds = useElapsedTime(searchStartedAt)
  const title = getTitle(status)
  const subtitle = getSubtitle(status, elapsedSeconds, interests)

  return (
    <>
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

      <h1 className="text-[18px] leading-[26px] font-semibold text-foreground mb-2 transition-colors duration-300">
        {title}
      </h1>

      <p className="text-[16px] leading-[24px] font-normal text-muted-foreground mb-[24px] w-full transition-colors duration-300 max-w-[420px] text-center">
        {subtitle}
      </p>
    </>
  )
}
