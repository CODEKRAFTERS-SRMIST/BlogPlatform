"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Feather, Users } from "lucide-react";
import SlotCounter from "@/components/SlotCounter";

interface PlatformStats {
  totalUsers: number;
  totalPublished: number;
  totalWords: number;
}

/**
 * The club's real numbers, on the way down the landing page.
 *
 * /stats/platform is one of the few endpoints that needs no session (see
 * Server/src/routes/interaction.routes.js), so a visitor who has never
 * signed in still sees live counts rather than decoration. If the API is
 * unreachable this renders nothing at all - a band of zeroes would say
 * something false about the club.
 */
export default function LiveStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("@/lib/api-client")
      .then(({ apiClient }) => apiClient.get("/stats/platform"))
      .then((res) => {
        const d = res.data?.data;
        if (cancelled || !d) return;
        setStats({
          totalUsers: d.totalUsers ?? 0,
          totalPublished: d.totalPublished ?? 0,
          totalWords: d.totalWords ?? 0,
        });
      })
      .catch(() => {
        // Offline, or the API is down: the section simply does not appear.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  const tiles = [
    { label: "Members Writing", value: stats.totalUsers, icon: Users },
    { label: "Stories Published", value: stats.totalPublished, icon: BookOpen },
    { label: "Words In Print", value: stats.totalWords, icon: Feather },
  ];

  return (
    <section className="relative z-10 bg-[#FEF0D8] px-4 pb-16 pt-4 sm:px-6 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] bg-[#0B1220] px-6 py-10 shadow-[0_40px_90px_-30px_rgba(11,18,32,0.6)] sm:rounded-[3rem] sm:px-12 sm:py-14"
      >
        {/* Static glow, not an animated one: this band is the full width of
            the page and nothing here is worth a permanent repaint. */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F2B200]/20 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#F2B200]/10 blur-[90px]" />

        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F2B200] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F2B200]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">
                  Live from the club
                </span>
              </div>
              <h2 className="max-w-xl text-3xl font-black leading-[0.95] tracking-tighter text-white sm:text-5xl">
                The numbers are <span className="text-[#F2B200]">real</span>.
              </h2>
            </div>

            <Link
              href="/register"
              className="group inline-flex w-fit items-center gap-3 rounded-full bg-[#F2B200] px-7 py-4 text-[11px] font-black uppercase tracking-widest text-[#0B1220] transition-transform hover:scale-[1.03] active:scale-95"
            >
              Add your story
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-[#F2B200]/30 sm:rounded-[2rem] sm:p-8"
              >
                <tile.icon className="mb-5 h-5 w-5 text-[#F2B200]" />
                <div className="flex text-3xl font-black text-white sm:text-4xl">
                  <SlotCounter value={tile.value} />
                </div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                  {tile.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
