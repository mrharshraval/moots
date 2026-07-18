import { useEffect } from "react"
import { useMessagesStore, mapSerializedMessage } from "../../presentation/store/messages-store"
import { usePartnerStateStore } from "../../presentation/store/partner-state-store"
import { chatRealtimeService } from "../services/chat-realtime.service"
import { ConversationRepository } from "@/features/conversations/repositories/conversation.repository"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"

export function useChatRealtimeSync(sessionId: string, userId: string, sendReadReceipt: () => void) {
  useEffect(() => {
    if (!sessionId || !userId) return;

    const handleChatHistory = (payload: any) => {
      const store = useMessagesStore.getState();
      payload.messages.forEach((m: any) => {
        const msg = {
          ...mapSerializedMessage(m, userId),
          status: "PERSISTED" as const,
        };
        store.appendMessage(sessionId, msg);
      });

      const partnerStore = usePartnerStateStore.getState();
      partnerStore.setPeerIdentity(payload.partnerNickname || "Stranger", payload.partnerUsername || null);
      if (payload.partnerId) {
        partnerStore.setPeerActorId?.(payload.partnerId);
      }
      partnerStore.setIsWsReady(true);

      ConversationRepository.fetchConversations().then((data) => {
        useMessagesStore.setState((state) => ({ 
          conversations: data.conversations,
          nextCursor: data.nextCursor,
          hasMore: data.hasMore,
          isLoading: false 
        }))
      }).catch(console.error);
      sendReadReceipt();
    };

    const handleMessage = (payload: any) => {
      const newMsg = mapSerializedMessage(payload, userId);
      const store = useMessagesStore.getState();
      store.appendMessage(sessionId, newMsg);

      if (newMsg.sender === "stranger") {
        sendReadReceipt();
      }

      store.updateConversation(sessionId, {
        lastMessagePreview: newMsg.content,
        lastActivityAt: newMsg.time,
        updatedAt: newMsg.time,
      });
    };

    const handleReactionUpdate = (payload: any) => {
      useMessagesStore.getState().updateMessage(sessionId, payload.messageId, { reactions: payload.reactions });
    };

    const handlePartnerSeenMessages = () => {
      const store = useMessagesStore.getState();
      const existing = store.messagesByChatId[sessionId];
      if (existing && existing.allIds) {
        existing.allIds.forEach(id => {
          const msg = existing.byId[id];
          if (msg && msg.sender === "user" && !msg.seen) {
            store.updateMessage(sessionId, id, { seen: true });
          }
        });
      }
    };

    const handleMessageEdited = (payload: any) => {
      useMessagesStore.getState().updateMessage(sessionId, payload.messageId, { content: payload.content, edited: payload.edited });
    };

    const handlePartnerJoined = (payload: any) => {
      if (payload.partnerNickname || payload.partnerUsername) {
        usePartnerStateStore.getState().setPeerIdentity(payload.partnerNickname || "Stranger", payload.partnerUsername || null);
      }
    };

    const handlePartnerDisconnected = () => {
      usePartnerStateStore.getState().setIsStrangerDisconnected(true);
      usePartnerStateStore.getState().setIsStrangerReconnecting(false);
    };

    const handlePartnerReconnecting = () => {
      usePartnerStateStore.getState().setIsStrangerReconnecting(true);
    };

    const handlePartnerReconnected = () => {
      usePartnerStateStore.getState().setIsStrangerReconnecting(false);
    };

    chatRealtimeService.on("chat-history", handleChatHistory);
    chatRealtimeService.on("message", handleMessage);
    chatRealtimeService.on("reaction-update", handleReactionUpdate);
    chatRealtimeService.on("partner-seen-messages", handlePartnerSeenMessages);
    chatRealtimeService.on("message-edited", handleMessageEdited);
    chatRealtimeService.on("partner-joined", handlePartnerJoined);
    chatRealtimeService.on("partner-disconnected", handlePartnerDisconnected);
    chatRealtimeService.on("partner-reconnecting", handlePartnerReconnecting);
    chatRealtimeService.on("partner-reconnected", handlePartnerReconnected);

    return () => {
      chatRealtimeService.off("chat-history", handleChatHistory);
      chatRealtimeService.off("message", handleMessage);
      chatRealtimeService.off("reaction-update", handleReactionUpdate);
      chatRealtimeService.off("partner-seen-messages", handlePartnerSeenMessages);
      chatRealtimeService.off("message-edited", handleMessageEdited);
      chatRealtimeService.off("partner-joined", handlePartnerJoined);
      chatRealtimeService.off("partner-disconnected", handlePartnerDisconnected);
      chatRealtimeService.off("partner-reconnecting", handlePartnerReconnecting);
      chatRealtimeService.off("partner-reconnected", handlePartnerReconnected);
    };
  }, [sessionId, userId, sendReadReceipt]);
}
