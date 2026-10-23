import React from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Receipt, 
  Factory, 
  ArrowRight, 
  ArrowUpRight, 
  ChevronRight,
  FileSpreadsheet,
  PlusCircle,
  WalletCards
} from 'lucide-react';

export default function DashboardView({ data, currentRole, onNavigate }) {
  const metrics = data?.metrics || {};
  const cashflow = data?.cashflow_chart || { 
    months: [], 
    income: [], 
    expense: [] 
  };
  const hppList = data?.hpp_summary || [];
  const activities = data?.recent_activities || [];

  const maxVal = Math.max(
    ...(cashflow.income || []).map(Number), 
    ...(cashflow.expense || []).map(Number),
    1
  );

  return (
    <div className="space-y-8">
      
      {/* Header Tag & Title (Comfortable Scaling) */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 mb-2.5">
          <span>{currentRole === 'owner' ? '👑 Mode Owner - Peninjauan & Persetujuan' : '✍️ Mode Admin/Finance - Operasional'}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Dashboard Finance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau performa keuangan dan operasional secara menyeluruh.
        </p>
      </div>

      {/* 4 Summary Cards (Bold Numbers & Generous Padding) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Payroll Minggu ini */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-500">Payroll Minggu Ini</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {metrics.payroll_this_week?.formatted || 'Rp 0'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
            <span className="font-bold">{metrics.payroll_this_week?.trend || '0%'}</span>
            <span className="text-slate-400 font-normal">dibanding periode lalu</span>
          </div>
        </div>

        {/* Card 2: Total Pendapatan */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-500">Total Pendapatan</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {metrics.total_income?.formatted || 'Rp 0'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
            <span className="font-bold">{metrics.total_income?.trend || '0%'}</span>
            <span className="text-slate-400 font-normal">dibanding periode lalu</span>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-500">Total Pengeluaran</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {metrics.total_expense?.formatted || 'Rp 0'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-rose-500 flex items-center gap-1.5">
            <span className="font-bold">{metrics.total_expense?.trend || '0%'}</span>
            <span className="text-slate-400 font-normal">dibanding periode lalu</span>
          </div>
        </div>

        {/* Card 4: Biaya Produksi */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
              <Factory className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-500">Biaya Produksi</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {metrics.production_cost?.formatted || 'Rp 0'}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
            <span className="font-bold">{metrics.production_cost?.trend || '0%'}</span>
            <span className="text-slate-400 font-normal">dibanding periode lalu</span>
          </div>
        </div>

      </div>

      {/* Middle Row: Arus Keuangan & Ringkasan HPP Produk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Arus Keuangan Bar Chart (2 cols) */}
        <div className="lg:col-span-2 p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Arus Keuangan</h2>
              <p className="text-sm text-slate-400">Perbandingan pendapatan dan pengeluaran</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#163A2B]" />
                  <span className="text-slate-700">Pendapatan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#C5A859]" />
                  <span className="text-slate-700">Pengeluaran</span>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50">
                6 Bulan Terakhir
              </div>
            </div>
          </div>

          {/* Chart Graphic Area */}
          <div className="pt-8 h-64 flex items-end justify-between gap-4 px-3">
            {cashflow.months.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Memuat data arus keuangan...
              </div>
            ) : (
              cashflow.months.map((month, idx) => {
                const inc = Number(cashflow.income[idx] || 0);
                const exp = Number(cashflow.expense[idx] || 0);
                const incPct = maxVal > 0 ? Math.min(100, Math.max(16, (inc / maxVal) * 100)) : 16;
                const expPct = maxVal > 0 ? Math.min(100, Math.max(12, (exp / maxVal) * 100)) : 12;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-2 h-48 pb-2">
                      {/* Income Bar (Dark Forest Green) */}
                      <div 
                        className="w-5 rounded-t-md bg-[#163A2B] hover:opacity-90 transition-all cursor-pointer relative"
                        style={{ height: `${incPct}%` }}
                        title={`Pendapatan ${month}: Rp ${inc.toLocaleString('id-ID')}`}
                      />
                      {/* Expense Bar (Gold / Mustard) */}
                      <div 
                        className="w-5 rounded-t-md bg-[#C5A859] hover:opacity-90 transition-all cursor-pointer relative"
                        style={{ height: `${expPct}%` }}
                        title={`Pengeluaran ${month}: Rp ${exp.toLocaleString('id-ID')}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100 w-full text-center">
                      {month}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Ringkasan HPP Produk */}
        <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Ringkasan HPP Produk</h2>
                <p className="text-sm text-slate-400">HPP produksi per unit</p>
              </div>
              <button 
                onClick={() => onNavigate('hpp-produk')}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                title="Lihat semua HPP"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {hppList.slice(0, 4).map((hpp, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                      {hpp.code}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{hpp.name}</div>
                      <div className="text-xs text-slate-400">Terakhir diperbarui {hpp.updated_at}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900">
                      Rp {Number(hpp.total_hpp).toLocaleString('id-ID')}
                    </div>
                    <div className="text-xs text-emerald-600 font-bold">{hpp.trend}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button 
              onClick={() => onNavigate('hpp-produk')}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
            >
              <span>Kelola Tarif & HPP Produk</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Row: Aktivitas Terbaru & Aksi Cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Aktivitas Terbaru */}
        <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Aktivitas Terbaru</h2>
              <p className="text-sm text-slate-400">Transaksi finance dan produksi terkini</p>
            </div>
            <button 
              onClick={() => onNavigate('produksi-harian')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>Lihat semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                    act.icon === 'income'
                      ? 'bg-emerald-50 text-emerald-600'
                      : act.icon === 'expense'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                  }`}>
                    {act.icon === 'income' ? <ArrowUpRight className="w-5 h-5" /> : act.icon === 'expense' ? <Receipt className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{act.title}</div>
                    <div className="text-xs text-slate-400">{act.reference}</div>
                  </div>
                </div>
                <div className={`text-sm font-extrabold ${
                  act.icon === 'income'
                    ? 'text-emerald-700'
                    : 'text-slate-900'
                }`}>
                  {act.formatted_amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aksi Cepat */}
        <div className="p-7 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-100 mb-5">
              <h2 className="text-base font-bold text-slate-900">Aksi Cepat</h2>
              <p className="text-sm text-slate-400">Kelola operasional hari ini</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <button 
                onClick={() => onNavigate('produksi-harian')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-slate-50 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Input Produksi</div>
                    <div className="text-xs text-slate-400">Catat hasil kerja</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              <button 
                onClick={() => onNavigate('keuangan')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-slate-50 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Catat Pengeluaran</div>
                    <div className="text-xs text-slate-400">Transaksi baru</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              <button 
                onClick={() => onNavigate('payroll-mingguan')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-slate-50 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <WalletCards className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Proses Payroll</div>
                    <div className="text-xs text-slate-400">Periode berjalan</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

              <button 
                onClick={() => onNavigate('laporan-finance')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-slate-50 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Buat Laporan</div>
                    <div className="text-xs text-slate-400">Rekap periode</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
              </button>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
