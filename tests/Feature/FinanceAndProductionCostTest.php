<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\FinanceTransaction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class FinanceAndProductionCostTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::where('role', 'admin')->firstOrFail();
    }

    public function test_can_record_income_and_expense_with_sequential_numbering(): void
    {
        $payload1 = [
            'type' => 'income',
            'category' => 'Setoran Penjualan Marketplace',
            'title' => 'Penjualan Batch 1',
            'amount' => 1500000,
            'transaction_date' => '2026-10-15',
        ];

        $res1 = $this->actingAs($this->user)->postJson('/api/keuangan', $payload1);
        $res1->assertStatus(201);
        $num1 = $res1->json('data.transaction_number');

        $payload2 = [
            'type' => 'expense',
            'category' => 'Bahan Baku & Aksesori',
            'title' => 'Beli benang',
            'amount' => 500000,
            'transaction_date' => '2026-10-15',
        ];

        $res2 = $this->actingAs($this->user)->postJson('/api/keuangan', $payload2);
        $res2->assertStatus(201);
        $num2 = $res2->json('data.transaction_number');

        $this->assertNotEquals($num1, $num2);
        $this->assertStringStartsWith('TRX-261015-', $num1);
        $this->assertStringStartsWith('TRX-261015-', $num2);
    }

    public function test_production_cost_summary_filters_by_requested_period(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/rekap-biaya-produksi?period=Oktober%202026');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $json = $response->json();
        $this->assertEquals('Oktober 2026', $json['period']);
        $this->assertArrayHasKey('summary', $json);
        $this->assertArrayHasKey('components', $json);

        $summary = $json['summary'];
        $this->assertArrayHasKey('total_cost', $summary);
        $this->assertArrayHasKey('target_avg_hpp', $summary);
        $this->assertArrayHasKey('efficiency_percentage', $summary);
    }
}
