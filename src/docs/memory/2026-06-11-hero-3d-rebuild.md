# 2026-06-11 — Hero 3D Rebuild (Chess Pieces + GSAP)

> Replaced the broken FBX hero with a Draco GLB King/Queen/Mic rig, choreographed with GSAP on a persistent fixed canvas. _Last updated: 2026-06-11._

## Why it was broken

- Old `HeroSection` loaded `/models/chess-pieces.fbx` (a single fused mesh) and tried to split King vs Queen at runtime by **mesh Y-center (height)**. The two pieces are separated along **depth**, not height, so the split produced garbage.
- The raw source was also unusable on web (~1.67M verts / 3M tris across the high-poly sculpts).
- Per-frame `setState` on scroll re-rendered the React tree every tick.

## Asset pipeline (Blender MCP)

- Source: `C:\Users\admin\OneDrive\Documents\Chess pieces.blend` (user-prepared; camera already set — **do not re-do camera**).
- Objects: `node_0.001` = King (Material.002, white, integrated gold headphones, cross), `node_0` = Queen (Material.001, black, coronet), `node_0.051` = handheld Mic, `tripo_node_*` = low-poly source (excluded), `Empty` = reference image plane.
- Built non-destructive duplicates in an `EXPORT_HERO` collection (originals untouched, **.blend never saved**): decimate → King 60k / Queen 60k / Mic 12k tris; base-center origins; group recentred on the floor; materials renamed; PBR textures downscaled 4096²→1024² and exported as JPEG.
- Exported `src/app/frontend/public/models/chess-hero.glb` — Draco geometry + JPEG PBR = **1.35 MB** (was 55 MB before texture downscale). Y-up, named nodes `King`/`Queen`/`Mic`.

## Frontend

- New files: `components/three/ChessHeroRig.tsx` (GLB load + named-node extraction + material tuning), `components/landing/HeroVideoFrames.tsx` (CSS commentary stream, extracted), rewritten `components/landing/HeroSection.tsx`.
- **GSAP owns animation; R3F only renders** (no per-frame React state). Installed `gsap` + `@gsap/react`.
- Nested groups: **outer** = scroll-driven (ScrollTrigger, `scroller` = `.snap-container`, `scrub: 1`); **inner** = idle (infinite `sine.inOut` yoyo float/sway). No transform-channel conflicts.
- **Persistent fixed-overlay canvas** (`fixed inset-0 pointer-events-none`) so pieces stay on screen and flank the next section instead of scrolling away. No opaque Platform/ContactShadows (would tint content; ref has no platform).
- Choreography matches `src/design/.../hero-section/hero.md`: centered pair → King left / Queen right + scale + depth-match (flank "Trusted") → exit off-edges + fade before voice cards → reverses on scroll-up. `gsap.matchMedia` reduced-motion variant; `frameloop="never"` once exited (perf).

## Incidental fixes (build was already broken repo-wide)

- Deleted orphaned `src/hooks/lenis.ts` (zero imports; used `next/navigation` + `lenis`, neither in this Vite project; JSX in a `.ts`).
- `tsconfig.app.json`: `ignoreDeprecations "6.0"` → `"5.0"` (invalid for TS 5.9).
- **Still outstanding (out of scope):** pre-existing TS errors in `CTASection.tsx`, `HookSection.tsx`, `container-scroll-animation.tsx`, `pages/landing/index.tsx` block `npm run build`. Dev server (Vite/esbuild) runs fine.

## Redesign + scroll/perf fixes (same day, after first review)

User feedback: "won't scroll", "~5fps laggier", "ugly despite the 3d models". Applied the `final-design` skill → Editorial-Luxury / Split-Stage.

- **Scroll bug (root cause):** `HeroSection` returned a fragment (fixed overlay + section), so the `.snap-container` had **8 children** instead of 7. The `useSnapScroll` hook indexes `children[i] === section i`; the extra child shifted everything by one and broke its offset math. **Fix: `createPortal` the canvas to `document.body`** so the container has exactly its 7 section children. Verified: `children.length === 7`, hero wheel `defaultPrevented === false`.
- **Lag:** the `HeroVideoFrames` stream used `mix-blend-screen` over the full viewport (per-frame GPU composite) + 6 per-frame `requestAnimationFrame` style writers, on top of `dpr` up to 1.75. **Fix: dropped the blend stream from the hero, `dpr [1,1.4]`, 5→4 lights.** `HeroVideoFrames.tsx` kept for later, no longer imported.
- **Ugly:** centered hero with copy overlapping the pieces. **Fix: split layout** — serif copy + gold CTA left, pieces clustered right (`LAYOUT` x's now positive); charcoal `#0a0a0c` not pure black; removed the neon drop-shadow glow on the headline; added eval-bar tags. Rest layout + scroll targets retuned (King sweeps from right cluster to far-left flank).

## Verify

- `npm run dev -- --host 127.0.0.1 --port 3003`, open `/?hook=0`. Confirmed via headless browser: rest (split layout, both pieces read), scroll works + flank, exit+fade, scroll-up return, 7 snap children, no console errors.
