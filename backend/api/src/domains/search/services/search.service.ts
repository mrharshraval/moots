import { SearchRepository } from "../repositories/search.repository.js";
import { SearchQuery } from "../dto/search.dto.js";

export class SearchService {
  private repository = new SearchRepository();

  async search(query: SearchQuery, actorId: string) {
    const { q, type, limit } = query;
    const finalLimit = limit ?? 20;

    let users: any[] = [];
    let conversations: any[] = [];
    let messages: any[] = [];

    if (type === "all" || type === "users") {
      users = await this.repository.searchUsers(q, finalLimit);
      users = users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
      }));
    }

    if (type === "all" || type === "conversations") {
      conversations = await this.repository.searchConversations(q, actorId, finalLimit);
      conversations = conversations.map(c => ({
        id: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        type: c.type,
      }));
    }

    if (type === "all" || type === "messages") {
      messages = await this.repository.searchMessages(q, actorId, finalLimit);
      messages = messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.sender?.actor.user ? {
          id: m.sender.actor.user.id,
          username: m.sender.actor.user.username,
          name: m.sender.actor.user.name,
          image: m.sender.actor.user.image,
        } : null,
      }));
    }

    return {
      users,
      conversations,
      messages,
    };
  }
}
