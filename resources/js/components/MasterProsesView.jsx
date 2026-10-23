import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  ShieldCheck, 
  TrendingUp, 
  Info, 
  Tag, 
  Filter,
  RefreshCw,
  BookOpen,
  SlidersHorizontal,
  ArrowUpDown,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function MasterProsesView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();

  // Sub-Tab Switcher: 'katalog' (Katalog Master Proses) | 'tarif' (Tarif Pekerjaan per Produk)
  const [activeSubTab, setActiveSubTab] = useState('katalog');

  // ==========================================
  // TAB 1: KATALOG MASTER PROSES STATE
  // ==========================================
  const [catalogList, setCatalogList] = useState([]);
  const [catalogPagination, setCatalogPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [catalogSummary, setCatalogSummary] = useState({
    total_processes: 0,
    active_processes: 0,
    formatted_avg_default_rate: 'Rp 0',
  });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('Semua');
  const [catalogSort, setCatalogSort] = useState('id_asc');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPerPage, setCatalogPerPage] = useState(10);

  // Modal State Tab 1
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [catalogFormData, setCatalogFormData] = useState({
    process_name: '',
    process_code: '',
    description: '',
    default_rate: '',
    unit: 'pcs',
    is_active: true,
  });

  // ==========================================
  // TAB 2: TARIF PEKERJAAN PER PRODUK STATE
  // ==========================================
  const [ratesList, setRatesList] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [standardProcesses, setStandardProcesses] = useState([]);
  const [ratesSummary, setRatesSummary] = useState({
    total_rates: 0,
    active_rates: 0,
    custom_rates_count: 0,
    formatted_avg_rate: 'Rp 0',
  });
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesSearch, setRatesSearch] = useState('');
  const [ratesGroupFilter, setRatesGroupFilter] = useState('Semua');
  const [ratesStatusFilter, setRatesStatusFilter] = useState('Semua');
  const [ratesTypeFilter, setRatesTypeFilter] = useState('Semua'); // 'Semua' | 'Standar' | 'Khusus'

  // Modal State Tab 2
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [ratesFormData, setRatesFormData] = useState({
    product_name: '',
    product_group_id: '',
    process_name: '',
    rate: '',
    unit: 'pcs',
    is_custom_rate: false,
    is_active: true,
  });
  const [previewDefaultRate, setPreviewDefaultRate] = useState(0);
  const [previewUnit, setPreviewUnit] = useState('pcs');

  // ==========================================
  // FETCH HANDLERS
  // ==========================================

  // Fetch Katalog Master Proses (Tab 1)
  const fetchCatalog = async () => {
    try {
      setCatalogLoading(true);
      const [sortBy, sortDir] = catalogSort.split('_');
      const params = new URLSearchParams({
        page: catalogPage.toString(),
        per_page: catalogPerPage.toString(),
        search: catalogSearch,
        status: catalogStatus,
        sort_by: sortBy || 'id',
        sort_dir: sortDir || 'asc',
      });

      const res = await fetch(`/api/production-processes?${params.toString()}`);
      const json = await res.json();
      if (json.status === 'success') {
        setCatalogList(json.data || []);
        if (json.pagination) {
          setCatalogPagination(json.pagination);
        }
        if (json.summary) {
          setCatalogSummary(json.summary);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil katalog proses:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch Tarif Pekerjaan per Produk (Tab 2)
  const fetchRates = async () => {
    try {
      setRatesLoading(true);
      const params = new URLSearchParams({
        search: ratesSearch,
        product_group_id: ratesGroupFilter,
        status: ratesStatusFilter,
      });

      const res = await fetch(`/api/master-proses?${params.toString()}`);
      const json = await res.json();
      if (json.status === 'success') {
        setRatesList(json.data || []);
        setProductGroups(json.product_groups || []);
        setStandardProcesses(json.standard_processes || []);
        if (json.summary) {
          setRatesSummary(json.summary);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data tarif proses:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  // Trigger fetch when parameters change
  useEffect(() => {
    if (activeSubTab === 'katalog') {
      fetchCatalog();
    } else {
      fetchRates();
    }
  }, [activeSubTab, catalogPage, catalogPerPage, catalogSort, catalogStatus, ratesGroupFilter, ratesStatusFilter]);

  // Handle Search Tab 1
  const handleCatalogSearchSubmit = (e) => {
    e.preventDefault();
    setCatalogPage(1);
    fetchCatalog();
  };

  // Handle Search Tab 2
  const handleRatesSearchSubmit = (e) => {
    e.preventDefault();
    fetchRates();
  };

  // Filtered rates list based on type filter ('Standar' vs 'Khusus')
  const displayedRates = ratesList.filter(item => {
    if (ratesTypeFilter === 'Standar') return !item.is_custom_rate;
    if (ratesTypeFilter === 'Khusus') return !!item.is_custom_rate;
    return true;
  });

  // ==========================================
  // TAB 1 (KATALOG) MODAL & CRUD ACTIONS
  // ==========================================

  const handleOpenAddCatalogModal = () => {
    setEditingProcess(null);
    setCatalogFormData({
      process_name: '',
      process_code: '',
      description: '',
      default_rate: '',
      unit: 'pcs',
      is_active: true,
    });
    setIsCatalogModalOpen(true);
  };

  const handleOpenEditCatalogModal = (item) => {
    setEditingProcess(item);
    setCatalogFormData({
      process_name: item.process_name,
      process_code: item.process_code || '',
      description: item.description || '',
      default_rate: item.default_rate,
      unit: item.unit || 'pcs',
      is_active: item.is_active ? true : false,
    });
    setIsCatalogModalOpen(true);
  };

  const handleSaveCatalog = async (e) => {
    e.preventDefault();
    if (!catalogFormData.process_name.trim()) {
      showError('Nama proses pekerjaan wajib diisi!');
      return;
    }
    if (catalogFormData.default_rate < 0) {
      showError('Tarif bawaan tidak boleh bernilai negatif!');
      return;
    }

    showLoading({
      title: editingProcess ? 'Memperbarui Master Proses...' : 'Menambahkan Master Proses...',
      subtitle: `Menyimpan standar upah bawaan ${catalogFormData.process_name}...`,
      type: 'production',
    });

    try {
      const url = editingProcess ? `/api/production-processes/${editingProcess.id}` : '/api/production-processes';
      const method = editingProcess ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(catalogFormData),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: editingProcess ? 'Master Proses Diperbarui!' : 'Master Proses Ditambahkan!',
          subtitle: `Proses ${catalogFormData.process_name} telah tersimpan di katalog standar pabrik.`,
          duration: 900,
          onComplete: () => {
            setIsCatalogModalOpen(false);
            fetchCatalog();
            fetchRates(); // Sinkronisasi daftar referensi standar
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal menyimpan master proses.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleDeleteCatalog = async (item) => {
    if (!confirm(`Hapus proses '${item.process_name}' dari katalog pabrik?\n\nCatatan: Jika proses ini pernah dipakai di riwayat produksi atau tarif produk, proses akan dinonaktifkan (arsip) untuk melindungi histori transaksi.`)) return;

    showLoading({
      title: 'Menghapus Master Proses...',
      subtitle: `Memeriksa keterkaitan data ${item.process_name}...`,
      type: 'production',
    });

    try {
      const res = await fetch(`/api/production-processes/${item.id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Selesai',
          subtitle: json.message || `Proses ${item.process_name} berhasil diproses.`,
          duration: 900,
          onComplete: () => {
            fetchCatalog();
            fetchRates();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal menghapus master proses.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleToggleCatalogStatus = async (item) => {
    try {
      const res = await fetch(`/api/production-processes/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          is_active: !item.is_active,
        }),
      });
      if (res.ok) {
        fetchCatalog();
      }
    } catch (e) {
      console.error('Gagal toggle status:', e);
    }
  };

  // ==========================================
  // TAB 2 (TARIF PRODUK) MODAL & ACTIONS
  // ==========================================

  const handleOpenAddRateModal = () => {
    setEditingRate(null);
    const defaultGroup = productGroups[0]?.name || '';
    const defaultGroupId = productGroups[0]?.id || '';
    const firstProcess = standardProcesses[0];

    const initialRate = firstProcess ? firstProcess.default_rate : 0;
    const initialUnit = firstProcess ? (firstProcess.unit || 'pcs') : 'pcs';

    setPreviewDefaultRate(initialRate);
    setPreviewUnit(initialUnit);

    setRatesFormData({
      product_name: defaultGroup,
      product_group_id: defaultGroupId,
      process_name: firstProcess ? firstProcess.process_name : '',
      rate: initialRate,
      unit: initialUnit,
      is_custom_rate: false,
      is_active: true,
    });
    setIsRatesModalOpen(true);
  };

  const handleOpenEditRateModal = (item) => {
    setEditingRate(item);
    // Cari proses standar di katalog untuk melihat tarif bawaan
    const matchedStd = standardProcesses.find(p => p.process_name.toLowerCase() === item.process_name.toLowerCase());
    const stdRate = matchedStd ? matchedStd.default_rate : (item.production_process ? item.production_process.default_rate : item.rate);
    const stdUnit = matchedStd ? (matchedStd.unit || 'pcs') : (item.unit || 'pcs');

    setPreviewDefaultRate(stdRate);
    setPreviewUnit(stdUnit);

    setRatesFormData({
      product_name: item.product_name,
      product_group_id: item.product_group_id || '',
      process_name: item.process_name,
      rate: item.rate,
      unit: item.unit || 'pcs',
      is_custom_rate: Boolean(item.is_custom_rate),
      is_active: Boolean(item.is_active),
    });
    setIsRatesModalOpen(true);
  };

  // Handler saat user memilih proses di modal tarif
  const handleProcessSelectChange = (chosenProcessName) => {
    const matched = standardProcesses.find(p => p.process_name === chosenProcessName);
    const defRate = matched ? Number(matched.default_rate) : 0;
    const defUnit = matched ? (matched.unit || 'pcs') : 'pcs';

    setPreviewDefaultRate(defRate);
    setPreviewUnit(defUnit);

    setRatesFormData(prev => ({
      ...prev,
      process_name: chosenProcessName,
      unit: defUnit,
      // Jika tidak dalam mode kustom, rate otomatis mengikuti tarif bawaan
      rate: prev.is_custom_rate ? prev.rate : defRate,
    }));
  };

  // Handler saat checkbox "Sesuaikan Tarif Khusus" diubah
  const handleToggleCustomRate = (isCustom) => {
    setRatesFormData(prev => ({
      ...prev,
      is_custom_rate: isCustom,
      // Jika di-uncheck (kembali ke bawaan), reset rate ke previewDefaultRate
      rate: isCustom ? prev.rate : previewDefaultRate,
    }));
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!ratesFormData.process_name.trim()) {
      showError('Pilih proses pekerjaan terlebih dahulu!');
      return;
    }
    if (ratesFormData.rate < 0) {
      showError('Besaran tarif tidak boleh bernilai negatif!');
      return;
    }

    showLoading({
      title: editingRate ? 'Memperbarui Tarif Produk...' : 'Menetapkan Tarif Produk...',
      subtitle: `Menyimpan tarif ${ratesFormData.process_name} untuk ${ratesFormData.product_name}...`,
      type: 'production',
    });

    try {
      const url = editingRate ? `/api/master-proses/${editingRate.id}` : '/api/master-proses';
      const method = editingRate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(ratesFormData),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: editingRate ? 'Tarif Produk Diperbarui!' : 'Tarif Produk Berhasil Ditetapkan!',
          subtitle: `Tarif ${ratesFormData.process_name} (${ratesFormData.product_name}) siap otomatis ditarik di Produksi Harian.`,
          duration: 900,
          onComplete: () => {
            setIsRatesModalOpen(false);
            fetchRates();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal menyimpan tarif produk.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleDeleteRate = async (id, processName, productName) => {
    if (!confirm(`Hapus tarif pekerjaan ${processName} untuk model produk ${productName}?`)) return;

    showLoading({
      title: 'Menghapus Tarif Produk...',
      subtitle: `Memproses penghapusan ${processName}...`,
      type: 'production',
    });

    try {
      const res = await fetch(`/api/master-proses/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Tarif Terhapus',
          subtitle: `Tarif ${processName} untuk ${productName} telah dihapus.`,
          duration: 800,
          onComplete: () => {
            fetchRates();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal menghapus tarif.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleToggleRateStatus = async (item) => {
    try {
      const res = await fetch(`/api/master-proses/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          is_active: !item.is_active,
        }),
      });
      if (res.ok) {
        fetchRates();
      }
    } catch (e) {
      console.error('Gagal toggle status:', e);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shadow-xs">
              <Scissors className="w-6 h-6" />
            </span>
            <span>Master Proses & Tarif Pekerjaan</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">
            Katalog baku proses konveksi, tarif bawaan pabrik, dan penetapan tarif upah borongan per model produk
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeSubTab === 'katalog') fetchCatalog();
              else fetchRates();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 shadow-xs transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>

          {activeSubTab === 'katalog' ? (
            <button
              onClick={handleOpenAddCatalogModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Master Proses</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddRateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tetapkan Tarif Produk</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB SELECTOR (MODERN PILL TABS) */}
      <div className="flex border-b border-slate-200/80 gap-3">
        <button
          onClick={() => setActiveSubTab('katalog')}
          className={`flex items-center gap-2.5 px-5 py-3.5 border-b-2 font-bold text-sm transition-all ${
            activeSubTab === 'katalog'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Katalog Master Proses</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeSubTab === 'katalog' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            {catalogSummary.total_processes}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('tarif')}
          className={`flex items-center gap-2.5 px-5 py-3.5 border-b-2 font-bold text-sm transition-all ${
            activeSubTab === 'tarif'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Tarif Pekerjaan per Produk</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeSubTab === 'tarif' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            {ratesSummary.total_rates}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW SUB-TAB 1: KATALOG MASTER PROSES                          */}
      {/* ============================================================== */}
      {activeSubTab === 'katalog' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary KPI Cards Tab 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Proses di Katalog
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {catalogSummary.total_processes} <span className="text-sm font-normal text-slate-400">proses</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-extrabold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Proses Status Aktif
                </div>
                <div className="text-2xl font-extrabold text-blue-900 mt-0.5">
                  {catalogSummary.active_processes} <span className="text-sm font-normal text-slate-400">aktif</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-extrabold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rata-rata Upah Bawaan
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-0.5">
                  {catalogSummary.formatted_avg_default_rate} <span className="text-xs font-normal text-slate-400">/ pcs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table Card Tab 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Filter and Search Bar */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <form onSubmit={handleCatalogSearchSubmit} className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Cari nama proses, kode, atau deskripsi..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
                />
              </form>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Filter Status */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={catalogStatus}
                    onChange={(e) => {
                      setCatalogStatus(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Urutan:</span>
                  <select
                    value={catalogSort}
                    onChange={(e) => {
                      setCatalogSort(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
                  >
                    <option value="id_asc">ID Bawaan (Standar)</option>
                    <option value="process_name_asc">Nama Proses (A - Z)</option>
                    <option value="process_name_desc">Nama Proses (Z - A)</option>
                    <option value="default_rate_asc">Tarif Terendah</option>
                    <option value="default_rate_desc">Tarif Tertinggi</option>
                    <option value="created_at_desc">Terbaru Ditambahkan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Catalog Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Kode / ID</th>
                    <th className="py-4 px-6">Nama Proses Pekerjaan</th>
                    <th className="py-4 px-6">Deskripsi / Keterangan</th>
                    <th className="py-4 px-6">Tarif Upah Bawaan</th>
                    <th className="py-4 px-6">Satuan</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {catalogLoading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Memuat katalog master proses...
                      </td>
                    </tr>
                  ) : catalogList.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Tidak ada proses ditemukan di katalog. Silakan tambahkan proses baru.
                      </td>
                    </tr>
                  ) : (
                    catalogList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200/70">
                            {item.process_code || `PRC-${item.id}`}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-emerald-600" />
                            <span>{item.process_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 max-w-xs">
                          <p className="line-clamp-2 text-xs">
                            {item.description || <span className="text-slate-300 italic">Tidak ada deskripsi</span>}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-base font-extrabold text-emerald-700">
                            Rp {Number(item.default_rate).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium">
                          per {item.unit || 'pcs'}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleCatalogStatus(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              item.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Klik untuk ubah status aktif/nonaktif"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                            <span>{item.is_active ? 'Aktif' : 'Nonaktif'}</span>
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditCatalogModal(item)}
                              className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit Master Proses"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCatalog(item)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus / Nonaktifkan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Tab 1 */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Menampilkan <strong>{catalogPagination.from}</strong> - <strong>{catalogPagination.to}</strong> dari total <strong>{catalogPagination.total}</strong> master proses
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={catalogPage <= 1}
                  onClick={() => setCatalogPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="font-semibold px-2 text-slate-700">
                  Halaman {catalogPagination.current_page} / {catalogPagination.last_page || 1}
                </span>
                <button
                  disabled={catalogPage >= catalogPagination.last_page}
                  onClick={() => setCatalogPage(prev => Math.min(catalogPagination.last_page, prev + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 shadow-2xs"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Business Rule Callout */}
            <div className="p-4 bg-emerald-50/40 border-t border-emerald-100 flex items-start gap-3 text-xs text-slate-600">
              <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Prinsip Katalog Baku Konveksi:</strong> Seluruh proses di sini menjadi kamus acuan standar bagi pabrik. Tarif bawaan ini secara otomatis diterapkan ke semua model produk kecuali jika pada tab <em>Tarif Pekerjaan per Produk</em> dicentang <strong>"Sesuaikan Tarif Khusus"</strong>.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW SUB-TAB 2: TARIF PEKERJAAN PER PRODUK                     */}
      {/* ============================================================== */}
      {activeSubTab === 'tarif' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary KPI Cards Tab 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Tarif Terdaftar
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {ratesSummary.total_rates} <span className="text-sm font-normal text-slate-400">tarif</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-extrabold">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tarif Khusus / Disesuaikan
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-0.5">
                  {ratesSummary.custom_rates_count} <span className="text-sm font-normal text-slate-400">spesifik</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-extrabold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rata-rata Upah Berlaku
                </div>
                <div className="text-2xl font-extrabold text-blue-900 mt-0.5">
                  {ratesSummary.formatted_avg_rate} <span className="text-xs font-normal text-slate-400">/ pcs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Table Card Tab 2 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Filter and Search Bar */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <form onSubmit={handleRatesSearchSubmit} className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={ratesSearch}
                  onChange={(e) => setRatesSearch(e.target.value)}
                  placeholder="Cari proses atau produk..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
                />
              </form>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {/* Filter Group Produk */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Model:</span>
                  <select
                    value={ratesGroupFilter}
                    onChange={(e) => setRatesGroupFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
                  >
                    <option value="Semua">Semua Model</option>
                    {productGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Tipe Tarif */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Tipe:</span>
                  <select
                    value={ratesTypeFilter}
                    onChange={(e) => setRatesTypeFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
                  >
                    <option value="Semua">Semua Tipe</option>
                    <option value="Standar">Standar Bawaan</option>
                    <option value="Khusus">Khusus Disesuaikan</option>
                  </select>
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <select
                    value={ratesStatusFilter}
                    onChange={(e) => setRatesStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
                  >
                    <option value="Semua">Semua</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rates Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Model / Kelompok Produk</th>
                    <th className="py-4 px-6">Proses Pekerjaan</th>
                    <th className="py-4 px-6">Tipe Tarif</th>
                    <th className="py-4 px-6">Tarif Upah Berlaku</th>
                    <th className="py-4 px-6">Satuan</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ratesLoading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Memuat data tarif pekerjaan...
                      </td>
                    </tr>
                  ) : displayedRates.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Tidak ada tarif pekerjaan ditemukan. Silakan tambahkan tarif baru.
                      </td>
                    </tr>
                  ) : (
                    displayedRates.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-emerald-600" />
                            <span>{item.product_name}</span>
                          </div>
                          {item.product_group && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              Model Konveksi • ID #{item.product_group.id}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-800 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-xs">
                            {item.process_name}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {item.is_custom_rate ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200/70">
                              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                              <span>Khusus Disesuaikan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Standar Bawaan</span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold text-emerald-700">
                              Rp {Number(item.rate).toLocaleString('id-ID')}
                            </span>
                            {item.is_custom_rate && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                                kustom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium">
                          per {item.unit || 'pcs'}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleRateStatus(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              item.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Klik untuk ubah status aktif/nonaktif"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                            <span>{item.is_active ? 'Aktif' : 'Nonaktif'}</span>
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditRateModal(item)}
                              className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Edit Tarif Produk"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRate(item.id, item.process_name, item.product_name)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Tarif"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Business Rule Callout Tab 2 */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-start gap-3 text-xs text-slate-500">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Prinsip Integritas Histori SPK:</strong> Tarif yang aktif di sini langsung ditarik otomatis saat staf memilih proses dan produk pada <em>Produksi Harian</em>. Pembaruan tarif tidak akan mengubah total upah transaksi masa lalu yang sudah tersimpan.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TAB 1: TAMBAH / EDIT KATALOG MASTER PROSES               */}
      {/* ============================================================== */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-emerald-700" />
                  <span>{editingProcess ? 'Edit Master Proses' : 'Tambah Master Proses Baru'}</span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Kamus proses produksi standar pabrik beserta tarif upah bawaan konveksi.
                </p>
              </div>
              <button
                onClick={() => setIsCatalogModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCatalog} className="p-8 space-y-5">
              {/* Nama Proses & Kode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nama Proses Pekerjaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={catalogFormData.process_name}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, process_name: e.target.value })}
                    placeholder="Contoh: Jahit, Potong, QC"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Kode Proses <span className="text-xs font-normal text-slate-400">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={catalogFormData.process_code}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, process_code: e.target.value.toUpperCase() })}
                    placeholder="Contoh: PRC-JAHIT"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 uppercase font-mono"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Deskripsi / Alur Kerja
                </label>
                <textarea
                  rows="3"
                  value={catalogFormData.description}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, description: e.target.value })}
                  placeholder="Penjelasan alur kerja proses produksi atau spesifikasi pengerjaan..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Tarif Bawaan & Satuan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tarif Bawaan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={catalogFormData.default_rate}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, default_rate: e.target.value })}
                    placeholder="Contoh: 2500"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-bold text-emerald-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Satuan Hitung
                  </label>
                  <select
                    value={catalogFormData.unit}
                    onChange={(e) => setCatalogFormData({ ...catalogFormData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="pcs">pcs (buah)</option>
                    <option value="lusin">lusin (12 pcs)</option>
                    <option value="kodi">kodi (20 pcs)</option>
                    <option value="meter">meter</option>
                  </select>
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="catalog_is_active_checkbox"
                  checked={catalogFormData.is_active}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="catalog_is_active_checkbox" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                  Aktifkan master proses ini dalam pilihan sistem produksi
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
                >
                  {editingProcess ? 'Simpan Perubahan' : 'Tambah Master Proses'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TAB 2: TETAPKAN / EDIT TARIF PEKERJAAN PRODUK           */}
      {/* ============================================================== */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-700" />
                  <span>{editingRate ? 'Edit Tarif Pekerjaan Produk' : 'Tetapkan Tarif Pekerjaan Baru'}</span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Pilih produk & proses pekerjaan. Tarif otomatis mengikuti bawaan katalog kecuali jika disesuaikan.
                </p>
              </div>
              <button
                onClick={() => setIsRatesModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRate} className="p-8 space-y-5">
              {/* Model Produk */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Model / Kelompok Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  value={ratesFormData.product_group_id || ''}
                  onChange={(e) => {
                    const selectedGrp = productGroups.find(g => g.id == e.target.value);
                    setRatesFormData({
                      ...ratesFormData,
                      product_group_id: e.target.value,
                      product_name: selectedGrp ? selectedGrp.name : ratesFormData.product_name,
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 bg-white"
                  required
                >
                  {productGroups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Berlaku otomatis untuk semua varian & warna SKU di bawah kelompok produk ini.
                </p>
              </div>

              {/* Pilih Proses Pekerjaan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Pilih Proses Pekerjaan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={ratesFormData.process_name}
                  onChange={(e) => handleProcessSelectChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 bg-white font-semibold"
                  required
                >
                  <option value="">-- Pilih Proses dari Katalog --</option>
                  {standardProcesses.map((proc) => (
                    <option key={proc.id} value={proc.process_name}>
                      {proc.process_name} (Bawaan: Rp {Number(proc.default_rate).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Informative Callout: Info Tarif Bawaan */}
              {ratesFormData.process_name && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-900">Tarif Bawaan Katalog:</div>
                      <div className="text-sm font-bold text-emerald-800">
                        Rp {Number(previewDefaultRate).toLocaleString('id-ID')} / {previewUnit}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-600 font-medium">
                    Standar Pabrik
                  </div>
                </div>
              )}

              {/* Checkbox Sesuaikan Tarif Khusus */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_custom_rate_checkbox"
                    checked={ratesFormData.is_custom_rate}
                    onChange={(e) => handleToggleCustomRate(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="is_custom_rate_checkbox" className="text-sm font-bold text-slate-800 select-none cursor-pointer flex items-center gap-2">
                    {ratesFormData.is_custom_rate ? (
                      <Unlock className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Sesuaikan Tarif Khusus untuk Produk Ini</span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 pl-7">
                  {ratesFormData.is_custom_rate ? (
                    <span className="text-amber-800 font-medium">
                      Tarif khusus aktif! Anda dapat menentukan besaran tarif yang berbeda dari katalog bawaan (contoh: Scuba Jahit Rp 2.800).
                    </span>
                  ) : (
                    <span>
                      Jika tidak dicentang, besaran tarif akan <strong>otomatis terkunci</strong> mengikuti tarif bawaan katalog standar.
                    </span>
                  )}
                </p>
              </div>

              {/* Besaran Tarif (Rp) & Satuan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Besaran Tarif (Rp) {ratesFormData.is_custom_rate && <span className="text-amber-600 font-bold">(Khusus)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={ratesFormData.rate}
                      onChange={(e) => setRatesFormData({ ...ratesFormData, rate: e.target.value })}
                      disabled={!ratesFormData.is_custom_rate}
                      placeholder={previewDefaultRate.toString()}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                        ratesFormData.is_custom_rate
                          ? 'border-amber-300 bg-amber-50/40 text-amber-900 focus:outline-none focus:border-amber-600'
                          : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Satuan Hitung
                  </label>
                  <select
                    value={ratesFormData.unit}
                    onChange={(e) => setRatesFormData({ ...ratesFormData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="pcs">pcs (buah)</option>
                    <option value="lusin">lusin (12 pcs)</option>
                    <option value="kodi">kodi (20 pcs)</option>
                  </select>
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="rates_is_active_checkbox"
                  checked={ratesFormData.is_active}
                  onChange={(e) => setRatesFormData({ ...ratesFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="rates_is_active_checkbox" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                  Aktifkan tarif ini untuk penarikan otomatis di form Produksi Harian
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRatesModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
                >
                  {editingRate ? 'Simpan Perubahan' : 'Tetapkan Tarif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
