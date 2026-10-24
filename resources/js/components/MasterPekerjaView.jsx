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
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function MasterPekerjaView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();
  const [workers, setWorkers] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [staffPositions, setStaffPositions] = useState([]);
  const [processCycleMap, setProcessCycleMap] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'Produksi',
    process: '',
    payment_system: 'Borongan',
    payroll_day: 'Kamis',
    default_salary: '',
    status: 'Aktif',
    notes: '',
  });

  useEffect(() => {
    fetch('/api/references/options')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && json.processes) {
          setAvailableProcesses(json.processes);
          if (!formData.process && json.processes.length > 0) {
            setFormData(prev => ({ ...prev, process: json.processes[0] }));
          }
        }
      })
      .catch(err => console.error('Gagal memuat opsi referensi:', err));

    fetch('/api/settings/staff-positions')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && json.data) {
          setStaffPositions(json.data);
        }
      })
      .catch(err => console.error('Gagal memuat jabatan staf:', err));

    fetch('/api/settings/payroll-cycles')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && json.data) {
          const map = {};
          json.data.forEach(item => {
            map[item.process] = item.cycle_day;
          });
          setProcessCycleMap(map);
        }
      })
      .catch(err => console.error('Gagal memuat mapping siklus payroll:', err));
  }, []);

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
      process: availableProcesses[0] || 'Jahit',
      payment_system: 'Borongan',
      payroll_day: 'Kamis',
      default_salary: '',
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
      payroll_day: worker.payroll_day || 'Kamis',
      default_salary: worker.default_salary > 0 ? worker.default_salary : '',
      status: worker.status,
      notes: worker.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Nama pekerja wajib diisi!');
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
        showError(json.message || 'Gagal menyimpan data pekerja.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan saat menyimpan pekerja.');
    }
  };

  const handleDeleteWorker = async (id, name) => {
    if (!confirm(`Nonaktifkan / Hapus pekerja "${name}"?\n\nTenang, riwayat setoran pekerjaan dan catatan gaji yang lalu TETAP AMAN tersimpan di pembukuan.`)) return;

    showLoading({
      title: 'Menonaktifkan Pekerja...',
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
          title: 'Pekerja Dinonaktifkan!',
          subtitle: `Pekerja ${name} berhasil diproses. Histori transaksi lama tetap aman tersimpan.`,
          duration: 900,
          onComplete: () => {
            fetchWorkers();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal memproses data pekerja.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan.');
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

  const handleSyncUsers = async () => {
    showLoading({
      title: 'Sinkronisasi Akun User...',
      subtitle: 'Memetakan seluruh akun user sistem ke Master Pekerja...',
      type: 'finance',
    });

    try {
      const res = await fetch('/api/workers/sync-users', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Sinkronisasi Selesai!',
          subtitle: json.message,
          duration: 900,
          onComplete: () => {
            fetchWorkers();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal sinkronisasi akun.');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      showError('Terjadi kesalahan jaringan.');
    }
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
            Kelola identitas, bagian, dan sistem pembayaran seluruh pekerja dan staf.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncUsers}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-sm font-bold text-emerald-800 shadow-xs transition-colors"
            title="Sinkronkan akun login Users menjadi Master Pekerja"
          >
            <RefreshCw className="w-4 h-4 text-emerald-700" />
            <span>Sinkronkan User</span>
          </button>
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
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{worker.name}</span>
                              {worker.user_id && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  User Sistem
                                </span>
                              )}
                            </div>
                            {worker.notes && (
                              <div className="text-xs text-slate-400 mt-0.5">{worker.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {worker.type}
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-medium">
                        <div>{worker.process}</div>
                        {worker.type === 'Staff' && worker.staff_position && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 bg-purple-50 text-purple-700 border border-purple-200">
                            {worker.staff_position.department}
                          </span>
                        )}
                        {worker.type === 'Produksi' && worker.payment_system !== 'Bulanan' && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 border ${
                            worker.payroll_day === 'Kamis'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            Gaji {worker.payroll_day || 'Kamis'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="font-medium">{worker.payment_system}</div>
                        {worker.payment_system === 'Bulanan' && Number(worker.default_salary) > 0 && (
                          <div className="text-xs text-emerald-700 font-mono font-semibold mt-0.5">
                            Rp {Number(worker.default_salary).toLocaleString('id-ID')}
                          </div>
                        )}
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
                    onChange={(e) => {
                      const newType = e.target.value;
                      const firstStaff = staffPositions[0];
                      const staffProc = firstStaff ? (typeof firstStaff === 'object' ? firstStaff.name : firstStaff) : 'Staff';
                      const prodProc = availableProcesses[0] || 'Jahit';
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        process: newType === 'Staff' ? staffProc : prodProc,
                        payment_system: newType === 'Staff' ? 'Bulanan' : formData.payment_system,
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Produksi">Produksi</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                {/* Proses / Bagian */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Proses / Bagian / Jabatan
                  </label>
                  <select
                    value={formData.process}
                    onChange={(e) => {
                      const selectedProc = e.target.value;
                      const cycleDay = processCycleMap[selectedProc] || 'Kamis';
                      setFormData({ 
                        ...formData, 
                        process: selectedProc,
                        payroll_day: formData.type === 'Produksi' ? cycleDay : formData.payroll_day,
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {formData.type === 'Staff' || formData.payment_system === 'Bulanan' ? (
                      <>
                        {formData.process && !staffPositions.some(p => (typeof p === 'object' ? p.name : p) === formData.process) && (
                          <option value={formData.process}>{formData.process}</option>
                        )}
                        {staffPositions.map((pos, idx) => {
                          const pName = typeof pos === 'object' ? pos.name : pos;
                          const pDept = typeof pos === 'object' && pos.department ? ` (${pos.department})` : '';
                          return <option key={idx} value={pName}>{pName}{pDept}</option>;
                        })}
                      </>
                    ) : (
                      <>
                        {formData.process && !availableProcesses.includes(formData.process) && (
                          <option value={formData.process}>{formData.process}</option>
                        )}
                        {availableProcesses.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* Sistem Pembayaran */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Sistem Pembayaran
                  </label>
                  <select
                    value={formData.payment_system}
                    onChange={(e) => {
                      const newSys = e.target.value;
                      setFormData({ 
                        ...formData, 
                        payment_system: newSys,
                        type: newSys === 'Bulanan' ? formData.type : 'Produksi',
                        process: newSys === 'Bulanan' ? (staffPositions.includes(formData.process) ? formData.process : (staffPositions[0] || 'Staff Operasional')) : (availableProcesses[0] || 'Jahit'),
                      });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Borongan">Borongan</option>
                    <option value="Harian">Harian</option>
                    <option value="Bulanan">Bulanan</option>
                  </select>
                </div>

                {/* Gaji Pokok Acuan (Khusus Bulanan) */}
                {formData.payment_system === 'Bulanan' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Gaji Pokok Acuan (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={formData.default_salary}
                      onChange={(e) => setFormData({ ...formData, default_salary: e.target.value })}
                      placeholder="Contoh: 1800000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Otomatis menjadi nilai awal slip payroll bulanan tanpa tebakan heuristik.
                    </p>
                  </div>
                )}

                {/* Jadwal Payroll Mingguan (Khusus Produksi / Non-Bulanan) */}
                {formData.payment_system !== 'Bulanan' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Jadwal Payroll Mingguan
                    </label>
                    <select
                      value={formData.payroll_day || 'Kamis'}
                      onChange={(e) => setFormData({ ...formData, payroll_day: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
                    >
                      <option value="Kamis">Hari Kamis (Cut-off Kamis s/d Rabu)</option>
                      <option value="Sabtu">Hari Sabtu (Cut-off Sabtu s/d Jumat)</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Otomatis tersinkron dengan Master Proses ({formData.process || 'Standar'}).
                    </p>
                  </div>
                )}

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
