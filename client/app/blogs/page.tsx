'use client';

import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, PenTool } from 'lucide-react';
import Link from 'next/link';
import { GridPattern } from '@/components/background';
import { Navbar } from '@/components/landing/navbar';
import BlogFeed from '@/components/BlogFeed';

export default function BlogsPage() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans text-gray-900 selection:bg-[#f5b800] selection:text-white overflow-x-hidden relative">
      <GridPattern />
      
      {/* Public Top Nav */}
      <Navbar />

      <main className="relative z-10 w-full flex flex-col items-center pt-24 sm:pt-28 md:pt-32 px-3 sm:px-5 md:px-8">
        <div className="w-full max-w-7xl">
          {/* Header Intro */}
          <div className="mb-10 sm:mb-16 md:mb-24 flex flex-col items-center text-center">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 mb-5 sm:mb-8"
             >
               <div className="w-2 h-2 rounded-full bg-[#f5b800]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Open Access Portal</span>
             </motion.div>
             
             <motion.h1
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-[2rem] sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] sm:leading-[0.9] text-gray-900 mb-5 sm:mb-8 break-words"
             >
               THE PUBLIC <br />
               <span className="text-amber-600">STORYBOARD.</span>
             </motion.h1>
             
             <motion.p
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="max-w-2xl text-sm sm:text-base md:text-xl text-gray-500 font-medium leading-relaxed"
             >
               Explore the collective mind of the Code Krafters community. 
               Insights, tutorials, and stories from the bridge of the digital frontier.
             </motion.p>
          </div>

          <BlogFeed />
        </div>
      </main>

      {/* Decorative Footer Detail */}
      <footer className="relative py-10 sm:py-12 border-t border-gray-100 flex flex-col items-center gap-5 sm:gap-6 px-4">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-8 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-400">
          <span>Design</span>
          <span>•</span>
          <span>Stories</span>
          <span>•</span>
          <span>Code</span>
        </div>
        <p className="text-xs font-bold text-gray-300">© 2026 CODE KRAFTERS CLUB</p>
      </footer>
    </div>
  );
}
