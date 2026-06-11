# Web Frontend

> Vite + React landing page for Liquid Chess. Hero rebuilt around a Draco GLB chess rig animated with GSAP. _Last updated: 2026-06-11._

## Landing Page

The current frontend is a Vite + React visual implementation for the Liquid Chess landing page.

- Entry: `src/app/frontend/src/App.tsx`
- Landing root: `src/app/frontend/src/pages/landing/index.tsx` (exports `LandingPage`)
- Global style tokens: `src/app/frontend/src/index.css`
- ShadCN + 21st.dev components: `src/app/frontend/src/components/ui/`
- Landing sections: `src/app/frontend/src/components/landing/`
- 3D components: `src/app/frontend/src/components/three/` (Spline keyboard; `ChessHeroRig.tsx` = hero King/Queen/Mic GLB rig)
- Spline keyboard scene: `https://prod.spline.design/3WH-0gGBL8jEqmW0/scene.splinecode`

## Runtime

Run from `src/app/frontend/`:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3003
npm run build
```

The hook can be skipped during development with `?hook=0`.

## Asset Integration

Place required static assets in the `public/` folder:

- Hero 3D model: `public/models/chess-hero.glb` (Draco-compressed, ~1.35 MB; nodes `King` / `Queen` / `Mic`, base-center pivots, exported from `~/OneDrive/Documents/Chess pieces.blend` via Blender MCP — decimated to ~132k tris, 1024² JPEG PBR maps). The old `chess-pieces.fbx` split-by-axis path is retired.
- Hero placeholder video: `public/videos/placeholder.mp4`
- Hero placeholder audio: `public/commentations/placeholder.mp3`
- CTA promo video: `public/videos/promo.mp4`

When assets are missing, fallback content renders (e.g., solid colors, no audio).

## Snap Scrolling

`index.css` uses `scroll-snap-type: y proximity` (not `mandatory`) with no `scroll-snap-stop: always`. This allows natural scrolling without the browser aggressively fighting back to the current section.

## Sections

| Section | File | Notes |
|---|---|---|
| Hook | `HookSection.tsx` | EtheralShadow gold animation (21stdev), typewriter; overlay reduced to /20 opacity |
| Hero | `HeroSection.tsx` + `ChessHeroRig.tsx` + `HeroVideoFrames.tsx` | **Persistent fixed-overlay R3F Canvas** (`fixed inset-0`, `pointer-events-none`) so pieces stay on screen to flank the next section. Loads `chess-hero.glb` (named King/Queen/Mic nodes). **GSAP owns animation, R3F only renders** — no per-frame React state. Nested groups: outer = scroll (ScrollTrigger, `scroller`=snap-container, `scrub`); inner = idle (infinite `sine.inOut` yoyo timelines). Choreography: centered pair → King left / Queen right + scale + depth-match (flank "Trusted") → exit off-edges + fade before voice cards → reverses on scroll-up. `gsap.matchMedia` reduced-motion variant; render loop pauses (`frameloop="never"`) once exited. Gold up-light + cool rim so the black Queen reads. Video-frame commentary stream behind. |
| Voice Showcase | `VoiceShowcaseSection.tsx` | Voice card marquee |
| Demo | `DemoSection.tsx` | Video comparison + live chat + SplineKeyboard toggle; plain snap-section (ContainerScroll removed) |
| Testimonials | `TestimonialSection.tsx` | 90vw, 65vh; hover gold glow; click → portal 3D card flip (profile + usage stats) |
| CTA | `CTASection.tsx` | 3D models + screen + Get Started button |
| FAQ | `CTASection.tsx` | Accordion |
| Footer | `FooterSection.tsx` | FlickeringGrid banner + CodePen-style horizontal rows (bold label \| links) |

## Notes

The landing page uses viewport snap sections (`scroll-snap-type: y proximity`), glassmorphism surfaces, black/gold/white brand tokens, and the referenced 21st.dev components adapted to Vite.
