import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Printer, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Building,
  RefreshCw,
  PieChart,
  Tag,
  Download
} from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import PrintReportModal from './PrintReportModal';
import { exportToExcel } from '../utils/exportUtils';

export default function LaporanLabaRugiView({ currentRole, onNavigate }) {
  const { showLoading, showSuccess, hideLoading } = useLoading();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const months = [
    { num: 1, name: 'Januari' },
    { num: 2, name: 'Februari' },
    { num: 3, name: 'Maret' },
    { num: 4, name: 'April' },
    { num: 5, name: 'Mei' },
    { num: 6, name: 'Juni' },
    { num: 7, name: 'Juli' },
    { num: 8, name: 'Agustus' },
    { num: 9, name: 'September' },
    { num: 10, name: 'Oktober' },
    { num: 11, name: 'November' },
    { num: 12, name: 'Desember' },
  ];

  const fetchIncomeStatement = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/laporan-laba-rugi?month=${selectedMonth}&year=${selectedYear}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      }
    } catch (err) {
      console.error('Gagal memuat laporan laba rugi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeStatement();
  }, [selectedMonth, selectedYear]);

  const summary = data?.summary || {
    gross_sales: 0,
    formatted_gross_sales: 'Rp 0',
    sales_returns: 0,
    formatted_sales_returns: 'Rp 0',
    sales_discounts: 0,
    formatted_sales_discounts: 'Rp 0',
    net_sales: 0,
    formatted_net_sales: 'Rp 0',
    cogs: 0,
    formatted_cogs: 'Rp 0',
    gross_profit: 0,
    formatted_gross_profit: 'Rp 0',
    total_operating_expenses: 0,
    formatted_total_operating_expenses: 'Rp 0',
    operating_profit: 0,
    formatted_operating_profit: 'Rp 0',
    other_income: 0,
    formatted_other_income: 'Rp 0',
    total_non_operating_expenses: 0,
    formatted_total_non_operating_expenses: 'Rp 0',
    net_profit: 0,
    formatted_net_profit: 'Rp 0',
    is_profitable: true,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 7 SPK Reports Navigation Hub */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5 mb-1.5">
          Pusat Laporan Finance (7 Laporan SPK)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#15352A] text-white shadow-xs"
          >
            1. Laba Rugi Operasional (Aktif)
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('biaya-produksi')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            2. Rekap Biaya Produksi
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('payroll-mingguan')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            3. Rekap Payroll Mingguan
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('payroll-bulanan')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            4. Rekap Payroll Bulanan
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('keuangan')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            5. Kas Masuk & Kas Keluar
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('keuangan')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            6. Rekap Beban Operasional
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('hpp-produk')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            7. Rekap HPP Produk
          </button>
        </div>
      </div>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 tracking-wider uppercase mb-1">
            <Building className="w-4 h-4" />
            <span>CV FASHOL MITSLI SEE • DIVISI KEUANGAN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Laporan Laba Rugi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pembukuan komprehensif pendapatan bersih, HPP penjualan, dan 27 pos beban operasional.
          </p>
        </div>

        {/* Filter Periode & Cetak */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer border-l border-slate-200 pl-2"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Cetak Laporan</span>
          </button>

          <button
            onClick={() => {
              const opRows = (data?.operating_expenses || []).map((item, idx) => ({
                no: idx + 1,
                account: item.account,
                amount: item.formatted_amount,
              }));
              exportToExcel({
                filename: `Laporan_Laba_Rugi_${data?.period?.replace(/[\/\s:]/g, '_') || 'Laba_Rugi'}`,
                sheetName: 'Laba Rugi',
                title: 'CV FASHOL MITSLI SEE — LAPORAN LABA RUGI OPERASIONAL',
                subtitle: `Periode: ${data?.period} | Pendapatan Bersih: ${summary.formatted_net_sales} | Laba Bersih: ${summary.formatted_net_profit}`,
                columns: [
                  { header: 'No', key: 'no', align: 'center' },
                  { header: 'Pos Rekening Keuangan / Biaya Operasional', key: 'account' },
                  { header: 'Nominal', key: 'amount', align: 'right' },
                ],
                data: [
                  { no: '1', account: 'Penjualan Produk (Gross)', amount: summary.formatted_gross_sales },
                  { no: '', account: 'Retur Penjualan', amount: summary.sales_returns > 0 ? `(${summary.formatted_sales_returns})` : 'Rp 0' },
                  { no: '', account: 'Potongan Penjualan / Biaya Marketplace', amount: summary.sales_discounts > 0 ? `(${summary.formatted_sales_discounts})` : 'Rp 0' },
                  { no: '', account: 'JUMLAH PENDAPATAN BERSIH', amount: summary.formatted_net_sales },
                  { no: '2', account: 'Harga Pokok Penjualan (HPP)', amount: summary.formatted_cogs },
                  { no: '', account: 'LABA KOTOR (GROSS PROFIT)', amount: summary.formatted_gross_profit },
                  ...opRows,
                  { no: '', account: 'JUMLAH BIAYA OPERASIONAL', amount: summary.formatted_total_operating_expenses },
                  { no: '', account: 'LABA (RUGI) OPERASIONAL', amount: summary.formatted_operating_profit },
                  { no: '4', account: 'Pendapatan Lain-lain', amount: summary.formatted_other_income },
                  ...(data?.non_operating_expenses || []).map((item, idx) => ({
                    no: '',
                    account: item.account,
                    amount: item.formatted_amount,
                  })),
                  { no: '', account: 'LABA (RUGI) BERSIH', amount: summary.formatted_net_profit },
                ],
              });
            }}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Pendapatan Bersih */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pendapatan Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.formatted_net_sales}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Penjualan Gross dikurangi potongan marketplace
          </div>
        </div>

        {/* Card 2: HPP Penjualan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HPP Penjualan (COGS)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.formatted_cogs}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Biaya bahan baku & upah produk terjual
          </div>
        </div>

        {/* Card 3: Laba Kotor */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laba Kotor (Gross Profit)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary.formatted_gross_profit}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Margin sebelum beban operasional
          </div>
        </div>

        {/* Card 4: Laba Bersih */}
        <div className={`rounded-2xl p-5 border shadow-sm relative overflow-hidden text-white ${
          summary.is_profitable ? 'bg-gradient-to-br from-emerald-600 to-teal-800 border-emerald-500' : 'bg-gradient-to-br from-rose-600 to-rose-800 border-rose-500'
        }`}>
          <div className="flex items-center justify-between text-white/80">
            <span className="text-xs font-bold uppercase tracking-wider">
              {summary.is_profitable ? 'Laba Bersih (Untung)' : 'Rugi Bersih'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              {summary.is_profitable ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-2xl font-black mt-2">
            {summary.formatted_net_profit}
          </div>
          <div className="text-xs text-white/80 mt-1">
            {summary.is_profitable ? 'Kinerja keuangan profitabel' : 'Beban operasional melebihi margin'}
          </div>
        </div>
      </div>

      {/* Main Income Statement Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Header Banner */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base tracking-wide">
              RINCIAN LAPORAN LABA RUGI • {data?.period?.toUpperCase()}
            </h3>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-medium border border-slate-700">
            Mata Uang: IDR (Rupiah)
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          
          {/* 1. SEKSI PENDAPATAN */}
          <div className="p-6 bg-slate-50/50">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
              1. PENDAPATAN
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 text-slate-700">
                <span className="pl-4">Penjualan Produk (Kotor / Gross)</span>
                <span className="font-semibold text-slate-900">{summary.formatted_gross_sales}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-slate-700">
                <span className="pl-4">Retur Penjualan</span>
                <span className="font-semibold text-slate-600">
                  {summary.sales_returns > 0 ? `(${summary.formatted_sales_returns})` : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 text-rose-700">
                <span className="pl-4">Potongan Penjualan / Biaya Marketplace (Shopee/TikTok)</span>
                <span className="font-semibold">
                  {summary.sales_discounts > 0 ? `(${summary.formatted_sales_discounts})` : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 font-bold text-slate-900 bg-emerald-50/60 p-3 rounded-xl mt-2">
                <span>JUMLAH PENDAPATAN BERSIH</span>
                <span className="text-emerald-800 text-base">{summary.formatted_net_sales}</span>
              </div>
            </div>
          </div>

          {/* 2. SEKSI HARGA POKOK PENJUALAN */}
          <div className="p-6">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
              2. HARGA POKOK PENJUALAN (HPP)
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 text-slate-700">
                <span className="pl-4">Harga Pokok Penjualan (Bahan Baku & Upah Tenaga Kerja)</span>
                <span className="font-semibold text-slate-900">{summary.formatted_cogs}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-200 font-bold text-slate-900 bg-amber-50/60 p-3 rounded-xl mt-2">
                <span>LABA KOTOR (GROSS PROFIT)</span>
                <span className="text-amber-900 text-base">{summary.formatted_gross_profit}</span>
              </div>
            </div>
          </div>

          {/* 3. SEKSI BIAYA OPERASIONAL (27 AKUN RESMI) */}
          <div className="p-6 bg-slate-50/50">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                3. BIAYA OPERASIONAL (27 POS BEBAN RESMI)
              </div>
              <span className="text-xs text-slate-500">
                Total Pos: {data?.operating_expenses?.length || 0} Akun
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-1">
              {data?.operating_expenses?.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex justify-between items-center py-2 px-3 rounded-lg text-xs sm:text-sm ${
                    item.amount > 0 ? 'bg-white border border-slate-200/80 my-0.5' : 'text-slate-400'
                  }`}
                >
                  <span className="font-medium text-slate-700 truncate pr-2 flex items-center gap-1.5">
                    <span>{item.account}</span>
                    {item.account === 'Beban Gaji Karyawan' && item.amount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold" title="Terintegrasi otomatis dari modul Payroll Bulanan">
                        Modul Payroll
                      </span>
                    )}
                  </span>
                  <span className={`font-semibold shrink-0 ${item.amount > 10000000 ? 'text-rose-700 font-bold' : 'text-slate-900'}`}>
                    {item.formatted_amount}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 font-bold text-slate-900 bg-rose-50/60 p-3 rounded-xl mt-4">
              <span>JUMLAH BIAYA OPERASIONAL</span>
              <span className="text-rose-800 text-base">{summary.formatted_total_operating_expenses}</span>
            </div>

            <div className={`flex justify-between items-center p-3 rounded-xl mt-2 font-bold text-base ${
              summary.operating_profit >= 0 ? 'bg-emerald-100/70 text-emerald-950' : 'bg-rose-100/70 text-rose-950'
            }`}>
              <span>LABA (RUGI) OPERASIONAL</span>
              <span>{summary.formatted_operating_profit}</span>
            </div>
          </div>

          {/* 4. SEKSI PENDAPATAN & BEBAN LUAR USAHA */}
          <div className="p-6">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
              4. PENDAPATAN & BIAYA LUAR USAHA
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 text-slate-700">
                <span className="pl-4">Pendapatan Lain-lain</span>
                <span className="font-semibold text-slate-600">{summary.formatted_other_income}</span>
              </div>
              {data?.non_operating_expenses?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 text-slate-700">
                  <span className="pl-4">{item.account}</span>
                  <span className="font-semibold text-slate-800">{item.formatted_amount}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-semibold text-slate-600 text-xs">
                <span className="pl-4">Total Biaya Luar Usaha</span>
                <span>{summary.formatted_total_non_operating_expenses}</span>
              </div>
            </div>

            {/* FINAL NET PROFIT BANNER */}
            <div className={`flex justify-between items-center p-4 rounded-xl mt-6 text-lg font-black ${
              summary.is_profitable ? 'bg-emerald-600 text-white shadow-md' : 'bg-rose-600 text-white shadow-md'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                <span>{summary.is_profitable ? 'LABA (UNTUNG) BERSIH' : 'LABA (RUGI) BERSIH'}</span>
              </div>
              <span className="text-xl sm:text-2xl">{summary.formatted_net_profit}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Print Report Modal */}
      <PrintReportModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="Laporan Laba Rugi Operasional"
        subtitle={`Pembukuan resmi pendapatan bersih, HPP, dan 27 akun operasional | Laba Bersih: ${summary.formatted_net_profit}`}
        period={data?.period || 'Periode Aktif'}
        orientation="portrait"
        excelFilename="laporan_laba_rugi"
        columns={[
          { header: 'No', key: 'no', align: 'center' },
          { header: 'Pos Rekening Keuangan / Beban Operasional', key: 'account' },
          { header: 'Nominal', key: 'amount', align: 'right' },
        ]}
        data={[
          { no: '1', account: 'Penjualan Produk (Gross)', amount: summary.formatted_gross_sales },
          { no: '', account: 'Retur Penjualan', amount: summary.sales_returns > 0 ? `(${summary.formatted_sales_returns})` : 'Rp 0' },
          { no: '', account: 'Potongan Penjualan / Biaya Marketplace', amount: summary.sales_discounts > 0 ? `(${summary.formatted_sales_discounts})` : 'Rp 0' },
          { no: '', account: 'JUMLAH PENDAPATAN BERSIH', amount: summary.formatted_net_sales },
          { no: '2', account: 'Harga Pokok Penjualan (HPP)', amount: summary.formatted_cogs },
          { no: '', account: 'LABA KOTOR (GROSS PROFIT)', amount: summary.formatted_gross_profit },
          ...(data?.operating_expenses || []).map((item, idx) => ({
            no: idx + 1,
            account: item.account,
            amount: item.formatted_amount,
          })),
          { no: '', account: 'JUMLAH BIAYA OPERASIONAL', amount: summary.formatted_total_operating_expenses },
          { no: '', account: 'LABA (RUGI) OPERASIONAL', amount: summary.formatted_operating_profit },
          { no: '4', account: 'Pendapatan Lain-lain', amount: summary.formatted_other_income },
          ...(data?.non_operating_expenses || []).map((item, idx) => ({
            no: '',
            account: item.account,
            amount: item.formatted_amount,
          })),
          { no: '', account: 'LABA (RUGI) BERSIH', amount: summary.formatted_net_profit },
        ]}
      />
    </div>
  );
}
