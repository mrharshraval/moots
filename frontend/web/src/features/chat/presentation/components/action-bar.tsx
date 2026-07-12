import * as React from "react"
import { CheckCheck, Heart, Phone, Video } from "lucide-react"
import { Button } from "@/shared/ui/button"

export interface ActionBarProps {
  connectionStatus: "none" | "pending_sent" | "pending_received" | "accepted" | "rejected" | null
  isUserLoggedIn: boolean
  handleSendConnectionRequest: () => void
  handleAcceptConnectionRequest: () => void
  onVoiceCall?: () => void
  onVideoCall?: () => void
}

export function ActionBar({
  connectionStatus,
  isUserLoggedIn,
  handleSendConnectionRequest,
  handleAcceptConnectionRequest,
  onVoiceCall,
  onVideoCall
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/10 shrink-0">
      <div className="text-xs text-muted-foreground flex gap-4">
        <span>Anonymous Chat</span>
        {connectionStatus === "accepted" && (
          <span className="text-primary font-medium flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" /> Connected
          </span>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={onVoiceCall}>
          <Phone className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={onVideoCall}>
          <Video className="w-4 h-4" />
        </Button>

        {connectionStatus === "none" && (
          <Button variant="secondary" size="sm" className="h-7 text-[11px]" onClick={handleSendConnectionRequest}>
            Connect
          </Button>
        )}
        {connectionStatus === "pending_sent" && (
          <Button variant="secondary" size="sm" className="h-7 text-[11px]" disabled>
            Request Sent
          </Button>
        )}
        {connectionStatus === "pending_received" && (
          <Button variant="secondary" size="sm" className="h-7 text-[11px] bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAcceptConnectionRequest}>
            Accept Connection
          </Button>
        )}
      </div>
    </div>
  )
}
