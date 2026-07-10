import * as React from "react"
import { Message } from "@/features/chat/presentation/store/messages-store"
import { Textarea } from "@/shared/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { RotateCcw, ChevronRight, X } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { useRouter } from "next/navigation"

interface ChatInputProps {
  inputText: string
  handleInputChange: (val: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  editingMsg: Message | null
  setEditingMsg: (msg: Message | null) => void
  replyingTo: Message | null
  setReplyingTo: (msg: Message | null) => void
  peerDisplayName: string
  send: () => void
  isWsReady: boolean
  setInputText: (text: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatInput({
  inputText,
  handleInputChange,
  handleKeyDown,
  editingMsg,
  setEditingMsg,
  replyingTo,
  setReplyingTo,
  peerDisplayName,
  send,
  isWsReady,
  setInputText,
  textareaRef,
}: ChatInputProps) {
  const router = useRouter()

  return (
    <div className="sticky bottom-0 bg-background shrink-0 w-full z-20 pt-2 pb-5">
      {/* ── EDITING PREVIEW ── */}
      {editingMsg && (
        <div className="px-4 pb-3 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border text-xs">
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[10px] text-foreground mb-0.5">
                Editing message
              </span>
              <span className="text-foreground truncate max-w-lg">
                {editingMsg.content}
              </span>
            </div>
            <button
              onClick={() => {
                setEditingMsg(null)
                setInputText("")
              }}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted border-none bg-transparent outline-none"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── REPLY PREVIEW ── */}
      {replyingTo && (
        <div className="px-4 pb-3 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border/40 text-xs">
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[10px] text-muted-foreground mb-0.5">
                Replied to {replyingTo.sender === "user" ? "yourself" : peerDisplayName}
              </span>
              <span className="text-foreground truncate max-w-lg">
                {replyingTo.content}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted border-none bg-transparent outline-none"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div className="px-4 max-w-3xl mx-auto w-full">
        <div className="flex flex-col bg-muted rounded-2xl p-3 gap-2">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows={1}
            className="block w-full !bg-transparent !border-none focus-visible:!ring-0 focus-visible:ring-offset-0 resize-none min-h-[28px] max-h-[200px] text-[14px] md:text-[14px] text-foreground placeholder:text-muted-foreground/50 py-1 leading-relaxed !shadow-none p-0 overflow-y-auto custom-scrollbar disabled:opacity-40 disabled:cursor-not-allowed"
          />

          {/* Action Row at bottom */}
          <div className="flex items-center justify-between mt-1 pt-1">
            {/* Left Actions */}
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none bg-transparent outline-none rounded-lg hover:bg-foreground/5"
                  >
                    <RotateCcw className="size-5" strokeWidth={1.75} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>New partner</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2 relative min-w-8 h-8 select-none">
              <button
                onClick={() => router.push("/chat")}
                className={cn(
                  "h-8 px-3 rounded-full flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer border-none bg-transparent outline-none whitespace-nowrap hover:bg-foreground/5 absolute right-0 top-0 origin-right",
                  inputText.trim() ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
                )}
              >
                Skip
                <ChevronRight className="size-4 mt-px" strokeWidth={2} />
              </button>

              <button
                onClick={send}
                disabled={!isWsReady}
                className={cn(
                  "size-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-none outline-none absolute right-0 top-0 origin-right",
                  isWsReady ? "bg-foreground text-background hover:opacity-90" : "bg-muted-foreground/30 text-muted-foreground cursor-not-allowed",
                  !inputText.trim() ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
                )}
              >
                <ChevronRight className="size-5 -rotate-90" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
