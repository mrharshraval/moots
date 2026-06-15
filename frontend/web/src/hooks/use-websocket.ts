"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export type WebSocketStatus = "connecting" | "open" | "closing" | "closed" | "uninstantiated"

export interface UseWebSocketOptions {
  enabled?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number // base interval in ms
  shouldReconnect?: boolean
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onMessage?: (event: MessageEvent) => void
  onError?: (event: Event) => void
}

export function useWebSocket(url: string | null | undefined, options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    shouldReconnect = true,
    onOpen,
    onClose,
    onMessage,
    onError,
  } = options

  const [status, setStatus] = useState<WebSocketStatus>("uninstantiated")
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep callbacks in refs to avoid triggering reconnects when options change
  const callbacksRef = useRef({ onOpen, onClose, onMessage, onError })
  useEffect(() => {
    callbacksRef.current = { onOpen, onClose, onMessage, onError }
  }, [onOpen, onClose, onMessage, onError])

  const connect = useCallback(() => {
    if (typeof window === "undefined" || !url || !enabled) return

    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.close()
    }

    setStatus("connecting")
    const ws = new WebSocket(url)
    socketRef.current = ws

    ws.onopen = (event) => {
      setStatus("open")
      reconnectCountRef.current = 0
      if (callbacksRef.current.onOpen) {
        callbacksRef.current.onOpen(event)
      }
    }

    ws.onmessage = (event) => {
      if (callbacksRef.current.onMessage) {
        callbacksRef.current.onMessage(event)
      }
    }

    ws.onerror = (event) => {
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(event)
      }
    }

    ws.onclose = (event) => {
      setStatus("closed")
      socketRef.current = null
      if (callbacksRef.current.onClose) {
        callbacksRef.current.onClose(event)
      }

      // Handle reconnection logic
      if (shouldReconnect && reconnectCountRef.current < reconnectAttempts) {
        const timeout = reconnectInterval * Math.pow(2, reconnectCountRef.current) // exponential backoff
        reconnectCountRef.current += 1

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, timeout)
      }
    }
  }, [url, enabled, reconnectAttempts, reconnectInterval, shouldReconnect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    reconnectCountRef.current = reconnectAttempts // prevent reconnection

    if (socketRef.current) {
      setStatus("closing")
      socketRef.current.close()
    }
  }, [reconnectAttempts])

  const sendMessage = useCallback((data: string | ArrayBuffer | Blob | ArrayBufferView) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(data)
    } else {
      console.warn("WebSocket is not open. Message not sent.")
    }
  }, [])

  useEffect(() => {
    if (enabled && url) {
      connect()
    }

    return () => {
      // Clean up connection and timers on unmount or URL/enabled change
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [url, enabled, connect])

  return {
    socket: socketRef.current,
    status,
    sendMessage,
    connect,
    disconnect,
  }
}
