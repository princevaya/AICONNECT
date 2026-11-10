// components/external-chat/call-selector-modal.tsx
"use client";

import { useState, useMemo } from "react";
import { X, Search, Phone, Video, User } from "lucide-react";
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
  currentUserId?: string | null;
  connectedPeers?: UserRow[];
}

export default function CallSelectorModal({
  onClose,
  onStartCall,
  currentRoomType,
  currentRoomPeer,
  roomMembers = [],
  currentUserId,
  connectedPeers = [],
}: CallSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(() =>
    currentRoomType === "direct" && currentRoomPeer ? currentRoomPeer : null
  );
  const [callType, setCallType] = useState<"audio" | "video">("audio");

  const selectableUsers = useMemo(() => {
    if (currentRoomType === "direct" && currentRoomPeer) {
      return [currentRoomPeer];
    }
    const members = roomMembers
      .map((m) => m.user)
      .filter((u) => !currentUserId || u.id !== currentUserId);
    const base = members.length > 0 ? members : connectedPeers;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [connectedPeers, currentRoomPeer, currentRoomType, currentUserId, roomMembers, searchQuery]);

  const handleStartCall = () => {
    if (currentRoomType === "channel") return;
    if (currentRoomType === "direct") {
      if (!selectedUser && !currentRoomPeer) return;
      onStartCall(selectedUser || currentRoomPeer, callType);
      onClose();
      return;
    }
    if (!selectedUser) return;
    onStartCall(selectedUser, callType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[115] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-[#FFFFFF] dark:bg-[#1F2C33] p-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Start a Call</h3>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-foreground hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942]">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Call Type Selection */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setCallType("audio")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              callType === "audio"
                ? "bg-[#25D366] text-white"
                : "bg-[#F0F2F5] dark:bg-[#2A3942] text-foreground hover:bg-[#25D366]/10"
            }`}
          >
            <Phone className="h-4 w-4 inline mr-2" />
            Audio Call
          </button>
          <button
            type="button"
            onClick={() => setCallType("video")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              callType === "video"
                ? "bg-[#25D366] text-white"
                : "bg-[#F0F2F5] dark:bg-[#2A3942] text-foreground hover:bg-[#25D366]/10"
            }`}
          >
            <Video className="h-4 w-4 inline mr-2" />
            Video Call
          </button>
        </div>

        {/* User Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block text-foreground">Calling</label>

          {currentRoomType === "direct" && currentRoomPeer && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-[#F0F2F5] dark:bg-[#2A3942]">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-[#25D366]/15 flex items-center justify-center shrink-0">
                {currentRoomPeer.imageUrl ? (
                  <NextImage
                    src={currentRoomPeer.imageUrl}
                    alt={currentRoomPeer.name || "User"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="h-5 w-5 text-[#25D366]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{currentRoomPeer.name || currentRoomPeer.email || "User"}</p>
                <p className="text-xs text-muted-foreground">Direct 1-on-1 call</p>
              </div>
            </div>
          )}

          {currentRoomType === "direct" && !currentRoomPeer && (
            <div className="p-3 rounded-lg border border-border/70 bg-[#F0F2F5] dark:bg-[#2A3942]">
              <p className="text-sm text-muted-foreground">Select an active conversation first to start a direct call.</p>
            </div>
          )}

          {currentRoomType === "group" && (
            <>
              {!selectedUser ? (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 bg-[#F0F2F5] dark:bg-[#2A3942] border-[#E9EDEF] dark:border-[#2A3942] text-foreground placeholder:text-muted-foreground"
                      placeholder="Filter group members or connections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-1 bg-[#FFFFFF] dark:bg-[#1F2C33]">
                    {selectableUsers.length === 0 && (
                      <p className="text-center py-4 text-sm text-muted-foreground">No eligible members found</p>
                    )}
                    {selectableUsers.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942] transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-[#25D366]/15 flex items-center justify-center shrink-0">
                          {user.imageUrl ? (
                            <NextImage
                              src={user.imageUrl}
                              alt={user.name || "User"}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <User className="h-4 w-4 text-[#25D366]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{user.name || user.email || "User"}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email || "Member"}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/70 bg-[#F0F2F5] dark:bg-[#2A3942]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-[#25D366]/15 flex items-center justify-center shrink-0">
                      {selectedUser.imageUrl ? (
                        <NextImage
                          src={selectedUser.imageUrl}
                          alt={selectedUser.name || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <User className="h-5 w-5 text-[#25D366]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{selectedUser.name || selectedUser.email || "User"}</p>
                      <p className="text-xs text-muted-foreground">Selected participant</p>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedUser(null)} className="text-[#25D366] hover:text-[#128C7E]">
                    Change
                  </Button>
                </div>
              )}
            </>
          )}

          {currentRoomType === "channel" && (
            <div className="p-3 rounded-lg border border-border/70 bg-[#F0F2F5] dark:bg-[#2A3942]">
              <p className="text-sm text-muted-foreground">Channel calls are not supported yet</p>
            </div>
          )}
        </div>

        {/* Start Call Button */}
        <Button
          type="button"
          onClick={handleStartCall}
          disabled={
            (currentRoomType === "direct" && !currentRoomPeer) ||
            (currentRoomType === "group" && !selectedUser) ||
            currentRoomType === "channel"
          }
          className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white disabled:opacity-50"
        >
          {callType === "audio" ? <Phone className="h-4 w-4 mr-2" /> : <Video className="h-4 w-4 mr-2" />}
          Start {callType === "audio" ? "Audio" : "Video"} Call
        </Button>
      </div>
    </div>
  );
}
