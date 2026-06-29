"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { getOrInitializeNickname } from "@/lib/nickname"
import { useSession } from "next-auth/react"
import { logger } from "@/lib/logger"
import { getWsAccessToken } from "@/lib/ws-token"
import {
  RotateCcw,
  MoreHorizontal,
  ArrowDown,
  ChevronDown,
  SmilePlus,
  CornerUpLeft,
  CheckCheck,
  ChevronRight,
  X,
  Copy,
  Edit3,
  Info,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { env } from "@/env"

/* ── Types ── */
interface Message {
  id: string
  sender: "user" | "stranger"
  content: string
  time: string
  seen?: boolean
  edited?: boolean
  reactions?: Record<string, string[]>
  replyTo?: {
    id: string
    sender: "user" | "stranger"
    content: string
  }
}

/* ── Content renderer ── */
function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    const isQuote = line.startsWith("->") || line.startsWith("> ")
    if (isQuote) {
      return (
        <div key={i} className="border-l-2 border-border pl-3 my-1 text-muted-foreground italic">
          {line.replace(/^-> /, "").replace(/^> /, "")}
        </div>
      )
    }
    return line ? <p key={i} className="mb-1 last:mb-0 break-words w-full">{line}</p> : <div key={i} className="h-3" />
  })
}

