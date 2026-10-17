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
  RefreshCw
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function MasterProsesView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [rates, setRates] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [summary, setSummary] = useState({
    total_rates: 0,
    active_rates: 0,
    formatted_avg_rate: 'Rp 0',
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    product_group_id: '',
    process_name: '',
    rate: '',
    unit: 'pcs',
    is_active: true,
  });

  const fetchRates = async () => {
    try {
      setLoading(true);
      const url = `/api/master-proses?search=${encodeURIComponent(search)}&product_group_id=${encodeURIComponent(groupFilter)}&status=${encodeURIComponent(statusFilter)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') {
        setRates(json.data || []);
        setProductGroups(json.product_groups || []);
        if (json.summary) {
          setSummary(json.summary);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data tarif proses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [groupFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRates();
  };

  const handleOpenAddModal = () => {
    setEditingRate(null);
    const defaultGroup = productGroups[0]?.name || '';
    const defaultGroupId = productGroups[0]?.id || '';
    setFormData({
      product_name: defaultGroup,
      product_group_id: defaultGroupId,
      process_name: '',
      rate: '',
      unit: 'pcs',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingRate(item);
    setFormData({
      product_name: item.product_name,
      product_group_id: item.product_group_id || '',
      process_name: item.process_name,
      rate: item.rate,
      unit: item.unit || 'pcs',
      is_active: item.is_active ? true : false,
    });
    setIsModalOpen(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!formData.process_name.trim()) {
      alert('Nama proses pekerjaan wajib diisi!');
      return;
    }
    if (formData.rate < 0) {
      alert('Tarif upah tidak boleh bernilai negatif!');
      return;
    }

    showLoading({
      title: editingRate ? 'Memperbarui Tarif Proses...' : 'Menambahkan Tarif Proses...',
      subtitle: `Menyimpan standar upah ${formData.process_name} (${formData.product_name})...`,
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
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: editingRate ? 'Tarif Berhasil Diperbarui!' : 'Tarif Baru Berhasil Ditambahkan!',
          subtitle: `Tarif ${formData.process_name} untuk ${formData.product_name} siap digunakan di Produksi Harian.`,
          duration: 900,
          onComplete: () => {
            setIsModalOpen(false);
            fetchRates();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menyimpan tarif proses.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleDeleteRate = async (id, processName, productName) => {
    if (!confirm(`Hapus tarif proses ${processName} untuk produk/kelompok ${productName}?`)) return;

    showLoading({
      title: 'Menghapus Tarif Proses...',
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
          subtitle: `Tarif ${processName} telah dihapus dari standar sistem.`,
          duration: 800,
          onComplete: () => {
            fetchRates();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menghapus tarif.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleToggleStatus = async (item) => {
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
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Scissors className="w-6 h-6" />
            </span>
            <span>Master Proses & Tarif Pekerjaan</span>
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Standar upah borongan proses produksi (Potong, Jahit Luar, Jahit Dalam, Kansay, QC, Packing) per kelompok produk
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRates}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 shadow-xs transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tarif Proses</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-extrabold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Tarif Terdaftar
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {summary.total_rates} <span className="text-sm font-normal text-slate-400">tarif</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-extrabold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tarif Status Aktif
            </div>
            <div className="text-2xl font-extrabold text-blue-900 mt-0.5">
              {summary.active_rates} <span className="text-sm font-normal text-slate-400">aktif</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-extrabold">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Rata-rata Upah Proses
            </div>
            <div className="text-2xl font-extrabold text-amber-900 mt-0.5">
              {summary.formatted_avg_rate} <span className="text-xs font-normal text-slate-400">/ pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari proses atau produk..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
            />
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Group Produk */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">Kelompok:</span>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
              >
                <option value="Semua">Semua Kelompok</option>
                {productGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                <th className="py-4 px-6">Tarif Upah</th>
                <th className="py-4 px-6">Satuan</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Memuat data tarif proses...
                  </td>
                </tr>
              ) : rates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    Tidak ada tarif proses ditemukan. Silakan tambahkan tarif baru.
                  </td>
                </tr>
              ) : (
                rates.map((item) => (
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
                      <span className="text-base font-extrabold text-emerald-700">
                        Rp {Number(item.rate).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      per {item.unit || 'pcs'}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleStatus(item)}
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
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Tarif"
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

        {/* Business Rule Callout */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-start gap-3 text-xs text-slate-500">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Prinsip Integritas Histori SPK:</strong> Tarif yang aktif di sini langsung ditarik otomatis saat staf memilih proses dan produk pada <em>Produksi Harian</em>. Pembaruan tarif tidak akan mengubah total upah transaksi masa lalu yang sudah tersimpan.
          </span>
        </div>
      </div>

      {/* Modal Tambah / Edit Tarif Proses */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingRate ? 'Edit Tarif Proses' : 'Tambah Tarif Proses Baru'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Atur besaran upah borongan proses produksi per satuan produk.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRate} className="p-8 space-y-5">
              {/* Kelompok Produk */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Kelompok / Model Produk
                </label>
                <select
                  value={formData.product_group_id || ''}
                  onChange={(e) => {
                    const selectedGrp = productGroups.find(g => g.id == e.target.value);
                    setFormData({
                      ...formData,
                      product_group_id: e.target.value,
                      product_name: selectedGrp ? selectedGrp.name : formData.product_name,
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  {productGroups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Tarif borongan ini berlaku untuk seluruh varian & warna SKU di bawah kelompok / model produk ini.
                </p>
              </div>

              {/* Nama Proses */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nama Proses Pekerjaan
                </label>
                <input
                  type="text"
                  list="process-suggestions"
                  value={formData.process_name}
                  onChange={(e) => setFormData({ ...formData, process_name: e.target.value })}
                  placeholder="Contoh: Potong, Jahit Luar, Kansay, QC, Packing"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
                <datalist id="process-suggestions">
                  <option value="Potong" />
                  <option value="Jahit Luar" />
                  <option value="Jahit Dalam" />
                  <option value="Kansay" />
                  <option value="Obras" />
                  <option value="Kancing" />
                  <option value="QC" />
                  <option value="Packing" />
                </datalist>
              </div>

              {/* Tarif Upah (Rp) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Besaran Tarif (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    placeholder="Contoh: 3000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Satuan Hitung
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="is_active_checkbox" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                  Aktifkan tarif ini untuk pemilihan otomatis di Produksi Harian
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
                >
                  {editingRate ? 'Simpan Perubahan' : 'Tambah Tarif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
