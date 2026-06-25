export class MatchmakingService {
  constructor() {
    this.waitingUsers = new Map(); // userId -> { userId, interests, lang, country, connectionId, addedAt }
  }

  addUser(userId, details, connectionId) {
    this.removeUser(userId); // Ensure no duplicate entries
    this.waitingUsers.set(userId, {
      userId,
      ...details,
      connectionId,
      addedAt: new Date(),
    });
  }

  removeUser(userId) {
    return this.waitingUsers.delete(userId);
  }

  removeUserByConnectionId(connectionId) {
    for (const [userId, entry] of this.waitingUsers.entries()) {
      if (entry.connectionId === connectionId) {
        return this.waitingUsers.delete(userId);
      }
    }
    return false;
  }

  findMatch(userId) {
    const seeker = this.waitingUsers.get(userId);
    if (!seeker) return null;

    let bestCandidate = null;
    let bestScore = -1;

    for (const [peerId, peer] of this.waitingUsers.entries()) {
      if (peerId === userId) continue;
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
      // Remove both from queue
      this.removeUser(userId);
      this.removeUser(bestCandidate.userId);
      return bestCandidate;
    }

    return null;
  }

  getQueueSize() {
    return this.waitingUsers.size;
  }

  cleanupStaleQueueEntries(isConnectionActive) {
    for (const [userId, entry] of this.waitingUsers.entries()) {
      if (!isConnectionActive(entry.connectionId)) {
        this.waitingUsers.delete(userId);
      }
    }
  }
}
export const matchmakingService = new MatchmakingService();
