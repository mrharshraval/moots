"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SidebarNav } from "@/components/panels/sidebar-nav"
import { useIsMobile } from "@/hooks/use-mobile"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isMobile = useIsMobile()

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "15rem",        /* 240px — standard sidebar width */
          "--sidebar-width-icon": "3.5rem",  /* 56px — icon-only collapsed */
        } as React.CSSProperties
      }
      className="min-h-screen"
    >
      <SidebarNav />

      <SidebarInset className="flex flex-col min-h-screen bg-background">

        {/* ── HEADER ── */}
        {/*
          h-14 (56px) — matches sidebar header height for visual alignment.
          px-4 — standard content padding.
        */}
        <header className="flex h-14 shrink-0 items-center justify-between px-4">

          {/* LEFT: expand trigger (when sidebar collapsed) + avatar + name */}
          <div className="flex items-center gap-3">
            {/* Show when sidebar is in icon-only mode */}
            <SidebarTrigger className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent hidden peer-data-[state=collapsed]:flex [&_svg]:size-5" />
            {isMobile && (
              <SidebarTrigger className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent [&_svg]:size-5" />
            )}
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="text-sm font-semibold bg-foreground/10">H</AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold leading-none">Harsh</span>
            </div>
          </div>

          {/* RIGHT: Info / theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            className="size-9 text-muted-foreground hover:text-foreground"
          >
            <Info className="size-5" strokeWidth={1.75} />
          </Button>
        </header>

        {/* ── PAGE CONTENT ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>

      </SidebarInset>
    </SidebarProvider>
  )
}
