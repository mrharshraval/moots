import { create } from "zustand"

export type MatchmakingStatus = "idle" | "searching" | "found"

interface MatchmakingState {
  status: MatchmakingStatus
  matchedSessionId: string | null
  interests: string[]
  searchStartedAt: number | null
  
  setStatus: (status: MatchmakingStatus) => void
  setMatchedSessionId: (id: string | null) => void
  setInterests: (interests: string[]) => void
  setSearchStartedAt: (timestamp: number | null) => void
}

export const useMatchmakingStore = create<MatchmakingState>()((set) => ({
  status: "idle",
  matchedSessionId: null,
  interests: [],
  searchStartedAt: null,

  setStatus: (status) => set({ status }),
  setMatchedSessionId: (id) => set({ matchedSessionId: id }),
  setInterests: (interests) => set({ interests }),
  setSearchStartedAt: (timestamp) => set({ searchStartedAt: timestamp }),
}))
