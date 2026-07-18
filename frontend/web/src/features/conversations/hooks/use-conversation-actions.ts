import * as React from "react"
import { useMessagesStore } from "@/features/chat"
import { ConversationRepository } from "../repositories/conversation.repository"

export function useConversationActions() {
  const fetchConversationsWrapper = React.useCallback(async (cursor?: string) => {
    useMessagesStore.setState({ isLoading: true, error: null })
    try {
      const data = await ConversationRepository.fetchConversations(cursor)
      useMessagesStore.setState((state) => ({ 
        conversations: cursor ? [...(state.conversations || []), ...(data.conversations)] : data.conversations,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        isLoading: false 
      }))
    } catch (err: any) {
      useMessagesStore.setState({ error: err.message, isLoading: false })
    }
  }, [])

  const updateSettingsWrapper = React.useCallback(async (id: string, settings: any) => {
    const previousConversations = useMessagesStore.getState().conversations || []
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) => c.id === id ? { ...c, ...settings } : c),
    }))
    try {
      await ConversationRepository.updateConversationSettings(id, settings)
    } catch (err) {
      useMessagesStore.setState({ conversations: previousConversations })
      throw err
    }
  }, [])

  const endConversationWrapper = React.useCallback(async (id: string) => {
    const state = useMessagesStore.getState()
    const previousConversations = state.conversations || []
    useMessagesStore.setState((s) => ({
      conversations: (s.conversations || []).map((c) => c.id === id ? { ...c, status: "ENDED", endedAt: new Date().toISOString() } : c),
      selectedChatId: s.selectedChatId === id ? null : s.selectedChatId
    }))
    try {
      await ConversationRepository.endConversation(id)
    } catch (err) {
      useMessagesStore.setState({ conversations: previousConversations })
      throw err
    }
  }, [])

  const hideConversationWrapper = React.useCallback(async (id: string) => {
    const previousConversations = useMessagesStore.getState().conversations || []
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) => c.id === id ? { ...c, hiddenAt: new Date().toISOString() } : c),
    }))
    try {
      await ConversationRepository.hideConversation(id)
    } catch (err) {
      useMessagesStore.setState({ conversations: previousConversations })
      throw err
    }
  }, [])

  const leaveConversationWrapper = React.useCallback(async (id: string) => {
    const previousConversations = useMessagesStore.getState().conversations || []
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) => c.id === id ? { ...c, leftAt: new Date().toISOString() } : c),
    }))
    try {
      await ConversationRepository.leaveConversation(id)
    } catch (err) {
      useMessagesStore.setState({ conversations: previousConversations })
      throw err
    }
  }, [])

  return {
    fetchConversations: fetchConversationsWrapper,
    updateSettings: updateSettingsWrapper,
    endConversation: endConversationWrapper,
    hideConversation: hideConversationWrapper,
    leaveConversation: leaveConversationWrapper
  }
}
