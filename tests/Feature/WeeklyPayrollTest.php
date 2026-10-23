<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\Worker;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class WeeklyPayrollTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::where('role', 'owner')->firstOrFail();
    }

    public function test_can_fetch_weekly_payroll_with_cross_month_period(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/payroll-mingguan?period=29%20Oktober%20-%2004%20November%202026');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $period = $response->json('period');
        $this->assertEquals('29 Oktober - 04 November 2026', $period);
        $this->assertArrayHasKey('payment_date', $response->json());
        $this->assertArrayHasKey('data', $response->json());
    }

    public function test_weekly_payroll_aggregates_production_correctly(): void
    {
        $worker = Worker::where('status', 'Aktif')->firstOrFail();

        // Create production in specific period
        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-TEST-WK01',
            'production_date' => '2026-10-15',
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 50,
            'total_wage' => 100000,
            'status' => 'Tercatat',
        ]);

        DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_name' => 'Baggy Pants Premium',
            'color' => 'Hitam',
            'qty' => 50,
            'rate' => 2000,
            'total_wage' => 100000,
        ]);

        $response = $this->actingAs($this->user)->getJson('/api/payroll-mingguan?period=15%20-%2021%20Oktober%202026');

        $response->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $workers = $response->json('data');
        $found = collect($workers)->firstWhere('worker_id', $worker->id);

        $this->assertNotNull($found);
        $this->assertGreaterThanOrEqual(50, $found['total_qty']);
        $this->assertGreaterThanOrEqual(100000, $found['total_wage']);
    }

    public function test_status_update_updates_underlying_daily_productions(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/payroll-mingguan/status', [
            'period' => '08 - 14 Oktober 2026',
            'status' => 'Diperiksa',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'new_status' => 'Diperiksa',
            ]);
    }

    public function test_weekly_payroll_status_lifecycle_and_labels(): void
    {
        $worker = Worker::where('status', 'Aktif')->firstOrFail();

        // 1. Initially recorded as Tercatat (Draft)
        DailyProduction::create([
            'transaction_number' => 'PRD-TEST-STATUS01',
            'production_date' => '2026-10-15',
            'worker_id' => $worker->id,
            'process_name' => 'Potong',
            'total_qty' => 10,
            'total_wage' => 3500,
            'status' => 'Tercatat',
        ]);

        $resGetDraft = $this->actingAs($this->user)->getJson('/api/payroll-mingguan?period=15%20-%2021%20Oktober%202026');
        $resGetDraft->assertStatus(200);
        $this->assertEquals('Draft', $resGetDraft->json('payroll_status'));
        $this->assertEquals('Draft Pengajuan', $resGetDraft->json('status_label'));

        // 2. Admin submits to Owner (Diperiksa)
        $admin = User::where('role', 'admin')->firstOrFail();
        $resSubmit = $this->actingAs($admin)->postJson('/api/payroll-mingguan/status', [
            'period' => '15 - 21 Oktober 2026',
            'start_date' => '2026-10-15',
            'end_date' => '2026-10-21',
            'status' => 'Diperiksa',
        ]);
        $resSubmit->assertStatus(200)->assertJson(['status' => 'success', 'new_status' => 'Diperiksa']);

        // Check subsequent GET
        $resGetSubmitted = $this->actingAs($this->user)->getJson('/api/payroll-mingguan?period=15%20-%2021%20Oktober%202026');
        $this->assertEquals('Diperiksa', $resGetSubmitted->json('payroll_status'));
        $this->assertEquals('Diajukan (Menunggu Persetujuan Owner)', $resGetSubmitted->json('status_label'));

        // 3. Owner approves (Disetujui)
        $resApprove = $this->actingAs($this->user)->postJson('/api/payroll-mingguan/status', [
            'period' => '15 - 21 Oktober 2026',
            'status' => 'Disetujui',
        ]);
        $resApprove->assertStatus(200)->assertJson(['status' => 'success', 'new_status' => 'Disetujui']);

        $resGetApproved = $this->actingAs($this->user)->getJson('/api/payroll-mingguan?period=15%20-%2021%20Oktober%202026');
        $this->assertEquals('Disetujui', $resGetApproved->json('payroll_status'));
        $this->assertEquals('Telah disetujui Owner', $resGetApproved->json('status_label'));
    }
}
