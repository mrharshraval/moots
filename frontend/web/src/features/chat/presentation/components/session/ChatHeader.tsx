import * as React from "react"
import { Phone, Video } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils/utils"
import { SidebarTrigger } from "@/shared/ui/sidebar"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"

import { useChatSessionContext } from "../chat-session-context"

export interface ChatHeaderProps {}

export function ChatHeader({}: ChatHeaderProps) {
  const {
    peerDisplayName,
    conversationStatus,
    isStrangerDisconnected,
    isWsReady,
    isReconnectingLocal,
    isStrangerReconnecting,
    initiateCall,
    handleSkip,
  } = useChatSessionContext()
  
  const isMobile = useIsMobile()
  const initials = peerDisplayName ? peerDisplayName.substring(0, 2).toUpperCase() : "ST"

  return (
    <header className="shrink-0 flex items-center justify-between px-4 h-14 bg-background/95 backdrop-blur-md border-b z-20">
      <div className="flex items-center gap-3 min-w-0">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent hidden peer-data-[state=collapsed]:flex [&_svg]:size-5 shrink-0" />
        {isMobile && (
          <SidebarTrigger className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent [&_svg]:size-5 shrink-0" />
        )}

        {/* Avatar */}
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs font-semibold bg-foreground/10">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex flex-col min-w-0 justify-center">
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm font-semibold leading-none truncate">{peerDisplayName}</span>
            {isReconnectingLocal && (
              <span className="text-[11px] text-muted-foreground animate-pulse leading-none shrink-0">Reconnecting...</span>
            )}
            {isStrangerDisconnected && isStrangerReconnecting && (
              <span className="text-[11px] text-muted-foreground animate-pulse leading-none shrink-0">Waiting...</span>
            )}
            {isStrangerDisconnected && !isStrangerReconnecting && conversationStatus !== "ENDED" && (
              <span className="text-[11px] text-muted-foreground leading-none shrink-0">Disconnected</span>
            )}
            {conversationStatus === "ENDED" && (
              <span className="text-[11px] text-muted-foreground leading-none shrink-0">Ended</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1.5 leading-none">
            <span className={cn("size-1.5 rounded-full shrink-0", isWsReady && !isStrangerDisconnected && conversationStatus !== "ENDED" ? "bg-green-500" : "bg-muted-foreground")} />
            <span className="truncate">{isWsReady && !isStrangerDisconnected && conversationStatus !== "ENDED" ? "Connected" : "Offline"}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {/* Call Buttons */}
        {!isStrangerDisconnected && conversationStatus !== "ENDED" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer rounded-full"
              onClick={() => initiateCall("AUDIO")}
            >
              <Phone className="size-[15px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer rounded-full"
              onClick={() => initiateCall("VIDEO")}
            >
              <Video className="size-[17px]" />
            </Button>
          </>
        )}

        <Button variant="outline" size="sm" onClick={handleSkip} className="cursor-pointer h-8 ml-1 text-xs rounded-full px-3">
          {conversationStatus === "ENDED" ? "Next Match" : "Skip"}
        </Button>
      </div>
    </header>
  )
}
