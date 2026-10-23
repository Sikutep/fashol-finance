import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Scissors,
  Activity, 
  CreditCard, 
  Calendar, 
  Layers, 
  Landmark, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }) {
  const menuSections = [
    {
      title: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'OPERASIONAL',
      items: [
        { id: 'master-pekerja', label: 'Master Pekerja', icon: Users },
        { id: 'master-proses', label: 'Master Proses', icon: Scissors },
        { id: 'produksi-harian', label: 'Produksi Harian', icon: Activity },
        { id: 'payroll-mingguan', label: 'Payroll Mingguan', icon: CreditCard },
        { id: 'payroll-bulanan', label: 'Payroll Bulanan', icon: Calendar },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { id: 'hpp-produk', label: 'HPP Produk', icon: Layers },
        { id: 'keuangan', label: 'Keuangan', icon: Landmark },
        { id: 'biaya-produksi', label: 'Biaya Produksi', icon: BarChart3 },
        { id: 'laporan-finance', label: 'Laporan Finance', icon: FileText },
      ],
    },
  ];

  // Initials for avatar
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <aside className="w-72 bg-[#0D241C] text-[#E0E7E3] flex flex-col h-screen sticky top-0 shrink-0 border-r border-[#15352A] z-30 overflow-hidden">
      
      {/* Brand Header */}
      <div className="p-6 pb-5 flex items-center gap-3.5 border-b border-[#15352A]/60">
        <div className="w-11 h-11 rounded-xl bg-[#EAB308] flex items-center justify-center font-black text-slate-950 text-xl shadow-md">
          F
        </div>
        <div>
          <div className="text-lg font-bold tracking-wider text-white leading-tight">
            FASHOL
          </div>
          <div className="text-xs tracking-widest text-[#98AFA5] font-semibold uppercase">
            FINANCE ERP
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {menuSections.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="px-3 mb-2.5 text-xs font-bold tracking-wider text-[#668377] uppercase">
              {section.title}
            </div>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#15352A] text-white shadow-sm font-semibold'
                        : 'text-[#98AFA5] hover:text-white hover:bg-[#122E24]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[#EAB308]' : 'text-[#668377]'}`} />
                      <span>{item.label}</span>
                    </div>

                    {/* Active Indicator Bar on the Right */}
                    {isActive && (
                      <div className="w-1.5 h-5 rounded-full bg-[#EAB308]" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Profile & Logout */}
      <div className="p-4 border-t border-[#15352A] space-y-3">
        <button
          onClick={() => setActiveTab('pengaturan')}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#98AFA5] hover:text-white hover:bg-[#122E24] transition-colors"
        >
          <Settings className="w-5 h-5 text-[#668377]" />
          <span>Pengaturan</span>
        </button>

        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-[#122E24] border border-[#1A4234] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1F4A3B] text-emerald-300 border border-[#2B604E] flex items-center justify-center font-bold text-xs shadow-inner">
              {initials}
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white leading-tight truncate max-w-[120px]">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-xs text-[#86A397] capitalize">
                {currentUser?.role === 'owner' ? 'Owner Eksekutif' : 'Admin Finance'}
              </div>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
}
