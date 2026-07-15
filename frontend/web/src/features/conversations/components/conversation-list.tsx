import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search, Pin, MessageSquare, Archive, Check, Trash2, MoreHorizontal, VolumeX, Star, Ban, Eraser, Loader2 } from "lucide-react"
import { SidebarHeader, SidebarContent, SidebarTrigger } from "@/shared/ui/sidebar"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { cn } from "@/shared/utils/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { useConversations } from "../hooks/use-conversations"
import { useSession } from "@/providers/auth-provider"

export function ConversationList() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Normally comes from session, fallback for testing
  const USER_ID = session?.user?.id || "cm4y18w4x000008lc6p69g3yq"

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)

  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    filteredConversations,
    loadMoreRef,
    updateSettings,
    endConversation,
    hideConversation
  } = useConversations()

  return (
    <>
      <SidebarHeader className="flex-row items-center px-2 h-14 shrink-0 relative border-b border-transparent">
        <SidebarTrigger className="md:hidden size-8 mr-2 shrink-0 [&_svg]:size-4" />
        <div className="relative flex-1 px-2">
          <Search className="absolute left-5 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages" 
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
          <Button
            variant={filter === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("history")}
            className="h-8 text-xs rounded-full px-4"
          >
            History
          </Button>
        </div>

        {/* List Content */}
        <div className="flex-1">
          {isLoading && filteredConversations.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center pb-8 px-4 h-full w-full" style={{ paddingTop: 'calc(22vh - 52px)' }}>
              <div className="flex flex-col items-center w-full max-w-[420px] text-center">
                <div className="mb-[16px]">
                  <img
                    src="/brand/brand-marks/monochrome/Black%20Outlined.svg"
                    alt="Moots"
                    className="h-[72px] w-[72px] opacity-40 dark:hidden object-contain"
                  />
                  <img
                    src="/brand/brand-marks/monochrome/White%20Outlined.svg"
                    alt="Moots"
                    className="h-[72px] w-[72px] opacity-40 hidden dark:block object-contain"
                  />
                </div>
                <h1 className="text-[18px] leading-[26px] font-semibold text-foreground mb-2">
                  No conversations yet
                </h1>
                <p className="text-[16px] leading-[24px] font-normal text-muted-foreground max-w-[420px]">
                  Your conversations will appear here
                </p>
              </div>
            </div>
          ) : (
            <>
            {filteredConversations.map(chat => {
              const displayName = chat.type === "GROUP" ? chat.name : (chat.participants.find(p => p.id !== USER_ID)?.name || "Unknown")
              const initials = displayName?.substring(0, 2).toUpperCase() || "??"
              const displayTime = chat.lastActivityAt ? new Date(chat.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "New"
              const displayMessage = chat.status === "DELETED" 
                ? "Conversation ended" 
                : (chat.lastMessagePreview || "No messages yet.")
              const isMenuOpen = openMenuId === chat.id

              return (
              <div key={chat.id} className="relative group/chat">
                <Button 
                  asChild
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start h-14 rounded-xl px-2 text-sm font-normal cursor-pointer",
                    pathname === `/chat/${chat.id}` && "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  )}
                >
                  <div onClick={() => router.push(`/chat/${chat.id}`)} role="button" tabIndex={0}>
                    <div className="flex items-center gap-4 w-full overflow-hidden">
                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-muted")}>
                      <span className={cn("text-xs font-medium text-muted-foreground")}>{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center relative">
                      <div className="flex justify-between w-full items-center mb-0.5">
                        <span className="font-semibold truncate pr-2">{displayName}</span>
                        <div className={cn(
                          "relative flex items-center shrink-0 transition-opacity duration-150",
                          isMenuOpen ? "opacity-0" : "md:group-hover/chat:opacity-0 group-has-[:focus-visible]/chat:opacity-0"
                        )}>
                          <span className="text-[10px] text-muted-foreground">{displayTime}</span>
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
                          <div className={cn(
                            "flex items-center gap-1.5 shrink-0 transition-opacity duration-150",
                            isMenuOpen ? "opacity-0" : "md:group-hover/chat:opacity-0 group-has-[:focus-visible]/chat:opacity-0"
                          )}>
                            {chat.isPinned && <Pin className="h-3 w-3 text-muted-foreground/60 fill-muted-foreground/20" />}
                            {chat.unreadCount > 0 && (
                              <Badge variant="default" className="h-4 min-w-4 px-1 flex items-center justify-center rounded-full text-[9px] bg-primary text-primary-foreground border-none leading-none">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 hidden md:flex items-center justify-center transition-opacity duration-150",
                        isMenuOpen ? "opacity-100" : "opacity-0 md:group-hover/chat:opacity-100 [&:has(:focus-visible)]:opacity-100"
                      )}>
                        <DropdownMenu open={isMenuOpen} onOpenChange={(open) => setOpenMenuId(open ? chat.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-center text-muted-foreground outline-none bg-transparent border-0 cursor-pointer w-full h-full">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl border border-border/50 bg-background shadow-xl">
                            <DropdownMenuItem onClick={() => updateSettings(chat.id, { isArchived: !chat.isArchived })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                              <div className="flex items-center justify-center size-8 shrink-0">
                                <Archive className="size-4" />
                              </div>
                              <span>{chat.isArchived ? "Unarchive" : "Archive"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateSettings(chat.id, { isMuted: !chat.isMuted })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                              <div className="flex items-center justify-center size-8 shrink-0">
                                <VolumeX className="size-4" />
                              </div>
                              <span>{chat.isMuted ? "Unmute" : "Mute"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateSettings(chat.id, { isPinned: !chat.isPinned })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                              <div className="flex items-center justify-center size-8 shrink-0">
                                <Pin className="size-4" />
                              </div>
                              <span>{chat.isPinned ? 'Unpin' : 'Pin'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateSettings(chat.id, { unreadCount: 0 })} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
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
                            {chat.status !== "ENDED" && chat.kind === "MATCH" && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-border/50" />
                                <DropdownMenuItem onClick={() => endConversation(chat.id)} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer focus:text-destructive focus:bg-destructive/10">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Trash2 className="size-4" />
                                  </div>
                                  <span>End Chat</span>
                                </DropdownMenuItem>
                              </>
                            )}
                            {chat.kind !== "MATCH" && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-border/50" />
                                <DropdownMenuItem onClick={() => hideConversation(chat.id)} className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer focus:text-destructive focus:bg-destructive/10">
                                  <div className="flex items-center justify-center size-8 shrink-0">
                                    <Trash2 className="size-4" />
                                  </div>
                                  <span>Delete Chat</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                  </div>
                </Button>
              </div>
            )})}
            <div ref={loadMoreRef} className="h-1" />
            </>
          )}
        </div>

      </SidebarContent>
    </>
  )
}
