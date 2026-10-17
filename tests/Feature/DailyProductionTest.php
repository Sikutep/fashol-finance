<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\ProductProcessRate;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class DailyProductionTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Worker $activeWorker;
    protected Worker $inactiveWorker;

    protected function setUp(): void
    {
        parent::setUp();

        \App\Http\Controllers\FinanceExtendedController::ensureHppStandardsExist();

        $this->user = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
        $this->activeWorker = Worker::where('status', 'Aktif')->first() ?? Worker::create([
            'worker_code' => 'PKR-TEST-ACTIVE',
            'name' => 'Pekerja Aktif Test',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'status' => 'Aktif',
        ]);
        $this->inactiveWorker = Worker::where('status', 'Nonaktif')->first() ?? Worker::create([
            'worker_code' => 'PKR-TEST-INACTIVE',
            'name' => 'Pekerja Nonaktif Test',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'status' => 'Nonaktif',
        ]);
    }

    public function test_can_record_daily_production_with_valid_worker_and_configured_rate(): void
    {
        $payload = [
            'worker_id' => $this->activeWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Potong',
            'product_id' => 1,
            'product_name' => 'Baggy Pants Premium',
            'color' => 'Hitam',
            'qty' => 20,
            'notes' => 'Batch uji',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/daily-productions', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'worker_id' => $this->activeWorker->id,
                    'process_name' => 'Potong',
                    'total_qty' => 20,
                    'total_wage' => 7000,
                    'status' => 'Tercatat',
                ],
            ]);
    }

    public function test_can_record_multi_item_daily_production(): void
    {
        $payload = [
            'worker_id' => $this->activeWorker->id,
            'production_date' => '2026-10-16',
            'process_name' => 'Potong',
            'items' => [
                [
                    'product_id' => 1,
                    'product_name' => 'Baggy Pants Premium',
                    'color' => 'Navy',
                    'qty' => 10,
                ],
                [
                    'product_id' => 1,
                    'product_name' => 'Baggy Pants Premium',
                    'color' => 'Hitam',
                    'qty' => 15,
                ],
            ],
            'notes' => 'Batch multi item',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/daily-productions', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'total_qty' => 25,
                    'total_wage' => 8750,
                ],
            ]);
    }

    public function test_rejects_production_if_worker_is_inactive(): void
    {
        $payload = [
            'worker_id' => $this->inactiveWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Potong',
            'product_id' => 1,
            'product_name' => 'Baggy Pants Premium',
            'qty' => 10,
        ];

        $response = $this->actingAs($this->user)->postJson('/api/daily-productions', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    public function test_rejects_production_when_rate_is_not_configured_in_hpp(): void
    {
        // 'Bordir Manual' does not have a rate configured for 'BAGGY'
        $payload = [
            'worker_id' => $this->activeWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Bordir Manual',
            'product_id' => 1,
            'product_name' => 'BAGGY',
            'qty' => 10,
        ];

        $response = $this->actingAs($this->user)->postJson('/api/daily-productions', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    public function test_sequential_transaction_number_generation(): void
    {
        $payload = [
            'worker_id' => $this->activeWorker->id,
            'production_date' => '2026-10-15',
            'process_name' => 'Potong',
            'product_id' => 1,
            'product_name' => 'Baggy Pants Premium',
            'qty' => 5,
        ];

        $res1 = $this->actingAs($this->user)->postJson('/api/daily-productions', $payload);
        $res1->assertStatus(201);
        $num1 = $res1->json('data.transaction_number');

        $res2 = $this->actingAs($this->user)->postJson('/api/daily-productions', $payload);
        $res2->assertStatus(201);
        $num2 = $res2->json('data.transaction_number');

        $this->assertNotEquals($num1, $num2);
        $this->assertStringStartsWith('PRD-2610', $num1);
        $this->assertStringStartsWith('PRD-2610', $num2);
    }

    public function test_cannot_delete_production_with_payroll_locked_status(): void
    {
        $production = DailyProduction::whereIn('status', ['Masuk Payroll', 'Disetujui', 'Dibayar'])->first();
        if (!$production) {
            $production = DailyProduction::create([
                'transaction_number' => 'PRD-TEST-99',
                'production_date' => '2026-10-15',
                'worker_id' => $this->activeWorker->id,
                'process_name' => 'Potong',
                'total_qty' => 10,
                'total_wage' => 20000,
                'status' => 'Masuk Payroll',
            ]);
        }

        $response = $this->actingAs($this->user)->deleteJson("/api/daily-productions/{$production->id}");

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);

        $this->assertDatabaseHas('daily_productions', ['id' => $production->id]);
    }

    public function test_can_delete_production_with_tercatat_status(): void
    {
        $production = DailyProduction::create([
            'transaction_number' => 'PRD-TEST-98',
            'production_date' => '2026-10-15',
            'worker_id' => $this->activeWorker->id,
            'process_name' => 'Potong',
            'total_qty' => 10,
            'total_wage' => 20000,
            'status' => 'Tercatat',
        ]);

        DailyProductionItem::create([
            'daily_production_id' => $production->id,
            'product_name' => 'Baggy Pants Premium',
            'qty' => 10,
            'rate' => 2000,
            'total_wage' => 20000,
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/daily-productions/{$production->id}");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseMissing('daily_productions', ['id' => $production->id]);
        $this->assertDatabaseMissing('daily_production_items', ['daily_production_id' => $production->id]);
    }
}
