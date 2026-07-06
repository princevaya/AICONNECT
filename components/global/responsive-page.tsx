import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsivePageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-first page wrapper.
 * - Prevents horizontal overflow by default (min-w-0, w-full)
 * - Provides consistent responsive padding
 */
export function ResponsivePage({ children, className }: ResponsivePageProps) {
  return (
    <main
      className={cn(
        "w-full min-w-0",
        // padding tuned to satisfy small breakpoints without clipping
        "px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10",
        className
      )}
    >
      {children}
    </main>
  );
}

