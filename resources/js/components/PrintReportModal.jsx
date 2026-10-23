import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  Check, 
  Building,
  Calendar
} from 'lucide-react';
import { exportToExcel, printHtmlContent } from '../utils/exportUtils';

export default function PrintReportModal({
  isOpen,
  onClose,
  title = 'Laporan Keuangan',
  subtitle = '',
  period = '',
  orientation = 'landscape', // 'portrait' | 'landscape'
  columns = [],
  data = [],
  totals = null,
  excelFilename = 'laporan',
}) {
  if (!isOpen) return null;

  const [paperOrientation, setPaperOrientation] = useState(orientation);
  const dateFormatted = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  const generateReportHtml = () => {
    return `
      <div style="padding: 10px 0;">
        <!-- Kop Resmi -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #15352A; letter-spacing: 0.5px;">CV FASHOL MITSLI SEE</div>
            <div style="font-size: 11px; color: #475569;">Industri Konveksi, Sablon & Fashion • Sistem ERP Keuangan & Produksi</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase;">${title}</div>
            <div style="font-size: 11px; color: #047857; font-weight: 600;">Periode: ${period || '-'}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-bottom:10px;">
          <span>${subtitle ? subtitle : ''}</span>
          <span>Dicetak pada: ${dateFormatted}</span>
        </div>

        <!-- Table -->
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="background-color:#15352A; color:#ffffff;">
              ${columns.map(c => `
                <th style="padding:7px 6px; border:1px solid #0f172a; ${c.align === 'right' ? 'text-align:right;' : c.align === 'center' ? 'text-align:center;' : 'text-align:left;'} font-weight:700;">
                  ${c.header}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((row, idx) => `
              <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                ${columns.map(c => {
                  const val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
                  return `
                    <td style="padding:6px; border:1px solid #e2e8f0; ${c.align === 'right' ? 'text-align:right;' : c.align === 'center' ? 'text-align:center;' : 'text-align:left;'}">
                      ${val}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
            ${totals ? `
              <tr style="background-color:#f1f5f9; font-weight:bold; border-top:2px solid #0f172a;">
                ${columns.map((c, i) => {
                  if (i === 0) return `<td style="padding:7px 6px; border:1px solid #cbd5e1;">TOTAL</td>`;
                  const totalVal = totals[c.key] !== undefined ? totals[c.key] : '';
                  return `
                    <td style="padding:7px 6px; border:1px solid #cbd5e1; ${c.align === 'right' ? 'text-align:right;' : 'text-align:center;'}">
                      ${totalVal}
                    </td>
                  `;
                }).join('')}
              </tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Signatures (3 Box) -->
        <div style="display:flex; justify-content:space-between; margin-top:28px; padding-top:12px; font-size:11px;">
          <div style="text-align:center; width:28%;">
            <div>Dibuat Oleh,</div>
            <div style="height:44px;"></div>
            <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:100px;">Staff Finance / Admin</div>
          </div>
          <div style="text-align:center; width:28%;">
            <div>Diperiksa Oleh,</div>
            <div style="height:44px;"></div>
            <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:100px;">Supervisor / Finance Head</div>
          </div>
          <div style="text-align:center; width:28%;">
            <div>Disetujui Oleh,</div>
            <div style="height:44px;"></div>
            <div style="font-weight:bold; border-top:1px dotted #94a3b8; display:inline-block; padding-top:2px; min-width:100px;">Owner CV Fashol Mitsli See</div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    printHtmlContent({
      htmlContent: generateReportHtml(),
      title: `${title.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}`,
      paperSize: paperOrientation === 'landscape' ? 'a4-landscape' : 'a4-portrait',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `${excelFilename}_${period.replace(/[\/\s:]/g, '_')}`,
      sheetName: title.substring(0, 25),
      title: `CV FASHOL MITSLI SEE — ${title.toUpperCase()}`,
      subtitle: `${subtitle} | Periode: ${period}`,
      columns,
      data,
      totals,
    });
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
                Cetak & Ekspor — {title}
              </h3>
              <p className="text-xs text-slate-500">
                Dokumen formal A4 siap cetak ke printer/PDF dan ekspor spreadsheet Excel
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

        {/* Orientation Selector */}
        <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Tata Letak Kertas A4:
            </span>
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setPaperOrientation('landscape')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  paperOrientation === 'landscape' 
                    ? 'bg-emerald-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 A4 Landscape (Melebar)
              </button>
              <button
                onClick={() => setPaperOrientation('portrait')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  paperOrientation === 'portrait' 
                    ? 'bg-emerald-700 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📑 A4 Portrait (Tegak)
              </button>
            </div>
          </div>

          <div className="text-slate-500">
            Total Baris Data: <strong>{data.length}</strong> Baris
          </div>
        </div>

        {/* Live Visual Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center items-start">
          <div 
            className={`bg-white shadow-md rounded-xl p-8 transition-all border border-slate-200 w-full ${
              paperOrientation === 'landscape' ? 'max-w-[850px]' : 'max-w-[650px]'
            }`}
            dangerouslySetInnerHTML={{ __html: generateReportHtml() }}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            💡 Format laporan dilengkapi kop perusahaan dan 3 kolom otorisasi resmi.
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
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
