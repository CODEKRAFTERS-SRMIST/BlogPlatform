"use client"

import {
  motion,
  useScroll,
  useSpring,
  AnimatePresence,
  useVelocity,
  useMotionValue,
  useAnimationFrame,
  useInView,
} from "framer-motion"
import { Reveal } from "@/components/landing/Reveal"
import { Magnetic } from "@/components/landing/Magnetic"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, PenTool, Eye, Send, Heart, MessageCircle, Hand } from "lucide-react"
import { blogApi, Post } from "@/lib/api"

/*
 * The three stock-photo steps are the fallback now, not the main event.
 *
 * They describe the workflow to somebody who has never seen the site, which
 * is worth having when the deck below has nothing to show - a brand new
 * install, or an API that is not answering. Any other time the section shows
 * the club's real published stories instead, which say the same thing and
 * are true.
 */
const FEATURES = [
  {
    title: "Write Freely",
    description: "Draft blogs with a clean editor built for long-form thinking and creative flow.",
    image: "/minimalist-writing-interface.jpg",
    icon: PenTool,
  },
  {
    title: "Review Together",
    description: "Review with leads get their feedback incorporated seamlessly before publishing.",
    image: "/team-collaboration-review.jpg",
    icon: Eye,
  },
  {
    title: "Publish with Intent",
    description: "Blogs go live for everyone to read, engage, and share with the world.",
    image: "/digital-publishing-launch.jpg",
    icon: Send,
  },
]

const FALLBACK_COVER = "/abstract-editorial-graphic.jpg"

