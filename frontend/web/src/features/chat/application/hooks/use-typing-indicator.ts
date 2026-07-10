"use client"

import * as React from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { usePartnerStateStore } from "../../presentation/store/partner-state-store"

export interface UseTypingIndicatorProps {
  sessionId: string;
}

export function useTypingIndicator({ sessionId }: UseTypingIndicatorProps) {
  const isTyping = usePartnerStateStore((state) => state.isTyping)
  const setIsTyping = usePartnerStateStore((state) => state.setIsTyping)

  React.useEffect(() => {
    const handlePartnerTyping = (payload: any) => {
      setIsTyping(payload.isTyping)
    }

    wsGateway.on("partner-typing", handlePartnerTyping)

    return () => {
      wsGateway.off("partner-typing", handlePartnerTyping)
      setIsTyping(false)
      if (wsGateway.readyState === WebSocket.OPEN) {
        wsGateway.send("typing-status", { sessionId, isTyping: false })
      }
    }
  }, [sessionId, setIsTyping])

  return { isTyping }
}
