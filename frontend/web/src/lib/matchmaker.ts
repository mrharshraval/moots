import { env } from "@/env"

// Shared in-memory matchmaking state, preserved across Next.js dev hot-reloads
interface WaitingUser {
  userId: string
  interests: string[]
  lang: string
  country: string
  joinedAt: number
}

interface MatchmakerStore {
  queue: WaitingUser[]
  sessions: Record<string, string> // userId -> sessionId
}

declare global {
  // eslint-disable-next-line no-var
  var __matchmaker: MatchmakerStore | undefined
}

const store: MatchmakerStore = globalThis.__matchmaker || {
  queue: [],
  sessions: {},
}

if (env.NODE_ENV !== "production") {
  globalThis.__matchmaker = store
}

export function joinQueue(user: Omit<WaitingUser, "joinedAt">): { status: "matched" | "waiting"; sessionId?: string } {
  const { userId, interests, lang, country } = user

  // Clean up any stale sessions or existing queue placements for this user
  leaveQueue(userId)
  delete store.sessions[userId]

  // Look for a match in the queue
  let bestCandidate: WaitingUser | null = null
  let bestScore = -1

  for (const peer of store.queue) {
    if (peer.userId === userId) continue

    // Language compatibility: prefer same language
    if (peer.lang !== lang) continue

    let score = 0

    // Region compatibility
    if (country !== "global" && peer.country !== "global") {
      if (country === peer.country) {
        score += 10
      } else {
        // If regions are specified and don't match, skip pairing
        continue
      }
    } else {
      score += 5 // fallback global baseline
    }

    // Interests matching
    const sharedInterests = interests.filter((i) => peer.interests.includes(i))
    if (interests.length > 0 || peer.interests.length > 0) {
      if (sharedInterests.length > 0) {
        score += sharedInterests.length * 20
      } else {
        // Prioritize matching peers with shared interests.
        // If they both have interests but none align, give it a lower priority (score 0)
        score += 0
      }
    } else {
      // Both random (no interests)
      score += 10
    }

    if (score > bestScore) {
      bestScore = score
      bestCandidate = peer
    }
  }

  if (bestCandidate) {
    // Found a match!
    const sessionId = `session-${Math.random().toString(36).slice(2, 11)}`
    
    // Remove the peer from the queue
    store.queue = store.queue.filter((u) => u.userId !== bestCandidate!.userId)
    
    // Save session mapping for both users
    store.sessions[userId] = sessionId
    store.sessions[bestCandidate.userId] = sessionId

    return { status: "matched", sessionId }
  }

  // No match found, add to queue
  store.queue.push({
    userId,
    interests,
    lang,
    country,
    joinedAt: Date.now(),
  })

  return { status: "waiting" }
}

export function checkStatus(userId: string): { status: "matched" | "waiting"; sessionId?: string } {
  const sessionId = store.sessions[userId]
  if (sessionId) {
    return { status: "matched", sessionId }
  }
  return { status: "waiting" }
}

export function leaveQueue(userId: string): void {
  store.queue = store.queue.filter((u) => u.userId !== userId)
}

export function disconnectSession(userId: string): void {
  const sessionId = store.sessions[userId]
  if (sessionId) {
    // Remove session for both users to clean up
    for (const uid in store.sessions) {
      if (store.sessions[uid] === sessionId) {
        delete store.sessions[uid]
      }
    }
  }
}
