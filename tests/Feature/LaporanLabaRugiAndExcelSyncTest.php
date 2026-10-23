<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\ProductHppComponent;
use App\Models\FinanceTransaction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class LaporanLabaRugiAndExcelSyncTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $ownerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
        $this->ownerUser = User::where('role', 'owner')->first() ?? User::factory()->create(['role' => 'owner']);

        foreach (ProductProcessRate::distinct()->pluck('product_name') as $pName) {
            ProductProcessRate::syncHppLaborCost($pName);
        }
    }

    /**
     * Test 1: Verifikasi seluruh tarif proses riil dari HPP TERBARU.xlsx
     * dan memastikan HANYA mencakup 5 produk eksisting.
     */
    public function test_process_rates_match_excel_and_only_apply_to_existing_products(): void
    {
        $existingProductNames = ['BAGGY', 'STREET PENDEK', 'FASHOL', 'SCUBA', 'SHORTPANTS'];

        // Pastikan tidak ada produk di luar 5 produk eksisting
        $allRates = ProductProcessRate::all();
        $this->assertNotEmpty($allRates);

        foreach ($allRates as $rate) {
            $this->assertContains(
                $rate->product_name,
                $existingProductNames,
                "Tarif proses terdeteksi untuk produk di luar 5 grup eksisting: {$rate->product_name}"
            );
        }

        // Cek tarif potong = Rp 350 untuk semua produk
        foreach ($existingProductNames as $product) {
            $potongRate = ProductProcessRate::where('product_name', $product)
                ->where('process_name', 'Potong')
                ->first();
            $this->assertNotNull($potongRate, "Tarif potong untuk {$product} harus ada");
            $this->assertEquals(350, (int)$potongRate->rate, "Tarif potong {$product} harus Rp 350");
        }

        // Cek tarif jahit: SCUBA = 2800, produk lain = 2500
        $scubaJahit = ProductProcessRate::where('product_name', 'SCUBA')->where('process_name', 'Jahit')->first();
        $this->assertNotNull($scubaJahit);
        $this->assertEquals(2800, (int)$scubaJahit->rate);

        $baggyJahit = ProductProcessRate::where('product_name', 'BAGGY')->where('process_name', 'Jahit')->first();
        $this->assertNotNull($baggyJahit);
        $this->assertEquals(2500, (int)$baggyJahit->rate);

        // Cek tarif bordir khusus FASHOL = 900
        $fasholBordir = ProductProcessRate::where('product_name', 'FASHOL')->where('process_name', 'Bordir')->first();
        $this->assertNotNull($fasholBordir);
        $this->assertEquals(900, (int)$fasholBordir->rate);
    }

    /**
     * Test 2: Verifikasi komponen HPP Tenaga Kerja (labor_cost) dihitung dinamis
     * sebagai akumulasi SUM tarif proses yang aktif.
     */
    public function test_hpp_labor_cost_is_dynamically_summed_from_process_rates(): void
    {
        $hppComponents = ProductHppComponent::all();
        $this->assertNotEmpty($hppComponents);

        foreach ($hppComponents as $hpp) {
            $expectedLaborCost = (float) ProductProcessRate::where('product_name', $hpp->product_name)
                ->where('is_active', true)
                ->sum('rate');

            $this->assertEquals(
                $expectedLaborCost,
                (float) $hpp->labor_cost,
                "labor_cost pada {$hpp->product_name} harus sama persis dengan total tarif proses aktif ({$expectedLaborCost})"
            );

            // Total HPP harus sama dengan material + labor + overhead
            $expectedTotal = (float)$hpp->material_cost + (float)$hpp->labor_cost + (float)$hpp->overhead_cost;
            $this->assertEquals($expectedTotal, (float)$hpp->total_hpp, "total_hpp pada {$hpp->product_name} harus valid");
        }
    }

    /**
     * Test 3: Verifikasi API tarif referensi Produksi Harian (/api/references/rate)
     * mengembalikan nilai tarif riil dari database.
     */
    public function test_reference_rate_api_returns_correct_excel_rates(): void
    {
        // 1. BAGGY - Potong -> 350
        $res = $this->actingAs($this->adminUser)->getJson('/api/references/rate?product=BAGGY&process=Potong');
        $res->assertStatus(200)->assertJson(['status' => 'success', 'rate' => 350]);

        // 2. SCUBA - Jahit -> 2800
        $res = $this->actingAs($this->adminUser)->getJson('/api/references/rate?product=SCUBA&process=Jahit');
        $res->assertStatus(200)->assertJson(['status' => 'success', 'rate' => 2800]);

        // 3. FASHOL - Bordir -> 900
        $res = $this->actingAs($this->adminUser)->getJson('/api/references/rate?product=FASHOL&process=Bordir');
        $res->assertStatus(200)->assertJson(['status' => 'success', 'rate' => 900]);

        // 4. BAGGY - QC -> 300
        $res = $this->actingAs($this->adminUser)->getJson('/api/references/rate?product=BAGGY&process=QC');
        $res->assertStatus(200)->assertJson(['status' => 'success', 'rate' => 300]);
    }

    /**
     * Test 4: Verifikasi API Kategori Keuangan (/api/finance-categories)
     * memuat 27 akun beban operasional resmi dari LAPORAN LABA RUGI.xlsx.
     */
    public function test_finance_categories_api_contains_27_official_accounts(): void
    {
        $res = $this->actingAs($this->adminUser)->getJson('/api/finance-categories');
        $res->assertStatus(200)->assertJson(['status' => 'success']);

        $operating = $res->json('data.operating_expenses');
        $this->assertIsArray($operating);
        $this->assertCount(27, $operating, "Harus memuat tepat 27 akun beban operasional resmi Excel");

        // Periksa akun-akun penting
        $this->assertContains('Beban Promosi / Iklan', $operating);
        $this->assertContains('Beban Gaji Karyawan', $operating);
        $this->assertContains('Beban Listrik', $operating);
        $this->assertContains('Beban Konsumsi Produksi', $operating);
        $this->assertContains('Beban Penyusutan Mesin', $operating);
        $this->assertContains('Beban ATK Konveksi', $operating);
        $this->assertContains('Beban Sewa', $operating);
    }

    /**
     * Test 5: Verifikasi API Laporan Laba Rugi (/api/laporan-laba-rugi)
     * menghitung angka Agustus 2026 secara akurat sesuai LAPORAN LABA RUGI.xlsx.
     */
    public function test_income_statement_api_august_2026_matches_excel(): void
    {
        $res = $this->actingAs($this->adminUser)->getJson('/api/laporan-laba-rugi?month=2026-08');
        $res->assertStatus(200)->assertJson(['status' => 'success']);

        $summary = $res->json('summary');

        // Penjualan Kotor (Gross)
        $this->assertEquals(2836715000, (int)$summary['gross_sales']);

        // Potongan Penjualan Marketplace
        $this->assertEquals(1676753948, (int)$summary['sales_discounts']);

        // Pendapatan Bersih (Net Revenue)
        $expectedNetRev = 2836715000 - 1676753948; // 1159961052
        $this->assertEquals($expectedNetRev, (int)$summary['net_sales']);

        // HPP Penjualan (COGS)
        $this->assertEquals(921869790, (int)$summary['cogs']);

        // Laba Kotor (Gross Profit)
        $expectedGrossProfit = $expectedNetRev - 921869790; // 238091262
        $this->assertEquals($expectedGrossProfit, (int)$summary['gross_profit']);

        // Biaya Operasional Total
        $this->assertEquals(358399841, (int)$summary['total_operating_expenses']);

        // Laba Operasional
        $expectedOperatingProfit = $expectedGrossProfit - 358399841; // -120308579
        $this->assertEquals($expectedOperatingProfit, (int)$summary['operating_profit']);

        // Beban Luar Usaha
        $this->assertEquals(30000, (int)$summary['total_non_operating_expenses']);

        // Laba Bersih (Net Profit)
        $expectedNetProfit = $expectedOperatingProfit - 30000; // -120338579
        $this->assertEquals($expectedNetProfit, (int)$summary['net_profit']);
    }

    /**
     * Test 6: Verifikasi ANTI-HARDCODE:
     * Menambahkan transaksi baru secara dinamis harus langsung merubah
     * kalkulasi Laporan Laba Rugi secara presisi.
     */
    public function test_anti_hardcode_dynamic_calculation_on_new_transaction(): void
    {
        // 1. Ambil data awal Agustus 2026
        $res1 = $this->actingAs($this->adminUser)->getJson('/api/laporan-laba-rugi?month=2026-08');
        $initialOpex = (float)$res1->json('summary.total_operating_expenses');
        $initialNetProfit = (float)$res1->json('summary.net_profit');

        // 2. Tambah transaksi biaya operasional baru Rp 10.000.000
        $addedExpense = 10000000;
        FinanceTransaction::create([
            'transaction_number' => 'TRX-TEST-DYNAMIC-' . time(),
            'transaction_date' => '2026-08-20',
            'type' => 'expense',
            'category' => 'Beban Promosi / Iklan (Ads)',
            'title' => 'Pengujian Dinamis Anti Hardcode',
            'amount' => $addedExpense,
            'notes' => 'Testing query dynamically aggregates without hardcoding',
            'created_by' => $this->adminUser->id,
        ]);

        // 3. Ambil ulang data Laporan Laba Rugi
        $res2 = $this->actingAs($this->adminUser)->getJson('/api/laporan-laba-rugi?month=2026-08');
        $newOpex = (float)$res2->json('summary.total_operating_expenses');
        $newNetProfit = (float)$res2->json('summary.net_profit');

        // Pastikan Opex bertambah tepat 10 juta dan Laba Bersih berkurang tepat 10 juta
        $this->assertEquals($initialOpex + $addedExpense, $newOpex, 'Biaya operasional harus bertambah secara dinamis');
        $this->assertEquals($initialNetProfit - $addedExpense, $newNetProfit, 'Laba bersih harus berkurang secara dinamis');
    }

    /**
     * Test 7: Otorisasi & Hak Akses
     * Tamu/Guest dilarang mengakses API Laporan Laba Rugi.
     */
    public function test_guest_is_forbidden_from_viewing_income_statement(): void
    {
        $res = $this->getJson('/api/laporan-laba-rugi');
        $this->assertContains($res->getStatusCode(), [401, 302], 'Guest harus ditolak mengakses laporan');
    }
}
