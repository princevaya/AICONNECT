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
  const encoder = useRef(new TextEncoder());
  const fileChunksRef = useRef<
    Map<string, { chunks: string[]; totalChunks: number; fileData: any }>
  >(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for incoming messages via data channel
  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant
    ) => {
      try {
        const data = JSON.parse(decoder.decode(payload));

        // Handle file chunks
        if (data.type === "file-chunk") {
          const { fileId, chunkIndex, chunk, totalChunks, fileData } = data;

          if (!fileChunksRef.current.has(fileId)) {
            fileChunksRef.current.set(fileId, {
              chunks: [],
              totalChunks,
              fileData,
            });
          }

          const fileTransfer = fileChunksRef.current.get(fileId)!;
          fileTransfer.chunks[chunkIndex] = chunk;

          // Check if all chunks received
          if (fileTransfer.chunks.filter(Boolean).length === totalChunks) {
            const completeBase64 = fileTransfer.chunks.join("");
            const dataPrefix = `data:${fileTransfer.fileData.fileInfo.mimeType};base64,`;

            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${Math.random()}`,
                from: participant?.identity || "Participant",
                message: fileTransfer.fileData.message,
                timestamp: fileTransfer.fileData.timestamp,
                type: fileTransfer.fileData.messageType || "text",
                fileData: {
                  ...fileTransfer.fileData.fileInfo,
                  url: dataPrefix + completeBase64,
                },
              },
            ]);

            // Notify of new message from other participants
            if (participant?.identity !== localParticipant?.identity) {
              onNewMessage?.();
            }

            fileChunksRef.current.delete(fileId);
          }
          return;
        }

        // Handle regular chat messages
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

          // Notify of new message from other participants
          if (participant?.identity !== localParticipant?.identity) {
            onNewMessage?.();
          }
        }
      } catch (error) {
        console.error("Error parsing data:", error);
      }
    };

    room.on("dataReceived", handleDataReceived);

    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room]);

  const sendMessage = async () => {
    if (!localParticipant) return;

    if (selectedFile) {
      await sendFileMessage();
      return;
    }

    if (!message.trim()) return;

    const timestamp = Date.now();
    const chatData = {
      type: "chat",
      messageType: "text",
      message: message.trim(),
      timestamp,
    };

    const data = encoder.current.encode(JSON.stringify(chatData));
    await localParticipant.publishData(data, { reliable: true });

    setMessages((prev) => [
      ...prev,
      {
        id: `${timestamp}-local`,
        from: localParticipant.identity,
        message: message.trim(),
        timestamp,
        type: "text",
      },
    ]);

    setMessage("");
  };

  const sendFileMessage = async () => {
    if (!selectedFile || !localParticipant) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        const fileType: "video" | "image" | "file" =
          selectedFile.type.startsWith("video/")
            ? "video"
            : selectedFile.type.startsWith("image/")
            ? "image"
            : "file";

        const timestamp = Date.now();

        setUploading(true);
        setUploadProgress(0);

        // Split large files into chunks of 200KB
        const CHUNK_SIZE = 200000; // 200KB per chunk
        const base64Data = base64.split(",")[1] || base64; // Remove data:image/... prefix
        const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
        const fileId = `${timestamp}-${Math.random()}`;

        if (totalChunks > 1) {
          // Send file in chunks
          for (let i = 0; i < totalChunks; i++) {
            const chunk = base64Data.slice(
              i * CHUNK_SIZE,
              (i + 1) * CHUNK_SIZE
            );

            const chunkData = {
              type: "file-chunk",
              fileId,
              chunkIndex: i,
              chunk,
              totalChunks,
              fileData: {
                message: message.trim() || `Shared ${selectedFile.name}`,
                timestamp,
                messageType: fileType,
                fileInfo: {
                  name: selectedFile.name,
                  size: selectedFile.size,
                  mimeType: selectedFile.type,
                },
              },
            };

            const data = encoder.current.encode(JSON.stringify(chunkData));
            await localParticipant.publishData(data, { reliable: true });

            // Update progress
            setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));

            // Small delay between chunks to avoid overwhelming the channel
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          // Add to local messages after all chunks sent
          setMessages((prev) => [
            ...prev,
            {
              id: `${timestamp}-local`,
              from: localParticipant.identity,
              message: message.trim() || `Shared ${selectedFile.name}`,
              timestamp,
              type: fileType,
              fileData: {
                name: selectedFile.name,
                size: selectedFile.size,
                url: base64,
                mimeType: selectedFile.type,
              },
            },
          ]);

          setUploading(false);
          setUploadProgress(0);
        } else {
          // Send small file as single message
          const chatData = {
            type: "chat",
            messageType: fileType,
            message: message.trim() || `Shared ${selectedFile.name}`,
            timestamp,
            fileData: {
              name: selectedFile.name,
              size: selectedFile.size,
              url: base64,
              mimeType: selectedFile.type,
            },
          };

          const data = encoder.current.encode(JSON.stringify(chatData));
          await localParticipant.publishData(data, { reliable: true });

          setMessages((prev) => [
            ...prev,
            {
              id: `${timestamp}-local`,
              from: localParticipant.identity,
              message: chatData.message,
              timestamp,
              type: fileType,
              fileData: chatData.fileData,
            },
          ]);
        }

        setMessage("");
        setSelectedFile(null);
        setUploading(false);
        setUploadProgress(0);
        // Reset file input to allow selecting the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error sending file:", error);
      alert("Failed to send file");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow files up to 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Maximum size is 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const downloadFile = (fileData: ChatMessage["fileData"]) => {
    if (!fileData) return;
    const link = document.createElement("a");
    link.href = fileData.url;
    link.download = fileData.name;
    link.click();
  };

  const getFileIcon = (type: string) => {
    if (type === "video") return <Film className="h-5 w-5" />;
    if (type === "image") return <ImageIcon className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1 h-0">
          <div className="space-y-4 pr-4">
            {messages.map((msg) => {
              const isOwn = msg.from === localParticipant?.identity;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    isOwn ? "items-end" : "items-start"
                  )}
                >
                  <div className="text-xs text-muted-foreground px-1">
                    {isOwn ? "You" : msg.from}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {msg.type === "text" ? (
                      <p className="text-sm wrap-break-word">{msg.message}</p>
                    ) : msg.type === "image" && msg.fileData ? (
                      <div className="space-y-2">
                        <img
                          src={msg.fileData.url}
                          alt={msg.fileData.name}
                          className="rounded max-w-full h-auto max-h-64 object-contain"
                        />
                        <p className="text-xs opacity-90">{msg.message}</p>
                        <Button
                          size="sm"
                          variant={isOwn ? "secondary" : "outline"}
                          className="w-full mt-2"
                          onClick={() => downloadFile(msg.fileData)}
                        >
                          <Download className="h-3 w-3 mr-2" />
                          Download
                        </Button>
                      </div>
                    ) : msg.type === "video" && msg.fileData ? (
                      <div className="space-y-2">
                        <video
                          src={msg.fileData.url}
                          controls
                          className="rounded max-w-full h-auto max-h-64"
                        />
                        <p className="text-xs opacity-90">{msg.message}</p>
                        <Button
                          size="sm"
                          variant={isOwn ? "secondary" : "outline"}
                          className="w-full mt-2"
                          onClick={() => downloadFile(msg.fileData)}
                        >
                          <Download className="h-3 w-3 mr-2" />
                          Download
                        </Button>
                      </div>
                    ) : msg.fileData ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                          {getFileIcon(msg.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {msg.fileData.name}
                            </p>
                            <p className="text-xs opacity-70">
                              {formatFileSize(msg.fileData.size)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs opacity-90">{msg.message}</p>
                        <Button
                          size="sm"
                          variant={isOwn ? "secondary" : "outline"}
                          className="w-full mt-2"
                          onClick={() => downloadFile(msg.fileData)}
                        >
                          <Download className="h-3 w-3 mr-2" />
                          Download
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground px-1">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="pt-4 space-y-2">
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              ) : selectedFile.type.startsWith("video/") ? (
                <Film className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={removeFile}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {uploading && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-10 p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
              placeholder={
                selectedFile ? "Add a message..." : "Type a message..."
              }
              className="flex-1"
              disabled={uploading}
            />
            <Button
              size="sm"
              className="h-10 px-4"
              onClick={sendMessage}
              disabled={(!message.trim() && !selectedFile) || uploading}
            >
              {uploading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
