import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"

export class ChatApi {
  static async sendConnectionRequest(receiverId: string, senderId: string): Promise<void> {
    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/connections/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId }),
      })
      if (!res.ok) throw new Error("Failed to send connection request")
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  static async acceptConnectionRequest(connectionId: string, userId: string): Promise<void> {
    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/connections/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, userId }),
      })
      if (!res.ok) throw new Error("Failed to accept connection request")
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  static async fetchMessages(conversationId: string, cursor?: string): Promise<{ messages: any[], nextCursor: string | null }> {
    try {
      let url = `${env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/messages?limit=50`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await apiRequest(url);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to fetch messages: ${errText}`);
      }
      const json = await res.json();
      const data = json.data || json;
      return { messages: data.messages || [], nextCursor: data.nextCursor || null };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
