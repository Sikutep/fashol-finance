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
  FileText,
  Layers,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import PrintSlipModal from './PrintSlipModal';
import PrintReportModal from './PrintReportModal';
import { exportToExcel, formatRupiah } from '../utils/exportUtils';

export default function PayrollMingguanView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [statusOverride, setStatusOverride] = useState(null);

  // Print & Selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSlipPrintOpen, setIsSlipPrintOpen] = useState(false);
  const [slipPrintList, setSlipPrintList] = useState([]);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

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
        setSelectedIds([]);
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
          period: selectedPeriod || data?.period,
          start_date: data?.start_date,
          end_date: data?.end_date,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setStatusOverride(targetStatus);
        showSuccess({
          title: currentRole === 'owner' ? 'Payroll Berhasil Disetujui' : 'Berhasil Diajukan ke Owner',
          subtitle: currentRole === 'owner' 
            ? `Dana disetujui untuk dicairkan pada ${data?.payment_date || 'jadwal pembayaran'}.` 
            : 'Pengajuan telah tercatat di sistem dan status berubah menjadi Menunggu Persetujuan Owner.',
          duration: 1000,
          onComplete: () => {
            fetchPayroll(selectedPeriod || data?.period);
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal memperbarui status payroll');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleBayar = async () => {
    if (currentRole !== 'owner') {
      showError('Hanya Owner yang memiliki hak otorisasi untuk mencairkan atau membayar payroll!');
      return;
    }

    showLoading({
      title: 'Mencairkan Pembayaran Upah...',
      subtitle: 'Memperbarui status transaksi menjadi Dibayar dan mengunci histori...',
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
          status: 'Dibayar',
          period: selectedPeriod || data?.period,
          start_date: data?.start_date,
          end_date: data?.end_date,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setStatusOverride('Dibayar');
        showSuccess({
          title: 'Payroll Berhasil Dibayarkan',
          subtitle: `Seluruh upah pekerja periode ${selectedPeriod || data?.period} telah ditandai Dibayar.`,
          duration: 1000,
          onComplete: () => {
            fetchPayroll(selectedPeriod || data?.period);
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal menandai payroll dibayar');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleRollback = async (targetStatus = 'Draft') => {
    if (currentRole !== 'owner') {
      showError('Hanya Owner yang berwenang membuka kembali status payroll mingguan.');
      return;
    }
    showLoading({
      title: 'Membuka Kembali Status Payroll...',
      subtitle: `Mengembalikan status payroll ke ${targetStatus}...`,
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
          period: selectedPeriod || data?.period,
          start_date: data?.start_date,
          end_date: data?.end_date,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setStatusOverride(targetStatus);
        showSuccess({
          title: 'Status Diperbarui',
          subtitle: `Payroll dikembalikan ke status ${targetStatus}.`,
          duration: 900,
          onComplete: () => {
            fetchPayroll(selectedPeriod || data?.period);
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal mengubah status payroll.');
      }
    } catch(e) {
      hideLoading();
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const rawStatus = statusOverride || data?.payroll_status || data?.status_payroll || (data?.data?.[0]?.status) || 'Draft';
  const displayStatus = rawStatus === 'Tercatat' ? 'Draft' : rawStatus;

  const getStatusColor = (s) => {
    switch (s) {
      case 'Dibayar':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Disetujui':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Diperiksa':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Draft':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const items = data?.data || [];
  const filteredItems = items.filter(item => 
    item.worker_name.toLowerCase().includes(search.toLowerCase()) ||
    item.payroll_number.toLowerCase().includes(search.toLowerCase())
  );

  // Checkbox toggle helpers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Open single slip print modal
  const handlePrintSingleSlip = (slip) => {
    setSlipPrintList([slip]);
    setIsSlipPrintOpen(true);
  };

  // Open bulk slip print modal
  const handleBulkPrintSlips = () => {
    const targets = selectedIds.length > 0 
      ? filteredItems.filter(item => selectedIds.includes(item.id))
      : filteredItems;

    if (targets.length === 0) {
      showError('Tidak ada slip yang dapat dicetak.');
      return;
    }

    setSlipPrintList(targets);
    setIsSlipPrintOpen(true);
  };

  // Direct Excel export
  const handleDirectExcelExport = () => {
    exportToExcel({
      filename: `Rekap_Payroll_Mingguan_${(selectedPeriod || data?.period || 'Mingguan').replace(/[\/\s:]/g, '_')}`,
      sheetName: 'Payroll Mingguan',
      title: 'CV FASHOL MITSLI SEE — REKAP PENGGAJIAN PRODUKSI MINGGUAN',
      subtitle: `Periode: ${selectedPeriod || data?.period} | Tanggal Bayar: ${data?.payment_date || '-'}`,
      columns: [
        { header: 'No', key: 'no', align: 'center' },
        { header: 'No. Payroll', key: 'payroll_number' },
        { header: 'Nama Pekerja', key: 'worker_name' },
        { header: 'Periode Kerja', key: 'period' },
        { header: 'Total Output (pcs)', key: 'qty', align: 'right' },
        { header: 'Total Upah Bersih (Rp)', key: 'total_wage', align: 'right' },
        { header: 'Status Payroll', key: 'status', align: 'center' },
      ],
      data: filteredItems.map((item, idx) => ({
        no: idx + 1,
        payroll_number: item.payroll_number,
        worker_name: item.worker_name,
        period: item.period,
        qty: item.total_qty,
        total_wage: formatRupiah(item.total_wage),
        status: statusOverride || item.status,
      })),
      totals: {
        qty: (data?.summary?.total_qty || 0) + ' pcs',
        total_wage: data?.summary?.formatted_payroll || 'Rp 0',
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Penggajian Produksi (Mingguan)
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Rekap upah borongan periode Kamis–Rabu berdasarkan data Produksi Harian
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {displayStatus === 'Draft' && (
            <button
              onClick={handleAjukan}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" />
              <span>{currentRole === 'owner' ? 'Setujui Payroll' : 'Ajukan ke Owner'}</span>
            </button>
          )}

          {displayStatus === 'Diperiksa' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                Menunggu Persetujuan Owner
              </span>
              {currentRole === 'owner' && (
                <>
                  <button
                    onClick={handleAjukan}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Setujui Penggajian</span>
                  </button>
                  <button
                    onClick={() => handleRollback('Draft')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                    title="Kembalikan status ke Draft"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tolak / Draft</span>
                  </button>
                </>
              )}
            </div>
          )}

          {displayStatus === 'Disetujui' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                Telah Disetujui Owner
              </span>
              {currentRole === 'owner' ? (
                <>
                  <button
                    onClick={handleBayar}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Tandai Sudah Dibayar</span>
                  </button>
                  <button
                    onClick={() => handleRollback('Draft')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                    title="Buka kembali untuk koreksi"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Buka Kembali</span>
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-500 font-medium italic">
                  (Menunggu pencairan oleh kasir/owner)
                </span>
              )}
            </div>
          )}

          {displayStatus === 'Dibayar' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold shadow-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Gaji Telah Dibayarkan</span>
              </div>
              {currentRole === 'owner' && (
                <button
                  onClick={() => handleRollback('Disetujui')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Buka kunci status gaji mingguan ini"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Buka Kunci</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hero Stat Banner: Dark Slate with Green Accent */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(displayStatus)}`}>
                Status: {displayStatus}
              </span>

              {/* Quick Action Button inside Hero Banner */}
              {displayStatus === 'Draft' && (
                <button
                  onClick={handleAjukan}
                  className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{currentRole === 'owner' ? 'Setujui Payroll' : 'Ajukan ke Owner'}</span>
                </button>
              )}

              {displayStatus === 'Diperiksa' && currentRole === 'owner' && (
                <button
                  onClick={handleAjukan}
                  className="px-3.5 py-1 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Setujui (Approve)</span>
                </button>
              )}

              {displayStatus === 'Disetujui' && currentRole === 'owner' && (
                <button
                  onClick={handleBayar}
                  className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Tandai Sudah Dibayar</span>
                </button>
              )}

              <span className="text-xs text-slate-300 font-medium">
                Periode: <strong>{data?.period || selectedPeriod}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
              <span>Jadwal Bayar: {data?.payment_date || '-'}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              TOTAL BIAYA UPAH BORONGAN
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight">
              {data?.summary?.formatted_payroll || 'Rp 0'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-700/60">
            <div>
              <div className="text-xs text-slate-300">Total Output Fisik</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {data?.summary?.formatted_qty || '0 pcs'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">Pekerja Aktif</div>
              <div className="text-xl font-bold text-white mt-1">
                {data?.summary?.total_workers || 0} Orang
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">Total Transaksi Produksi</div>
              <div className="text-xl font-bold text-white mt-1">
                {data?.summary?.total_transactions || 0} Catatan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pekerja atau no. payroll..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              fetchPayroll(e.target.value);
            }}
            className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {(data?.available_periods && data.available_periods.length > 0
              ? data.available_periods
              : selectedPeriod ? [selectedPeriod] : []
            ).map((p) => (
              <option key={p} value={p}>Periode: {p}</option>
            ))}
          </select>

          {/* Bulk Print Slips Button */}
          <button
            onClick={handleBulkPrintSlips}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm"
            title="Cetak slip upah yang dipilih atau semua pekerja"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>
              Bulk Cetak Slip ({selectedIds.length > 0 ? `${selectedIds.length} Terpilih` : `Semua ${filteredItems.length}`})
            </span>
          </button>

          {/* Print Recap A4 Button */}
          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Cetak Rekap (A4)</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleDirectExcelExport}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-xs sm:text-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih Semua"
                  />
                </th>
                <th className="py-4 px-6">NO. PAYROLL</th>
                <th className="py-4 px-6">NAMA PEKERJA</th>
                <th className="py-4 px-6">PERIODE KERJA</th>
                <th className="py-4 px-6 text-right">TOTAL OUTPUT</th>
                <th className="py-4 px-6 text-right">TOTAL UPAH</th>
                <th className="py-4 px-6 text-center">STATUS</th>
                <th className="py-4 px-6 text-center">AKSI & CETAK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data payroll mingguan...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Tidak ada data payroll yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50/70 transition-colors ${
                      selectedIds.includes(item.id) ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
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
                    <td className="py-4 px-6 text-right font-extrabold text-base text-emerald-700">
                      {item.formatted_wage}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(statusOverride || item.status)}`}>
                        {statusOverride || item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedSlip(item)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          title="Lihat rincian produksi harian"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                        <button
                          onClick={() => handlePrintSingleSlip(item)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          title="Cetak slip upah khusus pekerja ini"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Slip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rincian Modal (Existing View Detail) */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-200 pb-4 mb-4">
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                Rincian Produksi Harian Pekerja
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedSlip.worker_name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedSlip.payroll_number} • Periode: {selectedSlip.period}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Baris Transaksi Produksi Harian
                </h4>
                {selectedSlip.details && selectedSlip.details.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">No. Transaksi</th>
                          <th className="py-2.5 px-3">Proses</th>
                          <th className="py-2.5 px-3">Produk / Varian</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Tarif</th>
                          <th className="py-2.5 px-3 text-right">Subtotal Upah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSlip.details.map((detail, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{detail.date || detail.production_date}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{detail.transaction_number}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{detail.process || detail.process_name}</td>
                            <td className="py-2 px-3 text-slate-700">
                              {detail.product || detail.product_name}
                              <span className="text-slate-400 block text-[11px]">{detail.variation} - {detail.color}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-medium">{detail.qty} pcs</td>
                            <td className="py-2 px-3 text-right text-slate-500">{detail.rate_formatted || formatRupiah(detail.rate)}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">{detail.total_wage_formatted || formatRupiah(detail.total_wage)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Tidak ada rincian baris produksi.</p>
                )}
              </div>

              {/* Summary Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Output Produksi:</span>
                  <span className="font-bold text-slate-800">{selectedSlip.formatted_qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dasar Perhitungan:</span>
                  <span className="font-semibold text-slate-700">Kuantitas × Tarif HPP Riil</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Siklus:</span>
                  <span className="font-bold text-amber-600">{statusOverride || selectedSlip.status}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total Upah Bersih:</span>
                  <span className="font-black text-emerald-700 text-lg">{selectedSlip.formatted_wage}</span>
                </div>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  handlePrintSingleSlip(selectedSlip);
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Slip Upah</span>
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailored Slip Print Modal (A5 Landscape, Thermal 80mm, A4, or Bulk) */}
      <PrintSlipModal
        isOpen={isSlipPrintOpen}
        onClose={() => setIsSlipPrintOpen(false)}
        type="weekly"
        slips={slipPrintList}
        period={selectedPeriod || data?.period}
        paymentDate={data?.payment_date}
      />

      {/* A4 Report Print Modal */}
      <PrintReportModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="Rekap Payroll Produksi Mingguan"
        subtitle={`Daftar upah borongan periode Kamis–Rabu | Total Upah: ${data?.summary?.formatted_payroll || 'Rp 0'}`}
        period={selectedPeriod || data?.period}
        orientation="landscape"
        excelFilename="rekap_payroll_mingguan"
        columns={[
          { header: 'No', key: 'no', align: 'center' },
          { header: 'No. Payroll', key: 'payroll_number' },
          { header: 'Nama Pekerja', key: 'worker_name' },
          { header: 'Periode Kerja', key: 'period' },
          { header: 'Total Output', key: 'qty', align: 'right' },
          { header: 'Total Upah Bersih', key: 'total_wage', align: 'right' },
          { header: 'Status', key: 'status', align: 'center' },
        ]}
        data={filteredItems.map((item, idx) => ({
          no: idx + 1,
          payroll_number: item.payroll_number,
          worker_name: item.worker_name,
          period: item.period,
          qty: item.formatted_qty,
          total_wage: item.formatted_wage,
          status: statusOverride || item.status,
        }))}
        totals={{
          qty: (data?.summary?.total_qty || 0) + ' pcs',
          total_wage: data?.summary?.formatted_payroll || 'Rp 0',
        }}
      />
    </div>
  );
}
