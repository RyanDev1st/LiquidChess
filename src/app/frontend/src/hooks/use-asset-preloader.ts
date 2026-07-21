"use client";

import { useEffect, useRef, useState } from "react";

type PreloadOptions = {
  maxWaitMs?: number;
  idleTimeoutMs?: number;
};

const DEFAULT_ASSETS: string[] = [];

function requestIdle(callback: () => void, timeout: number) {
  const win = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (win.requestIdleCallback) {
    const handle = win.requestIdleCallback(callback, { timeout });
    return () => win.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 0);
  return () => window.clearTimeout(handle);
}

function preloadAsset(src: string) {
  return new Promise<void>((resolve) => {
    const done = () => resolve();

    if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(src)) {
      const image = new Image();
      image.onload = done;
      image.onerror = done;
      image.decoding = "async";
      image.src = src;
      return;
    }

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = src;
    link.onload = done;
    link.onerror = done;
    document.head.appendChild(link);
  });
}

export function useAssetPreloader(
  onReady: () => void,
  assets: string[] = DEFAULT_ASSETS,
  { maxWaitMs = 2600, idleTimeoutMs = 1600 }: PreloadOptions = {},
) {
  const [progress, setProgress] = useState(assets.length === 0 ? 100 : 0);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;

    const finish = () => {
      if (!cancelled) readyRef.current();
    };

    if (assets.length === 0) {
      const timeout = window.setTimeout(finish, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }

    const maxWait = window.setTimeout(finish, maxWaitMs);
    const cancelIdle = requestIdle(() => {
      assets.forEach((src) => {
        preloadAsset(src).finally(() => {
          if (cancelled) return;
          loaded += 1;
          setProgress(Math.round((loaded / assets.length) * 100));
          if (loaded >= assets.length) {
            window.clearTimeout(maxWait);
            finish();
          }
        });
      });
    }, idleTimeoutMs);

    return () => {
      cancelled = true;
      cancelIdle();
      window.clearTimeout(maxWait);
    };
  }, [assets, idleTimeoutMs, maxWaitMs]);

  return progress;
}
