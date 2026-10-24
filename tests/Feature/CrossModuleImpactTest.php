<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\ProductionProcess;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\DailyProduction;
use App\Models\FinanceCategory;
use App\Models\FinanceTransaction;
use App\Models\StaffPosition;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Carbon\Carbon;

class CrossModuleImpactTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $ownerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::where('role', 'admin')->first() ?? User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@fashol.com',
        ]);

        $this->ownerUser = User::where('role', 'owner')->first() ?? User::factory()->create([
            'role' => 'owner',
            'email' => 'owner@fashol.com',
        ]);
    }

    /**
     * 1. End-to-End: Pengaturan -> Master Pekerja -> Produksi Harian -> Dual-Cycle Payroll Mingguan
     */
    public function test_end_to_end_settings_to_production_and_dual_cycle_weekly_payroll(): void
    {
        // 1.1 Ensure clean process setup
        $proc = ProductionProcess::firstOrCreate(
            ['process_name' => 'QC'],
            [
                'process_code' => 'PRC-QC-TEST',
                'payroll_day' => 'Kamis',
                'default_rate' => 300,
                'is_active' => true,
            ]
        );
        $proc->update(['payroll_day' => 'Kamis']);

        // 1.2 Create worker assigned to this process
        $worker = Worker::firstOrCreate(
            ['name' => 'Ujang QC Impact Test'],
            [
                'worker_code' => 'PKR-QC-TEST',
                'type' => 'Produksi',
                'process' => 'QC',
                'payment_system' => 'Borongan',
                'payroll_day' => 'Kamis',
                'status' => 'Aktif',
            ]
        );
        $worker->update(['payroll_day' => 'Kamis', 'process' => 'QC', 'status' => 'Aktif']);

        // 1.3 Change process cycle to Sabtu via Pengaturan API with sync_workers
        $cycleResp = $this->actingAs($this->adminUser)->postJson('/api/settings/payroll-cycles', [
            'process_id' => $proc->id,
            'payroll_day' => 'Sabtu',
            'sync_workers' => true,
        ]);
        $cycleResp->assertStatus(200);

        // Verify sync worked
        $this->assertEquals('Sabtu', $proc->fresh()->payroll_day);
        $this->assertEquals('Sabtu', $worker->fresh()->payroll_day);

        // 1.4 Setup Product Group and Rate
        $group = ProductGroup::firstOrCreate(
            ['name' => 'SCUBA IMPACT'],
            ['code' => 'GRP-SCUBA-IMP', 'status' => 'Aktif']
        );
        ProductProcessRate::firstOrCreate(
            [
                'product_group_id' => $group->id,
                'product_name' => 'SCUBA IMPACT',
                'process_name' => 'QC',
            ],
            [
                'rate' => 300,
                'is_active' => true,
            ]
        );

        // 1.5 Record Daily Production
        $now = Carbon::now();
        $dateStr = $now->format('Y-m-d');
        $prodResp = $this->actingAs($this->adminUser)->postJson('/api/daily-productions', [
            'worker_id' => $worker->id,
            'process_name' => 'QC',
            'product_name' => 'SCUBA IMPACT',
            'production_date' => $dateStr,
            'qty' => 50,
            'variation' => 'All Size',
            'color' => 'Navy',
        ]);
        $prodResp->assertStatus(201);
        $prodData = $prodResp->json('data');
        $this->assertEquals(15000, $prodData['total_wage']); // 50 * 300

        // 1.6 Fetch Weekly Payroll by cycle: Must appear in Sabtu, NOT in Kamis
        $sabtuPayroll = $this->actingAs($this->adminUser)->getJson("/api/payroll-mingguan?cycle=sabtu&start_date={$dateStr}&end_date={$dateStr}");
        $sabtuPayroll->assertStatus(200);
        $sabtuData = collect($sabtuPayroll->json('data'));
        $workerSlip = $sabtuData->firstWhere('worker_name', 'Ujang QC Impact Test');
        $this->assertNotNull($workerSlip, 'Worker Ujang QC should appear in Sabtu payroll cycle');
        $this->assertEquals('Sabtu', $workerSlip['payroll_day']);

        $kamisPayroll = $this->actingAs($this->adminUser)->getJson("/api/payroll-mingguan?cycle=kamis&start_date={$dateStr}&end_date={$dateStr}");
        $kamisPayroll->assertStatus(200);
        $kamisData = collect($kamisPayroll->json('data'));
        $workerInKamis = $kamisData->firstWhere('worker_name', 'Ujang QC Impact Test');
        $this->assertNull($workerInKamis, 'Worker Ujang QC must NOT appear in Kamis payroll cycle');

        // 1.7 Owner approves and pays the payroll
        $approveResp = $this->actingAs($this->ownerUser)->postJson('/api/payroll-mingguan/status', [
            'start_date' => $dateStr,
            'end_date' => $dateStr,
            'cycle' => 'sabtu',
            'status' => 'Disetujui',
        ]);
        $approveResp->assertStatus(200);

        $payResp = $this->actingAs($this->ownerUser)->postJson('/api/payroll-mingguan/status', [
            'start_date' => $dateStr,
            'end_date' => $dateStr,
            'cycle' => 'sabtu',
            'status' => 'Dibayar',
        ]);
        $payResp->assertStatus(200);

        // Verify daily production status transitioned to Dibayar
        $prodRecord = DailyProduction::find($prodData['id']);
        $this->assertEquals('Dibayar', $prodRecord->status);
    }

    /**
     * 2. End-to-End: Pengaturan Jabatan -> Master Pekerja Staff -> Payroll Bulanan (Zero Hardcode Salary)
     */
    public function test_end_to_end_staff_position_to_monthly_payroll_dynamic_salary(): void
    {
        // 2.1 Admin adds new position in Pengaturan
        $posResp = $this->actingAs($this->adminUser)->postJson('/api/settings/staff-positions', [
            'name' => 'Supervisor QC Finishing Impact',
            'department' => 'Produksi',
        ]);
        $posResp->assertStatus(200);

        // 2.2 Create Staff Worker with default salary
        $worker = Worker::create([
            'worker_code' => 'PKR-STF-IMP',
            'name' => 'Dewi Supervisor Impact',
            'type' => 'Staff',
            'process' => 'Supervisor QC Finishing Impact',
            'payment_system' => 'Bulanan',
            'default_salary' => 3750000,
            'status' => 'Aktif',
        ]);

        // 2.3 Fetch Monthly Payroll: Worker must appear with exact Rp 3.750.000 salary
        $currentMonth = Carbon::now()->format('Y-m');
        $monthResp = $this->actingAs($this->adminUser)->getJson("/api/payroll-bulanan?month={$currentMonth}");
        $monthResp->assertStatus(200);

        $staffList = collect($monthResp->json('data'));
        $dewiItem = $staffList->firstWhere('worker_name', 'Dewi Supervisor Impact');
        $this->assertNotNull($dewiItem);
        $this->assertEquals(3750000, (float) $dewiItem['basic_salary']);
        $this->assertEquals('Supervisor QC Finishing Impact', $dewiItem['position']);

        // 2.4 Owner approves monthly payroll
        $approveResp = $this->actingAs($this->ownerUser)->postJson("/api/payroll-bulanan/{$dewiItem['id']}/status", [
            'status' => 'Disetujui',
        ]);
        $approveResp->assertStatus(200);

        // 2.5 Owner pays monthly payroll
        $payResp = $this->actingAs($this->ownerUser)->postJson("/api/payroll-bulanan/{$dewiItem['id']}/status", [
            'status' => 'Dibayar',
        ]);
        $payResp->assertStatus(200);
        $this->assertEquals('Dibayar', $payResp->json('new_status'));
    }

    /**
     * 3. End-to-End: Pengaturan Akun -> Transaksi Keuangan -> Rekap Biaya Produksi -> Laporan Laba Rugi
     */
    public function test_end_to_end_finance_categories_to_rekap_and_income_statement(): void
    {
        $today = Carbon::now()->format('Y-m-d');
        $currentMonth = Carbon::now()->format('F Y');

        // 3.1 Setup custom category with cost_type='material'
        $catMat = FinanceCategory::firstOrCreate(
            ['name' => 'Bahan Baku Benang Obras Import'],
            [
                'code' => '5-9981',
                'group' => 'cogs',
                'cost_type' => 'material',
                'is_active' => true,
            ]
        );

        // 3.2 Record transactions
        FinanceTransaction::create([
            'transaction_number' => 'TRX-IMP-MAT-01',
            'type' => 'expense',
            'category' => 'Bahan Baku Benang Obras Import',
            'cost_type' => 'material',
            'category_id' => $catMat->id,
            'title' => 'Beli Benang Obras',
            'amount' => 600000,
            'transaction_date' => $today,
        ]);

        FinanceTransaction::create([
            'transaction_number' => 'TRX-IMP-OPEX-01',
            'type' => 'expense',
            'category' => 'Beban Listrik',
            'cost_type' => 'general_operating',
            'title' => 'Tagihan Listrik PLN Pabrik',
            'amount' => 450000,
            'transaction_date' => $today,
        ]);

        FinanceTransaction::create([
            'transaction_number' => 'TRX-IMP-INC-01',
            'type' => 'income',
            'category' => 'Penjualan Produk',
            'cost_type' => null,
            'title' => 'Penjualan Grosir Baju',
            'amount' => 5000000,
            'transaction_date' => $today,
        ]);

        // 3.3 Verify Rekap Biaya Produksi picks up material expense
        $rekapResp = $this->actingAs($this->adminUser)->getJson("/api/rekap-biaya-produksi?period={$currentMonth}");
        $rekapResp->assertStatus(200);
        $components = collect($rekapResp->json('components'));
        $matRow = $components->firstWhere('component', 'Bahan & Material');
        $this->assertNotNull($matRow);
        $this->assertGreaterThanOrEqual(600000, $matRow['amount']);

        // 3.4 Verify Laporan Laba Rugi calculates correctly
        $labaRugiResp = $this->actingAs($this->adminUser)->getJson("/api/laporan-laba-rugi?month=" . Carbon::now()->month . "&year=" . Carbon::now()->year);
        $labaRugiResp->assertStatus(200);
        $summary = $labaRugiResp->json('summary');

        $this->assertNotNull($summary);
        $this->assertGreaterThanOrEqual(5000000, $summary['gross_sales']);
        $this->assertGreaterThanOrEqual(5000000, $summary['net_sales']);

        $opexList = collect($labaRugiResp->json('operating_expenses'));
        $listrikAccount = $opexList->firstWhere('account', 'Beban Listrik');
        $this->assertNotNull($listrikAccount);
        $this->assertGreaterThanOrEqual(450000, $listrikAccount['amount']);
    }

    /**
     * 4. End-to-End: Dashboard Integration & Data Reconciliation
     */
    public function test_end_to_end_dashboard_financial_harmony(): void
    {
        $dashResp = $this->actingAs($this->adminUser)->getJson('/api/dashboard');
        $dashResp->assertStatus(200);

        $data = $dashResp->json();
        $this->assertEquals('success', $data['status']);
        $this->assertArrayHasKey('metrics', $data);
        $this->assertArrayHasKey('cashflow_chart', $data);
        $this->assertArrayHasKey('hpp_summary', $data);
        $this->assertArrayHasKey('recent_activities', $data);
    }

    /**
     * 5. End-to-End: All 6 Export Endpoints generate valid streams without crash
     */
    public function test_all_export_endpoints_generate_valid_files(): void
    {
        $endpoints = [
            '/api/export/payroll-mingguan',
            '/api/export/payroll-bulanan',
            '/api/export/keuangan',
            '/api/export/rekap-biaya-produksi',
            '/api/export/laporan-laba-rugi',
            '/api/export/produksi-harian',
        ];

        foreach ($endpoints as $ep) {
            $resp = $this->actingAs($this->adminUser)->get($ep);
            $this->assertEquals(
                200,
                $resp->status(),
                "Export endpoint {$ep} must return HTTP 200 OK"
            );
            $this->assertNotEmpty($resp->headers->get('content-disposition'));
        }
    }
}
