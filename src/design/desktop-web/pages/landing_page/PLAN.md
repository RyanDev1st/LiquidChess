Liquid Chess — Landing Page Execution Plan                                                                         
                                                                                                                     
  Phase 0 — Audit & Scaffold (foundation before any section)                                                         
                                                                                                                     
  - Inspect src/app/frontend/src → confirm Vite+TS, tailwind v4 install state, shadcn presence (components/ui,       
  lib/utils.ts).                                                                          
  - Read src/design/reference/landing-page/LiquidChess.html → extract palette, fonts, copy. Lock brand tokens in     
  tailwind.config + globals.css (CSS vars: --bg, --fg, --accent, --muted, glass surface vars).                       
  - Install deps batch: framer-motion qss embla-carousel-react embla-carousel-auto-scroll
  @radix-ui/react-{slot,hover-card,tooltip,avatar,accordion} class-variance-authority lucide-react three             
  @react-three/fiber @react-three/drei @splinetool/react-spline gsap lenis @studio-freight/lenis tw-animate-css.
  - Create dirs: pages/landing/, components/ui/, components/blocks/, components/three/,
  components/landing/<section>/, hooks/, assets/landing/{models,videos,audio}/.
  - Add lib/utils.ts cn() if missing. Wire shadcn primitives: button, card, carousel, avatar, tooltip, accordion.
  - Route: /landing page in router → mount <Landing/>.

  Phase 1 — Cross-cutting primitives (built once, used everywhere)

  1. SnapContainer — full-viewport section w/ h-svh snap-start inside main.snap-y snap-mandatory overflow-y-auto.
  Wrap each of 7 sections. Hook section overlays full screen until exit.
  2. Lenis scroll provider for smooth scroll → drives Framer scroll-progress hooks.
  3. GlobalLoader — overlay using loading-animation/dot-overtaking for first paint; dot-collision for component-level
   Suspense; dot-shuttle reserved for chat. Show skeletal layout (nav stub + section frames) instead of blank.
  4. AssetPreloader — preloads FBX, primary videos/audio, Spline scene, image hero frames during hook screen. Emits
  ready signal to swap from hook → landing.
  5. LiquidGlass util — backdrop-blur + saturate + border + inner highlight, used by nav, CTAs, cards.
  6. HoverPeek + LampTooltip wrappers (per hoverpeek.md + tooltip.md). Add boxShadow extension to tailwind config.
  7. Section IDs + nav links — #hero #voices #demo #testimonials #cta #faq for menu-bar deep links.

  Phase 2 — Nav-bar (sticky-but-scrolls, liquid glass)

  - Port menu-bar.md Header. Override: drop sticky top-0 → use relative inside scroll container so it follows scroll
  (instruction explicit). Place as first element above hook OR floating per design.
  - Tune background: thicker backdrop-blur-2xl, bg-white/8, hairline border-white/15, inner top highlight
  (shadow-[inset_0_1px_0_rgba(255,255,255,.25)]). Apple-liquid-glass vibe.
  - Wordmark → swap WordmarkIcon SVG with Liquid Chess mark (later asset). Links: Features / Voices / Demo / Pricing
  / FAQ. Buttons: Sign In + Get Started.
  - Mobile: keep menu-toggle + sheet from source.

  Phase 3 — Hook section (loading + reveal)

  - Component: EtherealShadow background per hook.md (strip text/button). Color tuned to brand.
  - Foreground: macOS-style terminal card (chrome dots, depth shadow, monospace font e.g. JetBrains Mono).
  - Sequence: typewriter snippet → 2s pause → "execute" line animates → output Welcome to the future of Commentating
  → bright white flash (full-screen overlay opacity 0→1→0, ~400ms) → unmount hook, reveal Hero.
  - Concurrent: AssetPreloader runs from mount; flash is gated on (typing done) ∧ (assets ready). If assets slow,
  hold final line + spinner (dot-overtaking) until ready.
  - Skip flag: ?hook=0 query bypasses for dev.

  Phase 4 — Hero section (FBX models + video frames)

  - 3D: <Canvas> with R3F. Load FBX from hero-section/assets/...fbx via useFBX. Split king + queen by traversing
  scene root children → each gets own group/pivot (Blender-side fix optional; runtime by recomputing bounding-box
  centers).
  - Idle anim: gentle useFrame sin-wave rotation + bob; headphone+mic sub-meshes pick up subtle additional rotation.
  - Scroll choreography: useScroll (framer) target = full landing scroll container. Map progress sub-range
  [heroStart, voiceTrustedEnd]:
    - king: x 0→-leftFlankX, queen: x 0→+rightFlankX, queen scale + z lerp so both same on-screen size at end.
    - flank "Trusted" heading at sub-range end.
    - past trusted → voice cards range: continue translating outward; fade alpha + scale; off-screen by full
  voice-cards view.
    - reverse on scroll-up (free, just reuse progress).
  - Video frame stream: array of frames moving from edges → center plane (z translate or perspective). Each frame:
  <video muted playsinline preload="metadata" poster=...> paused, frame-1 only. On mouseEnter → pause stream (set CSS
   animation-play-state: paused on parent), play that video unmuted with paired audio from commentations/<sameName>.
  On mouseLeave → mute video, resume stream.
  - Asset wiring: read assets/videos/*.{mp4,webm} and assets/commentations/*.{mp3,wav} at build via import.meta.glob,
   pair by filename stem. Fallback: single placeholder repeated.
  - Compress: HEVC/AV1 + WebM fallback, <source> ladder. 720p max; LQIP poster. Lazy-load until hero in view.

  Phase 5 — Voice Showcase section

  - Trusted sub-block: port Logos3 (embla auto-scroll). Heading swap → "Trusted by leagues, casters, creators". Logo
  set = brand-relevant placeholders.
  - Voice cards: port ExpandOnHover. Highlight = boost saturation/brightness on active, dim others to 60% + slight
  blur. Bg theme to dark instead of #f5f4f3.
  - Hero models occupy outer flanks early in section (Phase 4 scroll), exit by cards.
  - Card data array typed; placeholder images kept until user supplies real voices.

  Phase 6 — Demo section (keyboard + video + chat)

  - Container-scroll-animation wraps demo card on enter (Aceternity component). Tilt-down → flatten as user scrolls
  in.
  - Inside scroll card: 3-col grid → [keyboard Spline] [video frame w/ comparison-slider] [live chat box].
  - Keyboard: Spline scene loaded via @splinetool/react-spline per keyboard/keyboard.md. Two virtual keys Ctrl+C /
  Ctrl+V; click any key → toggle commentator AI mute state.
  - Video frame: looped video. ComparisonSlider per comparison-slider/slider.md splits muted-state vs unmuted-state
  visuals (left = boring chat overlay, right = lively chat overlay; or pre-rendered video pair).
  - Live chat: simulated message stream. Mute=ON → sparse messages, slow tempo, neutral tone. Mute=OFF → fast tempo,
  emoji storm, hype. Use dot-shuttle for typing indicator. Keep a fixed message reservoir + scheduler; deterministic
  seed for reproducibility.
  - Wire: SVG path connecting keyboard → frame, animated via pathLength + glow (drop-shadow); pulses when AI active.

  Phase 7 — Testimonial section

  - Port 3d-testimonails (Marquee). 4 vertical lanes, alt directions. Add tw keyframes from showcase.md to
  globals.css.
  - 3D perspective tilt block. Pause on hover.
  - Replace placeholder testimonials w/ Liquid Chess casters (placeholders fine until copy delivered).
  - Gradient masks on edges.

  Phase 8 — CTA section

  - Re-mount the SAME hero models (or persist via a layout effect that re-parents) snapping in (scale-up + ease)
  flanking a 2D screen.
  - Screen plays a 3-sec promo video. Models lip-sync subtitles "What are you waiting for, join us now!" — implement
  as captions appearing in speech-bubble flanking each model + light head-bob anim sync'd to video time codes.
  - On video end (onEnded) → fade screen, slide-up giant "Get Started" button (liquid-glass + accent glow). Tooltip
  on hover. Click → /signup route placeholder.

  Phase 9 — FAQ section

  - Use shadcn accordion styled like 21st.dev expand-cards (cards-but-questions). Each item = card-shaped, click
  expands → reveals answer + subtle chevron.
  - 6–8 questions. Keyboard accessible. Smooth height anim via radix.

  Phase 10 — Footer section

  - Combine footer.md instructions: pixelated "Streamline Your workflow" canvas → reused as visual band; relabel to
  "Elevate YOUR Experience".
  - Insert component2.md link/columns block under it.
  - Typography: matrix+pixel — apply pixel-style font (e.g. VT323 / Press Start 2P for headline only) + per-glyph
  noise/fuzz via SVG filter or layered text-shadow; remove plain-transparent reliance.
  - CodePen-inspired: hook word starts each row horizontally arranged ("Liquid Chess For ___"). Implement as flex row
   of accent words, then trailing copy.
  - Links + socials + legal.

  Phase 11 — Polish, responsive, perf, a11y

  - Section snapping: verify on trackpad + wheel + keyboard (PageDown). Fallback: free scroll on
  prefers-reduced-motion.
  - Reduced motion: kill 3D idle anims, marquees, ethereal anim, container-scroll tilt.
  - Mobile: swap section-snap → vertical stack w/ snap; collapse hero models to 2D PNG sprites; voice cards
  horizontal-scroll; demo grid → tabs (keyboard / video / chat).
  - Perf budget: hero R3F lazy + <Suspense>; Spline lazy; videos preload="metadata"; AVIF posters;
  IntersectionObserver pause off-screen videos; route-level code-split each section.
  - Asset compression: ffmpeg pipeline doc → assets/README.md with target 720p AV1+WebM, audio Opus 96k. FBX→GLB
  conversion (Draco) for hero models to cut weight ~70%.
  - A11y: focus states on cards, alt text, aria-live for chat sim, prefers-reduced-motion, captions for promo video.
  - SEO: meta + OG card, JSON-LD WebSite.

  Phase 12 — QA + docs

  - Visual diff each section vs reference LiquidChess.html highlights.
  - Lighthouse pass (target: Perf ≥80, A11y ≥95).
  - Update src/docs/SCHEMA.md, src/docs/WEB_FRONTEND.md, src/docs/memory/ per repo CLAUDE.md.

  Build order (dep-aware)

  0 → 1 → 2 → 3 (hook) → 4 (hero, longest, blocks several) → 5 → 6 → 7 → 8 (depends on hero models) → 9 → 10 → 11 →
  12.

  Open questions before coding

  1. Exact brand palette + typeface from LiquidChess.html — confirm or restyle?
  2. Real assets ETA (videos, audio, logos, testimonials, FAQ copy)?
  3. Hook flash → does it transition to Hero only, or jump-cut nav+hero?
  4. CTA models: shared instance with hero (state preserved) or fresh re-mount?
  5. Pricing page exists or just # for now?

  Want me to save this as src/design/desktop-web/pages/landing_page/PLAN.md?