"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  FileText,
  Heart,
  PenLine,
  BookOpen,
  Feather,
  Users,
} from "lucide-react";
import { Post, Section } from "@/types/blog";
import SlotCounter from "../SlotCounter";
import { springTransition } from "@/lib/animations";
import { useAuth } from "@/lib/useAuth";

interface DashboardSectionProps {
  totalLikes: number;
  totalComments: number;
  myPosts: Post[];
  setActiveSection: (section: Section) => void;
}

export default function DashboardSection({
  totalLikes,
  totalComments,
  myPosts,
  setActiveSection,
}: DashboardSectionProps) {
  const { user } = useAuth();
  const [platformStats, setPlatformStats] = useState({
    totalUsers: 0,
    totalPublished: 0,
    totalWords: 0,
  });

  useEffect(() => {
    import("@/lib/api-client").then(({ apiClient }) => {
      apiClient.get("/stats/platform").then((res) => {
        const d = res.data?.data;
        if (d) {
          setPlatformStats({
            totalUsers: d.totalUsers ?? 0,
            totalPublished: d.totalPublished ?? 0,
            totalWords: d.totalWords ?? 0,
          });
        }
      }).catch(() => {});
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="w-full max-w-7xl flex flex-col gap-6"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-white/90 border border-white/70 shadow-[0_40px_80px_-25px_rgba(0,0,0,0.1)]">
        {/* Static on purpose: see the note in globals.css about blurred
            decoration. An endlessly moving blurred layer keeps the whole card
            repainting for as long as the page is open. */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-[250px] md:w-[420px] h-[250px] md:h-[420px] rounded-full bg-gradient-to-br from-[#f5b800]/20 to-transparent blur-3xl" />

        <div className="relative z-10 p-4 md:p-8 lg:p-14">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-16 items-start">
            {/* Hero Text */}
            <div className="flex-1 w-full">
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05, ...springTransition }}
                className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 rounded-full bg-white border border-gray-100 shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-[#f5b800] animate-pulse" />
                <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-gray-500">
                  Platform Live
                </div>
              </motion.div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    // Six words at the old 0.1s step, behind a 0.1s lead-in,
                    // meant the headline took 0.7s to finish assembling every
                    // single time this tab was opened. The cascade is still
                    // visible at 0.035s; it is just over in a fifth of that.
                    transition: { staggerChildren: 0.035, delayChildren: 0 },
                  },
                }}
                className="mt-6 md:mt-8 text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.95] text-[#111827]"
              >
                <motion.span
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: springTransition },
                  }}
                  className="inline-block mr-[0.2em]"
                >
                  SHARE
                </motion.span>
                <motion.span
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: springTransition },
                  }}
                  className="inline-block mr-[0.2em]"
                >
                  YOUR
                </motion.span>
                <br />
                <motion.span
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: springTransition },
                  }}
                  className="inline-block text-[#f5b800] mr-[0.2em]"
                >
                  STORY
                </motion.span>
                <motion.span
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: springTransition },
                  }}
                  className="inline-block mr-[0.2em]"
                >
                  TO
                </motion.span>
                <motion.span
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: springTransition },
                  }}
                  className="inline-block mr-[0.2em]"
                >
                  THE
                </motion.span>
                <br className="hidden sm:block" />
                <motion.span
                  variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1, transition: springTransition },
                  }}
                  className="inline-block"
                >
                  WORLD.
                </motion.span>
              </motion.div>

              <motion.div
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mt-6 md:mt-8 max-w-xl text-base md:text-lg lg:text-xl text-gray-500 font-medium leading-relaxed flex flex-wrap items-center gap-2"
              >
                <span className="text-black font-bold">
                  Hello {user ? user.name : "Writer"}!
                </span>
              </motion.div>

              <div className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3 md:gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveSection("new")}
                  className="relative overflow-hidden bg-[#1a1a1a] text-white px-6 md:px-8 py-4 md:py-5 rounded-2xl font-black tracking-wide shadow-xl inline-flex items-center justify-center gap-3 group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <PenLine size={20} /> Write Story
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveSection("home")}
                  className="bg-white border border-gray-200 text-gray-900 px-6 md:px-8 py-4 md:py-5 rounded-2xl font-black tracking-wide shadow-sm inline-flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <BookOpen size={20} /> Read Blogs
                </motion.button>
              </div>

              {/* Marquee */}
              <div className="mt-8 md:mt-12 overflow-hidden rounded-xl border border-gray-100 bg-white/50 w-full">
                <motion.div
                  className="flex gap-8 md:gap-12 py-3 md:py-4 px-4 md:px-6 whitespace-nowrap"
                  animate={{ x: [0, -800] }}
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {[
                    "Share Your Voice",
                    "Inspire Others",
                    "Craft Beautiful Stories",
                    "Connect with Readers",
                    "Design Your Narrative",
                    "Build Your Audience",
                  ].map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-gray-400"
                    >
                      <Feather className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#f5b800]" />{" "}
                      {t}
                    </div>
                  ))}
                  {[
                    "Share Your Voice",
                    "Inspire Others",
                    "Craft Beautiful Stories",
                    "Connect with Readers",
                    "Design Your Narrative",
                    "Build Your Audience",
                  ].map((t, i) => (
                    <div
                      key={`b-${i}`}
                      className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-gray-400"
                    >
                      <Feather className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#f5b800]" />{" "}
                      {t}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="w-full lg:w-[340px] xl:w-[380px] flex flex-col gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 }}
                className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col items-center text-center group hover:border-[#f5b800]/30 transition-colors"
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#f5b800] to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle size={28} className="md:w-8 md:h-8" />
                </div>
                <div className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-gray-400 mb-2">
                  Total Comments
                </div>
                <div className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight flex justify-center">
                  <SlotCounter value={totalComments} />
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.11 }}
                  className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-lg border border-gray-100 flex flex-col items-center justify-center gap-2 hover:border-blue-200 transition-colors"
                >
                  <FileText
                    size={20}
                    className="md:w-6 md:h-6 text-blue-500 fill-current opacity-80"
                  />
                  <div className="text-xl md:text-2xl font-black text-gray-900 flex justify-center">
                    <SlotCounter value={myPosts.length} />
                  </div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-400">
                    Stories
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-lg border border-gray-100 flex flex-col items-center justify-center gap-2 hover:border-rose-200 transition-colors"
                >
                  <Heart
                    size={20}
                    className="md:w-6 md:h-6 text-rose-500 fill-current opacity-80"
                  />
                  <div className="text-xl md:text-2xl font-black text-gray-900 flex justify-center">
                    <SlotCounter value={totalLikes} />
                  </div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-400">
                    Likes
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Count Strip */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17, ...springTransition }}
        className="bg-[#111827] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 flex flex-wrap gap-6 md:gap-8 items-center justify-around relative overflow-hidden shadow-2xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,184,0,0.15),transparent_60%)]" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#f5b800]/10 rounded-full blur-[80px]" />

        {[
          { label: "Active Writers", value: platformStats.totalUsers, icon: Users },
          { label: "Stories Published", value: platformStats.totalPublished, icon: BookOpen },
          { label: "Words Written", value: platformStats.totalWords, icon: Feather },
        ].map((stat, i) => (
          <div key={i} className="relative z-10 text-center group">
            <div className="flex items-center justify-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-[#f5b800] opacity-60" />
            </div>
            <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tight group-hover:scale-110 transition-transform duration-500 flex justify-center">
              <SlotCounter value={stat.value} />
            </div>
            <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-[0.2em] md:tracking-[0.25em]">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
