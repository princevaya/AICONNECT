// components/external-chat/status-tab.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusModal } from "./status-modal";
import { Activity } from "lucide-react";

/**
 * Tab button that opens the status modal.
 * It is used in the external‑chat sidebar/tab bar.
 */
export default function StatusTab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Open status panel"
        className="flex items-center space-x-2"
      >
        <Activity className="h-4 w-4" />
        <span>Status</span>
      </Button>
      {open && <StatusModal onClose={() => setOpen(false)} />}
    </>
  );
}
