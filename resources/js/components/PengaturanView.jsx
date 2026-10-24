import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Calendar, 
  Clock, 
  FolderTree, 
  Briefcase, 
  Plus, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Search,
  Filter,
  CheckCircle2,
  X,
  ShieldCheck,
  Tag,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function PengaturanView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();
  const [activeTab, setActiveTab] = useState('payroll-cycles'); // 'payroll-cycles', 'finance-categories', 'staff-positions'

  // ==================== TAB 1: PAYROLL CYCLES STATE ====================
  const [payrollCycles, setPayrollCycles] = useState([]);
  const [loadingCycles, setLoadingCycles] = useState(false);
  const [syncWorkers, setSyncWorkers] = useState(true);

  // ==================== TAB 2: FINANCE CATEGORIES STATE ====================
  const [financeCategories, setFinanceCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryFilterGroup, setCategoryFilterGroup] = useState('all');
  const [searchCategory, setSearchCategory] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    group: 'operating_expense',
    cost_type: 'general_operating',
    code: '',
    description: '',
  });

  // ==================== TAB 3: STAFF POSITIONS STATE ====================
  const [staffPositions, setStaffPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');

  // ==================== INITIAL FETCHES ====================
  const fetchPayrollCycles = async () => {
    try {
      setLoadingCycles(true);
      const res = await fetch('/api/settings/payroll-cycles');
      const json = await res.json();
      if (json.status === 'success') {
        setPayrollCycles(json.data);
      }
    } catch (err) {
      console.error('Gagal memuat siklus payroll:', err);
    } finally {
      setLoadingCycles(false);
    }
  };

  const fetchFinanceCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch('/api/settings/finance-categories');
      const json = await res.json();
      if (json.status === 'success') {
        setFinanceCategories(json.data);
      }
    } catch (err) {
      console.error('Gagal memuat kategori keuangan:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchStaffPositions = async () => {
    try {
      setLoadingPositions(true);
      const res = await fetch('/api/settings/staff-positions');
      const json = await res.json();
      if (json.status === 'success') {
        setStaffPositions(json.data);
      }
    } catch (err) {
      console.error('Gagal memuat jabatan staf:', err);
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payroll-cycles') fetchPayrollCycles();
    if (activeTab === 'finance-categories') fetchFinanceCategories();
    if (activeTab === 'staff-positions') fetchStaffPositions();
  }, [activeTab]);

  // ==================== HANDLERS TAB 1: PAYROLL CYCLES ====================
  const handleToggleCycle = async (processName, currentDay) => {
    const nextDay = currentDay === 'Kamis' ? 'Sabtu' : 'Kamis';
    showLoading(`Mengubah siklus ${processName} menjadi hari ${nextDay}...`);
    try {
      const res = await fetch('/api/settings/payroll-cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          process: processName,
          cycle_day: nextDay,
          sync_workers: syncWorkers,
        }),
      });
      const json = await res.json();
      hideLoading();
      if (json.status === 'success') {
        showSuccess(json.message || `Siklus ${processName} berhasil diubah ke hari ${nextDay}`);
        fetchPayrollCycles();
      } else {
        showError(json.message || 'Gagal mengubah siklus.');
      }
    } catch (err) {
      hideLoading();
      showError('Terjadi kesalahan jaringan.');
    }
  };

  // ==================== HANDLERS TAB 2: FINANCE CATEGORIES ====================
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showError('Nama kategori wajib diisi!');
      return;
    }

    showLoading('Menyimpan kategori akun keuangan baru...');
    try {
      const res = await fetch('/api/settings/finance-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify(categoryForm),
      });
      const json = await res.json();
      hideLoading();
      if (json.status === 'success') {
        showSuccess(json.message || 'Kategori berhasil ditambahkan!');
        setIsCategoryModalOpen(false);
        setCategoryForm({
          name: '',
          group: 'operating_expense',
          cost_type: 'general_operating',
          code: '',
          description: '',
        });
        fetchFinanceCategories();
      } else {
        const errMsg = json.message || (json.errors ? Object.values(json.errors).flat().join(' ') : 'Gagal menyimpan kategori.');
        showError(errMsg);
      }
    } catch (err) {
      hideLoading();
      showError('Terjadi kesalahan saat menyimpan kategori.');
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    showLoading(`Mengubah status kategori ${cat.name}...`);
    try {
      const res = await fetch(`/api/settings/finance-categories/${cat.id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });
      const json = await res.json();
      hideLoading();
      if (json.status === 'success') {
        showSuccess(json.message);
        fetchFinanceCategories();
      } else {
        showError(json.message || 'Gagal mengubah status kategori.');
      }
    } catch (err) {
      hideLoading();
      showError('Terjadi kesalahan jaringan.');
    }
  };

  // ==================== HANDLERS TAB 3: STAFF POSITIONS ====================
  const handleAddPosition = async (e) => {
    e.preventDefault();
    if (!newPositionName.trim()) {
      showError('Nama jabatan staf wajib diisi!');
      return;
    }

    showLoading('Menambahkan jabatan staf...');
    try {
      const res = await fetch('/api/settings/staff-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({ name: newPositionName.trim() }),
      });
      const json = await res.json();
      hideLoading();
      if (json.status === 'success') {
        showSuccess(json.message || 'Jabatan staf berhasil ditambahkan!');
        setNewPositionName('');
        fetchStaffPositions();
      } else {
        const errMsg = json.message || (json.errors ? Object.values(json.errors).flat().join(' ') : 'Gagal menambahkan jabatan.');
        showError(errMsg);
      }
    } catch (err) {
      hideLoading();
      showError('Terjadi kesalahan saat menambahkan jabatan.');
    }
  };

  const handleDeletePosition = async (id, name) => {
    if (!confirm(`Hapus jabatan staf "${name}"?`)) return;

    showLoading(`Menghapus jabatan ${name}...`);
    try {
      const res = await fetch(`/api/settings/staff-positions/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });
      const json = await res.json();
      hideLoading();
      if (json.status === 'success') {
        showSuccess(json.message || 'Jabatan staf berhasil dihapus.');
        fetchStaffPositions();
      } else {
        showError(json.message || 'Gagal menghapus jabatan.');
      }
    } catch (err) {
      hideLoading();
      showError('Terjadi kesalahan saat menghapus jabatan.');
    }
  };

  // Filtered categories
  const filteredCategories = financeCategories.filter(cat => {
    const matchSearch = cat.name.toLowerCase().includes(searchCategory.toLowerCase()) ||
                        (cat.code && cat.code.toLowerCase().includes(searchCategory.toLowerCase()));
    const matchGroup = categoryFilterGroup === 'all' || cat.group === categoryFilterGroup;
    return matchSearch && matchGroup;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                <Settings className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pengaturan & Konfigurasi Sistem
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Pusat kendali jadwal siklus payroll, bagan akun resmi Laba Rugi, dan daftar jabatan staf operasional.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Mode Dinamis (Zero Hardcode)
            </span>
          </div>
        </div>

        {/* Tab Navigation Pill */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          <button
            onClick={() => setActiveTab('payroll-cycles')}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'payroll-cycles'
                ? 'bg-[#15352A] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Siklus Payroll Proses</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'payroll-cycles' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {payrollCycles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('finance-categories')}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'finance-categories'
                ? 'bg-[#15352A] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Kategori Keuangan (Bagan Akun)</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'finance-categories' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {financeCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('staff-positions')}
            className={`px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'staff-positions'
                ? 'bg-[#15352A] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Jabatan Staf Kantor</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'staff-positions' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {staffPositions.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SIKLUS PAYROLL PROSES (KAMIS VS SABTU MAPPING) */}
      {/* ========================================================================= */}
      {activeTab === 'payroll-cycles' && (
        <div className="space-y-6">
          {/* Explanation Alert */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Pemetaan Hari Gajian Produksi (Dual-Cycle Payroll)
                </h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-2xl">
                  Tentukan apakah pekerja pada proses berikut menerima gaji mingguan setiap hari <strong>Kamis</strong> (Jahit/Potong/dsb) atau <strong>Sabtu</strong> (Kansay/Overdek/QC/dsb).
                  Saat Anda mengubah jadwal di sini, sistem dapat otomatis memperbarui siklus pada data seluruh pekerja aktif terkait.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-2 rounded-xl border border-emerald-200">
              <input
                type="checkbox"
                id="syncWorkerCheck"
                checked={syncWorkers}
                onChange={(e) => setSyncWorkers(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="syncWorkerCheck" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Sinkronkan ke Pekerja Aktif
              </label>
            </div>
          </div>

          {/* Table of Processes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Daftar Proses Kerja & Jadwal Gajian</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik tombol switch untuk memindahkan jadwal gajian antara Kamis dan Sabtu seketika.
                </p>
              </div>
              <button
                onClick={fetchPayrollCycles}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCycles ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Nama Proses Kerja</th>
                    <th className="py-4 px-6">Jadwal Siklus Gajian</th>
                    <th className="py-4 px-6">Jumlah Pekerja Terdaftar</th>
                    <th className="py-4 px-6 text-center">Aksi / Switch Hari</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingCycles ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-slate-400">
                        <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <div>Memuat jadwal siklus...</div>
                      </td>
                    </tr>
                  ) : payrollCycles.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center text-slate-400">
                        Tidak ada proses kerja terdaftar.
                      </td>
                    </tr>
                  ) : (
                    payrollCycles.map((item, index) => {
                      const isKamis = item.cycle_day === 'Kamis';
                      return (
                        <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800 text-base">{item.process}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                              isKamis 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              Gajian Hari {item.cycle_day}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-slate-600 font-semibold">{item.active_workers_count} orang</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleToggleCycle(item.process, item.cycle_day)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 mx-auto ${
                                isKamis
                                  ? 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                                  : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
                              }`}
                            >
                              <span>Pindahkan ke {isKamis ? 'Sabtu' : 'Kamis'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FINANCE CATEGORIES (BAGAN AKUN & COST_TYPE) */}
      {/* ========================================================================= */}
      {activeTab === 'finance-categories' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kategori atau kode..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Group Filter */}
              <select
                value={categoryFilterGroup}
                onChange={(e) => setCategoryFilterGroup(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 bg-white"
              >
                <option value="all">Semua Kelompok Akun</option>
                <option value="income">Pendapatan Usaha</option>
                <option value="deduction">Potongan & Retur Penjualan</option>
                <option value="cogs">HPP / Biaya Pokok Penjualan</option>
                <option value="operating_expense">Biaya Operasional (27 Akun Resmi)</option>
                <option value="non_operating">Beban Luar Usaha & Pajak</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#15352A] hover:bg-[#1a4235] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Akun Baru</span>
              </button>
            </div>
          </div>

          {/* Table Categories */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Kode Akun</th>
                    <th className="py-4 px-6">Nama Kategori Akun</th>
                    <th className="py-4 px-6">Kelompok Laba Rugi</th>
                    <th className="py-4 px-6">Klasifikasi Biaya Produksi (cost_type)</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loadingCategories ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <div>Memuat kategori keuangan...</div>
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        Tidak ada kategori yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => {
                      const groupLabels = {
                        income: 'Pendapatan',
                        deduction: 'Potongan/Retur',
                        cogs: 'HPP / Bahan Pokok',
                        operating_expense: 'Operasional',
                        non_operating: 'Luar Usaha & Pajak',
                      };
                      const costTypeLabels = {
                        material: 'Bahan Baku',
                        service: 'Jasa Konveksi',
                        repair: 'Service / Perbaikan',
                        overhead: 'Overhead Pabrik',
                        general_operating: 'Biaya Umum',
                      };

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs font-bold text-slate-500">
                            {cat.code || '-'}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-900">{cat.name}</span>
                            {cat.description && (
                              <div className="text-[11px] text-slate-400">{cat.description}</div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                              {groupLabels[cat.group] || cat.group}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              cat.cost_type === 'material' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              cat.cost_type === 'service' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                              cat.cost_type === 'repair' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {costTypeLabels[cat.cost_type] || cat.cost_type || '-'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {cat.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleToggleCategoryActive(cat)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                cat.is_active
                                  ? 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {cat.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STAFF POSITIONS (JABATAN STAF KANTOR) */}
      {/* ========================================================================= */}
      {activeTab === 'staff-positions' && (
        <div className="space-y-6">
          {/* Explanation Alert */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <Briefcase className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Daftar Pilihan Jabatan Staf Kantor & Operasional
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Daftar jabatan di bawah ini digunakan secara otomatis sebagai pilihan dropdown pada form <strong>Master Pekerja</strong> ketika admin memilih jenis pekerja "Staff" atau sistem pembayaran "Bulanan". Tidak ada lagi teks jabatan yang tertanam mati di kode frontend.
              </p>
            </div>
          </div>

          {/* Add Position Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">Tambah Jabatan Staf Baru</h3>
            <form onSubmit={handleAddPosition} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Contoh: Staff Gudang Aksesoris, Supervisor QC, dsb..."
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#1a4235] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Jabatan</span>
              </button>
            </form>
          </div>

          {/* Positions Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Daftar Jabatan Aktif ({staffPositions.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftar yang sudah terdaftar di sistem.</p>
              </div>
              <button
                onClick={fetchStaffPositions}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPositions ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-6">
              {loadingPositions ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <div>Memuat jabatan...</div>
                </div>
              ) : staffPositions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  Belum ada jabatan staf yang tersimpan.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {staffPositions.map((pos) => (
                    <div
                      key={pos.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span className="font-bold text-sm text-slate-800">{pos.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePosition(pos.id, pos.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Jabatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH KATEGORI KEUANGAN BARU */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tambah Akun Keuangan Baru</h3>
                <p className="text-xs text-slate-500 mt-0.5">Daftarkan akun resmi ke bagan akun Laba Rugi.</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Akun / Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beban Konsumsi Lembur, Beban Ekspedisi Khusus"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kelompok Akun
                  </label>
                  <select
                    value={categoryForm.group}
                    onChange={(e) => setCategoryForm({ ...categoryForm, group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="operating_expense">Biaya Operasional</option>
                    <option value="cogs">HPP / Biaya Pokok Penjualan</option>
                    <option value="income">Pendapatan Usaha</option>
                    <option value="deduction">Potongan & Retur Penjualan</option>
                    <option value="non_operating">Beban Luar Usaha & Pajak</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Klasifikasi Biaya (cost_type)
                  </label>
                  <select
                    value={categoryForm.cost_type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, cost_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="general_operating">Biaya Operasional Umum</option>
                    <option value="material">Bahan Baku (Kain & Aksesoris)</option>
                    <option value="service">Jasa Konveksi / Maklon</option>
                    <option value="repair">Service & Pemeliharaan Mesin</option>
                    <option value="overhead">Overhead Pabrik</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kode Akun (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 5-1028"
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#1a4235] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
