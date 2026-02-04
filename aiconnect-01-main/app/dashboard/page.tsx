"use client";

import React, { useState } from "react";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import OverviewView from "@/components/dashboard/views/overview-view";
import RecordingView from "@/components/dashboard/views/recording-view";
import ScheduleView from "@/components/dashboard/views/schedule-view";

/* 🔹 NEW IMPORTS (ADDED ONLY) */

import InterviewPreviewView from "@/components/dashboard/views/interview-preview-view";



/* 🔹 EXTENDED TYPE (NO BREAKING CHANGE) */
export type DashboardView =
  | "overview"
  | "recording"
  | "schedule"
  | "interview"
  | "ai-image";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<DashboardView>("overview");

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <OverviewView setActiveView={setActiveView} />;

      case "recording":
        return <RecordingView />;

      case "schedule":
        return <ScheduleView />;

      /* 🔹 NEW CASES (ADDED) */
      case "interview": // ✅ ADD THIS
      return <InterviewPreviewView />;

     

      default:
        return <OverviewView setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="flex gap-8">
      <DashboardSidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <main className="flex-1">{renderView()}</main>
    </div>
  );
}
