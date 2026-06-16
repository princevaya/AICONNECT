"use client";

import React, { useState } from "react";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import OverviewView from "@/components/dashboard/views/overview-view";
import RecordingView from "@/components/dashboard/views/recording-view";
import ScheduleView from "@/components/dashboard/views/schedule-view";
import InterviewPreviewView from "@/components/dashboard/views/interview-preview-view";
import AIImageView from "@/components/dashboard/views/ai-image-view";
import ExternalChatView from "@/components/dashboard/views/external-chat-view";

export type DashboardView =
  | "overview"
  | "recording"
  | "schedule"
  | "interview"
  | "ai-image"
  | "external-chat";

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
      case "interview":
        return <InterviewPreviewView />;
      case "ai-image":
        return <AIImageView />;
      case "external-chat":
        return <ExternalChatView />;
      default:
        return <OverviewView setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <DashboardSidebar
          activeView={activeView}
          onViewChange={setActiveView}
        />
      </div>
      <main className="min-w-0">{renderView()}</main>
    </div>
  );
}
