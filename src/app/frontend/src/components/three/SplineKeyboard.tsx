import Spline from "@splinetool/react-spline";

interface SplineKeyboardProps {
  onClick: () => void;
  aiActive: boolean;
}

export default function SplineKeyboard({ onClick, aiActive }: SplineKeyboardProps) {

  return (
    <div
      className="relative cursor-pointer group"
      onClick={onClick}
      title={aiActive ? "Click to mute AI" : "Click to activate AI"}
    >
      {/* Watermark mask */}
      <div className="spline-wrapper rounded-xl overflow-hidden" style={{ height: "200px", width: "100%" }}>
        <Spline scene="https://prod.spline.design/3WH-0gGBL8jEqmW0/scene.splinecode" />
        {/* Bottom gradient to hide Spline watermark */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-10"
          style={{ background: "linear-gradient(to top, #111, transparent)" }}
        />
      </div>

      {/* Overlay prompt */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center justify-center transition-opacity duration-300 ${
          aiActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
        }`}
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
      >
        <div className="text-center">
          <p className="text-white text-sm font-mono">Ctrl+C / Ctrl+V</p>
          <p className="text-[--gold] text-xs mt-1">{aiActive ? "Deactivate AI" : "Activate AI"}</p>
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
