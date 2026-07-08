"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "@/providers/auth-provider"
import { Button } from "@/shared/ui/button"

export function LandingHeader() {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-[72px] items-center justify-between px-6 max-w-7xl">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <img
            src="/brand/logo-lockups/monochrome/Black%20Filled.svg"
            alt="Moots"
            className="h-[36px] w-auto dark:hidden"
          />
          <img
            src="/brand/logo-lockups/monochrome/White%20Filled.svg"
            alt="Moots"
            className="h-[36px] w-auto hidden dark:block"
          />
        </Link>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="h-10 w-24 bg-muted/20 animate-pulse rounded-full" />
          ) : session ? (
            <Button asChild className="text-[14px] h-10 px-6">
              <Link href="/chat">Start Chat</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-[14px] h-10 text-muted-foreground hover:text-foreground">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="outline" className="text-[14px] h-10 px-5">
                <Link href="/signup">Sign Up</Link>
              </Button>
              <Button asChild className="text-[14px] h-10 px-6">
                <Link href="/chat">Start Chat</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
