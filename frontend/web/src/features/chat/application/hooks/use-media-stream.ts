"use client"

import * as React from "react"

export function useMediaStream() {
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null)
  const [isAudioMuted, setIsAudioMuted] = React.useState(false)
  const [isVideoMuted, setIsVideoMuted] = React.useState(false)
  const localStreamRef = React.useRef<MediaStream | null>(null)

  const acquireStream = React.useCallback(async (type: "AUDIO" | "VIDEO") => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "VIDEO",
    })
    setLocalStream(stream)
    localStreamRef.current = stream
    setIsAudioMuted(false)
    setIsVideoMuted(false)
    return stream
  }, [])

  const releaseStream = React.useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setIsAudioMuted(false)
    setIsVideoMuted(false)
  }, [])

  const toggleMute = React.useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleCamera = React.useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoMuted(!videoTrack.enabled)
      }
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    localStream,
    localStreamRef,
    isAudioMuted,
    isVideoMuted,
    setIsAudioMuted,
    setIsVideoMuted,
    acquireStream,
    releaseStream,
    setLocalStream,
    toggleMute,
    toggleCamera,
  }
}
