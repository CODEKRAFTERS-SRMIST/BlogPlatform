"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion"
import { ArrowRight, Home, Globe, ExternalLink, Menu, X } from "lucide-react"

const TABS = [
  { name: "HOME", href: "/", icon: Home },
  { name: "BLOGS", href: "/blogs", icon: Globe },
  { name: "OUR CLUB", href: "https://www.codekrafters.tech/", icon: ExternalLink, external: true },
]

export function Navbar() {
  const pathname = usePathname()
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const { scrollY, scrollYProgress } = useScroll()

  /*
   * The bar sits on the page as a floating glass pill, so it needs to firm up
   * once there is content behind it - over the cream hero a faint pill reads
   * fine, over a white blog card it disappears.
   *
   * Setting state to the value it already holds is a no-op in React, so this
   * listener re-renders twice per page: once crossing 24px going down, once
   * coming back. The pill itself moves on CSS transitions rather than a
   * motion value, so none of this costs a frame while scrolling.
   */
  useMotionValueEvent(scrollY, "change", (v) => {
    const next = v > 24
    setIsScrolled((prev) => (prev === next ? prev : next))
  })

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
      {/*
       * What this pill is allowed to change when you scroll past 24px is
       * deliberately narrow: colour and shadow, nothing else.
       *
       * It used to be `transition-all` across a padding change, so crossing
       * the threshold ran 300ms of layout on a fixed element - on a phone,
       * mid-scroll, that is a stutter you can feel. The padding is fixed now,
       * so the bar never changes size and the transition is paint-only.
       *
       * The backdrop blur is the other half. Blurring whatever is behind a
       * full-width bar has to be redone every frame the page moves under it,
       * and a phone GPU feels that far more than a laptop does. Above 640px
       * it stays - it is what makes the glass read as glass. Below it the
       * background is near-opaque instead, which over a flat cream page is
       * hard to tell apart from the blur and costs nothing to scroll.
       */}
      <div
        className={`relative mx-auto flex max-w-[1400px] items-center justify-between gap-3 overflow-hidden rounded-full border py-2 pl-3 pr-2 transition-[background-color,border-color,box-shadow] duration-300 sm:backdrop-blur-xl sm:pl-4 sm:pr-3 ${
          isScrolled
            ? "border-[#0B1220]/10 bg-white/95 shadow-[0_20px_45px_-22px_rgba(11,18,32,0.45)] sm:bg-white/80"
            : "border-white/70 bg-[#FEF0D8]/95 shadow-[0_12px_32px_-20px_rgba(11,18,32,0.35)] sm:bg-[#FEF0D8]/70"
        }`}
      >
        {/* Reading progress, hugging the bottom edge of the pill. It rides a
            motion value straight to the compositor, so it never re-renders
            anything above it. */}
        <motion.div
          style={{ scaleX: scrollYProgress }}
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-gradient-to-r from-[#F2B200] via-[#F2B200] to-[#F2B200]/0"
        />

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B1220] shadow-sm sm:h-10 sm:w-10">
            <Image
              src="/ck_logo.svg"
              alt="CodeKrafters Logo"
              width={32}
              height={32}
              className="h-7 w-7 sm:h-8 sm:w-8"
              priority
            />
          </div>
          <span className="text-lg font-black tracking-tighter text-[#0B1220] sm:text-xl">
            BLOG <span className="text-[#F2B200]">SITE</span>
          </span>
        </Link>

        {/* Center Navigation - Pill Shape */}
        <div className="hidden lg:block">
          <div
            className="relative flex items-center gap-1 rounded-full bg-[#0B1220] p-1.5 shadow-inner"
            onMouseLeave={() => setHoveredTab(null)}
          >
            {TABS.map((tab) => {
              const isActive =
                tab.href === "/"
                  ? pathname === "/"
                  : !tab.external && pathname?.startsWith(tab.href);

              const isSelected = hoveredTab === tab.href || (hoveredTab === null && isActive);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  target={tab.external ? "_blank" : undefined}
                  rel={tab.external ? "noopener noreferrer" : undefined}
                  onMouseEnter={() => setHoveredTab(tab.href)}
                  className={`relative flex items-center gap-2 rounded-full px-6 py-2.5 text-[11px] font-black tracking-widest transition-colors active:scale-95 ${
                    isSelected ? "text-[#0B1220]" : "text-white/50 hover:text-white"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full bg-[#F2B200] shadow-[0_0_20px_rgba(242,178,0,0.3)]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="hidden h-11 items-center gap-2 rounded-full bg-[#0B1220] px-7 text-[11px] font-black tracking-widest text-white shadow-lg transition-all hover:bg-[#F2B200] hover:text-[#0B1220] active:scale-95 sm:flex"
          >
            LOG IN
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1220] text-white transition-transform active:scale-95 lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute top-[calc(100%+0.75rem)] left-3 right-3 overflow-hidden rounded-3xl border border-white/10 bg-[#0B1220] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] sm:left-6 sm:right-6 lg:hidden"
          >
            <motion.div
              className="flex flex-col p-4 space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  // Three rows: a 0.08s step put the last one a quarter of a
                  // second behind the tap that opened the menu.
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0
                  }
                }
              }}
            >
              {TABS.map((tab) => {
                const isActive =
                  tab.href === "/"
                    ? pathname === "/"
                    : !tab.external && pathname?.startsWith(tab.href);
                const Icon = tab.icon;

                return (
                  <motion.div
                    key={tab.href}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 28 } }
                    }}
                  >
                    <Link
                      href={tab.href}
                      target={tab.external ? "_blank" : undefined}
                      rel={tab.external ? "noopener noreferrer" : undefined}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl p-4 font-black tracking-widest transition-all ${
                        isActive
                          ? "bg-[#F2B200] text-[#0B1220]"
                          : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="relative z-10 flex w-full items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-[#0B1220]/10' : 'bg-white/5 group-hover:bg-[#F2B200]/20 group-hover:text-[#F2B200]'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {tab.name}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}

              <motion.div
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 28 } }
                }}
              >
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[#F2B200] p-4 font-black tracking-widest text-[#0B1220] shadow-[0_0_20px_rgba(242,178,0,0.2)] transition-all hover:brightness-110 active:scale-95 sm:hidden"
                >
                  LOG IN
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
