'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, GraduationCap, Briefcase, ChevronRight, Settings, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { authApi, devApi, handleApiError } from '@/lib/api';
import { publishAuthUser } from '@/lib/useAuth';
import {
  validateEmail,
  validateRegNo,
  validateDomain,
  normalizeEmail,
  normalizeRegNo,
  DOMAIN_OPTIONS,
} from '@/lib/validators';
import { toast } from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devUsers, setDevUsers] = useState<any[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: '',
    regNo: '',
    department: '',
    year: 1,
  });

  const fetchDevUsers = async () => {
    setDevLoading(true);
    try {
      const users = await devApi.getAllUsers();
      setDevUsers(users);
    } catch (err) {
      console.error('Failed to fetch dev users:', err);
    } finally {
      setDevLoading(false);
    }
  };

  useEffect(() => {
    if (showDevPanel && isOpen) {
      fetchDevUsers();
    }
  }, [showDevPanel, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });
      publishAuthUser(response.user as any);

      try {
        localStorage.setItem('auth_changed', String(Date.now()));
      } catch {
        // tab sync is optional
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const checks = [
      validateEmail(formData.email),
      validateRegNo(formData.regNo),
      validateDomain(formData.department),
    ];
    const failed = checks.find((c) => !c.valid);
    if (failed) {
      const errorMsg = failed.error || 'Please check the details you entered';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);

    try {
      await authApi.signup({
        ...formData,
        email: normalizeEmail(formData.email),
        regNo: normalizeRegNo(formData.regNo),
      } as any);
      setMode('login');
      setError('Registration successful! Use the dev panel below to approve your account.');
      if (showDevPanel) fetchDevUsers();
    } catch (err: any) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    try {
      await devApi.updateUserStatus(id, nextStatus);
      fetchDevUsers();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Decorative Side Panel */}
        <div className="hidden md:flex w-40 bg-gradient-to-b from-[#f5b800] via-amber-500 to-orange-600 flex-col items-center justify-center p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] border-[20px] border-white rounded-full animate-pulse" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-inner">
              <User size={32} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-xs uppercase tracking-[0.3em]">Code<br/>Krafter</h3>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-10 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black text-white mb-2">
                {mode === 'login' ? 'Welcome Back' : 'Join the Force'}
              </h2>
              <p className="text-white/60 text-sm font-medium">
                {mode === 'login' ? 'Sign in to your account' : 'Create your creative identity'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-2xl mb-8 border border-white/10">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === 'login' ? 'bg-[#f5b800] text-black shadow-lg shadow-[#f5b800]/20' : 'text-white/60 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                mode === 'signup' ? 'bg-[#f5b800] text-black shadow-lg shadow-[#f5b800]/20' : 'text-white/60 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl text-sm font-bold mb-6 flex items-center gap-3 border ${
                  error.includes('successful') 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full animate-pulse ${error.includes('successful') ? 'bg-green-400' : 'bg-red-400'}`} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form method="post" onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputGroup icon={<User size={18}/>} name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} />
                <InputGroup icon={<Briefcase size={18}/>} name="username" placeholder="Username" value={formData.username} onChange={handleChange} />
                <InputGroup icon={<GraduationCap size={18}/>} name="regNo" placeholder="Registration No" value={formData.regNo} onChange={handleChange} />
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#f5b800] transition-colors">
                    <Settings size={18} />
                  </div>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-[#f5b800] focus:ring-1 focus:ring-[#f5b800] transition-all appearance-none text-sm ${formData.department ? 'text-white' : 'text-white/20'}`}
                  >
                    <option value="" disabled className="text-gray-900">Department</option>
                    {DOMAIN_OPTIONS.map((option) => (
                      <option key={option} value={option} className="text-gray-900">
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2 relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#f5b800] transition-colors">
                    <Clock size={18} />
                  </div>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-[#f5b800] focus:ring-1 focus:ring-[#f5b800] transition-all appearance-none"
                  >
                    {[1,2,3,4,5].map(y => <option key={y} value={y} className="bg-zinc-900">{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>)}
                  </select>
                </div>
              </div>
            )}

            <InputGroup icon={<Mail size={18}/>} type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} />
            <InputGroup 
              icon={<Lock size={18}/>} 
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={handleChange} 
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/40 hover:text-white transition-colors p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl hover:shadow-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Unlock Account' : 'Initialize Profile'}
                  <ChevronRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Dev Approval Panel */}
          <div className="mt-10 border-t border-white/10 pt-6">
            <button 
              onClick={() => setShowDevPanel(!showDevPanel)}
              className="flex items-center gap-2 text-white/40 hover:text-[#f5b800] text-[10px] font-black uppercase tracking-widest transition-colors mb-4"
            >
              <Settings size={12} className={showDevPanel ? 'animate-spin-slow' : ''} />
              Developer Tools
            </button>

            <AnimatePresence>
              {showDevPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                    <div className="flex justify-between items-center mb-2">
                       <h4 className="text-[10px] font-bold text-white/40 uppercase">Registration Pipeline</h4>
                       <button onClick={fetchDevUsers} className="text-[10px] text-[#f5b800] hover:underline">Refresh</button>
                    </div>
                    
                    {devLoading ? (
                       <p className="text-[10px] text-white/30 italic text-center py-4">Scanning records...</p>
                    ) : devUsers.length === 0 ? (
                       <p className="text-[10px] text-white/30 italic text-center py-4">No pending registrations found.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {devUsers.map((u: any) => (
                          <div key={u.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{u.email}</span>
                              <span className={`text-[8px] font-black uppercase flex items-center gap-1 ${u.status === 'approved' ? 'text-green-400' : 'text-amber-400'}`}>
                                {u.status === 'approved' ? <CheckCircle size={8} /> : <Clock size={8} />}
                                {u.status}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApprove(u.id, u.status)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                                u.status === 'approved' 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                : 'bg-[#f5b800] text-black hover:scale-105 active:scale-95'
                              }`}
                            >
                              {u.status === 'approved' ? 'Revoke' : 'Approve'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputGroup({ icon, type = "text", rightElement, ...props }: any) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#f5b800] transition-colors">
        {icon}
      </div>
      <input
        type={type}
        className={`w-full bg-white/5 border border-white/10 text-white pl-12 ${rightElement ? 'pr-11' : 'pr-4'} py-3.5 rounded-2xl focus:outline-none focus:border-[#f5b800] focus:ring-1 focus:ring-[#f5b800] transition-all placeholder:text-white/20 text-sm`}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
