import React from "react";
import { cn } from "@/lib/utils";

interface MenuToggleIconProps extends React.SVGProps<SVGSVGElement> {
  open: boolean;
  duration?: number;
}

export function MenuToggleIcon({ open, duration = 300, className, ...props }: MenuToggleIconProps) {
  const style: React.CSSProperties = {
    transition: `transform ${duration}ms ease`,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-5", className)}
      {...props}
    >
      <line
        x1="3"
        y1="6"
        x2="21"
        y2="6"
        style={{
          ...style,
          transformOrigin: "12px 6px",
          transform: open ? "translateY(6px) rotate(45deg)" : "none",
        }}
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        style={{
          ...style,
          opacity: open ? 0 : 1,
        }}
      />
      <line
        x1="3"
        y1="18"
        x2="21"
        y2="18"
        style={{
          ...style,
          transformOrigin: "12px 18px",
          transform: open ? "translateY(-6px) rotate(-45deg)" : "none",
        }}
      />
    </svg>
  );
}
