"use client"

import * as React from "react"
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, User } from "lucide-react"
import { Button } from "@/shared/ui/button"

export interface CallOverlayProps {
  callState: "idle" | "ringing_incoming" | "ringing_outgoing" | "active" | "ended"
  callType: "AUDIO" | "VIDEO" | null
  peerDisplayName: string
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isAudioMuted: boolean
  isVideoMuted: boolean
  acceptCall: () => void
  declineCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleCamera: () => void
}

export function CallOverlay({
  callState,
  callType,
  peerDisplayName,
  localStream,
  remoteStream,
  isAudioMuted,
  isVideoMuted,
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
  toggleCamera
}: CallOverlayProps) {
  const localVideoRef = React.useRef<HTMLVideoElement>(null)
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null)
  const [duration, setDuration] = React.useState(0)

  // Track call duration
  React.useEffect(() => {
    let timer: NodeJS.Timeout
    if (callState === "active") {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setDuration(0)
    }
    return () => clearInterval(timer)
  }, [callState])

  // Attach local video track
  React.useEffect(() => {
    if (localVideoRef.current && localStream && callType === "VIDEO" && !isVideoMuted) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, callType, isVideoMuted])

  // Attach remote video track
  React.useEffect(() => {
    if (remoteVideoRef.current && remoteStream && callType === "VIDEO") {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, callType])

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (callState === "idle") return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between bg-zinc-950/95 text-zinc-50 p-6 backdrop-blur-md">
      {/* Video Call Streams */}
      {callType === "VIDEO" && callState === "active" && (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black z-0">
          {/* Remote Video (Full Screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Local Video Thumbnail (Picture-in-Picture) */}
          {localStream && !isVideoMuted && (
            <div className="absolute top-4 right-4 w-32 h-44 rounded-lg overflow-hidden border border-zinc-800 shadow-xl z-10 bg-zinc-900">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* Header Info */}
      <div className="w-full flex flex-col items-center mt-12 z-10 select-none">
        <div className="relative flex items-center justify-center">
          {callState !== "active" && (
            <div className="absolute w-24 h-24 rounded-full bg-primary/20 animate-ping" />
          )}
          <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-lg">
            <User className="w-10 h-10 text-zinc-400" />
          </div>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-wide">{peerDisplayName}</h2>
        <p className="mt-1 text-xs text-zinc-400 font-light uppercase tracking-wider">
          {callState === "ringing_incoming" && `Incoming ${callType?.toLowerCase()} call`}
          {callState === "ringing_outgoing" && "Ringing..."}
          {callState === "active" && (callType === "VIDEO" ? "Video Chatting" : "Voice Chatting")}
        </p>
        {callState === "active" && (
          <span className="mt-3 px-2.5 py-1 text-xs font-mono bg-zinc-900/60 rounded-full border border-zinc-800/80">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Action Controls */}
      <div className="w-full max-w-xs flex flex-col gap-6 items-center mb-12 z-10">
        {callState === "ringing_incoming" ? (
          /* Incoming Call Dialog Actions */
          <div className="flex gap-8 justify-center w-full">
            <Button
              variant="default"
              size="icon"
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-lg"
              onClick={acceptCall}
            >
              <Phone className="w-6 h-6 text-zinc-50" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 shadow-lg"
              onClick={declineCall}
            >
              <PhoneOff className="w-6 h-6 text-zinc-50" />
            </Button>
          </div>
        ) : (
          /* Ringing Outgoing or Active Call Controls */
          <div className="flex flex-col items-center gap-6 w-full">
            {callState === "active" && (
              <div className="flex gap-4 justify-center">
                {/* Mute Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-12 h-12 rounded-full border ${
                    isAudioMuted
                      ? "bg-rose-600/20 border-rose-600 text-rose-500 hover:bg-rose-600/30"
                      : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  }`}
                  onClick={toggleMute}
                >
                  {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                {/* Video Camera Toggle (Only for Video Calls) */}
                {callType === "VIDEO" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`w-12 h-12 rounded-full border ${
                      isVideoMuted
                        ? "bg-rose-600/20 border-rose-600 text-rose-500 hover:bg-rose-600/30"
                        : "bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    }`}
                    onClick={toggleCamera}
                  >
                    {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </Button>
                )}
              </div>
            )}

            {/* End Call Button */}
            <Button
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 shadow-lg"
              onClick={endCall}
            >
              <PhoneOff className="w-6 h-6 text-zinc-50" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
