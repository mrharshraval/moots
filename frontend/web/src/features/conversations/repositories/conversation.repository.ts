import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"
import { useMessagesStore, Conversation } from "@/features/chat"

export class ConversationRepository {
  static async fetchConversations(cursor?: string): Promise<void> {
    const store = useMessagesStore.getState()
    useMessagesStore.setState({ isLoading: true, error: null })
    
    try {
      let url = `${env.NEXT_PUBLIC_API_URL}/api/conversations?limit=25`
      if (cursor) url += `&cursor=${cursor}`
      
      const res = await apiRequest(url)
      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to fetch conversations response:", text);
        throw new Error(`Failed to fetch conversations: ${text}`)
      }
      const json = await res.json()
      const data = json.data || json
      
      useMessagesStore.setState((state) => ({ 
        conversations: cursor ? [...(state.conversations || []), ...(data.conversations || [])] : (data.conversations || []),
        nextCursor: data.nextCursor,
        hasMore: data.nextCursor !== null,
        isLoading: false 
      }))
    } catch (err: any) {
      useMessagesStore.setState({ error: err.message, isLoading: false })
      throw err
    }
  }

  static async updateConversationSettings(id: string, settings: Partial<Conversation>): Promise<void> {
    const store = useMessagesStore.getState()
    const previousConversations = store.conversations || []
    
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) =>
        c.id === id ? { ...c, ...settings } : c
      ),
    }))

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error("Failed to update settings")
    } catch (error) {
      useMessagesStore.setState({ conversations: previousConversations })
      console.error(error)
      throw error
    }
  }

  static async endConversation(id: string): Promise<void> {
    const store = useMessagesStore.getState()
    const previousConversations = store.conversations || []
    
    // Optimistically update conversation to ENDED
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) =>
        c.id === id ? { ...c, status: "ENDED", endedAt: new Date().toISOString() } : c
      ),
      selectedChatId: state.selectedChatId === id ? null : state.selectedChatId
    }))

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Failed to end conversation: ${errText}`)
      }
    } catch (error) {
      useMessagesStore.setState({ conversations: previousConversations })
      console.error(error)
      throw error
    }
  }

  static async hideConversation(id: string): Promise<void> {
    const store = useMessagesStore.getState()
    const previousConversations = store.conversations || []
    
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) =>
        c.id === id ? { ...c, hiddenAt: new Date().toISOString() } : c
      ),
    }))

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/hide`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error("Failed to hide conversation")
    } catch (error) {
      useMessagesStore.setState({ conversations: previousConversations })
      console.error(error)
      throw error
    }
  }

  static async unhideConversation(id: string): Promise<void> {
    const store = useMessagesStore.getState()
    const previousConversations = store.conversations || []
    
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) =>
        c.id === id ? { ...c, hiddenAt: null } : c
      ),
    }))

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/unhide`, {
        method: "PATCH",
      })
      if (!res.ok) throw new Error("Failed to unhide conversation")
    } catch (error) {
      useMessagesStore.setState({ conversations: previousConversations })
      console.error(error)
      throw error
    }
  }

  static async leaveConversation(id: string): Promise<void> {
    const store = useMessagesStore.getState()
    const previousConversations = store.conversations || []
    
    useMessagesStore.setState((state) => ({
      conversations: (state.conversations || []).map((c) =>
        c.id === id ? { ...c, leftAt: new Date().toISOString() } : c
      ),
    }))

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/leave`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to leave conversation")
    } catch (error) {
      useMessagesStore.setState({ conversations: previousConversations })
      console.error(error)
      throw error
    }
  }
}
