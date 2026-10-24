"use client";

import { useRef, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import {
  PenTool,
  FileText,
  BookOpen,
  Send,
  Layout,
  Layers,
  Zap,
  MousePointer2,
} from "lucide-react";
import TextLine from "./TextLine";
import FloatingGlyph from "./FloatingGlyph";
import { useMotionMode } from "@/lib/useMotionMode";

const FLOATING_ELEMENTS = [
  {
    icon: PenTool,
    letter: "W",
    x: -300,
    y: -200,
    rotate: -15,
    scale: 1.1,
    delay: 0,
  },
  {
    icon: FileText,
    letter: "R",
    x: 320,
    y: -180,
    rotate: 20,
    scale: 1.3,
    delay: 0.1,
  },
  {
    icon: BookOpen,
    letter: "P",
    x: -350,
    y: 220,
    rotate: -25,
    scale: 1.2,
    delay: 0.2,
  },
  {
    icon: Send,
    letter: "S",
    x: 380,
    y: 250,
    rotate: 30,
    scale: 1.4,
    delay: 0.15,
  },
  {
    icon: Layout,
    letter: "L",
    x: -180,
    y: -300,
    rotate: 10,
    scale: 1,
    delay: 0.05,
  },
  {
    icon: Layers,
    letter: "A",
    x: 220,
    y: 320,
    rotate: -10,
    scale: 1.15,
    delay: 0.25,
  },
  {
    icon: Zap,
    letter: "Z",
    x: -400,
    y: 50,
    rotate: 45,
    scale: 0.9,
    delay: 0.3,
  },
  {
    icon: MousePointer2,
    letter: "I",
    x: 380,
    y: -100,
    rotate: -35,
    scale: 1.25,
    delay: 0.08,
  },
];

export function CinematicTransition() {
  /*
   * Decided once, here, and handed down.
   *
   * Everything in this section is decoration, and all of it was being run at
   * full strength on every device. The mode is settled before this component
   * exists - it is loaded on demand, well after the hero above it has
   * mounted and resolved it - so the expensive version is never rendered on
   * a phone even for a frame.
   */
  const mode = useMotionMode();
  const lite = mode !== "full";

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 30, stiffness: 70 });
  const smoothMouseY = useSpring(mouseY, { damping: 30, stiffness: 70 });
  const watermarkX = useTransform(smoothMouseX, [-500, 500], [-40, 40]);
  const watermarkY = useTransform(smoothMouseY, [-500, 500], [-40, 40]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Barely a spring: just enough to take the jitter out of a trackpad, not
  // enough to lag behind the scrollbar. Anything softer and a quick flick
  // leaves this value trailing somewhere in the middle of the section while
  // the screen shows nothing, which is what made fast scrolling feel broken.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 40,
    restDelta: 0.0005,
  });

  const opacity = useTransform(
    smoothProgress,
    [0.0, 0.08, 0.16, 0.24],
    [0, 1, 1, 0],
  );
  const scale = useTransform(smoothProgress, [0.0, 0.08, 0.24], [0.6, 1, 0.55]);
  const rotate = useTransform(smoothProgress, [0.0, 0.24], [0, -16]);
  const y = useTransform(smoothProgress, [0.0, 0.08], [30, 0]);
  const filter = useTransform(
    smoothProgress,
    [0.0, 0.07, 0.18, 0.24],
    ["blur(6px)", "blur(0px)", "blur(0px)", "blur(12px)"],
  );

  useEffect(() => {
    // Nothing to follow on a touch screen, and following it costs two
    // springs running against the largest text layer on the page.
    if (lite) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, lite]);

  /*
   * 300vh, down from 400.
   *
   * The choreography below is written in fractions of this section's own
   * scroll progress, so shortening it changes nothing about the order or the
   * overlap - there is just less empty travel between the beats. At 400vh the
   * last line landed and then you scrolled most of a screen with nothing
   * happening, which is what made the page feel like it had stalled.
   */
  return (
    <section ref={containerRef} className="relative h-[300vh] bg-[#FEF0D8]">
      {/* Watermark. 40vw of text is the biggest single layer on the page;
          when it drifts with the cursor it is a composited layer being moved
          every frame, so without a cursor to follow it is a plain div. */}
      {lite ? (
        <div className="pointer-events-none fixed inset-0 z-0 flex select-none items-center justify-center opacity-[0.02]">
          <div className="text-[40vw] font-black leading-none tracking-tighter text-[#0B1220]">
            BLOG
          </div>
        </div>
      ) : (
        <motion.div
          style={{ x: watermarkX, y: watermarkY }}
          className="pointer-events-none fixed inset-0 z-0 flex select-none items-center justify-center opacity-[0.02]"
        >
          <div className="text-[40vw] font-black leading-none tracking-tighter text-[#0B1220]">
            BLOG
          </div>
        </motion.div>
      )}

      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40">
          <div className="space-y-4 md:space-y-8 max-w-6xl px-4 flex flex-col items-center">
            <TextLine
              mode={mode}
              text="A growing library of"
              progress={smoothProgress}
              range={[0.24, 0.44]}
              speed={1.4}
            />
            <div className="flex flex-wrap items-baseline justify-center gap-1 md:gap-2">
              <TextLine
                mode={mode}
                text="Member"
                progress={smoothProgress}
                range={[0.44, 0.62]}
                speed={1}
                isAnchor
                isYellow
              />
              <TextLine
                mode={mode}
                text="-written blogs"
                progress={smoothProgress}
                range={[0.44, 0.62]}
                speed={1}
                isAnchor
              />
            </div>
            <TextLine
              mode={mode}
              text="published with intent"
              progress={smoothProgress}
              range={[0.62, 0.82]}
              speed={0.6}
            />
          </div>
        </div>

        <div className="relative z-30 flex items-center justify-center">
          <motion.div
            style={{
              opacity,
              scale,
              rotate,
              y,
              // Animated blur means re-rastering this block every frame of
              // the scroll. The fade and the scale carry the same beat.
              ...(lite ? {} : { filter }),
            }}
            className="relative"
          >
            <motion.div
              // A four-second bob that never stops. It keeps the largest
              // text on the screen repainting for as long as the tab is
              // open, which is a poor trade for ten pixels of drift.
              animate={lite ? undefined : { y: [0, -10, 0] }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="flex items-baseline gap-2 md:gap-4 text-4xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-[#0B1220]"
            >
              <span className="font-[950] tracking-[-0.05em] flex uppercase leading-none">
                <span className="text-[#0B1220]">C</span>
                <span className="text-[#F2B200]">K</span>
              </span>
              <span className="text-2xl md:text-5xl lg:text-7xl font-bold tracking-normal opacity-80">
                BlogSite
              </span>
            </motion.div>
          </motion.div>

          {FLOATING_ELEMENTS.map((item, index) => (
            <FloatingGlyph
              key={index}
              mode={mode}
              icon={item.icon}
              letter={item.letter}
              x={item.x}
              y={item.y}
              rotate={item.rotate}
              scale={item.scale}
              progress={smoothProgress}
              delay={item.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
