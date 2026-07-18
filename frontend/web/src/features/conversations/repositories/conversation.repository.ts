import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"
import { useMessagesStore, Conversation } from "@/features/chat"

export interface FetchConversationsResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class ConversationRepository {
  static async fetchConversations(cursor?: string): Promise<FetchConversationsResponse> {
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
    
    return {
      conversations: data.conversations || [],
      nextCursor: data.nextCursor || null,
      hasMore: data.nextCursor !== null
    }
  }

  static async updateConversationSettings(id: string, settings: Partial<Conversation>): Promise<void> {
    const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    if (!res.ok) throw new Error("Failed to update settings")
  }

  static async endConversation(id: string): Promise<void> {
    const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Failed to end conversation: ${errText}`)
    }
  }

  static async hideConversation(id: string): Promise<void> {
    const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/hide`, {
      method: "PATCH",
    })
    if (!res.ok) throw new Error("Failed to hide conversation")
  }

  static async unhideConversation(id: string): Promise<void> {
    const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/unhide`, {
      method: "PATCH",
    })
    if (!res.ok) throw new Error("Failed to unhide conversation")
  }

  static async leaveConversation(id: string): Promise<void> {
    const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/conversations/${id}/leave`, {
      method: "POST",
    })
    if (!res.ok) throw new Error("Failed to leave conversation")
  }
}
