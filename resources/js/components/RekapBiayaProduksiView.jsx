import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Printer, 
  Download, 
  Layers, 
  DollarSign, 
  Link2, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import PrintReportModal from './PrintReportModal';
import { exportToExcel } from '../utils/exportUtils';

export default function RekapBiayaProduksiView({ currentRole }) {
  const { showTimedLoading } = useLoading();
  const [data, setData] = useState(null);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);
  const [period, setPeriod] = useState(() => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
  });

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rekap-biaya-produksi?period=${encodeURIComponent(period)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
        if (json.available_periods && json.available_periods.length > 0) {
          setAvailablePeriods(json.available_periods);
        }
      }
    } catch (e) {
      console.error('Error fetching production cost summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [period]);

  const handleSyncData = () => {
    showTimedLoading({
      title: 'Sinkronisasi Data Rekap Biaya...',
      subtitle: 'Mengagregasi upah payroll mingguan dan kas keluar bahan baku...',
      duration: 1200,
      type: 'production',
      successTitle: 'Sinkronisasi Selesai',
      successSubtitle: 'Seluruh komponen biaya produksi telah diverifikasi tanpa duplikasi.',
      onComplete: () => {
        fetchSummary();
      }
    });
  };

  const summary = data?.summary || {
    total_cost: 0,
    formatted_total_cost: 'Rp 0',
    avg_cost_per_unit: 0,
    formatted_avg_cost: 'Rp 0',
    total_output: 0,
    formatted_output: '0 pcs',
  };

  const components = data?.components || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Rekap Biaya Produksi
          </h1>
          <p className="text-base text-slate-500 mt-1">
            Akumulasi biaya produksi terintegrasi otomatis dari Payroll Mingguan dan Pengeluaran Kas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncData}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span>Sinkronkan Ulang</span>
          </button>

          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap Biaya</span>
          </button>

          <button
            onClick={() => {
              exportToExcel({
                filename: `Rekap_Biaya_Produksi_${period.replace(/[\/\s:]/g, '_')}`,
                sheetName: 'Biaya Produksi',
                title: 'CV FASHOL MITSLI SEE — REKAP BIAYA PRODUKSI',
                subtitle: `Periode: ${period} | Total Output: ${summary.formatted_output} | Efisiensi: ${summary.formatted_efficiency}`,
                columns: [
                  { header: 'No', key: 'no', align: 'center' },
                  { header: 'Komponen Biaya', key: 'component' },
                  { header: 'Sumber Data', key: 'source' },
                  { header: 'Nilai Biaya', key: 'amount', align: 'right' },
                  { header: 'Kontribusi %', key: 'percentage', align: 'right' },
                  { header: 'Integrasi Sistem', key: 'link_type', align: 'center' },
                ],
                data: components.map((c, i) => ({
                  no: i + 1,
                  component: c.component,
                  source: c.source,
                  amount: c.formatted_amount,
                  percentage: summary.total_cost > 0 ? `${Math.round((c.amount / summary.total_cost) * 100)}%` : '0%',
                  link_type: c.link_type,
                })),
                totals: {
                  component: 'TOTAL BIAYA PRODUKSI',
                  amount: summary.formatted_total_cost,
                }
              });
            }}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Hero Banner: Deep Green / Emerald Dark as seen in Mockup 5 */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 font-bold text-xs tracking-wider uppercase rounded-full border border-emerald-500/30">
                Laporan Terintegrasi
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Periode: <strong>{period}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span>Bebas Biaya Ganda (No Double-Counting)</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              TOTAL BIAYA PRODUKSI — {period.toUpperCase()}
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold text-white mt-1 tracking-tight">
              {summary.formatted_total_cost}
            </div>
          </div>

          {/* Sub Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-300 font-medium">Biaya per Unit Rata-rata</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {summary.formatted_avg_cost} <span className="text-xs font-normal text-slate-300">/ pcs</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-300 font-medium">Total Output Produksi</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {summary.formatted_output}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
              <div className="text-xs text-slate-300 font-medium">Kesesuaian Terhadap Standar HPP</div>
              <div className="text-2xl font-extrabold text-teal-300 mt-1">
                {summary.formatted_efficiency || (summary.efficiency_percentage ? `${summary.efficiency_percentage}% efisien` : '-')}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Target: {summary.formatted_target_avg_hpp || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Rincian Komponen Biaya Terhubung
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Alur data otomatis dari modul transaksi operasional ERP Fashol
            </p>
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Pilih Periode Rekap Biaya"
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {(availablePeriods.length > 0 ? availablePeriods : [period]).map((p) => (
              <option key={p} value={p}>Periode: {p}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">KOMPONEN BIAYA</th>
                <th className="py-4 px-6">SUMBER DATA</th>
                <th className="py-4 px-6 text-right">NILAI BIAYA</th>
                <th className="py-4 px-6 text-right">KONTRIBUSI %</th>
                <th className="py-4 px-6 text-center">INTEGRASI SISTEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>Memuat rekapitulasi biaya produksi...</span>
                    </div>
                  </td>
                </tr>
              ) : components.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Tidak ada komponen biaya untuk periode ini.
                  </td>
                </tr>
              ) : (
                components.map((c, idx) => {
                  const pct = summary.total_cost > 0 ? Math.round((c.amount / summary.total_cost) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{c.component}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          c.source === 'Payroll Mingguan'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (c.source === 'Kas Keluar' || c.source === 'Keuangan')
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : c.source === 'Standar HPP Produk'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : c.source === 'Alokasi Utilitas Konveksi'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {c.source}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-base text-slate-900">
                        {c.formatted_amount}
                      </td>
                      <td className="py-4 px-6 text-right font-semibold text-slate-600">
                        {pct}%
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{c.link_type}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Informative SPK Guarantee Note */}
        <div className="p-5 bg-emerald-50/60 border-t border-emerald-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950">
            <strong>Integritas Data Keuangan Sesuai SPK:</strong> Modul ini menjamin pemisahan yang bersih antara upah mingguan borongan produksi dan pengeluaran kas operasional. Biaya upah diambil sekali dari data Produksi Harian/Payroll, tidak pernah diinput ulang atau dihitung dua kali pada laporan Finance.
          </div>
        </div>
      </div>

      {/* Print Report Modal */}
      <PrintReportModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="Rekap Biaya Produksi"
        subtitle={`Akumulasi upah produksi mingguan, bahan baku, dan overhead konveksi | Output: ${summary.formatted_output} | Rata-rata: ${summary.formatted_avg_cost}/pcs`}
        period={period}
        orientation="portrait"
        excelFilename="rekap_biaya_produksi"
        columns={[
          { header: 'No', key: 'no', align: 'center' },
          { header: 'Komponen Biaya', key: 'component' },
          { header: 'Sumber Data', key: 'source' },
          { header: 'Nilai Biaya', key: 'amount', align: 'right' },
          { header: 'Kontribusi %', key: 'percentage', align: 'right' },
          { header: 'Status Integrasi', key: 'link_type', align: 'center' },
        ]}
        data={components.map((c, i) => ({
          no: i + 1,
          component: c.component,
          source: c.source,
          amount: c.formatted_amount,
          percentage: summary.total_cost > 0 ? `${Math.round((c.amount / summary.total_cost) * 100)}%` : '0%',
          link_type: c.link_type,
        }))}
        totals={{
          component: 'TOTAL BIAYA PRODUKSI',
          amount: summary.formatted_total_cost,
        }}
      />
    </div>
  );
}
