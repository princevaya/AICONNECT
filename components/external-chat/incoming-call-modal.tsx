// components/external-chat/incoming-call-modal.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Phone, Video, PhoneOff, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import NextImage from "next/image";

interface IncomingCallModalProps {
  call: {
    id: string;
    type: "audio" | "video";
    livekitRoomName: string;
    starter: {
      id: string;
      name: string | null;
      email: string | null;
      imageUrl?: string | null;
    };
    roomCode: string;
  };
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ call, onClose, onAccept, onReject }: IncomingCallModalProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [modalClosed, setModalClosed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  // Play ringtone
  useEffect(() => {
    if (modalClosed) return;

    const audio = new Audio("/sounds/call-ringtone.mp3");
    audio.loop = true;
    audio.volume = isMuted ? 0 : 0.5;
    audio.play().catch(() => undefined);
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [modalClosed, isMuted]);

  // Check if call is still ringing
  useEffect(() => {
    mountedRef.current = true;
    if (modalClosed) return;

    const interval = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data?.call?.status !== "ringing") {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setModalClosed(true);
          onClose();
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [call.id, modalClosed, onClose]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      const response = await fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!response.ok) throw new Error("Failed to accept call");

      await fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}/join`, {
        method: "POST",
      });

      onAccept();

      const params = new URLSearchParams({
        video: call.type === "video" ? "1" : "0",
        audio: "1",
      });
      router.push(`/external-chat/calls/${encodeURIComponent(call.id)}?${params.toString()}`);
    } catch (error) {
      console.error("Failed to accept call:", error);
    } finally {
      setIsAccepting(false);
      setModalClosed(true);
      onClose();
    }
  }, [call, router, onAccept, onClose]);

  const handleReject = useCallback(async () => {
    setIsRejecting(true);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      await fetch(`/api/external-chat/calls/${encodeURIComponent(call.id)}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      onReject();
    } catch (error) {
      console.error("Failed to reject call:", error);
    } finally {
      setIsRejecting(false);
      setModalClosed(true);
      onClose();
    }
  }, [call, onReject, onClose]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const isVideoCall = call.type === "video";

  if (modalClosed) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-[#FFFFFF] dark:bg-[#1F2C33] p-6 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full overflow-hidden bg-[#25D366]/20 flex items-center justify-center animate-pulse">
            {call.starter.imageUrl ? (
              <NextImage
                src={call.starter.imageUrl}
                alt={call.starter.name || "Caller"}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl font-semibold text-[#25D366]">
                {(call.starter.name?.[0] || call.starter.email?.[0] || "U").toUpperCase()}
              </div>
            )}
          </div>

          <h3 className="text-xl font-semibold text-foreground">
            {call.starter.name || call.starter.email || "Someone"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isVideoCall ? "Incoming Video Call" : "Incoming Audio Call"}
          </p>
        </div>

        <div className="flex justify-center gap-6">
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="rounded-full h-14 w-14 p-0"
            onClick={() => void handleReject()}
            disabled={isAccepting || isRejecting}
            aria-label="Decline call"
          >
            {isRejecting ? <Loader2 className="h-6 w-6 animate-spin" /> : <PhoneOff className="h-6 w-6" />}
          </Button>

          <Button
            type="button"
            variant="default"
            size="lg"
            className="rounded-full h-14 w-14 p-0 bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={() => void handleAccept()}
            disabled={isAccepting || isRejecting}
            aria-label="Accept call"
          >
            {isAccepting ? <Loader2 className="h-6 w-6 animate-spin" /> : isVideoCall ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14 p-0 border-border text-foreground hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942]"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute ringtone" : "Mute ringtone"}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {isAccepting ? "Connecting..." : isRejecting ? "Declining..." : "Answer or decline the call"}
        </p>
      </div>
    </div>
  );
}
