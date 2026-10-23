<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\ProductHppComponent;
use App\Models\FinanceTransaction;
use App\Models\User;
use Carbon\Carbon;

class FinanceErpSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Mengisi Master Proses, Master HPP, dan Akun Laporan Laba Rugi
     * berdasarkan dokumen resmi HPP TERBARU.xlsx dan LAPORAN LABA RUGI.xlsx.
     */
    public function run(): void
    {
        $adminUser = User::where('role', 'admin')->first() ?? User::first();

        // 1. Pastikan 5 Product Group standar ada jika database kosong
        $defaultGroups = [
            'BAGGY' => 'Celana Baggy Loose Sweatpants Jogger Highwaist Korean Style Training Pria Dan Wanita Sport',
            'STREET PENDEK' => 'Celana Baggy Loose Sweatpants Jogger Highwaist Korean Style Training Pria Dan Wanita Sport',
            'FASHOL' => 'FASHOL Celana Sweat Pants Loose Premium Fleece Polyester dengan Grafis Embroidery dan 3 Pocket untuk Pria dan Wanita',
            'SCUBA' => 'FS - Loui Loose Pants Scuba - HW Celana Anti Kusut - Celana Kulot Wanita - Kulot Scuba Premium - Celana Kantor Formal Panjang Fit Kaki',
            'SHORTPANTS' => 'Shortpants Celana Pendek Pria Wanita',
        ];

        foreach ($defaultGroups as $name => $longName) {
            ProductGroup::firstOrCreate(
                ['name' => $name],
                ['long_name' => $longName]
            );
        }

        $groups = ProductGroup::whereIn('name', array_keys($defaultGroups))->get()->keyBy('name');

        // 2. Seed Master Tarif Proses Riil (Sesuai HPP TERBARU.xlsx)
        // Dilarang hardcode di controller; data disimpan di tabel master product_process_rates
        $standardRates = [
            'BAGGY' => [
                ['process' => 'Potong', 'rate' => 350],
                ['process' => 'Jahit', 'rate' => 2500],
                ['process' => 'Overdek', 'rate' => 200],
                ['process' => 'Kansay', 'rate' => 200],
                ['process' => 'QC', 'rate' => 300],
                ['process' => 'OPP', 'rate' => 250],
                ['process' => 'Benang', 'rate' => 500],
            ],
            'STREET PENDEK' => [
                ['process' => 'Potong', 'rate' => 350],
                ['process' => 'Jahit', 'rate' => 2500],
                ['process' => 'Overdek', 'rate' => 200],
                ['process' => 'Kansay', 'rate' => 200],
                ['process' => 'QC', 'rate' => 300],
                ['process' => 'OPP', 'rate' => 250],
                ['process' => 'Benang', 'rate' => 500],
            ],
            'FASHOL' => [
                ['process' => 'Potong', 'rate' => 350],
                ['process' => 'Jahit', 'rate' => 2500],
                ['process' => 'Overdek', 'rate' => 200],
                ['process' => 'Kansay', 'rate' => 200],
                ['process' => 'QC', 'rate' => 300],
                ['process' => 'OPP', 'rate' => 250],
                ['process' => 'Benang', 'rate' => 500],
                ['process' => 'Bordir', 'rate' => 900], // Khusus FASHOL
            ],
            'SCUBA' => [
                ['process' => 'Potong', 'rate' => 350],
                ['process' => 'Jahit', 'rate' => 2800], // Jahit SCUBA Rp 2.800
                ['process' => 'Overdek', 'rate' => 200],
                ['process' => 'Kansay', 'rate' => 200],
                ['process' => 'QC', 'rate' => 300],
                ['process' => 'OPP', 'rate' => 250],
                ['process' => 'Benang', 'rate' => 500],
            ],
            'SHORTPANTS' => [
                ['process' => 'Potong', 'rate' => 350],
                ['process' => 'Jahit', 'rate' => 2500],
                ['process' => 'Overdek', 'rate' => 200],
                ['process' => 'Kansay', 'rate' => 200],
                ['process' => 'QC', 'rate' => 300],
                ['process' => 'OPP', 'rate' => 250],
                ['process' => 'Benang', 'rate' => 500],
            ],
        ];

        foreach ($standardRates as $groupName => $rates) {
            $group = $groups->get($groupName);

            // Bersihkan tarif proses lama untuk produk ini agar murni sesuai HPP TERBARU.xlsx
            ProductProcessRate::where('product_name', $groupName)->delete();

            foreach ($rates as $r) {
                ProductProcessRate::create([
                    'product_name' => $groupName,
                    'product_group_id' => $group?->id,
                    'process_name' => $r['process'],
                    'rate' => $r['rate'],
                    'unit' => 'pcs',
                    'is_active' => true,
                ]);
            }
        }

        // 3. Seed Master Standar HPP Produk (Sesuai HPP TERBARU.xlsx)
        // Nilai material merupakan rata-rata biaya kain + aksesori (karet, tali, label)
        $standardHppMaterials = [
            'BAGGY' => ['code' => 'BGY', 'clean' => 'BAGGY', 'mat' => 25794],
            'STREET PENDEK' => ['code' => 'STP', 'clean' => 'STREET', 'mat' => 24077],
            'FASHOL' => ['code' => 'FSH', 'clean' => 'FASHOL', 'mat' => 37033],
            'SCUBA' => ['code' => 'SCB', 'clean' => 'SCUBA', 'mat' => 18867],
            'SHORTPANTS' => ['code' => 'SHP', 'clean' => 'SHORTPANTS', 'mat' => 24077],
        ];

        foreach ($standardHppMaterials as $groupName => $data) {
            $labor = (float) ProductProcessRate::where('product_name', $groupName)
                ->where('is_active', true)
                ->sum('rate');

            $mat = (float) $data['mat'];
            $totalHpp = $mat + $labor;

            ProductHppComponent::updateOrCreate(
                ['product_name' => $groupName],
                [
                    'product_code' => 'PRD-' . $data['clean'],
                    'code' => $data['code'],
                    'material_cost' => $mat,
                    'labor_cost' => $labor,
                    'overhead_cost' => 0,
                    'total_hpp' => $totalHpp,
                    'effective_date' => Carbon::now(),
                    'status' => 'Aktif',
                ]
            );
        }

        // 4. Seed Data Riil Transaksi Keuangan (Agustus, September & Oktober 2026)
        FinanceTransaction::whereBetween('transaction_date', ['2026-08-01', '2026-10-31'])->delete();
        $this->seedLabaRugiTransactions($adminUser?->id);
    }

    /**
     * Memasukkan data transaksi riil pembukuan Agustus, September & Oktober 2026
     * dari file LAPORAN LABA RUGI.xlsx untuk verifikasi integritas data.
     */
    private function seedLabaRugiTransactions(?int $userId): void
    {
        $months = [
            '2026-08' => [
                'income' => [
                    ['category' => 'Penjualan Produk', 'title' => 'Penjualan Produk Gross Agustus 2026', 'amount' => 2836715000.0, 'date' => '2026-08-31'],
                ],
                'deductions' => [
                    ['category' => 'Potongan Penjualan', 'title' => 'Potongan Penjualan / Biaya Marketplace Agustus 2026', 'amount' => 1676753948.0, 'date' => '2026-08-31'],
                ],
                'cogs' => [
                    ['category' => 'Harga Pokok Penjualan', 'title' => 'HPP Produk Terjual (31.235 pcs x Rp 29.514) Agustus 2026', 'amount' => 921869790.0, 'date' => '2026-08-31'],
                ],
                'expenses' => [
                    ['category' => 'Beban Promosi / Iklan', 'amount' => 119153903.0],
                    ['category' => 'Beban Gaji Karyawan', 'amount' => 108644200.0],
                    ['category' => 'Beban Listrik', 'amount' => 1563000.0],
                    ['category' => 'Beban Air', 'amount' => 160000.0],
                    ['category' => 'Beban Internet', 'amount' => 277500.0],
                    ['category' => 'Beban Sewa', 'amount' => 2208333.0],
                    ['category' => 'Beban Penyusutan Mesin', 'amount' => 937500.0],
                    ['category' => 'Beban Penyusutan Kendaraan', 'amount' => 1828645.0],
                    ['category' => 'Beban Penyusutan Peralatan Kantor', 'amount' => 562500.0],
                    ['category' => 'Beban Penyusutan Peralatan Konveksi', 'amount' => 837500.0],
                    ['category' => 'Beban Perlengkapan', 'amount' => 3180260.0],
                    ['category' => 'Beban Gaji', 'amount' => 108644200.0],
                    ['category' => 'Beban Konsumsi Produksi', 'amount' => 4300000.0],
                    ['category' => 'Beban Transportasi', 'amount' => 2422300.0],
                    ['category' => 'Beban Kendaraan', 'amount' => 1800000.0],
                    ['category' => 'Beban Service', 'amount' => 1800000.0],
                    ['category' => 'Beban Kebersihan', 'amount' => 80000.0],
                    ['category' => 'Beban Bank', 'amount' => 30000.0],
                ],
            ],
            '2026-09' => [
                'income' => [
                    ['category' => 'Penjualan Produk', 'title' => 'Penjualan Produk Gross September 2026', 'amount' => 3060530000.0, 'date' => '2026-09-30'],
                ],
                'deductions' => [
                    ['category' => 'Potongan Penjualan', 'title' => 'Potongan Penjualan / Biaya Marketplace September 2026', 'amount' => 1832918892.0, 'date' => '2026-09-30'],
                ],
                'cogs' => [
                    ['category' => 'Harga Pokok Penjualan', 'title' => 'HPP Produk Terjual September 2026', 'amount' => 732938550.0, 'date' => '2026-09-30'],
                ],
                'expenses' => [
                    ['category' => 'Beban Promosi / Iklan', 'amount' => 225892509.0],
                    ['category' => 'Beban Gaji Karyawan', 'amount' => 141808111.0],
                    ['category' => 'Beban Listrik', 'amount' => 1854500.0],
                    ['category' => 'Beban Air', 'amount' => 160000.0],
                    ['category' => 'Beban Internet', 'amount' => 990000.0],
                    ['category' => 'Beban Sewa', 'amount' => 2208333.0],
                    ['category' => 'Beban Penyusutan Mesin', 'amount' => 937500.0],
                    ['category' => 'Beban Penyusutan Kendaraan', 'amount' => 1828645.0],
                    ['category' => 'Beban Penyusutan Peralatan Kantor', 'amount' => 562500.0],
                    ['category' => 'Beban Penyusutan Peralatan Konveksi', 'amount' => 837500.0],
                    ['category' => 'Beban Perlengkapan', 'amount' => 2180260.0],
                    ['category' => 'Beban Konsumsi Produksi', 'amount' => 6956400.0],
                    ['category' => 'Beban Transportasi', 'amount' => 2422300.0],
                    ['category' => 'Beban Kendaraan', 'amount' => 1500000.0],
                    ['category' => 'Beban Service', 'amount' => 1900000.0],
                    ['category' => 'Beban Kebersihan', 'amount' => 142500.0],
                    ['category' => 'Beban Bank', 'amount' => 30000.0],
                ],
            ],
            '2026-10' => [
                'income' => [
                    ['category' => 'Penjualan Produk', 'title' => 'Penjualan Produk Gross Marketplace Oktober 2026', 'amount' => 3150000000.0, 'date' => '2026-10-21'],
                ],
                'deductions' => [
                    ['category' => 'Potongan Penjualan', 'title' => 'Potongan Penjualan / Biaya Marketplace Shopee & TikTok Oktober 2026', 'amount' => 1850000000.0, 'date' => '2026-10-21'],
                ],
                'cogs' => [
                    ['category' => 'Harga Pokok Penjualan', 'title' => 'HPP Produk Terjual Oktober 2026', 'amount' => 750000000.0, 'date' => '2026-10-21'],
                ],
                'expenses' => [
                    ['category' => 'Bahan Baku Kain', 'amount' => 85000000.0],
                    ['category' => 'Beban Promosi / Iklan', 'amount' => 210000000.0],
                    ['category' => 'Beban Listrik', 'amount' => 1950000.0],
                    ['category' => 'Beban Air', 'amount' => 175000.0],
                    ['category' => 'Beban Internet', 'amount' => 990000.0],
                    ['category' => 'Beban Sewa', 'amount' => 2208333.0],
                    ['category' => 'Beban Penyusutan Mesin', 'amount' => 937500.0],
                    ['category' => 'Beban Penyusutan Kendaraan', 'amount' => 1828645.0],
                    ['category' => 'Beban Penyusutan Peralatan Kantor', 'amount' => 562500.0],
                    ['category' => 'Beban Penyusutan Peralatan Konveksi', 'amount' => 837500.0],
                    ['category' => 'Beban Perlengkapan', 'amount' => 2450000.0],
                    ['category' => 'Beban Konsumsi Produksi', 'amount' => 6500000.0],
                    ['category' => 'Beban Transportasi', 'amount' => 2300000.0],
                    ['category' => 'Beban Kendaraan', 'amount' => 1600000.0],
                    ['category' => 'Beban Service', 'amount' => 1750000.0],
                    ['category' => 'Beban Kebersihan', 'amount' => 150000.0],
                    ['category' => 'Beban Bank', 'amount' => 35000.0],
                ],
            ]
        ];

        $trxIdx = 1;
        foreach ($months as $mKey => $m) {
            $dateEnd = $mKey . '-28';

            // 1. Incomes
            foreach ($m['income'] as $inc) {
                FinanceTransaction::create([
                    'transaction_number' => 'TRX-' . str_replace('-', '', $mKey) . '-INC-' . str_pad($trxIdx++, 2, '0', STR_PAD_LEFT),
                    'type' => 'income',
                    'category' => $inc['category'],
                    'title' => $inc['title'],
                    'amount' => $inc['amount'],
                    'transaction_date' => $inc['date'],
                    'reference' => 'SALES-' . $mKey,
                    'created_by' => $userId,
                ]);
            }

            // 2. Sales Deductions (Recorded as expense category Potongan Penjualan)
            foreach ($m['deductions'] as $ded) {
                FinanceTransaction::create([
                    'transaction_number' => 'TRX-' . str_replace('-', '', $mKey) . '-DED-' . str_pad($trxIdx++, 2, '0', STR_PAD_LEFT),
                    'type' => 'expense',
                    'category' => $ded['category'],
                    'title' => $ded['title'],
                    'amount' => $ded['amount'],
                    'transaction_date' => $ded['date'],
                    'reference' => 'MKT-DED-' . $mKey,
                    'created_by' => $userId,
                ]);
            }

            // 3. COGS / HPP Penjualan
            foreach ($m['cogs'] as $cg) {
                FinanceTransaction::create([
                    'transaction_number' => 'TRX-' . str_replace('-', '', $mKey) . '-HPP-' . str_pad($trxIdx++, 2, '0', STR_PAD_LEFT),
                    'type' => 'expense',
                    'category' => $cg['category'],
                    'title' => $cg['title'],
                    'amount' => $cg['amount'],
                    'transaction_date' => $cg['date'],
                    'reference' => 'COGS-' . $mKey,
                    'created_by' => $userId,
                ]);
            }

            // 4. Operating Expenses
            foreach ($m['expenses'] as $exp) {
                FinanceTransaction::create([
                    'transaction_number' => 'TRX-' . str_replace('-', '', $mKey) . '-OPX-' . str_pad($trxIdx++, 2, '0', STR_PAD_LEFT),
                    'type' => 'expense',
                    'category' => $exp['category'],
                    'title' => $exp['category'] . ' ' . $mKey,
                    'amount' => $exp['amount'],
                    'transaction_date' => $dateEnd,
                    'reference' => 'OPX-' . $mKey,
                    'created_by' => $userId,
                ]);
            }
        }
    }
}