/* ── Typing dots ── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
        />
      ))}
    </div>
  )
}

export default function ChatSessionPage() {
  const router = useRouter()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const params = useParams()
  const sessionId = params?.sessionId as string

  const { data: session } = useSession()
  const [userId, setUserId] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [peerNickname, setPeerNickname] = React.useState("Stranger")
  const [peerUsername, setPeerUsername] = React.useState<string | null>(null)

  const peerDisplayName = React.useMemo(() => {
    return peerUsername || peerNickname
  }, [peerUsername, peerNickname])

  const [pageState, setPageState] = React.useState<"active" | "disconnected" | "matching" | "matched">("active")
  const [matchingSeconds, setMatchingSeconds] = React.useState(0)
  const [interests, setInterests] = React.useState<string[]>([])

  React.useEffect(() => {
    if (pageState === "active") {
      window.dispatchEvent(
        new CustomEvent("moots:partner-loaded", {
          detail: {
            username: peerUsername,
            nickname: peerNickname,
          },
        })
      )
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent("moots:partner-loaded", {
          detail: {
            username: null,
            nickname: null,
          },
        })
      )
    }
  }, [peerUsername, peerNickname, pageState])

  const [hasRevealedIdentity, setHasRevealedIdentity] = React.useState(false)
  const [partnerRevealedIdentity, setPartnerRevealedIdentity] = React.useState(false)
  const [connectionStatus, setConnectionStatus] = React.useState<"none" | "pending_sent" | "pending_received" | "accepted">("none")

  const handleRevealIdentity = () => {
    if (!wsRef.current || !session?.user) return
    wsRef.current.send(
      JSON.stringify({
        type: "participant:identity-revealed",
        payload: {
          sessionId,
          username: session.user.name || (session.user as any).username,
          name: session.user.name,
          image: session.user.image,
        },
      })
    )
    setHasRevealedIdentity(true)
  }

  const handleSendConnectionRequest = async () => {
    if (!wsRef.current) return
    wsRef.current.send(
      JSON.stringify({
        type: "connection:request",
        payload: { sessionId },
      })
    )
    setConnectionStatus("pending_sent")
  }

  const handleAcceptConnectionRequest = async () => {
    if (!wsRef.current) return
    wsRef.current.send(
      JSON.stringify({
        type: "connection:accepted",
        payload: { sessionId },
      })
    )
    setConnectionStatus("accepted")
  }

  const [inputText, setInputText] = React.useState("")
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = React.useState<Message | null>(null)
  const [isTyping, setIsTyping] = React.useState(false)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)
  const [expandedMsgs, setExpandedMsgs] = React.useState<Set<string>>(new Set())

  const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = React.useRef<{ time: number; msgId: string } | null>(null)
  const [activeTouchMessage, setActiveTouchMessage] = React.useState<Message | null>(null)
  const [showTouchSheet, setShowTouchSheet] = React.useState(false)

  const getTouchHandlers = (msg: Message) => {
    return {
      onTouchStart: () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
        longPressTimeoutRef.current = setTimeout(() => {
          setActiveTouchMessage(msg)
          setShowTouchSheet(true)
          if (typeof window !== "undefined" && navigator.vibrate) {
            navigator.vibrate(50)
          }
        }, 500)
      },
      onTouchEnd: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
        const now = Date.now()
        const lastTap = lastTapRef.current
        if (lastTap && lastTap.msgId === msg.id && now - lastTap.time < 300) {
          handleReact(msg.id, "❤️")
          lastTapRef.current = null
          if (typeof window !== "undefined" && navigator.vibrate) {
            navigator.vibrate([40, 40])
          }
        } else {
          lastTapRef.current = { time: now, msgId: msg.id }
        }
      },
      onTouchMove: () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current)
          longPressTimeoutRef.current = null
        }
      },
    }
  }

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const wsRef = React.useRef<WebSocket | null>(null)
  const matchingWsRef = React.useRef<WebSocket | null>(null)
  const matchingTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const isEngaged = React.useMemo(() => {
    return messages.some((m) => m.sender === "user") && messages.some((m) => m.sender === "stranger")
  }, [messages])

  React.useEffect(() => {
    let uId = sessionStorage.getItem("moots_userId")
    if (!uId) {
      uId = `user-${Math.random().toString(36).slice(2, 11)}`
      sessionStorage.setItem("moots_userId", uId)
    }
    setUserId(uId)

    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`

    logger.info(`WebSocket: Connecting to Chat Server`, {
      requestId,
      sessionId,
      action: "chat-connect"
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

      const sendReadReceipt = () => {
        if (ws.readyState === WebSocket.OPEN && document.visibilityState === "visible") {
          ws.send(
            JSON.stringify({
              type: "read-messages",
              payload: { sessionId },
            })
          )
        }
      }

      ws.onopen = () => {
        logger.info(`WebSocket: Connected to Chat Server`, { requestId, sessionId })
        ws.send(
          JSON.stringify({
            type: "join-chat",
            payload: {
              nickname: getOrInitializeNickname(),
              username: session?.user?.name || (session?.user as any)?.username || undefined,
              sessionId
            },
          })
        )
        setTimeout(sendReadReceipt, 100)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { type, payload } = data

          logger.info(`WebSocket Message: Received ${type}`, { requestId, userId: uId, sessionId, eventType: type })

          switch (type) {
            case "chat-history": {
              const history = payload.messages.map((m: any) => ({
                id: m.id,
                sender: m.senderId === uId ? "user" : "stranger",
                content: m.content,
                time: m.time,
                seen: m.seen,
                edited: m.edited,
                reactions: m.reactions,
                replyTo: m.replyTo
                  ? {
                      id: m.replyTo.id,
                      sender: m.replyTo.senderId === uId ? "user" : "stranger",
                      content: m.replyTo.content,
                    }
                  : undefined,
              }))
              setMessages(history)
              if (payload.partnerNickname) {
                setPeerNickname(payload.partnerNickname)
              }
              if (payload.partnerUsername) {
                setPeerUsername(payload.partnerUsername)
              }
              sendReadReceipt()
              break
            }

            case "message": {
              const newMsg: Message = {
                id: payload.id,
                sender: payload.senderId === uId ? "user" : "stranger",
                content: payload.content,
                time: payload.time,
                seen: payload.seen,
                edited: payload.edited,
                reactions: payload.reactions,
                replyTo: payload.replyTo
                  ? {
                      id: payload.replyTo.id,
                      sender: payload.replyTo.senderId === uId ? "user" : "stranger",
                      content: payload.replyTo.content,
                    }
                  : undefined,
              }
              setMessages((prev) => [...prev, newMsg])
              if (newMsg.sender === "stranger") {
                sendReadReceipt()
              }
              break
            }

            case "reaction-update": {
              const { messageId, reactions } = payload
              setMessages((prev) =>
                prev.map((msg) => (msg.id === messageId ? { ...msg, reactions } : msg))
              )
              break
            }

            case "partner-seen-messages": {
              setMessages((prev) =>
                prev.map((msg) => (msg.sender === "user" ? { ...msg, seen: true } : msg))
              )
              break
            }

            case "message-edited": {
              const { messageId, content, edited } = payload
              setMessages((prev) =>
                prev.map((msg) => (msg.id === messageId ? { ...msg, content, edited } : msg))
              )
              setEditingMsg((curr) => (curr?.id === messageId ? null : curr))
              break
            }

            case "partner-typing": {
              setIsTyping(payload.isTyping)
              break
            }

            case "partner-joined": {
              if (payload.partnerNickname) {
                setPeerNickname(payload.partnerNickname)
              }
              if (payload.partnerUsername) {
                setPeerUsername(payload.partnerUsername)
              }
              break
            }

            case "partner-disconnected": {
              ws.close()
              setPageState("disconnected")
              break
            }

            case "participant:identity-revealed": {
              setPartnerRevealedIdentity(true)
              if (payload.username) setPeerUsername(payload.username)
              if (payload.name) setPeerNickname(payload.name)
              break
            }

            case "connection:request": {
              setConnectionStatus("pending_received")
              break
            }

            case "connection:accepted": {
              setConnectionStatus("accepted")
              break
            }
          }
        } catch (e) {
          console.error("Chat WS message parsing error:", e)
        }
      }

      window.addEventListener("focus", sendReadReceipt)
      document.addEventListener("visibilitychange", sendReadReceipt)

      // Return cleanup so the outer effect can call it
      return () => {
        ws.close()
        window.removeEventListener("focus", sendReadReceipt)
        document.removeEventListener("visibilitychange", sendReadReceipt)
      }
    }

    // Fire the async connection; capture returned cleanup fn
    let cleanup: (() => void) | undefined
    connect().then((fn) => { cleanup = fn })

    return () => {
      cleanup?.()
      if (matchingTimerRef.current) clearInterval(matchingTimerRef.current)
      if (matchingWsRef.current) matchingWsRef.current.close()
      // Fallback: also close via ref in case cleanup hasn't been set yet
      if (wsRef.current) wsRef.current.close()
    }
  }, [sessionId, router])


  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [inputText])

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, isTyping])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }

  const scrollToBottom = () =>
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })

  const startLocalMatching = () => {
    setPageState("matching")
    setMatchingSeconds(0)

    if (matchingTimerRef.current) clearInterval(matchingTimerRef.current)
    matchingTimerRef.current = setInterval(() => {
      setMatchingSeconds((prev) => prev + 1)
    }, 1000)

    const saved = sessionStorage.getItem("moots_interests")
    const targetInterests = saved ? saved.split(",").filter(Boolean) : ["gaming", "music", "movies"]
    setInterests(targetInterests)

    const wsUrl = env.NEXT_PUBLIC_WS_URL
    const ws = new WebSocket(wsUrl)
    matchingWsRef.current = ws

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join-queue",
          payload: {
            userId,
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

        if (type === "match-found" && payload.sessionId) {
          if (matchingTimerRef.current) clearInterval(matchingTimerRef.current)
          ws.close()
          
          setPageState("matched")
          setTimeout(() => {
            router.push(`/chat/${payload.sessionId}`)
            setPageState("active")
          }, 1000)
        }
      } catch (e) {
        console.error("Local matchmaking WS error:", e)
      }
    }

    ws.onerror = (e) => {
      console.error("Local WS connection error:", e)
    }
  }

  const cancelLocalMatching = () => {
    if (matchingTimerRef.current) clearInterval(matchingTimerRef.current)
    if (matchingWsRef.current) {
      matchingWsRef.current.close()
      matchingWsRef.current = null
    }
    setPageState("disconnected")
  }

  const send = () => {
    const text = inputText.trim()
    if (!text || !wsRef.current) return

    if (editingMsg) {
      wsRef.current.send(
        JSON.stringify({
          type: "edit-message",
          payload: {
            sessionId,
            messageId: editingMsg.id,
            newContent: text,
          },
        })
      )
      setEditingMsg(null)
    } else {
      wsRef.current.send(
        JSON.stringify({
          type: "send-message",
          payload: {
            sessionId,
            content: text,
            replyTo: replyingTo
              ? {
                  id: replyingTo.id,
                  senderId: replyingTo.sender === "user" ? userId : "stranger-id",
                  content: replyingTo.content,
                }
              : undefined,
          },
        })
      )
      setReplyingTo(null)
    }

    setInputText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    // Clear typing state
    wsRef.current.send(
      JSON.stringify({
        type: "typing-status",
        payload: { sessionId, isTyping: false },
      })
    )
  }

  const handleInputChange = (val: string) => {
    setInputText(val)
    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing-status",
          payload: { sessionId, isTyping: val.trim().length > 0 },
        })
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const toggleExpand = (id: string) =>
    setExpandedMsgs((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const handleReact = (id: string, emoji: string) => {
    if (wsRef.current) {
      wsRef.current.send(
        JSON.stringify({
          type: "send-reaction",
          payload: { sessionId, messageId: id, emoji },
        })
      )
    }
  }

  const lastUserMsgId = React.useMemo(() => {
    return [...messages].reverse().find((m) => m.sender === "user")?.id
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-background relative">

      {/* ── ACTIVE OR DISCONNECTED (Scenario 2: Engaged) ── */}
      {(pageState === "active" || (pageState === "disconnected" && isEngaged)) ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Action Bar */}
          {pageState === "active" && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/10 shrink-0">
              <div className="text-xs text-muted-foreground flex gap-4">
                {partnerRevealedIdentity ? (
                  <span className="text-primary font-medium flex items-center gap-1.5"><CheckCheck className="w-3.5 h-3.5" /> Identity Revealed</span>
                ) : (
                  <span>Anonymous Chat</span>
                )}
                {connectionStatus === "accepted" && (
                  <span className="text-primary font-medium flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Connected</span>
                )}
              </div>
              <div className="flex gap-2">
                {!hasRevealedIdentity && session?.user && (
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={handleRevealIdentity}>
                    Reveal Identity
                  </Button>
                )}
                {connectionStatus === "none" && (
                  <Button variant="secondary" size="sm" className="h-7 text-[11px]" onClick={handleSendConnectionRequest}>
                    Connect
                  </Button>
                )}
                {connectionStatus === "pending_sent" && (
                  <Button variant="secondary" size="sm" className="h-7 text-[11px]" disabled>
                    Request Sent
                  </Button>
                )}
                {connectionStatus === "pending_received" && (
                  <Button variant="secondary" size="sm" className="h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAcceptConnectionRequest}>
                    Accept Connection
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
          {/* justify-end keeps messages gravity-anchored to the bottom */}
          <div className="flex flex-col justify-end min-h-full px-6 pt-8 pb-4 gap-5 max-w-3xl mx-auto w-full">

            {messages.map((msg) => {
              const isUser = msg.sender === "user"
              const expanded = expandedMsgs.has(msg.id)
              const long = msg.content.length > 300
              const displayText = long && !expanded ? msg.content.slice(0, 300) + "…" : msg.content

              return (
                <div key={msg.id} className={cn("flex w-full group", isUser ? "justify-end" : "justify-start")}>
                  {isUser ? (

                    /* ── USER: right-aligned plain text ── */
                    <div className="flex flex-col items-end gap-1 max-w-[65%]">
                      {msg.replyTo && (
                        <div className="bg-muted/40 rounded-lg px-3 py-1.5 border-r-2 border-primary text-xs text-right max-w-full mb-1 opacity-80">
                          <span className="block font-semibold text-[10px] text-muted-foreground mb-0.5">
                            Replied to {msg.replyTo.sender === "user" ? "yourself" : peerDisplayName}
                          </span>
                          <span className="truncate block max-w-xs text-foreground/80">
                            {msg.replyTo.content}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 max-w-full justify-end w-full">
                        {/* Action strip: left of bubble */}
                        <div className="flex items-center gap-1 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                                <MoreHorizontal className="size-4.5" strokeWidth={1.75} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-3 bg-popover border border-border/40 rounded-xl shadow-lg flex flex-col gap-1 text-xs text-foreground z-50">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Message Details</span>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Sent:</span>
                                <span className="font-semibold">{msg.time}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-semibold">
                                  {msg.seen ? "Seen" : "Sent"}
                                  {msg.edited && " (Edited)"}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingMsg(msg)
                                  setReplyingTo(null)
                                  setInputText(msg.content)
                                  if (textareaRef.current) {
                                    textareaRef.current.focus()
                                  }
                                }}
                                className="w-full text-left mt-2 pt-2 border-t border-border/40 hover:text-primary transition-colors cursor-pointer font-medium"
                              >
                                Edit Message
                              </button>
                            </PopoverContent>
                          </Popover>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40"
                              >
                                <CornerUpLeft className="size-4.5" strokeWidth={1.75} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Reply</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                                <SmilePlus className="size-4.5" strokeWidth={1.75} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="flex items-center gap-1 p-1 bg-popover border border-border rounded-full shadow-lg">
                              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleReact(msg.id, emoji)
                                  }}
                                  className="hover:scale-125 hover:bg-muted active:scale-95 transition-all cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-full border-none bg-transparent outline-none"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Bubble */}
                        <div
                          {...getTouchHandlers(msg)}
                          className="bg-muted/70 dark:bg-muted/30 border border-border/40 text-foreground rounded-2xl px-4 py-2.5 shadow-xs text-left max-w-full relative shrink select-none touch-manipulation"
                        >
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words w-full">
                            {displayText}
                          </p>
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="absolute -bottom-3 flex items-center gap-1.5 bg-background dark:bg-card border border-border/60 rounded-full px-2 py-0.5 text-[11px] shadow-xs z-10 right-4 select-none">
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                const hasYou = userIds.includes(userId)
                                const hasStranger = userIds.some((id) => id !== userId)
                                let who = ""
                                if (hasYou && hasStranger) who = `You and ${peerDisplayName}`
                                else if (hasYou) who = "You"
                                else if (hasStranger) who = peerDisplayName

                                return (
                                  <Tooltip key={emoji}>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-pointer flex items-center gap-0.5 font-medium">
                                        <span>{emoji}</span>
                                        {userIds.length > 1 && <span className="text-[10px] text-muted-foreground">{userIds.length}</span>}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {who} reacted
                                    </TooltipContent>
                                  </Tooltip>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      {long && (
                        <button
                          onClick={() => toggleExpand(msg.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none mt-1"
                        >
                          {expanded ? "Show less" : "Show more"}
                          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} strokeWidth={2} />
                        </button>
                      )}
                      {msg.id === lastUserMsgId && msg.seen && (
                        <span className="text-[10px] text-muted-foreground/70 mt-1 select-none pr-1">
                          Seen just now
                        </span>
                      )}
                    </div>

                  ) : (

                    /* ── STRANGER: avatar + bubble layout ── */
                    <div className="flex flex-col items-start gap-1 max-w-[65%]">
                      {/* Horizontal row aligning Avatar with bottom of Bubble */}
                      <div className="flex items-end gap-3 w-full">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="text-xs font-semibold bg-foreground/10">
                            {peerDisplayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                          {msg.replyTo && (
                            <div className="bg-muted/40 rounded-lg px-3 py-1.5 border-l-2 border-primary text-xs text-left max-w-full mb-0.5 opacity-80">
                              <span className="block font-semibold text-[10px] text-muted-foreground mb-0.5">
                                Replied to {msg.replyTo.sender === "user" ? "you" : peerDisplayName}
                              </span>
                              <span className="truncate block max-w-xs text-foreground/80">
                                {msg.replyTo.content}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 max-w-full w-full">
                            {/* Bubble */}
                            <div
                              {...getTouchHandlers(msg)}
                              className="bg-muted/70 dark:bg-muted/30 border border-border/40 rounded-2xl px-4 py-2.5 shadow-xs w-fit max-w-full text-left relative shrink select-none touch-manipulation"
                            >
                              <div className="text-[15px] leading-relaxed text-foreground break-words w-full">
                                {renderContent(displayText)}
                                {long && (
                                  <button
                                    onClick={() => toggleExpand(msg.id)}
                                    className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none"
                                  >
                                    {expanded ? "Show less" : "Show more"}
                                    <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} strokeWidth={2} />
                                  </button>
                                )}
                              </div>
                              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div className="absolute -bottom-3 flex items-center gap-1.5 bg-background dark:bg-card border border-border/60 rounded-full px-2 py-0.5 text-[11px] shadow-xs z-10 left-4 select-none">
                                  {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                    const hasYou = userIds.includes(userId)
                                    const hasStranger = userIds.some((id) => id !== userId)
                                    let who = ""
                                    if (hasYou && hasStranger) who = `You and ${peerDisplayName}`
                                    else if (hasYou) who = "You"
                                    else if (hasStranger) who = peerDisplayName

                                    return (
                                      <Tooltip key={emoji}>
                                        <TooltipTrigger asChild>
                                          <span className="cursor-pointer flex items-center gap-0.5 font-medium">
                                            <span>{emoji}</span>
                                            {userIds.length > 1 && <span className="text-[10px] text-muted-foreground">{userIds.length}</span>}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {who} reacted
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Action strip: right of bubble */}
                            <div className="flex items-center gap-1 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                                    <SmilePlus className="size-4.5" strokeWidth={1.75} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="flex items-center gap-1 p-1 bg-popover border border-border rounded-full shadow-lg">
                                  {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleReact(msg.id, emoji)
                                      }}
                                      className="hover:scale-125 hover:bg-muted active:scale-95 transition-all cursor-pointer text-base w-7 h-7 flex items-center justify-center rounded-full border-none bg-transparent outline-none"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setReplyingTo(msg)}
                                    className="hover:text-foreground cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40"
                                  >
                                    <CornerUpLeft className="size-4.5" strokeWidth={1.75} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Reply</TooltipContent>
                              </Tooltip>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none p-1 rounded-md hover:bg-muted/40">
                                    <MoreHorizontal className="size-4.5" strokeWidth={1.75} />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-40 p-3 bg-popover border border-border/40 rounded-xl shadow-lg flex flex-col gap-1 text-xs text-foreground z-50">
                                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Message Details</span>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Sent:</span>
                                    <span className="font-semibold">{msg.time}</span>
                                  </div>
                                  {msg.edited && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Edited:</span>
                                      <span className="font-semibold">Yes</span>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Typing indicator */}
            {isTyping && pageState === "active" && (
              <div className="flex items-start gap-3 justify-start">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-foreground/10">
                    {peerDisplayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <TypingIndicator />
              </div>
            )}

            {/* Scenario 2: Engaged Conversation Ended Card */}
            {pageState === "disconnected" && isEngaged && (
              <div className="mt-8 border-t border-border/40 pt-8 pb-4 w-full">
                <div className="flex flex-col items-center text-center gap-4 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
                  <div className="flex flex-col items-center gap-1.5">
                    <h3 className="text-md font-bold tracking-tight text-foreground">Conversation Ended</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {peerDisplayName} left.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2.5 w-full mt-2">
                    <Button
                      onClick={startLocalMatching}
                      className="w-full text-xs h-9.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/95 font-medium px-4 cursor-pointer shadow-sm animate-in zoom-in-95 duration-200"
                    >
                      Find Another Match
                    </Button>
                    <button
                      type="button"
                      onClick={() => router.push("/chat")}
                      className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-medium py-1.5 bg-transparent border-0"
                    >
                      Change Interests
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Scenario 1: No Engagement (Match Left) ── */}
      {pageState === "disconnected" && !isEngaged && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background text-foreground max-w-md mx-auto w-full">
          <div className="flex flex-col items-center text-center gap-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Match Left</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                They left before the conversation started.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full mt-1">
              <Button
                onClick={startLocalMatching}
                className="w-full text-xs h-9.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/95 font-medium px-4 cursor-pointer shadow-sm"
              >
                Find Another Match
              </Button>
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-medium py-1.5 bg-transparent border-0"
              >
                Change Interests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MATCHING / MATCHED STATE ── */}
      {(pageState === "matching" || pageState === "matched") && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background text-foreground max-w-sm mx-auto w-full">
          <div className="flex flex-col items-center text-center gap-6 w-full animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-1.5">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {pageState === "matching" ? "Finding your match..." : "Match Found"}
              </h2>
            </div>

            {pageState === "matching" && (
              <div className="w-full h-0.5 bg-muted rounded-full relative overflow-hidden my-2">
                <div className="animate-progress-slide rounded-full bg-primary" />
              </div>
            )}

            <div className="text-xs text-muted-foreground/80 font-medium select-none text-center leading-normal">
              {interests.join(" • ") || "Random vibe"}
            </div>

            {pageState === "matching" && (
              <Button
                variant="ghost"
                onClick={cancelLocalMatching}
                className="text-xs h-9.5 rounded-md font-medium text-muted-foreground hover:text-foreground px-4 cursor-pointer mt-2"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── SCROLL TO BOTTOM ── */}
      {showScrollBtn && pageState === "active" && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 size-9 rounded-full shadow-md z-30"
        >
          <ArrowDown className="size-5" strokeWidth={2} />
        </Button>
      )}

      {/* ── BOTTOM STICKY CONTAINER ── */}
      {pageState === "active" && (
        <div className="sticky bottom-0 bg-background shrink-0 w-full z-20 pt-2 pb-5">
          {/* ── EDITING PREVIEW ── */}
          {editingMsg && (
            <div className="px-4 pb-3 max-w-3xl mx-auto w-full">
              <div className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-2 border border-primary/20 text-xs">
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[10px] text-primary mb-0.5">
                    Editing message
                  </span>
                  <span className="text-foreground truncate max-w-lg">
                    {editingMsg.content}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingMsg(null)
                    setInputText("")
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted border-none bg-transparent outline-none"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── REPLY PREVIEW ── */}
          {replyingTo && (
            <div className="px-4 pb-3 max-w-3xl mx-auto w-full">
              <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border/40 text-xs">
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-[10px] text-muted-foreground mb-0.5">
                    Replied to {replyingTo.sender === "user" ? "yourself" : peerDisplayName}
                  </span>
                  <span className="text-foreground truncate max-w-lg">
                    {replyingTo.content}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted border-none bg-transparent outline-none"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── INPUT BAR ── */}
          <div className="px-4 max-w-3xl mx-auto w-full">
            <div className="flex flex-col bg-muted rounded-2xl p-3 gap-2">

              <Textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="block w-full !bg-transparent !border-none focus-visible:!ring-0 focus-visible:ring-offset-0 resize-none min-h-[28px] max-h-[200px] text-[14px] md:text-[14px] text-foreground placeholder:text-muted-foreground/50 py-1 leading-relaxed !shadow-none p-0 overflow-y-auto custom-scrollbar disabled:opacity-40 disabled:cursor-not-allowed"
              />

              {/* Action Row at bottom */}
              <div className="flex items-center justify-between mt-1 pt-1">
                {/* Left Actions */}
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none rounded-lg hover:bg-foreground/5"
                      >
                        <RotateCcw className="size-5" strokeWidth={1.75} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>New partner</TooltipContent>
                  </Tooltip>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  {!inputText.trim() ? (
                    <button
                      onClick={() => router.push("/chat")}
                      className="h-8 px-3 rounded-full flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none whitespace-nowrap hover:bg-foreground/5"
                    >
                      Skip
                      <ChevronRight className="size-4 mt-px" strokeWidth={2} />
                    </button>
                  ) : (
                    <button
                      onClick={send}
                      className="size-8 rounded-full flex items-center justify-center bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer border-none outline-none"
                    >
                      <ChevronRight className="size-5 -rotate-90" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE TOUCH CONTEXT SHEET ── */}
      {showTouchSheet && activeTouchMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-end justify-center animate-in fade-in duration-200" onClick={() => setShowTouchSheet(false)}>
          <div 
            className="w-full max-w-md bg-card border-t border-border rounded-t-2xl p-5 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handlebar */}
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-2" />

            {/* Quick Reactions */}
            <div className="flex items-center justify-between gap-1 bg-muted/30 p-2 rounded-xl border border-border/40">
              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => {
                const isReacted = activeTouchMessage.reactions?.[emoji]?.includes(userId)
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleReact(activeTouchMessage.id, emoji)
                      setShowTouchSheet(false)
                    }}
                    className={cn(
                      "text-2xl w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90 hover:bg-muted cursor-pointer border-none bg-transparent outline-none",
                      isReacted && "bg-primary/10 border border-primary/20 scale-110"
                    )}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>

            {/* Action List */}
            <div className="flex flex-col bg-muted/20 border border-border/40 rounded-xl divide-y divide-border/40">
              <button
                onClick={() => {
                  setReplyingTo(activeTouchMessage)
                  setEditingMsg(null)
                  setShowTouchSheet(false)
                  if (textareaRef.current) textareaRef.current.focus()
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer border-none bg-transparent outline-none"
              >
                <CornerUpLeft className="size-4.5 text-muted-foreground" />
                Reply
              </button>

              {activeTouchMessage.sender === "user" && (
                <button
                  onClick={() => {
                    setEditingMsg(activeTouchMessage)
                    setReplyingTo(null)
                    setInputText(activeTouchMessage.content)
                    setShowTouchSheet(false)
                    if (textareaRef.current) textareaRef.current.focus()
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer border-none bg-transparent outline-none"
                >
                  <Edit3 className="size-4.5 text-muted-foreground" />
                  Edit Message
                </button>
              )}

              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeTouchMessage.content)
                  setShowTouchSheet(false)
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-left text-sm font-medium text-foreground hover:bg-muted/40 transition-colors cursor-pointer border-none bg-transparent outline-none"
              >
                <Copy className="size-4.5 text-muted-foreground" />
                Copy Text
              </button>

              <div className="flex flex-col gap-1 w-full px-4 py-3.5 text-xs text-muted-foreground bg-muted/5">
                <div className="flex items-center justify-between">
                  <span>Sent:</span>
                  <span className="font-semibold text-foreground">{activeTouchMessage.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-foreground">
                    {activeTouchMessage.seen ? "Seen" : "Sent"}
                    {activeTouchMessage.edited && " (Edited)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={() => setShowTouchSheet(false)}
              className="w-full text-xs h-10 rounded-xl font-medium"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
