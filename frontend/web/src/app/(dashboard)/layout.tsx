"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/ui/sidebar"
import { SidebarNav } from "@/shared/layout/sidebar-nav"
import { SecondaryNav } from "@/shared/layout/secondary-nav"
import { useIsMobile } from "@/shared/hooks/use-mobile"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { useSession } from "@/providers/auth-provider"
import { getOrInitializeNickname } from "@/shared/utils/nickname"
import { usePartnerStateStore } from "@/features/chat"
import { useMessagesStore } from "@/features/chat/presentation/store/messages-store"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const pathname = usePathname()
  const { data: session } = useSession()

  const [displayName, setDisplayName] = React.useState("Guest")

  const peerNickname = usePartnerStateStore((state) => state.peerNickname)
  const peerUsername = usePartnerStateStore((state) => state.peerUsername)
  const isWsReady = usePartnerStateStore((state) => state.isWsReady)
  const conversations = useMessagesStore((state) => state.conversations)

  const partnerName = React.useMemo(() => {
    // Attempt to read synchronously from cached conversations to prevent layout shift on navigation
    if (pathname.startsWith("/chat/") && pathname !== "/chat/waiting" && pathname !== "/chat/disconnected") {
      const sessionId = pathname.split("/").pop()
      const cachedChat = conversations.find((c) => c.id === sessionId)
      if (cachedChat) {
        return cachedChat.name || "Stranger"
      }
    }
    // Fallback to websocket state for brand new matches not yet in the sidebar
    return isWsReady ? (peerUsername || peerNickname) : null
  }, [pathname, conversations, isWsReady, peerUsername, peerNickname])

  React.useEffect(() => {
    const user = session?.user
    if (user) {
      setDisplayName(user.name || (user as any).username || user.email?.split("@")[0] || "User")
    } else {
      setDisplayName(getOrInitializeNickname())
    }
  }, [session])

  React.useEffect(() => {
    let pageName = ""
    if (pathname === "/chat") {
      pageName = "Chats"
    } else if (pathname === "/chat/waiting") {
      pageName = "Matching"
    } else if (pathname === "/chat/disconnected") {
      pageName = "Disconnected"
    } else if (pathname.startsWith("/chat/")) {
      pageName = "Direct Message"
    } else if (pathname === "/friends") {
      pageName = "Friends"
    } else if (pathname === "/groups") {
      pageName = "Groups"
    }

    if (pageName) {
      document.title = `${pageName} • Moots`
    } else {
      document.title = "Moots"
    }
  }, [pathname])

  const initials = displayName.substring(0, 2).toUpperCase()

  // On mobile, if we are at the root of a module with a secondary nav, hide the main inset.
  const isSecondaryNavActiveRoot = pathname === "/chat"

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "15rem",        /* 240px — standard sidebar width */
          "--sidebar-width-icon": "3.5rem",  /* 56px — icon-only collapsed */
        } as React.CSSProperties
      }
      className="h-screen overflow-hidden"
    >
      <SidebarNav />
      <SecondaryNav />

      <SidebarInset 
        className={cn(
          "flex flex-col h-screen overflow-hidden bg-background",
          isSecondaryNavActiveRoot ? "hidden md:flex" : "flex"
        )}
      >

        {/* ── HEADER ── */}
        {/*
          h-14 (56px) — matches sidebar header height for visual alignment.
          px-4 — standard content padding.
        */}
        {!(pathname.startsWith("/chat/") && pathname !== "/chat/waiting" && pathname !== "/chat/disconnected") && (
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between px-4 bg-background/95 backdrop-blur-md">

            {/* LEFT: expand trigger (when sidebar collapsed) + avatar + name */}
            <div className="flex items-center gap-3">
              {/* Show when sidebar is in icon-only mode */}
              <SidebarTrigger className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent hidden peer-data-[state=collapsed]:flex [&_svg]:size-5" />
              {isMobile && (
                <SidebarTrigger className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent [&_svg]:size-5" />
              )}
              {!(pathname === "/chat" || pathname === "/chat/waiting") && (
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-sm font-semibold bg-foreground/10">
                      {partnerName ? partnerName.substring(0, 2).toUpperCase() : initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold leading-none">
                    {partnerName ? partnerName : displayName}
                  </span>
                </div>
              )}
            </div>

            {/* RIGHT: auth buttons when not logged in */}
            {!session && (
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm" className="text-[13px] text-muted-foreground hover:text-foreground">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-[13px] h-8">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}

          </header>
        )}

        {/* ── PAGE CONTENT ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>

      </SidebarInset>
    </SidebarProvider>
  )
}
