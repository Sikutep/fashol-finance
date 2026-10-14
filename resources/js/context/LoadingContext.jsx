import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import LoadingModal from '../components/LoadingModal';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: 'Memproses...',
    subtitle: 'Mohon tunggu sebentar',
    status: 'loading',
    progress: null,
    steps: [],
    currentStepIndex: 0,
    canClose: false,
    type: 'finance',
  });

  const hideLoading = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showLoading = useCallback((options = {}) => {
    setModalState({
      isOpen: true,
      title: options.title || 'Memproses Permintaan...',
      subtitle: options.subtitle || 'Sistem sedang memvalidasi data Anda.',
      status: options.status || 'loading',
      progress: options.progress !== undefined ? options.progress : null,
      steps: options.steps || [],
      currentStepIndex: options.currentStepIndex || 0,
      canClose: options.canClose ?? false,
      type: options.type || 'finance',
    });
  }, []);

  // Timed Loading helper (e.g. 2.5s simulated loading)
  const showTimedLoading = useCallback((options = {}) => {
    const duration = options.duration || 2500;
    const autoSuccess = options.autoSuccess ?? true;

    showLoading({
      title: options.title || 'Memproses Transaksi...',
      subtitle: options.subtitle || 'Menghubungkan ke jaringan perbankan...',
      type: options.type || 'finance',
      canClose: false,
    });

    const timer = setTimeout(() => {
      if (autoSuccess) {
        setModalState(prev => ({
          ...prev,
          status: 'success',
          title: options.successTitle || 'Berhasil Diproses!',
          subtitle: options.successSubtitle || 'Data transaksi telah berhasil diverifikasi dan disimpan.',
          progress: 100,
        }));
      } else {
        hideLoading();
      }
      if (options.onComplete) options.onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [showLoading, hideLoading]);

  // Multi-step Loading helper
  const showMultiStepLoading = useCallback((options = {}) => {
    const stepsList = options.steps || [
      { label: 'Memverifikasi kredensial akun...' },
      { label: 'Mengenkripsi data finansial...' },
      { label: 'Sinkronisasi dengan buku besar...' },
      { label: 'Pembaruan saldo selesai!' }
    ];

    setModalState({
      isOpen: true,
      title: options.title || 'Sinkronisasi Data Finansial',
      subtitle: stepsList[0]?.label || 'Memulai proses...',
      status: 'loading',
      progress: 15,
      steps: stepsList,
      currentStepIndex: 0,
      canClose: false,
      type: 'steps',
    });

    let currentIdx = 0;
    const stepDuration = options.stepDuration || 1000;

    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < stepsList.length) {
        const progressVal = Math.round(((currentIdx + 1) / stepsList.length) * 100);
        setModalState(prev => ({
          ...prev,
          currentStepIndex: currentIdx,
          subtitle: stepsList[currentIdx].label,
          progress: progressVal,
        }));
      } else {
        clearInterval(interval);
        setModalState(prev => ({
          ...prev,
          status: 'success',
          title: options.successTitle || 'Proses Selesai Sepenuhnya!',
          subtitle: options.successSubtitle || 'Semua langkah telah diverifikasi dengan aman.',
          progress: 100,
        }));
        if (options.onComplete) options.onComplete();
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  // Expose global window helpers so Blade or other scripts can trigger it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showLoadingPopup = showLoading;
      window.hideLoadingPopup = hideLoading;
      window.showTimedLoading = showTimedLoading;
      window.showMultiStepLoading = showMultiStepLoading;
    }
  }, [showLoading, hideLoading, showTimedLoading, showMultiStepLoading]);

  return (
    <LoadingContext.Provider
      value={{
        showLoading,
        hideLoading,
        showTimedLoading,
        showMultiStepLoading,
        modalState,
      }}
    >
      {children}
      <LoadingModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        subtitle={modalState.subtitle}
        status={modalState.status}
        progress={modalState.progress}
        steps={modalState.steps}
        currentStepIndex={modalState.currentStepIndex}
        canClose={modalState.canClose}
        onClose={hideLoading}
        type={modalState.type}
      />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
