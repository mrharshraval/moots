import { useMemo } from "react"
import { ComposerState } from "./types"
import { Message } from "@/features/chat/presentation/store/messages-store"

export interface UseComposerStateProps {
  inputText: string
  isFocused: boolean
  isMultiline: boolean
  replyingTo: Message | null
  editingMsg: Message | null
  isSending: boolean
  isError?: boolean
  isDisabled?: boolean
}

export function useComposerState({
  inputText,
  isFocused,
  isMultiline,
  replyingTo,
  editingMsg,
  isSending,
  isError,
  isDisabled,
}: UseComposerStateProps): ComposerState {
  return useMemo(() => {
    if (isDisabled) return "disabled"
    if (isError) return "error"
    if (isSending) return "sending"
    if (editingMsg) return "edit"
    if (replyingTo) return "reply"
    
    const hasText = inputText.trim().length > 0
    
    if (isMultiline) return "multiline"
    if (hasText) return "typing"
    if (isFocused) return "idle"
    return "empty"
  }, [
    inputText,
    isFocused,
    isMultiline,
    replyingTo,
    editingMsg,
    isSending,
    isError,
    isDisabled
  ])
}
