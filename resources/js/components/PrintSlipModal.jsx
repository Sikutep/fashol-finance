import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  Check, 
  Layers, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { exportToExcel, printHtmlContent, formatRupiah } from '../utils/exportUtils';

export default function PrintSlipModal({
  isOpen,
  onClose,
  type = 'weekly', // 'weekly' | 'monthly'
  slips = [],
  period = '',
  paymentDate = '',
}) {
  if (!isOpen || !slips || slips.length === 0) return null;

  // Paper size options: 'a5-landscape' (Default for convection slips), 'thermal-80', 'a4-portrait'
  const [paperSize, setPaperSize] = useState('a5-landscape');
  const [previewIndex, setPreviewIndex] = useState(0);

  const isBulk = slips.length > 1;
  const currentSlip = slips[previewIndex] || slips[0];

  // Generate HTML for a single slip based on paperSize
  const renderSingleSlipHtml = (slip, isLast = false) => {
    const isWeekly = type === 'weekly';
    const isThermal = paperSize === 'thermal-80';

    if (isWeekly) {
      const details = slip.details || [];
      const slipPaymentDate = slip.payment_date || paymentDate || '-';
      return `
        <div class="slip-container ${!isLast ? 'page-break' : ''}">
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:8px;">
            <div>
              <div style="font-weight:900; font-size:${isThermal ? '12px' : '15px'}; color:#15352A; letter-spacing:0.5px;">CV FASHOL MITSLI SEE</div>
              <div style="font-size:${isThermal ? '9px' : '10px'}; color:#64748b;">Konveksi, Sablon & Bordir Komputer • Divisi Produksi</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:${isThermal ? '11px' : '13px'}; color:#0f172a;">SLIP UPAH BORONGAN</div>
              <div style="font-size:${isThermal ? '9px' : '10px'}; color:#047857; font-weight:600;">Periode: ${slip.period || period}</div>
            </div>
          </div>

          <!-- Worker & Slip Metadata -->
          <div style="display:grid; grid-template-columns:${isThermal ? '1fr' : '1fr 1fr'}; gap:4px; font-size:${isThermal ? '9px' : '10.5px'}; margin-bottom:8px; background:#f8fafc; padding:6px 8px; border-radius:4px; border:1px solid #e2e8f0;">
            <div>
              <div>Nama Pekerja: <strong>${slip.worker_name}</strong></div>
              <div>No. Payroll: <span style="font-family:monospace; font-weight:bold;">${slip.payroll_number || '-'}</span> <span style="font-size:0.85em; color:#047857;">(${slip.payroll_day || 'Kamis'})</span></div>
            </div>
            <div style="text-align:${isThermal ? 'left' : 'right'};">
              <div>Tgl Pembayaran: <strong>${slipPaymentDate}</strong></div>
              <div>Status: <span style="font-weight:bold; color:#047857;">${slip.status || 'Disetujui'}</span></div>
            </div>
          </div>

          <!-- Production Table Breakdown -->
          <table>
            <thead>
              <tr>
                <th style="width:25px; text-align:center;">No</th>
                <th style="width:75px;">Tanggal</th>
                <th>Proses Kerja</th>
                <th>Produk / Varian</th>
                <th style="text-align:right; width:50px;">Qty</th>
                <th style="text-align:right; width:70px;">Tarif</th>
                <th style="text-align:right; width:85px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${details.length === 0 ? `
                <tr>
                  <td style="text-align:center;">1</td>
                  <td>${period}</td>
                  <td>Borongan Jahit / Potong</td>
                  <td>Produksi Sesuai Laporan</td>
                  <td style="text-align:right;">${slip.total_qty || slip.formatted_qty}</td>
                  <td style="text-align:right;">-</td>
                  <td style="text-align:right; font-weight:bold;">${slip.formatted_wage || formatRupiah(slip.total_wage)}</td>
                </tr>
              ` : details.map((d, i) => `
                <tr>
                  <td style="text-align:center;">${i + 1}</td>
                  <td>${d.date || d.production_date || '-'}</td>
                  <td style="font-weight:600;">${d.process || d.process_name || '-'}</td>
                  <td>${d.product || d.product_name || '-'} <span style="color:#64748b; font-size:0.85em;">(${d.variation || ''})</span></td>
                  <td style="text-align:right;">${d.qty} pcs</td>
                  <td style="text-align:right;">${d.rate_formatted || formatRupiah(d.rate)}</td>
                  <td style="text-align:right; font-weight:bold;">${d.total_wage_formatted || formatRupiah(d.total_wage)}</td>
                </tr>
              `).join('')}
              <tr style="background:#f1f5f9; font-weight:bold; border-top:2px solid #0f172a;">
                <td colspan="4" style="text-align:right; padding:6px;">TOTAL OUTPUT & UPAH BERSIH:</td>
                <td style="text-align:right; padding:6px; color:#0f172a;">${slip.total_qty} pcs</td>
                <td></td>
                <td style="text-align:right; padding:6px; font-size:1.15em; color:#047857;">${slip.formatted_wage || formatRupiah(slip.total_wage)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures (3 Kolom Resmi) -->
          <div class="signature-box">
            <div class="signature-column">
              <div>Diserahkan Oleh,</div>
              <div class="signature-space"></div>
              <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">Bag. Finance</div>
            </div>
            <div class="signature-column">
              <div>Diperiksa Oleh,</div>
              <div class="signature-space"></div>
              <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">Mandor / QC</div>
            </div>
            <div class="signature-column">
              <div>Diterima Pekerja,</div>
              <div class="signature-space"></div>
              <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">${slip.worker_name}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Monthly Staff Payroll Slip
      return `
        <div class="slip-container ${!isLast ? 'page-break' : ''}">
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:8px;">
            <div>
              <div style="font-weight:900; font-size:${isThermal ? '12px' : '15px'}; color:#15352A; letter-spacing:0.5px;">CV FASHOL MITSLI SEE</div>
              <div style="font-size:${isThermal ? '9px' : '10px'}; color:#64748b;">Administrasi, Finance & Operasional</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:${isThermal ? '11px' : '13px'}; color:#0f172a;">SLIP GAJI BULANAN</div>
              <div style="font-size:${isThermal ? '9px' : '10px'}; color:#047857; font-weight:600;">Periode: ${slip.period || period}</div>
            </div>
          </div>

          <!-- Metadata -->
          <div style="display:grid; grid-template-columns:${isThermal ? '1fr' : '1fr 1fr'}; gap:4px; font-size:${isThermal ? '9px' : '10.5px'}; margin-bottom:8px; background:#f8fafc; padding:6px 8px; border-radius:4px; border:1px solid #e2e8f0;">
            <div>
              <div>Nama Karyawan: <strong>${slip.worker_name}</strong></div>
              <div>Jabatan / Divisi: <strong>${slip.position || 'Staff'}</strong></div>
            </div>
            <div style="text-align:${isThermal ? 'left' : 'right'};">
              <div>No. Payroll: <span style="font-family:monospace; font-weight:bold;">${slip.payroll_number || '-'}</span></div>
              <div>Status: <span style="font-weight:bold; color:#047857;">${slip.status || 'Disetujui'}</span></div>
            </div>
          </div>

          <!-- Salary Components Table -->
          <table>
            <thead>
              <tr>
                <th style="width:30px; text-align:center;">No</th>
                <th>Komponen Pendapatan & Potongan</th>
                <th style="text-align:right; width:120px;">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:center;">1</td>
                <td>Gaji Pokok</td>
                <td style="text-align:right; font-weight:600;">${formatRupiah(slip.basic_salary)}</td>
              </tr>
              <tr>
                <td style="text-align:center;">2</td>
                <td>Tunjangan Jabatan & Operasional</td>
                <td style="text-align:right; font-weight:600;">${formatRupiah(slip.allowance)}</td>
              </tr>
              <tr>
                <td style="text-align:center;">3</td>
                <td>Upah Lembur</td>
                <td style="text-align:right; font-weight:600;">${formatRupiah(slip.overtime)}</td>
              </tr>
              <tr>
                <td style="text-align:center;">4</td>
                <td style="color:#b91c1c;">Potongan (Kasbon / Izin / Keterlambatan)</td>
                <td style="text-align:right; font-weight:600; color:#b91c1c;">${slip.deductions > 0 ? `(${formatRupiah(slip.deductions)})` : 'Rp 0'}</td>
              </tr>
              <tr style="background:#f1f5f9; font-weight:bold; border-top:2px solid #0f172a;">
                <td colspan="2" style="text-align:right; padding:6px;">TOTAL GAJI BERSIH (TAKE HOME PAY):</td>
                <td style="text-align:right; padding:6px; font-size:1.15em; color:#047857;">${formatRupiah(slip.total_salary)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="signature-box">
            <div class="signature-column">
              <div>Bagian Keuangan,</div>
              <div class="signature-space"></div>
              <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">Finance Admin</div>
            </div>
            <div class="signature-column">
              <div>Menyetujui,</div>
              <div class="signature-space"></div>
              <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">Owner Fashol</div>
            </div>
            <div class="signature-column">
              <div>Penerima,</div>
              <div class="signature-space"></div>
              <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:85px;">${slip.worker_name}</div>
            </div>
          </div>
        </div>
      `;
    }
  };

  // Trigger Print / PDF download
  const handlePrint = () => {
    const fullHtml = slips.map((s, idx) => renderSingleSlipHtml(s, idx === slips.length - 1)).join('');
    const docTitle = isBulk 
      ? `Bulk_Slip_${type === 'weekly' ? 'Upah' : 'Gaji'}_${slips.length}_Pekerja`
      : `Slip_${type === 'weekly' ? 'Upah' : 'Gaji'}_${currentSlip.worker_name.replace(/\s+/g, '_')}`;

    printHtmlContent({
      htmlContent: fullHtml,
      title: docTitle,
      paperSize,
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (type === 'weekly') {
      const isDetailed = !isBulk && currentSlip.details && currentSlip.details.length > 0;
      if (isDetailed) {
        exportToExcel({
          filename: `Slip_Upah_${currentSlip.worker_name.replace(/\s+/g, '_')}_${period}`,
          sheetName: currentSlip.worker_name.substring(0, 25),
          title: 'CV FASHOL MITSLI SEE — SLIP UPAH BORONGAN PRODUKSI',
          subtitle: `Nama Pekerja: ${currentSlip.worker_name} | No. Payroll: ${currentSlip.payroll_number || '-'} | Periode: ${period}`,
          columns: [
            { header: 'No', key: 'no', align: 'center' },
            { header: 'Tanggal', key: 'date' },
            { header: 'No. Transaksi', key: 'transaction_number' },
            { header: 'Proses Kerja', key: 'process' },
            { header: 'Produk', key: 'product' },
            { header: 'Varian / Warna', key: 'variant' },
            { header: 'Qty (pcs)', key: 'qty', align: 'right' },
            { header: 'Tarif Satuan (Rp)', key: 'rate', align: 'right' },
            { header: 'Total Upah (Rp)', key: 'total_wage', align: 'right' },
          ],
          data: currentSlip.details.map((d, i) => ({
            no: i + 1,
            date: d.date || d.production_date,
            transaction_number: d.transaction_number || '-',
            process: d.process || d.process_name,
            product: d.product || d.product_name,
            variant: `${d.variation || ''} ${d.color ? `(${d.color})` : ''}`,
            qty: d.qty,
            rate: formatRupiah(d.rate),
            total_wage: formatRupiah(d.total_wage),
          })),
          totals: {
            qty: currentSlip.total_qty + ' pcs',
            total_wage: formatRupiah(currentSlip.total_wage),
          }
        });
      } else {
        // Bulk list export
        exportToExcel({
          filename: `Rekap_Slip_Upah_Mingguan_${period}`,
          sheetName: 'Slip Upah',
          title: 'CV FASHOL MITSLI SEE — REKAP SLIP UPAH BORONGAN PRODUKSI MINGGUAN',
          subtitle: `Periode: ${period} | Total Pekerja: ${slips.length} Orang`,
          columns: [
            { header: 'No', key: 'no', align: 'center' },
            { header: 'No. Payroll', key: 'payroll_number' },
            { header: 'Nama Pekerja', key: 'worker_name' },
            { header: 'Periode Kerja', key: 'period' },
            { header: 'Total Output (pcs)', key: 'qty', align: 'right' },
            { header: 'Total Upah Bersih (Rp)', key: 'total_wage', align: 'right' },
            { header: 'Status Payroll', key: 'status', align: 'center' },
          ],
          data: slips.map((s, i) => ({
            no: i + 1,
            payroll_number: s.payroll_number || '-',
            worker_name: s.worker_name,
            period: s.period || period,
            qty: s.total_qty,
            total_wage: formatRupiah(s.total_wage),
            status: s.status || 'Disetujui',
          })),
          totals: {
            qty: slips.reduce((sum, s) => sum + (Number(s.total_qty) || 0), 0) + ' pcs',
            total_wage: formatRupiah(slips.reduce((sum, s) => sum + (Number(s.total_wage) || 0), 0)),
          }
        });
      }
    } else {
      // Monthly salary export
      exportToExcel({
        filename: `Rekap_Slip_Gaji_Bulanan_${period}`,
        sheetName: 'Slip Gaji',
        title: 'CV FASHOL MITSLI SEE — REKAP SLIP GAJI BULANAN KARYAWAN',
        subtitle: `Periode: ${period} | Total Karyawan: ${slips.length} Orang`,
        columns: [
          { header: 'No', key: 'no', align: 'center' },
          { header: 'No. Payroll', key: 'payroll_number' },
          { header: 'Nama Karyawan', key: 'worker_name' },
          { header: 'Jabatan / Divisi', key: 'position' },
          { header: 'Gaji Pokok', key: 'basic', align: 'right' },
          { header: 'Tunjangan', key: 'allowance', align: 'right' },
          { header: 'Lembur', key: 'overtime', align: 'right' },
          { header: 'Potongan', key: 'deductions', align: 'right' },
          { header: 'Gaji Bersih Diterima', key: 'total', align: 'right' },
          { header: 'Status', key: 'status', align: 'center' },
        ],
        data: slips.map((s, i) => ({
          no: i + 1,
          payroll_number: s.payroll_number || '-',
          worker_name: s.worker_name,
          position: s.position || 'Staff',
          basic: formatRupiah(s.basic_salary),
          allowance: formatRupiah(s.allowance),
          overtime: formatRupiah(s.overtime),
          deductions: formatRupiah(s.deductions),
          total: formatRupiah(s.total_salary),
          status: s.status || 'Disetujui',
        })),
        totals: {
          basic: formatRupiah(slips.reduce((sum, s) => sum + (Number(s.basic_salary) || 0), 0)),
          total: formatRupiah(slips.reduce((sum, s) => sum + (Number(s.total_salary) || 0), 0)),
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {isBulk ? `Bulk Cetak (${slips.length} Slip Siap Dicetak)` : `Cetak Slip — ${currentSlip.worker_name}`}
              </h3>
              <p className="text-xs text-slate-500">
                Pilih ukuran kertas cetak yang disesuaikan (Bukan hanya A4) atau ekspor ke Excel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size & Layout Options Toolbar */}
        <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Ukuran Kertas Slip:
            </span>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setPaperSize('a5-landscape')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  paperSize === 'a5-landscape' 
                    ? 'bg-emerald-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📑 Setengah A4 / A5 (210×148 mm)
              </button>
              <button
                onClick={() => setPaperSize('thermal-80')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  paperSize === 'thermal-80' 
                    ? 'bg-emerald-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧾 Struk 80mm
              </button>
              <button
                onClick={() => setPaperSize('a4-portrait')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  paperSize === 'a4-portrait' 
                    ? 'bg-emerald-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 Standar A4
              </button>
            </div>
          </div>

          {isBulk && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">
                Slip ke-<strong>{previewIndex + 1}</strong> dari <strong>{slips.length}</strong>
              </span>
              <button
                onClick={() => setPreviewIndex(p => Math.max(0, p - 1))}
                disabled={previewIndex === 0}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewIndex(p => Math.min(slips.length - 1, p + 1))}
                disabled={previewIndex === slips.length - 1}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Live Visual Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center items-start">
          <div 
            className={`bg-white shadow-md rounded-xl p-6 transition-all border border-slate-200 ${
              paperSize === 'thermal-80' 
                ? 'w-[320px] text-xs' 
                : paperSize === 'a5-landscape' 
                ? 'w-full max-w-[700px] aspect-[210/148] min-h-[420px]' 
                : 'w-full max-w-[650px]'
            }`}
            dangerouslySetInnerHTML={{ __html: renderSingleSlipHtml(currentSlip, true) }}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isBulk ? (
              <span>
                💡 <strong>Bulk Mode:</strong> Dokumen cetak otomatis membuat pemisah halaman per slip sesuai ukuran <strong>{paperSize === 'a5-landscape' ? 'A5 Landscape' : paperSize === 'thermal-80' ? 'Struk 80mm' : 'A4'}</strong>.
              </span>
            ) : (
              <span>
                💡 Format cetak hemat kertas telah disesuaikan proporsional untuk amplop/struk konveksi.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all shadow-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{isBulk ? `Cetak Semua (${slips.length} Slip)` : 'Cetak Slip Sekarang'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
