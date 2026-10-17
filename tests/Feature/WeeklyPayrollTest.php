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
}
