"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageCircle,
  Bell,
  UsersRound,
  Globe,
  LogOut,
  UserCircle,
  ChevronsUpDown,
  Settings,
  LifeBuoy,
  Sparkles,
  Palette,
  LogIn,
  UserPlus,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/shared/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { cn } from "@/shared/utils/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/shared/ui/dropdown-menu"
import { useSession } from "@/providers/auth-provider"
import { getOrInitializeNickname } from "@/shared/utils/nickname"
import { ProfileDialog } from "@/features/profile"
import { SettingsDialog } from "@/features/settings"

import { env } from "@/env";

const SUPPORT_EMAIL = env.NEXT_PUBLIC_SUPPORT_EMAIL;

const NAV_ITEMS = [
  { id: "chats",         label: "Chats",         icon: MessageCircle,  href: "/chat" },
  { id: "friends",       label: "Friends",       icon: UsersRound,     href: "/friends" },
  { id: "groups",        label: "Groups",        icon: Globe,          href: "/groups" },
]

const getUserInitials = (name?: string | null, email?: string | null) => {
  if (name) {
    const parts = name.split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email) return email.substring(0, 2).toUpperCase();
  return "U";
};

export function SidebarNav() {
  const pathname = usePathname()
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar()
  const { data: session, signOut } = useSession()
  const [helpOpen, setHelpOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleSidebarClick = (e: React.MouseEvent) => {
    if (state === "collapsed") {
      const target = e.target as HTMLElement
      const isMenuItem = target.closest('[data-sidebar="menu-button"]')
      if (!isMenuItem) {
        setOpen(true)
      }
    }
  }

  const user = session?.user;
  const isGuest = !user;
  const displayName = isGuest 
    ? (mounted ? getOrInitializeNickname() : "Guest User") 
    : (user.name || (user as any).username || user.email?.split("@")[0] || "User");
  const username = (user as any)?.username;
  const userSubtitle = isGuest 
    ? "Guest" 
    : (username ? (username.startsWith("@") ? username : `@${username}`) : (user.email || ""));
  const initials = user ? getUserInitials(user?.name, user?.email) : getUserInitials(displayName, null);


  const side = isMobile ? "top" : (state === "collapsed" ? "right" : "top");
  const align = isMobile ? "center" : (state === "collapsed" ? "end" : "start");

  return (
    <Sidebar collapsible="icon" className="border-r border-black/[0.06] dark:border-white/[0.06]" onClick={handleSidebarClick}>

      <SidebarHeader className="flex-row items-center px-2 h-14 shrink-0 relative">
        <div className="flex items-center justify-center size-10 rounded-xl shrink-0">
          <img
            src="/brand/brand-marks/monochrome/Balck%20Filled.svg"
            alt="Moots"
            className="size-8 shrink-0 dark:hidden"
          />
          <img
            src="/brand/brand-marks/monochrome/White%20Filled.svg"
            alt="Moots"
            className="size-8 shrink-0 hidden dark:block"
          />
        </div>
        <SidebarTrigger className="absolute right-2.5 size-10 rounded-xl text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden [&_svg]:size-5" />
      </SidebarHeader>

      {/* ── NAV ITEMS ── */}
      <SidebarContent className="gap-0">
        <SidebarGroup className="px-2 pt-1 pb-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/chat"
                    ? pathname.startsWith("/chat")
                    : pathname === item.href
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      size="default"
                      tooltip={item.label}
                      className={cn(
                        "h-10 gap-3 text-sm font-normal rounded-xl",
                        "pl-2.5 pr-3 w-full justify-start [&_svg]:size-5!",
                        "group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                      )}
                    >
                      <Link 
                        href={item.href} 
                        className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center"
                        onClick={() => {
                          if (isMobile) setOpenMobile(false)
                        }}
                      >
                        <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── FOOTER: user avatar ── */}
      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu onOpenChange={(open) => { if (!open) { setHelpOpen(false); } }}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={displayName}
                  className={cn(
                    "h-10 gap-3 text-sm font-normal rounded-xl group/user",
                    "pl-2 pr-3 w-full justify-start data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                    "group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                  )}
                >
                  <Avatar className="size-6 shrink-0 rounded-full after:rounded-full">
                    {user?.image && <AvatarImage src={user.image} alt={displayName} />}
                    <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1 leading-none text-left group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium truncate">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground truncate mt-0.5">{userSubtitle}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={side}
                align={align}
                sideOffset={10}
                className={cn(
                  "p-1 rounded-xl border border-border/50 bg-background shadow-xl",
                  state === "collapsed" && !isMobile ? "w-56" : "w-(--radix-dropdown-menu-trigger-width)"
                )}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Avatar className="size-8 shrink-0 rounded-full">
                    {user?.image && <AvatarImage src={user.image} alt={displayName} />}
                    <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{displayName}</span>
                    <span className="text-xs text-muted-foreground truncate">{userSubtitle}</span>
                  </div>
                </div>
                <DropdownMenuSeparator className="my-1 bg-border/50" />
                
                {isGuest ? (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                        <Link href="/signup" className="w-full flex items-center">
                          <div className="flex items-center justify-center size-8 shrink-0">
                            <UserPlus className="size-4" />
                          </div>
                          <span>Create Account</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                        <Link href="/login" className="w-full flex items-center">
                          <div className="flex items-center justify-center size-8 shrink-0">
                            <LogIn className="size-4" />
                          </div>
                          <span>Sign In</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-1 bg-border/50" />
                    <DropdownMenuSub open={helpOpen} onOpenChange={setHelpOpen}>
                      <DropdownMenuSubTrigger
                        className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer [&>svg]:ml-auto"
                        onPointerMove={(e) => e.preventDefault()}
                        onPointerLeave={(e) => e.preventDefault()}
                        onPointerEnter={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHelpOpen((prev) => !prev);
                        }}
                      >
                        <div className="flex items-center justify-center size-8 shrink-0">
                          <LifeBuoy className="size-4" />
                        </div>
                        <span>Help</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-48 p-1 rounded-xl border border-border/50 bg-background shadow-xl">
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/help" className="w-full flex items-center">
                              <span>Help Center</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <a href={`mailto:${SUPPORT_EMAIL}`} className="w-full flex items-center">
                              <span>Contact Support</span>
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/policies/community-guidelines" className="w-full flex items-center">
                              <span>Community Guidelines</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-border/50" />
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/policies/privacy" className="w-full flex items-center">
                              <span>Privacy Policy</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/policies/terms" className="w-full flex items-center">
                              <span>Terms of Service</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-border/50" />
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <a href={`mailto:${SUPPORT_EMAIL}?subject=Report%20a%20Problem`} className="w-full flex items-center">
                              <span>Report a Problem</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  </>
                ) : (
                  <>
                    <DropdownMenuGroup>

                      <DropdownMenuItem 
                        onClick={() => setProfileOpen(true)}
                        className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-center size-8 shrink-0">
                          <UserCircle className="size-4" />
                        </div>
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setSettingsOpen(true)}
                        className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer"
                      >
                        <div className="flex items-center justify-center size-8 shrink-0">
                          <Settings className="size-4" />
                        </div>
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-1 bg-border/50" />
                    <DropdownMenuSub open={helpOpen} onOpenChange={setHelpOpen}>
                      <DropdownMenuSubTrigger
                        className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer [&>svg]:ml-auto"
                        onPointerMove={(e) => e.preventDefault()}
                        onPointerLeave={(e) => e.preventDefault()}
                        onPointerEnter={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setHelpOpen((prev) => !prev);
                        }}
                      >
                        <div className="flex items-center justify-center size-8 shrink-0">
                          <LifeBuoy className="size-4" />
                        </div>
                        <span>Help</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-48 p-1 rounded-xl border border-border/50 bg-background shadow-xl">
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/help" className="w-full flex items-center">
                              <span>Help Center</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <a href={`mailto:${SUPPORT_EMAIL}`} className="w-full flex items-center">
                              <span>Contact Support</span>
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/policies/community-guidelines" className="w-full flex items-center">
                              <span>Community Guidelines</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-border/50" />
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/policies/privacy" className="w-full flex items-center">
                              <span>Privacy Policy</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <Link href="/policies/terms" className="w-full flex items-center">
                              <span>Terms of Service</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-border/50" />
                          <DropdownMenuItem asChild className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer">
                            <a href={`mailto:${SUPPORT_EMAIL}?subject=Report%20a%20Problem`} className="w-full flex items-center">
                              <span>Report a Problem</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator className="my-1 bg-border/50" />
                    <DropdownMenuItem
                      onClick={() => signOut({ redirect: true })}
                      className="h-10 rounded-xl text-sm px-2 gap-2 cursor-pointer focus:text-destructive focus:bg-destructive/10"
                    >
                      <div className="flex items-center justify-center size-8 shrink-0">
                        <LogOut className="size-4" />
                      </div>
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail
        className={cn(
          "after:hidden",
          state === "collapsed"
            ? "cursor-col-resize hover:cursor-col-resize pointer-events-auto"
            : "cursor-default pointer-events-none"
        )}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </Sidebar>
  )
}
