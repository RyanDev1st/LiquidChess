"use client";

import { useEffect, useState } from "react";

const ASSETS_TO_PRELOAD = [
  "/models/chess-pieces.fbx",
  // Add video/audio paths when available
];

export function useAssetPreloader(onReady: () => void) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loaded = 0;
    const total = ASSETS_TO_PRELOAD.length;

    if (total === 0) {
      onReady();
      return;
    }

    const handleLoad = () => {
      loaded++;
      setProgress((loaded / total) * 100);
      if (loaded >= total) {
        setTimeout(onReady, 500); // Brief buffer
      }
    };

    ASSETS_TO_PRELOAD.forEach((src) => {
      if (src.endsWith(".fbx")) {
        const loader = new THREE.ObjectLoader();
        loader.load(src, handleLoad, undefined, handleLoad);
      } else {
        const el = document.createElement("link");
        el.rel = "preload";
        el.href = src;
        el.onload = handleLoad;
        el.onerror = handleLoad;
        document.head.appendChild(el);
      }
    });
  }, [onReady]);

  return progress;
}
