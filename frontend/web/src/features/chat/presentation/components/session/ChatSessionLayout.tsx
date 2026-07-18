import { ChatHeader } from "./ChatHeader"
import { ChatViewState } from "./ChatViewState"
import { CallOverlay } from "./call-overlay"

import { useChatSessionContext } from "../chat-session-context"

interface ChatSessionLayoutProps {}

export function ChatSessionLayout({}: ChatSessionLayoutProps) {
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background relative overflow-hidden">
      {/* 1. Sticky Header / Action Bar */}
      <ChatHeader />

      {/* 2. Main content area (ViewState orchestrator) */}
      <ChatViewState />

      {/* 3. Global Overlays */}
      <CallOverlay />
    </div>
  )
}
