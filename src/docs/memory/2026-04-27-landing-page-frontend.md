# 2026-04-27 Landing Page Frontend

- Recreated `src/app/frontend` as a Vite + React + Tailwind v4 app.
- Implemented the landing page from `src/design/desktop-web/pages/landing_page/INSTRUCTION.md` and `PLAN.md`.
- Added hook loading screen, liquid-glass nav, R3F FBX hero/CTA model canvases, video-frame stream, voice showcase, Spline keyboard demo, comparison slider, live chat, testimonials, CTA, FAQ, and footer.
- Wired 21st.dev-derived UI primitives under `src/app/frontend/src/components/ui/` and `components/blocks/`.
- Added runtime asset discovery for future hero videos/commentation audio with filename-stem pairing.
- Verified `npm run build` with Vite 6.4.2 and `npm audit --omit=dev` with zero vulnerabilities.
- Browser smoke screenshots are in `output/playwright/`.
