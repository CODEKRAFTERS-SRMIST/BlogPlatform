"use client"

import { motion, useTransform } from "framer-motion"

export default function TextLine({ text, progress, range, speed, isAnchor = false, isYellow = false }: any) {
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

  const letterSpacing1 = useTransform(progress, [range[0], range[0] + 0.1], ["0.1em", "0.02em"])

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
      className="relative group"
      whileHover={{
        scale: 1.08,
        letterSpacing: "0.15em",
      }}
    >
      <motion.div
        style={{
          opacity: useTransform(progress, [range[0] + 0.05, range[0] + 0.15], [0, isYellow ? 0.4 : 0.2]),
        }}
        className="absolute inset-0 -z-10 scale-150 blur-3xl"
      >
        <div className={`w-full h-full ${isYellow ? "bg-[#F2B200]" : "bg-[#F2B200]"} rounded-[50%]`} />
      </motion.div>

      <motion.p
        style={{
          letterSpacing: letterSpacing1,
        }}
        className={`text-3xl md:text-5xl lg:text-7xl font-bold text-center leading-tight flex items-center justify-center ${
          isYellow ? "text-[#F2B200]" : "text-[#0B1220]"
        }`}
        whileHover={{
          opacity: 0.9,
          scale: 1.02,
        }}
      >
        {text.split("").map((char: string, i: number) => (
          <AnimatedLetter key={i} char={char} i={i} progress={progress} range={range} isYellow={isYellow} />
        ))}
      </motion.p>
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
      {char === " " ? "\u00A0" : char}
    </motion.span>
  )
}
