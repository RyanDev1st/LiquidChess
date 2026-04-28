"use client";

import * as RdxHoverCard from "@radix-ui/react-hover-card";
import { encode } from "qss";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

function usePreviewSource(url: string, width: number, height: number, isStatic: boolean, staticImageSrc?: string) {
  return useMemo(() => {
    if (isStatic) return staticImageSrc || "";
    const params = encode({
      url, screenshot: true, meta: false, embed: "screenshot.url",
      colorScheme: "dark", "viewport.isMobile": true, "viewport.deviceScaleFactor": 1,
      "viewport.width": width * 2.5, "viewport.height": height * 2.5,
    });
    return `https://api.microlink.io/?${params}`;
  }, [isStatic, staticImageSrc, url, width, height]);
}

function useHoverState(followMouse: boolean) {
  const [isPeeking, setPeeking] = useState(false);
  const mouseX = useMotionValue(0);
  const followX = useSpring(mouseX, { stiffness: 120, damping: 20 });

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!followMouse) return;
    const target = event.currentTarget;
    const targetRect = target.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) * 0.3;
    mouseX.set(offsetFromCenter);
  }, [mouseX, followMouse]);

  const handleOpenChange = useCallback((open: boolean) => {
    setPeeking(open);
    if (!open) mouseX.set(0);
  }, [mouseX]);

  return { isPeeking, handleOpenChange, handlePointerMove, followX };
}

type HoverPeekProps = {
  children: React.ReactNode;
  url: string;
  className?: string;
  peekWidth?: number;
  peekHeight?: number;
  enableMouseFollow?: boolean;
} & ({ isStatic: true; imageSrc: string } | { isStatic?: false; imageSrc?: never });

export const HoverPeek = ({
  children, url, className, peekWidth = 200, peekHeight = 125,
  isStatic = false, imageSrc = "", enableMouseFollow = true,
}: HoverPeekProps) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const finalImageSrc = usePreviewSource(url, peekWidth, peekHeight, isStatic, imageSrc);
  const { isPeeking, handleOpenChange, handlePointerMove, followX } = useHoverState(enableMouseFollow);

  useEffect(() => { setImageLoadFailed(false); }, [finalImageSrc]);
  useEffect(() => { if (!isPeeking) setImageLoadFailed(false); }, [isPeeking]);

  const triggerChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
        className: cn((children.props as React.HTMLAttributes<HTMLElement>).className, className),
        onPointerMove: handlePointerMove,
      })
    : <span className={className} onPointerMove={handlePointerMove}>{children}</span>;

  return (
    <RdxHoverCard.Root openDelay={75} closeDelay={150} onOpenChange={handleOpenChange}>
      <RdxHoverCard.Trigger asChild>{triggerChild}</RdxHoverCard.Trigger>
      <RdxHoverCard.Portal>
        <RdxHoverCard.Content className="[perspective:800px] z-50" side="top" align="center" sideOffset={12}>
          <AnimatePresence>
            {isPeeking && (
              <motion.div
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0, transition: { type: "spring", stiffness: 200, damping: 18 } }}
                exit={{ opacity: 0, rotateY: 90, transition: { duration: 0.15 } }}
                style={{ x: enableMouseFollow ? followX : 0 }}
              >
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="relative block overflow-hidden rounded-lg glass p-0.5 shadow-lg hover:shadow-xl transition-shadow">
                  {imageLoadFailed ? (
                    <div className="flex items-center justify-center bg-black/40 text-white/40 text-xs" style={{ width: peekWidth, height: peekHeight }}>
                      Preview unavailable
                    </div>
                  ) : (
                    <img src={finalImageSrc} width={peekWidth} height={peekHeight}
                      className="block rounded-[5px] pointer-events-none bg-black/40 align-top"
                      alt={`Preview for ${url}`}
                      onError={() => setImageLoadFailed(true)}
                      loading="lazy"
                    />
                  )}
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </RdxHoverCard.Content>
      </RdxHoverCard.Portal>
    </RdxHoverCard.Root>
  );
};
