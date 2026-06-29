import { redis } from "./lib/redis.js";
import { registry } from "./registry.js";

export interface WaitingUser {
  actorId: string;
  connectionId: string;
  lang: string;
  country: string;
  interests: string[];
  nickname?: string;
  username?: string;
  addedAt: string; // ISO String for JSON storage
}

export class MatchmakingService {
  async addUser(
    actorId: string,
    details: Pick<WaitingUser, "lang" | "country" | "interests" | "nickname" | "username">,
    connectionId: string
  ) {
    await this.removeUser(actorId); // Ensure no duplicate entries

    const addedAt = new Date().toISOString();
    const entry: WaitingUser = {
      actorId,
      ...details,
      connectionId,
      addedAt,
    };

    await redis.hset("moots:matchmaking:users", actorId, JSON.stringify(entry));
    await redis.zadd("moots:matchmaking:queue", new Date(addedAt).getTime(), actorId);
  }

  async removeUser(actorId: string) {
    await redis.hdel("moots:matchmaking:users", actorId);
    await redis.zrem("moots:matchmaking:queue", actorId);
  }

  async removeUserByConnectionId(connectionId: string) {
    const actorIds = await redis.zrange("moots:matchmaking:queue", 0, -1);
    if (actorIds.length === 0) return false;

    const usersData = await redis.hmget("moots:matchmaking:users", ...actorIds);
    for (let i = 0; i < actorIds.length; i++) {
      const actorId = actorIds[i];
      const dataStr = usersData[i];
      if (dataStr) {
        const entry = JSON.parse(dataStr) as WaitingUser;
        if (entry.connectionId === connectionId) {
          await this.removeUser(actorId);
          return true;
        }
      }
    }
    return false;
  }

  async findMatch(actorId: string): Promise<WaitingUser | null> {
    const seekerStr = await redis.hget("moots:matchmaking:users", actorId);
    if (!seekerStr) return null;
    const seeker = JSON.parse(seekerStr) as WaitingUser;

    const actorIds = await redis.zrange("moots:matchmaking:queue", 0, -1);
    if (actorIds.length <= 1) return null;

    const usersData = await redis.hmget("moots:matchmaking:users", ...actorIds);
    const waitingList: WaitingUser[] = [];
    
    for (let i = 0; i < actorIds.length; i++) {
      const dataStr = usersData[i];
      if (dataStr) {
        waitingList.push(JSON.parse(dataStr));
      }
    }

    let bestCandidate: WaitingUser | null = null;
    let bestScore = -1;

    for (const peer of waitingList) {
      if (peer.actorId === actorId) continue;
      if (peer.lang !== seeker.lang) continue;

      let score = 0;

      // Country matching logic
      if (seeker.country !== "global" && peer.country !== "global") {
        if (seeker.country === peer.country) {
          score += 10;
        } else {
          continue; // Country mismatch on non-global, skip candidate
        }
      } else {
        score += 5; // Global match
      }

      // Interest matching logic
      const sharedInterests = seeker.interests.filter((i) =>
        peer.interests.includes(i)
      );
      if (seeker.interests.length > 0 || peer.interests.length > 0) {
        if (sharedInterests.length > 0) {
          score += sharedInterests.length * 20;
        }
      } else {
        score += 10; // Both have empty interests
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = peer;
      }
    }

    if (bestCandidate) {
      // Atomically claim both users by removing them from sorted set
      const removedCount = await redis.zrem("moots:matchmaking:queue", actorId, bestCandidate.actorId);
      if (removedCount === 2) {
        await redis.hdel("moots:matchmaking:users", actorId, bestCandidate.actorId);
        return bestCandidate;
      } else {
        // Double matching race occurred; if we removed only one of them, put it back
        if (removedCount === 1) {
          // Check which one was actually removed
          const isSeekerInQueue = await redis.zscore("moots:matchmaking:queue", actorId);
          if (isSeekerInQueue === null) {
            // Seeker was removed, put it back
            await redis.zadd("moots:matchmaking:queue", new Date(seeker.addedAt).getTime(), actorId);
          } else {
            // Candidate was removed, put it back
            await redis.zadd("moots:matchmaking:queue", new Date(bestCandidate.addedAt).getTime(), bestCandidate.actorId);
          }
        }
      }
    }

    return null;
  }

  async getQueueSize(): Promise<number> {
    return redis.zcard("moots:matchmaking:queue");
  }

  async cleanupStaleQueueEntries(isConnectionActive: (connectionId: string) => boolean) {
    const actorIds = await redis.zrange("moots:matchmaking:queue", 0, -1);
    if (actorIds.length === 0) return;

    const usersData = await redis.hmget("moots:matchmaking:users", ...actorIds);
    for (let i = 0; i < actorIds.length; i++) {
      const actorId = actorIds[i];
      const dataStr = usersData[i];
      if (dataStr) {
        const entry = JSON.parse(dataStr) as WaitingUser;
        const conn = registry.get(entry.connectionId);
        // Only cleanup if connection is local to this node and inactive
        if (conn && !isConnectionActive(entry.connectionId)) {
          await this.removeUser(actorId);
        }
      }
    }
  }
}

export const matchmakingService = new MatchmakingService();
