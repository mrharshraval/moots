import * as React from "react"
import { ContextMenuItem } from "@/shared/ui/context-menu"
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { MessageActions } from "./types"
import { Pencil, Trash2 } from "lucide-react"

interface MessageMenuItemsProps {
  msg: Message
  actions: MessageActions
  asDropdown?: boolean
}

export function MessageMenuItems({ msg, actions, asDropdown = false }: MessageMenuItemsProps) {
  // We only support edit/delete for the user's own messages
  if (msg.sender !== "user") return null

  const Item = asDropdown ? DropdownMenuItem : ContextMenuItem

  return (
    <>
      <Item 
        onClick={() => {
          actions.setEditingMsg(msg)
          actions.setReplyingTo(null)
          actions.setInputText(msg.content)
          if (actions.textareaRef.current) actions.textareaRef.current.focus()
        }}
        className="flex items-center gap-2 cursor-pointer font-medium"
      >
        <Pencil className="size-4 text-muted-foreground" />
        <span>Edit</span>
      </Item>
      
      <div className="h-px bg-border/40 my-1 mx-1" />

      <Item 
        onClick={() => {
          if (actions.handleDeleteMessage) {
            actions.handleDeleteMessage(msg.id)
          }
        }}
        className="flex items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-medium"
      >
        <Trash2 className="size-4" />
        <span>Delete</span>
      </Item>
    </>
  )
}
