"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ChevronRight, User, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi, handleApiError, getAccountStandingFromError } from "@/lib/api";
import { publishAuthUser, useAuth, refreshAuth, homeFor, User as AuthUser } from "@/lib/useAuth";
import { resetSignedOutLatch } from "@/lib/api-client";
import { GridPattern } from "@/components/background";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const reason = searchParams.get("reason");

  const { user: activeUser, isLoggedIn, loading: authLoading } = useAuth();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Registration successful! Please wait for admin approval before logging in.");
    }
  }, [searchParams]);

  /**
   * Somebody who is already signed in has no business on the login form, so
   * send them home.
   *
   * This reads the shared session store rather than calling /auth/me itself.
   * When it had its own copy, this page and the page it redirected to could
   * disagree about who was signed in, and bounced the user back and forth
   * between /login and /admin/dashboard - the flicker with the black screen.
   * One store means one answer.
   */
  useEffect(() => {
    if (authLoading || !isLoggedIn || !activeUser) return;
    router.replace(homeFor(activeUser));
  }, [authLoading, isLoggedIn, activeUser, router]);

  // Another tab signing in should move this one too.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_changed" && e.newValue) refreshAuth();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await authApi.login(formData);
      // Announce the sign-in before navigating, or the next page reads the
      // stale "nobody is signed in" and bounces straight back here.
      publishAuthUser(response.user as unknown as AuthUser);
      // A later 401 is allowed to redirect again now that there is a session.
      resetSignedOutLatch();
      // Tells other open tabs to re-check who is signed in. Only a timestamp:
      // the session itself lives in an httpOnly cookie.
      try {
        localStorage.setItem('auth_changed', String(Date.now()));
      } catch {
        // private browsing can refuse storage; tab sync is a nicety
      }
      router.replace(homeFor(response.user));
    } catch (err: any) {
      const standing = getAccountStandingFromError(err);
      if (standing) {
        // The page reads this and says either "waiting" or "turned down",
        // rather than telling a rejected member to keep waiting.
        router.push(standing === "rejected" ? "/pending?status=rejected" : "/pending");
      } else {
        setError(handleApiError(err) || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /*
   * Nothing is drawn until we know who this is.
   *
   * The form used to render straight away while /auth/me was still in
   * flight, so an admin who landed here with a live session saw the whole
   * sign-in page - "member login" - for the length of a network round trip
   * before being sent on to the dashboard. The redirect above was already
   * correct; it just had nothing covering it.
   */
  if (authLoading || (isLoggedIn && activeUser)) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 relative overflow-hidden">
        <GridPattern />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-7 w-7 animate-spin text-[#f5b800]" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
            Checking your session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 relative overflow-hidden">
      <GridPattern />

      {/* Back to Home Link */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-black font-black uppercase tracking-widest text-xs transition-colors z-20"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-white/40 backdrop-blur-2xl border border-white/70 rounded-[3rem] shadow-[0_40px_80px_-25px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col md:flex-row min-h-[600px] z-10"
      >
        {/* Decorative Side Panel */}
        <div className="hidden md:flex w-[40%] bg-gradient-to-br from-[#f5b800] via-amber-500 to-orange-600 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] border-[20px] border-white rounded-full animate-pulse" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-8 text-center">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-inner border border-white/20"
            >
              <User size={48} strokeWidth={2.5} />
            </motion.div>
            <div className="space-y-4">
              <h3 className="font-black text-2xl uppercase tracking-[0.2em] leading-tight">CODE<br/>KRAFTER</h3>
              <p className="text-white/80 font-bold text-sm tracking-wide leading-relaxed">
                Unlock your creative vault and share your perspective with the world.
              </p>
            </div>
          </div>
        </div>

        {/* Login Form Panel */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center">
          <div className="mb-10">
            <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tighter">Welcome Back</h2>
            <p className="text-gray-500 font-bold text-lg">Sign in to continue your journey.</p>
          </div>

          <AnimatePresence mode="wait">
            {reason === 'role_changed' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-5 rounded-2xl text-sm font-bold mb-8 flex items-center gap-3 border bg-blue-500/10 border-blue-500/20 text-blue-600"
              >
                <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500" />
                Your role has been updated. Please log in again to continue.
              </motion.div>
            )}
            {(error || successMessage) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-5 rounded-2xl text-sm font-bold mb-8 flex items-center gap-3 border ${
                  successMessage 
                  ? 'bg-green-500/10 border-green-500/20 text-green-600' 
                  : 'bg-red-500/10 border-red-500/20 text-red-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full animate-pulse ${successMessage ? 'bg-green-500' : 'bg-red-500'}`} />
                {error || successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <form method="post" onSubmit={handleLogin} className="space-y-5">
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f5b800] transition-colors">
                <Mail size={20} />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-white/50 border border-gray-200 text-gray-900 pl-14 pr-6 py-4.5 rounded-[1.5rem] focus:outline-none focus:border-[#f5b800] focus:ring-1 focus:ring-[#f5b800] transition-all placeholder:text-gray-400 font-bold text-base"
              />
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#f5b800] transition-colors">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full bg-white/50 border border-gray-200 text-gray-900 pl-14 pr-14 py-4.5 rounded-[1.5rem] focus:outline-none focus:border-[#f5b800] focus:ring-1 focus:ring-[#f5b800] transition-all placeholder:text-gray-400 font-bold text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-[#1a1a1a] transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-8"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Unlock Account
                  <ChevronRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-center text-gray-500 font-bold mt-10">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#f5b800] hover:underline whitespace-nowrap">
              Initialize Profile
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5b800]" />
    </div>}>
      <LoginForm />
    </Suspense>
  );
}

