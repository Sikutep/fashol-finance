<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Worker;
use App\Models\ProductionProcess;
use App\Models\User;

class RealFactoryWorkersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Membersihkan Master Proses dan Mengimpor 58 Pekerja Riil dari UAT Excel Pekerja(1).xlsx
     */
    public function run(): void
    {
        // 1. Bersihkan dan Standarkan Master Proses Produksi
        $this->seedStandardProductionProcesses();

        // 2. Seeder Pekerja Aktual (Pabrik Konveksi & Kantor)
        $this->seedRealWorkers();
    }

    private function seedStandardProductionProcesses(): void
    {
        // Hapus proses non-produksi yang sempat terinput saat UAT (Legal, Konten, Driver, dll.)
        $nonProductionKeywords = ['LEGAL', 'KONTEN', 'ADMIN', 'PACKING', 'DRIVER', 'HOST LIVE', 'PIC KONVEKSI', 'PIC QC'];
        foreach ($nonProductionKeywords as $kw) {
            ProductionProcess::where('process_name', 'like', "%{$kw}%")->delete();
        }

        // Hapus rate anomali (> 5000) pada tarif proses konveksi (misal salah input gaji bulanan ke tarif pcs)
        \App\Models\ProductProcessRate::where('rate', '>', 5000)->get()->each(function ($r) {
            $r->delete();
        });

        // Standar 10 Proses Fisik Konveksi Riil
        $standardProcesses = [
            ['process_code' => 'PRC-POTONG', 'process_name' => 'Potong', 'description' => 'Potong pola kain sesuai pola produk', 'default_rate' => 350, 'unit' => 'pcs'],
            ['process_code' => 'PRC-JAHIT', 'process_name' => 'Jahit', 'description' => 'Penjahitan badan utama produk konveksi', 'default_rate' => 2500, 'unit' => 'pcs'],
            ['process_code' => 'PRC-OVERDEK', 'process_name' => 'Overdek', 'description' => 'Penguncian kelim bawah baju dan ujung lengan', 'default_rate' => 200, 'unit' => 'pcs'],
            ['process_code' => 'PRC-KANSAY', 'process_name' => 'Kansay', 'description' => 'Penjahitan rantai / kansai ban pinggang', 'default_rate' => 200, 'unit' => 'pcs'],
            ['process_code' => 'PRC-QC', 'process_name' => 'QC', 'description' => 'Pemeriksaan kualitas standar (Quality Control)', 'default_rate' => 300, 'unit' => 'pcs'],
            ['process_code' => 'PRC-QCBORONGAN', 'process_name' => 'QC Borongan', 'description' => 'Pemeriksaan kualitas borongan per pcs (Kelompok Teh Tita)', 'default_rate' => 300, 'unit' => 'pcs'],
            ['process_code' => 'PRC-RAMBUAN', 'process_name' => 'Rambuan', 'description' => 'Buang sisa benang jahitan pada pakaian', 'default_rate' => 150, 'unit' => 'pcs'],
            ['process_code' => 'PRC-LIPAT', 'process_name' => 'Lipat Celana', 'description' => 'Pelipatan rapi pakaian jadi siap packing', 'default_rate' => 150, 'unit' => 'pcs'],
            ['process_code' => 'PRC-OPP', 'process_name' => 'OPP', 'description' => 'Pembungkusan plastik OPP pakaian jadi', 'default_rate' => 250, 'unit' => 'pcs'],
            ['process_code' => 'PRC-BENANG', 'process_name' => 'Benang', 'description' => 'Alokasi benang jahit per potong', 'default_rate' => 500, 'unit' => 'pcs'],
            ['process_code' => 'PRC-BORDIR', 'process_name' => 'Bordir', 'description' => 'Bordir komputer / manual khusus varian Fashol', 'default_rate' => 900, 'unit' => 'pcs'],
        ];

        foreach ($standardProcesses as $p) {
            $payrollDay = in_array($p['process_name'], ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : 'Sabtu';
            ProductionProcess::updateOrCreate(
                ['process_name' => $p['process_name']],
                [
                    'process_code' => $p['process_code'],
                    'description' => $p['description'],
                    'default_rate' => $p['default_rate'],
                    'unit' => $p['unit'],
                    'payroll_day' => $payrollDay,
                    'is_active' => true,
                ]
            );
        }
    }

    private function seedRealWorkers(): void
    {
        $workersData = [
            // Manajemen & User Sistem Utama (Karyawan Kantor yang terdaftar di Payroll)
            ['code' => 'PKR-003', 'name' => 'Dei Firmansyah', 'type' => 'Staff', 'process' => 'Admin / Operasional', 'pay' => 'Bulanan', 'salary' => 2800000, 'status' => 'Aktif', 'notes' => 'User sistem (Admin)'],
            ['code' => 'PKR-004', 'name' => 'Yuni Yuliani', 'type' => 'Staff', 'process' => 'Finance / Kasir', 'pay' => 'Bulanan', 'salary' => 3000000, 'status' => 'Aktif', 'notes' => 'User sistem (Finance)'],
            ['code' => 'PKR-005', 'name' => 'Hilmi', 'type' => 'Staff', 'process' => 'Owner / Manajemen', 'pay' => 'Bulanan', 'salary' => 4500000, 'status' => 'Aktif', 'notes' => 'User sistem (Owner)'],

            // Penjahit Borongan Jahit Dalam (12 Orang - Tarif Rp 2.300/pcs)
            ['code' => 'PKR-006', 'name' => 'MANG BEJO', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-007', 'name' => 'MANG IIN', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-008', 'name' => 'MANG ADANG', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-009', 'name' => 'MANG AEP', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-010', 'name' => 'MANG ADE', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-011', 'name' => 'MANG TONO', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-012', 'name' => 'MANG WAWAN', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-013', 'name' => 'MANG WAHYU', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-014', 'name' => 'MANG ARFAN', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-016', 'name' => 'MANG DERIS', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-017', 'name' => 'MANG OLIH', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],
            ['code' => 'PKR-018', 'name' => 'MANG ATE', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI DALAM'],

            // Kansay, Overdek, Potong (6 Orang)
            ['code' => 'PKR-019', 'name' => 'MANG JEJEN', 'type' => 'Produksi', 'process' => 'Kansay', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'KANSAY'],
            ['code' => 'PKR-020', 'name' => 'MANG ENDANG', 'type' => 'Produksi', 'process' => 'Kansay', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'KANSAY'],
            ['code' => 'PKR-022', 'name' => 'MANG RENDI', 'type' => 'Produksi', 'process' => 'Overdek', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'OVERDEK/KANSAY'],
            ['code' => 'PKR-024', 'name' => 'MANG DADAN', 'type' => 'Produksi', 'process' => 'Overdek', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'OVERDEK'],
            ['code' => 'PKR-025', 'name' => 'MANG OTONG', 'type' => 'Produksi', 'process' => 'Potong', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'POTONG'],
            ['code' => 'PKR-026', 'name' => 'MANG ABUG', 'type' => 'Produksi', 'process' => 'Potong', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'POTONG'],

            // Penjahit Borongan Jahit Luar / Makloon (8 Orang - Tarif Rp 2.700/pcs)
            ['code' => 'PKR-027', 'name' => 'MANG YUDI', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-028', 'name' => 'MANG DANI', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-029', 'name' => 'MANG AGUN', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-030', 'name' => 'MANG HENDAR', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-031', 'name' => 'MANG NANDAR', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-032', 'name' => 'MANG NUY', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-033', 'name' => 'MANG TONI', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],
            ['code' => 'PKR-034', 'name' => 'MANG AAN', 'type' => 'Produksi', 'process' => 'Jahit', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'JAHIT DI LUAR'],

            // Staf & Karyawan Operasional Bulanan Pabrik & Kantor (10 Orang)
            ['code' => 'PKR-035', 'name' => 'FAISAL AKBAR S.H.', 'type' => 'Staff', 'process' => 'Legal', 'pay' => 'Bulanan', 'salary' => 2000000, 'status' => 'Aktif', 'notes' => 'LEGAL CV FASHOL'],
            ['code' => 'PKR-036', 'name' => 'AZKA FATIHATUL FAUZY', 'type' => 'Staff', 'process' => 'Konten Spesialis', 'pay' => 'Bulanan', 'salary' => 1800000, 'status' => 'Aktif', 'notes' => 'KONTEN SPESIALIS'],
            ['code' => 'PKR-037', 'name' => 'ZAKY RAMADHAN', 'type' => 'Staff', 'process' => 'Packing', 'pay' => 'Bulanan', 'salary' => 1300000, 'status' => 'Aktif', 'notes' => 'PACKING'],
            ['code' => 'PKR-038', 'name' => 'RAIHAN PERMANA', 'type' => 'Staff', 'process' => 'Packing', 'pay' => 'Bulanan', 'salary' => 1300000, 'status' => 'Aktif', 'notes' => 'PACKING'],
            ['code' => 'PKR-039', 'name' => 'FARIS HISAM ABDURROJAK', 'type' => 'Staff', 'process' => 'Driver / Gudang', 'pay' => 'Bulanan', 'salary' => 1800000, 'status' => 'Aktif', 'notes' => 'DRIVER'],
            ['code' => 'PKR-040', 'name' => 'NENI NURAENI', 'type' => 'Staff', 'process' => 'PIC QC', 'pay' => 'Bulanan', 'salary' => 2000000, 'status' => 'Aktif', 'notes' => 'PIC QC'],
            ['code' => 'PKR-041', 'name' => 'CUCU SUDRAJAT', 'type' => 'Staff', 'process' => 'PIC Konveksi', 'pay' => 'Bulanan', 'salary' => 4000000, 'status' => 'Aktif', 'notes' => 'PIC KONVEKSI'],
            ['code' => 'PKR-042', 'name' => 'ASEP M ABDILLAH', 'type' => 'Staff', 'process' => 'Staf Konveksi', 'pay' => 'Bulanan', 'salary' => 1200000, 'status' => 'Aktif', 'notes' => 'KONVEKSI'],
            ['code' => 'PKR-043', 'name' => 'TAOPIK NURDIANSAH', 'type' => 'Staff', 'process' => 'Staf Konveksi', 'pay' => 'Bulanan', 'salary' => 1200000, 'status' => 'Aktif', 'notes' => 'KONVEKSI'],
            ['code' => 'PKR-045', 'name' => 'YUSYA ROMDHONI', 'type' => 'Staff', 'process' => 'Packing', 'pay' => 'Bulanan', 'salary' => 1300000, 'status' => 'Aktif', 'notes' => 'PACKING'],

            // Kelompok Pekerja Borongan QC (Teh Tita + 15 Anggota)
            ['code' => 'PKR-044', 'name' => 'TEH TITA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA (Koordinator)'],
            ['code' => 'PKR-046', 'name' => 'TEH ANIS', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-047', 'name' => 'TEH CUCUN', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-048', 'name' => 'TEH JUJU', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-049', 'name' => 'TEH ETI', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-050', 'name' => 'TEH EVI', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-051', 'name' => 'TEH YANTI', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-052', 'name' => 'TEH DIVA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-053', 'name' => 'TEH ROSITA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-054', 'name' => 'TEH WINDA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-055', 'name' => 'TEH TINEU', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-056', 'name' => 'TEH ASTRI', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-057', 'name' => 'TEH ANIS 2', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-058', 'name' => 'TEH TITIN', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-059', 'name' => 'TEH MAYA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-060', 'name' => 'TEH MALA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
            ['code' => 'PKR-061', 'name' => 'TEH RIPA', 'type' => 'Produksi', 'process' => 'QC Borongan', 'pay' => 'Borongan', 'salary' => 0, 'status' => 'Aktif', 'notes' => 'QC TEH TITA'],
        ];

        foreach ($workersData as $d) {
            $existing = Worker::withTrashed()->where('worker_code', $d['code'])->first()
                     ?? Worker::withTrashed()->where('name', $d['name'])->first();

            if ($existing) {
                // Jangan hidupkan kembali pekerja yang sudah sengaja dihapus oleh user
                if ($existing->trashed()) {
                    continue;
                }

                $workerPayrollDay = in_array($d['process'], ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : ($d['type'] === 'Produksi' ? 'Sabtu' : null);

                $existing->update([
                    'name' => $d['name'],
                    'type' => $d['type'],
                    'process' => $d['process'],
                    'payment_system' => $d['pay'],
                    'default_salary' => $d['salary'],
                    'payroll_day' => $workerPayrollDay,
                    'status' => $d['status'],
                    'notes' => $d['notes'],
                ]);
            } else {
                $workerPayrollDay = in_array($d['process'], ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : ($d['type'] === 'Produksi' ? 'Sabtu' : null);

                Worker::create([
                    'worker_code' => $d['code'],
                    'name' => $d['name'],
                    'type' => $d['type'],
                    'process' => $d['process'],
                    'payment_system' => $d['pay'],
                    'default_salary' => $d['salary'],
                    'payroll_day' => $workerPayrollDay,
                    'status' => $d['status'],
                    'notes' => $d['notes'],
                ]);
            }
        }
    }
}
