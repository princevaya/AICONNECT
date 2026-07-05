// components/external-chat/direct-call-modal.tsx - COMPLETE FIXED VERSION

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Phone, Video, X, Mic, MicOff, VideoOff, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectCallModalProps {
  roomCode: string;
  callType: "audio" | "video";
  targetUser: { id: string; name: string | null; email: string | null } | null;
  onClose: () => void;
  onCallEnded?: () => void;
}

export default function DirectCallModal({ roomCode, callType, targetUser, onClose, onCallEnded }: DirectCallModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "initiating" | "ringing" | "connecting" | "connected" | "rejected" | "missed" | "ended" | "error">("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(callType === "video");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Setup local media preview - only for video calls
  useEffect(() => {
    if (callType !== "video") return;
    
    const setupMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled,
        });
        if (mountedRef.current) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (err) {
        console.error("Failed to get media:", err);
        if (mountedRef.current) setVideoEnabled(false);
      }
    };
    
    setupMedia();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [callType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCall = useCallback(async () => {
    if (status !== "idle") return;
    
    setStatus("initiating");
    
    try {
      const participantIds = targetUser ? [targetUser.id] : [];
      const response = await fetch("/api/external-chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          type: callType,
          participantUserIds: participantIds,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start call");
      
      if (!mountedRef.current) return;
      setCallId(data.call.id);
      setStatus("ringing");
      
      // Poll for call status
      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const statusRes = await fetch(`/api/external-chat/calls/${data.call.id}`);
          const statusData = await statusRes.json();
          
          if (statusData.call.status === "active") {
            // Call accepted
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            
            setStatus("connected");
            
            const params = new URLSearchParams({
              name: targetUser?.name || targetUser?.email || "User",
              video: callType === "video" ? "1" : "0",
              audio: "1",
              direct: "1",
            });
            router.push(`/meeting/${statusData.call.livekitRoomName}?${params.toString()}`);
            onClose();
          } else if (statusData.call.status === "declined") {
            setStatus("rejected");
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setTimeout(() => {
              if (onCallEnded) onCallEnded();
              onClose();
            }, 2000);
          } else if (statusData.call.status === "ended") {
            setStatus("ended");
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setTimeout(() => {
              if (onCallEnded) onCallEnded();
              onClose();
            }, 2000);
          } else if (statusData.call.status === "missed") {
            setStatus("missed");
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setTimeout(() => onClose(), 2000);
          }
        } catch {
          // Ignore poll errors
        }
      }, 1500);
      
      // Timeout after 60 seconds
      const currentStatus = "ringing";
      timeoutRef.current = setTimeout(() => {
        if (currentStatus === "ringing" && mountedRef.current) {
          setStatus("missed");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => onClose(), 2000);
        }
      }, 60000);
      
    } catch (err) {
      if (mountedRef.current) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to start call");
        setStatus("error");
        setTimeout(() => onClose(), 3000);
      }
    }
  }, [roomCode, callType, targetUser, router, onClose, stream, status, onCallEnded]);

  const toggleVideo = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const cancelCall = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  const statusMessages = {
    idle: "Ready to call",
    initiating: "Starting call...",
    ringing: `Calling ${targetUser?.name || targetUser?.email || "User"}...`,
    connecting: "Connecting...",
    connected: "Connected!",
    rejected: "Call declined",
    missed: "Call missed",
    ended: "Call ended",
    error: errorMsg || "Call failed",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-[#FFFFFF] dark:bg-[#1F2C33] p-6 backdrop-blur-xl shadow-2xl">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/20">
            {status === "initiating" || status === "ringing" ? (
              <Loader2 className="h-10 w-10 animate-spin text-[#25D366]" />
            ) : status === "rejected" || status === "missed" || status === "error" || status === "ended" ? (
              <AlertCircle className="h-10 w-10 text-red-500" />
            ) : status === "connected" ? (
              <Check className="h-10 w-10 text-[#25D366]" />
            ) : callType === "video" ? (
              <Video className="h-10 w-10 text-foreground" />
            ) : (
              <Phone className="h-10 w-10 text-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground">{statusMessages[status]}</h3>
          <p className="text-sm text-muted-foreground">
            {targetUser?.name || targetUser?.email || "User"}
          </p>
        </div>

        {callType === "video" && stream && (status === "initiating" || status === "ringing") && (
          <div className="mb-4">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover mirror"
              />
            </div>
            <div className="mt-3 flex justify-center gap-3">
              <Button
                variant={videoEnabled ? "default" : "outline"}
                size="icon"
                onClick={toggleVideo}
                className={`rounded-full h-10 w-10 ${videoEnabled ? "bg-[#25D366] hover:bg-[#128C7E] text-white" : ""}`}
              >
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                variant={audioEnabled ? "default" : "outline"}
                size="icon"
                onClick={toggleAudio}
                className={`rounded-full h-10 w-10 ${audioEnabled ? "bg-[#25D366] hover:bg-[#128C7E] text-white" : ""}`}
              >
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {status === "idle" && (
          <Button className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={startCall}>
            <Phone className="mr-2 h-4 w-4" /> Start Call
          </Button>
        )}

        {(status === "initiating" || status === "ringing") && (
          <Button variant="destructive" className="w-full" onClick={cancelCall}>
            Cancel
          </Button>
        )}

        {(status === "rejected" || status === "missed" || status === "error" || status === "ended") && (
          <Button variant="outline" className="w-full text-foreground" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <style jsx global>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}