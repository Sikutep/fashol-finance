<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\MonthlyPayroll;
use App\Models\ProductHppComponent;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class RoleAuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $ownerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::where('role', 'admin')->firstOrFail();
        $this->ownerUser = User::where('role', 'owner')->firstOrFail();
    }

    public function test_admin_cannot_approve_or_pay_weekly_payroll(): void
    {
        // Admin attempts to approve
        $resApprove = $this->actingAs($this->adminUser)->postJson('/api/payroll-mingguan/status', [
            'status' => 'Disetujui',
            'period' => '08 - 14 Oktober 2026',
        ]);
        $resApprove->assertStatus(403)
            ->assertJson([
                'status' => 'error',
            ]);

        // Admin attempts to mark paid
        $resPay = $this->actingAs($this->adminUser)->postJson('/api/payroll-mingguan/status', [
            'status' => 'Dibayar',
            'period' => '08 - 14 Oktober 2026',
        ]);
        $resPay->assertStatus(403)
            ->assertJson([
                'status' => 'error',
            ]);

        // Admin CAN submit to review (Diperiksa)
        $resSubmit = $this->actingAs($this->adminUser)->postJson('/api/payroll-mingguan/status', [
            'status' => 'Diperiksa',
            'period' => '08 - 14 Oktober 2026',
        ]);
        $resSubmit->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }

    public function test_owner_can_approve_and_pay_weekly_payroll(): void
    {
        // Owner approves
        $resApprove = $this->actingAs($this->ownerUser)->postJson('/api/payroll-mingguan/status', [
            'status' => 'Disetujui',
            'period' => '08 - 14 Oktober 2026',
        ]);
        $resApprove->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'new_status' => 'Disetujui',
            ]);

        // Owner marks paid
        $resPay = $this->actingAs($this->ownerUser)->postJson('/api/payroll-mingguan/status', [
            'status' => 'Dibayar',
            'period' => '08 - 14 Oktober 2026',
        ]);
        $resPay->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'new_status' => 'Dibayar',
            ]);
    }

    public function test_admin_cannot_approve_or_pay_monthly_payroll(): void
    {
        $payroll = MonthlyPayroll::first();
        if (!$payroll) {
            $payroll = MonthlyPayroll::create([
                'payroll_number' => 'PYM-TEST-01',
                'worker_name' => 'Staf Administrasi',
                'position' => 'Admin',
                'period' => 'Oktober 2026',
                'basic_salary' => 5000000,
                'total_salary' => 5000000,
                'status' => 'Draft',
            ]);
        }

        // Admin attempts to approve single
        $resSingle = $this->actingAs($this->adminUser)->postJson("/api/payroll-bulanan/{$payroll->id}/status", [
            'status' => 'Disetujui',
        ]);
        $resSingle->assertStatus(403);

        // Admin attempts to approve all
        $resAll = $this->actingAs($this->adminUser)->postJson("/api/payroll-bulanan/all/status", [
            'status' => 'Disetujui',
            'period' => 'Juni 2025',
        ]);
        $resAll->assertStatus(403);
    }

    public function test_owner_can_approve_monthly_payroll(): void
    {
        $payroll = MonthlyPayroll::first();
        if (!$payroll) {
            $payroll = MonthlyPayroll::create([
                'payroll_number' => 'PYM-TEST-02',
                'worker_name' => 'Staf Finance',
                'position' => 'Finance',
                'period' => 'Oktober 2026',
                'basic_salary' => 5500000,
                'total_salary' => 5500000,
                'status' => 'Draft',
            ]);
        }

        $res = $this->actingAs($this->ownerUser)->postJson("/api/payroll-bulanan/{$payroll->id}/status", [
            'status' => 'Disetujui',
        ]);
        $res->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'new_status' => 'Disetujui',
            ]);
    }

    public function test_only_owner_can_lock_and_validate_hpp_standards(): void
    {
        // Admin attempt -> forbidden
        $resAdmin = $this->actingAs($this->adminUser)->postJson('/api/hpp-produk/status', [
            'status' => 'Aktif',
        ]);
        $resAdmin->assertStatus(403);

        // Owner attempt -> success
        $resOwner = $this->actingAs($this->ownerUser)->postJson('/api/hpp-produk/status', [
            'status' => 'Aktif',
        ]);
        $resOwner->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);
    }
}
