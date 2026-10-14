import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Search, 
  Trash2, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function ProduksiHarianView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [productions, setProductions] = useState([]);
  const [summary, setSummary] = useState({
    total_quantity_formatted: '0 pcs',
    total_wage_formatted: 'Rp 0',
    total_transactions_formatted: '0 transaksi',
  });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [search, setSearch] = useState('');
  const [processFilter, setProcessFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reference options loaded dynamically from database
  const [options, setOptions] = useState({
    workers: [],
    products: [],
    variations: [],
    colors: [],
    processes: [],
  });

  // Modal Form State
  const [formData, setFormData] = useState({
    production_date: new Date().toISOString().slice(0, 10),
    worker_id: '',
    process_name: 'Jahit Luar',
    product_name: 'Baggy Pants Reguler',
    variation: 'All Size',
    color: 'Black',
    qty: 1,
    rate: 3200,
  });

  const fetchProductions = async () => {
    try {
      const res = await fetch(`/api/daily-productions?page=${page}&search=${encodeURIComponent(search)}&process=${encodeURIComponent(processFilter)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setProductions(json.data);
        setSummary(json.summary);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error('Gagal mengambil data produksi:', err);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/references/options');
      const json = await res.json();
      if (json.status === 'success') {
        setOptions(json);
        if (json.workers.length > 0 && !formData.worker_id) {
          setFormData(prev => ({
            ...prev,
            worker_id: json.workers[0].id,
            process_name: json.workers[0].process || 'Jahit Luar',
          }));
        }
      }
    } catch (err) {
      console.error('Gagal mengambil opsi referensi:', err);
    }
  };

  const fetchRate = async (product, process) => {
    if (!product || !process) return;
    try {
      const res = await fetch(`/api/references/rate?product_name=${encodeURIComponent(product)}&process_name=${encodeURIComponent(process)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setFormData(prev => ({ ...prev, rate: json.rate }));
      }
    } catch (err) {
      console.error('Gagal mengambil tarif:', err);
    }
  };

  useEffect(() => {
    fetchProductions();
  }, [page, processFilter]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (formData.product_name && formData.process_name) {
      fetchRate(formData.product_name, formData.process_name);
    }
  }, [formData.product_name, formData.process_name]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProductions();
  };

  const handleOpenAddModal = () => {
    const defaultWorker = options.workers[0];
    setFormData({
      production_date: new Date().toISOString().slice(0, 10),
      worker_id: defaultWorker?.id || '',
      process_name: defaultWorker?.process || 'Jahit Luar',
      product_name: options.products[0] || 'Baggy Pants Reguler',
      variation: 'All Size',
      color: 'Black',
      qty: 1,
      rate: 3200,
    });
    setIsModalOpen(true);
  };

  const handleWorkerChange = (workerId) => {
    const selected = options.workers.find(w => w.id == workerId);
    setFormData(prev => ({
      ...prev,
      worker_id: workerId,
      process_name: selected?.process || prev.process_name,
    }));
  };

  const handleSaveProduction = async (e) => {
    e.preventDefault();
    if (!formData.worker_id) {
      alert('Pilih pekerja terlebih dahulu!');
      return;
    }

    showLoading({
      title: 'Menyimpan Catatan Produksi...',
      subtitle: `Menghitung total upah (${formData.qty} pcs × Rp ${Number(formData.rate).toLocaleString('id-ID')})...`,
      type: 'finance',
    });

    try {
      const res = await fetch('/api/daily-productions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Produksi Berhasil Dicatat!',
          subtitle: `Total upah Rp ${(formData.qty * formData.rate).toLocaleString('id-ID')} telah tercatat ke sistem payroll.`,
          duration: 900,
          onComplete: () => {
            setIsModalOpen(false);
            fetchProductions();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menyimpan transaksi produksi. Periksa kembali form isian.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Terjadi kesalahan jaringan saat menyimpan catatan produksi.');
    }
  };

  const handleDeleteProduction = async (id, trxNo) => {
    if (!confirm(`Hapus transaksi produksi ${trxNo}?`)) return;

    showLoading({
      title: 'Menghapus Transaksi...',
      subtitle: 'Memperbarui rekap kalkulasi...',
      type: 'finance',
    });

    try {
      const res = await fetch(`/api/daily-productions/${id}`, { 
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      const json = await res.json();

      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Transaksi Dihapus!',
          subtitle: 'Rekap upah mingguan telah disesuaikan kembali.',
          duration: 800,
          onComplete: () => {
            fetchProductions();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menghapus transaksi.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['No. Transaksi', 'Tanggal', 'Pekerja', 'Proses', 'Produk/Varian', 'QTY', 'Tarif', 'Total Upah'];
    const rows = productions.map(p => [
      p.transaction_number,
      p.production_date,
      p.worker_name,
      p.process_name,
      p.product_display,
      p.qty + ' pcs',
      p.formatted_rate,
      p.formatted_total_wage
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `produksi_harian_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 mb-2.5">
            <span>{currentRole === 'owner' ? '👑 Mode Owner - Peninjauan' : '✍️ Mode Admin/Finance - Operasional'}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Input Produksi Harian
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catat hasil produksi sebagai dasar perhitungan upah.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] text-sm font-bold text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produksi</span>
          </button>
        </div>
      </div>

      {/* Dark Forest Green Summary Banner (Generous & Bold) */}
      <div className="p-8 rounded-2xl bg-[#15352A] text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
        <div className="flex-1">
          <div className="text-sm text-[#98AFA5] font-semibold">Total Kuantitas</div>
          <div className="text-3xl font-extrabold tracking-tight mt-1 text-white">
            {summary.total_quantity_formatted}
          </div>
        </div>

        <div className="flex-1 sm:border-l sm:border-[#224A3B] sm:pl-10">
          <div className="text-sm text-[#98AFA5] font-semibold">Total Upah Produksi</div>
          <div className="text-3xl font-extrabold tracking-tight mt-1 text-white">
            {summary.total_wage_formatted}
          </div>
        </div>

        <div className="flex-1 sm:border-l sm:border-[#224A3B] sm:pl-10">
          <div className="text-sm text-[#98AFA5] font-semibold">Transaksi</div>
          <div className="text-3xl font-extrabold tracking-tight mt-1 text-white">
            {summary.total_transactions_formatted}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Filter & Search Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari transaksi, pekerja, produk..."
              className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
            />
          </form>

          <div className="flex items-center gap-3 self-end sm:self-auto text-sm">
            <span className="text-slate-500 font-medium">Proses:</span>
            <select
              value={processFilter}
              onChange={(e) => {
                setProcessFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="Semua">Semua Proses</option>
              <option value="Jahit Luar">Jahit Luar</option>
              <option value="Potong">Potong</option>
              <option value="Kansay">Kansay</option>
              <option value="Packing">Packing</option>
              <option value="QC">QC</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">No. Transaksi</th>
                <th className="py-4 px-6">Tanggal</th>
                <th className="py-4 px-6">Pekerja</th>
                <th className="py-4 px-6">Proses</th>
                <th className="py-4 px-6">Produk / Varian</th>
                <th className="py-4 px-6">QTY</th>
                <th className="py-4 px-6">Tarif</th>
                <th className="py-4 px-6">Total Upah</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {productions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data produksi harian ditemukan.
                  </td>
                </tr>
              ) : (
                productions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono text-slate-600 font-semibold text-xs">
                      {p.transaction_number}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {p.production_date}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {p.worker_name}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                        {p.process_name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-800 font-medium">
                      {p.product_display}
                    </td>
                    <td className="py-4 px-6 text-slate-900 font-bold">
                      {p.qty} pcs
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {p.formatted_rate}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-900">
                      {p.formatted_total_wage}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteProduction(p.id, p.transaction_number)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700">{pagination.from || 0}</span> - <span className="font-semibold text-slate-700">{pagination.to || 0}</span> dari <span className="font-semibold text-slate-700">{pagination.total || 0}</span> data
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 py-1.5 rounded-xl bg-[#15352A] text-white font-bold text-sm">
              {page}
            </span>
            <button
              disabled={page >= pagination.last_page}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal Tambah Produksi (Matching Image 5) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Tambah Produksi
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Lengkapi informasi di bawah dengan data yang sesuai.
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
            <form onSubmit={handleSaveProduction} className="p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Tanggal Produksi */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tanggal Produksi
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.production_date}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Nama Pekerja */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nama Pekerja
                  </label>
                  <select
                    value={formData.worker_id}
                    onChange={(e) => handleWorkerChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {options.workers.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.process})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proses Pekerjaan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Proses Pekerjaan
                  </label>
                  <select
                    value={formData.process_name}
                    onChange={(e) => setFormData({ ...formData, process_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {options.processes.map(proc => (
                      <option key={proc} value={proc}>{proc}</option>
                    ))}
                  </select>
                </div>

                {/* Produk */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Produk
                  </label>
                  <select
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {options.products.map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>

                {/* Varian */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Varian
                  </label>
                  <select
                    value={formData.variation}
                    onChange={(e) => setFormData({ ...formData, variation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {options.variations.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Warna */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Warna
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Contoh: Black, Navy, Mocca"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Kuantitas (pcs) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Kuantitas (pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-bold"
                  />
                </div>

                {/* Tarif Otomatis */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Tarif Otomatis
                    </label>
                    <span className="text-xs text-emerald-600 font-bold">
                      Otomatis HPP
                    </span>
                  </div>
                  <input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                  />
                </div>

              </div>

              {/* Dynamic Estimated Total Wage Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Estimasi Total Upah:</span>
                <span className="text-base font-extrabold text-emerald-800">
                  Rp {(formData.qty * formData.rate).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] text-sm font-bold text-white shadow-xs transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
