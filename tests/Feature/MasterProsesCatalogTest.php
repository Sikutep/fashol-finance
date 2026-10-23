<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\ProductionProcess;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\DailyProduction;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class MasterProsesCatalogTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);
    }

    public function test_standard_production_processes_auto_seeded(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/production-processes');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data',
                'pagination' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
                'summary' => [
                    'total_processes',
                    'active_processes',
                    'avg_default_rate',
                    'formatted_avg_default_rate',
                ]
            ]);

        // Pastikan proses standar resmi konveksi ada
        $this->assertDatabaseHas('production_processes', ['process_name' => 'Potong', 'default_rate' => 350]);
        $this->assertDatabaseHas('production_processes', ['process_name' => 'Jahit', 'default_rate' => 2500]);
        $this->assertDatabaseHas('production_processes', ['process_name' => 'Overdek', 'default_rate' => 200]);
        $this->assertDatabaseHas('production_processes', ['process_name' => 'Kansay', 'default_rate' => 200]);
        $this->assertDatabaseHas('production_processes', ['process_name' => 'QC', 'default_rate' => 300]);
    }

    public function test_production_processes_search_and_sorting(): void
    {
        // 1. Search filter
        $searchRes = $this->actingAs($this->adminUser)->getJson('/api/production-processes?search=Jahit');
        $searchRes->assertStatus(200);
        $data = $searchRes->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $item) {
            $matched = str_contains(strtolower($item['process_name']), 'jahit') 
                || str_contains(strtolower($item['description'] ?? ''), 'jahit')
                || str_contains(strtolower($item['process_code'] ?? ''), 'jahit');
            $this->assertTrue($matched, "Item {$item['process_name']} must match search query 'jahit'");
        }

        // 2. Sorting by default_rate desc
        $sortRes = $this->actingAs($this->adminUser)->getJson('/api/production-processes?sort_by=default_rate&sort_dir=desc&per_page=50');
        $sortRes->assertStatus(200);
        $sortedData = $sortRes->json('data');
        $rates = array_column($sortedData, 'default_rate');
        $expected = $rates;
        rsort($expected);
        $this->assertEquals($expected, $rates);
    }

    public function test_production_processes_crud(): void
    {
        // 1. Create Process
        $createRes = $this->actingAs($this->adminUser)->postJson('/api/production-processes', [
            'process_name' => 'Steam & Ironing Khusus',
            'process_code' => 'PRC-STM',
            'description' => 'Penyetrikaan uap tahap akhir sebelum packing',
            'default_rate' => 450,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        $createRes->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'process_name' => 'Steam & Ironing Khusus',
                    'default_rate' => 450,
                    'unit' => 'pcs',
                ]
            ]);

        $processId = $createRes->json('data.id');

        // 2. Update Process
        $updateRes = $this->actingAs($this->adminUser)->putJson("/api/production-processes/{$processId}", [
            'default_rate' => 500,
            'description' => 'Penyetrikaan uap upgrade',
        ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'default_rate' => 500,
                    'description' => 'Penyetrikaan uap upgrade',
                ]
            ]);

        // 3. Delete Process
        $deleteRes = $this->actingAs($this->adminUser)->deleteJson("/api/production-processes/{$processId}");
        $deleteRes->assertStatus(200);

        $this->assertDatabaseMissing('production_processes', ['id' => $processId]);
    }

    public function test_production_process_soft_deactivation_if_referenced(): void
    {
        // Buat proses baru
        $process = ProductionProcess::create([
            'process_code' => 'PRC-TESTREF',
            'process_name' => 'Test Referensi Khusus',
            'default_rate' => 600,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        // Hubungkan ke ProductProcessRate
        ProductProcessRate::create([
            'product_name' => 'BAGGY',
            'process_name' => 'Test Referensi Khusus',
            'rate' => 600,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        // Coba delete
        $delRes = $this->actingAs($this->adminUser)->deleteJson("/api/production-processes/{$process->id}");
        $delRes->assertStatus(200);

        // Jangan terhapus permanen dari DB, tapi statusnya dinonaktifkan (arsip) untuk integritas histori
        $this->assertDatabaseHas('production_processes', [
            'id' => $process->id,
            'is_active' => false,
        ]);
    }

    public function test_product_process_rate_with_custom_rate_checkbox(): void
    {
        $baggy = ProductGroup::where('name', 'BAGGY')->first();

        // 1. Simpan tarif khusus (is_custom_rate = true)
        $customRes = $this->actingAs($this->adminUser)->postJson('/api/master-proses', [
            'product_name' => 'BAGGY',
            'product_group_id' => $baggy?->id,
            'process_name' => 'Jahit',
            'rate' => 2750, // Lebih tinggi dari standar bawaan 2500
            'is_custom_rate' => true,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        $customRes->assertStatus(200) // update or create
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseHas('product_process_rates', [
            'product_name' => 'BAGGY',
            'process_name' => 'Jahit',
            'rate' => 2750,
            'is_custom_rate' => true,
        ]);

        // 2. Simpan tarif standar (is_custom_rate = false)
        $stdRes = $this->actingAs($this->adminUser)->postJson('/api/master-proses', [
            'product_name' => 'BAGGY',
            'product_group_id' => $baggy?->id,
            'process_name' => 'Overdek',
            'rate' => 200,
            'is_custom_rate' => false,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        $stdRes->assertStatus(200);

        $this->assertDatabaseHas('product_process_rates', [
            'product_name' => 'BAGGY',
            'process_name' => 'Overdek',
            'is_custom_rate' => false,
        ]);
    }

    public function test_strict_unregistered_product_rate_not_found_until_registered(): void
    {
        // 1. Buat proses standar di katalog Tab 1
        $uniqueProcessName = 'Obras Khusus ' . uniqid();
        ProductionProcess::create([
            'process_code' => 'PRC-' . substr(md5($uniqueProcessName), 0, 6),
            'process_name' => $uniqueProcessName,
            'default_rate' => 850,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        // 2. Option A (Ketat): Jika belum didaftarkan di Tab 2 (Tarif Pekerjaan per Produk), maka rate harus not_found (0)
        $rateRes = $this->actingAs($this->adminUser)->getJson("/api/references/rate?product_name=SCUBA&process_name=" . urlencode($uniqueProcessName));

        $rateRes->assertStatus(200)
            ->assertJson([
                'status' => 'not_found',
                'found' => false,
                'rate' => 0,
            ]);

        // 3. Daftarkan di Tab 2 (Tarif Pekerjaan per Produk)
        $this->actingAs($this->adminUser)->postJson('/api/master-proses', [
            'product_name' => 'SCUBA',
            'process_name' => $uniqueProcessName,
            'rate' => 850,
            'is_custom_rate' => false,
            'is_active' => true,
        ]);

        // 4. Setelah didaftarkan, barulah rate ditemukan
        $rateRes2 = $this->actingAs($this->adminUser)->getJson("/api/references/rate?product_name=SCUBA&process_name=" . urlencode($uniqueProcessName));
        $rateRes2->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'found' => true,
                'rate' => 850,
            ]);
    }
}
