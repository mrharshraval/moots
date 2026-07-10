"use client"

import React, { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { MatchmakingQueue } from "@/features/matchmaking"

function MatchingQueueFallback() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border border-border bg-card shadow-sm text-center relative overflow-hidden">
        <CardHeader className="pb-4">
          <Badge variant="secondary" className="mx-auto mb-2 text-[10px] font-medium uppercase tracking-wider bg-secondary text-secondary-foreground border border-border/40 hover:bg-secondary/80">
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Matching Queue
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">Loading queue</CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-muted/30 border border-border/40">
            <Loader2 className="h-8 w-8 text-foreground animate-spin" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MatchingQueuePage() {
  return (
    <Suspense fallback={<MatchingQueueFallback />}>
      <MatchmakingQueue />
    </Suspense>
  )
}
