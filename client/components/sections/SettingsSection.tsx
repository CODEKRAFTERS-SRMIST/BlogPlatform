'use client';

import { motion } from 'framer-motion';
import { Settings as SettingsIcon, LogOut, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { authApi, handleApiError } from '@/lib/api';
import { useState } from 'react';

interface SettingsSectionProps {
  showPasswordChange: boolean;
  setShowPasswordChange: (show: boolean) => void;
}

export default function SettingsSection({ 
  showPasswordChange, 
  setShowPasswordChange 
}: SettingsSectionProps) {
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
      logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      logout();
      window.location.href = '/';
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);

    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess('');
        setShowPasswordChange(false);
      }, 3000);
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setPasswordError(errorMsg);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="w-full max-w-4xl"
    >
      <motion.h1 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="text-4xl md:text-5xl font-black text-gray-900 flex items-center gap-4 mb-12"
      >
        <SettingsIcon className="text-[#f5b800] w-8 h-8 md:w-10 md:h-10" />
        Settings
      </motion.h1>

      <div className="space-y-6">
        {/* User Profile Info */}
        {user && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-lg border border-gray-200/50"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <User size={24} /> Profile Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f5b800] to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{user.name || 'User'}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Mail size={14} /> {user.email}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Change Password Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-lg border border-gray-200/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Lock size={24} /> Change Password
            </h2>
            {!showPasswordChange && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPasswordChange(true)}
                className="px-4 py-2 bg-[#f5b800] text-white rounded-xl font-bold hover:bg-[#e5a800] transition-colors"
              >
                Change Password
              </motion.button>
            )}
          </div>

          {showPasswordChange && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handlePasswordChange}
              className="space-y-4"
            >
              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
                >
                  {passwordError}
                </motion.div>
              )}

              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl"
                >
                  {passwordSuccess}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    required
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#f5b800] transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#f5b800] transition-colors"
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#f5b800] transition-colors"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={changingPassword}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-[#f5b800] text-white py-3 rounded-xl font-bold hover:bg-[#e5a800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changingPassword ? 'Changing...' : 'Update Password'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.form>
          )}

          {!showPasswordChange && (
            <p className="text-gray-600 text-sm">
              Keep your account secure by regularly updating your password.
            </p>
          )}
        </motion.div>

        {/* Logout Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-red-50 to-red-100/50 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-lg border border-red-200/50"
        >
          <h2 className="text-2xl font-bold text-red-900 mb-6 flex items-center gap-3">
            <LogOut size={24} /> Sign Out
          </h2>

          <p className="text-gray-700 mb-6">
            Sign out from your account. You'll need to log in again to access your content.
          </p>
          
          <motion.button
            onClick={handleLogout}
            disabled={loggingOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full md:w-auto bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white font-black py-3 px-8 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-3"
          >
            <LogOut size={18} /> {loggingOut ? 'Logging out...' : 'Logout'}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}