"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useMotionMode } from "@/lib/useMotionMode";

const heroItems = [
  {
    word: "Write.",
    color: "text-[#0B1220]",
  },
  {
    word: "Refine.",
    color: "text-[#F2B200]",
    tilted: true,
  },
  {
    word: "Publish.",
    color: "text-[#0B1220]",
  },
];

function SkidDust({ delay }: { delay: number }) {
  return (
    <div className="pointer-events-none absolute bottom-2 left-0 h-1.5 w-full lg:bottom-4">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            x: [0, (i + 1) * 15, (i + 1) * 20],
            y: [0, -5, 2],
            scale: [0, 1.5, 0.5],
          }}
          transition={{
            duration: 0.5,
            delay: delay + 0.6 + i * 0.02,
            ease: "easeOut",
          }}
          className="absolute h-1 w-1 rounded-full bg-[#0B1220]/40 blur-[1px]"
          style={{ left: `${i * 15}%` }}
        />
      ))}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: [0, 1, 0], scaleX: [0, 1.2, 0.8], x: [0, 20, 30] }}
        transition={{
          duration: 0.4,
          delay: delay + 0.6,
          ease: "easeOut",
        }}
        className="h-full w-full origin-left rounded-full bg-[#0B1220]/20 blur-[2px]"
      />
    </div>
  );
}

/**
 * The word that scrambles when you point at it.
 *
 * It splits the word into one animated span per letter and waits for
 * onMouseEnter. A phone has no cursor to enter with, so on a touch screen
 * those spans mounted, sat there, and could never once do the thing they
 * exist for. `lite` renders the word.
 */
