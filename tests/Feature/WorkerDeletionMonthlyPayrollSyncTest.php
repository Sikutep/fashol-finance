<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\MonthlyPayroll;
use App\Models\DailyProduction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class WorkerDeletionMonthlyPayrollSyncTest extends TestCase
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
     * Test 1: Deleted worker in Master Pekerja should NOT appear in Monthly Payroll.
     */
    public function test_deleted_worker_does_not_appear_in_monthly_payroll(): void
    {
        // 1. Create a temporary staff worker
        $tempWorker = Worker::create([
            'worker_code' => 'PKR-TEST-DEL',
            'name' => 'Budi Test Delete',
            'type' => 'Staff',
            'process' => 'Packing',
            'payment_system' => 'Bulanan',
            'default_salary' => 1500000,
            'status' => 'Aktif',
        ]);

        $period = 'Oktober 2026';

        // 2. Load payroll bulanan - should generate/include Budi
        $resBefore = $this->actingAs($this->adminUser)->getJson("/api/payroll-bulanan?period=" . urlencode($period));
        $resBefore->assertStatus(200);
        $namesBefore = collect($resBefore->json('data'))->pluck('worker_name')->toArray();
        $this->assertContains('Budi Test Delete', $namesBefore);

        // 3. Delete Budi via DELETE /api/pekerja/{id} or WorkerController::destroy
        $delRes = $this->actingAs($this->adminUser)->deleteJson("/api/workers/{$tempWorker->id}");
        $delRes->assertStatus(200);

        // 4. Load payroll bulanan again - Budi MUST be gone from response!
        $resAfter = $this->actingAs($this->adminUser)->getJson("/api/payroll-bulanan?period=" . urlencode($period));
        $resAfter->assertStatus(200);
        $namesAfter = collect($resAfter->json('data'))->pluck('worker_name')->toArray();
        $this->assertNotContains('Budi Test Delete', $namesAfter);
    }

    /**
     * Test 2: Verify Atep and Marsaa do not appear in active Monthly Payroll.
     */
    public function test_atep_and_marsaa_do_not_appear_in_monthly_payroll(): void
    {
        $res = $this->actingAs($this->ownerUser)->getJson('/api/payroll-bulanan?period=Oktober%202026');
        $res->assertStatus(200);

        $names = collect($res->json('data'))->pluck('worker_name')->toArray();

        foreach ($names as $name) {
            $this->assertStringNotContainsStringIgnoringCase('Atep', $name, "Atep found in monthly payroll!");
            $this->assertStringNotContainsStringIgnoringCase('Marsaa', $name, "Marsaa found in monthly payroll!");
        }
    }

    /**
     * Test 3: Worker with paid history is soft-deleted, but unfinalized records in current period are purged.
     */
    public function test_worker_with_paid_history_is_soft_deleted_and_unpaid_payroll_is_purged(): void
    {
        $worker = Worker::create([
            'worker_code' => 'PKR-HIST-PAID',
            'name' => 'Karyawan Bersejarah',
            'type' => 'Staff',
            'process' => 'Finance',
            'payment_system' => 'Bulanan',
            'default_salary' => 2500000,
            'status' => 'Aktif',
        ]);

        // Historical paid payroll in September 2026
        MonthlyPayroll::create([
            'payroll_number' => 'PYM-2609-99',
            'worker_id' => $worker->id,
            'worker_name' => $worker->name,
            'position' => $worker->process,
            'period' => 'September 2026',
            'basic_salary' => 2500000,
            'allowance' => 0,
            'overtime' => 0,
            'deductions' => 0,
            'total_salary' => 2500000,
            'status' => 'Dibayar',
        ]);

        // Unpaid draft in Oktober 2026
        MonthlyPayroll::create([
            'payroll_number' => 'PYM-2610-99',
            'worker_id' => $worker->id,
            'worker_name' => $worker->name,
            'position' => $worker->process,
            'period' => 'Oktober 2026',
            'basic_salary' => 2500000,
            'allowance' => 0,
            'overtime' => 0,
            'deductions' => 0,
            'total_salary' => 2500000,
            'status' => 'Draft',
        ]);

        // Delete worker
        $delRes = $this->actingAs($this->adminUser)->deleteJson("/api/workers/{$worker->id}");
        $delRes->assertStatus(200);

        // Worker should be soft-deleted to keep historical paid slip safe
        $this->assertSoftDeleted('workers', ['id' => $worker->id]);

        // Soft-deleted worker must NOT appear in unpaid period (Oktober 2026)
        $resCurrent = $this->actingAs($this->adminUser)->getJson('/api/payroll-bulanan?period=Oktober%202026');
        $resCurrent->assertStatus(200);
        $namesCurrent = collect($resCurrent->json('data'))->pluck('worker_name')->toArray();
        $this->assertNotContains('Karyawan Bersejarah', $namesCurrent);

        // Historical paid slip for September 2026 MUST be kept in DB and returned in paid period
        $this->assertDatabaseHas('monthly_payrolls', [
            'worker_id' => $worker->id,
            'period' => 'September 2026',
            'status' => 'Dibayar',
        ]);

        $resPast = $this->actingAs($this->adminUser)->getJson('/api/payroll-bulanan?period=September%202026');
        $resPast->assertStatus(200);
        $namesPast = collect($resPast->json('data'))->pluck('worker_name')->toArray();
        $this->assertContains('Karyawan Bersejarah', $namesPast);
    }
}
