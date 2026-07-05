"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  Menu,
  Video,
  PlayCircle,
  CalendarDays,
  Sparkles,
  MessageSquareText,
  HelpCircle,
  MessageSquare,
  Settings,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayoutClient({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [timeString, setTimeString] = useState("");

  // Dynamically update the clock header
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: 2:10 PM • Sun, Jul 5
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const date = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      setTimeString(`${time} • ${date}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    {
      id: "overview",
      label: "Meetings",
      icon: Video,
      href: "/dashboard?tab=overview",
      isActive: pathname === "/dashboard" && activeTab === "overview",
    },
    {
      id: "recording",
      label: "Recordings",
      icon: PlayCircle,
      href: "/dashboard?tab=recording",
      isActive: pathname === "/dashboard" && activeTab === "recording",
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: CalendarDays,
      href: "/dashboard?tab=schedule",
      isActive: pathname === "/dashboard" && activeTab === "schedule",
    },
    {
      id: "interview",
      label: "AI Interview",
      icon: Sparkles,
      href: "/dashboard/interview",
      isActive: pathname.startsWith("/dashboard/interview"),
    },
    {
      id: "external-chat",
      label: "External Chat",
      icon: MessageSquareText,
      href: "/dashboard/external-chat",
      isActive: pathname.startsWith("/dashboard/external-chat"),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none">
      {/* HEADER */}
      <header className="h-16 px-4 shrink-0 flex items-center justify-between border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-11 w-11 hover:bg-muted md:ml-0"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Styled Google Meet Logo */}
          <div className="flex items-center gap-2 ml-1 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <div className="h-9 w-9 rounded-lg bg-yellow-500 flex items-center justify-center shadow-sm">
              <Video className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground/90 font-sans">
              AIConnect <span className="text-muted-foreground/60 font-light text-base">Meet</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Time & Date */}
          <div className="hidden sm:block text-sm text-muted-foreground/80 font-medium mr-4">
            {timeString}
          </div>

          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground">
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground mr-2">
            <LayoutGrid className="h-5 w-5" />
          </Button>

          {/* User Button */}
          <div className="h-8 w-8 flex items-center justify-center">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* SIDEBAR (desktop/tablet) */}
        <aside
          className={cn(
            "hidden md:flex border-r shrink-0 bg-background flex-col py-3 transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "w-[72px]" : "w-64"
          )}
        >
          <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center transition-all duration-200 rounded-full h-12 px-4 gap-4",
                    item.isActive
                      ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", item.isActive && "stroke-[2.5px]")} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-sans tracking-wide truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MOBILE SIDEBAR (drawer) */}
          {/* Mobile sidebar drawer: slide in from the left */}
        <div className="md:hidden">
          {/* Drawer should be open when isSidebarCollapsed === true */}
          <div className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background border-r shadow-lg transform transition-transform duration-300 ease-in-out",
            isSidebarCollapsed ? "translate-x-0" : "-translate-x-full"
          )}
          >
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(item.href);
                      setIsSidebarCollapsed(false);
                    }}
                    className={cn(
                      "w-full flex items-center transition-all duration-200 rounded-full h-12 px-4 gap-4",
                      item.isActive
                        ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-sans tracking-wide truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          {/* Backdrop */}
          {isSidebarCollapsed && (
            <button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setIsSidebarCollapsed(false)}
            />
          )}
        </div>

        {/* MAIN PANEL */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background/50">
          <div className="w-full min-w-0 h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
