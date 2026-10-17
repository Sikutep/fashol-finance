<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class DashboardTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::where('role', 'owner')->firstOrFail();
    }

    public function test_dashboard_returns_valid_kpis_and_dynamic_period(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/dashboard');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $json = $response->json();
        $this->assertNotEmpty($json['period']);
        $this->assertArrayHasKey('metrics', $json);
        $this->assertArrayHasKey('cashflow_chart', $json);
        $this->assertArrayHasKey('hpp_summary', $json);
        $this->assertArrayHasKey('recent_activities', $json);

        $metrics = $json['metrics'];
        $this->assertArrayHasKey('payroll_this_week', $metrics);
        $this->assertArrayHasKey('total_income', $metrics);
        $this->assertArrayHasKey('total_expense', $metrics);
        $this->assertArrayHasKey('production_cost', $metrics);
    }
}
