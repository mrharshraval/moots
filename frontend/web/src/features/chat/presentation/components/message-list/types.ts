import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"

export interface MessageActions {
  handleReact: (id: string, emoji: string) => void
  setEditingMsg: (msg: Message | null) => void
  setReplyingTo: (msg: Message | null) => void
  setInputText: (text: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  toggleExpand: (id: string) => void
  handleReplyClick: (msg: Message) => void
  handleDeleteMessage?: (id: string) => void
}

