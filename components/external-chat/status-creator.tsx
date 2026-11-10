// components/external-chat/status-creator.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Image as ImageIcon, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import NextImage from "next/image";

interface StatusCreatorProps {
  onClose: () => void;
  onPost: (text: string | null, file: File | null, visibility: "public" | "contacts" | "private") => Promise<void> | void;
  roomId?: string;
  roomCode?: string;
}

function getPreferredVideoMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export default function StatusCreator({ onClose, onPost }: StatusCreatorProps) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [visibility, setVisibility] = useState<"public" | "contacts" | "private">("contacts");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const replacePreview = (nextFile: File) => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setErrorMessage(null);

    if (!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("video/")) {
      setErrorMessage("Please select an image or video file.");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMessage("File too large. Maximum status size is 50 MB.");
      return;
    }

    replacePreview(selectedFile);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErrorMessage("Camera recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      const mimeType = getPreferredVideoMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || mimeType || "video/webm";
        const ext = finalMime.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        if (blob.size > 0) {
          const videoFile = new File([blob], `status-${Date.now()}.${ext}`, { type: finalMime });
          replacePreview(videoFile);
        }
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      setErrorMessage("Could not access camera/microphone. Please check browser permissions.");
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !file) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onPost(text.trim() || null, file, visibility);
      onClose();
    } catch (error) {
      console.error("Failed to post status:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to post status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border/70 bg-[#FFFFFF] dark:bg-[#1F2C33] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Add Status</h3>
            <p className="text-xs text-muted-foreground">Visible for 24 hours</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-foreground hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942]">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {errorMessage && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {errorMessage}
          </div>
        )}

        {/* Media preview */}
        {preview && (
          <div className="relative mb-4 rounded-lg overflow-hidden bg-muted">
            {file?.type.startsWith("image/") ? (
              <NextImage
                src={preview}
                alt="Preview"
                width={400}
                height={400}
                unoptimized
                className="w-full h-auto max-h-64 object-contain"
              />
            ) : file?.type.startsWith("video/") ? (
              <video
                src={preview}
                className="w-full h-auto max-h-64 object-contain"
                controls
                autoPlay
                loop
                muted
              />
            ) : null}
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Media buttons */}
        <div className="mb-4 flex justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording}
            className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
          >
            <ImageIcon className="h-4 w-4 mr-1" /> Upload
          </Button>
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? "" : "border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"}
          >
            <Camera className="h-4 w-4 mr-1" />
            {isRecording ? `Recording ${recordingTime}s` : "Record"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Caption input */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a caption..."
          className="mb-4 min-h-[80px] bg-[#F0F2F5] dark:bg-[#2A3942] border-[#E9EDEF] dark:border-[#2A3942] text-foreground placeholder:text-muted-foreground"
          maxLength={500}
        />

        {/* Privacy selector */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block text-foreground">Who can see this status?</label>
          <div className="flex gap-2">
            {[
              { value: "public", label: "Everyone" },
              { value: "contacts", label: "My Contacts" },
              { value: "private", label: "Only Me" },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setVisibility(option.value as typeof visibility)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  visibility === option.value
                    ? "bg-[#25D366] text-white"
                    : "bg-[#F0F2F5] dark:bg-[#2A3942] text-foreground hover:bg-[#25D366]/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={(!text.trim() && !file) || isSubmitting || isRecording}
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Post Status
        </Button>
      </div>
    </div>
  );
}