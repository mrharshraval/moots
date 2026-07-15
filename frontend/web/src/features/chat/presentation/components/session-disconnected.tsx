import * as React from "react"
import { Button } from "@/shared/ui/button"

export type DisconnectScenario = "you_ended" | "other_ended_engaged" | "other_left_early" | "you_left_early"

export interface SessionDisconnectedProps {
  scenario: DisconnectScenario
  onContinue: () => void
}

export function SessionDisconnected({
  scenario,
  onContinue
}: SessionDisconnectedProps) {
  let title = ""
  let subtitle = ""

  if (scenario === "you_ended") {
    title = "Conversation ended"
    subtitle = "Thanks for chatting. This conversation is available in History for the next 24 hours."
  } else if (scenario === "other_ended_engaged") {
    title = "Conversation ended"
    subtitle = "The other person ended the conversation. You can review it in History for the next 24 hours."
  } else if (scenario === "other_left_early") {
    title = "Match left"
    subtitle = "They left before the conversation started."
  } else if (scenario === "you_left_early") {
    title = "Match skipped"
    subtitle = "You skipped this match before the conversation started."
  }

  return (
    <div className="flex-1 flex flex-col items-center pt-[22vh] pb-8 px-4 bg-background h-full w-full relative z-50">
      <div className="flex flex-col items-center w-full max-w-[420px] text-center animate-in fade-in duration-300">
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

        <h1 className="text-[18px] leading-[26px] font-semibold text-foreground mb-2">
          {title}
        </h1>

        <p className="text-[16px] leading-[24px] font-normal text-muted-foreground mb-[24px] w-full max-w-[420px]">
          {subtitle}
        </p>

        <div className="h-[40px] w-full flex justify-center">
          <Button
            onClick={onContinue}
            className="h-[40px] rounded-full px-[32px] bg-primary text-primary-foreground hover:bg-primary/90 font-medium animate-in fade-in group"
          >
            Continue
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-[13px] text-muted-foreground">
          By continuing, you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  )
}
