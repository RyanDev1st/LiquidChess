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

## Notes

The landing page uses viewport snap sections, glassmorphism surfaces, black/gold/white brand tokens, and the referenced 21st.dev components adapted to Vite.
