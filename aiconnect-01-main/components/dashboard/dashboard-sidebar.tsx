"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Video, CalendarDays } from "lucide-react";
import { DashboardView } from "@/app/dashboard/page";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const menuItems = [
  {
    id: "overview" as DashboardView,
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "recording" as DashboardView,
    label: "Recordings",
    icon: Video,
  },
  {
    id: "schedule" as DashboardView,
    label: "Schedule",
    icon: CalendarDays,
  },
];

export default function DashboardSidebar({
  activeView,
  onViewChange,
}: DashboardSidebarProps) {
  return (
    <aside className="w-64 shrink-0">
      <nav className="space-y-2 sticky top-24">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
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
