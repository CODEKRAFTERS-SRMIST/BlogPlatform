"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Users,
  ShieldCheck,
  UserCheck,
  Clock,
  Search,
  ArrowLeft,
  CheckCircle,
  ShieldAlert,
  AlertTriangle,
  User,
  GraduationCap,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { adminApi, handleApiError, User as ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Sidebar from "@/components/sidebar";
import AdminPipelineSection from "@/components/sections/AdminPipelineSection";
import RoleCapabilities from "@/components/RoleCapabilities";
import { GridPattern } from "@/components/background";

export default function AdminMembersPage() {
  const router = useRouter();
  const { user: currentUser, isLoggedIn, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRefresh, setReviewRefresh] = useState(0);
  const [filterTab, setFilterTab] = useState<"all" | "admin" | "member" | "pending">("all");
  // Story Review is open to every admin; Members stays super-admin only.
  const [panel, setPanel] = useState<"review" | "members">("review");

  // The dock sends you here without a tab, which lands on review. The
  // parameter is still read so older links - and the page's own tabs - can
  // ask for either panel by name.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "members" || tab === "review") setPanel(tab);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "promote" | "demote" | "approve";
    user: ApiUser | null;
  }>({
    isOpen: false,
    type: "promote",
    user: null,
  });

  const isAdmin = currentUser?.role === "admin" || Boolean(currentUser?.is_super_admin);
  const isSuperAdmin = Boolean(currentUser?.is_super_admin);

  // Any admin may review stories here; the member list stays super-admin only.
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      toast.error("Access denied: this area is for administrators.");
      router.replace("/platform");
      return;
    }
    if (isSuperAdmin) fetchUsers();
  }, [authLoading, isLoggedIn, isAdmin, isSuperAdmin, router]);

  // A plain admin has no Members tab to fall back to.
  //
  // This has to wait for the session to load. While it is still loading there
  // is no user yet, so isSuperAdmin reads false, and without the guard below
  // this effect fired first and bounced a super admin arriving on
  // ?tab=members straight back to the review panel - which is where the
  // sidebar's "Manage" button leads.
  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin && panel === "members") setPanel("review");
  }, [authLoading, isSuperAdmin, panel]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAllUsers();
      setUsers(data || []);
    } catch (err: any) {
      console.error("Failed to load members:", err);
      setError(handleApiError(err) || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalAdmins = users.filter((u) => u.role === "admin" || u.is_super_admin).length;
    const totalMembers = users.filter((u) => u.role !== "admin" && !u.is_super_admin && u.status === "approved").length;
    const pendingApprovals = users.filter((u) => u.status === "pending").length;

    return { totalUsers, totalAdmins, totalMembers, pendingApprovals };
  }, [users]);

  // Filtered and searched users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Tab filter
      if (filterTab === "admin" && u.role !== "admin" && !u.is_super_admin) return false;
      if (filterTab === "member" && (u.role === "admin" || u.is_super_admin || u.status === "pending")) return false;
      if (filterTab === "pending" && u.status !== "pending") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesRegNo = u.reg_no?.toLowerCase().includes(q);
        const matchesDomain = u.domain?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRegNo && !matchesDomain) return false;
      }

      return true;
    });
  }, [users, filterTab, searchQuery]);

  // Actions
  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminApi.approveUser(userId);
      toast.success("Member approved successfully!");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "approved" } : u))
      );
      setConfirmModal({ isOpen: false, type: "approve", user: null });
    } catch (err: any) {
      toast.error(handleApiError(err) || "Failed to approve member");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminApi.promoteUser(userId);
      toast.success("User promoted to Admin successfully!");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: "admin", status: "approved" } : u))
      );
      setConfirmModal({ isOpen: false, type: "promote", user: null });
    } catch (err: any) {
      toast.error(handleApiError(err) || "Failed to promote user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminApi.demoteUser(userId);
      toast.success("Admin demoted to Member!");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: "member" } : u))
      );
      setConfirmModal({ isOpen: false, type: "demote", user: null });
    } catch (err: any) {
      toast.error(handleApiError(err) || "Failed to demote admin");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || !isLoggedIn || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex flex-col items-center justify-center p-4">
        <GridPattern />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full border-3 border-[#f5b800]/20 border-t-[#f5b800] animate-spin" />
          <p className="text-gray-500 font-bold text-sm">Verifying administrator privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-gray-900 relative overflow-x-hidden">
      <GridPattern />

      {/* Floating Sidebar */}
      <Sidebar
        /* Both panels live behind the single Admin entry in the dock, so
           it stays lit whichever of them is open. */
        activeSection="admin_review"
        onSectionChange={(id) => {
          // Carry the chosen section across. Dropping it sent every one of
          // these to the platform's default tab first, so picking "All Blogs"
          // landed on the dashboard and needed a second click to get there.
          if (id === "admin") router.push("/admin/dashboard");
          else router.push(`/platform?section=${id}`);
        }}
        isLoggedIn={isLoggedIn}
        userRole={currentUser?.role}
        isSuperAdmin={currentUser?.is_super_admin}
      />

      <div className="pb-mobile-nav relative z-10 w-full min-w-0 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 lg:pl-24 py-5 sm:py-8 md:py-12">
        {/* Top Breadcrumb & Return to Dashboard */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 sm:mb-8">
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-black sm:text-xs"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span className="truncate">Back to Dashboard</span>
          </Link>

          <button
            onClick={() => {
              if (panel === "review") setReviewRefresh((n) => n + 1);
              else fetchUsers();
            }}
            disabled={loading}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-2.5 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm backdrop-blur transition-all hover:border-black hover:text-black sm:px-4 sm:text-xs"
          >
            <RefreshCw size={13} className={`shrink-0 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden min-[360px]:inline">Refresh</span>
            <span className="hidden sm:inline">Records</span>
          </button>
        </div>

        {/* Page Header */}
        <div className="mb-6 min-w-0 sm:mb-10">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#d97706] sm:text-[10px]">
            <ShieldCheck size={12} className="shrink-0" />
            Admin Operations
          </div>
          <h1 className="wrap-anywhere text-xl font-black leading-tight tracking-tight text-gray-900 min-[380px]:text-2xl sm:text-4xl md:text-5xl">
            {panel === "review" ? "Story Review" : "Members Management"}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] font-bold text-gray-500 sm:text-sm md:text-base">
            {panel === "review"
              ? "Read what members have submitted, then publish it or send it back with a reason."
              : "Audit club members, manage role-based permissions, and approve registration requests."}
          </p>
        </div>

        <RoleCapabilities isSuperAdmin={isSuperAdmin} />

        {/* Panel switcher */}
        <div className="mb-6 flex min-w-0 items-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-1.5 sm:mb-8">
          <button
            onClick={() => setPanel("review")}
            className={`min-w-0 flex-1 truncate rounded-xl px-2 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors sm:px-4 sm:text-sm ${
              panel === "review"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Story Review
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setPanel("members")}
              className={`min-w-0 flex-1 truncate rounded-xl px-2 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors sm:px-4 sm:text-sm ${
                panel === "members"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Members
            </button>
          )}
        </div>

        {panel === "review" && (
          <div className="mb-10">
            <AdminPipelineSection refreshSignal={reviewRefresh} />
          </div>
        )}

        {panel === "members" && isSuperAdmin && (
          <>
        {/* Stats Grid */}
        <div className="mb-6 grid min-w-0 grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 sm:gap-4 sm:mb-10 lg:grid-cols-4">
          <StatCard
            icon={<Users className="text-blue-500" size={24} />}
            label="Total Registered"
            value={stats.totalUsers}
            color="border-blue-500/20 bg-blue-50/50"
          />
          <StatCard
            icon={<ShieldCheck className="text-amber-500" size={24} />}
            label="Admins"
            value={stats.totalAdmins}
            color="border-amber-500/20 bg-amber-50/50"
          />
          <StatCard
            icon={<UserCheck className="text-emerald-500" size={24} />}
            label="Active Members"
            value={stats.totalMembers}
            color="border-emerald-500/20 bg-emerald-50/50"
          />
          <StatCard
            icon={<Clock className="text-rose-500" size={24} />}
            label="Pending Approvals"
            value={stats.pendingApprovals}
            color="border-rose-500/20 bg-rose-50/50"
          />
        </div>

        {/* Filter Tabs and Search Bar */}
        <div className="mb-6 flex min-w-0 flex-col items-stretch justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-white/85 p-3 shadow-sm sm:mb-8 sm:rounded-[2rem] sm:p-4 md:flex-row md:items-center md:p-6">
          {/* Filter Tabs */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <FilterTab
              active={filterTab === "all"}
              onClick={() => setFilterTab("all")}
              label="All Users"
              count={stats.totalUsers}
            />
            <FilterTab
              active={filterTab === "admin"}
              onClick={() => setFilterTab("admin")}
              label="Admins Only"
              count={stats.totalAdmins}
              badgeStyle="bg-amber-100 text-amber-800"
            />
            <FilterTab
              active={filterTab === "member"}
              onClick={() => setFilterTab("member")}
              label="Club Members"
              count={stats.totalMembers}
              badgeStyle="bg-slate-100 text-slate-700"
            />
            <FilterTab
              active={filterTab === "pending"}
              onClick={() => setFilterTab("pending")}
              label="Pending Approval"
              count={stats.pendingApprovals}
              badgeStyle="bg-amber-500/20 text-amber-700"
            />
          </div>

          {/* Search Box */}
          <div className="relative min-w-0 md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, reg no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-10 pr-3 text-[13px] font-bold text-gray-900 transition-all placeholder:text-gray-400 focus:border-[#f5b800] focus:outline-none focus:ring-1 focus:ring-[#f5b800]"
            />
          </div>
        </div>

        {/* Table / List Container */}
        <div className="min-w-0 overflow-hidden rounded-[1.25rem] border border-white/80 bg-white/95 shadow-xl sm:rounded-[2.5rem]">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="w-8 h-8 border-3 border-gray-300 border-t-[#f5b800] rounded-full animate-spin" />
              <p className="font-bold text-sm">Loading member records...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 font-bold">
              <AlertTriangle size={32} className="mx-auto mb-2" />
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-24 text-center text-gray-400 font-bold">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-base text-gray-600">No members found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? "Try a different search query" : "No users match this filter tab."}
              </p>
            </div>
          ) : (
            <>
            {/* Below lg a six column table can only be read by dragging it
                sideways, which at 300px means most of a row is off screen.
                The same rows become stacked cards instead; the table is kept
                for wide screens where it is genuinely easier to scan. */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {filteredUsers.map((u) => (
                <MemberCard
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUser?.id}
                  busy={actionLoading === u.id}
                  onAction={(type) => setConfirmModal({ isOpen: true, type, user: u })}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-4 px-6">Member</th>
                    <th className="py-4 px-6">Reg No</th>
                    <th className="py-4 px-6">Year & Domain</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isSuper = u.is_super_admin;
                    const isAdminUser = u.role === "admin" || isSuper;
                    const isApproved = u.status === "approved";
                    const isPending = u.status === "pending";

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-amber-50/30 transition-colors group"
                      >
                        {/* Avatar & Name */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f5b800] via-amber-500 to-orange-500 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                              {u.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-gray-900 text-sm flex items-center gap-1.5 truncate">
                                {u.name}
                                {isSelf && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 font-medium truncate">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Reg No */}
                        <td className="py-4 px-6 text-xs font-black text-gray-700 font-mono">
                          {u.reg_no || "N/A"}
                        </td>

                        {/* Year & Domain */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900">
                              {u.domain || "General"}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              Year {u.year || "1"}
                            </span>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-6">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                              <Sparkles size={11} />
                              Super Admin
                            </span>
                          ) : isAdminUser ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                              <ShieldCheck size={11} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              <User size={11} />
                              Member
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-6">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <CheckCircle size={10} />
                              Approved
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
                              <Clock size={10} />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
                              {u.status || "Unknown"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Pending User -> Approve Button */}
                            {isPending && (
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "approve",
                                    user: u,
                                  })
                                }
                                disabled={actionLoading === u.id}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                Approve Member
                              </button>
                            )}

                            {/* Approved Member -> Promote to Admin Button */}
                            {!isAdminUser && isApproved && !isSelf && (
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "promote",
                                    user: u,
                                  })
                                }
                                disabled={actionLoading === u.id}
                                className="px-3 py-1.5 bg-[#f5b800] hover:bg-[#d97706] text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                Promote to Admin
                              </button>
                            )}

                            {/* Admin (not Super Admin, not Self) -> Demote to Member Button */}
                            {isAdminUser && !isSuper && !isSelf && (
                              <button
                                onClick={() =>
                                  setConfirmModal({
                                    isOpen: true,
                                    type: "demote",
                                    user: u,
                                  })
                                }
                                disabled={actionLoading === u.id}
                                className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                Demote to Member
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
          </>
        )}

      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && confirmModal.user && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal({ isOpen: false, type: "promote", user: null })}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 w-full min-w-0 max-w-md rounded-[1.5rem] border border-gray-100 bg-white p-4 text-center shadow-2xl sm:rounded-[2rem] sm:p-6 md:p-8"
            >
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
                  confirmModal.type === "promote"
                    ? "bg-amber-100 text-amber-600"
                    : confirmModal.type === "demote"
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {confirmModal.type === "promote" ? (
                  <ShieldCheck size={28} />
                ) : confirmModal.type === "demote" ? (
                  <ShieldAlert size={28} />
                ) : (
                  <CheckCircle size={28} />
                )}
              </div>

              <h3 className="mb-2 text-lg font-black text-gray-900 sm:text-xl">
                {confirmModal.type === "promote"
                  ? "Promote to Admin?"
                  : confirmModal.type === "demote"
                  ? "Demote to Member?"
                  : "Approve Member?"}
              </h3>

              <p className="wrap-anywhere mb-5 text-[13px] font-medium leading-relaxed text-gray-500 sm:mb-6 sm:text-sm">
                {confirmModal.type === "promote" ? (
                  <>
                    Are you sure you want to promote{" "}
                    <strong className="text-gray-900">{confirmModal.user.name}</strong> to an Admin?
                    They will gain full access to review blogs and moderate users.
                  </>
                ) : confirmModal.type === "demote" ? (
                  <>
                    Are you sure you want to demote{" "}
                    <strong className="text-gray-900">{confirmModal.user.name}</strong> to a standard
                    club Member? Their admin privileges will be revoked immediately.
                  </>
                ) : (
                  <>
                    Approve registration for{" "}
                    <strong className="text-gray-900">{confirmModal.user.name}</strong>? They will be
                    able to log in and publish stories on CodeKrafters.
                  </>
                )}
              </p>

              <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, type: "promote", user: null })}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-200 sm:text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading === confirmModal.user.id}
                  onClick={() => {
                    if (confirmModal.type === "promote") handlePromote(confirmModal.user!.id);
                    else if (confirmModal.type === "demote") handleDemote(confirmModal.user!.id);
                    else handleApprove(confirmModal.user!.id);
                  }}
                  className={`flex-1 rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-wider text-white shadow-md transition-all sm:text-xs ${
                    confirmModal.type === "demote"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : confirmModal.type === "promote"
                      ? "bg-[#f5b800] hover:bg-amber-600 text-black"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {actionLoading === confirmModal.user.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * One member as a card, for screens too narrow for the table.
 *
 * Everything the table shows is here, stacked: who they are, their
 * registration number, year and department, their role and status, and
 * whichever action applies to them.
 */
function MemberCard({
  user: u,
  isSelf,
  busy,
  onAction,
}: {
  user: ApiUser;
  isSelf: boolean;
  busy: boolean;
  onAction: (type: "promote" | "demote" | "approve") => void;
}) {
  const isSuper = Boolean(u.is_super_admin);
  const isAdminUser = u.role === "admin" || isSuper;
  const isApproved = u.status === "approved";
  const isPending = u.status === "pending";

  return (
    <div className="min-w-0 p-3 transition-colors hover:bg-amber-50/30 sm:p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5b800] via-amber-500 to-orange-500 text-[13px] font-black text-white shadow-sm sm:h-11 sm:w-11 sm:text-sm">
          {u.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="wrap-anywhere text-[13px] font-black text-gray-900 sm:text-sm">
              {u.name}
            </span>
            {isSelf && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                You
              </span>
            )}
          </div>
          <div className="wrap-anywhere text-[11px] font-medium text-gray-400">
            {u.email}
          </div>

          {/* Role and status, which the table gives their own columns */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isSuper ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-700">
                <Sparkles size={9} className="shrink-0" />
                Super Admin
              </span>
            ) : isAdminUser ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800">
                <ShieldCheck size={9} className="shrink-0" />
                Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-700">
                <User size={9} className="shrink-0" />
                Member
              </span>
            )}

            {isApproved ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                <CheckCircle size={9} className="shrink-0" />
                Approved
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600">
                <Clock size={9} className="shrink-0" />
                Pending
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gray-600">
                {u.status || "Unknown"}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-gray-500">
            <span className="wrap-anywhere font-mono">{u.reg_no || "No reg no"}</span>
            <span className="text-gray-300">|</span>
            <span className="wrap-anywhere">{u.domain || "General"}</span>
            <span className="text-gray-300">|</span>
            <span>Year {u.year || "1"}</span>
          </div>

          {/* Only the action that applies is rendered, full width so it cannot
              be clipped at the narrowest widths. */}
          {isPending && (
            <button
              onClick={() => onAction("approve")}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-emerald-500 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
            >
              Approve Member
            </button>
          )}
          {!isAdminUser && isApproved && !isSelf && (
            <button
              onClick={() => onAction("promote")}
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-[#f5b800] px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-black shadow-sm transition-all hover:bg-[#d97706] active:scale-95 disabled:opacity-50"
            >
              Promote to Admin
            </button>
          )}
          {isAdminUser && !isSuper && !isSelf && (
            <button
              onClick={() => onAction("demote")}
              disabled={busy}
              className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-rose-600 transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50"
            >
              Demote to Member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col justify-between rounded-[1.25rem] border bg-white/90 p-3 shadow-sm sm:rounded-[2rem] sm:p-5 ${color}`}
    >
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2 sm:mb-3">
        <span className="min-w-0 truncate text-[9px] font-black uppercase tracking-widest text-gray-500 sm:text-[10px]">
          {label}
        </span>
        <div className="shrink-0 rounded-lg bg-white/80 p-1.5 shadow-sm sm:rounded-xl sm:p-2">{icon}</div>
      </div>
      <div className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl md:text-4xl">
        {value}
      </div>
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
  count,
  badgeStyle,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  badgeStyle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-black transition-all sm:px-4 sm:py-2.5 sm:text-xs ${
        active
          ? "bg-black text-white shadow-md shadow-black/10 scale-102"
          : "bg-white/60 text-gray-600 hover:bg-white hover:text-black border border-gray-100"
      }`}
    >
      <span className="truncate">{label}</span>
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-white/20 text-white" : badgeStyle || "bg-gray-100 text-gray-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
