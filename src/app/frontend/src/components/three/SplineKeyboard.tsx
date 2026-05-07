import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";

interface SplineKeyboardProps {
  onClick: () => void;
  aiActive: boolean;
  bgColor?: number;
}

export default function SplineKeyboard({ onClick, aiActive, bgColor = 0x000000 }: SplineKeyboardProps) {
  const handleLoad = (app: Application) => {
    // Match Spline's WebGL clear color to the page background so the canvas box is invisible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderer = (app as any)._renderer;
    if (renderer) {
      renderer.setClearColor(bgColor, 1);
    }
  };

  return (
    <div
      className="relative cursor-pointer group"
      onClick={onClick}
      title={aiActive ? "Click to mute AI" : "Click to activate AI"}
    >
      <div
        className="relative overflow-hidden"
        style={{ height: "380px", width: "100%" }}
      >
        <Spline
          scene="https://prod.spline.design/3WH-0gGBL8jEqmW0/scene.splinecode"
          onLoad={handleLoad}
          style={{ width: "100%", height: "100%" }}
        />
        {/* Hide Spline watermark — bottom-right corner gradient */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 w-48 h-14 z-10"
          style={{ background: "linear-gradient(to top left, #000000 30%, transparent)" }}
        />
        {/* Bottom fade into page */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 z-10"
          style={{ background: "linear-gradient(to top, #000000 40%, transparent)" }}
        />
      </div>

      {/* Hover prompt — outside canvas, always visible */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
          aiActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      >
        <div className="text-center">
          <p className="text-white text-sm font-mono">Ctrl+C / Ctrl+V</p>
          <p className="text-[--gold] text-xs mt-1">Activate AI</p>
        </div>
      </div>

      {/* Active indicator */}
      {aiActive && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 glass-gold rounded-full px-2 py-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[--gold] text-[10px] font-mono">AI ON</span>
        </div>
      )}
    </div>
  );
}
