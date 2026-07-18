import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { ComposerState } from "./types"
import { useComposerState } from "./use-composer-state"
import { ComposerInput } from "./ComposerInput"
import { ComposerLeftAction, ComposerRightAction } from "./ComposerActions"
import { ComposerSendButton } from "./ComposerSendButton"
import { ComposerReplyPreview } from "./ComposerReplyPreview"
import { ComposerEditBanner } from "./ComposerEditBanner"
import { cn } from "@/shared/utils/utils"

export interface MessageComposerProps {
  inputText: string
  handleInputChange: (val: string) => void
  editingMsg: Message | null
  setEditingMsg: (msg: Message | null) => void
  replyingTo: Message | null
  setReplyingTo: (msg: Message | null) => void
  peerDisplayName: string
  send: () => void
  isWsReady: boolean
  setInputText: (text: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onSkip?: () => void
  isSending?: boolean
  isPartnerReconnecting?: boolean
}

export function MessageComposer({
  inputText,
  handleInputChange,
  editingMsg,
  setEditingMsg,
  replyingTo,
  setReplyingTo,
  peerDisplayName,
  send,
  isWsReady,
  setInputText,
  textareaRef,
  onSkip,
  isSending = false,
  isPartnerReconnecting = false
}: MessageComposerProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  // Detect multiline purely from content — no DOM class manipulation, no forced reflow.
  // `field-sizing-content` on the textarea means the browser grows it naturally.
  // We consider the composer multiline when: explicit newlines exist, OR the text is
  // long enough that it almost certainly wraps (>60 chars as a heuristic).
  const hasNewlines = inputText.includes('\n')
  const isLong = inputText.length > 60
  const isMultiline = hasNewlines || isLong

  const state = useComposerState({
    inputText,
    isFocused,
    isMultiline,
    replyingTo,
    editingMsg,
    isSending,
    isDisabled: !isWsReady || isPartnerReconnecting,
  })

  const handleCancelReply = React.useCallback(() => {
    setReplyingTo(null)
  }, [setReplyingTo])

  const handleCancelEdit = React.useCallback(() => {
    setEditingMsg(null)
    setInputText("")
  }, [setEditingMsg, setInputText])

  const handleInternalKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!inputText.trim() || state === "sending") return
      send()
    } else if (e.key === "Escape") {
      e.preventDefault()
      if (onSkip) onSkip()
    }
  }, [inputText, state, send, onSkip])

  const showActionRow = isMultiline

  return (
    <div className="sticky bottom-0 bg-background shrink-0 w-full z-20 pt-4 pb-12">
      {/* ── COMPOSER PILL ── */}
      <div className="px-4 max-w-3xl mx-auto w-full">
        <div
          className="relative w-full bg-muted/70 border border-transparent rounded-[25px] transition-all duration-200 flex flex-col"
          onFocusCapture={() => setIsFocused(true)}
          onBlurCapture={() => setIsFocused(false)}
        >
          <ComposerReplyPreview replyingTo={replyingTo} peerDisplayName={peerDisplayName} onCancel={handleCancelReply} />
          <ComposerEditBanner editingMsg={editingMsg} onCancel={handleCancelEdit} />

          <div className="relative w-full shrink-0">
            {/* Content + scroll wrapper */}
            <div
              className={cn(
                "overflow-y-auto",
                isMultiline
                  ? "max-h-[180px] pt-3 pl-4 pr-3 pb-1 mr-0"
                  : "max-h-[48px] overflow-hidden"
              )}
            >
              <ComposerInput
                state={state}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleInternalKeyDown}
                textareaRef={textareaRef}
                isMultiline={isMultiline}
                placeholder={isPartnerReconnecting ? "Partner is reconnecting..." : "Message"}
              />
            </div>

            {/* Absolutely-positioned actions (single-line only) */}
            {!isMultiline && (
              <>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                  <ComposerLeftAction state={state} onSkip={() => onSkip && onSkip()} />
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-auto">
                  <ComposerRightAction state={state} />
                  <ComposerSendButton state={state} onClick={send} />
                </div>
              </>
            )}
          </div>

          {/* Bottom action row (multiline only) */}
          {isMultiline && (
            <div className="flex items-center justify-between p-2 h-12 w-full shrink-0">
              <div>
                <ComposerLeftAction state={state} onSkip={() => onSkip && onSkip()} />
              </div>
              <div className="flex items-center">
                <ComposerRightAction state={state} />
                <ComposerSendButton state={state} onClick={send} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
