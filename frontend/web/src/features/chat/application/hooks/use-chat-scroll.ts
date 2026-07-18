import * as React from "react"
import { useMessagesStore } from "@/features/chat/presentation/store/messages-store"

interface UseChatScrollProps {
  sessionId: string
}

export function useChatScroll({ sessionId }: UseChatScrollProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)

  const normalizedData = useMessagesStore((state) => state.messagesByChatId[sessionId])
  const allIds = normalizedData?.allIds || []
  const byId = normalizedData?.byId || {}

  const prevMessagesLength = React.useRef(allIds.length)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
  }

  const scrollToBottom = React.useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [])

  React.useEffect(() => {
    if (!scrollRef.current) return

    // Initial load: jump to bottom instantly
    if (prevMessagesLength.current === 0 && allIds.length > 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" })
      prevMessagesLength.current = allIds.length
      return
    }

    // New messages appended
    if (allIds.length > prevMessagesLength.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current
      // Use a generous threshold for "near bottom"
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
      const lastMsgId = allIds[allIds.length - 1]
      const lastMsg = byId[lastMsgId]
      const isFromUser = lastMsg?.sender === "user"

      if (isNearBottom || isFromUser) {
        scrollToBottom()
      }
    }
    prevMessagesLength.current = allIds.length
  }, [allIds.length, byId, scrollToBottom])

  return {
    scrollRef,
    showScrollBtn,
    handleScroll,
    scrollToBottom,
  }
}
