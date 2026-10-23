/**
 * Export and Print Utility for ERP Fashol Finance
 * Supports Excel (.xls / .csv with UTF-8 BOM), Print/PDF formatting for A4, A5 Landscape (Half-A4), and Thermal 80mm.
 */

// Helper: Format Rupiah number
export const formatRupiah = (val) => {
  const num = Number(val) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
};

/**
 * Export structured data to Excel-compatible file (.xls format with real table styling)
 */
export const exportToExcel = ({
  filename = 'laporan-finance',
  sheetName = 'Sheet1',
  title = 'CV FASHOL MITSLI SEE',
  subtitle = '',
  columns = [],
  data = [],
  totals = null,
}) => {
  const dateStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

  let tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${sheetName.replace(/[\\/?*\[\]]/g, '')}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #15352A; color: #ffffff; font-weight: bold; padding: 10px 8px; border: 1px solid #0D221B; text-align: left; }
      td { padding: 8px; border: 1px solid #d1d5db; font-size: 11pt; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
      .title { font-size: 16pt; font-weight: bold; color: #15352A; }
      .subtitle { font-size: 11pt; color: #4b5563; }
      .bg-total { background-color: #f3f4f6; font-weight: bold; border-top: 2px solid #15352A; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="${columns.length}" class="title">${title}</td>
      </tr>
      ${subtitle ? `<tr><td colspan="${columns.length}" class="subtitle">${subtitle}</td></tr>` : ''}
      <tr>
        <td colspan="${columns.length}" style="font-size: 9pt; color: #6b7280; padding-bottom: 12px;">Diunduh pada: ${dateStr}</td>
      </tr>
      <tr></tr>
      <thead>
        <tr>
          ${columns.map(c => `<th style="${c.align === 'right' ? 'text-align:right;' : c.align === 'center' ? 'text-align:center;' : 'text-align:left;'}">${c.header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${columns.map(c => {
              const val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '';
              const alignClass = c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '';
              return `<td class="${alignClass}">${val}</td>`;
            }).join('')}
          </tr>
        `).join('')}
        ${totals ? `
          <tr class="bg-total">
            ${columns.map((c, i) => {
              if (i === 0) return `<td>TOTAL</td>`;
              const totalVal = totals[c.key] !== undefined ? totals[c.key] : '';
              const alignClass = c.align === 'right' ? 'text-right font-bold' : 'text-center font-bold';
              return `<td class="${alignClass}">${totalVal}</td>`;
            }).join('')}
          </tr>
        ` : ''}
      </tbody>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Print document in dedicated printable iframe or popup window
 * with precise @page sizing (A5 Landscape, Thermal 80mm, or A4).
 */
export const printHtmlContent = ({ htmlContent, title = 'Cetak Dokumen', paperSize = 'a5-landscape' }) => {
  let pageStyle = '';
  if (paperSize === 'a5-landscape') {
    pageStyle = `@page { size: 210mm 148mm; margin: 6mm 8mm; }`;
  } else if (paperSize === 'thermal-80') {
    pageStyle = `@page { size: 80mm auto; margin: 2mm; }`;
  } else if (paperSize === 'a4-landscape') {
    pageStyle = `@page { size: A4 landscape; margin: 10mm; }`;
  } else {
    pageStyle = `@page { size: A4 portrait; margin: 12mm; }`;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Pop-up terblokir oleh browser. Mohon izinkan pop-up untuk mencetak dokumen.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        ${pageStyle}
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-size: ${paperSize === 'thermal-80' ? '10px' : paperSize === 'a5-landscape' ? '11px' : '12px'};
          line-height: 1.35;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
        }
        .slip-container {
          width: 100%;
          border: ${paperSize === 'thermal-80' ? 'none' : '1px solid #cbd5e1'};
          border-radius: ${paperSize === 'thermal-80' ? '0' : '6px'};
          padding: ${paperSize === 'thermal-80' ? '6px 4px' : '14px 18px'};
          margin-bottom: ${paperSize === 'thermal-80' ? '10px' : '0'};
          background: #ffffff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 6px;
        }
        th {
          background-color: #f1f5f9;
          color: #1e293b;
          font-weight: 700;
          padding: ${paperSize === 'thermal-80' ? '4px 2px' : '5px 6px'};
          border: 1px solid #cbd5e1;
          font-size: 0.9em;
        }
        td {
          padding: ${paperSize === 'thermal-80' ? '3px 2px' : '4px 6px'};
          border: 1px solid #e2e8f0;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .text-emerald { color: #047857; }
        .border-dashed { border-style: dashed; }
        .signature-box {
          display: flex;
          justify-content: space-between;
          margin-top: 14px;
          padding-top: 8px;
        }
        .signature-column {
          text-align: center;
          width: 30%;
        }
        .signature-space {
          height: 38px;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.focus();
            window.print();
            window.close();
          }, 300);
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
};
