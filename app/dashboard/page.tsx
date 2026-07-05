"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import OverviewView from "@/components/dashboard/views/overview-view";
import RecordingView from "@/components/dashboard/views/recording-view";
import ScheduleView from "@/components/dashboard/views/schedule-view";

function DashboardContent() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("tab") || "overview";

  switch (activeView) {
    case "recording":
      return <RecordingView />;
    case "schedule":
      return <ScheduleView />;
    case "overview":
    default:
      return <OverviewView />;
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading view...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
