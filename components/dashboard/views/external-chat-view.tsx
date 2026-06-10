"use client";

import ExternalChatApp from "@/components/external-chat/external-chat-app";

export default function ExternalChatView() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">External Chat</h1>
        <p className="text-muted-foreground">Secure external conversations, status updates, and calls inside AI Connect.</p>
      </div>
      <ExternalChatApp />
    </div>
  );
}
