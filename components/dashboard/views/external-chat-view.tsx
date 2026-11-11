"use client";

import ExternalChatApp from "@/components/external-chat/external-chat-app";

export default function ExternalChatView() {
  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-full overflow-hidden bg-background">
      <ExternalChatApp />
    </div>
  );
}
