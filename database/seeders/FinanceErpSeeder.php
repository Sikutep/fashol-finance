<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Worker;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\FinanceTransaction;
use App\Models\User;
use Carbon\Carbon;

class FinanceErpSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminUser = User::where('role', 'admin')->first() ?? User::first();

        // 1. Seed Master Pekerja (jika belum ada)
        if (Worker::count() === 0) {
            $workers = [
                [
                    'worker_code' => 'PKR-001',
                    'name' => 'Siti Aminah',
                    'type' => 'Produksi',
                    'process' => 'Jahit Luar',
                    'payment_system' => 'Borongan',
                    'status' => 'Aktif',
                    'notes' => 'Spesialis jahit celana baggy luar',
                ],
                [
                    'worker_code' => 'PKR-002',
                    'name' => 'Ahmad Fauzan',
                    'type' => 'Produksi',
                    'process' => 'Potong',
                    'payment_system' => 'Harian',
                    'status' => 'Aktif',
                    'notes' => 'Operator mesin potong kain utama',
                ],
                [
                    'worker_code' => 'PKR-003',
                    'name' => 'Nur Khalifah',
                    'type' => 'Produksi',
                    'process' => 'Kansay',
                    'payment_system' => 'Borongan',
                    'status' => 'Aktif',
                    'notes' => 'Spesialis ban pinggang elastis',
                ],
                [
                    'worker_code' => 'PKR-004',
                    'name' => 'Rina Marlina',
                    'type' => 'Staff',
                    'process' => 'Finance',
                    'payment_system' => 'Bulanan',
                    'status' => 'Aktif',
                    'notes' => 'Admin keuangan dan rekap upah',
                ],
                [
                    'worker_code' => 'PKR-005',
                    'name' => 'Eko Prasetyo',
                    'type' => 'Produksi',
                    'process' => 'QC',
                    'payment_system' => 'Harian',
                    'status' => 'Nonaktif',
                    'notes' => 'Sedang cuti sementara',
                ],
                [
                    'worker_code' => 'PKR-006',
                    'name' => 'Dewi Lestari',
                    'type' => 'Produksi',
                    'process' => 'Packing',
                    'payment_system' => 'Borongan',
                    'status' => 'Aktif',
                    'notes' => 'Finishing dan lipat rapi',
                ],
            ];

            foreach ($workers as $w) {
                Worker::create($w);
            }
        }

        // 2. Seed Master Tarif HPP & Proses (jika belum ada)
        if (ProductProcessRate::count() === 0) {
            $baggyGroup = ProductGroup::where('name', 'BAGGY')->first();
            $streetGroup = ProductGroup::where('name', 'STREET PENDEK')->first();
            $fasholGroup = ProductGroup::where('name', 'FASHOL')->first();
            $scubaGroup = ProductGroup::where('name', 'SCUBA')->first();

            $rates = [
                // Baggy Pants Reguler
                ['product_name' => 'Baggy Pants Reguler', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Potong', 'rate' => 1800],
                ['product_name' => 'Baggy Pants Reguler', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Jahit Luar', 'rate' => 3200],
                ['product_name' => 'Baggy Pants Reguler', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Jahit Dalam', 'rate' => 2500],
                ['product_name' => 'Baggy Pants Reguler', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Kansay', 'rate' => 2200],
                ['product_name' => 'Baggy Pants Reguler', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'QC', 'rate' => 1500],
                ['product_name' => 'Baggy Pants Reguler', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Packing', 'rate' => 1200],

                // Baggy Pants Premium
                ['product_name' => 'Baggy Pants Premium', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Potong', 'rate' => 2000],
                ['product_name' => 'Baggy Pants Premium', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Jahit Luar', 'rate' => 3500],
                ['product_name' => 'Baggy Pants Premium', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Jahit Dalam', 'rate' => 2700],
                ['product_name' => 'Baggy Pants Premium', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Kansay', 'rate' => 2400],
                ['product_name' => 'Baggy Pants Premium', 'product_group_id' => $baggyGroup?->id, 'process_name' => 'Packing', 'rate' => 1300],

                // Scuba Pants
                ['product_name' => 'Scuba Pants', 'product_group_id' => $scubaGroup?->id, 'process_name' => 'Potong', 'rate' => 1900],
                ['product_name' => 'Scuba Pants', 'product_group_id' => $scubaGroup?->id, 'process_name' => 'Jahit Luar', 'rate' => 3300],
                ['product_name' => 'Scuba Pants', 'product_group_id' => $scubaGroup?->id, 'process_name' => 'Kansay', 'rate' => 2200],
                ['product_name' => 'Scuba Pants', 'product_group_id' => $scubaGroup?->id, 'process_name' => 'Packing', 'rate' => 1200],

                // Jogger Pants Reguler
                ['product_name' => 'Jogger Pants Reguler', 'product_group_id' => $streetGroup?->id, 'process_name' => 'Potong', 'rate' => 1600],
                ['product_name' => 'Jogger Pants Reguler', 'product_group_id' => $streetGroup?->id, 'process_name' => 'Jahit Luar', 'rate' => 3000],
                ['product_name' => 'Jogger Pants Reguler', 'product_group_id' => $streetGroup?->id, 'process_name' => 'Kansay', 'rate' => 2000],
                ['product_name' => 'Jogger Pants Reguler', 'product_group_id' => $streetGroup?->id, 'process_name' => 'Packing', 'rate' => 1200],

                // Pants
                ['product_name' => 'Pants', 'product_group_id' => $fasholGroup?->id, 'process_name' => 'Potong', 'rate' => 1800],
                ['product_name' => 'Pants', 'product_group_id' => $fasholGroup?->id, 'process_name' => 'Jahit Luar', 'rate' => 3000],
                ['product_name' => 'Pants', 'product_group_id' => $fasholGroup?->id, 'process_name' => 'Kansay', 'rate' => 2100],
                ['product_name' => 'Pants', 'product_group_id' => $fasholGroup?->id, 'process_name' => 'Packing', 'rate' => 1200],
            ];

            foreach ($rates as $r) {
                ProductProcessRate::create(array_merge($r, [
                    'unit' => 'pcs',
                    'is_active' => true,
                ]));
            }
        }

        // 3. Seed Transaksi Produksi Harian (jika belum ada)
        if (DailyProduction::count() === 0) {
            $siti = Worker::where('worker_code', 'PKR-001')->first();
            $fauzan = Worker::where('worker_code', 'PKR-002')->first();
            $khalifah = Worker::where('worker_code', 'PKR-003')->first();
            $dewi = Worker::where('worker_code', 'PKR-006')->first();

            $productions = [
                [
                    'transaction_number' => 'PRD-240601',
                    'production_date' => Carbon::now()->subDays(1)->format('Y-m-d'),
                    'worker_id' => $siti->id,
                    'process_name' => 'Jahit Luar',
                    'items' => [
                        ['product_name' => 'Baggy Pants Reguler', 'variation' => 'All Size', 'color' => 'Black', 'qty' => 48, 'rate' => 3200]
                    ]
                ],
                [
                    'transaction_number' => 'PRD-240602',
                    'production_date' => Carbon::now()->subDays(1)->format('Y-m-d'),
                    'worker_id' => $fauzan->id,
                    'process_name' => 'Potong',
                    'items' => [
                        ['product_name' => 'Baggy Pants Premium', 'variation' => 'XL', 'color' => 'Navy', 'qty' => 36, 'rate' => 1800]
                    ]
                ],
                [
                    'transaction_number' => 'PRD-240603',
                    'production_date' => Carbon::now()->subDays(2)->format('Y-m-d'),
                    'worker_id' => $khalifah->id,
                    'process_name' => 'Kansay',
                    'items' => [
                        ['product_name' => 'Scuba Pants', 'variation' => 'L', 'color' => 'Mocca', 'qty' => 54, 'rate' => 2200]
                    ]
                ],
                [
                    'transaction_number' => 'PRD-240604',
                    'production_date' => Carbon::now()->subDays(2)->format('Y-m-d'),
                    'worker_id' => $dewi->id,
                    'process_name' => 'Packing',
                    'items' => [
                        ['product_name' => 'Jogger Pants Reguler', 'variation' => 'M', 'color' => 'Olive', 'qty' => 62, 'rate' => 1200]
                    ]
                ],
                [
                    'transaction_number' => 'PRD-240605',
                    'production_date' => Carbon::now()->subDays(3)->format('Y-m-d'),
                    'worker_id' => $siti->id,
                    'process_name' => 'Jahit Luar',
                    'items' => [
                        ['product_name' => 'Pants', 'variation' => 'L', 'color' => 'Cream', 'qty' => 45, 'rate' => 3000]
                    ]
                ],
                [
                    'transaction_number' => 'PRD-240606',
                    'production_date' => Carbon::now()->subDays(3)->format('Y-m-d'),
                    'worker_id' => $fauzan->id,
                    'process_name' => 'Potong',
                    'items' => [
                        ['product_name' => 'Baggy Pants Reguler', 'variation' => 'M', 'color' => 'Hitam', 'qty' => 58, 'rate' => 1800]
                    ]
                ],
                [
                    'transaction_number' => 'PRD-240607',
                    'production_date' => Carbon::now()->subDays(4)->format('Y-m-d'),
                    'worker_id' => $khalifah->id,
                    'process_name' => 'Kansay',
                    'items' => [
                        ['product_name' => 'Baggy Pants Premium', 'variation' => 'All Size', 'color' => 'Grey', 'qty' => 50, 'rate' => 2400]
                    ]
                ],
            ];

            foreach ($productions as $p) {
                $totalQty = 0;
                $totalWage = 0;

                foreach ($p['items'] as $it) {
                    $totalQty += $it['qty'];
                    $totalWage += ($it['qty'] * $it['rate']);
                }

                $prod = DailyProduction::create([
                    'transaction_number' => $p['transaction_number'],
                    'production_date' => $p['production_date'],
                    'worker_id' => $p['worker_id'],
                    'process_name' => $p['process_name'],
                    'total_qty' => $totalQty,
                    'total_wage' => $totalWage,
                    'notes' => 'Catatan produksi harian otomatis',
                    'status' => 'Tercatat',
                    'created_by' => $adminUser?->id,
                ]);

                foreach ($p['items'] as $it) {
                    DailyProductionItem::create([
                        'daily_production_id' => $prod->id,
                        'product_name' => $it['product_name'],
                        'variation' => $it['variation'],
                        'color' => $it['color'],
                        'qty' => $it['qty'],
                        'rate' => $it['rate'],
                        'total_wage' => $it['qty'] * $it['rate'],
                    ]);
                }
            }
        }

        // 4. Seed Transaksi Keuangan / Arus Kas (jika belum ada)
        if (FinanceTransaction::count() === 0) {
            $now = Carbon::now();
            $finances = [
                // Bulan berjalan
                ['transaction_number' => 'TRX-250618-01', 'type' => 'income', 'category' => 'Setoran Penjualan Marketplace', 'title' => 'Setoran penjualan Shopee & TikTok', 'amount' => 34500000, 'date' => $now->copy()->subDays(2)->format('Y-m-d'), 'reference' => 'SETORAN-MKT-01'],
                ['transaction_number' => 'TRX-250618-02', 'type' => 'expense', 'category' => 'Bahan Baku & Aksesori', 'title' => 'Pembelian benang dan aksesori konveksi', 'amount' => 3850000, 'date' => $now->copy()->subDays(2)->format('Y-m-d'), 'reference' => 'BELI-BENANG-09'],
                ['transaction_number' => 'TRX-250618-03', 'type' => 'income', 'category' => 'Penjualan Offline / Grosir', 'title' => 'Pembayaran partai grosir kemeja & baggy', 'amount' => 8900000, 'date' => $now->copy()->subDays(5)->format('Y-m-d'), 'reference' => 'GROSIR-22'],
                ['transaction_number' => 'TRX-250618-04', 'type' => 'expense', 'category' => 'Operasional & Utilitas', 'title' => 'Listrik workshop & internet kantor', 'amount' => 4400000, 'date' => $now->copy()->subDays(6)->format('Y-m-d'), 'reference' => 'LISTRIK-BLN'],
                
                // Bulan-bulan sebelumnya untuk Arus Keuangan chart (6 bulan)
                ['transaction_number' => 'TRX-HIST-01', 'type' => 'income', 'category' => 'Penjualan', 'title' => 'Rekap penjualan Jan', 'amount' => 28000000, 'date' => $now->copy()->subMonths(5)->format('Y-m-d'), 'reference' => 'REKAP-01'],
                ['transaction_number' => 'TRX-HIST-02', 'type' => 'expense', 'category' => 'Operasional', 'title' => 'Pengeluaran Jan', 'amount' => 21000000, 'date' => $now->copy()->subMonths(5)->format('Y-m-d'), 'reference' => 'REKAP-02'],
                ['transaction_number' => 'TRX-HIST-03', 'type' => 'income', 'category' => 'Penjualan', 'title' => 'Rekap penjualan Feb', 'amount' => 32000000, 'date' => $now->copy()->subMonths(4)->format('Y-m-d'), 'reference' => 'REKAP-03'],
                ['transaction_number' => 'TRX-HIST-04', 'type' => 'expense', 'category' => 'Operasional', 'title' => 'Pengeluaran Feb', 'amount' => 23000000, 'date' => $now->copy()->subMonths(4)->format('Y-m-d'), 'reference' => 'REKAP-04'],
                ['transaction_number' => 'TRX-HIST-05', 'type' => 'income', 'category' => 'Penjualan', 'title' => 'Rekap penjualan Mar', 'amount' => 29500000, 'date' => $now->copy()->subMonths(3)->format('Y-m-d'), 'reference' => 'REKAP-05'],
                ['transaction_number' => 'TRX-HIST-06', 'type' => 'expense', 'category' => 'Operasional', 'title' => 'Pengeluaran Mar', 'amount' => 26000000, 'date' => $now->copy()->subMonths(3)->format('Y-m-d'), 'reference' => 'REKAP-06'],
                ['transaction_number' => 'TRX-HIST-07', 'type' => 'income', 'category' => 'Penjualan', 'title' => 'Rekap penjualan Apr', 'amount' => 38000000, 'date' => $now->copy()->subMonths(2)->format('Y-m-d'), 'reference' => 'REKAP-07'],
                ['transaction_number' => 'TRX-HIST-08', 'type' => 'expense', 'category' => 'Operasional', 'title' => 'Pengeluaran Apr', 'amount' => 24500000, 'date' => $now->copy()->subMonths(2)->format('Y-m-d'), 'reference' => 'REKAP-08'],
                ['transaction_number' => 'TRX-HIST-09', 'type' => 'income', 'category' => 'Penjualan', 'title' => 'Rekap penjualan Mei', 'amount' => 41500000, 'date' => $now->copy()->subMonths(1)->format('Y-m-d'), 'reference' => 'REKAP-09'],
                ['transaction_number' => 'TRX-HIST-10', 'type' => 'expense', 'category' => 'Operasional', 'title' => 'Pengeluaran Mei', 'amount' => 28000000, 'date' => $now->copy()->subMonths(1)->format('Y-m-d'), 'reference' => 'REKAP-10'],
            ];

            foreach ($finances as $f) {
                FinanceTransaction::create([
                    'transaction_number' => $f['transaction_number'],
                    'type' => $f['type'],
                    'category' => $f['category'],
                    'title' => $f['title'],
                    'amount' => $f['amount'],
                    'transaction_date' => $f['date'],
                    'reference' => $f['reference'],
                    'created_by' => $adminUser?->id,
                ]);
            }
        }
    }
}
