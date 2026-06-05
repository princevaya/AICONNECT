"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MagicBadge from "@/components/ui/magic-badge";
import { MessageSquare, Users, Settings, Plus } from "lucide-react";
import ExternalChatApp from "@/components/external-chat/external-chat-app";

export default function ExternalChatView() {
  const [chatMode, setChatMode] = useState<"preview" | "active">("preview");
  const [activeChats, setActiveChats] = useState([
    { id: 1, name: "Support Team", participants: 3, lastMessage: "Welcome to our support channel!" },
    { id: 2, name: "Project Alpha", participants: 5, lastMessage: "Meeting scheduled for tomorrow" },
    { id: 3, name: "General Discussion", participants: 12, lastMessage: "Anyone available for quick chat?" }
  ]);

  const startNewChat = () => {
    const newChat = {
      id: Date.now(),
      name: `Chat ${activeChats.length + 1}`,
      participants: 1,
      lastMessage: "New chat started"
    };
    setActiveChats([...activeChats, newChat]);
  };

  if (chatMode === "active") {
    return (
      <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">External Chat</h1>
          <p className="text-muted-foreground">Connect and collaborate with external users</p>
        </div>
        <Button onClick={() => setChatMode("preview")} variant="outline" className="w-full sm:w-auto">
          Back to Overview
        </Button>
      </div>
        <ExternalChatApp />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">External Chat</h1>
          <p className="text-muted-foreground">Connect and collaborate with external users</p>
        </div>
        <Button onClick={startNewChat} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeChats.map((chat) => (
          <Card key={chat.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="text-lg">{chat.name}</CardTitle>
                <MagicBadge title={`${chat.participants} participants`} />
              </div>
              <CardDescription className="text-sm">
                Last message: {chat.lastMessage}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setChatMode("active")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open Chat
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No active chats</h3>
          <p className="text-muted-foreground text-center mb-4">
            Start a new chat to collaborate with external users
          </p>
          <Button onClick={startNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Chat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
