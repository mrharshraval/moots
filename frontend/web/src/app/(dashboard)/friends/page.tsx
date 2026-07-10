"use client"

import * as React from "react"
import { Search, UserPlus } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { useConnections, TabType } from "@/features/connections"
import { useConnectionActions } from "@/features/connections"
import { ConnectionList } from "@/features/connections"

export default function FriendsPage() {
  const {
    filteredConnections,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery
  } = useConnections()

  const {
    handleAcceptRequest,
    handleDeclineRequest,
    handleRemoveFriend,
    handleUnblock
  } = useConnectionActions()

  return (
    <div className="flex-1 flex flex-col h-full bg-background p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Friends</h1>
            <p className="text-sm text-muted-foreground">Manage your connections and chat partners</p>
          </div>
          <Button size="sm" className="text-xs gap-1.5 font-semibold">
            <UserPlus className="h-4 w-4" /> Add Friend
          </Button>
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {(["online", "all", "pending", "blocked"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all capitalize ${
                  activeTab === tab
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search friends"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs bg-card border-border focus:border-primary w-full"
            />
          </div>
        </div>

        {/* Friends List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConnectionList
            connections={filteredConnections}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
            onRemove={handleRemoveFriend}
            onUnblock={handleUnblock}
          />
        </div>

      </div>
    </div>
  )
}
