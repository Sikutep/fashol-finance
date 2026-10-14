import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import DashboardView from './DashboardView';
import MasterPekerjaView from './MasterPekerjaView';
import ProduksiHarianView from './ProduksiHarianView';
import PayrollMingguanView from './PayrollMingguanView';
import PayrollBulananView from './PayrollBulananView';
import HppProdukView from './HppProdukView';
import KeuanganView from './KeuanganView';
import RekapBiayaProduksiView from './RekapBiayaProduksiView';
import GenericSectionView from './GenericSectionView';
import LoginPage from './LoginPage';
import { useLoading } from '../context/LoadingContext';

export default function FinanceApp() {
  const { showTimedLoading } = useLoading();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  // Check auth session
  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (json.authenticated && json.user) {
        setCurrentUser(json.user);
        fetchDashboardData();
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Gagal mengecek sesi:', err);
      setCurrentUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  };

  // Fetch dashboard dynamic data
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.status === 'success') {
        setDashboardData(json);
      }
    } catch (err) {
      console.error('Gagal mengambil data dashboard:', err);
    }
  };

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const handleLogout = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari sistem?')) return;

    showTimedLoading({
      title: 'Keluar dari Sistem...',
      subtitle: 'Mengakhiri sesi kerja...',
      duration: 1000,
      type: 'finance',
      successTitle: 'Berhasil Logout',
      successSubtitle: 'Sampai jumpa kembali.',
      onComplete: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
        setCurrentUser(null);
        setActiveTab('dashboard');
      }
    });
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    fetchDashboardData();
  };

  // Loading initial authentication state
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Memuat ERP Fashol Finance...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show dedicated Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in, show Full ERP System
  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-slate-800 font-sans selection:bg-emerald-600 selection:text-white">
      {/* Left Sidebar (w-72, Spacious) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          period="Juni 2025"
        />

        {/* Page Content Container (Comfortable, spacious layout) */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              data={dashboardData}
              currentRole={currentUser.role}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'master-pekerja' && (
            <MasterPekerjaView
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'produksi-harian' && (
            <ProduksiHarianView
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'payroll-mingguan' && (
            <PayrollMingguanView
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'payroll-bulanan' && (
            <PayrollBulananView
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'hpp-produk' && (
            <HppProdukView
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'keuangan' && (
            <KeuanganView
              currentRole={currentUser.role}
            />
          )}

          {activeTab === 'biaya-produksi' && (
            <RekapBiayaProduksiView
              currentRole={currentUser.role}
            />
          )}

          {['riwayat-produksi', 'laporan-finance', 'pengaturan'].includes(activeTab) && (
            <GenericSectionView
              tab={activeTab}
              currentRole={currentUser.role}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
