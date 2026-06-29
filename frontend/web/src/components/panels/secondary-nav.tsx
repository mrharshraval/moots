"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Pin, MessageSquare, Archive, Bell, Check, Trash2, UserPlus, Flame, AlertCircle, MoreHorizontal, VolumeX, Star, Ban, Eraser, Loader2 } from "lucide-react"
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar"
import { useChatStore, Conversation } from "@/stores/use-chat-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Notifications Mock Data ──
interface Notification {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  type: "system" | "match" | "friend"
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "New Match Available!",
    description: "Someone with shared interests in Gaming and Tech wants to chat.",
    time: "2 mins ago",
    read: false,
    type: "match",
  },
  {
    id: "2",
    title: "Friend Request Received",
    description: "Alex (gaming enthusiast) sent you a friend request.",
    time: "1 hour ago",
    read: false,
    type: "friend",
  },
  {
    id: "3",
    title: "System Maintenance",
    description: "Scheduled database upgrades on June 20th, 02:00 UTC.",
    time: "1 day ago",
    read: true,
    type: "system",
  },
  {
    id: "4",
    title: "Match Streak!",
    description: "You've made 5 successful chat matches today. Keep it up!",
    time: "2 days ago",
    read: true,
    type: "match",
  },
]

export function SecondaryNav() {
  const pathname = usePathname()
  
  // Only render on /chat or /notifications
  const isChat = pathname.startsWith("/chat")
  const isNotifications = pathname.startsWith("/notifications")
  const isRoot = pathname === "/chat" || pathname === "/notifications"

  if (!isChat && !isNotifications) {
    return null
  }

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        "border-r border-black/[0.06] dark:border-white/[0.06] bg-background/50",
        isRoot ? "flex" : "hidden md:flex",
        "w-full md:w-[360px] shrink-0"
      )}
      style={{ "--sidebar-width": "360px" } as React.CSSProperties}
    >
      {isChat && <ChatPanel />}
      {isNotifications && <NotificationsPanel />}
    </Sidebar>
  )
}

