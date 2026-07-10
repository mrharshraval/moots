"use client"

import React, { Suspense } from "react"
import { MatchmakerView } from "@/features/matchmaking"
import { Card } from "@/shared/ui/card"

export default function ChatConfiguratorPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-background">
        <Card className="w-full max-w-[400px] border-border bg-card shadow-lg p-6 text-center rounded-3xl">
          <p className="text-sm text-muted-foreground">Loading discover</p>
        </Card>
      </div>
    }>
      <MatchmakerView />
    </Suspense>
  )
}
