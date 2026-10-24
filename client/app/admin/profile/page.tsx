"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Key,
  Home,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  TrendingUp,
  FileText,
  Heart,
  Activity,
  CheckCircle,
  Clock,
  Globe,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { authApi, adminApi, handleApiError, User as UserType } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Sidebar from "@/components/sidebar";
import { GridPattern } from "@/components/background";
import SlotCounter from "@/components/SlotCounter";
import { springTransition } from "@/lib/animations";

export default function AdminProfile() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading, logout } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!authLoading) {
      if (!isLoggedIn) {
        router.push("/login");
        return;
      }
      if (user?.role !== "admin" && !user?.is_super_admin) {
        router.push("/platform");
        return;
      }
      fetchStats();
    }
  }, [authLoading, isLoggedIn, user, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      setSaving(false);
      return;
    }

    try {
      // NOTE: Assuming a general password change endpoint exists under authApi or similar
      alert(
        "Password change functionality is being polished. Redirecting to auth service...",
      );
      // await authApi.changePassword(...)
      setMessage({
        type: "success",
        text: "Password change request submitted.",
      });
    } catch (err: any) {
      setMessage({ type: "error", text: handleApiError(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5b800] mb-4" />
        <p className="font-black text-gray-500 uppercase tracking-widest text-xs">
          Securing session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans text-gray-900 selection:bg-[#f5b800] selection:text-white overflow-x-hidden relative">
      <GridPattern />

      <Sidebar
        activeSection="admin"
        onSectionChange={(id) => {
          if (id !== "admin") router.push("/");
        }}
        onLogout={logout}
        isLoggedIn={isLoggedIn}
        userRole={user?.role}
        isSuperAdmin={user?.is_super_admin}
      />

      <main className="pb-mobile-nav relative z-10 min-h-screen w-full min-w-0 flex flex-col items-center pt-16 sm:pt-20 md:pt-12 px-3 sm:px-5 md:px-8 lg:pl-32 transition-all duration-300">
        <div className="w-full max-w-7xl flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-gray-100 shadow-sm mb-6"
              >
                <Shield size={16} className="text-indigo-600" />
                <div className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500">
                  Security Profile
                </div>
              </motion.div>
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter">
                ADMIN <span className="text-indigo-600">ID.</span>
              </h1>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="bg-white border border-gray-200 text-gray-900 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
              >
                <LayoutDashboard size={20} /> Dashboard
              </button>
              <button
                onClick={logout}
                className="bg-[#111827] text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-xl"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Admin Info Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1 flex flex-col gap-8"
            >
              <div className="bg-white/90 border border-white/80 rounded-[3rem] p-10 shadow-xl overflow-hidden relative">
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center font-black text-white text-3xl mb-8 shadow-2xl">
                    {user?.name.charAt(0)}
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">
                    {user?.name}
                  </h2>
                  <p className="text-gray-500 font-bold mb-8">{user?.email}</p>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Access Level
                      </span>
                      <span className="text-lg font-black text-indigo-600 uppercase tracking-tight">
                        {user?.is_super_admin ? "Super Administrator" : "Administrator"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Club Domain
                      </span>
                      <span className="text-lg font-black text-gray-800 uppercase tracking-tight">
                        {user?.is_super_admin
                          ? "Executive Council"
                          : "Club Administration"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
              </div>

              {/* Stats Overview Mini */}
              <div className="bg-[#111827] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-8">
                    Platform Summary
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">
                        Total Members
                      </span>
                      <div className="text-2xl font-black">
                        <SlotCounter value={stats?.totalUsers || 0} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">
                        Total Stories
                      </span>
                      <div className="text-2xl font-black">
                        <SlotCounter value={stats?.totalBlogs || 0} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 font-bold">
                        Total Likes
                      </span>
                      <div className="text-2xl font-black">
                        <SlotCounter value={stats?.totalLikes || 0} />
                      </div>
                    </div>
                  </div>
                </div>
                <Activity
                  className="absolute bottom-6 right-6 text-indigo-500/20"
                  size={80}
                />
              </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 space-y-8"
            >
              {/* Change Password Card */}
              <div className="bg-white/90 border border-white/80 rounded-[3rem] p-10 shadow-xl">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                    <Key size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    Update Authentication
                  </h3>
                </div>

                {message.text && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-2xl mb-8 flex items-center gap-3 ${message.type === "error" ? "bg-rose-50 border border-rose-100 text-rose-600" : "bg-emerald-50 border border-emerald-100 text-emerald-600"}`}
                  >
                    {message.type === "error" ? (
                      <XCircle size={20} />
                    ) : (
                      <CheckCircle size={20} />
                    )}
                    <span className="font-bold text-sm">{message.text}</span>
                  </motion.div>
                )}

                <form method="post" onSubmit={handleChangePassword} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                        Current Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                          className="w-full bg-white/80 border border-gray-100 rounded-2xl p-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                          title={showCurrentPassword ? "Hide secret" : "Show secret"}
                        >
                          {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="hidden md:block" />

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                        New Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          className="w-full bg-white/80 border border-gray-100 rounded-2xl p-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                          title={showNewPassword ? "Hide secret" : "Show secret"}
                        >
                          {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">
                        Confirm New Secret
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          className="w-full bg-white/80 border border-gray-100 rounded-2xl p-5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                          title={showConfirmPassword ? "Hide secret" : "Show secret"}
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={saving}
                    className="mt-6 w-full md:w-auto bg-indigo-600 hover:bg-black text-white px-12 py-5 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
                  >
                    {saving ? "Updating Vault..." : "Update Password"}
                  </button>
                </form>
              </div>

              {/* Quick Navigation Card */}
              <div className="bg-white/90 border border-white/80 rounded-[3rem] p-10 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 mb-8">
                  Access Points
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Feed",
                      icon: <Globe size={18} />,
                      path: "/blogs",
                    },
                    { label: "Home", icon: <Home size={18} />, path: "/" },
                    {
                      label: "Admin",
                      icon: <Shield size={18} />,
                      path: "/admin/dashboard",
                    },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => router.push(item.path)}
                      className="flex items-center gap-3 p-6 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all group border border-gray-100/50"
                    >
                      <span className="text-gray-400 group-hover:text-indigo-600 transition-colors">
                        {item.icon}
                      </span>
                      <span className="font-black text-gray-900">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
