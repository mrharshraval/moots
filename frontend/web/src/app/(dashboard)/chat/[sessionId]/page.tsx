"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  RotateCcw,
  MoreHorizontal,
  ArrowDown,
  ChevronDown,
  SmilePlus,
  CornerUpLeft,
  ChevronRight,
  CheckCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

/* ── Types ── */
interface Message {
  id: string
  sender: "user" | "stranger"
  content: string
  time: string
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
    return line ? <p key={i} className="mb-1 last:mb-0">{line}</p> : <div key={i} className="h-3" />
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

  const [messages, setMessages] = React.useState<Message[]>([
    { id: "1", sender: "stranger", content: "Hey, how you doing?", time: "10:30 PM" },
    { id: "2", sender: "user",     content: "Hey, how you doing?", time: "10:31 PM" },
  ])

  const [inputText, setInputText] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)
  const [expandedMsgs, setExpandedMsgs] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, isTyping])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }

  const scrollToBottom = () =>
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })

  const send = () => {
    const text = inputText.trim()
    if (!text) return
    const msg: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((p) => [...p, msg])
    setInputText("")
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          sender: "stranger",
          content: "Got it! What would you like to talk about?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
    }, 2000)
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

  return (
    <div className="flex flex-col h-full bg-background relative">

      {/* ── MESSAGES ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-none"
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
                  <div className="flex flex-col items-end gap-1.5 max-w-[65%]">
                    <p className="text-[15px] leading-[1.7] text-foreground text-right whitespace-pre-wrap">
                      {displayText}
                    </p>
                    {long && (
                      <button
                        onClick={() => toggleExpand(msg.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none"
                      >
                        {expanded ? "Show less" : "Show more"}
                        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} strokeWidth={2} />
                      </button>
                    )}
                    {/* Always-visible action strip */}
                    <div className="flex items-center gap-2.5 text-muted-foreground/60 text-xs mt-1">
                      <span>{msg.time}</span>
                      <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none" title="More">
                        <MoreHorizontal className="size-5" strokeWidth={1.75} />
                      </button>
                      <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none" title="Reply">
                        <CornerUpLeft className="size-5" strokeWidth={1.75} />
                      </button>
                      <CheckCheck className="size-4 text-foreground" strokeWidth={2} />
                    </div>
                  </div>

                ) : (

                  /* ── STRANGER: avatar + plain text ── */
                  <div className="flex items-start gap-3 max-w-[65%]">
                    <Avatar className="size-8 shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs font-semibold bg-foreground/10">S</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[15px] leading-[1.7] text-foreground">
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
                      {/* Always-visible action strip */}
                      <div className="flex items-center gap-2.5 text-muted-foreground/60 mt-1">
                        <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none" title="React">
                          <SmilePlus className="size-5" strokeWidth={1.75} />
                        </button>
                        <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none" title="Reply">
                          <CornerUpLeft className="size-5" strokeWidth={1.75} />
                        </button>
                        <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150 cursor-pointer border-none bg-transparent outline-none" title="More">
                          <MoreHorizontal className="size-5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-foreground/10">S</AvatarFallback>
              </Avatar>
              <TypingIndicator />
            </div>
          )}
        </div>
      </div>

      {/* ── SCROLL TO BOTTOM ── */}
      {showScrollBtn && (
        <Button
          variant="outline"
          size="icon"
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 size-9 rounded-full shadow-md z-30"
        >
          <ArrowDown className="size-5" strokeWidth={2} />
        </Button>
      )}

      {/* ── INPUT BAR ── */}
      <div className="shrink-0 px-4 pb-5 pt-2 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-3">

          {/* Refresh */}
          <button
            title="New stranger"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none"
          >
            <RotateCcw className="size-5" strokeWidth={1.75} />
          </button>

          {/* Input */}
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hello"
            rows={1}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-[200px] text-[15px] text-foreground placeholder:text-muted-foreground/50 py-0 leading-relaxed scrollbar-none shadow-none p-0"
          />

          {/* Skip / Send */}
          {!inputText.trim() ? (
            <button
              onClick={() => router.push("/chat")}
              className="shrink-0 flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none whitespace-nowrap"
            >
              Skip
              <ChevronRight className="size-5 mt-px" strokeWidth={2} />
            </button>
          ) : (
            <button
              onClick={send}
              className="shrink-0 flex items-center gap-0.5 text-sm font-medium text-foreground hover:opacity-70 transition-opacity cursor-pointer border-none bg-transparent outline-none"
            >
              Send
              <ChevronRight className="size-5 mt-px" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
