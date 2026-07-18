import { Message } from "@/features/chat/presentation/store/messages-store"
import { GroupPosition } from "@/features/chat/presentation/components/bubble-geometry"

/** Returns true when this message should show the inline reply preview above it. */
export function shouldShowReplyPreview(msg: Message, prevMsg?: Message): boolean {
  if (!msg.reply) return false

  // Always show if this is the first message
  if (!prevMsg) return true

  // A new preview is needed when:
  // 1. The previous message is from a different sender
  if (prevMsg.sender !== msg.sender) return true

  // 2. The previous message has NO reply (conversation break)
  if (!prevMsg.reply) return true

  // 3. The previous message replies to a DIFFERENT original message
  if (prevMsg.reply.id !== msg.reply.id) return true

  // 4. Same sender, same replyTo → suppress (grouped run)
  return false
}

export function getMessageGroupPosition(msg: Message, prevMsg?: Message, nextMsg?: Message): GroupPosition {
  const showReplyPreview = shouldShowReplyPreview(msg, prevMsg)
  const showReplyPreviewNext = nextMsg ? shouldShowReplyPreview(nextMsg, msg) : false

  const isConsecutivePrev = prevMsg && prevMsg.sender === msg.sender && !showReplyPreview
  const isConsecutiveNext = nextMsg && nextMsg.sender === msg.sender && !showReplyPreviewNext

  const isStandalone = !isConsecutivePrev && !isConsecutiveNext
  const isFirst = !isConsecutivePrev && isConsecutiveNext
  const isLast = isConsecutivePrev && !isConsecutiveNext

  return isStandalone ? "standalone" : isFirst ? "first" : isLast ? "last" : "middle"
}

export function calculateMessageSpacingClass(msg: Message, prevMsg?: Message): string {
  if (!prevMsg) return "mt-0"

  const isConsecutive = prevMsg.sender === msg.sender
  const isGroupContinuation = msg.reply && prevMsg?.reply?.id === msg.reply.id && prevMsg?.sender === msg.sender

  if (isGroupContinuation) return "mt-1"           // tight — same reply group
  if (isConsecutive) return "mt-1"                 // tight — consecutive same sender
  
  return "mt-5"                                    // normal break
}

export function formatMessageStatus(msg: Message): string {
  if (msg.seen) return "Seen"
  if (msg.status === "SENDING") return "Sending"
  if (msg.status === "DELIVERED") return "Delivered"
  if (msg.status === "PERSISTED") return "Sent"
  if (msg.status === "FAILED") return "Failed to send"
  return "Sent"
}
