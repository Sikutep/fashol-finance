import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Search, 
  Tag, 
  TrendingUp, 
  CheckCircle, 
  Info, 
  Clock, 
  Scissors, 
  Check, 
  Package, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Edit3,
  X
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function HppProdukView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    material_cost: 0,
    overhead_cost: 0,
  });

  const fetchHppData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hpp-produk');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setProducts(json.data);
        if (json.data.length > 0) {
          setSelectedProduct(json.data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching HPP products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHppData();
  }, []);

  const handleUpdateHpp = async () => {
    showLoading({
      title: 'Menyimpan Pembaruan HPP...',
      subtitle: `Memvalidasi tarif baru untuk ${selectedProduct?.name}...`,
      type: 'production',
    });

    try {
      const res = await fetch('/api/hpp-produk/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          status: 'Aktif',
        }),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'HPP Berhasil Diperbarui',
          subtitle: 'Tarif baru telah tervalidasi dan diterapkan ke seluruh modul.',
          duration: 850,
          onComplete: () => {
            fetchHppData();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal memperbarui HPP.');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedProduct) return;
    setEditFormData({
      material_cost: selectedProduct.material_cost || 0,
      overhead_cost: selectedProduct.overhead_cost || 0,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveHppItem = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    showLoading({
      title: 'Menyimpan Standar Biaya HPP...',
      subtitle: `Memperbarui komponen biaya untuk ${selectedProduct.name}...`,
      type: 'production',
    });

    try {
      const res = await fetch(`/api/hpp-produk/${selectedProduct.id}`, {
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
          title: 'HPP Berhasil Diperbarui',
          subtitle: `Standar HPP ${selectedProduct.name} telah disimpan.`,
          duration: 850,
          onComplete: () => {
            setIsEditModalOpen(false);
            fetchHppData();
          }
        });
      } else {
        hideLoading();
        showError(json.message || 'Gagal memperbarui komponen HPP.');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError('Terjadi kesalahan jaringan.');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase())) ||
    (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            HPP Produk & Tarif Proses
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Standar kalkulasi Harga Pokok Produksi dan referensi tarif upah proses otomatis
          </p>
        </div>

        {currentRole === 'owner' && (
          <button
            onClick={handleUpdateHpp}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Kunci & Validasi Standar HPP</span>
          </button>
        )}
      </div>

      {/* Main Split Layout: Left List + Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk / kode..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Memuat daftar produk...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Tidak ada produk ditemukan.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {p.code || p.product_code || 'PRD'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            {p.status}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-base mt-1 truncate">
                          {p.name}
                        </div>
                        <div className="text-emerald-700 font-extrabold text-sm mt-1">
                          {p.formatted_total_hpp} <span className="text-xs font-normal text-slate-400">/ pcs</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed HPP & Rates (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedProduct ? (
            <>
              {/* Product Header & Banner Card */}
              <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold rounded-full border border-emerald-500/30">
                          {selectedProduct.code || selectedProduct.product_code}
                        </span>
                        <span className="text-xs text-slate-400">
                          Berlaku sejak: <strong>{selectedProduct.effective_date}</strong>
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                        {selectedProduct.name}
                      </h2>
                    </div>

                    <div className="flex flex-col items-end gap-2.5">
                      <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 text-right">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Harga Pokok Produksi (HPP)
                        </div>
                        <div className="text-3xl font-extrabold text-white mt-0.5">
                          {selectedProduct.formatted_total_hpp}
                          <span className="text-xs font-normal text-slate-300 ml-1">/ pcs</span>
                        </div>
                      </div>

                      {currentRole === 'owner' && (
                        <button
                          onClick={handleOpenEditModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 text-white text-xs font-bold border border-emerald-400/40 transition-colors shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Edit Komponen HPP</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3 Components Breakdown Progress */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                      Komposisi Komponen Biaya HPP
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {selectedProduct.components?.map((comp, idx) => (
                        <div key={idx} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
                          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                            <span>{comp.name}</span>
                            <span className="font-bold text-emerald-400">{comp.percentage}%</span>
                          </div>
                          <div className="text-lg font-extrabold text-white mt-1">
                            {comp.formatted_amount}
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden mt-3">
                            <div 
                              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${comp.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Rates Grid (Used in Daily Production) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <Scissors className="w-5 h-5 text-emerald-600" />
                      <span>Tarif Upah Proses Produksi (Otomatis)</span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Nilai tarif ini otomatis digunakan saat staf menginput Produksi Harian
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-4 h-4" />
                    Terkunci & Valid
                  </span>
                </div>

                {/* Rates Table / Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedProduct.rates?.map((rate) => (
                    <div 
                      key={rate.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Proses Produksi
                        </div>
                        <div className="font-bold text-slate-900 text-base mt-0.5">
                          {rate.process_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-emerald-700">
                          {rate.formatted_rate}
                        </div>
                        <div className="text-xs text-slate-400">
                          per {rate.unit || 'pcs'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-3">
                  <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Aturan Sistem (SPK Finance):</strong> Perubahan tarif tidak akan mengubah transaksi produksi yang telah tercatat sebelumnya. Nilai tarif historis tetap terjaga untuk menjaga integritas penggajian.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Pilih produk di sebelah kiri untuk melihat rincian HPP dan tarif proses.
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit Komponen HPP */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Edit Standar Biaya HPP
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Atur komponen biaya bahan baku dan overhead untuk <strong>{selectedProduct?.name}</strong>.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveHppItem} className="p-8 space-y-5">
              {/* Bahan Baku */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Biaya Bahan Baku & Material (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editFormData.material_cost}
                  onChange={(e) => setEditFormData({ ...editFormData, material_cost: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-semibold"
                  required
                />
              </div>

              {/* Tenaga Kerja (Readonly dari Proses) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Biaya Upah Tenaga Kerja Langsung (Rp)
                  </label>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Otomatis dari Master Proses
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`Rp ${Number(selectedProduct?.labor_cost || 0).toLocaleString('id-ID')}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500 font-semibold cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Total akumulasi seluruh tarif proses aktif (Potong + Jahit + Kansay + QC + Packing) di modul Master Proses.
                </p>
              </div>

              {/* Overhead */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Biaya Overhead & Lainnya (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editFormData.overhead_cost}
                  onChange={(e) => setEditFormData({ ...editFormData, overhead_cost: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-semibold"
                  required
                />
              </div>

              {/* Live Calculated Total HPP */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Total HPP Baru
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Bahan + Upah Proses + Overhead
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-900">
                  Rp {(Number(editFormData.material_cost || 0) + Number(selectedProduct?.labor_cost || 0) + Number(editFormData.overhead_cost || 0)).toLocaleString('id-ID')}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] active:scale-95 text-sm font-bold text-white shadow-sm transition-all"
                >
                  Simpan Komponen HPP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
