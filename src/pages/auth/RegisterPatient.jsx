import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import LiquidEther from '../../components/ui/LiquidEther';
import { authService } from '../../services/auth.service';
import {
  User, Mail, Phone, Heart, ArrowLeft,
  ChevronRight, CheckCircle2, Copy, Shield, Info, Calendar
} from 'lucide-react';

export default function RegisterPatient() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    birth_date: '',
    gender: '',
    blood_group: '',
    password: '',
    medical_history: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [copiedType, setCopiedType] = useState(null); // 'id', 'pass', 'all'

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let calculatedAge = null;
      if (formData.birth_date) {
        const today = new Date();
        const birthDate = new Date(formData.birth_date);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        calculatedAge = age;
      }

      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim(),
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        blood_group: formData.blood_group || null,
        medical_history: formData.medical_history.trim() || null,
        age: calculatedAge,
        password: formData.password.trim() || null
      };

      const response = await authService.registerPatient(payload);
      setSuccessData({
        ...response,
        password: formData.password.trim() || response.password || "Unavailable",
      });
    } catch (err) {
      console.error('Registration Error:', err);
      
      let errorMessage = 'Initialization failed. Please check your data.';
      
      // Map technical errors to cinematic "System Messages"
      const technicalMsg = (err?.message || String(err)).toLowerCase();
      
      if (technicalMsg.includes('already registered') || technicalMsg.includes('already exists')) {
        errorMessage = 'This subject is already registered in the neural database.';
      } else if (err.message) {
        errorMessage = typeof err.message === 'string' ? err.message : JSON.stringify(err.message);
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyAllCredentials = () => {
    const text = `System ID: ${successData.patient_id}\nAccess Key: ${successData.password}`;
    copyToClipboard(text, 'all');
  };

  const appleEase = [0.22, 1, 0.36, 1];

  const etherColors = isDark
    ? ["#020617", "#0f172a", "#1e293b"]
    : ["#f8fafc", "#f1f5f9", "#e2e8f0"];

  // ================= SUCCESS SCREEN: MINIMALIST APPLE =================
  if (successData) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-6 bg-[var(--bg-primary)] overflow-hidden transition-colors duration-700">
        <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
           <LiquidEther colors={etherColors} autoDemo autoSpeed={0.2} resolution={0.3} />
        </div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, ease: appleEase }}
           className="relative z-10 w-full max-w-md"
        >
          <div className={`p-10 rounded-[2.5rem] border text-center shadow-2xl transition-all duration-500 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle2 size={40} strokeWidth={1.5} />
            </div>

            <h2 className="text-3xl font-bold tracking-tight mb-3">Initialize Success.</h2>
            <p className="text-[var(--text-secondary)] font-medium mb-10">Your medical profile is now active on the neural grid.</p>

            <div className="space-y-4 mb-10 text-left">
              {/* Sync Status Badge */}
              {false && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl mb-4 text-[0.6rem] font-bold uppercase tracking-widest ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <Info size={14} />
                  Neural Profile Active • Identity Sync Pending
                </div>
              )}

              <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest opacity-40">System ID (For Login)</span>
                  <button 
                    onClick={() => copyToClipboard(successData.patient_id, 'id')}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${copiedType === 'id' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    {copiedType === 'id' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copiedType === 'id' && "Copied"}
                  </button>
                </div>
                <div className="text-xl font-mono font-bold tracking-wider">
                  {successData.patient_id}
                </div>
              </div>

              <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest opacity-40">Access Key</span>
                  <button 
                    onClick={() => copyToClipboard(successData.password || "", 'pass')}
                    className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${copiedType === 'pass' ? 'text-emerald-500 bg-emerald-500/10' : 'text-blue-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    {copiedType === 'pass' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copiedType === 'pass' && "Copied"}
                  </button>
                </div>
                <div className="text-xl font-mono font-bold tracking-wider">
                  {successData.password || "••••••••"}
                </div>
              </div>

              {/* Copy All Button */}
              <button
                onClick={copyAllCredentials}
                className={`w-full py-3 rounded-2xl border flex items-center justify-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest transition-all ${
                  copiedType === 'all' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-blue-500/5 border-blue-500/10 text-blue-500 hover:bg-blue-500/10'
                }`}
              >
                {copiedType === 'all' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copiedType === 'all' ? 'All Credentials Copied' : 'Copy All Credentials'}
              </button>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              Sign In to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ================= FORM: CLEAN APPLE DESIGN =================
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center py-20 px-6 bg-[var(--bg-primary)] overflow-x-hidden transition-colors duration-700">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
         <LiquidEther colors={etherColors} autoDemo autoSpeed={0.1} resolution={0.3} />
      </div>

      <motion.div
         initial={{ opacity: 0, x: -10 }}
         animate={{ opacity: 1, x: 0 }}
         className="relative z-10 w-full max-w-3xl mb-10 px-4"
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-all group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          Back to Login
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: appleEase }}
        className="relative z-10 w-full max-w-3xl"
      >
        <div className={`p-10 md:p-14 rounded-[2.5rem] border shadow-2xl transition-all duration-500 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Create Patient Profile.
            </h1>
            <p className="text-[var(--text-secondary)] font-medium text-lg max-w-md">Join DoctorCopilot to manage your medical reports with AI intelligence.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Full Name</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <User size={18} className="text-slate-400" />
                  <input
                    required
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:opacity-20"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Email Address</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <Mail size={18} className="text-slate-400" />
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:opacity-20"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Phone Number</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <Phone size={18} className="text-slate-400" />
                  <input
                    required
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:opacity-20"
                    placeholder="+x xxx xxx xxxx"
                  />
                </div>
              </div>

              {/* Birth Date */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Birth Date</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <Calendar size={18} className="text-slate-400" />
                  <input
                    required
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:opacity-20"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Gender</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <User size={18} className="text-slate-400" />
                  <select
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className={`bg-transparent border-none outline-none w-full text-base font-semibold cursor-pointer ${isDark ? '[&>option]:bg-slate-900 [&>option]:text-white' : ''}`}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Blood Group */}
              <div className="space-y-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Blood Group</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <Heart size={18} className="text-slate-400" />
                  <select
                    name="blood_group"
                    required
                    value={formData.blood_group}
                    onChange={handleChange}
                    className={`bg-transparent border-none outline-none w-full text-base font-semibold cursor-pointer ${isDark ? '[&>option]:bg-slate-900 [&>option]:text-white' : ''}`}
                  >
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2 md:col-span-1">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1 text-blue-500">Secure Access Key</label>
                <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <Shield size={18} className="text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:opacity-20"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              </div>

              {/* Medical History / Notes */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[0.65rem] font-bold uppercase tracking-widest opacity-40 ml-1">Medical Profile Notes (Allergies / Bio)</label>
                <div className={`flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-800/50 border-white/5 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5' : 'bg-slate-50 border-slate-100 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
                  <Info size={18} className="text-slate-400 mt-1" />
                  <textarea
                    name="medical_history"
                    value={formData.medical_history}
                    onChange={handleChange}
                    rows={3}
                    className="bg-transparent border-none outline-none w-full text-base font-semibold placeholder:opacity-20 resize-none"
                    placeholder="Mention any allergies, chronic conditions, or biological notes..."
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 relative">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-blue-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Initializing...' : 'Create Account'}
                <ChevronRight size={20} />
              </button>
              
              <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
                 <Info size={12} />
                 <p className="text-[0.6rem] font-bold uppercase tracking-widest">Compliant with Global Health Data Standards</p>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
