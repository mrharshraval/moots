"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Compass,
  MessageCircle,
  Bell,
  UsersRound,
  Globe,
  MessageCircleDashed,
  LogOut,
  UserCircle,
  ChevronsUpDown,
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
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_ITEMS = [
  { id: "discover",      label: "Discover",      icon: Compass,        href: "/discover" },
  { id: "chats",         label: "Chats",         icon: MessageCircle,  href: "/chat" },
  { id: "notifications", label: "Notifications", icon: Bell,           href: "/notifications" },
  { id: "friends",       label: "Friends",       icon: UsersRound,     href: "/friends" },
  { id: "groups",        label: "Groups",        icon: Globe,          href: "/groups" },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { state, setOpen } = useSidebar()

  const handleSidebarClick = (e: React.MouseEvent) => {
    if (state === "collapsed") {
      const target = e.target as HTMLElement
      const isMenuItem = target.closest('[data-sidebar="menu-button"]')
      if (!isMenuItem) {
        setOpen(true)
      }
    }
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-black/[0.06] dark:border-white/[0.06]" onClick={handleSidebarClick}>

      {/* ── HEADER: logo + collapse trigger ── */}
      <SidebarHeader className="flex-row items-center px-2.5 h-14 shrink-0 relative">
        <div className="flex items-center justify-center size-9 shrink-0">
          <MessageCircleDashed className="size-5 shrink-0" strokeWidth={2} />
        </div>
        <SidebarTrigger className="absolute right-2.5 size-9 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden [&_svg]:size-5" />
      </SidebarHeader>

      {/* ── NAV ITEMS ── */}
      <SidebarContent className="gap-0 mt-1">
        <SidebarGroup className="px-2.5 py-0">
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
                        "h-9 gap-3 text-sm font-normal rounded-lg",
                        "pl-2 pr-3 w-full justify-start [&_svg]:size-5!",
                        "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:justify-center"
                      )}
                    >
                      <Link href={item.href} className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
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
      <SidebarFooter className="px-2.5 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip="Harsh Raval"
                  className={cn(
                    "h-9 gap-3 text-sm font-normal rounded-lg group/user",
                    "pl-[6px] pr-3 w-full justify-start data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                    "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-[6px]! group-data-[collapsible=icon]:justify-center"
                  )}
                >
                  <Avatar className="size-6 shrink-0 rounded-full after:rounded-full">
                    <AvatarFallback className="text-[10px] font-semibold bg-[#d95f02] text-white rounded-full">
                      HR
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm group-data-[collapsible=icon]:hidden">Harsh Raval</span>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-56"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Avatar className="size-8 shrink-0 rounded-full">
                    <AvatarFallback className="text-xs font-semibold bg-[#d95f02] text-white rounded-full">
                      HR
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">Harsh Raval</span>
                    <span className="text-xs text-muted-foreground truncate">harsh@openchat.dev</span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="cursor-pointer">
                    <UserCircle className="mr-2 size-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
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
    </Sidebar>
  )
}
