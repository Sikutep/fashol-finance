<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\ProductHppComponent;
use App\Models\MonthlyPayroll;
use App\Models\DailyProduction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class ZeroHardcodeAuditTest extends TestCase
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
     * Test 1: Verifikasi pencocokan grup produk pada DailyProductionController
     * bekerja 100% dinamis dari tabel product_groups tanpa hardcoded switch/case.
     */
    public function test_daily_production_dynamic_product_group_matching_without_hardcoded_names(): void
    {
        $worker = Worker::where('status', 'Aktif')->first();
        $this->assertNotNull($worker);

        // Ambil grup produk yang ada di database
        $groups = ProductGroup::all();
        $this->assertNotEmpty($groups);

        foreach ($groups as $grp) {
            // Ambil tarif aktif untuk grup ini
            $rate = ProductProcessRate::where('product_name', $grp->name)
                ->where('is_active', true)
                ->first();

            if (!$rate) {
                continue;
            }

            // Kirim transaksi harian menggunakan nama grup langsung
            $res = $this->actingAs($this->adminUser)->postJson('/api/daily-productions', [
                'production_date' => '2026-10-17',
                'worker_id' => $worker->id,
                'process_name' => $rate->process_name,
                'product_name' => $grp->name,
                'variation' => 'All Size',
                'color' => 'Hitam',
                'qty' => 10,
            ]);

            $res->assertStatus(201)
                ->assertJson(['status' => 'success']);

            $expectedWage = 10 * (float) $rate->rate;
            $this->assertEquals($expectedWage, (float) $res->json('data.total_wage'), "Total upah untuk grup {$grp->name} harus dihitung dinamis: {$expectedWage}");
        }
    }

    /**
     * Test 2: Verifikasi payroll bulanan mewarisi gaji pekerja secara dinamis
     * dari riwayat database terakhir tanpa angka hardcoded.
     */
    public function test_monthly_payroll_inherits_salary_dynamically_without_hardcoded_numbers(): void
    {
        $staffWorker = Worker::where('type', 'Staff')->first();
        if (!$staffWorker) {
            $staffWorker = Worker::create([
                'worker_code' => 'PKR-TEST-STF',
                'name' => 'Staff Uji Dinamis',
                'type' => 'Staff',
                'process' => 'Finance / Kasir',
                'payment_system' => 'Bulanan',
                'status' => 'Aktif',
            ]);
        }

        // Buat record riwayat gaji sebelumnya dengan angka custom
        $customBasic = 6850000.0;
        $customAllowance = 1150000.0;

        MonthlyPayroll::create([
            'payroll_number' => 'PYM-TEST-PREV',
            'worker_id' => $staffWorker->id,
            'worker_name' => $staffWorker->name,
            'position' => $staffWorker->process,
            'period' => 'Oktober 2026',
            'basic_salary' => $customBasic,
            'allowance' => $customAllowance,
            'overtime' => 0,
            'deductions' => 0,
            'total_salary' => $customBasic + $customAllowance,
            'status' => 'Dibayar',
        ]);

        // Request periode baru: November 2026
        $res = $this->actingAs($this->adminUser)->getJson('/api/payroll-bulanan?period=November 2026');
        $res->assertStatus(200)->assertJson(['status' => 'success']);

        $item = collect($res->json('data'))->firstWhere('worker_id', $staffWorker->id);
        $this->assertNotNull($item, "Pekerja harus ada di periode baru");

        // Gaji dasar dan tunjangan harus diwarisi dari riwayat terakhir, bukan angka hardcoded!
        $this->assertEquals($customBasic, (float) $item['basic_salary']);
        $this->assertEquals($customAllowance, (float) $item['allowance']);
        $this->assertEquals($customBasic + $customAllowance, (float) $item['total_salary']);
    }

    /**
     * Test 3: Verifikasi target HPP di rekap biaya produksi dihitung 100% dinamis dari database.
     */
    public function test_rekap_biaya_produksi_target_hpp_is_computed_dynamically(): void
    {
        $res = $this->actingAs($this->adminUser)->getJson('/api/rekap-biaya-produksi');
        $res->assertStatus(200)->assertJson(['status' => 'success']);

        $expectedTarget = (float) ProductHppComponent::where('status', 'Aktif')->avg('total_hpp');
        if ($expectedTarget <= 0) {
            $expectedTarget = (float) ProductProcessRate::where('is_active', true)->sum('rate');
        }

        $actualTarget = (float) $res->json('summary.target_avg_hpp');
        $this->assertEquals($expectedTarget, $actualTarget, "Target HPP harus sama dengan rata-rata database");
    }

    /**
     * Test 4: Verifikasi generator kode pekerja (PKR-xxx) tidak pernah duplikat/kolisi.
     */
    public function test_worker_code_generation_never_collides(): void
    {
        $res1 = $this->actingAs($this->adminUser)->postJson('/api/workers', [
            'name' => 'Pekerja Uji Unik 1',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'status' => 'Aktif',
        ]);
        $res1->assertStatus(201);
        $code1 = $res1->json('data.worker_code');

        $res2 = $this->actingAs($this->adminUser)->postJson('/api/workers', [
            'name' => 'Pekerja Uji Unik 2',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'status' => 'Aktif',
        ]);
        $res2->assertStatus(201);
        $code2 = $res2->json('data.worker_code');

        $this->assertNotEquals($code1, $code2, "Kode pekerja tidak boleh sama");
    }
}
