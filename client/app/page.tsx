"use client"

import dynamic from "next/dynamic"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"

/*
 * There is no artificial splash any more.
 *
 * This page used to hold a 1.5s timer and render nothing but LoadingPage
 * until it fired, on every new session - a second and a half of staring at a
 * loading bar for a page that had already arrived. On top of that the hero
 * was `ssr: false` and returned null until it had mounted, so the real
 * content could only begin rendering once the client bundle was in: the
 * splash was not covering work, it was adding to it. The hero is part of the
 * server-rendered HTML now and is there on the first paint.
 *
 * Everything below the fold stays split out, since none of it is on screen
 * until you scroll.
 */
const CinematicTransition = dynamic(
  () => import("@/components/landing/cinematic-transition").then((mod) => mod.CinematicTransition),
  { ssr: false },
)
const LiveStats = dynamic(() => import("@/components/landing/LiveStats"), { ssr: false })
const BlogSection = dynamic(() => import("@/components/landing/blog-section"), { ssr: false })
const Footer = dynamic(() => import("@/components/landing/Footer"), { ssr: false })

export default function Page() {
  return (
    <main className="relative w-full bg-[#FEF0D8]">
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <CinematicTransition />
        <LiveStats />
        <BlogSection />
        <Footer />
      </div>
    </main>
  )
}
