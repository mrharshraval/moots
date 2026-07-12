"use client"

import * as React from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { usePartnerStateStore } from "../../presentation/store/partner-state-store"
import { Session } from "@/providers/auth-provider"

export interface UseConnectionsProps {
  sessionId: string;
  session: Session | null;
}

export function useConnections({ sessionId, session }: UseConnectionsProps) {
  const {
    connectionStatus,
    setConnectionStatus,
  } = usePartnerStateStore()

  const handleSendConnectionRequest = React.useCallback(() => {
    wsGateway.send("connection:request", { sessionId })
    setConnectionStatus("pending_sent")
  }, [sessionId, setConnectionStatus])

  const handleAcceptConnectionRequest = React.useCallback(() => {
    wsGateway.send("connection:accepted", { sessionId })
    setConnectionStatus("accepted")
  }, [sessionId, setConnectionStatus])

  React.useEffect(() => {
    const handleConnectionRequest = () => setConnectionStatus("pending_received")
    const handleConnectionAccepted = () => setConnectionStatus("accepted")

    wsGateway.on("connection:request", handleConnectionRequest)
    wsGateway.on("connection:accepted", handleConnectionAccepted)

    return () => {
      wsGateway.off("connection:request", handleConnectionRequest)
      wsGateway.off("connection:accepted", handleConnectionAccepted)
    }
  }, [setConnectionStatus])

  return {
    connectionStatus,
    handleSendConnectionRequest,
    handleAcceptConnectionRequest,
  }
}
