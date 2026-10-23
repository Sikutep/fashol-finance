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
  Calendar, 
  Edit3, 
  Check,
  Clock,
  AlertCircle,
  Download,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import PrintSlipModal from './PrintSlipModal';
import PrintReportModal from './PrintReportModal';
import { exportToExcel, formatRupiah } from '../utils/exportUtils';

export default function PayrollBulananView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();
  const [items, setItems] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [payrollStatus, setPayrollStatus] = useState('Draft');
  const [statusLabel, setStatusLabel] = useState('Draft');
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(() => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
  });
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    basic_salary: 0,
    allowance: 0,
    overtime: 0,
    deductions: 0,
  });
  const [statusOverride, setStatusOverride] = useState(null);

  // Print & Selection states
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isSlipPrintOpen, setIsSlipPrintOpen] = useState(false);
  const [slipPrintList, setSlipPrintList] = useState([]);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  const fetchMonthlyPayroll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/payroll-bulanan?period=${encodeURIComponent(period)}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setItems(json.data || []);
        if (json.available_periods) {
          setAvailablePeriods(json.available_periods);
        }
        setPayrollStatus(json.payroll_status || json.data?.[0]?.status || 'Draft');
        setStatusLabel(json.status_label || 'Draft');
        setSummaryData(json.summary || null);
        setStatusOverride(null);
        setSelectedStaffIds([]);
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

  const handleUpdateStatusAll = async (newStatus) => {
    if (in_array_strict(newStatus, ['Disetujui', 'Dibayar']) && currentRole !== 'owner') {
      showError('Hanya Owner yang memiliki wewenang untuk menyetujui atau menandai payroll bulanan dibayar.');
      return;
    }

    showLoading({
      title: `Memperbarui Status Payroll...`,
      subtitle: `Mengubah seluruh status payroll periode ${period} menjadi ${newStatus}...`,
      type: 'production',
    });

    try {
      const res = await fetch('/api/payroll-bulanan/all/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          period: period,
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setStatusOverride(newStatus);
        showSuccess({
          title: `Status Berhasil Diperbarui`,
          subtitle: json.message || `Payroll bulanan periode ${period} kini berstatus ${newStatus}.`,
          duration: 1000,
          onComplete: () => {
            fetchMonthlyPayroll();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal memperbarui status payroll bulanan.');
      }
    } catch (e) {
      hideLoading();
      console.error('Error updating all status:', e);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  function in_array_strict(val, arr) {
    return arr.includes(val);
  }

  const handleSaveSalaryComponents = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    showLoading({
      title: 'Menyimpan Komponen Gaji...',
      subtitle: `Memperbarui rincian gaji untuk ${editingItem.worker_name}...`,
      type: 'production',
    });

    try {
      const res = await fetch(`/api/payroll-bulanan/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Komponen Gaji Disimpan',
          subtitle: `Rincian gaji bulanan ${editingItem.worker_name} berhasil disinkronisasi.`,
          duration: 900,
          onComplete: () => {
            setEditingItem(null);
            fetchMonthlyPayroll();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal menyimpan perubahan gaji.');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      showError('Terjadi kesalahan jaringan saat menyimpan data.');
    }
  };

  const currentDisplayStatus = statusOverride || payrollStatus || 'Draft';

  // Checkbox helpers
  const handleToggleSelectAll = () => {
    if (selectedStaffIds.length === items.length && items.length > 0) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(items.map(item => item.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Single Slip Print
  const handlePrintSingleSlip = (slip) => {
    setSlipPrintList([slip]);
    setIsSlipPrintOpen(true);
  };

  // Bulk Slip Print
  const handleBulkPrintSlips = () => {
    const targets = selectedStaffIds.length > 0
      ? items.filter(item => selectedStaffIds.includes(item.id))
      : items;

    if (targets.length === 0) {
      showError('Tidak ada slip staf yang dapat dicetak.');
      return;
    }

    setSlipPrintList(targets);
    setIsSlipPrintOpen(true);
  };

  // Direct Excel Export
  const handleDirectExcelExport = () => {
    exportToExcel({
      filename: `Rekap_Payroll_Bulanan_${period.replace(/[\/\s:]/g, '_')}`,
      sheetName: 'Payroll Bulanan',
      title: 'CV FASHOL MITSLI SEE — REKAP PENGGAJIAN BULANAN KARYAWAN',
      subtitle: `Periode: ${period} | Total Karyawan: ${items.length} Orang`,
      columns: [
        { header: 'No', key: 'no', align: 'center' },
        { header: 'No. Payroll', key: 'payroll_number' },
        { header: 'Nama Karyawan', key: 'worker_name' },
        { header: 'Jabatan / Divisi', key: 'position' },
        { header: 'Gaji Pokok', key: 'basic', align: 'right' },
        { header: 'Tunjangan', key: 'allowance', align: 'right' },
        { header: 'Lembur', key: 'overtime', align: 'right' },
        { header: 'Potongan', key: 'deductions', align: 'right' },
        { header: 'Gaji Bersih Diterima', key: 'total', align: 'right' },
        { header: 'Status', key: 'status', align: 'center' },
      ],
      data: items.map((item, idx) => ({
        no: idx + 1,
        payroll_number: item.payroll_number,
        worker_name: item.worker_name,
        position: item.position || 'Staff',
        basic: formatRupiah(item.basic_salary),
        allowance: formatRupiah(item.allowance),
        overtime: formatRupiah(item.overtime),
        deductions: formatRupiah(item.deductions),
        total: item.formatted_total_salary || formatRupiah(item.total_salary),
        status: statusOverride || item.status,
      })),
      totals: {
        basic: summaryData?.formatted_basic_salary || 'Rp 0',
        total: summaryData?.formatted_total_payroll || 'Rp 0',
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Penggajian Bulanan (Staff & Administrasi)
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Pengelolaan gaji tetap bulanan, tunjangan, lembur, dan potongan staf operasional
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {currentDisplayStatus === 'Draft' && (
            <button
              onClick={() => handleUpdateStatusAll(currentRole === 'owner' ? 'Disetujui' : 'Diperiksa')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" />
              <span>{currentRole === 'owner' ? 'Setujui Seluruh Payroll' : 'Ajukan ke Owner'}</span>
            </button>
          )}

          {currentDisplayStatus === 'Diperiksa' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                Menunggu Persetujuan Owner
              </span>
              {currentRole === 'owner' && (
                <>
                  <button
                    onClick={() => handleUpdateStatusAll('Disetujui')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Setujui Seluruh Payroll</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatusAll('Draft')}
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

          {currentDisplayStatus === 'Disetujui' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
                Telah Disetujui Owner
              </span>
              {currentRole === 'owner' ? (
                <>
                  <button
                    onClick={() => handleUpdateStatusAll('Dibayar')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Tandai Semua Dibayar</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatusAll('Draft')}
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

          {currentDisplayStatus === 'Dibayar' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold shadow-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Gaji Telah Dibayarkan (Terkunci)</span>
              </div>
              {currentRole === 'owner' && (
                <button
                  onClick={() => handleUpdateStatusAll('Disetujui')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Buka kunci status gaji periode ini"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Buka Kunci</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hero Banner: Deep Forest Slate with Green Accent */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                currentDisplayStatus === 'Dibayar' 
                  ? 'bg-blue-900/60 text-blue-300 border-blue-500/30'
                  : currentDisplayStatus === 'Disetujui'
                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                  : currentDisplayStatus === 'Diperiksa'
                  ? 'bg-amber-900/60 text-amber-300 border-amber-500/30'
                  : 'bg-slate-700/60 text-slate-300 border-slate-600'
              }`}>
                Status: {currentDisplayStatus}
              </span>

              {/* Quick Action Button inside Hero Card */}
              {currentDisplayStatus === 'Draft' && (
                <button
                  onClick={() => handleUpdateStatusAll(currentRole === 'owner' ? 'Disetujui' : 'Diperiksa')}
                  className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{currentRole === 'owner' ? 'Setujui Seluruh Payroll' : 'Ajukan ke Owner'}</span>
                </button>
              )}

              {currentDisplayStatus === 'Diperiksa' && currentRole === 'owner' && (
                <button
                  onClick={() => handleUpdateStatusAll('Disetujui')}
                  className="px-3.5 py-1 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-full text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Setujui (Approve)</span>
                </button>
              )}

              {currentDisplayStatus === 'Disetujui' && currentRole === 'owner' && (
                <button
                  onClick={() => handleUpdateStatusAll('Dibayar')}
                  className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-full text-xs transition-all shadow-sm flex items-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Tandai Sudah Dibayar</span>
                </button>
              )}

              <span className="text-xs text-slate-300 font-medium">
                Periode: <strong>{period}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
              <span>Siklus Pembayaran: Bulanan</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              TOTAL GAJI BERSIH (TAKE HOME PAY) — {period.toUpperCase()}
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight">
              {summaryData?.formatted_total_payroll || summaryData?.formatted_total_salary || 'Rp 0'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-700/60">
            <div>
              <div className="text-xs text-slate-300">Total Gaji Pokok</div>
              <div className="text-lg font-bold text-white mt-1">
                {summaryData?.formatted_basic_salary || summaryData?.formatted_total_basic || 'Rp 0'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">Total Tunjangan</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {summaryData?.formatted_total_allowance || 'Rp 0'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">Total Lembur</div>
              <div className="text-lg font-bold text-amber-400 mt-1">
                {summaryData?.formatted_total_overtime || 'Rp 0'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-300">Total Karyawan</div>
              <div className="text-lg font-bold text-white mt-1">
                {summaryData?.total_workers || summaryData?.total_employees || items.length || 0} Orang
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
            placeholder="Cari karyawan, jabatan, atau no payroll..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availablePeriods.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
              {!availablePeriods.includes(period) && (
                <option value={period}>{period}</option>
              )}
            </select>
          </div>

          {/* Bulk Slip Print Button */}
          <button
            onClick={handleBulkPrintSlips}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm"
            title="Cetak slip gaji karyawan yang dipilih atau seluruh staf"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>
              Bulk Cetak Slip ({selectedStaffIds.length > 0 ? `${selectedStaffIds.length} Terpilih` : `Semua ${items.length}`})
            </span>
          </button>

          {/* Cetak Rekap A4 */}
          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Cetak Rekap (A4)</span>
          </button>

          {/* Ekspor Excel */}
          <button
            onClick={handleDirectExcelExport}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 text-xs sm:text-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={selectedStaffIds.length === items.length && items.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih Semua"
                  />
                </th>
                <th className="py-4 px-6">NO. PAYROLL</th>
                <th className="py-4 px-6">NAMA PEKERJA</th>
                <th className="py-4 px-6">JABATAN / DIVISI</th>
                <th className="py-4 px-6 text-right">GAJI POKOK</th>
                <th className="py-4 px-6 text-right">TUNJANGAN</th>
                <th className="py-4 px-6 text-right">LEMBUR</th>
                <th className="py-4 px-6 text-right">POTONGAN</th>
                <th className="py-4 px-6 text-right">TOTAL DITERIMA</th>
                <th className="py-4 px-6 text-center">STATUS</th>
                <th className="py-4 px-6 text-center">AKSI & CETAK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data payroll bulanan...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    Tidak ada data payroll bulanan untuk periode ini.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const rowStatus = statusOverride || item.status;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        selectedStaffIds.includes(item.id) ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(item.id)}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                        {item.payroll_number}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{item.worker_name}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                          {item.position}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-slate-700">
                        {item.formatted_basic_salary}
                      </td>
                      <td className="py-4 px-6 text-right text-emerald-600 font-medium">
                        {item.formatted_allowance}
                      </td>
                      <td className="py-4 px-6 text-right text-amber-600 font-medium">
                        {item.formatted_overtime}
                      </td>
                      <td className="py-4 px-6 text-right text-rose-600 font-medium">
                        {item.formatted_deductions}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 text-base">
                        {item.formatted_total_salary}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                          rowStatus === 'Dibayar'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : rowStatus === 'Disetujui'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : rowStatus === 'Diperiksa'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {rowStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedSlip(item)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                            title="Lihat Rincian Slip Gaji"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>

                          <button
                            onClick={() => handlePrintSingleSlip(item)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-2xs"
                            title="Cetak slip gaji khusus karyawan ini"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Cetak</span>
                          </button>

                          {currentRole !== 'owner' && (
                            rowStatus === 'Dibayar' ? (
                              <span 
                                className="px-2 py-1 bg-slate-50 text-slate-400 font-semibold rounded-lg text-xs cursor-not-allowed flex items-center gap-1"
                                title="Gaji telah dibayar dan terkunci"
                              >
                                <Edit3 className="w-3 h-3" />
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditFormData({
                                    basic_salary: item.basic_salary || 0,
                                    allowance: item.allowance || 0,
                                    overtime: item.overtime || 0,
                                    deductions: item.deductions || 0,
                                  });
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                                title="Edit Komponen Gaji"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rincian Slip Modal (Existing Detail View) */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-200 pb-4 mb-4">
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
                Slip Gaji Bulanan Staf
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedSlip.worker_name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {selectedSlip.payroll_number} • Jabatan: {selectedSlip.position} • Periode: {selectedSlip.period}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Gaji Pokok:</span>
                <span className="font-semibold text-slate-900">{selectedSlip.formatted_basic_salary}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Tunjangan:</span>
                <span className="font-semibold text-emerald-700">{selectedSlip.formatted_allowance}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Upah Lembur:</span>
                <span className="font-semibold text-amber-700">{selectedSlip.formatted_overtime}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Potongan (Kasbon/Izin):</span>
                <span className="font-semibold text-rose-700">{selectedSlip.formatted_deductions}</span>
              </div>
              <div className="flex justify-between pt-3 text-base font-black bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-900">Total Diterima (Take Home Pay):</span>
                <span className="text-emerald-700">{selectedSlip.formatted_total_salary}</span>
              </div>
            </div>

            {/* Slip Footer Actions */}
            <div className="flex gap-3 pt-5 border-t border-slate-200 mt-5">
              <button
                onClick={() => handlePrintSingleSlip(selectedSlip)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Slip Gaji</span>
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

      {/* Edit Komponen Gaji Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">
              Edit Komponen Gaji
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {editingItem.worker_name} ({editingItem.position}) • {period}
            </p>

            <form onSubmit={handleSaveSalaryComponents} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gaji Pokok (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editFormData.basic_salary}
                  onChange={(e) => setEditFormData({ ...editFormData, basic_salary: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tunjangan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editFormData.allowance}
                  onChange={(e) => setEditFormData({ ...editFormData, allowance: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Lembur (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editFormData.overtime}
                  onChange={(e) => setEditFormData({ ...editFormData, overtime: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Potongan Kasbon / Izin (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editFormData.deductions}
                  onChange={(e) => setEditFormData({ ...editFormData, deductions: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-rose-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tailored Monthly Slip Print Modal (A5 Landscape, Thermal 80mm, A4, or Bulk) */}
      <PrintSlipModal
        isOpen={isSlipPrintOpen}
        onClose={() => setIsSlipPrintOpen(false)}
        type="monthly"
        slips={slipPrintList}
        period={period}
      />

      {/* A4 Report Print Modal */}
      <PrintReportModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="Rekap Penggajian Bulanan Karyawan"
        subtitle={`Daftar gaji tetap, tunjangan, dan lembur staf operasional | Total Gaji: ${summaryData?.formatted_total_payroll || 'Rp 0'}`}
        period={period}
        orientation="landscape"
        excelFilename="rekap_payroll_bulanan"
        columns={[
          { header: 'No', key: 'no', align: 'center' },
          { header: 'No. Payroll', key: 'payroll_number' },
          { header: 'Nama Karyawan', key: 'worker_name' },
          { header: 'Jabatan / Divisi', key: 'position' },
          { header: 'Gaji Pokok', key: 'basic', align: 'right' },
          { header: 'Tunjangan', key: 'allowance', align: 'right' },
          { header: 'Lembur', key: 'overtime', align: 'right' },
          { header: 'Potongan', key: 'deductions', align: 'right' },
          { header: 'Total Diterima', key: 'total', align: 'right' },
          { header: 'Status', key: 'status', align: 'center' },
        ]}
        data={items.map((item, idx) => ({
          no: idx + 1,
          payroll_number: item.payroll_number,
          worker_name: item.worker_name,
          position: item.position || 'Staff',
          basic: item.formatted_basic_salary,
          allowance: item.formatted_allowance,
          overtime: item.formatted_overtime,
          deductions: item.formatted_deductions,
          total: item.formatted_total_salary,
          status: statusOverride || item.status,
        }))}
        totals={{
          basic: summaryData?.formatted_basic_salary || 'Rp 0',
          total: summaryData?.formatted_total_payroll || 'Rp 0',
        }}
      />
    </div>
  );
}
