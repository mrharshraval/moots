"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Globe, Tag, Ban, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function MatchingQueueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Extract parameters to display them
  const interestsParam = searchParams.get("interests")
  const langParam = searchParams.get("lang") || "en"
  const countryParam = searchParams.get("country") || "global"
  
  const interestsList = interestsParam ? interestsParam.split(",") : []

  // Timer states
  const [seconds, setSeconds] = React.useState(0)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    // Simulate match connection in 5 seconds for prototype flow
    const matchTimeout = setTimeout(() => {
      router.push(`/chat/mock-session-892`)
    }, 5000)

    return () => {
      clearInterval(timer)
      clearTimeout(matchTimeout)
    }
  }, [router])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  const handleCancel = () => {
    router.push("/chat")
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card shadow-lg text-center relative overflow-hidden">
        {/* Pulsing Radar Background Effect */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-48 h-48 rounded-full border-2 border-primary animate-ping" />
          <div className="absolute w-72 h-72 rounded-full border-2 border-primary animate-ping delay-300" />
        </div>

        <CardHeader className="pb-4 relative z-10">
          <Badge variant="secondary" className="mx-auto mb-2 text-[9px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Matching Queue
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">Finding a Stranger</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Matching queue active. Connecting you to a random peer.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10 py-6">
          {/* Pulse Circle */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/5 border border-primary/15 relative">
            <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
            <Globe className="h-8 w-8 text-primary animate-bounce" />
          </div>

          {/* Time Counter */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-mono font-bold tracking-tight text-foreground">
              {formatTime(seconds)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Elapsed Time</span>
          </div>

          {/* Applied filters summary */}
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Queue Filters</span>
            <div className="flex flex-wrap justify-center gap-1.5">
              <Badge variant="outline" className="text-[9px] capitalize border-border">
                Lang: {langParam}
              </Badge>
              <Badge variant="outline" className="text-[9px] capitalize border-border">
                Region: {countryParam}
              </Badge>
              {interestsList.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[9px] bg-secondary text-secondary-foreground">
                  #{tag}
                </Badge>
              ))}
              {interestsList.length === 0 && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground border-dashed">
                  Fully Random
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 relative z-10">
          <Button variant="outline" onClick={handleCancel} className="w-full h-10 text-xs border-border flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground">
            <Ban className="h-4 w-4" />
            CANCEL SEARCH
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

function MatchingQueueFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card shadow-lg text-center relative overflow-hidden">
        <CardHeader className="pb-4">
          <Badge variant="secondary" className="mx-auto mb-2 text-[9px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Matching Queue
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">Loading Queue...</CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/5 border border-primary/15">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MatchingQueuePage() {
  return (
    <React.Suspense fallback={<MatchingQueueFallback />}>
      <MatchingQueueContent />
    </React.Suspense>
  )
}
