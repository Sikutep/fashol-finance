import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Printer, 
  Eye, 
  CheckCircle, 
  DollarSign, 
  Briefcase,
  X,
  FileCheck,
  Send,
  Calendar
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function PayrollBulananView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('Juni 2025');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [statusOverride, setStatusOverride] = useState(null);

  const fetchMonthlyPayroll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll-bulanan?period=${encodeURIComponent(period)}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setItems(json.data || []);
      }
    } catch (e) {
      console.error('Error fetching monthly payroll:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyPayroll();
  }, [period, search]);

  const handleAjukan = async () => {
    const targetStatus = currentRole === 'owner' ? 'Disetujui' : 'Diperiksa';
    showLoading({
      title: currentRole === 'owner' ? 'Menyetujui Payroll Bulanan...' : 'Mengajukan Payroll ke Owner...',
      subtitle: 'Memvalidasi rekapitulasi gaji staf dan tunjangan...',
      type: 'finance',
    });

    try {
      const res = await fetch('/api/payroll-bulanan/all/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          status: targetStatus,
          period: period,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: currentRole === 'owner' ? 'Payroll Bulanan Disetujui' : 'Berhasil Diajukan',
          subtitle: currentRole === 'owner' ? 'Dana dialokasikan untuk pencairan akhir bulan.' : 'Notifikasi persetujuan dikirim ke Owner.',
          duration: 850,
          onComplete: () => {
            setStatusOverride(targetStatus);
            fetchMonthlyPayroll();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal memperbarui status payroll bulanan');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // Calculations
  const totalBasic = items.reduce((acc, curr) => acc + (curr.basic_salary || 0), 0);
  const totalAllowance = items.reduce((acc, curr) => acc + (curr.allowance || 0) + (curr.overtime || 0), 0);
  const totalSalary = items.reduce((acc, curr) => acc + (curr.total_salary || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payroll Bulanan (Staf & Tim Tetap)
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Penggajian bulanan dengan komponen Gaji Pokok, Tunjangan, dan Lembur • Periode {period}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAjukan}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            {currentRole === 'owner' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Setujui Semua Gaji</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Ajukan Payroll</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Gaji Pokok</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              Rp {totalBasic.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tunjangan & Lembur</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              Rp {totalAllowance.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-emerald-800 p-6 rounded-2xl text-white shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">Total Beban Gaji Bulanan</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              Rp {totalSalary.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama staf atau jabatan..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Pilih Bulan Payroll"
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Juni 2025">Juni 2025</option>
            <option value="Mei 2025">Mei 2025</option>
            <option value="April 2025">April 2025</option>
          </select>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">NO. PAYROLL</th>
                <th className="py-4 px-6">NAMA PEKERJA</th>
                <th className="py-4 px-6">JABATAN / DIVISI</th>
                <th className="py-4 px-6 text-right">GAJI POKOK</th>
                <th className="py-4 px-6 text-right">TUNJANGAN</th>
                <th className="py-4 px-6 text-right">LEMBUR</th>
                <th className="py-4 px-6 text-right">TOTAL DITERIMA</th>
                <th className="py-4 px-6 text-center">STATUS</th>
                <th className="py-4 px-6 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data payroll bulanan...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    Tidak ada data payroll bulanan untuk periode ini.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                      {item.payroll_number}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{item.worker_name}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                        {item.position}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-700">
                      {item.formatted_basic_salary}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      {item.formatted_allowance}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-600">
                      {item.formatted_overtime}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-emerald-700 text-base">
                      {item.formatted_total_salary}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {statusOverride || item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => setSelectedSlip(item)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Slip Gaji</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Modal Detail */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Slip Header */}
            <div className="text-center pb-5 border-b border-slate-200">
              <div className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
                ERP FASHOL — SLIP GAJI BULANAN
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedSlip.worker_name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedSlip.payroll_number} • Jabatan: {selectedSlip.position}
              </p>
            </div>

            {/* Slip Body */}
            <div className="py-5 space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Gaji Pokok:</span>
                <span className="font-bold text-slate-800">{selectedSlip.formatted_basic_salary}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Tunjangan Jabatan / Operasional:</span>
                <span className="font-semibold text-slate-700">{selectedSlip.formatted_allowance}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Lembur & Bonus:</span>
                <span className="font-semibold text-slate-700">{selectedSlip.formatted_overtime}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status Pembayaran:</span>
                <span className="font-bold text-emerald-700">{statusOverride || selectedSlip.status}</span>
              </div>
              <div className="flex justify-between py-3.5 bg-emerald-50 px-4 rounded-xl mt-3">
                <span className="font-bold text-emerald-950">Total Gaji Diterima (Net):</span>
                <span className="font-extrabold text-emerald-700 text-xl">{selectedSlip.formatted_total_salary}</span>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  window.print();
                  setSelectedSlip(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Slip</span>
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