function ChatPanel() {
  const filter = useChatStore((state) => state.filter)
  const setFilter = useChatStore((state) => state.setFilter)
  const searchQuery = useChatStore((state) => state.searchQuery)
  const setSearchQuery = useChatStore((state) => state.setSearchQuery)
  const conversations = useChatStore((state) => state.conversations)
  const fetchConversations = useChatStore((state) => state.fetchConversations)
  const updateSettings = useChatStore((state) => state.updateConversationSettings)
  const deleteChat = useChatStore((state) => state.deleteConversation)
  const isLoading = useChatStore((state) => state.isLoading)
  const hasMore = useChatStore((state) => state.hasMore)
  const nextCursor = useChatStore((state) => state.nextCursor)
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  // Hardcode userId for testing, normally this comes from auth session
  const USER_ID = "cm4y18w4x000008lc6p69g3yq"

  React.useEffect(() => {
    fetchConversations(USER_ID)
  }, [fetchConversations])

  React.useEffect(() => {
    if (isLoading || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          fetchConversations(USER_ID, nextCursor)
        }
      },
      { threshold: 1.0 }
    )

    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    observerRef.current = observer

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [isLoading, hasMore, nextCursor, fetchConversations])

  const filteredConversations = React.useMemo(() => {
    let filtered = conversations || []
    
    if (filter === "archived") {
      filtered = filtered.filter(c => c.isArchived)
    } else if (filter === "requests") {
      filtered = [] // Mock for now
    } else {
      filtered = filtered.filter(c => !c.isArchived)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.participants.some(p => p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)) ||
        c.lastMessagePreview?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [conversations, filter, searchQuery])

  return (
    <>
      <SidebarHeader className="flex-row items-center px-2 h-14 shrink-0 relative border-b border-transparent">
        <SidebarTrigger className="md:hidden size-8 mr-2 shrink-0 [&_svg]:size-4" />
        <div className="relative flex-1 px-2">
          <Search className="absolute left-5 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages..." 
            className="pl-12 h-10 rounded-xl bg-muted/40 border-border/50 text-xs w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-1">
        
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-2 h-10 px-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-8 text-xs rounded-full px-4"
          >
            All
          </Button>
          <Button
            variant={filter === "archived" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("archived")}
            className="h-8 text-xs rounded-full px-4"
          >
            Archived
          </Button>
          <Button
            variant={filter === "requests" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("requests")}
            className="h-8 text-xs rounded-full px-4"
          >
            Requests
          </Button>
        </div>

        {/* List Content */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No conversations found.</p>
            </div>
          ) : (
            filteredConversations.map(chat => {
              // Extract details for display
              const displayName = chat.type === "GROUP" ? chat.name : (chat.participants.find(p => p.id !== USER_ID)?.name || "Unknown")
              const initials = displayName?.substring(0, 2).toUpperCase() || "??"
              const displayTime = chat.lastActivityAt ? new Date(chat.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"
              const displayMessage = chat.status === "DELETED" 
                ? "Conversation ended" 
                : (chat.lastMessagePreview || "No messages yet.")

              return (
              <div key={chat.id} className="relative group/chat">
                <Button variant="ghost" className="w-full justify-start h-14 rounded-xl px-2 text-sm font-normal">
                  <div className="flex items-center gap-4 w-full overflow-hidden">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10")}>
                      <span className={cn("text-xs font-medium text-primary")}>{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between w-full items-center mb-0.5">
                        <span className="font-medium truncate pr-2">{displayName}</span>
                        <div className="relative flex items-center shrink-0">
                          <span className="text-[10px] text-muted-foreground transition-all duration-150 md:group-hover/chat:pr-6 md:focus-within:pr-6 md:group-has-[[data-state=open]]/chat:pr-6">{displayTime}</span>
                          <div className="absolute right-0 w-6 h-6 opacity-0 md:group-hover/chat:opacity-100 md:focus-within:opacity-100 md:group-has-[[data-state=open]]/chat:opacity-100 hidden md:flex items-center justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center justify-center text-muted-foreground outline-none bg-transparent border-0 cursor-pointer w-full h-full">
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl border border-border/50 bg-background shadow-xl">
                                <DropdownMenuItem onClick={() => updateSettings(chat.id, USER_ID, { isArchived: !chat.isArchived })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Archive className="size-4" />
                                  </div>
                                  <span>{chat.isArchived ? "Unarchive" : "Archive"}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSettings(chat.id, USER_ID, { isMuted: !chat.isMuted })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <VolumeX className="size-4" />
                                  </div>
                                  <span>{chat.isMuted ? "Unmute" : "Mute"}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSettings(chat.id, USER_ID, { isPinned: !chat.isPinned })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Pin className="size-4" />
                                  </div>
                                  <span>{chat.isPinned ? 'Unpin' : 'Pin'}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateSettings(chat.id, USER_ID, { unreadCount: 0 })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Check className="size-4" />
                                  </div>
                                  <span>Mark as Read</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Star className="size-4" />
                                  </div>
                                  <span>Add to Favorites</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-border/50" />
                                <DropdownMenuItem className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Ban className="size-4" />
                                  </div>
                                  <span>Block</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteChat(chat.id, USER_ID, true)} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Eraser className="size-4" />
                                  </div>
                                  <span>Clear Chat</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-border/50" />
                                <DropdownMenuItem onClick={() => deleteChat(chat.id, USER_ID, false)} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer focus:text-destructive focus:bg-destructive/10">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Trash2 className="size-4" />
                                  </div>
                                  <span>Delete Chat</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between w-full items-center gap-2">
                        <span className={cn(
                          "text-[11px] truncate text-left pr-6",
                          chat.status === "ENDED" ? "italic text-muted-foreground/70" : "text-muted-foreground"
                        )}>
                          {displayMessage}
                        </span>
                        {(chat.isPinned || chat.unreadCount > 0) && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {chat.isPinned && <Pin className="h-3 w-3 text-muted-foreground/60 fill-muted-foreground/20" />}
                            {chat.unreadCount > 0 && (
                              <Badge variant="default" className="h-4 min-w-4 px-1 flex items-center justify-center rounded-full text-[9px] bg-primary text-primary-foreground border-none leading-none">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            )})
          )}
        </div>



      </SidebarContent>
    </>
  )
}

function NotificationsPanel() {
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications)
  const [filter, setFilter] = React.useState<"all" | "unread">("all")
  
  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    )
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read
    return true
  })

  return (
    <>
      <SidebarHeader className="flex-row items-center justify-between px-2 h-14 shrink-0 relative border-b border-transparent">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden size-8 [&_svg]:size-4" />
          <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-8 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Check className="h-3 w-3 mr-1" /> Mark all read
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 overflow-y-auto pt-1">
        <div className="flex items-center gap-2 mb-2 h-10 px-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-8 text-xs rounded-full px-4"
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="h-8 text-xs rounded-full px-4 flex items-center gap-1.5"
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant={filter === "unread" ? "secondary" : "default"} className="px-1 py-0 text-[10px] h-4 min-w-4 flex items-center justify-center rounded-full bg-primary/20 text-primary-foreground border-none">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center opacity-50 px-2">
            <Bell className="h-8 w-8 mb-2 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">All caught up!</span>
          </div>
        ) : (
          <div className="flex-1">
            {filteredNotifications.map((notification) => {
            const Icon =
              notification.type === "friend"
                ? UserPlus
                : notification.type === "match"
                ? Flame
                : AlertCircle

            return (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-xl border relative group cursor-pointer",
                  !notification.read
                    ? "bg-primary/5 border-primary/20"
                    : "bg-transparent border-transparent hover:bg-muted/50"
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0",
                      notification.type === "friend"
                        ? "bg-blue-500/10 text-blue-500"
                        : notification.type === "match"
                        ? "bg-orange-500/10 text-orange-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {notification.title}
                      </h4>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                      {notification.description}
                    </p>
                  </div>
                </div>

                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleRead(notification.id)
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(notification.id)
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </SidebarContent>
    </>
  )
}
