// components/external-chat/call-selector-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Search, Phone, Video, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NextImage from "next/image";

type UserRow = { id: string; clerkId: string; name: string | null; email: string | null; imageUrl?: string | null };

interface CallSelectorModalProps {
  onClose: () => void;
  onStartCall: (targetUser: UserRow | null, type: "audio" | "video") => void;
  currentRoomType: "direct" | "group" | "channel";
  currentRoomPeer: UserRow | null;
  roomMembers?: Array<{ user: UserRow }>;
}

export default function CallSelectorModal({
  onClose,
  onStartCall,
  currentRoomType,
  currentRoomPeer,
  roomMembers,
}: CallSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [callType, setCallType] = useState<"audio" | "video">("audio");

  // For direct chat, pre-select the peer
  useEffect(() => {
    if (currentRoomType === "direct" && currentRoomPeer) {
      setSelectedUser(currentRoomPeer);
    }
  }, [currentRoomType, currentRoomPeer]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/external-chat/users?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (error) {
        console.error("Failed to search users:", error);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartCall = () => {
    if (currentRoomType === "group" && !selectedUser) {
      alert("Please select a user to call");
      return;
    }
    onStartCall(selectedUser, callType);
    onClose();
  };

  const getAvailableUsers = () => {
    if (currentRoomType === "direct" && currentRoomPeer) {
      return [currentRoomPeer];
    }
    if (currentRoomType === "group" && roomMembers) {
      return roomMembers.map(m => m.user);
    }
    return [];
  };

  const availableUsers = getAvailableUsers();
  const showSearch = currentRoomType === "group";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Start a Call</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Call Type Selection */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setCallType("audio")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              callType === "audio"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Phone className="h-4 w-4 inline mr-2" />
            Audio Call
          </button>
          <button
            onClick={() => setCallType("video")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              callType === "video"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Video className="h-4 w-4 inline mr-2" />
            Video Call
          </button>
        </div>

        {/* User Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Calling</label>
          
          {currentRoomType === "direct" && currentRoomPeer && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-muted/25">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center">
                {currentRoomPeer.imageUrl ? (
                  <NextImage
                    src={currentRoomPeer.imageUrl}
                    alt={currentRoomPeer.name || "User"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">{currentRoomPeer.name || currentRoomPeer.email || "User"}</p>
                <p className="text-xs text-muted-foreground">Direct chat</p>
              </div>
            </div>
          )}

          {currentRoomType === "group" && (
            <>
              {!selectedUser ? (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search users to call..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-1">
                    {searching && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!searching && searchQuery.trim() && searchResults.length === 0 && (
                      <p className="text-center py-4 text-sm text-muted-foreground">No users found</p>
                    )}
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center">
                          {user.imageUrl ? (
                            <NextImage
                              src={user.imageUrl}
                              alt={user.name || "User"}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name || user.email || "User"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-muted/25">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center">
                      {selectedUser.imageUrl ? (
                        <NextImage
                          src={selectedUser.imageUrl}
                          alt={selectedUser.name || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedUser.name || selectedUser.email || "User"}</p>
                      <p className="text-xs text-muted-foreground">Selected contact</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
                    Change
                  </Button>
                </div>
              )}
            </>
          )}

          {currentRoomType === "channel" && (
            <div className="p-3 rounded-lg border border-border/70 bg-muted/25">
              <p className="text-sm text-muted-foreground">Channel calls are not supported yet</p>
            </div>
          )}
        </div>

        {/* Start Call Button */}
        <Button
          onClick={handleStartCall}
          disabled={(currentRoomType === "group" && !selectedUser) || currentRoomType === "channel"}
          className="w-full"
        >
          <Phone className="h-4 w-4 mr-2" />
          Start {callType === "audio" ? "Audio" : "Video"} Call
        </Button>
      </div>
    </div>
  );
}