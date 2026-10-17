import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Printer, 
  X,
  FileText,
  CreditCard,
  Building,
  CheckCircle2
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function KeuanganView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'Penjualan Produk',
    title: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const [categories, setCategories] = useState({
    income: ['Penjualan Produk', 'Pendapatan Jasa Maklon', 'Pendapatan Lain-lain'],
    deductions: ['Potongan Penjualan Shopee', 'Potongan Penjualan TikTok', 'Retur Penjualan'],
    cogs: ['Pembelian Bahan Baku Kain', 'Aksesoris & Perlengkapan Jahit', 'Jasa Jahit & Maklon Luar', 'Biaya Produksi Langsung'],
    operating_expenses: [],
    non_operating: []
  });

  useEffect(() => {
    fetch('/api/finance-categories')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && json.data) {
          setCategories(json.data);
        }
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/keuangan?search=${encodeURIComponent(search)}&type=${encodeURIComponent(filterType)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching finance:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, [search, filterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      alert('Mohon isi judul dan nominal transaksi.');
      return;
    }

    showLoading({
      title: 'Mencatat Transaksi Kas...',
      subtitle: `Menyimpan data ${formData.type === 'income' ? 'pemasukan' : 'pengeluaran'} ke pembukuan...`,
      type: 'finance',
    });

    try {
      const res = await fetch('/api/keuangan', {
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
          title: 'Transaksi Berhasil Dicatat',
          subtitle: 'Saldo kas dan rekapitulasi keuangan telah otomatis diperbarui.',
          duration: 900,
          onComplete: () => {
            setIsModalOpen(false);
            fetchFinance();
            setFormData({
              type: 'income',
              category: categories.income?.[0] || 'Penjualan Produk',
              title: '',
              amount: '',
              transaction_date: new Date().toISOString().split('T')[0],
              reference: '',
              notes: '',
            });
          }
        });
      } else {
        hideLoading();
        alert(json.message || 'Gagal mencatat transaksi keuangan.');
      }
    } catch (err) {
      hideLoading();
      console.error('Error saving transaction:', err);
      alert('Terjadi kesalahan jaringan saat menyimpan transaksi.');
    }
  };

  const summary = data?.summary || {
    total_income: 0,
    formatted_income: 'Rp 0',
    total_expense: 0,
    formatted_expense: 'Rp 0',
    net_balance: 0,
    formatted_net_balance: 'Rp 0',
  };

  const transactions = data?.data || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Keuangan (Kas & Arus Dana)
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Pencatatan kas masuk operasional, penjualan, dan beban pengeluaran produksi
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Top 3 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Income Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Pendapatan
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2">
            {summary.formatted_income}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Kas masuk terverifikasi</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-2">
            {summary.formatted_expense}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>Operasional & bahan produksi</span>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Saldo Bersih Kas
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {summary.formatted_net_balance}
          </div>
          <div className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
            <span>Arus kas operasional positif</span>
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
            placeholder="Cari transaksi, nomor nota, atau kategori..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {['Semua', 'Pendapatan', 'Pengeluaran'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === tab
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Buku Kas</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">NO. TRANSAKSI</th>
                <th className="py-4 px-6">TANGGAL</th>
                <th className="py-4 px-6">TIPE</th>
                <th className="py-4 px-6">KATEGORI</th>
                <th className="py-4 px-6">KETERANGAN</th>
                <th className="py-4 px-6 text-right">NOMINAL</th>
                <th className="py-4 px-6 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat transaksi keuangan...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Tidak ada transaksi tercatat yang sesuai filter.
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                      {t.transaction_number}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {t.date}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        t.is_income
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {t.category}
                    </td>
                    <td className="py-4 px-6 text-slate-600 max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className={`py-4 px-6 text-right font-extrabold text-base ${
                      t.is_income ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {t.formatted_amount}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tercatat</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Catat Transaksi Kas Baru
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Input arus pendapatan atau pengeluaran operasional & bahan produksi
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Tipe Transaksi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income', category: categories.income?.[0] || 'Penjualan Produk' })}
                    className={`py-2.5 rounded-xl font-bold text-sm border transition-all ${
                      formData.type === 'income'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    + Pendapatan (Kas Masuk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense', category: categories.operating_expenses?.[0] || 'Beban Gaji Karyawan' })}
                    className={`py-2.5 rounded-xl font-bold text-sm border transition-all ${
                      formData.type === 'expense'
                        ? 'bg-rose-50 border-rose-600 text-rose-800 ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    - Pengeluaran (Kas Keluar)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {formData.type === 'income' ? (
                    <>
                      <optgroup label="Pendapatan Usaha">
                        {categories.income?.map((cat, i) => (
                          <option key={`inc-${i}`} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                      {categories.deductions?.length > 0 && (
                        <optgroup label="Potongan Penjualan & Retur">
                          {categories.deductions.map((cat, i) => (
                            <option key={`ded-${i}`} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    <>
                      {categories.cogs?.length > 0 && (
                        <optgroup label="Harga Pokok Penjualan (HPP)">
                          {categories.cogs.map((cat, i) => (
                            <option key={`cogs-${i}`} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      )}
                      {categories.operating_expenses?.length > 0 && (
                        <optgroup label="Biaya Operasional (27 Akun Resmi Excel)">
                          {categories.operating_expenses.map((cat, i) => (
                            <option key={`opex-${i}`} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      )}
                      {categories.non_operating?.length > 0 && (
                        <optgroup label="Beban Luar Usaha & Pajak">
                          {categories.non_operating.map((cat, i) => (
                            <option key={`nonop-${i}`} value={cat}>{cat}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Keterangan Transaksi
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembelian Kain Rayon Twill 10 Roll"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Nominal & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    placeholder="Contoh: 3500000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  No. Referensi / Nota (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: NOTA-001, INV-MKT-01"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
