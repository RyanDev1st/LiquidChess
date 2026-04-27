You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
lamp-tooltip.tsx
"use client";

import { cn } from "@/lib/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 18, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden bg-primary px-3 py-1.5 text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      // Shape (Padding, width, height etc)
      "py-2",
      // Background color and text color
      "bg-muted dark:bg-black text-popover-foreground",
      // Border-color
      "border-secondary-foreground",
      // Border sides and shadow for each side
      "data-[side=top]:border-b dark:data-[side=top]:shadow-tooltip-b",
      "data-[side=bottom]:border-t dark:data-[side=bottom]:shadow-tooltip-t",
      "data-[side=right]:border-l dark:data-[side=right]:shadow-tooltip-r",
      "data-[side=left]:border-r dark:data-[side=left]:shadow-tooltip-l",
      // Slide and zoom animations
      "data-[side=bottom]:slide-in-from-top-3",
      // Text classes
      "text-sm",

      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };


demo.tsx
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/lamp-tooltip"

function LampTooltipDemo() {
  return (
    <div className="flex flex-wrap gap-10">
      {/* Top side tooltip */}
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger className="h-max bg-[#1f1f1f] text-sm font-medium p-1.5 px-3 border">
            Hover (Top)
          </TooltipTrigger>

          <TooltipContent>
            <p>Top side tooltip</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Bottom side tooltip */}
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger className="h-max bg-[#1f1f1f] text-sm font-medium p-1.5 px-3 border">
            Hover (Bottom)
          </TooltipTrigger>

          <TooltipContent side="bottom">
            <p>Bottom side tooltip</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex flex-col gap-10">
        {/* Right side tooltip */}
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger className="h-max bg-[#1f1f1f] text-sm font-medium p-1.5 px-3 border">
              Hover (Right)
            </TooltipTrigger>

            <TooltipContent side="right">
              <p>Right side tooltip</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Left side tooltip */}
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger className="h-max bg-[#1f1f1f] text-sm font-medium p-1.5 px-3 border">
              Hover (Left)
            </TooltipTrigger>

            <TooltipContent side="left">
              <p>Left side tooltip</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}


export { LampTooltipDemo };
```

Install NPM dependencies:
```bash
@radix-ui/react-tooltip
```

Extend existing tailwind.config.js with this code:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
        boxShadow: {
        "tooltip-b":
          "8px 10px 10px -13px rgba(255,255,255,1), -8px 9px 10px -13px rgba(255,255,255,1), 0px 23px 40px -10px rgba(255,255,255,1)",
        "tooltip-t":
          "8px -10px 10px -13px rgba(255,255,255,1), -8px -9px 10px -13px rgba(255,255,255,1), 0px -23px 40px -10px rgba(255,255,255,1)",
        "tooltip-r": "-12px 0px 12px -10px rgba(255,255,255,1)",
        "tooltip-l": "12px 0px 12px -10px rgba(255,255,255,1)",
        },
      },
  },
}
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

https://21st.dev/community/components/fanoflix/lamp-tooltip/default