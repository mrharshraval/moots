"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { getOrInitializeNickname } from "@/lib/nickname"
import { useSession } from "next-auth/react"
import { getWsAccessToken } from "@/lib/ws-token"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { env } from "@/env"
import { logger } from "@/lib/logger"

const POPULAR_TOPICS = [
  { id: "gaming", label: "Gaming" },
  { id: "movies", label: "Movies" },
  { id: "music", label: "Music" },
  { id: "sports", label: "Sports" },
  { id: "technology", label: "Technology" },
  { id: "travel", label: "Travel" },
  { id: "food", label: "Food" },
  { id: "books", label: "Books" },
  { id: "art", label: "Art" },
]

export default function ChatConfiguratorPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  // Config state
  const [interests, setInterests] = React.useState<string[]>(["gaming", "music", "movies"])
  const [customTopics, setCustomTopics] = React.useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = React.useState(false)
  const [customInput, setCustomInput] = React.useState("")

  // State machine for dialog flow
  const [dialogState, setDialogState] = React.useState<"selection" | "matching" | "matched">("selection")
  const [seconds, setSeconds] = React.useState(0)
  
  const wsRef = React.useRef<WebSocket | null>(null)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("startMatching") === "true") {
      const saved = sessionStorage.getItem("moots_interests")
      const targetInterests = saved ? saved.split(",").filter(Boolean) : ["gaming", "music", "movies"]
      if (saved) {
        setInterests(targetInterests)
      }

      setDialogState("matching")
      setSeconds(0)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)

      const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`

      logger.info(`WebSocket: Connecting to Matchmaker (startMatching=true)`, {
        requestId,
        action: "matchmaking-connect"
      })

      // Inner async function — useEffect callbacks cannot themselves be async
      const connect = async () => {
        // Fetch backend JWT — required by the realtime server for authentication
        const accessToken = await getWsAccessToken()
        const wsUrl = accessToken
          ? `${env.NEXT_PUBLIC_WS_URL}?token=${encodeURIComponent(accessToken)}&requestId=${requestId}`
          : `${env.NEXT_PUBLIC_WS_URL}?requestId=${requestId}`

        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          logger.info(`WebSocket: Connected to Matchmaker`, { requestId })
          ws.send(
            JSON.stringify({
              type: "join-queue",
              payload: {
                nickname: getOrInitializeNickname(),
                username: session?.user?.name || (session?.user as any)?.username || undefined,
                interests: targetInterests,
                lang: "en",
                country: "global",
              },
            })
          )
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            const { type, payload } = data

            logger.info(`WebSocket Message: Received ${type}`, { requestId, eventType: type })

            if (type === "match-found" && payload.sessionId) {
              logger.info(`WebSocket: Match found! Session ID: ${payload.sessionId}`, { requestId, sessionId: payload.sessionId })
              if (timerRef.current) clearInterval(timerRef.current)
              ws.close()

              setDialogState("matched")
              setTimeout(() => {
                router.push(`/chat/${payload.sessionId}`)
              }, 1200)
            }
          } catch (e) {
            logger.error("Matchmaking WS error parsing message:", { requestId, errorMessage: (e as Error).message })
          }
        }

        ws.onerror = () => {
          logger.error("WS connection error", { requestId, errorCode: "WS_ERROR" })
        }
      }

      connect()
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getUserId = () => {
    if (typeof window === "undefined") return ""
    let userId = sessionStorage.getItem("moots_userId")
    if (!userId) {
      userId = `user-${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem("moots_userId", userId)
    }
    return userId
  }

  const handleToggleTopic = (topicId: string) => {
    if (interests.includes(topicId)) {
      setInterests(interests.filter((t) => t !== topicId))
      if (customTopics.includes(topicId)) {
        setCustomTopics(customTopics.filter((t) => t !== topicId))
      }
    } else {
      setInterests([...interests, topicId])
    }
  }

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanTag = customInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (cleanTag && !interests.includes(cleanTag)) {
      setInterests([...interests, cleanTag])
      setCustomTopics([...customTopics, cleanTag])
    }
    setCustomInput("")
    setShowCustomInput(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCustomSubmit()
    } else if (e.key === "Escape") {
      setCustomInput("")
      setShowCustomInput(false)
    }
  }

  const handleBlur = () => {
    const cleanTag = customInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    if (cleanTag && !interests.includes(cleanTag)) {
      setInterests((prev) => [...prev, cleanTag])
      setCustomTopics((prev) => [...prev, cleanTag])
    }
    setCustomInput("")
    setShowCustomInput(false)
  }

  const handleStartMatching = async () => {
    sessionStorage.setItem("moots_interests", interests.join(","))
    setDialogState("matching")
    setSeconds(0)

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`

    logger.info(`WebSocket: Connecting to Matchmaker (handleStartMatching)`, {
      requestId,
      action: "matchmaking-connect"
    })

    // Fetch backend JWT — required by the realtime server for authentication
    const accessToken = await getWsAccessToken()
    const wsUrl = accessToken
      ? `${env.NEXT_PUBLIC_WS_URL}?token=${encodeURIComponent(accessToken)}&requestId=${requestId}`
      : `${env.NEXT_PUBLIC_WS_URL}?requestId=${requestId}`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      logger.info(`WebSocket: Connected to Matchmaker (handleStartMatching)`, { requestId })
      ws.send(
        JSON.stringify({
          type: "join-queue",
          payload: {
            nickname: getOrInitializeNickname(),
            username: session?.user?.name || (session?.user as any)?.username || undefined,
            interests,
            lang: "en",
            country: "global",
          },
        })
      )
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const { type, payload } = data

        logger.info(`WebSocket Message: Received ${type}`, { requestId, userId, eventType: type })

        if (type === "match-found" && payload.sessionId) {
          logger.info(`WebSocket: Match found! Session ID: ${payload.sessionId}`, { requestId, userId, sessionId: payload.sessionId })
          if (timerRef.current) clearInterval(timerRef.current)
          ws.close()
          
          setDialogState("matched")
          setTimeout(() => {
            router.push(`/chat/${payload.sessionId}`)
          }, 1200)
        }
      } catch (e) {
        logger.error("Matchmaking WS error parsing message:", { requestId, userId, errorMessage: (e as Error).message })
      }
    }

    ws.onerror = (e) => {
      logger.error("WS connection error", { requestId, userId, errorCode: "WS_ERROR" })
    }
  }

  const handleCancelMatching = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setDialogState("selection")
    setSeconds(0)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.push("/")
    }
  }

  const allTopics = [
    ...POPULAR_TOPICS,
    ...customTopics.map((topic) => ({
      id: topic,
      label: topic.charAt(0).toUpperCase() + topic.slice(1),
    })),
  ]

  // Format the selected interests as dot-separated string
  const formatInterestsString = () => {
    if (interests.length === 0) return "Random vibe"
    return interests
      .map((tag) => {
        const predefined = POPULAR_TOPICS.find((t) => t.id === tag)
        return predefined ? predefined.label : tag.charAt(0).toUpperCase() + tag.slice(1)
      })
      .join(" • ")
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-background">
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className="flex! flex-col! p-6! gap-4! max-w-[400px] sm:max-w-[400px]! w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] rounded-3xl bg-background border border-border select-none shadow-lg">
          
          {dialogState === "selection" && (
            <>
              <DialogHeader className="text-left items-start">
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Discover People</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Choose a few topics to improve your matches.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                {/* Topic Chips Grid */}
                <div className="flex flex-wrap gap-2">
                  {allTopics.map((topic) => {
                    const isSelected = interests.includes(topic.id)
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => handleToggleTopic(topic.id)}
                        className={`text-xs h-9 px-4 rounded-[10px] font-medium border flex items-center justify-center transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground hover:bg-primary/95"
                            : "bg-muted/20 border-border/80 text-foreground hover:text-foreground hover:bg-muted/50 hover:border-muted-foreground/30"
                        }`}
                      >
                        {topic.label}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Topic Trigger */}
                <div className="flex items-center min-h-[26px]">
                  {showCustomInput ? (
                    <div className="w-full max-w-[200px] animate-in fade-in duration-200">
                      <Input
                        autoFocus
                        placeholder="Type custom topic..."
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        className="text-xs h-8.5 bg-background border-border w-full"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(true)}
                      className="text-xs text-muted-foreground/80 hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer font-medium py-0.5 p-0 border-0 bg-transparent"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} /> Add custom topic
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-1">
                <DialogClose asChild>
                  <Button variant="ghost" className="text-xs h-9.5 rounded-md font-medium text-muted-foreground hover:text-foreground px-4 cursor-pointer">
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={handleStartMatching} className="text-xs h-9.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/95 font-medium px-4 cursor-pointer shadow-sm">
                  Find a Match
                </Button>
              </div>
            </>
          )}

          {dialogState === "matching" && (
            <>
              <DialogHeader className="text-left items-start">
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground transition-all duration-300">
                  {seconds < 15 ? "Finding someone interesting..." : "Still searching for a great match..."}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1 transition-all duration-300">
                  {seconds < 15 
                    ? "We're looking for a compatible conversation partner." 
                    : "This is taking a little longer than usual."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
                {/* Thin Elegant Horizontal Progress Bar */}
                <div className="w-full h-0.5 bg-muted rounded-full relative overflow-hidden my-2">
                  <div className="animate-progress-slide rounded-full" />
                </div>
                
                {/* Selected Interests list */}
                <div className="text-xs text-muted-foreground/80 font-medium select-none text-center leading-normal">
                  {formatInterestsString()}
                </div>

                {/* Trust and reassurance text */}
                <div className="text-[11px] text-muted-foreground/50 text-center select-none font-medium mt-1">
                  Usually takes less than 10 seconds
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-1">
                <Button
                  onClick={handleCancelMatching}
                  className="text-xs h-9.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/95 font-medium px-4 cursor-pointer shadow-sm"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {dialogState === "matched" && (
            <>
              <DialogHeader className="text-left items-start">
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground">✨ Match Found</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Shared interests: {formatInterestsString()}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4 justify-center items-center animate-in zoom-in-95 duration-200">
                <span className="text-xs text-muted-foreground font-medium select-none animate-pulse">
                  Opening conversation...
                </span>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  )
}
