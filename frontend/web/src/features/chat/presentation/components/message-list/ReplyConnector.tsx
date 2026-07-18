import * as React from "react"

interface ReplyConnectorProps {
  isUser: boolean
  originalIsUser: boolean
}

export function ReplyConnector({ isUser }: ReplyConnectorProps) {
  if (isUser) {
    // Sender perspective: └──
    return (
      <svg
        width="32"
        height="24"
        viewBox="0 0 32 24"
        fill="none"
        className="absolute left-[16px] top-[-4px] text-muted-foreground/30 z-0 pointer-events-none overflow-visible"
      >
        {/* Goes down to y=10, smoothly curves with control point at corner (2,22) ending at (14,22), then straight right to x=32 */}
        <path d="M 2 0 L 2 10 Q 2 22 14 22 L 32 22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  } else {
    // Recipient perspective: ┌──
    return (
      <svg
        width="32"
        height="24"
        viewBox="0 0 32 24"
        fill="none"
        className="absolute left-[16px] bottom-0 text-muted-foreground/30 z-0 pointer-events-none overflow-visible"
      >
        {/* Goes up to y=14, smoothly curves with control point at corner (2,2) ending at (14,2), then straight right to x=32 */}
        <path d="M 2 24 L 2 14 Q 2 2 14 2 L 32 2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
}
