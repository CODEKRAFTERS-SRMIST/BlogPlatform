"use client"

import { motion, useTransform } from "framer-motion"

/**
 * A line of the landing page's scroll choreography.
 *
 * There are two of these, and which one you get depends on what the device
 * can afford. The parent decides once and passes the answer down, so a line
 * never starts as one and becomes the other halfway through the section.
 */
export default function TextLine({ mode = "full", ...props }: any) {
  if (mode === "full") return <TextLineFull {...props} />
  return <TextLineLite {...props} motionless={mode === "off"} />
}

/* ------------------------------------------------------------------ lite -
 *
 * The whole line, as one piece: a fade and a short rise, and nothing else.
 *
 * What it deliberately leaves out is the expensive half of the full version.
 * No per-letter split, so this is two moving values instead of three per
 * character. No animated filter, so the phone is not re-rastering a 3xl
 * block of text every frame. No animated letter-spacing, which is the worst
 * of them - spacing is a layout property, so changing it per frame makes the
 * browser re-measure and re-lay-out the text on every single frame, and that
 * is the stutter.
 *
 * None of it is visible at phone size anyway. The effect was designed at
 * 7xl on a laptop; at 3xl on a 375px screen the letters arrive so close
 * together that the stagger reads as one movement.
 */
function TextLineLite({ text, progress, range, isYellow = false, motionless = false }: any) {
  const opacity = useTransform(progress, [range[0], range[0] + 0.08], [0, 1])
  const y = useTransform(progress, [range[0], range[0] + 0.12], [motionless ? 0 : 40, 0])

  return (
    <motion.p
      style={{ opacity, y }}
      className={`text-3xl md:text-5xl lg:text-7xl font-bold text-center leading-tight tracking-[0.02em] ${
        isYellow ? "text-[#F2B200]" : "text-[#0B1220]"
      }`}
    >
      {text}
    </motion.p>
  )
}

/* ------------------------------------------------------------------ full -
 *
 * The original choreography, for a machine with a mouse and the headroom to
 * run it, minus two things that never did anything:
 *
 *   letterSpacing  animated from 0.1em to 0.02em. Spacing is a layout
 *                  property, so this re-laid-out the text on every frame of
 *                  the scroll to close a gap nobody was watching. It is a
 *                  fixed 0.02em now, which is where it ended up anyway.
 *   whileHover     on both the wrapper and the paragraph. The container
 *                  these sit in is `pointer-events-none`, so neither could
 *                  ever fire; one of them also animated letterSpacing.
 */
function TextLineFull({ text, progress, range, speed, isAnchor = false, isYellow = false }: any) {
  const opacity = useTransform(progress, [range[0], range[0] + 0.08], [0, 1])

  const entryY = useTransform(progress, [range[0], range[0] + 0.1, range[0] + 0.15], [300, -30, 0])
  const entryScale1 = useTransform(
    progress,
    [range[0], range[0] + 0.08, range[0] + 0.12, range[0] + 0.15],
    [0.2, 1.3, 0.9, 1],
  )
  const entryRotate1 = useTransform(progress, [range[0], range[0] + 0.12], [isAnchor ? 0 : -20, 0])

  const entryRotateX1 = useTransform(progress, [range[0], range[0] + 0.12], [60, 0])

  const blur1 = useTransform(
    progress,
    [range[0], range[0] + 0.05, range[0] + 0.12],
    ["blur(30px)", "blur(8px)", "blur(0px)"],
  )

  const parallaxY1 = useTransform(progress, [range[1], 1], [0, (1 - speed) * 50])

  const continuousRotate = useTransform(progress, [range[1], 1], [0, Math.sin(range[1] * 10) * 3])

  // Breathing animation
  const breathingScale = useTransform(progress, [range[1], 1], [1, 1.05])
  const breathingOpacity = useTransform(progress, [range[1], 1], [1, 0.95])

  return (
    <motion.div
      style={{
        opacity: useTransform([opacity, breathingOpacity], ([o, bo]) => (o as number) * (bo as number)),
        y: useTransform([entryY, parallaxY1], ([ey, py]) => (ey as number) + (py as number)),
        scale: useTransform([entryScale1, breathingScale], ([es, bs]) => (es as number) * (bs as number)),
        rotate: useTransform([entryRotate1, continuousRotate], ([er, cr]) => (er as number) + (cr as number)),
        rotateX: entryRotateX1,
        filter: blur1,
        transformStyle: "preserve-3d",
      }}
      className="relative"
    >
      <motion.div
        style={{
          opacity: useTransform(progress, [range[0] + 0.05, range[0] + 0.15], [0, isYellow ? 0.4 : 0.2]),
        }}
        className="absolute inset-0 -z-10 scale-150 blur-3xl"
      >
        <div className={`w-full h-full ${isYellow ? "bg-[#F2B200]" : "bg-[#F2B200]"} rounded-[50%]`} />
      </motion.div>

      <p
        className={`text-3xl md:text-5xl lg:text-7xl font-bold text-center leading-tight tracking-[0.02em] flex items-center justify-center ${
          isYellow ? "text-[#F2B200]" : "text-[#0B1220]"
        }`}
      >
        {text.split("").map((char: string, i: number) => (
          <AnimatedLetter key={i} char={char} i={i} progress={progress} range={range} isYellow={isYellow} />
        ))}
      </p>
    </motion.div>
  )
}

function AnimatedLetter({ char, i, progress, range, isYellow }: any) {
  const charOpacity = useTransform(progress, [range[0] + i * 0.008, range[0] + i * 0.008 + 0.05], [0, 1])
  const charY = useTransform(progress, [range[0] + i * 0.008, range[0] + i * 0.008 + 0.1], [50, 0])
  const charRotate = useTransform(progress, [range[0] + i * 0.008, range[0] + i * 0.008 + 0.1], [15, 0])

  return (
    <motion.span
      style={{
        display: "inline-block",
        opacity: charOpacity,
        y: charY,
        rotate: charRotate,
        color: isYellow ? "#F2B200" : "#0B1220",
      }}
    >
      {char === " " ? " " : char}
    </motion.span>
  )
}