export default function BlogLoopSection() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [isHolding, setIsHolding] = useState(false)

  // The newest handful of published stories, straight from the public feed.
  // /blogs/public needs no session, so a visitor who has never signed in
  // still gets the real thing.
  useEffect(() => {
    let cancelled = false
    blogApi
      .getAllPosts(1, 6)
      .then((fetched) => {
        if (!cancelled && Array.isArray(fetched)) setPosts(fetched)
      })
      .catch(() => {
        // Leaves the deck empty, which falls back to the workflow cards.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const deck = posts.length > 0 ? posts : null
  const cycleLength = deck ? deck.length : FEATURES.length

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const scrollVelocity = useVelocity(scrollYProgress)
  const smoothVelocity = useSpring(scrollVelocity, {
    stiffness: 100,
    damping: 30,
  })

  /*
   * The ring's progress is a motion value, and the clock only runs while this
   * section is on screen and nobody is holding a card.
   *
   * It used to be React state written from a requestAnimationFrame loop: a
   * setState per frame, so this section - card, image, ring, the lot - was
   * re-rendered sixty times a second, for the entire time the page was open,
   * including the whole time it sat below the fold. That is the landing
   * page's lag. A motion value goes straight to the SVG attribute and
   * re-renders nothing; the only React update left is the one that advances
   * the deck, every few seconds.
   */
  const ringProgress = useMotionValue(0)
  const cycle = useRef(0)
  const isInView = useInView(containerRef, { amount: 0.2 })

  useAnimationFrame((_, delta) => {
    if (!isInView || isHolding) return

    const velocity = Math.abs(smoothVelocity.get())
    const speedMultiplier = 1 + velocity * 10 // scrolling spins it faster
    cycle.current += (delta * speedMultiplier) / 5000 // ms per card

    if (cycle.current >= 1) {
      cycle.current = 0
      setActiveIndex((prev) => (prev + 1) % cycleLength)
    }

    ringProgress.set(cycle.current)
  })

  const advance = () => {
    cycle.current = 0
    ringProgress.set(0)
    setActiveIndex((prev) => (prev + 1) % cycleLength)
  }

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen bg-[#FEF0D8] flex flex-col md:flex-row items-center px-6 md:px-24 py-20 overflow-hidden"
    >
      {/* LEFT CONTENT */}
      <div className="w-full md:w-1/2 space-y-10 z-20 mb-16 md:mb-0">
        <div className="space-y-4">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4 }}
            className="block text-[#F2B200] font-mono text-sm tracking-[0.3em] uppercase"
          >
            {deck ? "Fresh off the board" : "Workflow"}
          </motion.span>
          <Reveal
            text="Explore Blogs"
            accent="Blogs"
            accentClassName="text-[#F2B200] italic"
            delay={0.05}
            className="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter text-[#0B1220] uppercase"
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-lg md:text-xl text-[#0B1220]/60 max-w-md leading-relaxed"
        >
          {deck
            ? "Everything on the right is live - the newest stories the club has published. Flick through them, then read the rest."
            : "Experience a focused writing → review → publish workflow designed for modern editorial teams."}
        </motion.p>

        <Magnetic>
        <motion.button
          onClick={() => router.push('/blogs')}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="group relative flex items-center gap-6 px-12 py-6 bg-[#0B1220] text-white font-black rounded-full text-lg uppercase tracking-widest overflow-hidden transition-transform hover:scale-105 active:scale-95"
        >
          <span className="relative z-10">Explore Now</span>
          <ArrowRight className="relative z-10 w-6 h-6 group-hover:translate-x-2 transition-transform" />
          <div className="absolute inset-0 bg-[#F2B200] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </motion.button>
        </Magnetic>
      </div>

      {/* RIGHT ANIMATED AREA */}
      <div className="relative w-full md:w-1/2 h-[560px] sm:h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] sm:w-[380px] h-[460px] sm:h-[520px] border-2 border-[#0B1220]/5 rounded-[3rem] rotate-6 translate-x-8 translate-y-8" />
          <div className="w-[300px] sm:w-[380px] h-[460px] sm:h-[520px] border-2 border-[#0B1220]/5 rounded-[3rem] rotate-3 translate-x-4 translate-y-4" />
          <div className="w-[300px] sm:w-[380px] h-[460px] sm:h-[520px] border-2 border-[#0B1220]/5 rounded-[3rem] -rotate-3 -translate-x-4 -translate-y-4" />
        </div>

        {deck ? (
          <StoryDeck
            posts={deck}
            activeIndex={activeIndex}
            onFlick={advance}
            onHoldChange={setIsHolding}
            onOpen={() => router.push("/blogs")}
          />
        ) : (
          <AnimatePresence mode="wait">
            <FeatureCard key={activeIndex} feature={FEATURES[activeIndex]} index={activeIndex} />
          </AnimatePresence>
        )}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-[500px] h-[600px] -rotate-90 opacity-20">
            <motion.circle
              cx="250"
              cy="300"
              r="280"
              fill="none"
              stroke="#0B1220"
              strokeWidth="2"
              strokeDasharray="1 10"
              style={{ pathLength: ringProgress }}
            />
          </svg>
        </div>
      </div>

      {/* PROGRESS INDICATOR */}
      <div className="absolute bottom-12 right-6 sm:right-12 flex flex-col gap-4 items-end">
        {deck && (
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#0B1220]/40">
            <Hand className="h-3.5 w-3.5" />
            Drag a card
          </span>
        )}
        <div className="flex gap-3">
          {Array.from({ length: cycleLength }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 transition-all duration-500 rounded-full ${
                i === activeIndex ? "w-12 bg-[#0B1220]" : "w-4 bg-[#0B1220]/20"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0B1220]/40">
          {deck ? "Live" : "Step"} {String(activeIndex + 1).padStart(2, "0")} / {String(cycleLength).padStart(2, "0")}
        </span>
      </div>
    </section>
  )
}

/**
 * The newest stories, stacked like a hand of cards.
 *
 * Only three are ever in the DOM. Each card keeps its own `layout` identity,
 * so when the order rotates framer moves it from one slot to the next
 * instead of unmounting and rebuilding it - which is also why the card you
 * flick away reappears at the back of the pile rather than popping in.
 */
function StoryDeck({
  posts,
  activeIndex,
  onFlick,
  onHoldChange,
  onOpen,
}: {
  posts: Post[]
  activeIndex: number
  onFlick: () => void
  onHoldChange: (holding: boolean) => void
  onOpen: () => void
}) {
  const visible = Array.from({ length: Math.min(3, posts.length) }, (_, offset) => ({
    post: posts[(activeIndex + offset) % posts.length],
    offset,
  }))

  return (
    <div className="relative z-10 flex h-full w-full items-center justify-center">
      {/* Back to front, so the top card is last in the DOM and sits above the
          others without a z-index on every layer. */}
      {visible
        .slice()
        .reverse()
        .map(({ post, offset }) => {
          const isTop = offset === 0
          return (
            <motion.div
              key={post.id}
              layout
              initial={false}
              animate={{
                scale: 1 - offset * 0.06,
                y: offset * 18,
                x: offset * 10,
                rotate: offset * 3,
                opacity: 1 - offset * 0.25,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              drag={isTop ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragStart={() => onHoldChange(true)}
              onDragEnd={(_, info) => {
                onHoldChange(false)
                if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 500) onFlick()
              }}
              onHoverStart={() => isTop && onHoldChange(true)}
              onHoverEnd={() => isTop && onHoldChange(false)}
              className={`absolute flex h-[460px] w-[300px] flex-col overflow-hidden rounded-[2.5rem] border-[8px] border-[#0B1220] bg-white shadow-[24px_24px_0px_0px_rgba(11,18,32,0.1)] sm:h-[540px] sm:w-[400px] sm:rounded-[3rem] sm:border-[10px] ${
                isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
              }`}
            >
              <StoryCardBody post={post} onOpen={onOpen} />
            </motion.div>
          )
        })}
    </div>
  )
}

function StoryCardBody({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const cover = post.image || FALLBACK_COVER
  // Always "Story" in practice: this read the first tag, and tags were never
  // stored, so every post fell through to the same fallback.
  const tag = "Story"

  return (
    <>
      <div className="relative h-[46%] overflow-hidden bg-[#FEF0D8]">
        {/* A plain <img>: covers come back as absolute R2 URLs, which would
            each need a remote pattern in next.config to go through next/image.
            `draggable={false}` keeps the browser's own image drag from
            swallowing the card's drag gesture. */}
        <img
          src={cover}
          alt=""
          loading="lazy"
          draggable={false}
          onError={(e) => {
            const img = e.currentTarget
            if (img.src.endsWith(FALLBACK_COVER)) return
            img.src = FALLBACK_COVER
          }}
          className="h-full w-full object-cover"
        />
        <span className="absolute left-5 top-5 bg-[#0B1220] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
          {tag}
        </span>
      </div>

      <div className="flex flex-grow flex-col justify-between bg-white p-6 sm:p-8">
        <div>
          <h3 className="mb-3 line-clamp-3 text-2xl font-black uppercase leading-[0.95] tracking-tight text-[#0B1220] sm:text-3xl">
            {post.title}
          </h3>
          {post.subtitle && (
            <p className="line-clamp-2 text-sm leading-relaxed text-[#0B1220]/60 sm:text-base">
              {post.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 border-t-2 border-[#0B1220]/5 pt-5">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#F2B200]">
              Written by
            </div>
            <div className="truncate text-sm font-black text-[#0B1220]">
              {post.author?.name || "A member"}
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px] font-bold text-[#0B1220]/40">
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                {post._count?.likes ?? 0}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5" />
                {post._count?.comments ?? 0}
              </span>
            </div>
          </div>

          <button
            onClick={onOpen}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0B1220] text-white transition-colors hover:bg-[#F2B200] hover:text-[#0B1220]"
            aria-label={`Read ${post.title}`}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  )
}

function FeatureCard({ feature, index }: { feature: (typeof FEATURES)[0]; index: number }) {
  const Icon = feature.icon

  return (
    <motion.div
      initial={{ x: 200, opacity: 0, rotate: 15, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, rotate: 0, scale: 1 }}
      exit={{ x: -200, opacity: 0, rotate: -15, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 20,
        mass: 1.2,
      }}
      className="absolute w-[300px] sm:w-[400px] h-[460px] sm:h-[540px] bg-white border-[8px] sm:border-[10px] border-[#0B1220]
                 rounded-[2.5rem] sm:rounded-[3rem] shadow-[24px_24px_0px_0px_rgba(11,18,32,0.1)]
                 overflow-hidden flex flex-col z-10"
    >
      {/* IMAGE SECTION */}
      <div className="relative h-[46%] overflow-hidden group">
        <img
          src={feature.image}
          alt={feature.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-6 right-6 w-14 h-14 bg-[#F2B200] border-[5px] border-[#0B1220] rounded-2xl flex items-center justify-center rotate-12 group-hover:rotate-0 transition-all duration-500 shadow-xl">
          <Icon className="w-7 h-7 text-[#0B1220]" />
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow bg-white">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[11px] font-black tracking-[0.5em] uppercase text-[#F2B200]">Phase 0{index + 1}</span>
            <div className="h-[2px] w-12 bg-[#0B1220]/10 rounded-full" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-[#0B1220] leading-none mb-5 uppercase tracking-tight">
            {feature.title}
          </h3>
          <p className="text-[#0B1220]/70 text-sm sm:text-base leading-relaxed font-medium">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  )
}
