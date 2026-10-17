import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Send, 
  Search, 
  Printer, 
  Download, 
  Eye, 
  User, 
  ChevronRight,
  ShieldCheck,
  X,
  FileText
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function PayrollMingguanView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [statusOverride, setStatusOverride] = useState(null);

  const fetchPayroll = async (periodToFetch = selectedPeriod) => {
    try {
      setLoading(true);
      const queryParam = periodToFetch ? `?period=${encodeURIComponent(periodToFetch)}` : '';
      const res = await fetch(`/api/payroll-mingguan${queryParam}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
        if (!periodToFetch && json.period) {
          setSelectedPeriod(json.period);
        }
        setStatusOverride(null);
      }
    } catch (e) {
      console.error('Error fetching weekly payroll:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleAjukan = async () => {
    const targetStatus = currentRole === 'owner' ? 'Disetujui' : 'Diperiksa';
    showLoading({
      title: currentRole === 'owner' ? 'Menyetujui Payroll Mingguan...' : 'Mengajukan Payroll ke Owner...',
      subtitle: 'Memvalidasi data upah dan memperbarui status di database...',
      type: 'production',
    });

    try {
      const res = await fetch('/api/payroll-mingguan/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          status: targetStatus,
          period: selectedPeriod,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: currentRole === 'owner' ? 'Payroll Berhasil Disetujui' : 'Berhasil Diajukan',
          subtitle: currentRole === 'owner' ? `Dana disetujui untuk dicairkan pada ${data?.payment_date || 'jadwal pembayaran'}.` : 'Notifikasi telah dikirimkan ke Owner.',
          duration: 850,
          onComplete: () => {
            setStatusOverride(targetStatus);
            fetchPayroll(selectedPeriod);
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal memperbarui status payroll');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleBayar = async () => {
    showLoading({
      title: 'Memproses Pembayaran Gaji...',
      subtitle: 'Mencatat status dibayar dan sinkronisasi ke buku besar...',
      type: 'finance',
    });

    try {
      const res = await fetch('/api/payroll-mingguan/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          status: 'Dibayar',
          period: selectedPeriod,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Payroll Telah Dibayarkan',
          subtitle: 'Status diperbarui menjadi Dibayar dan tersinkron ke Rekap Biaya Produksi.',
          duration: 850,
          onComplete: () => {
            setStatusOverride('Dibayar');
            fetchPayroll(selectedPeriod);
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menandai payroll dibayar');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const filteredItems = (data?.data || []).filter(item => 
    item.worker_name.toLowerCase().includes(search.toLowerCase()) ||
    item.payroll_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payroll Mingguan (Kamis – Rabu)
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Akumulasi upah borongan dari data Produksi Harian • Siklus Kamis s/d Rabu
          </p>
        </div>

        {/* Action Button based on Role */}
        <div className="flex items-center gap-3">
          {currentRole === 'owner' ? (
            <div className="flex gap-2">
              <button
                onClick={handleAjukan}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Setujui Payroll</span>
              </button>
              <button
                onClick={handleBayar}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Tandai Dibayar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAjukan}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Ajukan ke Owner</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Summary Card (As seen in Mockup 1) */}
      <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 font-semibold text-xs tracking-wider uppercase rounded-full border border-emerald-500/30">
                Siklus Payroll Aktif
              </span>
              <span className="px-3.5 py-1.5 bg-white/10 text-slate-200 font-medium text-xs rounded-full">
                {data?.period || '-'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-slate-300 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Periode: <strong>{data?.period || '-'}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Jadwal Bayar: <strong>{data?.payment_date || '-'}</strong>
              </span>
            </div>
          </div>

          {/* Right Metrics Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/15 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Total Upah Mingguan
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                {data?.formatted_total_payroll || 'Rp 0'}
              </div>
            </div>

            <div className="flex flex-col items-start gap-1">
              <span className="text-xs text-slate-400">Status Siklus</span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                statusOverride === 'Dibayar' 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : statusOverride === 'Disetujui'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {statusOverride || data?.status_label || 'Siap diajukan ke Owner'}
              </span>
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
            placeholder="Cari berdasarkan nama pekerja atau nomor payroll..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <select 
            aria-label="Pilih Periode Payroll"
            value={selectedPeriod}
            onChange={(e) => {
              const newPeriod = e.target.value;
              setSelectedPeriod(newPeriod);
              fetchPayroll(newPeriod);
            }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {(data?.available_periods && data.available_periods.length > 0
              ? data.available_periods
              : selectedPeriod ? [selectedPeriod] : []
            ).map((p) => (
              <option key={p} value={p}>Periode: {p}</option>
            ))}
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

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">NO. PAYROLL</th>
                <th className="py-4 px-6">NAMA PEKERJA</th>
                <th className="py-4 px-6">PERIODE KERJA</th>
                <th className="py-4 px-6 text-right">TOTAL OUTPUT</th>
                <th className="py-4 px-6 text-right">TOTAL UPAH</th>
                <th className="py-4 px-6 text-center">STATUS</th>
                <th className="py-4 px-6 text-center">RINCIAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data payroll mingguan...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Tidak ada data payroll yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                      {item.payroll_number}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                          {item.worker_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{item.worker_name}</div>
                          <div className="text-xs text-slate-400">Borongan Produksi</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {item.period}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-slate-800">
                      {item.formatted_qty}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-700 text-base">
                      {item.formatted_wage}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
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

        {/* Footer Summary Bar */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            Menampilkan <strong>{filteredItems.length}</strong> pekerja borongan aktif
          </div>
          <div className="text-base font-extrabold text-slate-900 flex items-center gap-3">
            <span>Total Upah Dibayarkan:</span>
            <span className="text-emerald-700 text-xl">{data?.formatted_total_payroll || 'Rp 755.900'}</span>
          </div>
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
                ERP FASHOL — SLIP GAJI BORONGAN
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedSlip.worker_name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedSlip.payroll_number} • Periode: {selectedSlip.period}
              </p>
            </div>

            {/* Slip Body */}
            <div className="py-5 space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total Output Produksi:</span>
                <span className="font-bold text-slate-800">{selectedSlip.formatted_qty}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Dasar Perhitungan:</span>
                <span className="font-semibold text-slate-700">Kuantitas × Tarif HPP</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Status Pembayaran:</span>
                <span className="font-bold text-amber-600">{statusOverride || selectedSlip.status}</span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-50 px-4 rounded-xl">
                <span className="font-bold text-emerald-900">Total Diterima (Bersih):</span>
                <span className="font-extrabold text-emerald-700 text-lg">{selectedSlip.formatted_wage}</span>
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
