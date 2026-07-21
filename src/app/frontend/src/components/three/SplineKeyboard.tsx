import { useRef } from "react";
import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";

interface SplineKeyboardProps {
  onClick: () => void;
  aiActive: boolean;
  bgColor?: number;
  height?: string;
  className?: string;
}

function makeCanvasTransparent(root: HTMLDivElement | null) {
  if (!root) return;

  root.querySelectorAll("canvas").forEach((canvas) => {
    canvas.style.background = "transparent";
    canvas.style.backgroundColor = "transparent";
    canvas.style.outline = "none";
  });
}

export default function SplineKeyboard({
  onClick,
  aiActive,
  bgColor = 0x000000,
  height = "420px",
  className = "",
}: SplineKeyboardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastToggleAt = useRef(0);

  function toggleOnce() {
    const now = performance.now();
    if (now - lastToggleAt.current < 180) return;
    lastToggleAt.current = now;
    onClick();
  }

  const handleLoad = (app: Application) => {
    app.setBackgroundColor("rgba(0,0,0,0)");

    const runtimeApp = app as Application & {
      _renderer?: {
        setClearColor?: (color: number, alpha?: number) => void;
        setClearAlpha?: (alpha: number) => void;
        renderer?: {
          setClearColor?: (color: number, alpha?: number) => void;
          setClearAlpha?: (alpha: number) => void;
        };
      };
    };

    runtimeApp._renderer?.setClearColor?.(bgColor, 0);
    runtimeApp._renderer?.setClearAlpha?.(0);
    runtimeApp._renderer?.renderer?.setClearColor?.(bgColor, 0);
    runtimeApp._renderer?.renderer?.setClearAlpha?.(0);

    makeCanvasTransparent(rootRef.current);
    window.requestAnimationFrame(() => makeCanvasTransparent(rootRef.current));
    window.setTimeout(() => makeCanvasTransparent(rootRef.current), 250);
  };

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden ${className}`}
      style={{ height }}
      data-ai-active={aiActive}
      onPointerDownCapture={toggleOnce}
    >
      <Spline
        scene="https://prod.spline.design/3WH-0gGBL8jEqmW0/scene.splinecode"
        onLoad={handleLoad}
        onSplineMouseDown={toggleOnce}
        renderOnDemand={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "transparent",
        }}
      />

      <div
        className="pointer-events-none absolute bottom-0 right-0 z-[9999] h-24 w-72"
        style={{
          background: "linear-gradient(to top left, #000 58%, rgba(0,0,0,.96) 74%, transparent 92%)",
        }}
      />
    </div>
  );
}
