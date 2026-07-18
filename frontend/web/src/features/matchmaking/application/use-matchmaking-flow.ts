import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMatchmakingStore } from "../presentation/store/matchmaking-store"
import { matchmakingService } from "../infrastructure/matchmaking.service"
import { useActorSession } from "@/features/auth"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export function useMatchmakingFlow() {
  const router = useRouter()
  const { displayName, username } = useActorSession()
  
  const status = useMatchmakingStore((state) => state.status)
  const setStatus = useMatchmakingStore((state) => state.setStatus)
  const setMatchedSessionId = useMatchmakingStore((state) => state.setMatchedSessionId)
  const interests = useMatchmakingStore((state) => state.interests)
  const setInterests = useMatchmakingStore((state) => state.setInterests)
  const setSearchStartedAt = useMatchmakingStore((state) => state.setSearchStartedAt)

  useEffect(() => {
    if (status !== "searching") return

    const unsubscribe = matchmakingService.onMatchFound((payload) => {
      if (payload?.sessionId) {
        setStatus("found")
        setMatchedSessionId(payload.sessionId)
        setSearchStartedAt(null)
        setTimeout(() => {
          router.push(`/chat/${payload.sessionId}`)
        }, 1200)
      }
    })
    
    const handleWsClose = () => {
      console.warn("Matchmaking: WebSocket closed while searching, resetting status.")
      setStatus("idle")
      setSearchStartedAt(null)
    }
    
    wsGateway.on("close", handleWsClose)

    return () => {
      unsubscribe()
      wsGateway.off("close", handleWsClose)
    }
  }, [status, router, setStatus, setMatchedSessionId, setSearchStartedAt])

  const startMatchmaking = async (targetInterests?: string[]) => {
    let activeInterests = targetInterests
    if (!activeInterests) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("moots-interests")
        activeInterests = saved ? JSON.parse(saved) : []
      } else {
        activeInterests = []
      }
    }
    
    setInterests(activeInterests || [])
    setStatus("searching")
    setMatchedSessionId(null)
    setSearchStartedAt(Date.now())

    try {
      await matchmakingService.joinQueue({
        nickname: displayName || "Anonymous",
        username: username || "anonymous",
        interests: activeInterests || [],
        lang: "en",
        country: "global",
      })
    } catch (err) {
      console.error("Failed to start matchmaking", err)
      setStatus("idle")
      setSearchStartedAt(null)
    }
  }

  const cancelMatchmaking = () => {
    setStatus("idle")
    setSearchStartedAt(null)
    matchmakingService.cancelQueue()
  }

  return {
    status,
    interests,
    setInterests,
    startMatchmaking,
    cancelMatchmaking
  }
}
