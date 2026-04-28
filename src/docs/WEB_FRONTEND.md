# Web Frontend

## Landing Page

The current frontend is a Vite + React visual implementation for the Liquid Chess landing page.

- Entry: `src/app/frontend/src/App.tsx`
- Landing root: `src/app/frontend/src/pages/landing/index.tsx` (exports `LandingPage`)
- Global style tokens: `src/app/frontend/src/index.css`
- ShadCN + 21st.dev components: `src/app/frontend/src/components/ui/`
- Landing sections: `src/app/frontend/src/components/landing/`
- 3D components: `src/app/frontend/src/components/three/` (Spline keyboard, R3F FBX loaders)
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

- FBX model: `public/models/chess-pieces.fbx`
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
| Hero | `HeroSection.tsx` | R3F Canvas; FBX split King+Queen with premium materials; cylindrical platform surface; heroic low-angle camera (position [0,1.0,7] fov 42); spotlight from below for dramatic rim lighting; scroll-triggered separation (King left, Queen right + scale + depth); video frames background (4 frames, 60% opacity) |
| Voice Showcase | `VoiceShowcaseSection.tsx` | Voice card marquee |
| Demo | `DemoSection.tsx` | Video comparison + live chat + SplineKeyboard toggle; plain snap-section (ContainerScroll removed) |
| Testimonials | `TestimonialSection.tsx` | 90vw, 65vh; hover gold glow; click → portal 3D card flip (profile + usage stats) |
| CTA | `CTASection.tsx` | 3D models + screen + Get Started button |
| FAQ | `CTASection.tsx` | Accordion |
| Footer | `FooterSection.tsx` | FlickeringGrid banner + CodePen-style horizontal rows (bold label \| links) |

## Notes

The landing page uses viewport snap sections (`scroll-snap-type: y proximity`), glassmorphism surfaces, black/gold/white brand tokens, and the referenced 21st.dev components adapted to Vite.
