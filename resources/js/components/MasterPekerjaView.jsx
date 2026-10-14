import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function MasterPekerjaView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [workers, setWorkers] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Produksi',
    process: 'Jahit Luar',
    payment_system: 'Borongan',
    status: 'Aktif',
    notes: '',
  });

  const fetchWorkers = async () => {
    try {
      const res = await fetch(`/api/workers?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setWorkers(json.data);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error('Gagal mengambil data pekerja:', err);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchWorkers();
  };

  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setFormData({
      name: '',
      type: 'Produksi',
      process: 'Jahit Luar',
      payment_system: 'Borongan',
      status: 'Aktif',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      type: worker.type,
      process: worker.process,
      payment_system: worker.payment_system,
      status: worker.status,
      notes: worker.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama pekerja wajib diisi!');
      return;
    }

    showLoading({
      title: editingWorker ? 'Memperbarui Pekerja...' : 'Menyimpan Pekerja Baru...',
      subtitle: 'Memvalidasi data identitas dan sistem pembayaran...',
      type: 'finance',
    });

    try {
      const url = editingWorker ? `/api/workers/${editingWorker.id}` : '/api/workers';
      const method = editingWorker ? 'PUT' : 'POST';

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
          title: editingWorker ? 'Pekerja Diperbarui!' : 'Pekerja Berhasil Ditambahkan!',
          subtitle: `Data ${formData.name} telah tersimpan dengan aman ke database.`,
          duration: 900,
          onComplete: () => {
            setIsModalOpen(false);
            fetchWorkers();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menyimpan data pekerja.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Terjadi kesalahan jaringan saat menyimpan pekerja.');
    }
  };

  const handleDeleteWorker = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus/menonaktifkan pekerja ${name}?`)) return;

    showLoading({
      title: 'Menghapus Pekerja...',
      subtitle: 'Memeriksa relasi histori transaksi...',
      type: 'finance',
    });

    try {
      const res = await fetch(`/api/workers/${id}`, { 
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });
      const json = await res.json();

      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Pekerja Dihapus!',
          subtitle: 'Histori transaksi tetap terjaga aman.',
          duration: 800,
          onComplete: () => {
            fetchWorkers();
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal menghapus pekerja.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID Pekerja', 'Nama Pekerja', 'Jenis', 'Proses/Bagian', 'Sistem Bayar', 'Status'];
    const rows = workers.map(w => [w.worker_code, w.name, w.type, w.process, w.payment_system, w.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `master_pekerja_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      
      {/* Header Row (Spacious & Readable) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 mb-2.5">
            <span>{currentRole === 'owner' ? '👑 Mode Owner - Peninjauan' : '✍️ Mode Admin/Finance - Operasional'}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Master Pekerja
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola identitas, bagian, dan sistem pembayaran pekerja.
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
            <span>Tambah Pekerja</span>
          </button>
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
              placeholder="Cari data pekerja..."
              className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
            />
          </form>

          <div className="flex items-center gap-3 self-end sm:self-auto text-sm">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-medium focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">ID Pekerja</th>
                <th className="py-4 px-6">Nama Pekerja</th>
                <th className="py-4 px-6">Jenis</th>
                <th className="py-4 px-6">Proses / Bagian</th>
                <th className="py-4 px-6">Sistem Bayar</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data pekerja ditemukan.
                  </td>
                </tr>
              ) : (
                workers.map((worker) => {
                  const initials = worker.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  const isAktif = worker.status === 'Aktif';

                  return (
                    <tr key={worker.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-600 font-semibold text-xs">
                        {worker.worker_code}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <span className="font-bold text-slate-900">{worker.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {worker.type}
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-medium">
                        {worker.process}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {worker.payment_system}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isAktif 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isAktif ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{worker.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(worker)}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Pekerja"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWorker(worker.id, worker.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus / Nonaktifkan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Modal Tambah / Edit Pekerja */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingWorker ? 'Edit Data Pekerja' : 'Tambah Pekerja'}
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
            <form onSubmit={handleSaveWorker} className="p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Nama Pekerja */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nama Pekerja
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Siti Aminah"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Jenis Pekerja */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Jenis Pekerja
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Produksi">Produksi</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                {/* Proses / Bagian */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Proses / Bagian
                  </label>
                  <select
                    value={formData.process}
                    onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Jahit Luar">Jahit Luar</option>
                    <option value="Potong">Potong</option>
                    <option value="Kansay">Kansay</option>
                    <option value="QC">QC</option>
                    <option value="Packing">Packing</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                {/* Sistem Pembayaran */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Sistem Pembayaran
                  </label>
                  <select
                    value={formData.payment_system}
                    onChange={(e) => setFormData({ ...formData, payment_system: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Borongan">Borongan</option>
                    <option value="Harian">Harian</option>
                    <option value="Bulanan">Bulanan</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Keterangan
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Catatan keahlian/tugas..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

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
