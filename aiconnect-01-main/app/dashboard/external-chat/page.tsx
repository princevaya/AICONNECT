import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ExternalChatApp from "@/components/external-chat/external-chat-app";

export default function ExternalChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" asChild className="px-0 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">External Chat</h1>
            <p className="text-sm text-muted-foreground">
              Manage conversations, attachments, and realtime collaboration from your dashboard workspace.
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <MessageSquareText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Chat Workspace</CardTitle>
              <CardDescription>Direct messages, rooms, uploads, and presence in one place.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[calc(100vh-16rem)] min-h-[720px] bg-background">
            <ExternalChatApp />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
