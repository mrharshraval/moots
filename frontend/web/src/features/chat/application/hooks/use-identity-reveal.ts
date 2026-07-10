"use client"

import * as React from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { usePartnerStateStore } from "../../presentation/store/partner-state-store"
import { Session } from "@/providers/auth-provider"

export interface UseIdentityRevealProps {
  sessionId: string;
  session: Session | null;
}

export function useIdentityReveal({ sessionId, session }: UseIdentityRevealProps) {
  const {
    hasRevealedIdentity,
    partnerRevealedIdentity,
    connectionStatus,
    setPeerIdentity,
    setHasRevealedIdentity,
    setPartnerRevealedIdentity,
    setConnectionStatus,
  } = usePartnerStateStore()

  const handleRevealIdentity = React.useCallback(() => {
    if (!session?.user) return
    wsGateway.send("participant:identity-revealed", {
      sessionId,
      username: session.user.name || (session.user as any).username,
      name: session.user.name,
      image: session.user.image,
    })
    setHasRevealedIdentity(true)
  }, [sessionId, session, setHasRevealedIdentity])

  const handleSendConnectionRequest = React.useCallback(() => {
    wsGateway.send("connection:request", { sessionId })
    setConnectionStatus("pending_sent")
  }, [sessionId, setConnectionStatus])

  const handleAcceptConnectionRequest = React.useCallback(() => {
    wsGateway.send("connection:accepted", { sessionId })
    setConnectionStatus("accepted")
  }, [sessionId, setConnectionStatus])

  React.useEffect(() => {
    const handleIdentityRevealed = (payload: any) => {
      setPartnerRevealedIdentity(true)
      if (payload.username || payload.name) {
        setPeerIdentity(payload.name || "Stranger", payload.username || null)
      }
    }

    const handleConnectionRequest = () => setConnectionStatus("pending_received")
    const handleConnectionAccepted = () => setConnectionStatus("accepted")

    wsGateway.on("participant:identity-revealed", handleIdentityRevealed)
    wsGateway.on("connection:request", handleConnectionRequest)
    wsGateway.on("connection:accepted", handleConnectionAccepted)

    return () => {
      wsGateway.off("participant:identity-revealed", handleIdentityRevealed)
      wsGateway.off("connection:request", handleConnectionRequest)
      wsGateway.off("connection:accepted", handleConnectionAccepted)
    }
  }, [setPeerIdentity, setPartnerRevealedIdentity, setConnectionStatus])

  return {
    hasRevealedIdentity,
    partnerRevealedIdentity,
    connectionStatus,
    handleRevealIdentity,
    handleSendConnectionRequest,
    handleAcceptConnectionRequest,
  }
}
