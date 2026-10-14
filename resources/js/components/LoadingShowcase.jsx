import React, { useState } from 'react';
import { useLoading } from '../context/LoadingContext';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Sparkles, 
  Play, 
  Layers, 
  ShieldAlert, 
  Code2, 
  Check, 
  Copy,
  Zap,
  Activity,
  Server
} from 'lucide-react';

export default function LoadingShowcase() {
  const { showLoading, hideLoading, showTimedLoading, showMultiStepLoading } = useLoading();
  const [copiedCode, setCopiedCode] = useState(false);
  const [customTitle, setCustomTitle] = useState('Mengirim Pembayaran Vendor');
  const [customSubtitle, setCustomSubtitle] = useState('Mengotorisasi token perbankan & gateway...');
  const [customType, setCustomType] = useState('finance');

  const copyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSimulatePayment = () => {
    showTimedLoading({
      title: 'Memproses Transfer Dana',
      subtitle: 'Menghubungkan ke gateway Bank Indonesia (BI-FAST)...',
      duration: 2800,
      type: 'finance',
      successTitle: 'Transfer Berhasil!',
      successSubtitle: 'Dana sejumlah Rp 15.750.000 telah sukses dikirim ke rekening tujuan.',
    });
  };

  const handleSimulateAudit = () => {
    showMultiStepLoading({
      title: 'Audit & Rekonsiliasi Saldo',
      steps: [
        { label: 'Mengambil mutasi rekening giro & kas utama...' },
        { label: 'Memeriksa selisih faktur dan tanda terima...' },
        { label: 'Menjalankan AI deteksi anomali fraud...' },
        { label: 'Menyusun laporan neraca keuangan otomatis...' }
      ],
      stepDuration: 1200,
      successTitle: 'Rekonsiliasi Selesai!',
      successSubtitle: 'Seluruh akun kas seimbang dan 100% tervalidasi.',
    });
  };

  const handleSimulateError = () => {
    showLoading({
      title: 'Memeriksa Keamanan Jaringan...',
      subtitle: 'Mendeteksi latensi server payment gateway...',
      type: 'finance',
    });

    setTimeout(() => {
      showLoading({
        title: 'Koneksi Gateway Terputus',
        subtitle: 'Gagal menghubungi server bank sentral (HTTP 504 Gateway Timeout). Silakan periksa koneksi Anda.',
        status: 'error',
        canClose: true,
      });
    }, 2200);
  };

  const handleTriggerCustom = () => {
    showTimedLoading({
      title: customTitle,
      subtitle: customSubtitle,
      duration: 3000,
      type: customType,
      successTitle: 'Berhasil Dijalankan!',
      successSubtitle: 'Aksi kustom telah selesai dieksekusi dengan sempurna.',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Background glowing gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Top Navbar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-slate-800/80 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Fashol Finance</h1>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30">
                  React 19 + Vite 7
                </span>
              </div>
              <p className="text-xs text-slate-400">Financial Suite & System Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Status: <strong className="text-emerald-400 font-medium">Online & Ready</strong></span>
            </div>
            <button
              onClick={handleSimulatePayment}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Test Pop-up</span>
            </button>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="mt-8 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800/80 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-48 h-48 text-emerald-400" />
          </div>
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fitur Baru Ditambahkan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              React Berhasil Terpasang dengan Animasi Loading Pop-up!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Aplikasi ini sekarang terintegrasi dengan React 19 di Laravel. Anda dapat menggunakan komponen pop-up loading animasi modern ini di setiap aksi transaksi finansial, form submit, atau sinkronisasi data dengan sangat mudah.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSimulatePayment}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25"
              >
                <Play className="w-4 h-4" />
                <span>Simulasi Transfer Dana (Pop-up)</span>
              </button>
              <button
                onClick={handleSimulateAudit}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all border border-slate-700"
              >
                <Layers className="w-4 h-4 text-teal-400" />
                <span>Multi-Step Progress Audit</span>
              </button>
            </div>
          </div>
        </section>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 text-slate-400 text-xs">
              <span>Total Likuiditas Kas</span>
              <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">Rp 482.950.000</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+14.2% dari bulan lalu</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 text-slate-400 text-xs">
              <span>Pengeluaran Operasional</span>
              <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">Rp 64.300.000</div>
            <div className="text-xs text-slate-400">
              34 Transaksi terverifikasi
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 text-slate-400 text-xs">
              <span>Integrasi API Gateway</span>
              <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg">
                <Server className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">99.98% SLA</div>
            <div className="text-xs text-emerald-400">
              Enkripsi TLS 1.3 & 256-bit
            </div>
          </div>
        </div>

        {/* Interactive Testing Playground */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Varian Pop-up Demo */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Pilihan Mode Animasi Loading</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Klik salah satu tombol di bawah untuk melihat animasi loading pop up dengan skenario nyata:
            </p>

            <div className="space-y-3">
              <div 
                onClick={handleSimulatePayment}
                className="group p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400 transition-colors">
                    1. Loading Finansial Cepat (BI-FAST)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Animasi orbit pulse, ikon kartu berdenyut, auto-success checkmark.
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 font-semibold rounded-lg group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                  Coba
                </span>
              </div>

              <div 
                onClick={handleSimulateAudit}
                className="group p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-200 group-hover:text-teal-400 transition-colors">
                    2. Loading Multi-Step Rekonsiliasi
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Menampilkan progress bar dinamis dan status checklist langkah demi langkah.
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs bg-teal-500/10 text-teal-400 font-semibold rounded-lg group-hover:bg-teal-500 group-hover:text-slate-950 transition-all">
                  Coba
                </span>
              </div>

              <div 
                onClick={handleSimulateError}
                className="group p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-rose-500/50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-200 group-hover:text-rose-400 transition-colors">
                    3. Simulasi Timeout & Error Shake
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Animasi loading berubah menjadi pop-up error alert merah dengan getaran (shake).
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs bg-rose-500/10 text-rose-400 font-semibold rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-all">
                  Coba
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Custom Pop-up Generator */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>Kustomisasi Teks Pop-up</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Ubah parameter teks pop-up untuk mencoba varian sesuai kebutuhan halaman Anda:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Judul Pop-up (Title)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Contoh: Menyimpan Faktur..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pesan Subtitle
                </label>
                <input
                  type="text"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Contoh: Mengunggah berkas ke cloud..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipe Animasi Ikon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['finance', 'steps', 'glow'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomType(t)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        customType === t
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTriggerCustom}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
              >
                <Play className="w-4 h-4" />
                <span>Jalankan Pop-up Kustom</span>
              </button>
            </div>
          </div>

        </div>

        {/* Documentation / Code Integration Section */}
        <div className="mt-8 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Cara Pakai di Kode Anda</h3>
            </div>
            <button
              onClick={() => copyCode(codeSnippet)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">
                1. Di Komponen React manapun:
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`import { useLoading } from './context/LoadingContext';

function FormPembayaran() {
  const { showTimedLoading } = useLoading();

  const bayar = () => {
    showTimedLoading({
      title: "Memproses Pembayaran...",
      subtitle: "Sedang menghubungkan ke bank...",
      duration: 3000,
      successTitle: "Pembayaran Berhasil!"
    });
  };

  return <button onClick={bayar}>Bayar Sekarang</button>;
}`}
              </pre>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">
                2. Di Blade / Skrip Vanilla JavaScript:
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
{`// Bisa dipanggil langsung dari Blade/Form JS:
window.showTimedLoading({
  title: 'Menyimpan Faktur Keuangan...',
  subtitle: 'Mengunggah ke database Laravel...',
  duration: 2500,
  successTitle: 'Faktur Tersimpan!'
});

// Atau kontrol manual:
window.showLoadingPopup({ title: 'Loading...' });
// Ketika fetch axios selesai:
window.hideLoadingPopup();`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>Fashol Finance &copy; {new Date().getFullYear()} &bull; Ditenagai oleh Laravel + React 19 + Tailwind CSS</p>
        </footer>

      </div>
    </div>
  );
}

const codeSnippet = `import { useLoading } from './context/LoadingContext';

function MyComponent() {
  const { showTimedLoading } = useLoading();

  const trigger = () => {
    showTimedLoading({
      title: "Memproses...",
      subtitle: "Mohon tunggu...",
      duration: 2500
    });
  };

  return <button onClick={trigger}>Jalankan</button>;
}`;
