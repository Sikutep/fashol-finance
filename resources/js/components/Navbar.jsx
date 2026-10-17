import React from 'react';
import { Search, Calendar, Bell, LogOut, Shield } from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  onLogout,
  period
}) {
  const currentPeriod = period || new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const isOwner = currentUser?.role === 'owner';

  return (
    <header className="h-20 px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      
      {/* Spacious Search Bar */}
      <div className="relative w-80 sm:w-96">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Cari data, transaksi, laporan..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-xs"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        
        {/* Role Badge Display (Static indicator based on logged in user) */}
        <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
          isOwner 
            ? 'bg-amber-50 text-amber-800 border-amber-200/80' 
            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          <span>{isOwner ? 'Owner Eksekutif' : 'Admin Finance'}</span>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{currentPeriod}</span>
        </div>

        {/* Notification Bell */}
        <button 
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative"
          title="Notifikasi"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2" />
        </button>

        {/* User Card & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#15352A] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-bold text-slate-900 leading-tight">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-xs text-slate-500">
                {currentUser?.email}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            title="Keluar (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
