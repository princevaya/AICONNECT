"use client";

import * as React from "react";
import { cn } from "@/lib/utils";


export function VisuallyHidden({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        className
      )}
      {...props}
    />
  );
}

export { VisuallyHidden as default };