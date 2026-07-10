import * as React from "react"
import { MessageSquare, UserMinus, ShieldAlert, Check, X } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Card } from "@/shared/ui/card"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"
import { Connection } from "../types/connection.types"

interface ConnectionCardProps {
  connection: Connection
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onRemove: (id: string) => void
  onUnblock: (id: string) => void
}

export function ConnectionCard({ connection, onAccept, onDecline, onRemove, onUnblock }: ConnectionCardProps) {
  return (
    <Card className="p-4 border border-border bg-card hover:bg-muted/5 transition-all">
      <div className="flex items-center gap-3.5">
        
        {/* User Avatar + Status Badge */}
        <div className="relative">
          <Avatar className="h-11 w-11 rounded-full">
            <AvatarFallback className="bg-muted text-muted-foreground font-bold">
              {connection.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Status dot */}
          {connection.relationship === "friend" && (
            <span
              className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                connection.status === "online"
                  ? "bg-green-500"
                  : connection.status === "idle"
                  ? "bg-amber-500"
                  : "bg-muted-foreground/45"
              }`}
            />
          )}
        </div>

        {/* Friend Information */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{connection.name}</h3>
          
          {/* Relationship/Status Description */}
          {connection.relationship === "friend" ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {connection.interests.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 bg-muted rounded text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : connection.relationship === "pending" ? (
            <p className="text-xs text-muted-foreground mt-0.5">Incoming friend request</p>
          ) : (
            <p className="text-xs text-red-500/90 mt-0.5 font-medium">Blocked</p>
          )}
        </div>

        {/* Actions Area */}
        <div className="flex items-center gap-1.5">
          {connection.relationship === "friend" && (
            <>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(connection.id)}
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            </>
          )}

          {connection.relationship === "pending" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAccept(connection.id)}
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDecline(connection.id)}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}

          {connection.relationship === "blocked" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnblock(connection.id)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ShieldAlert className="h-4 w-4 mr-1" /> Unblock
            </Button>
          )}
        </div>

      </div>
    </Card>
  )
}
