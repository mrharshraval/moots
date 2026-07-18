import { getAccessToken } from "@/providers/auth-provider"
import { env } from "@/env"
import { logger } from "@/shared/utils/logger"

export type WsEventHandler = (payload: unknown) => void

class WebSocketGateway {
  private ws: WebSocket | null = null
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Starts at 1s
  private isConnecting = false
  private intentionalDisconnect = false
  private reconnectTimeoutId: NodeJS.Timeout | null = null

  private listeners: Map<string, Set<WsEventHandler>> = new Map()

  private connectionAttemptId = 0

  constructor() {}

  async connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true
    this.intentionalDisconnect = false
    const currentAttemptId = ++this.connectionAttemptId

    try {
      let token: string | null = null;
      try {
        const currentToken = getAccessToken();
        if (currentToken) {
          token = currentToken;
        }
      } catch (e) {
        console.error("Failed to fetch session for WS", e);
      }
      
      this.token = token;
      
      if (!token) {
        logger.warn("WebSocketGateway: No authentication token yet, deferring connection")
        this.isConnecting = false
        // Do NOT set intentionalDisconnect — the caller may retry once a token is available
        return
      }
      
      if (this.intentionalDisconnect || this.connectionAttemptId !== currentAttemptId) {
        this.isConnecting = false
        return
      }

      const requestId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `req-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`
      
      let wsUrl = `${env.NEXT_PUBLIC_WS_URL}?requestId=${requestId}`

      logger.info(`WebSocketGateway: Connecting to server`, { requestId, action: "ws-connect" })
      
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.reconnectAttempts = 0
        logger.info(`WebSocketGateway: Connected successfully`, { requestId })
        if (this.token) {
          this.send("authenticate", { token: this.token })
        } else {
          this.emit("open", null)
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data && data.type) {
            if (data.type === "authenticated") {
              this.emit("open", null)
            }
            this.emit(data.type, data.payload)
          }
        } catch (e) {
          console.error("WS message parse error:", e)
        }
      }

      this.ws.onclose = () => {
        this.isConnecting = false
        this.ws = null
        this.emit("close", null)
        this.handleReconnect()
      }

      this.ws.onerror = (err) => {
        console.error("WebSocket error:", err)
      }
    } catch (e) {
      this.isConnecting = false
      console.error("WebSocket connection failed to initialize:", e)
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.intentionalDisconnect) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("WebSocket reached maximum reconnect attempts")
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`WebSocket reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts})`)
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId)
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect()
    }, delay)
  }

  disconnect() {
    this.intentionalDisconnect = true
    this.isConnecting = false
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(type: string, payload: unknown = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    } else {
      console.warn(`WebSocket not open, cannot send message of type: ${type}`)
    }
  }

  on(type: string, handler: WsEventHandler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
  }

  off(type: string, handler: WsEventHandler) {
    if (this.listeners.has(type)) {
      this.listeners.get(type)!.delete(handler)
    }
  }

  private emit(type: string, payload: unknown) {
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload)
        } catch (e) {
          console.error(`Error in WS event handler for ${type}:`, e)
        }
      })
    }
  }
  
  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED
  }
}

export const wsGateway = new WebSocketGateway()
