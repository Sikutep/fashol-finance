import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Search, 
  Trash2, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Printer,
  FileText
} from 'lucide-react';
import PrintReportModal from './PrintReportModal';
import { exportToExcel, printHtmlContent, formatRupiah } from '../utils/exportUtils';
import { useLoading } from '../context/LoadingContext';

export default function ProduksiHarianView({ currentRole }) {
  const { showLoading, showSuccess, showError, hideLoading } = useLoading();
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
  const [selectedProductionIds, setSelectedProductionIds] = useState([]);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  // Reference options loaded dynamically from database
  const [options, setOptions] = useState({
    workers: [],
    products: [],
    variations: [],
    colors: [],
    processes: [],
    group_attributes: {},
  });

  // Modal Form State with multi-item rows support
  const [formData, setFormData] = useState({
    production_date: new Date().toISOString().slice(0, 10),
    worker_id: '',
    process_name: '',
    items: [],
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
      }
    } catch (err) {
      console.error('Gagal mengambil opsi referensi:', err);
    }
  };

  const getInstantRate = (product, process) => {
    if (!product || !process) return 0;
    const key = `${product}|${process}`;
    if (options.rates_map && options.rates_map[key] !== undefined) {
      return Number(options.rates_map[key]);
    }
    return 0;
  };

  const fetchRateForItem = async (product, process, rowId) => {
    if (!product || !process) return;
    try {
      const res = await fetch(`/api/references/rate?product_name=${encodeURIComponent(product)}&process_name=${encodeURIComponent(process)}`);
      const json = await res.json();
      if (json.status === 'success' && json.found && json.rate !== undefined) {
        setFormData(prev => {
          const nextItems = prev.items.map(it => {
            if (it.id === rowId || (rowId === undefined && it.product_name === product)) {
              return { ...it, rate: json.rate };
            }
            return it;
          });
          return { ...prev, items: nextItems };
        });
      } else {
        // Belum terdaftar di Tarif Pekerjaan (Tab 2): tarif disetel 0
        setFormData(prev => {
          const nextItems = prev.items.map(it => {
            if (it.id === rowId || (rowId === undefined && it.product_name === product)) {
              return { ...it, rate: 0 };
            }
            return it;
          });
          return { ...prev, items: nextItems };
        });
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProductions();
  };

  const createInitialRow = (defaultProduct, defaultProcess) => {
    const grpAttrs = defaultProduct ? options.group_attributes?.[defaultProduct] : null;
    const defaultColor = grpAttrs?.colors?.[0] || options.colors?.[0] || 'HITAM';
    const defaultVar = grpAttrs?.variations?.[0] || options.variations?.[0] || 'ALL SIZE';
    const instantRate = getInstantRate(defaultProduct, defaultProcess);

    return {
      id: Date.now() + Math.random(),
      product_name: defaultProduct,
      variation: defaultVar,
      color: defaultColor,
      qty: 1,
      rate: instantRate,
    };
  };

  const handleOpenAddModal = () => {
    const prodWorkers = options.production_workers?.length > 0
      ? options.production_workers
      : options.workers?.filter(w => w.payment_system !== 'Bulanan' && w.type !== 'Staff') || [];
    const defaultWorker = prodWorkers[0] || options.workers?.[0];
    const defaultProduct = options.products?.[0] || '';
    const defaultProcess = defaultWorker?.process && options.processes?.includes(defaultWorker.process)
      ? defaultWorker.process
      : (options.processes?.[0] || '');

    const firstRow = createInitialRow(defaultProduct, defaultProcess);

    setFormData({
      production_date: new Date().toISOString().slice(0, 10),
      worker_id: defaultWorker?.id || '',
      process_name: defaultProcess,
      items: [firstRow],
    });

    if (firstRow.rate === 0 && defaultProduct && defaultProcess) {
      fetchRateForItem(defaultProduct, defaultProcess, firstRow.id);
    }
    setIsModalOpen(true);
  };

  const handleWorkerChange = (workerId) => {
    const selected = options.workers.find(w => w.id == workerId);
    const newProcess = selected?.process || formData.process_name;

    setFormData(prev => {
      const nextItems = prev.items.map(item => {
        const instant = getInstantRate(item.product_name, newProcess);
        return { ...item, rate: instant > 0 ? instant : item.rate };
      });
      return {
        ...prev,
        worker_id: workerId,
        process_name: newProcess,
        items: nextItems,
      };
    });

    formData.items.forEach((item) => {
      if (item.product_name && newProcess) {
        fetchRateForItem(item.product_name, newProcess, item.id);
      }
    });
  };

  const handleProcessChange = (newProcess) => {
    setFormData(prev => {
      const nextItems = prev.items.map(item => {
        const instant = getInstantRate(item.product_name, newProcess);
        return { ...item, rate: instant > 0 ? instant : item.rate };
      });
      return {
        ...prev,
        process_name: newProcess,
        items: nextItems,
      };
    });

    formData.items.forEach((item) => {
      if (item.product_name && newProcess) {
        fetchRateForItem(item.product_name, newProcess, item.id);
      }
    });
  };

  const handleAddItemRow = () => {
    const defaultProduct = options.products?.[0] || '';
    const newRow = createInitialRow(defaultProduct, formData.process_name);

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newRow],
    }));

    if (newRow.rate === 0 && defaultProduct && formData.process_name) {
      fetchRateForItem(defaultProduct, formData.process_name, newRow.id);
    }
  };

  const handleRemoveItemRow = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleRowFieldChange = (index, field, value) => {
    setFormData(prev => {
      const nextItems = [...prev.items];
      const cur = { ...nextItems[index] };

      if (field === 'product_name') {
        const grpAttrs = options.group_attributes?.[value];
        const availColors = grpAttrs?.colors?.length > 0 ? grpAttrs.colors : (options.colors || []);
        const availVars = grpAttrs?.variations?.length > 0 ? grpAttrs.variations : (options.variations || []);
        const instantRate = getInstantRate(value, prev.process_name);
        cur.product_name = value;
        cur.color = availColors.includes(cur.color) ? cur.color : (availColors[0] || 'HITAM');
        cur.variation = availVars.includes(cur.variation) ? cur.variation : (availVars[0] || 'ALL SIZE');
        cur.rate = instantRate > 0 ? instantRate : cur.rate;
        nextItems[index] = cur;

        if (instantRate === 0) {
          fetchRateForItem(value, prev.process_name, cur.id);
        }
      } else {
        cur[field] = value;
        nextItems[index] = cur;
      }

      return { ...prev, items: nextItems };
    });
  };

  const modalTotalQty = formData.items.reduce((sum, it) => sum + (parseInt(it.qty) || 0), 0);
  const modalTotalWage = formData.items.reduce((sum, it) => sum + ((parseInt(it.qty) || 0) * (parseFloat(it.rate) || 0)), 0);

  const handleSaveProduction = async (e) => {
    e.preventDefault();
    if (!formData.worker_id) {
      showError({
        title: 'Form Belum Lengkap',
        subtitle: 'Pilih pekerja terlebih dahulu sebelum menyimpan catatan produksi.',
      });
      return;
    }
    if (formData.items.length === 0) {
      showError({
        title: 'Form Belum Lengkap',
        subtitle: 'Tambahkan minimal 1 baris rincian produk pada transaksi produksi.',
      });
      return;
    }

    showLoading({
      title: 'Menyimpan Catatan Produksi...',
      subtitle: `Menghitung total upah (${modalTotalQty} pcs, Rp ${modalTotalWage.toLocaleString('id-ID')})...`,
      type: 'finance',
    });

    try {
      const payload = {
        production_date: formData.production_date,
        worker_id: formData.worker_id,
        process_name: formData.process_name,
        items: formData.items.map(it => ({
          product_name: it.product_name,
          variation: it.variation,
          color: it.color,
          qty: parseInt(it.qty) || 1,
          rate: parseFloat(it.rate) || 0,
        })),
      };

      const res = await fetch('/api/daily-productions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        showSuccess({
          title: 'Produksi Berhasil Dicatat!',
          subtitle: `Total upah Rp ${modalTotalWage.toLocaleString('id-ID')} telah tercatat ke sistem payroll mingguan.`,
          duration: 900,
          onComplete: () => {
            setIsModalOpen(false);
            fetchProductions();
          }
        });
      } else {
        hideLoading();
        showError({
          title: 'Gagal Menyimpan Catatan Produksi',
          subtitle: json.message || 'Periksa kembali kelengkapan form isian data produksi.',
        });
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError({
        title: 'Kesalahan Jaringan',
        subtitle: 'Terjadi kesalahan jaringan saat menyimpan catatan produksi. Silakan coba kembali.',
      });
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
        showError({
          title: 'Gagal Menghapus Transaksi',
          subtitle: json.message || 'Transaksi produksi ini tidak dapat dihapus.',
        });
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showError({
        title: 'Kesalahan Jaringan',
        subtitle: 'Gagal terhubung ke server saat menghapus transaksi.',
      });
    }
  };


  const handleToggleSelectAll = () => {
    if (selectedProductionIds.length === productions.length && productions.length > 0) {
      setSelectedProductionIds([]);
    } else {
      setSelectedProductionIds(productions.map(p => p.id));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedProductionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePrintWorkOrders = (targets) => {
    const list = targets || (selectedProductionIds.length > 0
      ? productions.filter(p => selectedProductionIds.includes(p.id))
      : productions);

    if (list.length === 0) {
      showError('Tidak ada transaksi produksi untuk dicetak.');
      return;
    }

    const html = list.map((p, idx) => `
      <div class="slip-container ${idx < list.length - 1 ? 'page-break' : ''}">
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:8px;">
          <div>
            <div style="font-weight:900; font-size:14px; color:#15352A;">CV FASHOL MITSLI SEE</div>
            <div style="font-size:10px; color:#64748b;">Surat Perintah Kerja (SPK) & Bukti Hasil Produksi Harian</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800; font-size:13px; font-family:monospace;">${p.transaction_number}</div>
            <div style="font-size:10px; color:#047857; font-weight:600;">Tgl: ${p.production_date}</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px; margin-bottom:8px; background:#f8fafc; padding:6px 8px; border-radius:4px; border:1px solid #e2e8f0;">
          <div>Pekerja: <strong>${p.worker_name}</strong></div>
          <div>Proses: <strong>${p.process_name}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:25px; text-align:center;">No</th>
              <th>Produk & Varian</th>
              <th style="text-align:right; width:65px;">Qty</th>
              <th style="text-align:right; width:80px;">Tarif Satuan</th>
              <th style="text-align:right; width:95px;">Total Upah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1</td>
              <td><strong>${p.product_display}</strong></td>
              <td style="text-align:right; font-weight:bold;">${p.qty} pcs</td>
              <td style="text-align:right;">${p.formatted_rate}</td>
              <td style="text-align:right; font-weight:bold; color:#047857;">${p.formatted_total_wage}</td>
            </tr>
          </tbody>
        </table>

        <div class="signature-box" style="margin-top:14px;">
          <div class="signature-column">
            <div>Dibuat / Dicatat,</div>
            <div class="signature-space"></div>
            <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">Admin Finance</div>
          </div>
          <div class="signature-column">
            <div>Diperiksa QC / Mandor,</div>
            <div class="signature-space"></div>
            <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">Mandor Produksi</div>
          </div>
          <div class="signature-column">
            <div>Pekerja Ybs,</div>
            <div class="signature-space"></div>
            <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">${p.worker_name}</div>
          </div>
        </div>
      </div>
    `).join('');

    printHtmlContent({
      htmlContent: html,
      title: `Bukti_Produksi_Harian_${list.length}_Transaksi`,
      paperSize: 'a5-landscape',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Riwayat_Produksi_Harian_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Produksi Harian',
      title: 'CV FASHOL MITSLI SEE — RIWAYAT PRODUKSI HARIAN',
      subtitle: `Proses: ${processFilter} | Total Output: ${summary.total_quantity_formatted} | Total Upah: ${summary.total_wage_formatted}`,
      columns: [
        { header: 'No', key: 'no', align: 'center' },
        { header: 'No. Transaksi', key: 'transaction_number' },
        { header: 'Tanggal', key: 'production_date' },
        { header: 'Nama Pekerja', key: 'worker_name' },
        { header: 'Proses Kerja', key: 'process_name' },
        { header: 'Produk / Varian', key: 'product' },
        { header: 'Kuantitas (pcs)', key: 'qty', align: 'right' },
        { header: 'Tarif Satuan (Rp)', key: 'rate', align: 'right' },
        { header: 'Total Upah (Rp)', key: 'total_wage', align: 'right' },
        { header: 'Status', key: 'status', align: 'center' },
      ],
      data: productions.map((p, i) => ({
        no: i + 1,
        transaction_number: p.transaction_number,
        production_date: p.production_date,
        worker_name: p.worker_name,
        process_name: p.process_name,
        product: p.product_display,
        qty: p.qty,
        rate: p.formatted_rate,
        total_wage: p.formatted_total_wage,
        status: p.status || 'Tercatat',
      })),
      totals: {
        qty: summary.total_quantity_formatted,
        total_wage: summary.total_wage_formatted,
      }
    });
  };

  const handleExportCSV = () => {
    const headers = ['No. Transaksi', 'Tanggal', 'Pekerja', 'Proses', 'Produk/Varian', 'QTY', 'Tarif', 'Total Upah'];
    const rows = productions.map(p => [
      p.transaction_number,
      p.production_date,
      p.worker_name,
      p.process_name,
      `"${(p.product_display || '').replace(/"/g, '""')}"`,
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
            Produksi Harian
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan dan audit histori hasil kerja harian pekerja konveksi sebagai dasar perhitungan upah mingguan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handlePrintWorkOrders()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs sm:text-sm font-bold shadow-xs transition-all"
            title="Cetak bukti kerja / SPK untuk transaksi terpilih"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Bulk Cetak Bukti ({selectedProductionIds.length > 0 ? `${selectedProductionIds.length} Terpilih` : `Semua ${productions.length}`})</span>
          </button>
          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Cetak Rekap (A4)</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15352A] hover:bg-[#102920] text-xs sm:text-sm font-bold text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produksi</span>
          </button>
        </div>
      </div>

      {/* Dark Forest Green Summary Banner */}
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        
        {/* Table Filter & Search Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari transaksi, pekerja, produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Proses:</span>
            <select
              value={processFilter}
              onChange={(e) => {
                setProcessFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
            >
              <option value="Semua">Semua Proses</option>
              {options.processes?.map((proc) => (
                <option key={proc} value={proc}>{proc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={selectedProductionIds.length === productions.length && productions.length > 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih Semua"
                  />
                </th>
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
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data produksi harian ditemukan.
                  </td>
                </tr>
              ) : (
                productions.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50/60 transition-colors ${selectedProductionIds.includes(p.id) ? 'bg-emerald-50/30' : ''}`}>
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductionIds.includes(p.id)}
                        onChange={() => handleToggleSelectRow(p.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
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
                      <div className="flex items-center gap-2">
                        <span>{p.product_display}</span>
                        {p.item_count > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.item_count} items
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-900 font-bold whitespace-nowrap">
                      {p.qty} pcs
                    </td>
                    <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                      {p.formatted_rate}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-900 whitespace-nowrap">
                      {p.formatted_total_wage}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePrintWorkOrders([p])}
                          className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Cetak Bukti Kerja / SPK"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduction(p.id, p.transaction_number)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Transaksi"
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

        {/* Pagination Row */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold">{pagination.from || 0}</span> - <span className="font-semibold">{pagination.to || 0}</span> dari <span className="font-semibold">{pagination.total}</span> data
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-700">
              Halaman {pagination.current_page} dari {pagination.last_page || 1}
            </span>
            <button
              disabled={page >= pagination.last_page}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal Tambah Produksi (Multi-Item Rows Support) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto transform transition-all animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Input Produksi Harian (Multi-Item)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catat transaksi produksi untuk satu pekerja, tanggal, dan proses dengan dukungan banyak baris produk/varian.
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
            <form onSubmit={handleSaveProduction} className="flex-1 overflow-y-auto p-8 space-y-6">
              
              {/* Header Info: Tanggal, Pekerja, Proses */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                {/* Tanggal Produksi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Tanggal Produksi
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.production_date}
                    onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                {/* Nama Pekerja */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Nama Pekerja
                  </label>
                  <select
                    value={formData.worker_id}
                    onChange={(e) => handleWorkerChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-emerald-600 font-medium"
                  >
                    {(options.production_workers?.length > 0
                      ? options.production_workers
                      : options.workers?.filter(w => w.payment_system !== 'Bulanan' && w.type !== 'Staff') || options.workers || []
                    ).map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.process})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proses Pekerjaan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Proses Pekerjaan
                  </label>
                  <select
                    value={formData.process_name}
                    onChange={(e) => handleProcessChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:border-emerald-600 font-semibold text-emerald-800"
                  >
                    {options.processes?.map(proc => (
                      <option key={proc} value={proc}>{proc}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-sm font-bold text-slate-800">
                      Rincian Produk & Kuantitas ({formData.items.length} Baris)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    Tarif diambil otomatis dari HPP sesuai kombinasi Model & Proses
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Model Produk</th>
                        <th className="py-2.5 px-3">Warna Kain</th>
                        <th className="py-2.5 px-3">Varian/Ukuran</th>
                        <th className="py-2.5 px-3 w-24">QTY (pcs)</th>
                        <th className="py-2.5 px-3 w-28">Tarif Satuan</th>
                        <th className="py-2.5 px-3 w-32">Subtotal</th>
                        <th className="py-2.5 px-2 text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, idx) => {
                        const grpAttrs = options.group_attributes?.[item.product_name];
                        const availColors = grpAttrs?.colors?.length > 0 ? grpAttrs.colors : (options.colors || []);
                        const availVars = grpAttrs?.variations?.length > 0 ? grpAttrs.variations : (options.variations || []);
                        const subtotal = (parseInt(item.qty) || 0) * (parseFloat(item.rate) || 0);

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            {/* Product Model */}
                            <td className="py-2 px-3">
                              <select
                                value={item.product_name}
                                onChange={(e) => handleRowFieldChange(idx, 'product_name', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                              >
                                {options.products.map(prod => (
                                  <option key={prod} value={prod}>{prod}</option>
                                ))}
                              </select>
                            </td>

                            {/* Color */}
                            <td className="py-2 px-3">
                              <select
                                value={item.color}
                                onChange={(e) => handleRowFieldChange(idx, 'color', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                              >
                                {availColors.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>

                            {/* Variation */}
                            <td className="py-2 px-3">
                              <select
                                value={item.variation}
                                onChange={(e) => handleRowFieldChange(idx, 'variation', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                              >
                                {availVars.map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </td>

                            {/* QTY */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={item.qty}
                                onChange={(e) => handleRowFieldChange(idx, 'qty', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* Rate */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.rate}
                                onChange={(e) => handleRowFieldChange(idx, 'rate', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-emerald-600"
                              />
                            </td>

                            {/* Subtotal */}
                            <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                              Rp {subtotal.toLocaleString('id-ID')}
                            </td>

                            {/* Remove Row Button */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                disabled={formData.items.length <= 1}
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-20 disabled:hover:text-slate-400 rounded transition-colors"
                                title="Hapus Baris"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-emerald-600/70 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Baris Produk Lain</span>
                  </button>
                </div>
              </div>

              {/* Informative Total Summary Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold">Total Item/Baris</div>
                    <div className="text-base font-bold text-white">{formData.items.length} Baris</div>
                  </div>
                  <div className="border-l border-slate-700 pl-6">
                    <div className="text-[11px] text-slate-400 font-semibold">Total Kuantitas</div>
                    <div className="text-base font-extrabold text-amber-400">{modalTotalQty} pcs</div>
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-700 pt-2 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                  <div className="text-[11px] text-slate-400 font-semibold">Total Upah Transaksi</div>
                  <div className="text-xl font-black text-emerald-400">
                    Rp {modalTotalWage.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
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
                  <span>Simpan Transaksi Produksi</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
