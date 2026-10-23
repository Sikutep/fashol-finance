<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\FinanceTransaction;
use App\Models\MonthlyPayroll;
use App\Models\DailyProduction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class FinanceThreeFeaturesIntegrationTest extends TestCase
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
     * Test 1: Fitur Keuangan - Pagination, Period Filtering, and Metrics
     */
    public function test_keuangan_pagination_and_period_filtering(): void
    {
        $responsePage1 = $this->actingAs($this->adminUser)->getJson('/api/keuangan?period=Oktober%202026&per_page=5&page=1');
        $responsePage1->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'period' => 'Oktober 2026',
            ]);

        $json1 = $responsePage1->json();
        $this->assertArrayHasKey('pagination', $json1);
        $this->assertArrayHasKey('summary', $json1);
        $this->assertArrayHasKey('available_periods', $json1);
        $this->assertEquals(1, $json1['pagination']['current_page']);
        $this->assertEquals(5, $json1['pagination']['per_page']);
        $this->assertGreaterThanOrEqual(1, $json1['pagination']['total']);

        // Test Page 2 if total > 5
        if ($json1['pagination']['total'] > 5) {
            $responsePage2 = $this->actingAs($this->adminUser)->getJson('/api/keuangan?period=Oktober%202026&per_page=5&page=2');
            $responsePage2->assertStatus(200);
            $this->assertEquals(2, $responsePage2->json('pagination.current_page'));
        }

        // Summary metrics should be period-specific
        $this->assertGreaterThan(0, (float) $json1['summary']['total_income']);
        $this->assertGreaterThan(0, (float) $json1['summary']['total_expense']);
    }

    /**
     * Test 2: Fitur Keuangan - Full CRUD Lifecycle (Create, Update, Delete)
     */
    public function test_keuangan_crud_lifecycle(): void
    {
        // 1. Create
        $createPayload = [
            'type' => 'expense',
            'category' => 'Beban Perlengkapan',
            'title' => 'Pembelian Gunting & Meteran Jahit',
            'amount' => 750000,
            'transaction_date' => '2026-10-18',
            'reference' => 'NOTA-TEST-001',
            'notes' => 'Catatan uji coba integrasi keuangan',
        ];

        $createRes = $this->actingAs($this->adminUser)->postJson('/api/keuangan', $createPayload);
        $createRes->assertStatus(201)
            ->assertJson([
                'status' => 'success',
            ]);

        $createdId = $createRes->json('data.id');
        $trxNumber = $createRes->json('data.transaction_number');
        $this->assertNotNull($createdId);
        $this->assertStringStartsWith('TRX-261018-', $trxNumber);

        // 2. Update
        $updatePayload = [
            'type' => 'expense',
            'category' => 'Beban Perlengkapan',
            'title' => 'Pembelian Gunting, Meteran Jahit & Jarum',
            'amount' => 850000,
            'transaction_date' => '2026-10-18',
            'reference' => 'NOTA-TEST-001-REV',
            'notes' => 'Revisi tambahan jarum',
        ];

        $updateRes = $this->actingAs($this->adminUser)->putJson("/api/keuangan/{$createdId}", $updatePayload);
        $updateRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseHas('finance_transactions', [
            'id' => $createdId,
            'title' => 'Pembelian Gunting, Meteran Jahit & Jarum',
            'amount' => 850000,
        ]);

        // 3. Delete
        $deleteRes = $this->actingAs($this->adminUser)->deleteJson("/api/keuangan/{$createdId}");
        $deleteRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseMissing('finance_transactions', [
            'id' => $createdId,
        ]);
    }

    /**
     * Test 3: Fitur Biaya Produksi - Rekap Biaya Produksi Integration & Clean Calculation
     */
    public function test_rekap_biaya_produksi_integration_and_clean_calculations(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/rekap-biaya-produksi?period=Oktober%202026');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'period' => 'Oktober 2026',
            ]);

        $summary = $response->json('summary');
        $components = $response->json('components');

        $this->assertNotEmpty($components);
        $this->assertGreaterThan(0, (float) $summary['total_cost']);
        $this->assertGreaterThan(0, (float) $summary['total_output']);
        $this->assertGreaterThan(0, (float) $summary['avg_cost_per_unit']);

        // Check essential components presence
        $componentNames = array_column($components, 'component');
        $this->assertContains('Upah Produksi Mingguan', $componentNames);
        $this->assertContains('Bahan & Material', $componentNames);
        $this->assertContains('Overhead Produksi', $componentNames);

        // Check overhead includes konveksi utility and depreciation
        $overhead = collect($components)->firstWhere('component', 'Overhead Produksi');
        $this->assertNotNull($overhead);
        $this->assertEquals('Alokasi Utilitas Konveksi', $overhead['source']);
        $this->assertGreaterThan(0, (float) $overhead['amount']);

        // Efficiency should be clean and not zero or arbitrary 100%
        $this->assertGreaterThan(0, (float) $summary['efficiency_percentage']);
        $this->assertLessThanOrEqual(100.0, (float) $summary['efficiency_percentage']);
    }

    /**
     * Test 4: Fitur Laporan Finance - Dynamic Staff Salary Sync from Monthly Payroll
     */
    public function test_laporan_laba_rugi_dynamic_sync_from_monthly_payroll(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/laporan-laba-rugi?month=10&year=2026');
        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $summary = $response->json('summary');
        $operatingExpenses = $response->json('operating_expenses');

        // Check gross sales, net sales, and profit structure
        $this->assertEquals(
            (float) $summary['gross_sales'] - (float) $summary['sales_returns'] - (float) $summary['sales_discounts'],
            (float) $summary['net_sales']
        );
        $this->assertEquals(
            (float) $summary['net_sales'] - (float) $summary['cogs'],
            (float) $summary['gross_profit']
        );
        $this->assertEquals(
            (float) $summary['gross_profit'] - (float) $summary['total_operating_expenses'],
            (float) $summary['operating_profit']
        );

        // Verify Beban Gaji Karyawan matches MonthlyPayroll for Oktober 2026
        $expectedMonthlySalary = (float) MonthlyPayroll::where('period', 'Oktober 2026')->sum('total_salary');
        $gajiKaryawanAccount = collect($operatingExpenses)->firstWhere('account', 'Beban Gaji Karyawan');

        $this->assertNotNull($gajiKaryawanAccount);
        if ($expectedMonthlySalary > 0) {
            $this->assertEquals(
                $expectedMonthlySalary,
                (float) $gajiKaryawanAccount['amount'],
                'Beban Gaji Karyawan harus tersinkronisasi otomatis dengan Modul 5 Payroll Bulanan'
            );
        }
    }

    /**
     * Test 5: Fitur Laporan Finance - Guard Against Artificial COGS on Zero Gross Sales
     */
    public function test_laporan_laba_rugi_guards_against_zero_gross_sales(): void
    {
        // Month with 0 sales
        $response = $this->actingAs($this->adminUser)->getJson('/api/laporan-laba-rugi?month=1&year=2024');
        $response->assertStatus(200);

        $summary = $response->json('summary');
        $this->assertEquals(0.0, (float) $summary['gross_sales']);
        $this->assertEquals(0.0, (float) $summary['cogs'], 'COGS tidak boleh bernilai positif jika tidak ada omzet penjualan');
    }
}
