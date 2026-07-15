import * as React from "react"
import { cn } from "@/shared/utils/utils"

export function ReplyConnectorSender({ className }: { className?: string }) {
  return (
    <div className={cn("w-[24px] h-[24px] flex-shrink-0 relative", className)} aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full overflow-visible text-muted-foreground/30 dark:text-muted-foreground/25"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 24 0 L 24 12 A 12 12 0 0 1 12 24 L 0 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export function ReplyConnectorRecipient({ className }: { className?: string }) {
  return (
    <div className={cn("w-[24px] h-[24px] flex-shrink-0 relative", className)} aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full overflow-visible text-muted-foreground/30 dark:text-muted-foreground/25"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 0 0 L 0 12 A 12 12 0 0 0 12 24 L 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
