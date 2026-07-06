import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Simple responsive stack primitive.
 * Defaults to vertical layout (mobile-first) and allows switching at breakpoints.
 */
export function ResponsiveStack({
  children,
  className,
  direction = "col",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "col" | "row";
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        direction === "row" ? "flex flex-col sm:flex-row" : "flex flex-col",
        className
      )}
    >
      {children}
    </div>
  );
}

