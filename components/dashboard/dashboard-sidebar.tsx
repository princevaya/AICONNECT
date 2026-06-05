"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Video,
  CalendarDays,
  Sparkles,
  Image as ImageIcon,
  MessageSquareText,
  ChevronDown,
  ChevronRight,
  Menu,
} from "lucide-react";
import { DashboardView } from "@/app/dashboard/page";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  {
    id: "interview" as DashboardView,
    label: "AI Interview",
    icon: Sparkles,
  },
  {
    id: "ai-image" as DashboardView,
    label: "3D Image Generator",
    icon: ImageIcon,
    href: "/dashboard/3d-image-generator",
  },
  {
    id: "external-chat" as DashboardView,
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    if (item.href) {
      router.push(item.href);
    } else {
      onViewChange(item.id);
    }
  };

  const isActive = (item: typeof menuItems[0]) => {
    return item.href ? pathname === item.href : activeView === item.id;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleMenuItemClick(item)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive(item)
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!isCollapsed && item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block bg-background border-r transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold">Dashboard</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
