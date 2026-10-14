import React from 'react';
import { Layers, Landmark, BarChart3, FileText, CreditCard, Calendar, Clock, Construction } from 'lucide-react';

export default function GenericSectionView({ tab, currentRole, onNavigate }) {
  const titles = {
    'riwayat-produksi': {
      title: 'Riwayat Produksi Harian',
      desc: 'Daftar lengkap seluruh histori transaksi produksi dan status payroll.',
      icon: Clock,
      sub: 'Mencakup filter periode Kamis-Rabu dan penelusuran upah.'
    },
    'payroll-mingguan': {
      title: 'Penggajian Produksi Mingguan',
      desc: 'Rekap upah borongan mingguan periode Kamis sampai Rabu.',
      icon: CreditCard,
      sub: 'Status: Draft, Diperiksa, Disetujui, dan Dibayar sesuai SPK.'
    },
    'payroll-bulanan': {
      title: 'Penggajian Bulanan',
      desc: 'Manajemen gaji pokok, tunjangan, dan insentif staf bulanan.',
      icon: Calendar,
      sub: 'Menjadi sumber rekap biaya gaji operasional per periode.'
    },
    'hpp-produk': {
      title: 'HPP Produk & Tarif Proses',
      desc: 'Master tarif proses konveksi (Potong, Jahit Luar, Jahit Dalam, Kansay, QC, Packing).',
      icon: Layers,
      sub: 'Tarif digunakan otomatis pada form Input Produksi Harian.'
    },
    'keuangan': {
      title: 'Pencatatan Keuangan',
      desc: 'Pencatatan pendapatan marketplace dan pengeluaran bahan baku / utilitas.',
      icon: Landmark,
      sub: 'Mencegah pencatatan biaya ganda pada laporan laba/rugi.'
    },
    'biaya-produksi': {
      title: 'Rekap Biaya Produksi',
      desc: 'Akumulasi upah produksi mingguan dan pembelian bahan konveksi.',
      icon: BarChart3,
      sub: 'Mengambil referensi upah langsung dari payroll mingguan.'
    },
    'laporan-finance': {
      title: 'Laporan Finance Sederhana',
      desc: 'Rekapitulasi 7 laporan keuangan sesuai spesifikasi SPK.',
      icon: FileText,
      sub: 'Riwayat produksi, rekap payroll, HPP, dan laporan laba/rugi.'
    },
  };

  const info = titles[tab] || {
    title: 'Modul ' + tab,
    desc: 'Modul keuangan internal ERP Fashol.',
    icon: Construction,
    sub: 'Fitur pendukung akan menyusul sesuai roadmap pengembangan.'
  };

  const Icon = info.icon;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200/60 mb-2">
          <span>{currentRole === 'owner' ? '👑 Mode Owner' : '✍️ Mode Admin/Finance'}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {info.title}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {info.desc}
        </p>
      </div>

      <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-[#15352A]/10 text-[#15352A] flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {info.title}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          {info.sub} Modul inti saat ini difokuskan pada <strong>Dashboard Finance</strong>, <strong>Master Pekerja</strong>, dan <strong>Input Produksi Harian</strong> sesuai instruksi tahap pertama.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 rounded-xl bg-[#15352A] hover:bg-[#122E24] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Kembali ke Dashboard
          </button>
          <button
            onClick={() => onNavigate('produksi-harian')}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Input Produksi Harian
          </button>
        </div>
      </div>
    </div>
  );
}
