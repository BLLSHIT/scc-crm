"use client"

import * as React from "react"
import * as RadixPopover from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = RadixPopover.Root

const PopoverTrigger = RadixPopover.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <RadixPopover.Portal>
    <RadixPopover.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      data-slot="popover-content"
      className={cn(
        "z-50 flex w-72 flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </RadixPopover.Portal>
))
PopoverContent.displayName = "PopoverContent"

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h4">) {
  return (
    <h4
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
