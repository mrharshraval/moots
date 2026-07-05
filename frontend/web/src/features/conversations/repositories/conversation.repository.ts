import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"
import { useMessagesStore, Conversation } from "@/features/chat"
import { tokenManager } from "@/infrastructure/auth/token-manager"

export class ConversationRepository {
  static async fetchConversations(cursor?: string): Promise<void> {
    // #region agent log
    fetch('http://127.0.0.1:7419/ingest/d8e17749-7978-4108-99b8-55f9d5899bec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2900a9'},body:JSON.stringify({sessionId:'2900a9',location:'conversation.repository.ts:fetchConversations',message:'fetchConversations entry',data:{cursor:cursor??null,hasCachedToken:!!tokenManager.getToken(),localGuestToken:typeof window!=='undefined'?!!localStorage.getItem('moots_guest_token'):null},timestamp:Date.now(),hypothesisId:'A,C,E'})}).catch(()=>{});
    // #endregion
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

  static async deleteConversation(id: string, clearOnly = false): Promise<void> {
    const store = useMessagesStore.getState()
    const previousConversations = store.conversations || []
    
    if (clearOnly) {
      useMessagesStore.setState((state) => ({
        conversations: (state.conversations || []).map((c) =>
          c.id === id ? { ...c, lastMessagePreview: null } : c
        ),
      }))
    } else {
      useMessagesStore.setState((state) => ({
        conversations: (state.conversations || []).filter((c) => c.id !== id),
        selectedChatId: state.selectedChatId === id ? null : state.selectedChatId
      }))
    }

    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearOnly }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Failed to delete conversation: ${errText}`)
      }
      
      if (!clearOnly) {
        useMessagesStore.setState((state) => ({
          conversations: (state.conversations || []).map((c) =>
            c.id === id ? { ...c, status: "ENDED", lastMessagePreview: null } : c
          ),
          selectedChatId: state.selectedChatId === id ? null : state.selectedChatId
        }))
      } else {
        useMessagesStore.setState((state) => ({
          messagesByChatId: {
            ...state.messagesByChatId,
            [id]: [],
          }
        }))
      }
    } catch (error) {
      useMessagesStore.setState({ conversations: previousConversations })
      console.error(error)
      throw error
    }
  }
}
