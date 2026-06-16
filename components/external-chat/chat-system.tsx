"use client";

import * as React from "react";
import { MessageCircleMore, Phone, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type FilterTab = "all" | "unread" | "groups" | "starred";

type MobileNavTab = "chats" | "status" | "calls" | "profile";


const TABS: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
  { id: "starred", label: "Starred" },
];

const MOBILE_NAV_ITEMS: Array<{ id: MobileNavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "chats", label: "Chats", icon: MessageCircleMore },
  { id: "status", label: "Status", icon: MessageCircleMore },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "profile", label: "You", icon: UserRound },
];


export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="chat-shell h-screen w-full overflow-hidden bg-background"
      aria-label="Chat application main container"
    >
      {children}
    </div>
  );
}

export function ChatPanel({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section
      className={cn("chat-panel", className)}
      aria-label={ariaLabel || "Chat panel"}
    >
      {children}
    </section>
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
    <div
      className="mb-3 grid grid-cols-4 gap-1 rounded-2xl border border-border/70 bg-background/65 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      role="tablist"
      aria-label="Chat filters"
    >
      {TABS.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={active === tab.id ? "default" : "ghost"}
          role="tab"
          aria-selected={active === tab.id}
          aria-label={`Filter by ${tab.label}`}
          className={cn(
            "h-8 rounded-xl px-2 text-[11px] font-medium transition-all sm:text-xs",
            active === tab.id
              ? "shadow-sm"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

export function OnlineDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]",
        className
      )}
      aria-label="Online"
      role="status"
    />
  );
}


export function ChatListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-label="Loading conversations" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`chat-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-border/60 bg-background/55 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-muted/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-28 rounded-full bg-muted/70" />
                <div className="h-3 w-10 rounded-full bg-muted/60" />
              </div>
              <div className="h-3 w-4/5 rounded-full bg-muted/60" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading conversations</span>
    </div>
  );
}

export function MessageSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-label="Loading messages" role="status">
      {Array.from({ length: count }).map((_, index) => {
        const sent = index % 2 === 0;
        return (
          <div key={`message-skeleton-${index}`} className={cn("flex", sent ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "animate-pulse rounded-3xl border border-border/60 px-4 py-3",
                sent ? "w-[72%] bg-primary/10 sm:w-[60%]" : "w-[78%] bg-background/80 sm:w-[62%]"
              )}
            >
              <div className="mb-2 h-3 w-16 rounded-full bg-muted/70" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-muted/60" />
                <div className="h-3 w-4/5 rounded-full bg-muted/60" />
              </div>
            </div>
          </div>
        );
      })}
      <span className="sr-only">Loading messages</span>
    </div>
  );
}

export function MobileBottomNav({
  active,
  onChange,
}: {
  active: MobileNavTab;
  onChange: (tab: MobileNavTab) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:hidden">
      <nav
        className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.65rem] border border-border/70 bg-background/88 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        aria-label="Mobile navigation"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-label={`Navigate to ${item.label}`}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-medium transition-all",
                selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="mb-1 h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export type { FilterTab, MobileNavTab };
