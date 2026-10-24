"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { authApi } from "@/lib/api";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  reg_no: string;
  year: string;
  domain: string;
  role: string;
  status: string;
  created_at: string;
}

interface UserStats {
  blogCount: number;
  likesGiven: number;
  commentsCount: number;
}

export default function MemberProfile() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    year: "",
    domain: "",
  });
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
    const loadUser = async () => {
      try {
        const userData = await authApi.getMe();
        if (userData.role !== "member") {
          if (userData.role === "admin") {
            router.push("/admin/profile");
          } else {
            router.push("/login");
          }
          return;
        }
        setUser(userData as UserProfile);
        setFormData({
          name: userData.name,
          email: userData.email,
          year: userData.year || "",
          domain: userData.domain || "",
        });
        fetchStats(userData.id);
      } catch {
        router.push("/login");
      }
    };
    loadUser();
  }, [router]);

  const fetchStats = async (userId: string) => {
    try {
      const res = await api.get<{ success: boolean; data: UserStats }>(`/users/${userId}/stats`);
      setStats(res.data?.data || null);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    setMessage({ type: "success", text: "Profile updated successfully!" });
    setEditMode(false);
    setSaving(false);
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

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      setSaving(false);
      return;
    }

    try {
      await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error?.message || "Failed to change password" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with logout even if API call fails
    }
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition"
            >
              ← Home
            </Link>
            <span>Welcome, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="pb-mobile-nav max-w-6xl mx-auto min-w-0 px-3 sm:px-4 pt-6 sm:pt-8">
        {message.text && (
          <div className={`${message.type === "error" ? "bg-red-100 border-red-400 text-red-700" : "bg-green-100 border-green-400 text-green-700"} border rounded-lg p-4 mb-6`}>
            {message.text}
          </div>
        )}

        {/* User Stats */}
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl shadow-lg p-6 text-white mb-6">
          <h2 className="text-xl font-bold mb-4">📈 My Activity Stats</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{stats?.blogCount || 0}</p>
              <p className="text-green-100">My Blogs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">{stats?.likesGiven || 0}</p>
              <p className="text-green-100">Likes Given</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">{stats?.commentsCount || 0}</p>
              <p className="text-green-100">Comments</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Profile Information</h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="text"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:bg-gray-400 transition"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registration Number</p>
                  <p className="font-medium">{user?.reg_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Year</p>
                  <p className="font-medium">{user?.year || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Domain</p>
                  <p className="font-medium">{user?.domain || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6">Change Password</h2>
            <form method="post" onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 pr-11 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 pr-11 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 pr-11 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium disabled:bg-gray-400 transition"
              >
                {saving ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/"
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-4 rounded-lg text-center font-medium transition"
            >
              📝 Read Feed
            </Link>
            <Link
              href="/blogs"
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-4 rounded-lg text-center font-medium transition"
            >
              📖 Browse Blogs
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100 text-red-700 p-4 rounded-lg text-center font-medium transition"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
