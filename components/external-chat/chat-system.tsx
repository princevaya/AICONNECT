"use client";

import * as React from "react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FilterTab = "all" | "unread" | "groups" | "starred";

const TABS: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
  { id: "starred", label: "Starred" },
];

export function ChatShell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`chat-shell min-h-[calc(100vh-4rem)] rounded-xl p-4 ${className || ''}`}>
      <div className="whatsapp-chat-grid mx-auto max-w-7xl h-[calc(100vh-6rem)]">
        {children}
      </div>
    </div>
  );
}

export function ChatPanel({ 
  children, 
  className 
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`whatsapp-panel overflow-hidden ${className || ''}`}>
      {children}
    </div>
  );
}

export function SidebarFilterTabs({
  active,
  onChange,
}: {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
}) {
  return (
    <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg border border-border/70 bg-muted/35 p-1">
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={active === tab.id ? "default" : "ghost"}
          className={cn(
            "h-7 text-xs transition-all",
            active === tab.id ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

export function OnlineDot() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-[#25D366] dark:bg-[#25D366]" />
  );
}

export type { FilterTab };