function UnscrambleText({ word, lite }: { word: string; lite: boolean }) {
  const [hovered, setHovered] = useState(false);

  if (lite) return <>{word}</>;

  // Pre-generate random values so they don't change on re-render
  const randomValues = word.split("").map((_, i) => ({
    yOffset: Math.random() * 50 - 25,
    xOffset: Math.random() * 40 - 20,
    rotationOffset: Math.random() * 120 - 60,
  }));

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-block cursor-pointer"
      whileHover={{ scale: 1.05 }}
    >
      {word.split("").map((char, i) => (
        <motion.span
          key={i}
          animate={
            hovered
              ? {
                  y: [
                    0,
                    randomValues[i].yOffset,
                    randomValues[i].yOffset * 0.3,
                    0,
                  ],
                  x: [
                    0,
                    randomValues[i].xOffset,
                    randomValues[i].xOffset * 0.4,
                    0,
                  ],
                  rotate: [
                    0,
                    randomValues[i].rotationOffset,
                    randomValues[i].rotationOffset * 0.5,
                    0,
                  ],
                  opacity: [1, 0.3, 0.6, 1],
                  scaleX: [1, 0.5, 1.2, 1],
                  scaleY: [1, 1.4, 0.8, 1],
                }
              : { y: 0, x: 0, rotate: 0, opacity: 1, scaleX: 1, scaleY: 1 }
          }
          transition={{
            duration: 0.7,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
          className="inline-block"
        >
          {char}
        </motion.span>
      ))}
    </motion.div>
  );
}

export function Hero() {
  /*
   * 'full' on the server and for the first render here, then whatever the
   * device actually warrants. The hero is server-rendered, so it has to
   * agree with the server on that first pass; what it drops below is either
   * decoration that has already played or a loop that would have run for the
   * rest of the visit.
   *
   * The animated blurs are handled in CSS instead - see .motion-no-blur in
   * globals.css - because those cost from the very first frame, before any
   * of this has had a chance to run.
   */
  const lite = useMotionMode() !== "full";

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for mouse interaction
  const smoothX = useSpring(mouseX, { damping: 20, stiffness: 100 });
  const smoothY = useSpring(mouseY, { damping: 20, stiffness: 100 });

  // Parallax transforms
  const paperRotate = useTransform(smoothX, [-500, 500], [-12, -4]);
  const paperX = useTransform(smoothX, [-500, 500], [-20, 20]);
  const paperY = useTransform(smoothY, [-500, 500], [-20, 20]); // Centered around the 0 initial position
  const watermarkX = useTransform(smoothX, [-500, 500], [-50, 50]);
  const watermarkY = useTransform(smoothY, [-500, 500], [-50, 50]);

  const logoX = useTransform(smoothX, [-500, 500], [20, -20]);
  const logoY = useTransform(smoothY, [-500, 500], [20, -20]);

  // The highlight is a fixed gradient that slides, rather than a gradient
  // rebuilt from a string on every frame. Same travel, no repaint.
  const paperGlowX = useTransform(smoothX, [-500, 500], ["-25%", "25%"]);

  /*
   * How the three words arrive.
   *
   * They used to come in at the same speed everywhere, and that speed was
   * chosen for a phone still laying the page out - which on a laptop reads
   * as a flinch rather than an entrance. The slow version is the one worth
   * watching and costs a desktop nothing; the quick one stays exactly as it
   * was, because the device it was tuned for has not got faster.
   */
  const entrance = lite
    ? { duration: 0.6, stagger: 0.1 }
    : { duration: 1.15, stagger: 0.19 };

  /*
   * The parallax needs a mouse, so it can only start once this is in a
   * browser - but the hero itself does not. It used to render `null` until a
   * mount flag flipped, which threw away the server-rendered first paint and
   * left the page blank until hydration finished. The motion values simply
   * sit at 0 (dead centre) until the first mousemove arrives.
   */
  useEffect(() => {
    // Five springs feed off this, including the 45vw watermark. With no
    // cursor to follow, none of them has anything to say.
    if (lite) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, lite]);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#FEF0D8] px-6 pt-32 pb-20 lg:flex-row lg:px-20 lg:pt-0">
      {/*
        * A warm light that follows the cursor.
        *
        * One element, one radial gradient, moved by transform only - no
        * filter, no gradient rebuilt per frame, nothing that forces a
        * relayout. It rides the springs the parallax already uses, so
        * following the pointer costs no new listener, and it multiplies
        * into the cream rather than sitting on top of it, which deepens the
        * paper instead of washing it out.
        *
        * Off entirely without a pointer: there is no cursor to follow on a
        * phone, and this is the largest painted layer on the page.
        */}
      {!lite && (
        <motion.div
          aria-hidden
          style={{ x: smoothX, y: smoothY }}
          className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 mix-blend-multiply"
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,184,0,0.22) 0%, rgba(245,184,0,0.10) 32%, rgba(245,184,0,0) 68%)",
            }}
          />
        </motion.div>
      )}

      {/* Dynamic Watermark */}
      {/* It used to turn a full circle every 150 seconds. A 45vw block of
          text is the largest layer on the page, and rotating it never
          finished compositing - the phone was redrawing the hero for as long
          as the tab was open, for a movement nobody can perceive at 3 per
          cent opacity. It still drifts with the cursor, which is free. */}
      {lite ? (
        <div className="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center opacity-[0.03]">
          <div className="-rotate-6 text-[45vw] font-black leading-none tracking-tighter text-[#0B1220]">
            BLOG SITE
          </div>
        </div>
      ) : (
        <motion.div
          style={{ x: watermarkX, y: watermarkY }}
          className="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center opacity-[0.03]"
        >
          <div className="-rotate-6 text-[45vw] font-black leading-none tracking-tighter text-[#0B1220]">
            BLOG SITE
          </div>
        </motion.div>
      )}

      {/* Left Side: Hero Words */}
      <div className="relative z-20 flex flex-1 flex-col items-start justify-center text-left lg:items-center">
        <div className="flex flex-col items-start lg:items-center">
          {/* These three words are 20vw each - the heaviest text on the page.
              They used to drift up and down forever, which kept all three
              repainting for the whole visit; the slide-in is the part you
              actually notice, and it now finishes in under half a second
              instead of arriving word by word over 2.1s. */}
          {heroItems.map((item, idx) => (
            <div
              key={idx}
              className="relative mb-4 flex flex-col items-start lg:mb-6 lg:items-center"
            >
              <motion.h1
                initial={{ x: "-120vw", filter: "blur(20px)" }}
                animate={{ x: 0, filter: "blur(0px)" }}
                transition={{
                  duration: entrance.duration,
                  delay: idx * entrance.stagger,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`
                  motion-no-blur relative z-10 cursor-default text-[20vw] font-black leading-[0.85] tracking-tighter sm:text-[16vw] lg:text-[10vw]
                  ${item.color}
                  ${item.tilted ? "-rotate-[6deg] lg:-rotate-[4deg] translate-x-[-2vw] translate-y-[2vw]" : ""}
                `}
              >
                {item.tilted ? <UnscrambleText word={item.word} lite={lite} /> : item.word}
                {/* Eighteen blurred particles across the three words, for
                    half a second, once. Worth it on a laptop, not worth it
                    on the phone that is still laying the page out. */}
                {!lite && <SkidDust delay={idx * entrance.stagger} />}
              </motion.h1>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Blog Visual & Logo Depth */}
      <div className="relative flex flex-1 items-center justify-center pt-20 lg:pt-0">
        {/* Layered Logo Interaction */}
        <motion.div
          style={lite ? undefined : { x: logoX, y: logoY }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 blur-[2px] lg:opacity-20 lg:blur-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center rotate-[-12deg]"
          >
            <div className="relative flex h-40 w-40 items-center justify-center lg:h-80 lg:w-80">
              <div className="absolute inset-0 bg-[#0B1220] [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]" />
              <span className="relative z-10 text-4xl font-black text-[#FEF0D8] lg:text-8xl">
                B
              </span>
            </div>
            <span className="mt-4 text-4xl font-black tracking-tighter text-[#0B1220] lg:text-8xl">
              BLOG
            </span>
          </motion.div>
        </motion.div>

        {/* Landing Shockwave (Triggers when paper hits) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 4], opacity: [0.5, 0] }}
          transition={{ delay: 0.85, duration: 0.8, ease: "easeOut" }}
          className="absolute h-40 w-40 rounded-full border-4 border-[#F2B200]/30"
        />

        {/* Blog Article Visual (Physical Mouse-reactive Paper) */}
        <motion.div
          style={lite ? undefined : { rotate: paperRotate, x: paperX, y: paperY }}
          initial={{
            y: "-120vh",
            rotate: -30,
            scale: 0.5,
            filter: "blur(10px)",
          }}
          animate={{ y: 0, rotate: -8, scale: 1, filter: "blur(0px)" }}
          /*
           * The card used to hang above the fold for 2.2 seconds before it
           * dropped, and the whole hero was not finished assembling until
           * 4.2s - most of a visit, on the first screen. The drop is the same
           * move, it just starts straight away.
           */
          transition={{
            y: {
              delay: 0.3,
              type: "spring",
              damping: 14,
              stiffness: 110,
            },
            rotate: { duration: 0.8, delay: 0.3 },
            scale: { duration: 0.5, delay: 0.3 },
            filter: { duration: 0.6, delay: 0.3 },
          }}
          className="motion-no-blur relative z-30 w-[280px] overflow-hidden rounded-[2px] bg-white p-5 shadow-[30px_30px_80px_-15px_rgba(11,18,32,0.2)] sm:w-[340px] lg:w-[360px] lg:p-7"
        >
          <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none">
            <motion.div
              style={lite ? undefined : { x: paperGlowX }}
              className="absolute -inset-x-1/4 inset-y-0 bg-[radial-gradient(circle_at_50%_0%,rgba(242,178,0,0.1)_0%,transparent_50%)]"
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2 lg:mb-6">
            {["EDITORIAL", "FUTURE"].map((tag) => (
              <span
                key={tag}
                className="bg-[#0B1220] px-2 py-0.5 text-[10px] font-black tracking-widest text-white"
              >
                {tag}
              </span>
            ))}
          </div>

          <h2 className="mb-4 text-3xl font-black leading-tight tracking-tight text-[#0B1220] lg:mb-6 lg:text-4xl">
            The Art of Building Simple.
          </h2>

          {/* The shimmer that used to sit over this image pulsed forever, on
              top of a blend mode - every frame of it recomposited the card. */}
          <div className="relative mb-4 aspect-video w-full overflow-hidden bg-[#FEF0D8] lg:mb-6">
            <Image
              src="/abstract-editorial-graphic.jpg"
              alt="Editorial Art"
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 340px, 280px"
              priority
              className="object-cover mix-blend-multiply opacity-80"
            />
          </div>

          <div className="flex items-center gap-4 border-t border-[#0B1220]/10 pt-4 lg:pt-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.95, type: "spring" }}
              className="h-10 w-10 rounded-full bg-[#F2B200]"
            />
            <div className="flex flex-col gap-1">
              <div className="h-2 w-24 bg-[#0B1220]/10 rounded" />
              <div className="h-2 w-16 bg-[#0B1220]/5 rounded" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Grainy Texture Overlay.
          Hidden on phones: it is a full-screen layer with a blend mode, and
          the bar at the top of the page composites over it on every scroll
          frame. At 4 per cent opacity nobody is missing it on a 390px
          screen, and the scroll stops fighting for the GPU. */}
      <div
        className="pointer-events-none absolute inset-0 z-50 hidden opacity-[0.04] mix-blend-multiply sm:block"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </section>
  );
}
