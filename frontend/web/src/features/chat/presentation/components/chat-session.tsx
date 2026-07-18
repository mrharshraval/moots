"use client"

import * as React from "react"
import { ChatSessionLayout } from "./session/ChatSessionLayout"
import { ChatSessionProvider } from "./chat-session-context"

export interface ChatSessionProps {
  sessionId: string
}

export function ChatSession({ sessionId }: ChatSessionProps) {
  return (
    <ChatSessionProvider sessionId={sessionId}>
      <ChatSessionLayout />
    </ChatSessionProvider>
  )
}
