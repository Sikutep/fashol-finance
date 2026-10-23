<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\MonthlyPayroll;
use App\Models\DailyProduction;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class BugFixesVerificationTest extends TestCase
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
     * Test BUG-01: Update status payroll mingguan tanpa parameter tanggal harus ditolak (422)
     * untuk mencegah UPDATE massal tanpa WHERE clause.
     */
    public function test_weekly_payroll_status_update_requires_dates_preventing_unconstrained_update(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/payroll-mingguan/status', [
                'status' => 'Diperiksa',
                // start_date & end_date sengaja dihilangkan
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['start_date']);
    }

    /**
     * Test BUG-04: Pekerja dengan riwayat payroll bulanan tidak boleh dihapus secara hard delete.
     */
    public function test_worker_with_monthly_payroll_protected_from_deletion(): void
    {
        // Buat worker staf dengan payroll bulanan
        $worker = Worker::create([
            'worker_code' => 'STF-TEST-' . uniqid(),
            'name' => 'Staf Test Protection',
            'type' => 'staff',
            'process' => 'Admin Keuangan',
            'phone' => '081234567899',
            'status' => 'Aktif',
            'join_date' => now()->toDateString(),
        ]);

        $payroll = MonthlyPayroll::create([
            'payroll_number' => 'TEST-PR-PROTECT-' . uniqid(),
            'worker_id' => $worker->id,
            'worker_name' => $worker->name,
            'position' => 'Staff IT',
            'period' => 'Oktober 2026',
            'basic_salary' => 3000000,
            'allowance' => 500000,
            'overtime' => 100000,
            'deductions' => 0,
            'total_salary' => 3600000,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/workers/{$worker->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        // Pastikan pekerja hanya di-soft delete, TIDAK dihapus permanen dari tabel
        $this->assertSoftDeleted('workers', ['id' => $worker->id]);
        $this->assertDatabaseHas('monthly_payrolls', ['id' => $payroll->id]);
    }

    /**
     * Test BUG-12: Endpoint PUT /api/payroll-bulanan/{id} berhasil memperbarui komponen gaji bulanan.
     */
    public function test_update_monthly_payroll_item_components(): void
    {
        $worker = Worker::where('type', 'staff')->first() ?? Worker::first();
        $this->assertNotNull($worker);

        $payroll = MonthlyPayroll::create([
            'payroll_number' => 'TEST-PR-EDIT-' . uniqid(),
            'worker_id' => $worker->id,
            'worker_name' => $worker->name,
            'position' => 'Staff IT',
            'period' => 'Oktober 2026',
            'basic_salary' => 2500000,
            'allowance' => 200000,
            'overtime' => 100000,
            'deductions' => 50000,
            'total_salary' => 2750000,
            'status' => 'Draft',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->putJson("/api/payroll-bulanan/{$payroll->id}", [
                'basic_salary' => 3000000,
                'allowance' => 400000,
                'overtime' => 150000,
                'deductions' => 50000,
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $payroll->id,
                    'basic_salary' => 3000000,
                    'allowance' => 400000,
                    'overtime' => 150000,
                    'deductions' => 50000,
                    'total_salary' => 3500000,
                ],
            ]);

        $this->assertDatabaseHas('monthly_payrolls', [
            'id' => $payroll->id,
            'total_salary' => 3500000,
        ]);
    }

    /**
     * Test BUG-07 & BUG-10: Pencatatan produksi harian dengan multiple item rows.
     */
    public function test_multi_item_daily_production_creation(): void
    {
        $worker = Worker::where('status', 'Aktif')->where('payment_system', 'Borongan')->first();
        $this->assertNotNull($worker);

        $group1 = ProductGroup::first();
        $this->assertNotNull($group1);

        $processName = 'Potong';
        $rate1 = ProductProcessRate::where('product_name', $group1->name)
            ->where('process_name', $processName)
            ->value('rate') ?? 350;

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/daily-productions', [
                'production_date' => now()->toDateString(),
                'worker_id' => $worker->id,
                'process_name' => $processName,
                'items' => [
                    [
                        'product_name' => $group1->name,
                        'variation' => 'ALL SIZE',
                        'color' => 'HITAM',
                        'qty' => 10,
                        'rate' => $rate1,
                    ],
                    [
                        'product_name' => $group1->name,
                        'variation' => 'ALL SIZE',
                        'color' => 'NAVY',
                        'qty' => 5,
                        'rate' => $rate1,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
            ]);

        $data = $response->json('data');
        $this->assertEquals(15, $data['total_qty']);
        $this->assertEquals(15 * $rate1, $data['total_wage']);

        // Pastikan relasi items tersimpan di database
        $this->assertDatabaseHas('daily_production_items', [
            'daily_production_id' => $data['id'],
            'color' => 'HITAM',
            'qty' => 10,
        ]);
        $this->assertDatabaseHas('daily_production_items', [
            'daily_production_id' => $data['id'],
            'color' => 'NAVY',
            'qty' => 5,
        ]);
    }

    /**
     * Test BUG-09: Laporan laba rugi menghitung relasi kategori dengan konsisten.
     */
    public function test_income_statement_structure_and_balance(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/laporan-laba-rugi?month=' . now()->month . '&year=' . now()->year);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'period',
                'summary' => [
                    'gross_sales',
                    'sales_returns',
                    'sales_discounts',
                    'net_sales',
                    'cogs',
                    'gross_profit',
                    'total_operating_expenses',
                    'operating_profit',
                    'other_income',
                    'total_non_operating_expenses',
                    'net_profit',
                ],
                'operating_expenses',
                'non_operating_expenses',
            ]);

        $summary = $response->json('summary');
        
        // Verifikasi formula matematis SPK Laba Rugi
        $calculatedNetSales = $summary['gross_sales'] - $summary['sales_returns'] - $summary['sales_discounts'];
        $this->assertEquals($calculatedNetSales, $summary['net_sales']);

        $calculatedGrossProfit = $summary['net_sales'] - $summary['cogs'];
        $this->assertEquals($calculatedGrossProfit, $summary['gross_profit']);

        $calculatedOperatingProfit = $summary['gross_profit'] - $summary['total_operating_expenses'];
        $this->assertEquals($calculatedOperatingProfit, $summary['operating_profit']);

        $calculatedNetProfit = $summary['operating_profit'] + $summary['other_income'] - $summary['total_non_operating_expenses'];
        $this->assertEquals($calculatedNetProfit, $summary['net_profit']);
    }
}
