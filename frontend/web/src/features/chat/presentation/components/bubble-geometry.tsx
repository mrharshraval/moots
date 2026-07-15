import * as React from "react"
import { cn } from "@/shared/utils/utils"

export type GroupPosition = "standalone" | "first" | "middle" | "last"

interface BubbleGeometry {
  classes: string
  hasTail: boolean
}

export function getBubbleGeometry(position: GroupPosition, isUser: boolean): BubbleGeometry {
  let classes = "rounded-[20px] "
  let hasTail = false // User requested no tails

  if (isUser) {
    // User (Right side)
    // Always round left corners
    classes += "rounded-l-[20px] "
    if (position === "first") classes += "rounded-tr-[20px] rounded-br-[5px]"
    else if (position === "middle") classes += "rounded-tr-[5px] rounded-br-[5px]"
    else if (position === "last") classes += "rounded-tr-[5px] rounded-br-[16px]"
    else if (position === "standalone") classes += "rounded-tr-[20px] rounded-br-[16px]"
  } else {
    // Stranger (Left side)
    // Always round right corners
    classes += "rounded-r-[20px] "
    if (position === "first") classes += "rounded-tl-[20px] rounded-bl-[5px]"
    else if (position === "middle") classes += "rounded-tl-[5px] rounded-bl-[5px]"
    else if (position === "last") classes += "rounded-tl-[5px] rounded-bl-[16px]"
    else if (position === "standalone") classes += "rounded-tl-[20px] rounded-bl-[16px]"
  }

  return { classes, hasTail }
}

export function BubbleTail({ isUser, isOutlined }: { isUser: boolean; isOutlined?: boolean }) {
  // We use the classic CSS overlapping radius trick to create the perfect Apple tail.
  // This uses absolute positioned divs that mask each other to create the swoosh.
  if (isOutlined) {
    // For outlined bubbles, we just don't render the tail to keep it clean, 
    // or we'd need a complex SVG. The mockups don't require tails on the outlined preview anyway.
    return null
  }

  // User requested no tails
  return null
}
