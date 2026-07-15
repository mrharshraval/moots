import * as React from "react"
import { Textarea } from "@/shared/ui/textarea"
import { cn } from "@/shared/utils/utils"
import { ComposerState } from "./types"

interface ComposerInputProps {
  state: ComposerState
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  placeholder?: string
  /** Passed directly so the textarea can adjust its own padding without remounting. */
  isMultiline: boolean
}

export const ComposerInput = React.forwardRef<HTMLTextAreaElement, ComposerInputProps>(
  ({ state, value, onChange, onKeyDown, textareaRef, placeholder = "Message", isMultiline }, ref) => {

    // Combine both the forwarded ref and the external textareaRef into the same node.
    // This is a stable function reference — the node is never unmounted.
    const combinedRef = React.useCallback((node: HTMLTextAreaElement | null) => {
      if (typeof ref === 'function') ref(node as HTMLTextAreaElement)
      else if (ref && node) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node

      if (textareaRef && node) (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }, [ref, textareaRef])

    return (
      <Textarea
        ref={combinedRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={state === "disabled" || state === "sending"}
        className={cn(
          // Core invariant styles — never change regardless of layout mode.
          // font-size: 16px (text-base) — matches iMessage, ChatGPT, Slack.
          // line-height: 24px (leading-6) — 1.5× ratio, comfortable for long typing.
          // font-weight: 400 (font-normal) — calm, unobtrusive input text.
          // letter-spacing: 0 (tracking-normal) — no artificial spacing at body sizes.
          // -webkit-font-smoothing is inherited from html[class~='antialiased'] in layout.
          "block w-full !bg-transparent !border-none focus-visible:!ring-0 focus-visible:ring-offset-0",
          "resize-none",
          "text-[16px] font-normal leading-[24px] tracking-[0]",
          // Placeholder: same size/weight/line-height as input text.
          // Opacity at 55% gives ~3.2:1 contrast in dark mode and ~4.1:1 in light mode.
          "text-foreground placeholder:text-muted-foreground placeholder:opacity-[0.55]",
          "!shadow-none disabled:opacity-40 disabled:cursor-not-allowed",
          "field-sizing-content",
          // Layout-mode-specific padding only — no remount required, just a class swap.
          isMultiline
            ? "p-0 min-h-[56px]"
            : "py-[12px] pl-[48px] pr-[88px] !min-h-[48px]"
        )}
      />
    )
  }
)

ComposerInput.displayName = "ComposerInput"
