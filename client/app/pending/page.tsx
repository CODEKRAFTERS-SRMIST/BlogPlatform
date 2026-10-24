"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, ArrowLeft, Globe, ShieldAlert, ShieldX } from "lucide-react";
import { GridPattern } from "@/components/background";

/**
 * Two states, one page.
 *
 * Waiting for approval and having been turned down are different things, and
 * were being told the same story: this page said "an admin needs to approve
 * your account" to everybody who reached it. For somebody whose registration
 * was refused that is not merely wrong, it is advice to keep waiting for
 * something that is not coming. The server now names which it is, and the
 * api client sends people here with it.
 */
function PendingContent() {
  const rejected = useSearchParams().get("status") === "rejected";

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans text-gray-900 overflow-hidden relative flex items-center justify-center p-4">
      <GridPattern />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="bg-white/90 border border-white/80 shadow-[0_40px_80px_-25px_rgba(0,0,0,0.15)] rounded-[3rem] p-8 md:p-12 overflow-hidden relative">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f5b800]/10 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-24 h-24 bg-[#111827] rounded-3xl flex items-center justify-center shadow-2xl mb-8 group"
            >
              {rejected ? (
                <ShieldX size={48} className="text-red-400" />
              ) : (
                <Clock size={48} className="text-[#f5b800] group-hover:rotate-12 transition-transform duration-500" />
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 border ${
                rejected ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
              }`}
            >
              <ShieldAlert size={14} className={rejected ? "text-red-600" : "text-amber-600"} />
              <span
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  rejected ? "text-red-700" : "text-amber-700"
                }`}
              >
                {rejected ? "Account Rejected" : "Account Restricted"}
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight tracking-tight px-4"
            >
              {rejected
                ? "YOUR REGISTRATION WAS NOT APPROVED."
                : "ADMIN NEED TO APPROVE YOUR ACCOUNT TO JOIN THIS!"}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-gray-500 font-medium mb-10 max-w-md leading-relaxed"
            >
              {rejected
                ? "An admin reviewed your registration and did not approve it, so this account cannot be used. If you believe that was a mistake, speak to a club admin - they can approve it from their dashboard."
                : "Since this is a club-only platform, an admin must manually verify your registration before you can start sharing stories."}
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/login"
                  className="w-full bg-[#111827] text-white py-5 px-8 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:shadow-gray-200 transition-all group"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  Back to Login
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/blogs"
                  className="w-full bg-white border border-gray-100 text-gray-900 py-5 px-8 rounded-2xl font-black flex items-center justify-center gap-3 shadow-md hover:bg-gray-50 transition-all group"
                >
                  <Globe size={20} className="text-[#f5b800]" />
                  Browse Feed
                </Link>
              </motion.div>
            </div>

{/* There is no process left to wait out once the answer is no. */}
            {!rejected && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 pt-8 border-t border-gray-100 w-full flex flex-col items-center gap-4"
            >
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expected Process</p>
              <div className="flex gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400">
                    {step}
                  </div>
                ))}
              </div>
            </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/*
 * useSearchParams has to sit inside a Suspense boundary or the build refuses
 * to prerender this page - the same shape the login page uses.
 */
export default function PendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]" />
      }
    >
      <PendingContent />
    </Suspense>
  );
}

