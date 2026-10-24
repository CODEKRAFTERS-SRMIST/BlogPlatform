"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  TrendingUp,
  ShieldCheck,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Activity,
  UserCheck,
  LayoutDashboard,
  Heart,
} from "lucide-react";
import { adminApi, handleApiError, User } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Sidebar from "@/components/sidebar";
import { GridPattern } from "@/components/background";
import SlotCounter from "@/components/SlotCounter";
import { springTransition } from "@/lib/animations";
import { AuthModal } from "@/components/AuthModal";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoggedIn, loading: authLoading, logout } = useAuth();
  const isSuperAdmin = Boolean(user?.is_super_admin);

  const [stats, setStats] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users">(
    "overview",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
      fetchData();
    }
    // user?.id rather than user: the session store hands back a fresh
    // object every time it re-checks who is signed in, which it does on
    // every tab focus. Depending on the object meant React saw a change
    // that had not happened and re-ran all of this - four requests - each
    // time you came back to the tab.
  }, [authLoading, isLoggedIn, user?.id, user?.role, user?.is_super_admin, router]);

  /**
   * Loads the four dashboard feeds independently of one another.
   *
   * They used to share a single Promise.all, so one rejection discarded the
   * whole page: an admin who is not a super admin was refused the member
   * roster and saw nothing but "Connection Failed". Each call now stands on
   * its own - whatever loads is shown, and only a complete failure counts as
   * an outage.
   */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setPartial(null);

    const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error("The server is taking too long to respond")),
            15000,
          ),
        ),
      ]);

    const [statsRes, usersRes, pendingRes] = await Promise.allSettled([
      withTimeout(adminApi.getStats()),
      withTimeout(adminApi.getAllUsers()),
      withTimeout(adminApi.getPendingUsers()),
    ]);

    if (statsRes.status === "fulfilled") setStats(statsRes.value);
    if (usersRes.status === "fulfilled") setAllUsers(usersRes.value || []);
    if (pendingRes.status === "fulfilled") setPendingUsers(pendingRes.value || []);

    const results: Array<[string, PromiseSettledResult<any>]> = [
      ["statistics", statsRes],
      ["the member list", usersRes],
      ["pending registrations", pendingRes],
    ];
    const failures = results.filter(([, r]) => r.status === "rejected");

    if (failures.length === results.length) {
      const reason = (failures[0][1] as PromiseRejectedResult).reason;
      console.error("Failed to fetch admin data:", reason);
      setError(
        handleApiError(reason) || reason?.message || "Failed to load dashboard data",
      );
    } else if (failures.length > 0) {
      failures.forEach(([label, r]) =>
        console.warn(
          `Admin dashboard: could not load ${label}`,
          (r as PromiseRejectedResult).reason,
        ),
      );
      setPartial(
        `Could not load ${failures.map(([l]) => l).join(" or ")}. Everything else below is current.`,
      );
    }

    setLoading(false);
  };

  const handlePromoteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.promoteUser(userId);
      const refreshedUsers = await adminApi.getAllUsers();
      setAllUsers(refreshedUsers);
      toast.success("User promoted to admin!");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemoteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.demoteUser(userId);
      const refreshedUsers = await adminApi.getAllUsers();
      setAllUsers(refreshedUsers);
      toast.success("User demoted to member!");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.approveUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setStats((prev: any) => ({
        ...prev,
        pendingUsers: prev.pendingUsers - 1,
        approvedUsers: prev.approvedUsers + 1,
      }));
      // Refresh all users to update their status tag
      const refreshedUsers = await adminApi.getAllUsers();
      setAllUsers(refreshedUsers);
      toast.success("User approved successfully!");
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5b800] mb-4" />
        <p className="font-black text-gray-500 uppercase tracking-widest text-xs">
          Accessing Control Center...
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f5b800] mb-4" />
        <p className="font-black text-gray-500 uppercase tracking-widest text-xs">
          Accessing Control Center...
        </p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white/90 border border-rose-100 p-12 rounded-[3rem] shadow-xl max-w-lg">
          <XCircle size={64} className="text-rose-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">
            Connection Failed
          </h2>
          <p className="text-gray-500 font-bold mb-10 leading-relaxed">
            {error}
          </p>
          <button
            onClick={fetchData}
            className="bg-amber-600 hover:bg-black text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-amber-100"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] font-sans text-gray-900 selection:bg-[#f5b800] selection:text-white overflow-x-hidden relative">
      <GridPattern />

      <Sidebar
        activeSection="admin"
        onSectionChange={(id) => {
          if (id !== "admin") {
            router.push(`/platform?section=${id}`);
          }
        }}
        onLogout={logout}
        isLoggedIn={isLoggedIn}
        userRole={user?.role}
        isSuperAdmin={user?.is_super_admin}
      />

      <main className="pb-mobile-nav relative z-10 min-h-screen w-full min-w-0 flex flex-col items-center pt-16 sm:pt-20 md:pt-12 px-3 sm:px-5 md:px-8 lg:pl-32 transition-all duration-300">
        <div className="w-full min-w-0 max-w-7xl flex flex-col gap-4 sm:gap-6 md:gap-8">
          {/* Hero Section - Admin Style */}
          <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/90 border border-white/70 shadow-[0_40px_80px_-25px_rgba(0,0,0,0.1)]">
            {/* Static: an animated blurred layer forces a full repaint of the
                card behind it on every frame, permanently. */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl" />

            <div className="relative z-10 min-w-0 p-4 sm:p-7 md:p-12">
              <div className="flex min-w-0 flex-col lg:flex-row gap-6 sm:gap-9 lg:gap-12 items-start justify-between">
                <div className="min-w-0 flex-1">
                  <motion.div
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-amber-50 border border-amber-100 shadow-sm mb-4 sm:mb-8"
                  >
                    <ShieldCheck size={14} className="shrink-0 text-amber-600" />
                    <div className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-700">
                      Administrative Vault
                    </div>
                  </motion.div>

                  <motion.h1
                    initial={{ y: 26, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="wrap-anywhere text-[1.75rem] min-[380px]:text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] sm:leading-[0.9] text-gray-900 tracking-tighter"
                  >
                    MANAGE YOUR <br />
                    <span className="text-amber-600">CLUB.</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8 text-xl text-gray-500 font-medium max-w-xl leading-relaxed"
                  >
                    Welcome back,{" "}
                    <span className="text-black font-black whitespace-nowrap">
                      {user?.name}
                    </span>
                    . You have{" "}
                    <span className="text-amber-600 font-black">
                      {stats?.pendingUsers} pending approvals
                    </span>{" "}
                    awaiting your signature.
                  </motion.p>
                </div>

                <div className="w-full min-w-0 lg:w-[400px] grid grid-cols-1 min-[380px]:grid-cols-2 gap-2.5 sm:gap-4">
                  {[
                    {
                      label: "Total Members",
                      value: stats?.totalUsers,
                      icon: <Users />,
                      color: "text-blue-500",
                    },
                    {
                      label: "Total Stories",
                      value: stats?.totalBlogs,
                      icon: <FileText />,
                      color: "text-amber-500",
                    },
                    {
                      label: "Total Likes",
                      value: stats?.totalLikes,
                      icon: <Heart />,
                      color: "text-rose-500",
                    },
                    {
                      label: "Comments",
                      value: stats?.totalComments,
                      icon: <Activity />,
                      color: "text-emerald-500",
                    },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-white/80 p-6 rounded-[2rem] border border-white shadow-lg flex flex-col items-center text-center gap-1 hover:border-amber-200 transition-all group"
                    >
                      <div
                        className={`p-3 rounded-xl bg-gray-50 mb-2 group-hover:scale-110 transition-transform ${s.color}`}
                      >
                        {s.icon}
                      </div>
                      <div className="text-2xl md:text-3xl font-black text-gray-900">
                        <SlotCounter value={s.value || 0} />
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        {s.label}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {partial && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <XCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-sm font-bold leading-relaxed text-amber-800">
                {partial}{" "}
                <button onClick={fetchData} className="underline hover:no-underline">
                  Try again
                </button>
              </p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex min-w-0 gap-2 sm:gap-4 overflow-x-auto pb-2 no-scrollbar">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: <LayoutDashboard size={18} />,
              },
              { id: "users", label: "Members", icon: <Users size={18} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-black transition-all whitespace-nowrap sm:gap-3 sm:px-8 sm:py-4 sm:text-base ${
                  activeTab === tab.id
                    ? "bg-amber-600 text-white shadow-xl shadow-amber-200 -translate-y-1"
                    : "bg-white/70 text-gray-500 hover:bg-white hover:text-amber-600 border border-white/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* A plain conditional, not <AnimatePresence mode="wait">: that
              held the tab you clicked back until the one you were leaving had
              animated out, which on a phone reads as the tab being ignored.
              See the same note in components/sections/BlogPlatform.tsx. */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8"
            >
              {/* Approval Alerts Section */}
              <div className="bg-white/90 border border-white/80 rounded-[3rem] p-8 md:p-10 shadow-xl relative overflow-hidden h-full">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black flex items-center gap-3">
                    <UserCheck className="text-amber-600" />
                    Pending Approval
                  </h2>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">
                    {pendingUsers.length} Requests
                  </span>
                </div>

                <div className="space-y-4">
                  {pendingUsers.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                      <CheckCircle size={48} className="mx-auto mb-4" />
                      <p className="font-black text-sm uppercase tracking-widest">
                        Queue Clear
                      </p>
                    </div>
                  ) : (
                    pendingUsers.map((u) => (
                      <div
                        key={u.id}
                        className="bg-white/50 p-6 rounded-3xl border border-white flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center font-black text-amber-600 text-lg">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-gray-900">
                              {u.name}
                            </div>
                            <div className="text-xs text-gray-400 font-bold tracking-tight">
                              {u.reg_no} • {u.domain}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveUser(u.id)}
                          disabled={actionLoading === u.id}
                          className="bg-amber-600 hover:bg-black text-white px-6 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                        >
                          Approve
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Story review now lives on the Manage page, so admins
                  approve and reject in one place instead of two. */}
              <div className="bg-white/70 border border-white/80 rounded-[3rem] p-8 md:p-10 shadow-xl relative overflow-hidden h-full flex flex-col items-start justify-center gap-4">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <Clock className="text-[#f5b800]" />
                  Story Submissions
                </h2>
                <p className="text-gray-500 font-bold text-sm max-w-sm">
                  {stats?.pendingBlogs
                    ? `${stats.pendingBlogs} ${stats.pendingBlogs === 1 ? "story is" : "stories are"} waiting for review.`
                    : "Nothing is waiting for review right now."}
                </p>
                <Link
                  href="/admin/members?tab=review"
                  className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-[#f5b800]"
                >
                  Open Story Review
                </Link>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="bg-white/90 border border-white/80 rounded-[3rem] p-8 md:p-10 shadow-xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <h2 className="text-3xl font-black text-gray-900">
                  Member Directory
                </h2>
                <div className="relative flex-1 max-w-md">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, reg_no, domain..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="-mx-3 overflow-x-auto px-3 md:-mx-10 md:px-10">
                <table className="w-full text-left min-w-[440px] md:min-w-0">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 border-b border-gray-100">
                      <th className="pb-6 pr-4">Member Info</th>
                      <th className="pb-6 pr-4 hidden md:table-cell">College Context</th>
                      <th className="pb-6 pr-4">Status</th>
                      <th className="pb-6 pr-4 hidden md:table-cell">Joined</th>
                      <th className="pb-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allUsers
                      .filter(
                        (u) =>
                          u.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          u.email
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()) ||
                          u.reg_no?.includes(searchQuery),
                      )
                      .map((u) => (
                        <tr
                          key={u.id}
                          className="group hover:bg-amber-50/30 transition-colors"
                        >
                          <td className="py-4 md:py-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gray-100 flex items-center justify-center font-black text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-all text-sm md:text-base shrink-0">
                                {u.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-gray-900 text-sm md:text-base truncate">
                                  {u.name}
                                </div>
                                <div className="text-[10px] md:text-xs text-gray-400 font-bold truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 md:py-6 pr-4 hidden md:table-cell">
                            <div className="text-sm font-black text-gray-700">
                              {u.reg_no}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {u.domain} • Year {u.year}
                            </div>
                          </td>
                          <td className="py-4 md:py-6 pr-4">
                            <span
                              className={`inline-block px-2 md:px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
                                u.status === "approved"
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : u.status === "rejected"
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}
                            >
                              {u.status === "pending_review" ? "Review" : u.status}
                            </span>
                          </td>
                          <td className="py-4 md:py-6 pr-4 text-xs md:text-sm text-gray-500 font-medium hidden md:table-cell">
                            {new Date(
                              u.created_at || "",
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-4 md:py-6 text-right">
                            {u.status === "pending" && (
                              <button
                                onClick={() => handleApproveUser(u.id)}
                                className="text-amber-600 font-black text-[10px] md:text-xs hover:underline uppercase tracking-widest whitespace-nowrap"
                              >
                                Approve
                              </button>
                            )}
                            {isSuperAdmin && u.status === "approved" && u.role === "member" && (
                              <button
                                onClick={() => handlePromoteUser(u.id)}
                                disabled={actionLoading === u.id}
                                className="text-blue-600 font-black text-[10px] md:text-xs hover:underline uppercase tracking-widest whitespace-nowrap disabled:opacity-50"
                              >
                                {actionLoading === u.id ? "..." : "Promote"}
                              </button>
                            )}
                            {isSuperAdmin && u.status === "approved" && u.role === "admin" && !u.is_super_admin && (
                              <button
                                onClick={() => handleDemoteUser(u.id)}
                                disabled={actionLoading === u.id}
                                className="text-red-500 font-black text-[10px] md:text-xs hover:underline uppercase tracking-widest whitespace-nowrap disabled:opacity-50"
                              >
                                {actionLoading === u.id ? "..." : "Demote"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

        </div>
      </main>

      <AuthModal
        isOpen={showLoginModal}
        onClose={() => router.push("/platform")}
        onSuccess={() => {
          setShowLoginModal(false);
          fetchData();
        }}
      />
    </div>
  );
}
