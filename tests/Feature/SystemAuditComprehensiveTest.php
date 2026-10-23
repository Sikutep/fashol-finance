<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\ProductHppComponent;
use App\Models\DailyProduction;
use App\Models\MonthlyPayroll;
use App\Models\FinanceTransaction;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\RateLimiter;

class SystemAuditComprehensiveTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $ownerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
        $this->ownerUser = User::where('role', 'owner')->first() ?? User::factory()->create(['role' => 'owner']);
    }

    /**
     * TEST 1: RATE LIMITING & BRUTE FORCE PROTECTION
     * Memverifikasi endpoint /api/auth/login memiliki proteksi throttle 10 request per menit.
     */
    public function test_auth_login_rate_limiting_enforced_after_10_attempts(): void
    {
        RateLimiter::clear('api/auth/login|127.0.0.1');

        // Lakukan 10 percobaan login yang gagal
        for ($i = 1; $i <= 10; $i++) {
            $response = $this->postJson('/api/auth/login', [
                'email' => 'hacker@test.com',
                'password' => 'wrong_password_' . $i,
            ]);
            $response->assertStatus(422);
        }

        // Request ke-11 harus diblokir oleh Rate Limiter dengan HTTP 429 Too Many Requests
        $response11 = $this->postJson('/api/auth/login', [
            'email' => 'hacker@test.com',
            'password' => 'wrong_password_11',
        ]);

        $response11->assertStatus(429);
    }

    /**
     * TEST 2: SECURITY & RBAC — UNPROTECTED EXPORT / REPORT AUDIT
     * Memverifikasi seluruh endpoint export dan laporan mewajibkan autentikasi.
     */
    public function test_all_export_and_report_endpoints_strictly_reject_guests(): void
    {
        $exportRoutes = [
            '/api/export/payroll-mingguan',
            '/api/export/payroll-bulanan',
            '/api/export/keuangan',
            '/api/export/rekap-biaya-produksi',
            '/api/export/laporan-laba-rugi',
            '/api/export/produksi-harian',
            '/api/dashboard',
            '/api/workers',
            '/api/daily-productions',
            '/api/master-proses',
            '/api/payroll-mingguan',
            '/api/payroll-bulanan',
            '/api/hpp-produk',
            '/api/keuangan',
            '/api/laporan-laba-rugi',
            '/api/rekap-biaya-produksi',
        ];

        foreach ($exportRoutes as $route) {
            $res = $this->getJson($route);
            $this->assertContains(
                $res->getStatusCode(),
                [401, 302],
                "Endpoint {$route} harus menolak akses unauthenticated/guest"
            );
        }
    }

    /**
     * TEST 3: DATA INTEGRITY — DYNAMIC HPP LABOR COST SYNCHRONIZATION
     * Memverifikasi ketika ProductProcessRate ditambah, diubah, atau dihapus,
     * ProductHppComponent otomatis ter-update tanpa menunggu HTTP GET /api/hpp-produk.
     */
    public function test_product_process_rate_mutations_immediately_sync_hpp_component(): void
    {
        $group = ProductGroup::first();
        $this->assertNotNull($group);
        $productName = $group->name;

        $hpp = ProductHppComponent::where('product_name', $productName)->first();
        if (!$hpp) {
            $hpp = ProductHppComponent::create([
                'product_name' => $productName,
                'product_code' => 'PRD-TEST',
                'code' => 'TEST',
                'material_cost' => 10000,
                'labor_cost' => 0,
                'overhead_cost' => 2000,
                'total_hpp' => 12000,
                'status' => 'Aktif',
            ]);
        }

        $initialLabor = (float) ProductProcessRate::where('product_name', $productName)
            ->where('is_active', true)
            ->sum('rate');

        // 1. Buat tarif baru
        $rate = ProductProcessRate::create([
            'product_name' => $productName,
            'product_group_id' => $group->id,
            'process_name' => 'Proses Audit Otomatis Test',
            'rate' => 750,
            'unit' => 'pcs',
            'is_custom_rate' => true,
            'is_active' => true,
        ]);

        $hpp->refresh();
        $this->assertEquals(
            $initialLabor + 750,
            (float) $hpp->labor_cost,
            'labor_cost HPP harus langsung bertambah 750 secara atomik saat tarif baru dibuat'
        );
        $this->assertEquals(
            (float)$hpp->material_cost + $hpp->labor_cost + (float)$hpp->overhead_cost,
            (float) $hpp->total_hpp,
            'total_hpp harus sinkron dengan material + labor + overhead'
        );

        // 2. Update tarif
        $rate->update(['rate' => 1000]);
        $hpp->refresh();
        $this->assertEquals(
            $initialLabor + 1000,
            (float) $hpp->labor_cost,
            'labor_cost HPP harus langsung berubah menjadi +1000 saat tarif di-update'
        );

        // 3. Nonaktifkan tarif (is_active = false)
        $rate->update(['is_active' => false]);
        $hpp->refresh();
        $this->assertEquals(
            $initialLabor,
            (float) $hpp->labor_cost,
            'labor_cost HPP harus kembali ke nilai awal saat tarif dinonaktifkan'
        );

        // 4. Hapus tarif
        $rate->delete();
        $hpp->refresh();
        $this->assertEquals(
            $initialLabor,
            (float) $hpp->labor_cost,
            'labor_cost HPP harus tetap konsisten saat tarif dihapus'
        );
    }

    /**
     * TEST 4: VALIDATION & ERROR HANDLING — PRODUCTION INPUT SANITIZATION
     * Memverifikasi input produksi harian dengan kuantitas 0 atau negatif ditolak keras oleh server.
     */
    public function test_daily_production_rejects_zero_negative_qty_and_inactive_workers(): void
    {
        $activeWorker = Worker::where('status', 'Aktif')->firstOrFail();
        $inactiveWorker = Worker::where('status', 'Nonaktif')->first() ?? Worker::create([
            'worker_code' => 'PKR-TEST-INACT',
            'name' => 'Pekerja Nonaktif Audit',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'status' => 'Nonaktif',
        ]);

        // 1. Uji kuantitas 0
        $resZero = $this->actingAs($this->adminUser)->postJson('/api/daily-productions', [
            'worker_id' => $activeWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Potong',
            'items' => [
                [
                    'product_name' => 'BAGGY',
                    'qty' => 0,
                ],
            ],
        ]);
        $resZero->assertStatus(422);

        // 2. Uji kuantitas negatif
        $resNeg = $this->actingAs($this->adminUser)->postJson('/api/daily-productions', [
            'worker_id' => $activeWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Potong',
            'items' => [
                [
                    'product_name' => 'BAGGY',
                    'qty' => -10,
                ],
            ],
        ]);
        $resNeg->assertStatus(422);

        // 3. Uji pekerja nonaktif
        $resInactive = $this->actingAs($this->adminUser)->postJson('/api/daily-productions', [
            'worker_id' => $inactiveWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Potong',
            'items' => [
                [
                    'product_name' => 'BAGGY',
                    'qty' => 10,
                ],
            ],
        ]);
        $resInactive->assertStatus(422);
    }

    /**
     * TEST 5: PERFORMANCE & RESILIENCE — PAGINATION EXTREME INPUT HANDLING
     * Memverifikasi per_page bernilai ekstrim tidak menyebabkan OOM/Crash.
     */
    public function test_pagination_resilience_on_large_per_page(): void
    {
        $res = $this->actingAs($this->adminUser)->getJson('/api/workers?per_page=500');
        $res->assertStatus(200)->assertJson(['status' => 'success']);

        $resDaily = $this->actingAs($this->adminUser)->getJson('/api/daily-productions?per_page=500');
        $resDaily->assertStatus(200)->assertJson(['status' => 'success']);

        $resKeuangan = $this->actingAs($this->adminUser)->getJson('/api/keuangan?per_page=500');
        $resKeuangan->assertStatus(200)->assertJson(['status' => 'success']);
    }

    /**
     * TEST 6: FINANCIAL ACCURACY & RECONCILIATION
     * Memverifikasi rumus matematis Laba Rugi Laporan Keuangan presisi:
     * Laba Kotor = Penjualan Bersih - HPP
     * Laba Operasional = Laba Kotor - Biaya Operasional
     * Laba Bersih = Laba Operasional + Pendapatan Lain - Beban Luar Usaha
     */
    public function test_income_statement_mathematical_reconciliation(): void
    {
        $res = $this->actingAs($this->adminUser)->getJson('/api/laporan-laba-rugi?month=2026-08');
        $res->assertStatus(200);

        $s = $res->json('summary');

        // Net Sales = Gross Sales - Returns - Discounts
        $expectedNetSales = $s['gross_sales'] - $s['sales_returns'] - $s['sales_discounts'];
        $this->assertEquals($expectedNetSales, $s['net_sales'], 'Net sales calculation mismatch');

        // Gross Profit = Net Sales - COGS
        $expectedGrossProfit = $s['net_sales'] - $s['cogs'];
        $this->assertEquals($expectedGrossProfit, $s['gross_profit'], 'Gross profit calculation mismatch');

        // Operating Profit = Gross Profit - Total Operating Expenses
        $expectedOpProfit = $s['gross_profit'] - $s['total_operating_expenses'];
        $this->assertEquals($expectedOpProfit, $s['operating_profit'], 'Operating profit calculation mismatch');

        // Net Profit = Operating Profit + Other Income - Total Non-Operating Expenses
        $expectedNetProfit = $s['operating_profit'] + $s['other_income'] - $s['total_non_operating_expenses'];
        $this->assertEquals($expectedNetProfit, $s['net_profit'], 'Net profit calculation mismatch');
    }

    /**
     * TEST 7: RBAC INTEGRITY — ADMIN CANNOT DEMOTE APPROVED/PAID WEEKLY PAYROLL
     * Memverifikasi user Admin tidak dapat mendemosi status payroll mingguan yang telah 'Disetujui' atau 'Dibayar'.
     */
    public function test_admin_cannot_demote_approved_or_paid_weekly_payroll(): void
    {
        $worker = Worker::where('status', 'Aktif')->firstOrFail();
        $date = '2026-11-12'; // Kamis

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-AUDIT-DEMOTE-' . uniqid(),
            'production_date' => $date,
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 10,
            'total_wage' => 3500,
            'status' => 'Disetujui',
        ]);

        // Admin mencoba mendemosi ke 'Draft' (Harus 403 Forbidden)
        $resDemote = $this->actingAs($this->adminUser)->postJson('/api/payroll-mingguan/status', [
            'period' => '12 - 18 November 2026',
            'start_date' => '2026-11-12',
            'end_date' => '2026-11-18',
            'status' => 'Draft',
        ]);
        $resDemote->assertStatus(403)
            ->assertJson(['status' => 'error']);

        // Owner dapat membuka kembali status jika diperlukan
        $resOwner = $this->actingAs($this->ownerUser)->postJson('/api/payroll-mingguan/status', [
            'period' => '12 - 18 November 2026',
            'start_date' => '2026-11-12',
            'end_date' => '2026-11-18',
            'status' => 'Draft',
        ]);
        $resOwner->assertStatus(200)
            ->assertJson(['status' => 'success']);
    }

    /**
     * TEST 8: SCOPE GUARD — CANNOT RECORD BACKDATED PRODUCTION INTO LOCKED PERIOD
     * Memverifikasi transaksi harian baru tidak dapat dicatat mundur ke periode payroll yang sudah Disetujui/Dibayar.
     */
    public function test_cannot_record_backdated_daily_production_into_approved_or_paid_period(): void
    {
        $worker = Worker::where('status', 'Aktif')->firstOrFail();
        $date = '2026-11-19'; // Kamis

        DailyProduction::create([
            'transaction_number' => 'PRD-AUDIT-LOCK-' . uniqid(),
            'production_date' => $date,
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 5,
            'total_wage' => 1750,
            'status' => 'Dibayar',
        ]);

        // Admin mencoba mencatat transaksi baru pada periode yang sama (Harus 422 Unprocessable)
        $resStore = $this->actingAs($this->adminUser)->postJson('/api/daily-productions', [
            'worker_id' => $worker->id,
            'production_date' => '2026-11-20',
            'process_name' => 'Potong',
            'product_name' => 'BAGGY',
            'qty' => 10,
        ]);
        $resStore->assertStatus(422)
            ->assertJson(['status' => 'error']);
    }

    /**
     * TEST 9: INTEGRITY GUARD — CANNOT DELETE PRODUCTION WITH STATUS 'Diperiksa'
     * Memverifikasi transaksi harian berstatus 'Diperiksa' tidak dapat dihapus saat peninjauan Owner.
     */
    public function test_cannot_delete_daily_production_when_status_is_diperiksa(): void
    {
        $worker = Worker::where('status', 'Aktif')->firstOrFail();
        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-AUDIT-DIPERIKSA-' . uniqid(),
            'production_date' => '2026-11-26',
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 10,
            'total_wage' => 3500,
            'status' => 'Diperiksa',
        ]);

        $resDelete = $this->actingAs($this->adminUser)->deleteJson("/api/daily-productions/{$prod->id}");
        $resDelete->assertStatus(422)
            ->assertJson(['status' => 'error']);
        $this->assertDatabaseHas('daily_productions', ['id' => $prod->id]);
    }

    /**
     * TEST 10: SALARY TAMPERING GUARD — CANNOT TAMPER MONTHLY PAYROLL WHEN APPROVED OR PAID
     * Memverifikasi slip gaji bulanan yang sudah disetujui/dibayar tidak dapat diubah nominalnya oleh non-owner.
     */
    public function test_cannot_tamper_monthly_payroll_when_approved_or_paid(): void
    {
        $worker = Worker::where('status', 'Aktif')->firstOrFail();
        $payroll = MonthlyPayroll::create([
            'worker_id' => $worker->id,
            'worker_name' => $worker->name,
            'position' => 'Staff IT',
            'payroll_number' => 'PYM-AUDIT-' . uniqid(),
            'period' => 'November 2026',
            'basic_salary' => 3000000,
            'allowance' => 500000,
            'overtime' => 0,
            'deductions' => 0,
            'total_salary' => 3500000,
            'status' => 'Disetujui',
            'created_at' => now(),
        ]);

        // Admin mencoba mengubah gaji pokok (Harus 403 Forbidden)
        $resTamper = $this->actingAs($this->adminUser)->putJson("/api/payroll-bulanan/{$payroll->id}", [
            'basic_salary' => 5000000,
            'allowance' => 500000,
            'overtime' => 0,
            'deductions' => 0,
        ]);
        $resTamper->assertStatus(403)
            ->assertJson(['status' => 'error']);
    }

    /**
     * TEST 11: WORKER DEFAULT SALARY INTEGRATION
     * Memverifikasi kolom default_salary pada master pekerja tersimpan dan otomatis menjadi basic_salary pada payroll bulanan.
     */
    public function test_worker_default_salary_persists_and_populates_monthly_payroll(): void
    {
        $code = 'PKR-TST-' . uniqid();
        $resStore = $this->actingAs($this->adminUser)->postJson('/api/workers', [
            'name' => 'Faris Test Driver',
            'type' => 'Staff',
            'process' => 'Driver / Gudang',
            'payment_system' => 'Bulanan',
            'default_salary' => 1800000,
            'status' => 'Aktif',
            'notes' => 'Driver pengiriman',
        ]);

        $resStore->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'name' => 'Faris Test Driver',
                    'default_salary' => 1800000,
                ],
            ]);

        $workerId = $resStore->json('data.id');

        // Panggil endpoint payroll bulanan untuk periode baru
        $period = 'Desember 2026';
        $resPayroll = $this->actingAs($this->adminUser)->getJson("/api/payroll-bulanan?period=" . urlencode($period));
        $resPayroll->assertStatus(200);

        // Cari slip payroll milik Faris Test Driver
        $items = collect($resPayroll->json('data'));
        $farisSlip = $items->firstWhere('worker_id', $workerId);

        $this->assertNotNull($farisSlip, 'Slip payroll bulanan untuk pekerja baru harus terbuat secara otomatis');
        $this->assertEquals(1800000, (float)$farisSlip['basic_salary'], 'basic_salary pada slip gaji bulanan harus sama dengan default_salary pekerja');
    }

    /**
     * TEST 12: PROCESS RATE GUARDRAILS & HPP BTKL COMPLIANCE
     * Memverifikasi guardrail validasi anti-salah-input (maksimal Rp 50.000 per pcs)
     * dan memastikan seluruh akumulasi BTKL produk memenuhi standar resmi GEMINI.md Pasal 5.1 (Rp 3.800 - Rp 5.200).
     */
    public function test_process_rate_guardrails_and_hpp_btkl_compliance(): void
    {
        // 1. Guardrail pada Master Proses: Input gaji bulanan (Rp 1.200.000) ke tarif proses konveksi harus ditolak (422)
        $resAnomaliProses = $this->actingAs($this->adminUser)->postJson('/api/production-processes', [
            'process_name' => 'Proses Uji Anomali ' . uniqid(),
            'default_rate' => 1200000,
            'unit' => 'pcs',
        ]);
        $resAnomaliProses->assertStatus(422)
            ->assertJsonValidationErrors(['default_rate']);

        // 2. Guardrail pada Master Tarif per Produk: Input tarif anomali > 50.000 harus ditolak (422)
        $resAnomaliRate = $this->actingAs($this->adminUser)->postJson('/api/master-proses', [
            'product_name' => 'BAGGY',
            'process_name' => 'QC Borongan',
            'rate' => 1200000,
            'is_custom_rate' => true,
        ]);
        $resAnomaliRate->assertStatus(422)
            ->assertJsonValidationErrors(['rate']);

        // 3. Verifikasi BTKL seluruh produk aktif di database berada pada rentang resmi Rp 3.800 s/d Rp 5.200 (Pasal 5.1)
        $hppComponents = \App\Models\ProductHppComponent::where('status', 'Aktif')->get();
        $this->assertNotEmpty($hppComponents, 'Komponen HPP produk harus tersedia di database');

        foreach ($hppComponents as $hpp) {
            $this->assertGreaterThanOrEqual(
                3800,
                (float) $hpp->labor_cost,
                "BTKL per unit {$hpp->product_name} ({$hpp->labor_cost}) tidak boleh kurang dari batas standar minimum Rp 3.800"
            );
            $this->assertLessThanOrEqual(
                5200,
                (float) $hpp->labor_cost,
                "BTKL per unit {$hpp->product_name} ({$hpp->labor_cost}) tidak boleh melebihi batas standar maksimum Rp 5.200"
            );
        }
    }
}

