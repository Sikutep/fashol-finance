<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\Product;
use App\Models\ProductGroup;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\MonthlyPayroll;
use App\Models\ProductionProcess;
use App\Models\ProductProcessRate;
use App\Models\ProductHppComponent;
use App\Models\FinanceTransaction;
use App\Models\FinanceCategory;
use App\Models\StaffPosition;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class DatabaseRelationshipIntegrityTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::firstOrCreate(
            ['email' => 'admin_rel_test@fashol.test'],
            ['name' => 'Admin Relasi Test', 'password' => bcrypt('password'), 'role' => 'admin']
        );
    }

    /**
     * Test 1: Soft-deleted worker must still be resolved by DailyProduction::worker()
     * and displayed properly in daily production list and search.
     */
    public function test_soft_deleted_worker_relation_in_daily_production(): void
    {
        $worker = Worker::create([
            'worker_code' => 'PKR-REL-01',
            'name' => 'Tukang Jahit Pensiun',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-REL-001',
            'production_date' => now()->format('Y-m-d'),
            'worker_id' => $worker->id,
            'process_name' => 'Jahit',
            'total_qty' => 50,
            'total_wage' => 125000,
            'status' => 'Tercatat',
        ]);

        DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_name' => 'Baggy Pants',
            'qty' => 50,
            'rate' => 2500,
            'total_wage' => 125000,
        ]);

        // Worker resigns / is archived (soft delete)
        $worker->delete();
        $this->assertSoftDeleted('workers', ['id' => $worker->id]);

        // Verify Eloquent relationship withTrashed()
        $reloaded = DailyProduction::with('worker')->find($prod->id);
        $this->assertNotNull($reloaded->worker, 'Relasi worker() tidak boleh null meskipun pekerja di-soft-delete');
        $this->assertEquals('Tukang Jahit Pensiun', $reloaded->worker->name);

        // Verify API search and display returns real name instead of "Pekerja Tidak Ditemukan"
        $response = $this->actingAs($this->adminUser)
            ->getJson('/api/daily-productions?search=Pensiun');

        $response->assertStatus(200);
        $items = $response->json('data');
        $this->assertNotEmpty($items);
        $this->assertEquals('Tukang Jahit Pensiun', $items[0]['worker_name']);
        $this->assertNotEquals('Pekerja Tidak Ditemukan', $items[0]['worker_name']);
    }

    /**
     * Test 2: Soft-deleted worker must preserve their name on historical Weekly Payroll slips.
     */
    public function test_soft_deleted_worker_preserves_name_in_weekly_payroll(): void
    {
        // Pastikan proses Jahit siklus Kamis
        ProductionProcess::firstOrCreate(
            ['process_name' => 'Jahit'],
            ['process_code' => 'JHT', 'default_rate' => 2500, 'payroll_day' => 'Kamis']
        );

        $worker = Worker::create([
            'worker_code' => 'PKR-REL-02',
            'name' => 'Pak Joko Legendaris',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        // Cari tanggal Kamis terdekat
        $thursday = now()->next(\Carbon\Carbon::THURSDAY);
        $startDate = $thursday->copy()->subDays(6)->format('Y-m-d');
        $endDate = $thursday->format('Y-m-d');

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-REL-002',
            'production_date' => $thursday->copy()->subDays(2)->format('Y-m-d'),
            'worker_id' => $worker->id,
            'process_name' => 'Jahit',
            'total_qty' => 100,
            'total_wage' => 250000,
            'status' => 'Tercatat',
        ]);

        DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_name' => 'Baggy Pants',
            'qty' => 100,
            'rate' => 2500,
            'total_wage' => 250000,
        ]);

        // Pekerja diarsipkan / soft deleted
        $worker->delete();

        // Ambil slip mingguan untuk periode ini
        $response = $this->actingAs($this->adminUser)
            ->getJson("/api/payroll-mingguan?cycle=Kamis&start_date={$startDate}&end_date={$endDate}");

        $response->assertStatus(200);
        $slips = $response->json('data');
        $this->assertNotEmpty($slips);

        $targetSlip = collect($slips)->firstWhere('worker_id', $worker->id);
        $this->assertNotNull($targetSlip);
        $this->assertEquals('Pak Joko Legendaris', $targetSlip['worker_name']);
        $this->assertStringNotContainsString('Pekerja #', $targetSlip['worker_name']);
    }

    /**
     * Test 3: Soft-deleted staff worker must still resolve in MonthlyPayroll::worker()
     */
    public function test_soft_deleted_worker_relation_in_monthly_payroll(): void
    {
        $worker = Worker::create([
            'worker_code' => 'STF-REL-01',
            'name' => 'Mbak Rini Arsip',
            'type' => 'Staff',
            'process' => 'Finance & Accounting',
            'payment_system' => 'Bulanan',
            'default_salary' => 3500000,
            'status' => 'Aktif',
        ]);

        $period = 'Desember 2026';
        $payroll = MonthlyPayroll::create([
            'payroll_number' => 'PYM-REL-001',
            'worker_id' => $worker->id,
            'worker_name' => $worker->name,
            'position' => $worker->process,
            'period' => $period,
            'basic_salary' => 3500000,
            'total_salary' => 3500000,
            'status' => 'Diperiksa',
        ]);

        // Soft delete worker
        $worker->delete();

        // Verify relationship
        $reloaded = MonthlyPayroll::with('worker')->find($payroll->id);
        $this->assertNotNull($reloaded->worker);
        $this->assertEquals('Mbak Rini Arsip', $reloaded->worker->name);

        // Verify API
        $response = $this->actingAs($this->adminUser)
            ->getJson("/api/payroll-bulanan?period=" . urlencode($period));

        $response->assertStatus(200);
        $items = $response->json('data');
        $target = collect($items)->firstWhere('worker_id', $worker->id);
        $this->assertNotNull($target);
        $this->assertEquals('Mbak Rini Arsip', $target['worker_name']);
    }

    /**
     * Test 4: Cascade deletion from DailyProduction to DailyProductionItem.
     */
    public function test_cascade_delete_daily_production_and_items(): void
    {
        $worker = Worker::create([
            'worker_code' => 'PKR-REL-03',
            'name' => 'Pekerja Cascade',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-CAS-001',
            'production_date' => now()->format('Y-m-d'),
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 60,
            'total_wage' => 21000,
            'status' => 'Draft',
        ]);

        $item1 = DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_name' => 'Baggy Pants',
            'qty' => 30,
            'rate' => 350,
            'total_wage' => 10500,
        ]);

        $item2 = DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_name' => 'Scuba Pants',
            'qty' => 30,
            'rate' => 350,
            'total_wage' => 10500,
        ]);

        // Hapus header via controller
        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/daily-productions/{$prod->id}");

        $response->assertStatus(200);

        // Header harus terhapus
        $this->assertDatabaseMissing('daily_productions', ['id' => $prod->id]);
        // Semua detail items harus ikut terhapus via ON DELETE CASCADE
        $this->assertDatabaseMissing('daily_production_items', ['id' => $item1->id]);
        $this->assertDatabaseMissing('daily_production_items', ['id' => $item2->id]);
    }

    /**
     * Test 5: Soft-deleted product maintains relationship in DailyProductionItem withTrashed().
     */
    public function test_soft_deleted_product_relation_in_daily_production_item(): void
    {
        $group = ProductGroup::firstOrCreate(['name' => 'TEST GROUP']);

        $product = Product::create([
            'sku' => 'PRD-TST-REL-01',
            'name' => 'Produk Relasi Test',
            'unit' => 'pcs',
            'product_group_id' => $group->id,
            'status' => 1,
        ]);

        $worker = Worker::create([
            'worker_code' => 'PKR-REL-04',
            'name' => 'Pekerja Item Test',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-PRD-001',
            'production_date' => now()->format('Y-m-d'),
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 10,
            'total_wage' => 3500,
            'status' => 'Tercatat',
        ]);

        $item = DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'qty' => 10,
            'rate' => 350,
            'total_wage' => 3500,
        ]);

        // Soft delete product
        $product->delete();
        $this->assertSoftDeleted('products', ['id' => $product->id]);

        // Item product relation must resolve withTrashed()
        $reloaded = DailyProductionItem::with('product')->find($item->id);
        $this->assertNotNull($reloaded->product, 'Relasi product() tidak boleh null setelah produk di-soft-delete');
        $this->assertEquals($product->name, $reloaded->product->name);
    }

    /**
     * Test 6: Deleting a production process referenced by workers must soft-deactivate instead of hard deleting.
     */
    public function test_production_process_used_by_workers_is_soft_deactivated(): void
    {
        $process = ProductionProcess::create([
            'process_code' => 'PRC-TST-01',
            'process_name' => 'Proses Uji Relasi',
            'default_rate' => 1500,
            'payroll_day' => 'Kamis',
            'is_active' => true,
        ]);

        // Buat pekerja yang menggunakan proses ini
        Worker::create([
            'worker_code' => 'PKR-REL-05',
            'name' => 'Pekerja Uji Proses',
            'type' => 'Produksi',
            'process' => $process->process_name,
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        // Coba hapus proses via API
        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/production-processes/{$process->id}");

        $response->assertStatus(200);

        // Record proses TIDAK BOLEH hilang dari DB
        $this->assertDatabaseHas('production_processes', [
            'id' => $process->id,
            'is_active' => 0, // Telah dinonaktifkan (soft deactivated)
        ]);

        $this->assertStringContainsString('dinonaktifkan', $response->json('message'));
    }

    /**
     * Test 7: User inverse relationships (worker, dailyProductions, financeTransactions).
     */
    public function test_user_inverse_relationships(): void
    {
        $user = User::create([
            'name' => 'Operator Relasi',
            'email' => 'operator_rel@fashol.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);

        $worker = Worker::create([
            'user_id' => $user->id,
            'worker_code' => 'PKR-USR-01',
            'name' => 'Operator Relasi',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'status' => 'Aktif',
        ]);

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-USR-001',
            'production_date' => now()->format('Y-m-d'),
            'worker_id' => $worker->id,
            'process_name' => 'Jahit',
            'total_qty' => 10,
            'total_wage' => 25000,
            'status' => 'Tercatat',
            'created_by' => $user->id,
        ]);

        $trx = FinanceTransaction::create([
            'transaction_number' => 'TRX-USR-001',
            'type' => 'expense',
            'category' => 'Beban Perlengkapan',
            'cost_type' => 'Operasional Usaha',
            'title' => 'Beli Jarum Jahit',
            'amount' => 50000,
            'transaction_date' => now()->format('Y-m-d'),
            'created_by' => $user->id,
        ]);

        $this->assertNotNull($user->worker);
        $this->assertEquals($worker->id, $user->worker->id);

        $this->assertTrue($user->dailyProductions->contains('id', $prod->id));
        $this->assertTrue($user->financeTransactions->contains('id', $trx->id));
    }

    /**
     * Test 8: Worker has true database foreign key and Eloquent relation to StaffPosition.
     */
    public function test_worker_staff_position_foreign_key_and_bidirectional_relation(): void
    {
        $pos = StaffPosition::firstOrCreate(
            ['name' => 'Koordinator Finansial'],
            ['department' => 'Keuangan', 'is_active' => true]
        );

        $worker = Worker::create([
            'worker_code' => 'STF-FK-01',
            'name' => 'Ibu Siti Akuntan',
            'type' => 'Staff',
            'staff_position_id' => $pos->id,
            'process' => $pos->name,
            'payment_system' => 'Bulanan',
            'default_salary' => 4500000,
            'status' => 'Aktif',
        ]);

        // Direct database verification
        $this->assertDatabaseHas('workers', [
            'id' => $worker->id,
            'staff_position_id' => $pos->id,
            'process' => 'Koordinator Finansial',
        ]);

        // Eloquent forward relation: $worker->staffPosition
        $reloadedWorker = Worker::with('staffPosition')->find($worker->id);
        $this->assertNotNull($reloadedWorker->staffPosition);
        $this->assertEquals($pos->id, $reloadedWorker->staffPosition->id);
        $this->assertEquals('Keuangan', $reloadedWorker->staffPosition->department);

        // Eloquent reverse relation: $pos->workers
        $reloadedPos = StaffPosition::with('workers')->find($pos->id);
        $this->assertTrue($reloadedPos->workers->contains('id', $worker->id));
    }

    /**
     * Test 9: Worker has true database foreign key and Eloquent relation to ProductionProcess.
     */
    public function test_worker_production_process_foreign_key_and_bidirectional_relation(): void
    {
        $proc = ProductionProcess::firstOrCreate(
            ['process_name' => 'Bordir Komputer Khusus'],
            ['process_code' => 'BKK', 'default_rate' => 1200, 'payroll_day' => 'Kamis']
        );

        $worker = Worker::create([
            'worker_code' => 'PKR-FK-01',
            'name' => 'Pak Slamet Bordir',
            'type' => 'Produksi',
            'production_process_id' => $proc->id,
            'process' => $proc->process_name,
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        // Direct database verification
        $this->assertDatabaseHas('workers', [
            'id' => $worker->id,
            'production_process_id' => $proc->id,
            'process' => 'Bordir Komputer Khusus',
        ]);

        // Eloquent forward relation: $worker->productionProcess
        $reloadedWorker = Worker::with('productionProcess')->find($worker->id);
        $this->assertNotNull($reloadedWorker->productionProcess);
        $this->assertEquals($proc->id, $reloadedWorker->productionProcess->id);

        // Eloquent reverse relation: $proc->workers
        $reloadedProc = ProductionProcess::with('workers')->find($proc->id);
        $this->assertTrue($reloadedProc->workers->contains('id', $worker->id));
    }

    /**
     * Test 10: Creating and updating worker via API automatically synchronizes foreign keys.
     */
    public function test_api_store_and_update_worker_automatically_links_foreign_keys(): void
    {
        $pos = StaffPosition::firstOrCreate(
            ['name' => 'Supervisor QC Finishing'],
            ['department' => 'Produksi', 'is_active' => true]
        );

        // Store via API sending position name in process
        $storeResp = $this->actingAs($this->adminUser)->postJson('/api/workers', [
            'name' => 'Mbak Maya QC',
            'type' => 'Staff',
            'process' => 'Supervisor QC Finishing',
            'payment_system' => 'Bulanan',
            'default_salary' => 3000000,
            'status' => 'Aktif',
        ]);

        $storeResp->assertStatus(201);
        $workerId = $storeResp->json('data.id');
        $this->assertEquals($pos->id, $storeResp->json('data.staff_position_id'));

        // Update to another position using staff_position_id
        $newPos = StaffPosition::firstOrCreate(
            ['name' => 'Kepala Gudang Ekspedisi'],
            ['department' => 'Logistik', 'is_active' => true]
        );

        $updateResp = $this->actingAs($this->adminUser)->putJson("/api/workers/{$workerId}", [
            'staff_position_id' => $newPos->id,
        ]);

        $updateResp->assertStatus(200);
        $this->assertEquals($newPos->id, $updateResp->json('data.staff_position_id'));
        $this->assertEquals('Kepala Gudang Ekspedisi', $updateResp->json('data.process'));
    }

    /**
     * Test 11: Renaming a StaffPosition automatically synchronizes workers' process column.
     */
    public function test_updating_staff_position_name_syncs_worker_process(): void
    {
        $pos = StaffPosition::create([
            'name' => 'Spesialis Medsos Lama',
            'department' => 'Pemasaran',
            'is_active' => true,
        ]);

        $worker = Worker::create([
            'worker_code' => 'STF-RN-01',
            'name' => 'Rian Marketing',
            'type' => 'Staff',
            'staff_position_id' => $pos->id,
            'process' => $pos->name,
            'payment_system' => 'Bulanan',
            'status' => 'Aktif',
        ]);

        // Rename position via API
        $resp = $this->actingAs($this->adminUser)->postJson('/api/settings/staff-positions', [
            'id' => $pos->id,
            'name' => 'Digital Marketing Lead',
            'department' => 'Pemasaran',
        ]);

        $resp->assertStatus(200);

        // Verify worker process column was automatically updated
        $this->assertDatabaseHas('workers', [
            'id' => $worker->id,
            'staff_position_id' => $pos->id,
            'process' => 'Digital Marketing Lead',
        ]);
    }

    /**
     * Test 12: ProductProcessRate has true foreign keys and bidirectional relations to ProductionProcess and ProductGroup.
     */
    public function test_product_process_rate_foreign_keys_and_relations(): void
    {
        $group = ProductGroup::firstOrCreate(
            ['name' => 'BAGGY TEST REL'],
            ['long_name' => 'Baggy Pants Test Relasi', 'description' => 'Grup uji relasi']
        );

        $process = ProductionProcess::firstOrCreate(
            ['process_name' => 'Kansay Test Rel'],
            ['process_code' => 'KTR', 'default_rate' => 200, 'payroll_day' => 'Kamis']
        );

        $rate = ProductProcessRate::create([
            'product_name' => $group->name,
            'product_group_id' => $group->id,
            'production_process_id' => $process->id,
            'process_name' => $process->process_name,
            'rate' => 250,
            'is_custom_rate' => true,
            'unit' => 'Pcs',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('product_process_rates', [
            'id' => $rate->id,
            'product_group_id' => $group->id,
            'production_process_id' => $process->id,
        ]);

        // Forward relations
        $reloaded = ProductProcessRate::with(['productGroup', 'productionProcess'])->find($rate->id);
        $this->assertNotNull($reloaded->productGroup);
        $this->assertEquals($group->id, $reloaded->productGroup->id);
        $this->assertNotNull($reloaded->productionProcess);
        $this->assertEquals($process->id, $reloaded->productionProcess->id);

        // Reverse relations
        $this->assertTrue($process->productRates->contains('id', $rate->id));
        $this->assertTrue($group->rates->contains('id', $rate->id));
    }

    /**
     * Test 13: DailyProduction has true foreign key and relation to ProductionProcess.
     */
    public function test_daily_production_production_process_foreign_key_and_relation(): void
    {
        $process = ProductionProcess::firstOrCreate(
            ['process_name' => 'Overdek Rel Test'],
            ['process_code' => 'ORT', 'default_rate' => 200, 'payroll_day' => 'Kamis']
        );

        $worker = Worker::create([
            'worker_code' => 'PKR-DP-01',
            'name' => 'Pak Joko Overdek',
            'type' => 'Produksi',
            'production_process_id' => $process->id,
            'process' => $process->process_name,
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-REL-PROC-01',
            'production_date' => now()->format('Y-m-d'),
            'worker_id' => $worker->id,
            'production_process_id' => $process->id,
            'process_name' => $process->process_name,
            'total_qty' => 40,
            'total_wage' => 8000,
            'status' => 'Tercatat',
        ]);

        $this->assertDatabaseHas('daily_productions', [
            'id' => $prod->id,
            'production_process_id' => $process->id,
        ]);

        $reloaded = DailyProduction::with('productionProcess')->find($prod->id);
        $this->assertNotNull($reloaded->productionProcess);
        $this->assertEquals($process->id, $reloaded->productionProcess->id);
        $this->assertEquals('Overdek Rel Test', $reloaded->productionProcess->process_name);

        $this->assertTrue($process->dailyProductions->contains('id', $prod->id));
    }

    /**
     * Test 14: ProductHppComponent has true foreign key and relation to ProductGroup.
     */
    public function test_product_hpp_component_product_group_foreign_key_and_relation(): void
    {
        $group = ProductGroup::firstOrCreate(
            ['name' => 'CHINO TEST REL'],
            ['long_name' => 'Chino Pants Test Relasi', 'description' => 'Test relasi HPP']
        );

        $hpp = ProductHppComponent::firstOrCreate(
            ['product_name' => $group->name],
            [
                'product_group_id' => $group->id,
                'product_code' => 'PRD-CHIN',
                'code' => 'CHN',
                'material_cost' => 15000,
                'labor_cost' => 4500,
                'overhead_cost' => 1000,
                'total_hpp' => 20500,
                'effective_date' => now(),
                'status' => 'Aktif',
            ]
        );

        if (!$hpp->product_group_id) {
            $hpp->update(['product_group_id' => $group->id]);
        }

        $this->assertDatabaseHas('product_hpp_components', [
            'id' => $hpp->id,
            'product_group_id' => $group->id,
        ]);

        $reloaded = ProductHppComponent::with('productGroup')->find($hpp->id);
        $this->assertNotNull($reloaded->productGroup);
        $this->assertEquals($group->id, $reloaded->productGroup->id);

        $reloadedGroup = ProductGroup::with('hppComponent')->find($group->id);
        $this->assertNotNull($reloadedGroup->hppComponent);
        $this->assertEquals($hpp->id, $reloadedGroup->hppComponent->id);
    }

    /**
     * Test 15: MonthlyPayroll has true foreign key and relation to StaffPosition.
     */
    public function test_monthly_payroll_staff_position_foreign_key_and_relation(): void
    {
        $pos = StaffPosition::firstOrCreate(
            ['name' => 'Admin Keuangan Test Rel'],
            ['department' => 'Finance', 'is_active' => true]
        );

        $worker = Worker::create([
            'worker_code' => 'STF-MP-01',
            'name' => 'Mbak Maya Fin',
            'type' => 'Staff',
            'staff_position_id' => $pos->id,
            'process' => $pos->name,
            'payment_system' => 'Bulanan',
            'default_salary' => 3500000,
            'status' => 'Aktif',
        ]);

        $payroll = MonthlyPayroll::create([
            'payroll_number' => 'PYM-TEST-REL-01',
            'worker_id' => $worker->id,
            'staff_position_id' => $pos->id,
            'worker_name' => $worker->name,
            'position' => $pos->name,
            'period' => 'Oktober 2026',
            'basic_salary' => 3500000,
            'allowance' => 200000,
            'overtime' => 0,
            'deductions' => 0,
            'total_salary' => 3700000,
            'status' => 'Draft',
        ]);

        $this->assertDatabaseHas('monthly_payrolls', [
            'id' => $payroll->id,
            'staff_position_id' => $pos->id,
        ]);

        $reloaded = MonthlyPayroll::with('staffPosition')->find($payroll->id);
        $this->assertNotNull($reloaded->staffPosition);
        $this->assertEquals($pos->id, $reloaded->staffPosition->id);

        $this->assertTrue($pos->monthlyPayrolls->contains('id', $payroll->id));
    }

    /**
     * Test 16: DailyProductionItem has true foreign key and relation to ProductGroup.
     */
    public function test_daily_production_item_product_group_foreign_key_and_relation(): void
    {
        $group = ProductGroup::firstOrCreate(
            ['name' => 'CULOTTE TEST REL'],
            ['long_name' => 'Culotte Pants Test Relasi', 'description' => 'Test relasi Item']
        );

        $worker = Worker::create([
            'worker_code' => 'PKR-DPI-01',
            'name' => 'Pak Harun Item',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-REL-ITEM-01',
            'production_date' => now()->format('Y-m-d'),
            'worker_id' => $worker->id,
            'process_name' => 'Jahit',
            'total_qty' => 20,
            'total_wage' => 50000,
            'status' => 'Tercatat',
        ]);

        $item = DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_group_id' => $group->id,
            'product_name' => $group->name,
            'qty' => 20,
            'rate' => 2500,
            'total_wage' => 50000,
        ]);

        $this->assertDatabaseHas('daily_production_items', [
            'id' => $item->id,
            'product_group_id' => $group->id,
        ]);

        $reloaded = DailyProductionItem::with('productGroup')->find($item->id);
        $this->assertNotNull($reloaded->productGroup);
        $this->assertEquals($group->id, $reloaded->productGroup->id);

        $this->assertTrue($group->dailyProductionItems->contains('id', $item->id));
    }
}
