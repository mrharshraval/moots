"use client"

import * as React from "react"
import { Globe, Users, Plus, MessageSquare, ShieldCheck, DoorOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Group {
  id: string
  name: string
  description: string
  members: number
  category: string
  joined: boolean
}

export default function GroupsPage() {
  const [groups, setGroups] = React.useState<Group[]>([
    {
      id: "1",
      name: "Gamer Lounge",
      description: "Match up, discuss patches, and share setups. All platforms welcome.",
      members: 1420,
      category: "Gaming",
      joined: true,
    },
    {
      id: "2",
      name: "Lo-Fi Beats & Chill",
      description: "Share recommendations, playlists, and study vibes.",
      members: 890,
      category: "Music",
      joined: false,
    },
    {
      id: "3",
      name: "Devs Community",
      description: "Frontend, backend, mobile dev discussions. Solve bugs together.",
      members: 530,
      category: "Technology",
      joined: true,
    },
    {
      id: "4",
      name: "Cinephiles Central",
      description: "Discuss movies, review TV series, and chat about upcoming releases.",
      members: 310,
      category: "Movies",
      joined: false,
    },
  ])

  const [activeTab, setActiveTab] = React.useState<"explore" | "my-groups">("explore")
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [newGroupName, setNewGroupName] = React.useState("")
  const [newGroupDesc, setNewGroupDesc] = React.useState("")
  const [newGroupCat, setNewGroupCat] = React.useState("")

  const handleToggleJoin = (id: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, joined: !g.joined, members: g.joined ? g.members - 1 : g.members + 1 } : g))
    )
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    const newGroup: Group = {
      id: Date.now().toString(),
      name: newGroupName,
      description: newGroupDesc || "No description provided.",
      members: 1,
      category: newGroupCat || "General",
      joined: true,
    }

    setGroups((prev) => [newGroup, ...prev])
    setNewGroupName("")
    setNewGroupDesc("")
    setNewGroupCat("")
    setShowCreateModal(false)
  }

  const filteredGroups = groups.filter((g) => {
    if (activeTab === "my-groups") return g.joined
    return true
  })

  return (
    <div className="flex-1 flex flex-col h-full bg-background p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" /> Groups
            </h1>
            <p className="text-sm text-muted-foreground">Join communities sharing your interests and vibe</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="text-xs gap-1.5 font-semibold">
            <Plus className="h-4 w-4" /> Create Group
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("explore")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all ${
              activeTab === "explore"
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Explore Public Groups
          </button>
          <button
            onClick={() => setActiveTab("my-groups")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-lg border transition-all ${
              activeTab === "my-groups"
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            My Groups
          </button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-16 border border-dashed border-border rounded-xl bg-card">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No groups to display</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <Card key={group.id} className="p-5 border border-border bg-card hover:bg-muted/5 transition-all flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground truncate">{group.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-wider inline-block mt-1">
                        {group.category}
                      </span>
                    </div>
                    
                    {/* Active member count */}
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground select-none">
                      <Users className="h-3.5 w-3.5" />
                      <span>{group.members}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {group.description}
                  </p>
                </div>

                <div className="flex justify-end gap-2.5">
                  {group.joined ? (
                    <>
                      <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                        <MessageSquare className="h-3.5 w-3.5" /> Chat
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleJoin(group.id)}
                        className="text-xs font-semibold text-muted-foreground hover:text-destructive gap-1"
                      >
                        <DoorOpen className="h-3.5 w-3.5" /> Leave
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleToggleJoin(group.id)}
                      className="text-xs font-semibold"
                    >
                      Join Group
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="grid! max-w-[425px] sm:max-w-[425px]! w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] rounded-3xl bg-background border border-border select-none p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-bold text-foreground">Create Community Group</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Start a group to chat, share, and connect with people who share your vibe.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateGroup} className="space-y-4 py-2">
              <div className="relative border border-border rounded-xl px-3 py-1.5 bg-muted/20 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                <Label htmlFor="group-name" className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Group Name
                </Label>
                <Input
                  id="group-name"
                  required
                  placeholder="e.g. Anime Watch Party"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-transparent border-none p-0 h-6 text-xs text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden"
                />
              </div>

              <div className="relative border border-border rounded-xl px-3 py-1.5 bg-muted/20 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                <Label htmlFor="group-cat" className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Category
                </Label>
                <Input
                  id="group-cat"
                  placeholder="e.g. Anime, Food, Hiking"
                  value={newGroupCat}
                  onChange={(e) => setNewGroupCat(e.target.value)}
                  className="w-full bg-transparent border-none p-0 h-6 text-xs text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden"
                />
              </div>

              <div className="relative border border-border rounded-xl px-3 py-1.5 bg-muted/20 focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                <Label htmlFor="group-desc" className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Description
                </Label>
                <Textarea
                  id="group-desc"
                  placeholder="Tell people what this group is all about..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-xs text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-hidden resize-none h-20 mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" className="text-xs h-9.5">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" className="text-xs h-9.5">
                  Create Group
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
