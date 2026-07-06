import * as React from "react";

/**
 * Layout helper to harden containers against horizontal overflow.
 * Use around sections that may contain cards/tables with long content.
 */
export function NoHorizontalOverflow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["w-full min-w-0 overflow-x-hidden", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

