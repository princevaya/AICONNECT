// components/external-chat/direct-call-modal.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Phone, Video, Mic, MicOff, VideoOff, Loader2, Check, AlertCircle } from "lucide-react";
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
  const [mediaPermissionError, setMediaPermissionError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const statusRef = useRef(status);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Setup and verify microphone / camera permissions before or during call setup
  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    const setupMedia = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (active && mountedRef.current) {
          setMediaPermissionError("Media devices require a secure context (HTTPS or localhost).");
        }
        return;
      }
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video",
          audio: true,
        });
        if (!active || !mountedRef.current) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setMediaPermissionError(null);
        if (videoRef.current && callType === "video") {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        if (!active || !mountedRef.current) return;
        const name = err && typeof err === "object" && "name" in err ? String((err as { name?: string }).name || "") : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setMediaPermissionError(
            callType === "video"
              ? "Camera or microphone permission was denied. Please allow access in browser settings."
              : "Microphone permission was denied. Please allow mic access in browser settings."
          );
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setMediaPermissionError(
            callType === "video"
              ? "No camera or microphone found. Check connected devices."
              : "No microphone found. Check connected audio devices."
          );
        } else {
          setMediaPermissionError("Could not access microphone/camera.");
        }
        if (callType === "video") setVideoEnabled(false);
      }
    };

    void setupMedia();

    return () => {
      active = false;
      mountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      stopTracks();
    };
  }, [callType, stopTracks]);

  useEffect(() => {
    if (videoRef.current && stream && callType === "video") {
      videoRef.current.srcObject = stream;
    }
  }, [stream, callType]);

  const endCallSession = useCallback(async (id: string | null) => {
    if (!id) return;
    await fetch(`/api/external-chat/calls/${encodeURIComponent(id)}/end`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const startCall = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    setErrorMsg(null);
    setStatus("initiating");

    try {
      const participantIds = targetUser?.id ? [targetUser.id] : [];
      const response = await fetch("/api/external-chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: roomCode || undefined,
          targetUserId: targetUser?.id || undefined,
          type: callType,
          participantUserIds: participantIds,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.call?.id) {
        throw new Error(data.error || "Failed to start call");
      }

      if (!mountedRef.current) return;
      callIdRef.current = data.call.id;
      setCallId(data.call.id);
      setStatus("ringing");

      // Poll for call acceptance/decline/end
      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const statusRes = await fetch(`/api/external-chat/calls/${encodeURIComponent(data.call.id)}`, {
            cache: "no-store",
          });
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();
          const remoteStatus = statusData?.call?.status;

          if (remoteStatus === "active") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            stopTracks();
            setStatus("connected");

            const params = new URLSearchParams({
              video: callType === "video" && videoEnabled ? "1" : "0",
              audio: audioEnabled ? "1" : "0",
            });
            router.push(`/external-chat/calls/${encodeURIComponent(data.call.id)}?${params.toString()}`);
            onClose();
          } else if (remoteStatus === "declined") {
            setStatus("rejected");
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            stopTracks();
            setTimeout(() => {
              if (!mountedRef.current) return;
              onCallEnded?.();
              onClose();
            }, 1800);
          } else if (remoteStatus === "ended") {
            setStatus("ended");
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            stopTracks();
            setTimeout(() => {
              if (!mountedRef.current) return;
              onCallEnded?.();
              onClose();
            }, 1800);
          } else if (remoteStatus === "missed") {
            setStatus("missed");
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            stopTracks();
            setTimeout(() => {
              if (!mountedRef.current) return;
              onCallEnded?.();
              onClose();
            }, 1800);
          }
        } catch {
          // Ignore transient poll errors
        }
      }, 1500);

      // Ring timeout after 60 seconds
      timeoutRef.current = setTimeout(() => {
        if (statusRef.current === "ringing" && mountedRef.current) {
          setStatus("missed");
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          void endCallSession(callIdRef.current);
          stopTracks();
          setTimeout(() => {
            if (!mountedRef.current) return;
            onCallEnded?.();
            onClose();
          }, 1800);
        }
      }, 60_000);
    } catch (err) {
      if (mountedRef.current) {
        setErrorMsg(err instanceof Error ? err.message : "Failed to start call");
        setStatus("error");
      }
    }
  }, [audioEnabled, callType, endCallSession, onCallEnded, onClose, roomCode, router, stopTracks, targetUser, videoEnabled]);

  const toggleVideo = () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (!streamRef.current) return;
    const audioTrack = streamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const cancelCall = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    stopTracks();
    await endCallSession(callIdRef.current || callId);
    onCallEnded?.();
    onClose();
  };

  const statusMessages = {
    idle: "Ready to call",
    initiating: "Starting call...",
    ringing: `Calling ${targetUser?.name || targetUser?.email || "Participant"}...`,
    connecting: "Connecting...",
    connected: "Connected!",
    rejected: "Call declined",
    missed: "No answer (missed)",
    ended: "Call ended",
    error: errorMsg || "Call failed",
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4">
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
            {targetUser?.name || targetUser?.email || "Conversation Call"}
          </p>
        </div>

        {mediaPermissionError ? (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
            {mediaPermissionError}
          </div>
        ) : null}

        {callType === "video" && stream && (status === "idle" || status === "initiating" || status === "ringing") && (
          <div className="mb-4">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
            </div>
            <div className="mt-3 flex justify-center gap-3">
              <Button
                type="button"
                variant={videoEnabled ? "default" : "outline"}
                size="icon"
                onClick={toggleVideo}
                className={`rounded-full h-10 w-10 ${videoEnabled ? "bg-[#25D366] hover:bg-[#128C7E] text-white" : ""}`}
                title={videoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant={audioEnabled ? "default" : "outline"}
                size="icon"
                onClick={toggleAudio}
                className={`rounded-full h-10 w-10 ${audioEnabled ? "bg-[#25D366] hover:bg-[#128C7E] text-white" : ""}`}
                title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {callType === "audio" && stream && (status === "idle" || status === "initiating" || status === "ringing") && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant={audioEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleAudio}
              className={`rounded-full ${audioEnabled ? "bg-[#25D366] hover:bg-[#128C7E] text-white" : ""}`}
            >
              {audioEnabled ? <Mic className="mr-1.5 h-4 w-4" /> : <MicOff className="mr-1.5 h-4 w-4" />}
              {audioEnabled ? "Mic Ready" : "Mic Muted"}
            </Button>
          </div>
        )}

        {status === "idle" && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => void cancelCall()}>
              Cancel
            </Button>
            <Button type="button" className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={() => void startCall()}>
              <Phone className="mr-2 h-4 w-4" /> Start Call
            </Button>
          </div>
        )}

        {(status === "initiating" || status === "ringing") && (
          <Button type="button" variant="destructive" className="w-full" onClick={() => void cancelCall()}>
            End / Cancel Call
          </Button>
        )}

        {(status === "rejected" || status === "missed" || status === "error" || status === "ended") && (
          <Button
            type="button"
            variant="outline"
            className="w-full text-foreground"
            onClick={() => {
              stopTracks();
              onClose();
            }}
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
