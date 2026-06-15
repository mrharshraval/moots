"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useWebSocket, WebSocketStatus, UseWebSocketOptions } from "@/hooks/use-websocket"

interface WebSocketContextType {
  socket: WebSocket | null
  status: WebSocketStatus
  sendMessage: (data: string | ArrayBuffer | Blob | ArrayBufferView) => void
  connect: () => void
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  url: string | null | undefined
  options?: UseWebSocketOptions
  children: ReactNode
}

export function WebSocketProvider({ url, options, children }: WebSocketProviderProps) {
  const ws = useWebSocket(url, options)

  return (
    <WebSocketContext.Provider value={ws}>
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
