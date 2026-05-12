"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    data-slot="separator"
    data-orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-px w-full" : "w-px",
      className
    )}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator }
