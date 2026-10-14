import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  CreditCard, 
  Sparkles, 
  RefreshCw, 
  X
} from 'lucide-react';

/**
 * LoadingModal Component
 * An animated, glassmorphic loading pop-up designed for modern web applications.
 * 
 * Auto-closes on success without requiring a "Lanjutkan" button.
 * Only displays a button on error / validation requirements.
 */
export default function LoadingModal({
  isOpen = false,
  title = "Memproses Permintaan...",
  subtitle = "Sistem sedang mengamankan dan memproses data Anda.",
  status = "loading", // 'loading' | 'success' | 'error'
  progress = null,
  steps = [],
  currentStepIndex = 0,
  canClose = false,
  onClose,
  type = "finance"
}) {
  const [dots, setDots] = useState('');

  // Animated dots for subtitle when loading
  useEffect(() => {
    if (!isOpen || status !== 'loading') return;
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, [isOpen, status]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with modern blur effect */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
        onClick={canClose ? onClose : undefined}
      />

      {/* Pop-up Container (Comfortable Size & Readable Typography) */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-10 text-center z-10 transform transition-all duration-300 animate-scaleUp">
        
        {/* Subtle decorative glowing background accents */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close button if dismissible or on error */}
        {(canClose || status === 'error') && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Central Animated Illustration / Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center">
            
            {status === 'loading' && (
              <>
                {/* Outer rotating pulse ring */}
                <div className="w-28 h-28 rounded-full border-2 border-emerald-500/20 dark:border-emerald-400/20 animate-ping absolute inset-0 m-auto" />
                
                {/* Secondary gradient spinner */}
                <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-emerald-500 border-r-teal-400 border-b-cyan-500 animate-spin" />
                
                {/* Inner floating emblem with finance icon */}
                <div className="absolute w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-inner text-emerald-600 dark:text-emerald-400">
                  {type === 'finance' ? (
                    <CreditCard className="w-7 h-7 animate-pulse" />
                  ) : type === 'steps' ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-teal-600 dark:text-teal-400" />
                  ) : (
                    <Sparkles className="w-6 h-6 animate-bounce text-emerald-500" />
                  )}
                </div>
              </>
            )}

            {status === 'success' && (
              <div className="w-24 h-24 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-14 h-14" />
              </div>
            )}

            {status === 'error' && (
              <div className="w-24 h-24 rounded-full bg-rose-500/15 dark:bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-600 shadow-xl shadow-rose-500/20 animate-shake">
                <AlertCircle className="w-14 h-14" />
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          {title}
        </h3>

        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed mb-6 min-h-[2.5rem] flex items-center justify-center">
          <span>{subtitle}{status === 'loading' ? dots : ''}</span>
        </p>

        {/* Progress Bar (if provided or active) */}
        {progress !== null ? (
          <div className="w-full mb-6">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Kemajuan</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-emerald-500/30"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        ) : status === 'loading' ? (
          /* Indeterminate loading bar shimmer */
          <div className="w-full mb-6">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 w-1/3 rounded-full animate-indeterminate" />
            </div>
          </div>
        ) : null}

        {/* Footer info badge OR Error button (Notice: NO 'Lanjutkan' button for success!) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Dilindungi dengan enkripsi 256-bit ERP Fashol</span>
            </div>
          ) : status === 'success' ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>Transaksi berhasil diverifikasi</span>
            </div>
          ) : (
            /* Only show button on error / validation notice! */
            <button
              onClick={onClose}
              className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Perbaiki / Tutup Notifikasi</span>
            </button>
          )}
        </div>

      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes indeterminate {
          0% { left: -35%; width: 35%; }
          50% { left: 40%; width: 50%; }
          100% { left: 100%; width: 35%; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-indeterminate {
          animation: indeterminate 1.6s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
