import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { getAccessToken } from "@/providers/auth-provider"

export interface JoinQueuePayload {
  nickname: string
  username: string
  interests: string[]
  lang: string
  country: string
}

class MatchmakingService {
  /**
   * Resolves when an access token is available, or rejects if timeout occurs.
   * Useful when waiting for the auto-guest-login to finish.
   */
  private waitForToken(timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (getAccessToken()) return resolve()
      
      let elapsed = 0
      const interval = 200
      const poll = setInterval(() => {
        elapsed += interval
        if (getAccessToken()) {
          clearInterval(poll)
          resolve()
        } else if (elapsed >= timeoutMs) {
          clearInterval(poll)
          reject(new Error("Timeout waiting for access token"))
        }
      }, interval)
    })
  }

  /**
   * Resolves when the WebSocket gateway is strictly in a ready (OPEN) state.
   */
  private connectGateway(): Promise<void> {
    return new Promise((resolve) => {
      wsGateway.connect()
      if (wsGateway.readyState === 1) {
        resolve()
      } else {
        const handleOpen = () => {
          resolve()
          wsGateway.off("open", handleOpen)
        }
        wsGateway.on("open", handleOpen)
      }
    })
  }

  /**
   * Orchestrates the prerequisites (auth token, socket connection) and sends the join request.
   */
  async joinQueue(payload: JoinQueuePayload): Promise<void> {
    await this.waitForToken()
    await this.connectGateway()
    wsGateway.send("join-queue", payload)
  }

  /**
   * Cancels the active matchmaking request.
   */
  cancelQueue(): void {
    if (wsGateway.readyState === 1) {
      wsGateway.send("cancel-queue", {})
    }
  }

  /**
   * Subscribes to the match-found event. Returns an unsubscribe function.
   */
  onMatchFound(callback: (payload: { sessionId: string }) => void): () => void {
    wsGateway.on("match-found", callback)
    return () => {
      wsGateway.off("match-found", callback)
    }
  }
}

export const matchmakingService = new MatchmakingService()
