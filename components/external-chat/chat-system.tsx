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
  className,
  infoOpen = false,
}: {
  children: ReactNode;
  className?: string;
  infoOpen?: boolean;
}) {
  return (
    <div className={`chat-shell h-[100dvh] w-full overflow-hidden ${className || ''}`}>
      <div className={`whatsapp-chat-grid ${infoOpen ? "with-info-panel" : ""} h-full w-full`}>
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
    <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            "h-7 rounded-full px-3 text-xs font-medium transition-all",
            active === tab.id
              ? "bg-[#D9FDD3] text-[#008069] hover:bg-[#D9FDD3] dark:bg-[#0A332C] dark:text-[#00A884] dark:hover:bg-[#0A332C]"
              : "bg-[#F0F2F5] text-[#54656F] hover:bg-[#E9EDEF] dark:bg-[#202C33] dark:text-[#8696A0] dark:hover:bg-[#2A3942]"
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