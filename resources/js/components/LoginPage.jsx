import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function LoginPage({ onLoginSuccess }) {
  const { showTimedLoading } = useLoading();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Harap masukkan email dan password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (json.status === 'success') {
        if (json.csrf_token) {
          const meta = document.querySelector('meta[name="csrf-token"]');
          if (meta) meta.setAttribute('content', json.csrf_token);
        }
        showTimedLoading({
          title: 'Memverifikasi Akun...',
          subtitle: `Menyiapkan sesi untuk ${json.user.name}...`,
          duration: 1500,
          type: 'finance',
          successTitle: 'Login Berhasil!',
          successSubtitle: `Selamat datang di ERP Fashol Finance, ${json.user.name}.`,
          onComplete: () => {
            onLoginSuccess(json.user);
          }
        });
      } else {
        setErrorMsg(json.message || 'Email atau password salah.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col items-center justify-center p-6 text-slate-800">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3.5 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#EAB308] flex items-center justify-center font-black text-slate-950 text-2xl shadow-md">
          F
        </div>
        <div>
          <div className="text-2xl font-extrabold tracking-wider text-slate-900 leading-tight">
            FASHOL
          </div>
          <div className="text-xs tracking-widest text-slate-500 font-semibold uppercase">
            FINANCE ERP PLATFORM
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-10">
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Masuk ke Sistem
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gunakan akun email Anda untuk mengakses modul finance.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Alamat Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@fashol.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-2 ${
              isSubmitting
                ? 'bg-slate-400 cursor-not-allowed text-white'
                : 'bg-[#15352A] hover:bg-[#102920] text-white active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Informative Hint */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Gunakan akun resmi Fashol yang telah terdaftar di sistem.
          </p>
        </div>


      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Sistem ERP Fashol terenkripsi & aman</span>
      </div>

    </div>
  );
}
