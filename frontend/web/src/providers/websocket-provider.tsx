"use client"

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { useMessagesStore } from "@/features/chat/presentation/store/messages-store"

interface WebSocketContextValue {
  readyState: number
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [readyState, setReadyState] = useState<number>(wsGateway.readyState)

  useEffect(() => {
    wsGateway.connect()

    const handleOpen = () => setReadyState(1) // WebSocket.OPEN is 1
    const handleClose = () => setReadyState(3) // WebSocket.CLOSED is 3
    
    const handleConversationHidden = (payload: any) => {
      useMessagesStore.getState().updateConversation(payload.conversationId, { hiddenAt: payload.hiddenAt })
    }

    const handleConversationEnded = (payload: any) => {
      useMessagesStore.getState().updateConversation(payload.conversationId, { 
        status: "ENDED", 
        endedAt: payload.endedAt, 
        endedByActorId: payload.endedByActorId 
      })
    }
    
    wsGateway.on("open", handleOpen)
    wsGateway.on("close", handleClose)
    wsGateway.on("conversation:hidden", handleConversationHidden)
    wsGateway.on("conversation:ended", handleConversationEnded)

    return () => {
      wsGateway.off("open", handleOpen)
      wsGateway.off("close", handleClose)
      wsGateway.off("conversation:hidden", handleConversationHidden)
      wsGateway.off("conversation:ended", handleConversationEnded)
      wsGateway.disconnect()
    }
  }, [])

  const value = {
    readyState,
    connect: () => wsGateway.connect(),
    disconnect: () => wsGateway.disconnect()
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useGlobalWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useGlobalWebSocket must be used within a WebSocketProvider")
  }
  return context
}
