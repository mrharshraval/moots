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
  const setIsReconnectingLocal = usePartnerStateStore((state) => state.setIsReconnectingLocal)

  const sessionRef = React.useRef(session)
  React.useEffect(() => {
    sessionRef.current = session
  }, [session])

  React.useEffect(() => {
    // Wait until session is loaded to avoid race condition
    if (!session?.accessToken) {
      return
    }

    const handleOpen = () => {
      setIsReconnectingLocal(false)
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
      setIsReconnectingLocal(true)
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
      wsGateway.send("leave-chat")
      wsGateway.disconnect()
    }
  }, [sessionId, setIsWsReady, onOpen, session?.accessToken])
}
