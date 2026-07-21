'use client';

import { useRef, useId, useEffect, CSSProperties } from 'react';

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
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

const useInstanceId = (): string => {
  const id = useId();
  return `shadowoverlay-${id.replace(/:/g, '')}`;
};

export function EtheralShadow({
  sizing = 'fill',
  color = 'rgba(128, 128, 128, 1)',
  animation,
  noise,
  style,
  className,
}: ShadowOverlayProps) {
  const id = useInstanceId();
  const animationEnabled = !!(animation && animation.scale > 0);
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const displacementRef2 = useRef<SVGFEDisplacementMapElement>(null);

  const displacementScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0;

  useEffect(() => {
    if (!animationEnabled || !animation) return;

    let frame = 0;
    let lastUpdate = 0;
    const startedAt = performance.now();
    const lowPower = navigator.hardwareConcurrency <= 4 || window.devicePixelRatio > 1.5;
    const frameInterval = lowPower ? 90 : 50;
    const speed = mapRange(animation.speed, 1, 100, 0.12, 0.72);
    const baseX = mapRange(animation.scale, 0, 100, 0.001, 0.0005);
    const baseY = mapRange(animation.scale, 0, 100, 0.004, 0.002);

    const tick = (now: number) => {
      if (document.hidden) {
        frame = requestAnimationFrame(tick);
        return;
      }

      if (now - lastUpdate < frameInterval) {
        frame = requestAnimationFrame(tick);
        return;
      }
      lastUpdate = now;

      const t = ((now - startedAt) / 1000) * speed;
      const wave = Math.sin(t * Math.PI * 2);
      const slowWave = Math.sin(t * Math.PI);
      const x = Math.max(0.0001, baseX + wave * 0.0001);
      const y = Math.max(0.0003, baseY + slowWave * 0.00046);
      const scale = displacementScale * (0.62 + (slowWave + 1) * 0.16);

      turbulenceRef.current?.setAttribute("baseFrequency", `${x},${y}`);
      displacementRef.current?.setAttribute("scale", String(scale * 0.75));
      displacementRef2.current?.setAttribute("scale", String(scale));
      feColorMatrixRef.current?.setAttribute("values", String((t * 48) % 360));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animation?.scale, animation?.speed, animationEnabled, displacementScale]);

  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -displacementScale,
          filter: animationEnabled ? `url(#${id}) blur(4px)` : 'none',
        }}
      >
        {animationEnabled && (
          <svg style={{ position: 'absolute' }}>
            <defs>
              <filter id={id}>
                <feTurbulence
                  ref={turbulenceRef}
                  result="undulation"
                  numOctaves={1}
                  baseFrequency={`${mapRange(animation!.scale, 0, 100, 0.001, 0.0005)},${mapRange(animation!.scale, 0, 100, 0.004, 0.002)}`}
                  seed={0}
                  type="turbulence"
                />
                <feColorMatrix
                  ref={feColorMatrixRef}
                  in="undulation"
                  type="hueRotate"
                  values="180"
                />
                <feColorMatrix
                  in="dist"
                  result="circulation"
                  type="matrix"
                  values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                />
                <feDisplacementMap
                  ref={displacementRef}
                  in="SourceGraphic"
                  in2="circulation"
                  scale={displacementScale}
                  result="dist"
                />
                <feDisplacementMap
                  ref={displacementRef2}
                  in="dist"
                  in2="undulation"
                  scale={displacementScale}
                  result="output"
                />
              </filter>
            </defs>
          </svg>
        )}
        <div
          style={{
            backgroundColor: color,
            maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
            maskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
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
            backgroundSize: noise.scale * 160,
            backgroundRepeat: 'repeat',
            opacity: noise.opacity / 3,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
