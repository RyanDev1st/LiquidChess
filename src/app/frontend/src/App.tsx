import { lazy, Suspense } from "react";
import { LandingPage } from "@/pages/landing";

const HeroPrototypes = lazy(() =>
  import("@/components/landing/prototypes/HeroPrototypes").then((m) => ({ default: m.HeroPrototypes })),
);

export default function App() {
  // Dev-only concept gallery: /?proto lets us compare hero directions live.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("proto")) {
    return (
      <Suspense fallback={<div style={{ background: "#000", width: "100vw", height: "100vh" }} />}>
        <HeroPrototypes />
      </Suspense>
    );
  }
  return <LandingPage />;
}
