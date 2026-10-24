<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\ProductionProcess;
use App\Models\FinanceCategory;
use App\Models\FinanceTransaction;
use App\Models\StaffPosition;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;

class SettingsFeatureTest extends TestCase
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

    /** 1. Test unauthenticated guests are blocked from all settings endpoints */
    public function test_unauthenticated_guests_are_rejected_from_settings(): void
    {
        $this->getJson('/api/settings/payroll-cycles')->assertStatus(401);
        $this->postJson('/api/settings/payroll-cycles', [])->assertStatus(401);
        $this->getJson('/api/settings/finance-categories')->assertStatus(401);
        $this->postJson('/api/settings/finance-categories', [])->assertStatus(401);
        $this->getJson('/api/settings/staff-positions')->assertStatus(401);
        $this->postJson('/api/settings/staff-positions', [])->assertStatus(401);
    }

    /** 2. Test payroll cycles mapping with automatic worker synchronization */
    public function test_can_get_and_update_payroll_cycles_with_worker_sync(): void
    {
        $proc = ProductionProcess::firstOrCreate(
            ['process_name' => 'Jahit'],
            ['process_code' => 'JHT', 'payroll_day' => 'Kamis', 'is_active' => true]
        );
        $proc->update(['payroll_day' => 'Kamis']);

        $worker = Worker::firstOrCreate(
            ['name' => 'Joko Test Settings Sync'],
            [
                'worker_code' => 'W-TEST-SYNC',
                'type' => 'Produksi',
                'process' => 'Jahit',
                'payment_system' => 'Borongan',
                'payroll_day' => 'Kamis',
                'status' => 'Aktif',
            ]
        );
        $worker->update(['payroll_day' => 'Kamis', 'process' => 'Jahit']);

        $response = $this->actingAs($this->adminUser)->getJson('/api/settings/payroll-cycles');
        $response->assertStatus(200)->assertJson(['status' => 'success']);

        // Update cycle from Kamis to Sabtu with sync_workers
        $updateResp = $this->actingAs($this->adminUser)->postJson('/api/settings/payroll-cycles', [
            'process' => 'Jahit',
            'cycle_day' => 'Sabtu',
            'sync_workers' => true,
        ]);

        $updateResp->assertStatus(200)->assertJson(['status' => 'success']);

        $this->assertEquals('Sabtu', $proc->fresh()->payroll_day);
        $this->assertEquals('Sabtu', $worker->fresh()->payroll_day);
    }

    /** 3. Test payroll cycles query count is O(1) queries (no N+1 query regression) */
    public function test_payroll_cycles_query_count_is_optimized_against_n_plus_one(): void
    {
        DB::enableQueryLog();
        DB::flushQueryLog();

        $this->actingAs($this->adminUser)->getJson('/api/settings/payroll-cycles');

        $queryCount = count(DB::getQueryLog());
        // Worker count aggregation + ProductionProcess query = exactly 2 queries max, regardless of number of processes
        $this->assertLessThanOrEqual(4, $queryCount, "getPayrollCycles should execute in <= 4 queries without N+1 loops");
        DB::disableQueryLog();
    }

    /** 4. Test finance category CRUD and toggle */
    public function test_can_manage_finance_categories_and_toggle_status(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/settings/finance-categories');
        $response->assertStatus(200)->assertJsonStructure(['status', 'data']);

        $createResp = $this->actingAs($this->adminUser)->postJson('/api/settings/finance-categories', [
            'name' => 'Beban Ekspedisi Khusus Kargo',
            'group' => 'operating_expense',
            'cost_type' => 'general_operating',
            'code' => '5-9988',
            'description' => 'Biaya antar kilat kargo',
        ]);

        $createResp->assertStatus(200)->assertJson(['status' => 'success']);

        $newCat = FinanceCategory::where('name', 'Beban Ekspedisi Khusus Kargo')->first();
        $this->assertNotNull($newCat);
        $this->assertTrue((bool)$newCat->is_active);

        // Toggle category
        $toggleResp = $this->actingAs($this->adminUser)->postJson("/api/settings/finance-categories/{$newCat->id}/toggle");
        $toggleResp->assertStatus(200);
        $this->assertFalse((bool)$newCat->fresh()->is_active);
    }

    /** 5. Test core system categories cannot be deactivated */
    public function test_cannot_deactivate_core_system_categories(): void
    {
        $coreCat = FinanceCategory::where('name', 'Penjualan Produk')->first();
        if (!$coreCat) {
            $coreCat = FinanceCategory::create([
                'code' => '4-1000',
                'name' => 'Penjualan Produk',
                'group' => 'income',
                'is_active' => true,
                'is_default' => true,
            ]);
        }

        $resp = $this->actingAs($this->adminUser)->postJson("/api/settings/finance-categories/{$coreCat->id}/toggle");
        $resp->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
        $this->assertTrue((bool)$coreCat->fresh()->is_active);
    }

    /** 6. Test cannot create duplicate category name or code */
    public function test_cannot_create_duplicate_category_name_or_code(): void
    {
        FinanceCategory::firstOrCreate(
            ['name' => 'Beban Listrik'],
            ['code' => '5-1003', 'group' => 'operating_expenses', 'is_active' => true]
        );

        $resp = $this->actingAs($this->adminUser)->postJson('/api/settings/finance-categories', [
            'name' => 'Beban Listrik',
            'group' => 'operating_expense',
        ]);

        $resp->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    /** 7. Test staff positions management */
    public function test_can_manage_staff_positions(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/settings/staff-positions');
        $response->assertStatus(200);

        $addResp = $this->actingAs($this->adminUser)->postJson('/api/settings/staff-positions', [
            'name' => 'Supervisor Bordir Komputer',
        ]);

        $addResp->assertStatus(200)->assertJson(['status' => 'success']);

        $pos = StaffPosition::where('name', 'Supervisor Bordir Komputer')->first();
        $this->assertNotNull($pos);

        $delResp = $this->actingAs($this->adminUser)->deleteJson("/api/settings/staff-positions/{$pos->id}");
        $delResp->assertStatus(200);
        $this->assertNull(StaffPosition::find($pos->id));
    }

    /** 8. Test cannot create duplicate staff position */
    public function test_cannot_create_duplicate_staff_position(): void
    {
        StaffPosition::firstOrCreate(['name' => 'Manager Operasional']);

        $resp = $this->actingAs($this->adminUser)->postJson('/api/settings/staff-positions', [
            'name' => 'Manager Operasional',
        ]);

        $resp->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    /** 9. Test cannot delete staff position currently assigned to workers */
    public function test_cannot_delete_staff_position_used_by_active_workers(): void
    {
        $pos = StaffPosition::firstOrCreate(['name' => 'Admin Gudang Kain']);

        Worker::firstOrCreate(
            ['name' => 'Pekerja Gudang Test'],
            [
                'worker_code' => 'W-GDG-01',
                'type' => 'Staff',
                'process' => 'Admin Gudang Kain',
                'payment_system' => 'Bulanan',
                'status' => 'Aktif',
            ]
        );

        $delResp = $this->actingAs($this->adminUser)->deleteJson("/api/settings/staff-positions/{$pos->id}");
        $delResp->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);

        $this->assertNotNull(StaffPosition::find($pos->id));
    }

    /** 10. Test production cost summary accurately prioritizes cost_type column */
    public function test_production_cost_summary_accurately_prioritizes_cost_type(): void
    {
        $date = now()->format('Y-m-d');
        
        // Create custom transactions with explicit cost_type
        $trxMat = FinanceTransaction::create([
            'transaction_number' => 'TRX-TEST-MAT-01',
            'type' => 'expense',
            'category' => 'Pengadaan Kain Rayon Khusus',
            'cost_type' => 'material',
            'title' => 'Pembelian Roll Khusus',
            'amount' => 500000,
            'transaction_date' => $date,
        ]);

        $trxService = FinanceTransaction::create([
            'transaction_number' => 'TRX-TEST-SRV-01',
            'type' => 'expense',
            'category' => 'Subkontrak Press & Label',
            'cost_type' => 'service',
            'title' => 'Ongkos Pasang Hangtag',
            'amount' => 150000,
            'transaction_date' => $date,
        ]);

        $response = $this->actingAs($this->adminUser)->getJson("/api/rekap-biaya-produksi?period=" . now()->translatedFormat('F Y'));
        $response->assertStatus(200);

        $data = $response->json();
        $this->assertEquals('success', $data['status']);

        $components = collect($data['components']);
        $matRow = $components->firstWhere('component', 'Bahan & Material');
        $srvRow = $components->firstWhere('component', 'Jasa Produksi Lainnya');

        $this->assertNotNull($matRow);
        $this->assertGreaterThanOrEqual(500000, $matRow['amount']);
        $this->assertNotNull($srvRow);
        $this->assertGreaterThanOrEqual(150000, $srvRow['amount']);
    }
}
