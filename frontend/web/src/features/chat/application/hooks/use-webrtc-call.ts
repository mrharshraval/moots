"use client"

import * as React from "react"
import { wsGateway } from "@/infrastructure/websocket/ws-gateway"
import { apiRequest } from "@/infrastructure/http/api-client"
import { env } from "@/env"

export interface UseWebRTCCallProps {
  sessionId: string;
  peerActorId: string | null;
  localStream: MediaStream | null;
  localStreamRef: React.RefObject<MediaStream | null>;
  acquireStream: (type: "AUDIO" | "VIDEO") => Promise<MediaStream>;
  releaseStream: () => void;
}

export function useWebRTCCall({
  sessionId,
  peerActorId,
  localStream,
  localStreamRef,
  acquireStream,
  releaseStream,
}: UseWebRTCCallProps) {
  const [callState, setCallState] = React.useState<"idle" | "ringing_incoming" | "ringing_outgoing" | "active" | "ended">("idle")
  const [callType, setCallType] = React.useState<"AUDIO" | "VIDEO" | null>(null)
  const [callId, setCallId] = React.useState<string | null>(null)
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null)

  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null)

  // Keep refs updated to prevent stale closures in socket callbacks
  const callIdRef = React.useRef<string | null>(null)
  const peerActorIdRef = React.useRef<string | null>(null)
  const callTypeRef = React.useRef<"AUDIO" | "VIDEO" | null>(null)

  React.useEffect(() => {
    callIdRef.current = callId
  }, [callId])

  React.useEffect(() => {
    peerActorIdRef.current = peerActorId
  }, [peerActorId])

  React.useEffect(() => {
    callTypeRef.current = callType
  }, [callType])

  const cleanupCall = React.useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    releaseStream()
    setRemoteStream(null)
    setCallState("idle")
    setCallId(null)
    setCallType(null)
  }, [releaseStream])

  const setupPeerConnection = React.useCallback((stream: MediaStream, cId: string, pActorId: string) => {
    const currentPc = peerConnectionRef.current
    if (currentPc && currentPc.connectionState !== "closed" && currentPc.connectionState !== "failed") {
      return currentPc
    }

    if (currentPc) {
      currentPc.close()
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })
    peerConnectionRef.current = pc

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    pc.onicecandidate = (event) => {
      if (event.candidate && pActorId) {
        wsGateway.send("webrtc:ice-candidate", {
          sessionId,
          callId: cId,
          targetActorId: pActorId,
          candidate: event.candidate,
        })
      }
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0])
      }
    }

    return pc
  }, [sessionId])

  const initiateCall = React.useCallback(async (type: "AUDIO" | "VIDEO") => {
    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: sessionId, type }),
      })
      if (!res.ok) {
        throw new Error("Failed to initiate call")
      }
      const data = await res.json()
      const call = data.data.call
      
      setCallId(call.id)
      setCallType(type)
      setCallState("ringing_outgoing")

      const stream = await acquireStream(type)
      setupPeerConnection(stream, call.id, peerActorIdRef.current || "")
    } catch (err) {
      console.error("[initiateCall] failed", err)
      cleanupCall()
    }
  }, [sessionId, acquireStream, setupPeerConnection, cleanupCall])

  const acceptCall = React.useCallback(async () => {
    const currentCallId = callIdRef.current
    const currentPeerActorId = peerActorIdRef.current
    if (!currentCallId || !currentPeerActorId) return
    try {
      const res = await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/calls/${currentCallId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      })
      if (!res.ok) throw new Error("Failed to accept call")

      const stream = await acquireStream(callTypeRef.current || "AUDIO")
      setCallState("active")
      setupPeerConnection(stream, currentCallId, currentPeerActorId)
    } catch (err) {
      console.error("[acceptCall] failed", err)
      cleanupCall()
    }
  }, [acquireStream, setupPeerConnection, cleanupCall])

  const declineCall = React.useCallback(async () => {
    const currentCallId = callIdRef.current
    if (!currentCallId) return
    try {
      await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/calls/${currentCallId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DECLINE" }),
      })
    } catch (err) {
      console.error("[declineCall] failed", err)
    } finally {
      cleanupCall()
    }
  }, [cleanupCall])

  const endCall = React.useCallback(async () => {
    const currentCallId = callIdRef.current
    if (!currentCallId) return
    try {
      await apiRequest(`${env.NEXT_PUBLIC_API_URL}/api/calls/${currentCallId}/end`, {
        method: "POST",
      })
    } catch (err) {
      console.error("[endCall] failed", err)
    } finally {
      cleanupCall()
    }
  }, [cleanupCall])

  React.useEffect(() => {
    const handleCallIncoming = (payload: any) => {
      setCallId(payload.callId)
      setCallType(payload.type)
      setCallState("ringing_incoming")
    }

    const handleCallAccepted = async () => {
      const currentLocalStream = localStreamRef.current
      const currentCallId = callIdRef.current
      const currentPeerActorId = peerActorIdRef.current
      if (!currentLocalStream || !currentCallId || !currentPeerActorId) return
      setCallState("active")
      const pc = setupPeerConnection(currentLocalStream, currentCallId, currentPeerActorId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        wsGateway.send("webrtc:offer", {
          sessionId,
          callId: currentCallId,
          targetActorId: currentPeerActorId,
          offer,
        })
      } catch (err) {
        console.error("Failed to create offer", err)
      }
    }

    const handleWebRTCOffer = async (payload: any) => {
      const { offer, senderId, callId: incomingCallId } = payload
      const currentLocalStream = localStreamRef.current
      if (!currentLocalStream || !incomingCallId) return
      const pc = setupPeerConnection(currentLocalStream, incomingCallId, senderId)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        wsGateway.send("webrtc:answer", {
          sessionId,
          callId: incomingCallId,
          targetActorId: senderId,
          answer,
        })
      } catch (err) {
        console.error("Failed to handle offer", err)
      }
    }

    const handleWebRTCAnswer = async (payload: any) => {
      const { answer } = payload
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (err) {
          console.error("Failed to set remote answer", err)
        }
      }
    }

    const handleWebRTCIceCandidate = async (payload: any) => {
      const { candidate } = payload
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error("Failed to add ice candidate", err)
        }
      }
    }

    wsGateway.on("call:incoming", handleCallIncoming)
    wsGateway.on("call:accepted", handleCallAccepted)
    wsGateway.on("call:declined", cleanupCall)
    wsGateway.on("call:ended", cleanupCall)
    wsGateway.on("call:missed", cleanupCall)
    wsGateway.on("webrtc:offer", handleWebRTCOffer)
    wsGateway.on("webrtc:answer", handleWebRTCAnswer)
    wsGateway.on("webrtc:ice-candidate", handleWebRTCIceCandidate)

    return () => {
      wsGateway.off("call:incoming", handleCallIncoming)
      wsGateway.off("call:accepted", handleCallAccepted)
      wsGateway.off("call:declined", cleanupCall)
      wsGateway.off("call:ended", cleanupCall)
      wsGateway.off("call:missed", cleanupCall)
      wsGateway.off("webrtc:offer", handleWebRTCOffer)
      wsGateway.off("webrtc:answer", handleWebRTCAnswer)
      wsGateway.off("webrtc:ice-candidate", handleWebRTCIceCandidate)
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    }
  }, [sessionId, setupPeerConnection, cleanupCall, localStreamRef])

  return {
    callState,
    callType,
    callId,
    remoteStream,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    cleanupCall,
  }
}
