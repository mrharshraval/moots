import { create } from "zustand"

export type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "accepted"

interface PartnerState {
  peerNickname: string
  peerUsername: string | null
  peerActorId: string | null
  isStrangerDisconnected: boolean
  isStrangerReconnecting: boolean
  isReconnectingLocal: boolean
  isTyping: boolean
  connectionStatus: ConnectionStatus
  isWsReady: boolean

  setPeerIdentity: (nickname: string, username: string | null) => void
  setPeerActorId: (id: string | null) => void
  setIsStrangerDisconnected: (val: boolean) => void
  setIsStrangerReconnecting: (val: boolean) => void
  setIsReconnectingLocal: (val: boolean) => void
  setIsTyping: (val: boolean) => void
  setConnectionStatus: (val: ConnectionStatus) => void
  setIsWsReady: (val: boolean) => void
  reset: () => void
}

export const usePartnerStateStore = create<PartnerState>()((set) => ({
  peerNickname: "Stranger",
  peerUsername: null,
  peerActorId: null,
  isStrangerDisconnected: false,
  isStrangerReconnecting: false,
  isReconnectingLocal: false,
  isTyping: false,
  connectionStatus: "none",
  isWsReady: false,

  setPeerIdentity: (peerNickname, peerUsername) => set({ peerNickname, peerUsername }),
  setPeerActorId: (peerActorId) => set({ peerActorId }),
  setIsStrangerDisconnected: (isStrangerDisconnected) => set({ isStrangerDisconnected }),
  setIsStrangerReconnecting: (isStrangerReconnecting) => set({ isStrangerReconnecting }),
  setIsReconnectingLocal: (isReconnectingLocal) => set({ isReconnectingLocal }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setIsWsReady: (isWsReady) => set({ isWsReady }),
  reset: () => set({
    peerNickname: "Stranger",
    peerUsername: null,
    peerActorId: null,
    isStrangerDisconnected: false,
    isStrangerReconnecting: false,
    isReconnectingLocal: false,
    isTyping: false,
    connectionStatus: "none",
    isWsReady: false,
  })
}))
