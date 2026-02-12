"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Film,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteParticipant } from "livekit-client";

interface ChatMessage {
  id: string;
  from: string;
  message: string;
  timestamp: number;
  type: "text" | "file" | "video" | "image";
  fileData?: {
    name: string;
    size: number;
    url: string;
    mimeType: string;
  };
}

interface ChatPanelProps {
  className?: string;
  onNewMessage?: () => void;
}

export default function ChatPanel({ className, onNewMessage }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  /* -------------------- HELPERS -------------------- */

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const uploadFileToServer = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/meeting/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json(); // { name, size, url, mimeType }
  };

  /* -------------------- RECEIVE DATA -------------------- */

  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant
    ) => {
      try {
        const data = JSON.parse(decoder.decode(payload));

        if (data.type === "chat") {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              from: participant?.identity || "Participant",
              message: data.message,
              timestamp: data.timestamp,
              type: data.messageType || "text",
              fileData: data.fileData,
            },
          ]);

          if (participant?.identity !== localParticipant?.identity) {
            onNewMessage?.();
          }
        }
      } catch (err) {
        console.error("Data parse error:", err);
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => room.off("dataReceived", handleDataReceived);
  }, [room]);

  /* -------------------- SEND TEXT -------------------- */

  const sendMessage = async () => {
    if (!localParticipant) return;

    if (selectedFile) {
      await sendFileMessage();
      return;
    }

    if (!message.trim()) return;

    const timestamp = Date.now();

    const payload = {
      type: "chat",
      messageType: "text",
      message: message.trim(),
      timestamp,
    };

    await localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(payload)),
      { reliable: true }
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `${timestamp}-local`,
        from: localParticipant.identity,
        message: payload.message,
        timestamp,
        type: "text",
      },
    ]);

    setMessage("");
  };

  /* -------------------- SEND FILE -------------------- */

  const sendFileMessage = async () => {
    if (!selectedFile || !localParticipant || !room) return;

    try {
      setUploading(true);
      setUploadProgress(30);

      const uploaded = await uploadFileToServer(selectedFile);
      setUploadProgress(70);

      const fileType: "image" | "video" | "file" =
        selectedFile.type.startsWith("image/")
          ? "image"
          : selectedFile.type.startsWith("video/")
          ? "video"
          : "file";

      const timestamp = Date.now();

      const payload = {
        type: "chat",
        messageType: fileType,
        message: message || `Shared ${selectedFile.name}`,
        timestamp,
        fileData: {
          name: uploaded.name,
          size: uploaded.size,
          url: uploaded.url,
          mimeType: uploaded.mimeType,
        },
      };

      await localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(payload)),
        { reliable: true }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `${timestamp}-local`,
          from: localParticipant.identity,
          message: payload.message,
          timestamp,
          type: fileType,
          fileData: payload.fileData,
        },
      ]);

      setUploadProgress(100);
      setMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert("File upload failed");
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /* -------------------- UI HELPERS -------------------- */

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }

    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const downloadFile = (file: ChatMessage["fileData"]) => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  const getFileIcon = (type: string) =>
    type === "video" ? <Film /> : type === "image" ? <ImageIcon /> : <FileText />;

  /* -------------------- RENDER -------------------- */

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {messages.map((msg) => {
              const isOwn = msg.from === localParticipant?.identity;
              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}
                >
                  <div className="text-xs opacity-60">
                    {isOwn ? "You" : msg.from}
                  </div>

                  <div
                    className={cn(
                      "rounded-lg p-3 max-w-[80%]",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {msg.type === "text" && <p>{msg.message}</p>}

                    {msg.fileData && (
                      <div className="space-y-2">
                        {msg.type === "image" && (
                          <img
                            src={msg.fileData.url}
                            className="rounded max-h-64"
                          />
                        )}

                        {msg.type === "video" && (
                          <video
                            src={msg.fileData.url}
                            controls
                            className="rounded max-h-64"
                          />
                        )}

                        {msg.type === "file" && (
                          <div className="flex items-center gap-2">
                            {getFileIcon(msg.type)}
                            <span className="truncate">
                              {msg.fileData.name}
                            </span>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(msg.fileData)}
                        >
                          <Download className="h-4 w-4 mr-2" /> Download
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs opacity-60">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* INPUT */}
        <div className="pt-3 flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip />
          </Button>

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message…"
            disabled={uploading}
          />

          <Button onClick={sendMessage} disabled={uploading}>
            <Send />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
