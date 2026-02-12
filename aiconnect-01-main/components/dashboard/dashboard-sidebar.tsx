"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Video,
  CalendarDays,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { DashboardView } from "@/app/dashboard/page";
import { useRouter } from "next/navigation";

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

/* 🔹 MENU ITEMS (ONLY 3D IMAGE UPDATED) */
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
  {
    id: "interview" as DashboardView,
    label: "AI Interview",
    icon: Sparkles,
  },
  {
    id: "ai-image" as DashboardView,
    label: "3D Image Generator",
    icon: ImageIcon,
  },
];

export default function DashboardSidebar({
  activeView,
  onViewChange,
}: DashboardSidebarProps) {
  const router = useRouter();

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
                  onClick={() => {
                    // ✅ ONLY FOR 3D IMAGE GENERATOR
                    if (item.id === "ai-image") {
                      router.push("/dashboard/3d-image-generator");
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
