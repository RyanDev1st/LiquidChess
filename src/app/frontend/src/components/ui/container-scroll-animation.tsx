"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
  id,
  className,
  scrollContainerRef,
  contentClassName,
  cardClassName,
  bodyClassName,
  scrollOffset,
  transformRange,
  titleTranslateRange,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  contentClassName?: string;
  cardClassName?: string;
  bodyClassName?: string;
  scrollOffset?: NonNullable<Parameters<typeof useScroll>[0]>["offset"];
  transformRange?: [number, number];
  titleTranslateRange?: [number, number];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, container: scrollContainerRef, offset: scrollOffset });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1]);
  const range = transformRange ?? [0, 1];
  const rotate = useTransform(scrollYProgress, range, [20, 0]);
  const scale = useTransform(scrollYProgress, range, scaleDimensions());
  const translate = useTransform(scrollYProgress, range, titleTranslateRange ?? [0, -100]);

  return (
    <div id={id} className={`flex items-center justify-center relative ${className ?? 'h-[60rem] md:h-[80rem] p-2 md:p-20'}`} ref={containerRef}>
      <div className={`py-10 md:py-40 w-full relative ${contentClassName ?? ""}`} style={{ perspective: "1000px" }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale} cardClassName={cardClassName} bodyClassName={bodyClassName}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }: { translate: MotionValue<number>; titleComponent: React.ReactNode }) => (
  <motion.div style={{ translateY: translate }} className="div max-w-5xl mx-auto text-center">
    {titleComponent}
  </motion.div>
);

export const Card = ({
  rotate,
  scale,
  children,
  cardClassName,
  bodyClassName,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
  cardClassName?: string;
  bodyClassName?: string;
}) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      boxShadow: "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
    }}
    className={`max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border border-white/10 p-2 md:p-6 bg-black/60 backdrop-blur-xl rounded-[30px] shadow-2xl ${cardClassName ?? ""}`}
  >
    <div className={`h-full w-full overflow-hidden rounded-2xl bg-black/40 ${bodyClassName ?? ""}`}>
      {children}
    </div>
  </motion.div>
);
