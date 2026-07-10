"use client"

import * as React from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export interface UseReadReceiptsProps {
  sessionId: string;
}

export function useReadReceipts({ sessionId }: UseReadReceiptsProps) {
  const sendReadReceipt = React.useCallback(() => {
    if (wsGateway.readyState === WebSocket.OPEN && document.visibilityState === "visible") {
      wsGateway.send("read-messages", { sessionId })
    }
  }, [sessionId])

  React.useEffect(() => {
    window.addEventListener("focus", sendReadReceipt)
    document.addEventListener("visibilitychange", sendReadReceipt)

    // Trigger initial check
    sendReadReceipt()

    return () => {
      window.removeEventListener("focus", sendReadReceipt)
      document.removeEventListener("visibilitychange", sendReadReceipt)
    }
  }, [sendReadReceipt])

  return { sendReadReceipt }
}
