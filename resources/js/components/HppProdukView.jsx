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
  Edit3
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';

export default function HppProdukView({ currentRole }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState('');

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
        alert(json.message || 'Gagal memperbarui HPP.');
      }
    } catch (e) {
      hideLoading();
      console.error(e);
      alert('Terjadi kesalahan jaringan.');
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

                    <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl border border-white/15 text-right">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Harga Pokok Produksi (HPP)
                      </div>
                      <div className="text-3xl font-extrabold text-white mt-0.5">
                        {selectedProduct.formatted_total_hpp}
                        <span className="text-xs font-normal text-slate-300 ml-1">/ pcs</span>
                      </div>
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
    </div>
  );
}
