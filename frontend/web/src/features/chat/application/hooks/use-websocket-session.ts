"use client"

import * as React from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { getOrInitializeNickname } from "@/shared/utils/nickname"
import { Session } from "@/providers/auth-provider"
import { usePartnerStateStore } from "../../presentation/store/partner-state-store"

export interface UseWebSocketSessionProps {
  sessionId: string;
  session: Session | null;
  onOpen: () => void;
}

export function useWebSocketSession({
  sessionId,
  session,
  onOpen,
}: UseWebSocketSessionProps) {
  const setIsWsReady = usePartnerStateStore((state) => state.setIsWsReady)

  const sessionRef = React.useRef(session)
  React.useEffect(() => {
    sessionRef.current = session
  }, [session])

  React.useEffect(() => {
    const handleOpen = () => {
      const currentSession = sessionRef.current
      wsGateway.send("join-chat", {
        nickname: getOrInitializeNickname(),
        username: currentSession?.user?.name || (currentSession?.user as any)?.username || undefined,
        sessionId,
      })
      onOpen()
    }

    const handleClose = () => {
      setIsWsReady(false)
    }

    wsGateway.on("open", handleOpen)
    wsGateway.on("close", handleClose)

    wsGateway.connect()
    if (wsGateway.readyState === WebSocket.OPEN) {
      handleOpen()
    }

    return () => {
      wsGateway.off("open", handleOpen)
      wsGateway.off("close", handleClose)
    }
  }, [sessionId, setIsWsReady, onOpen])
}
