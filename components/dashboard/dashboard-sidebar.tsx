"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Video,
  CalendarDays,
  Sparkles,
  Image as ImageIcon,
  MessageSquareText,
} from "lucide-react";
import { DashboardView } from "@/app/dashboard/page";
import { usePathname, useRouter } from "next/navigation";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

/* ✅ TYPE SAFE MENU */
const menuItems: {
  id: DashboardView;
  label: string;
  icon: any;
  href?: string;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "recording",
    label: "Recordings",
    icon: Video,
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
  },
  {
    id: "interview", // ✅ FIXED (works only if type updated)
    label: "AI Interview",
    icon: Sparkles,
    href: "/dashboard/interview",
  },
  {
    id: "external-chat",
    label: "External Chat",
    icon: MessageSquareText,
    href: "/dashboard/external-chat",
  },
];

export default function DashboardSidebar({
  activeView,
  onViewChange,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0">
      <nav className="space-y-2 sticky top-24">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            /* ✅ BETTER ACTIVE LOGIC */
            const isActive = item.href
              ? pathname.startsWith(item.href)
              : activeView === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (item.href) {
                      router.push(item.href);
                    } else {
                      onViewChange(item.id);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}