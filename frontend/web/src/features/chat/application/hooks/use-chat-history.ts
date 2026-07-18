"use client"

import * as React from "react"
import { useMessagesStore, mapSerializedMessage } from "../../presentation/store/messages-store"
import { ChatApi } from "../../api/chat-api"

import { Session } from "@/providers/auth-provider"

export interface UseChatHistoryProps {
  sessionId: string;
  session: Session | null;
}

export function useChatHistory({ sessionId, session }: UseChatHistoryProps) {
  const userId = session?.user?.id || ""

  React.useEffect(() => {
    if (!userId) return;

    // Fetch full history via REST (useful for historical chats if WS fails or we load before WS)
    ChatApi.fetchMessages(sessionId).then(({ messages: rawMsgs }) => {
      const store = useMessagesStore.getState();
      const existing = store.messagesByChatId[sessionId];
      if ((!existing || existing.allIds.length === 0) && rawMsgs.length > 0) {
        const history = [...rawMsgs].reverse().map((m: any) => ({
          ...mapSerializedMessage(m, userId),
          status: "PERSISTED" as const,
        }));
        store.setMessages(sessionId, history);
      }
    }).catch((err) => {
      console.error(err);
      useMessagesStore.getState().setError("Failed to load chat history. Please check your connection.");
    });
  }, [sessionId, userId])

  return { userId }
}
