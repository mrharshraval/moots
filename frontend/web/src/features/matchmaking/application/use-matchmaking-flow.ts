import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useMatchmakingStore } from "../presentation/store/matchmaking-store"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { useActorSession } from "@/features/auth"
import { getAccessToken } from "@/providers/auth-provider"

export function useMatchmakingFlow() {
  const router = useRouter()
  const { actorId, displayName, username } = useActorSession()
  const { status, setStatus, matchedSessionId, setMatchedSessionId } = useMatchmakingStore()
  
  const [interests, setInterests] = useState<string[]>([])
  const [seconds, setSeconds] = useState(0)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === "searching") {
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  useEffect(() => {
    if (status !== "searching") return

    const handleMatchFound = (payload: any) => {
      if (payload?.sessionId) {
        setStatus("found")
        setMatchedSessionId(payload.sessionId)
        setTimeout(() => {
          router.push(`/chat/${payload.sessionId}`)
        }, 1200)
      }
    }

    wsGateway.on("match-found", handleMatchFound)
    
    return () => {
      wsGateway.off("match-found", handleMatchFound)
    }
  }, [status, router, setStatus, setMatchedSessionId])

  const startMatchmaking = (targetInterests?: string[]) => {
    let activeInterests = targetInterests
    if (!activeInterests) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("moots-interests")
        activeInterests = saved ? JSON.parse(saved) : []
      } else {
        activeInterests = []
      }
    }
    
    setInterests(activeInterests)
    setStatus("searching")
    setMatchedSessionId(null)

    const sendJoin = () => {
      wsGateway.send("join-queue", {
        nickname: displayName,
        username: username,
        interests: activeInterests,
        lang: "en",
        country: "global",
      })
    }

    const doConnect = () => {
      wsGateway.connect()
      if (wsGateway.readyState === 1) {
        sendJoin()
      } else {
        const handleOpen = () => {
          sendJoin()
          wsGateway.off("open", handleOpen)
        }
        wsGateway.on("open", handleOpen)
      }
    }

    // If the auth token is already available, connect immediately.
    // Otherwise, poll for up to 5 seconds (covers the auto-guest-login round trip).
    if (getAccessToken()) {
      doConnect()
    } else {
      const maxWait = 5000
      const interval = 200
      let elapsed = 0
      const poll = setInterval(() => {
        elapsed += interval
        if (getAccessToken()) {
          clearInterval(poll)
          doConnect()
        } else if (elapsed >= maxWait) {
          clearInterval(poll)
          // Token never arrived — give up and reset status
          setStatus("idle")
        }
      }, interval)
    }
  }

  const cancelMatchmaking = () => {
    setStatus("idle")
    if (wsGateway.readyState === 1) {
      wsGateway.send("cancel-queue", {}) 
    }
  }

  return {
    status,
    seconds,
    interests,
    setInterests,
    startMatchmaking,
    cancelMatchmaking
  }
}
