import * as React from "react"
import { SessionDisconnected } from "./session-disconnected"
import { ScrollableMessageArea } from "./ScrollableMessageArea"
import { MessageComposer } from "@/features/chat/presentation/components/composer"

import { useChatSessionContext } from "../chat-session-context"

interface ChatViewStateProps {}

export function ChatViewState({}: ChatViewStateProps) {
  const {
    pageState,
    disconnectScenario,
    peerDisplayName,
    handleSkip,
    isStrangerDisconnected,
    isStrangerReconnecting,
    isWsReady,
    inputText,
    setInputText,
    replyingTo,
    setReplyingTo,
    editingMsg,
    setEditingMsg,
    handleSendWrapped,
    textareaRef,
    handleInputChange,
  } = useChatSessionContext()
  if (pageState === "history") {
    return (
      <div className="flex-1 flex items-center justify-center relative z-0 h-full w-full">
        <SessionDisconnected
          scenario={disconnectScenario}
          onContinue={handleSkip}
        />
      </div>
    )
  }

  if (pageState === "disconnected") {
    return (
      <div className="flex-1 flex flex-col relative z-0 h-[100dvh] w-full">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50 z-0 mask-image-b-0">
          <ScrollableMessageArea />
        </div>
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center p-6">
          <SessionDisconnected
            scenario={disconnectScenario}
            onContinue={handleSkip}
          />
          {isStrangerDisconnected && isStrangerReconnecting && (
            <div className="absolute bottom-24 text-center w-full">
              <span className="text-sm font-medium animate-pulse text-muted-foreground">Reconnecting...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (pageState === "active") {
    return (
      <div className="flex-1 flex flex-col relative z-0 h-full w-full">
        <ScrollableMessageArea />
        <div className="w-full shrink-0 z-50">
          <MessageComposer
            inputText={inputText}
            setInputText={setInputText}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            editingMsg={editingMsg}
            setEditingMsg={setEditingMsg}
            send={handleSendWrapped}
            textareaRef={textareaRef}
            handleInputChange={handleInputChange}
            peerDisplayName={peerDisplayName}
            isWsReady={isWsReady}
          />
        </div>
      </div>
    )
  }

  // pageState === "matching"
  return (
    <div className="flex-1 flex items-center justify-center relative z-0 h-full w-full">
      <div className="text-center space-y-4">
        <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <h2 className="text-xl font-semibold tracking-tight">Finding a match...</h2>
        <p className="text-muted-foreground text-sm">Waiting for someone to connect</p>
      </div>
    </div>
  )
}
