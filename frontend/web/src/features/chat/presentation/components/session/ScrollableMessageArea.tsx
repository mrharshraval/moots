import * as React from "react"
import { ChevronDown } from "lucide-react"
import { MessageList } from "@/features/chat/presentation/components/message-list"
import { Message } from "@/features/chat/presentation/store/messages-store"

import { useChatSessionContext } from "../chat-session-context"

interface ScrollableMessageAreaProps {}

export function ScrollableMessageArea({}: ScrollableMessageAreaProps) {
  const {
    scrollRef,
    showScrollBtn,
    scrollToBottom,
    handleScroll,
  } = useChatSessionContext()
  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto w-full pt-20 pb-4 relative scroll-smooth"
    >
      <MessageList />
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="fixed bottom-24 right-4 z-40 bg-background border border-border text-foreground rounded-full p-2 shadow-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <ChevronDown className="size-5" />
        </button>
      )}
    </div>
  )
}
