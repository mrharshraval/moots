import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"

export type TabType = "online" | "all" | "pending" | "blocked"

async function fetchConnections() {
  const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/v1/connections`)
  const json = await res.json()
  return json.data || []
}

async function fetchPendingRequests() {
  const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/v1/connections/pending`)
  const json = await res.json()
  return json.data || []
}

export function useConnections() {
  const { data: connections = [] } = useQuery({
    queryKey: ["connections", "accepted"],
    queryFn: fetchConnections
  })

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["connections", "pending"],
    queryFn: fetchPendingRequests
  })

  const allConnections = React.useMemo(() => {
    return [...connections, ...pendingRequests].map((c: any) => ({
      ...c,
      id: c.id,
      name: c.actor1Id, // Need proper mapping for actor display names, using ID for now
      relationship: c.status === "PENDING" ? "pending" : "friend",
      status: "online" // Need presence system for online/offline
    }))
  }, [connections, pendingRequests])
  
  const [activeTab, setActiveTab] = React.useState<TabType>("online")
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredConnections = React.useMemo(() => {
    return allConnections.filter((c) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (activeTab === "online") return c.relationship === "friend" && c.status !== "offline"
      if (activeTab === "all") return c.relationship === "friend"
      if (activeTab === "pending") return c.relationship === "pending"
      if (activeTab === "blocked") return c.relationship === "blocked"
      return true
    })
  }, [allConnections, activeTab, searchQuery])

  return {
    connections: allConnections,
    filteredConnections,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery
  }
}
