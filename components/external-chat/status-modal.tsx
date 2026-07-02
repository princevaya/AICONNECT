// components/external-chat/status-modal.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StatusCreator from "./status-creator";
import StatusViewer from "./status-viewer";

async function api<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Modal that shows:
 *  • Add Status button → opens StatusCreator
 *  • List of user profiles with their latest status
 *  • Clicking a profile opens StatusViewer for that status (reactions/comments)
 */
export function StatusModal({ onClose }: { onClose: () => void }) {
  const [profiles, setProfiles] = useState<Array<{ user: any; status: any }>>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Load all statuses (including self) on mount
  useEffect(() => {
    api<{ statuses: any[] }>("/api/external-chat/statuses")
      .then((data) => {
        const grouped = data.statuses.reduce((acc: any[], s) => {
          const existing = acc.find((p) => p.user.id === s.author.id);
          if (!existing) acc.push({ user: s.author, status: s });
          return acc;
        }, []);
        setProfiles(grouped);
      })
      .catch(console.error);
  }, []);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto shadow-xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Status</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <Button className="mb-4" onClick={() => setCreatorOpen(true)}>
            Add Status
          </Button>
          {creatorOpen && (
            <StatusCreator
              onClose={() => setCreatorOpen(false)}
              onPost={async (text, file, visibility) => {
                await api("/api/external-chat/statuses", {
                  method: "POST",
                  body: JSON.stringify({ text, visibility, fileId: (file as any)?.id ?? null, attachmentId: (file as any)?.id ?? null }),
                });
                setCreatorOpen(false);
                // Reload statuses
                api<{ statuses: any[] }>("/api/external-chat/statuses").then((d) => {
                  const grp = d.statuses.reduce((acc: any[], s) => {
                    const ex = acc.find((p) => p.user.id === s.author.id);
                    if (!ex) acc.push({ user: s.author, status: s });
                    return acc;
                  }, []);
                  setProfiles(grp);
                });
              }}
              roomId="" // not used for status
              roomCode=""
            />
          )}
          <ul className="space-y-2">
            {profiles.map((p, i) => (
              <li
                key={p.user.id}
                className="flex items-center p-2 rounded hover:bg-accent cursor-pointer"
                onClick={() => openViewer(i)}
              >
                <img src={p.user.imageUrl ?? "https://via.placeholder.com/40"} alt={p.user.name} className="w-10 h-10 rounded-full mr-3" />
                <div>
                  <div className="font-medium">{p.user.name || p.user.email}</div>
                  <div className="text-sm text-muted-foreground">{p.status.text ?? "(no status)"}</div>
                </div>
              </li>
            ))}
          </ul>
          {viewerOpen && (
            <StatusViewer
              statuses={profiles.map((p) => p.status)}
              initialIndex={viewerIndex}
              onClose={() => setViewerOpen(false)}
              onStatusViewed={() => {}}
              onReact={() => {}}
              onComment={() => {}}
              currentUserId=""
            />
          )}
        </div>
      </div>
    </div>
  );
}
