"use client"

import * as React from "react"
import * as RadixSelect from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = RadixSelect.Root
const SelectGroup = RadixSelect.Group
const SelectValue = RadixSelect.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixSelect.Trigger
    ref={ref}
    className={cn(
      "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <RadixSelect.Icon asChild>
      <ChevronDownIcon className="h-4 w-4" />
    </RadixSelect.Icon>
  </RadixSelect.Trigger>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <RadixSelect.Portal>
    <RadixSelect.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-popover-foreground/10 bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <RadixSelect.Viewport className="p-1">
        {children}
      </RadixSelect.Viewport>
    </RadixSelect.Content>
  </RadixSelect.Portal>
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Item>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Item>
>(({ className, children, ...props }, ref) => (
  <RadixSelect.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-muted focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <RadixSelect.ItemIndicator>
        <CheckIcon className="h-4 w-4" />
      </RadixSelect.ItemIndicator>
    </span>

    <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
  </RadixSelect.Item>
))
SelectItem.displayName = "SelectItem"

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Label>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Label>
>(({ className, ...props }, ref) => (
  <RadixSelect.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
))
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof RadixSelect.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixSelect.Separator>
>(({ className, ...props }, ref) => (
  <RadixSelect.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = "SelectSeparator"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
}
