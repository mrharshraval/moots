"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RotateCcw, Home, Sparkles, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DisconnectedPage() {
  const router = useRouter()

  const handleMatchAgain = () => {
    router.push("/chat/waiting")
  }

  const handleReturnHome = () => {
    router.push("/")
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card shadow-lg text-center">
        <CardHeader className="pb-4">
          <Badge variant="secondary" className="mx-auto mb-2 text-[9px] uppercase tracking-wider bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
            <AlertCircle className="h-3 w-3 mr-1" /> Session Closed
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">Stranger Left the Chat</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Your connection with the stranger has been terminated.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 py-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/40 border border-border">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Would you like to match with another stranger or return to the configuration page?
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button onClick={handleMatchAgain} className="w-full h-11 text-xs font-semibold flex items-center justify-center gap-1.5">
            <RotateCcw className="h-4 w-4" />
            MATCH WITH SOMEONE NEW
          </Button>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleReturnHome} className="flex-1 h-10 text-xs border-border text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5">
              <Home className="h-4 w-4" />
              Main Menu
            </Button>
            <Button variant="outline" className="flex-1 h-10 text-xs border-border text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5">
              <Download className="h-4 w-4" />
              Save Logs
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
