'use client';

import { useRef, useId, useEffect, CSSProperties } from 'react';
import { animate, useMotionValue, AnimationPlaybackControls } from 'framer-motion';

interface AnimationConfig {
  preview?: boolean;
  scale: number;
  speed: number;
}

interface NoiseConfig {
  opacity: number;
  scale: number;
}

interface ShadowOverlayProps {
  sizing?: 'fill' | 'stretch';
  color?: string;
  animation?: AnimationConfig;
  noise?: NoiseConfig;
  style?: CSSProperties;
  className?: string;
}

function mapRange(value: number, fromLow: number, fromHigh: number, toLow: number, toHigh: number): number {
  if (fromLow === fromHigh) return toLow;
  return toLow + ((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow);
}

const useInstanceId = (): string => {
  const id = useId();
  return `shadowoverlay-${id.replace(/:/g, '')}`;
};

export function EtheralShadow({
  color = 'rgba(201, 168, 76, 0.6)',
  animation,
  noise,
  style,
  className,
}: ShadowOverlayProps) {
  const id = useInstanceId();
  const animationEnabled = !!(animation && animation.scale > 0);
  const feRef = useRef<SVGFEColorMatrixElement>(null);
  const mvHue = useMotionValue(0);
  const animCtrl = useRef<AnimationPlaybackControls | null>(null);

  const dispScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0;
  const duration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) / 25 : 40;
  const bfX = animation ? mapRange(animation.scale, 0, 100, 0.001, 0.0005) : 0.001;
  const bfY = animation ? mapRange(animation.scale, 0, 100, 0.004, 0.002) : 0.004;

  useEffect(() => {
    if (!animationEnabled) return;
    animCtrl.current?.stop();
    mvHue.set(0);
    animCtrl.current = animate(mvHue, 360, {
      duration,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'linear',
      onUpdate: (v) => feRef.current?.setAttribute('values', String(v)),
    });
    return () => animCtrl.current?.stop();
  }, [animationEnabled, duration, mvHue]);

  return (
    <div
      className={className}
      style={{ overflow: 'hidden', position: 'relative', width: '100%', height: '100%', ...style }}
    >
      {/* SVG filter definition — zero-size, just a defs container */}
      {animationEnabled && (
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        >
          <defs>
            <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence
                result="undulation"
                numOctaves={2}
                baseFrequency={`${bfX},${bfY}`}
                seed={0}
                type="turbulence"
              />
              {/* hueRotate animation drives the morphing */}
              <feColorMatrix ref={feRef} in="undulation" type="hueRotate" values="0" />
              {/* forward-ref to "dist" falls back to previous primitive per SVG spec */}
              <feColorMatrix
                in="dist"
                result="circulation"
                type="matrix"
                values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="circulation"
                scale={dispScale}
                result="dist"
              />
              <feDisplacementMap
                in="dist"
                in2="undulation"
                scale={dispScale}
                result="output"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* Blob layer — expands beyond bounds so displacement has source pixels to pull */}
      <div
        style={{
          position: 'absolute',
          inset: animationEnabled ? -dispScale : 0,
          filter: animationEnabled ? `url(#${id}) blur(4px)` : 'none',
        }}
      >
        <div
          style={{
            background: color,
            WebkitMaskImage:
              'radial-gradient(ellipse 65% 60% at 50% 50%, black 0%, black 40%, transparent 70%)',
            maskImage:
              'radial-gradient(ellipse 65% 60% at 50% 50%, black 0%, black 40%, transparent 70%)',
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {noise && noise.opacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
            backgroundSize: noise.scale * 200,
            backgroundRepeat: 'repeat',
            opacity: noise.opacity / 2,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
