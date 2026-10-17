<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Worker;
use App\Models\ProductGroup;
use App\Models\ProductProcessRate;
use App\Models\ProductHppComponent;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class MasterProsesAndHppSyncTest extends TestCase
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

    public function test_all_existing_users_are_synced_to_master_pekerja(): void
    {
        $response = $this->actingAs($this->adminUser)->postJson('/api/workers/sync-users');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $users = User::all();
        $this->assertGreaterThan(0, $users->count());

        foreach ($users as $user) {
            $this->assertDatabaseHas('workers', [
                'user_id' => $user->id,
                'name' => $user->name,
                'status' => 'Aktif',
            ]);
        }
    }

    public function test_reference_options_dynamically_loads_products_and_groups_from_db(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/references/options');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'workers',
                'products',
                'product_groups',
                'variations',
                'colors',
                'processes',
            ]);

        $products = $response->json('products');
        $groups = $response->json('product_groups');

        // Verify product groups are returned
        $this->assertNotEmpty($groups);
        $this->assertContains('BAGGY', array_column($groups, 'name'));

        // Verify product names are not empty and contains warehouse product groups
        $this->assertNotEmpty($products);
        $this->assertContains('BAGGY', $products);
    }

    public function test_master_proses_crud_lifecycle(): void
    {
        // 1. Fetch Process Rates
        $listRes = $this->actingAs($this->adminUser)->getJson('/api/master-proses');
        $listRes->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data',
                'product_groups',
                'summary' => [
                    'total_rates',
                    'active_rates',
                    'formatted_avg_rate',
                ]
            ]);

        $baggyGroup = ProductGroup::where('name', 'BAGGY')->first();

        // 2. Create New Process Rate
        $createRes = $this->actingAs($this->adminUser)->postJson('/api/master-proses', [
            'product_name' => 'BAGGY',
            'product_group_id' => $baggyGroup?->id,
            'process_name' => 'Pasang Kancing Otomatis',
            'rate' => 1750,
            'unit' => 'pcs',
            'is_active' => true,
        ]);

        $createRes->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'product_name' => 'BAGGY',
                    'process_name' => 'Pasang Kancing Otomatis',
                    'rate' => 1750,
                ]
            ]);

        $rateId = $createRes->json('data.id');

        // 3. Update Process Rate
        $updateRes = $this->actingAs($this->adminUser)->putJson("/api/master-proses/{$rateId}", [
            'rate' => 1900,
            'is_active' => false,
        ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'id' => $rateId,
                    'rate' => 1900,
                    'is_active' => false,
                ]
            ]);

        // 4. Delete Process Rate
        $deleteRes = $this->actingAs($this->adminUser)->deleteJson("/api/master-proses/{$rateId}");
        $deleteRes->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->assertDatabaseMissing('product_process_rates', ['id' => $rateId]);
    }

    public function test_hpp_products_lists_all_groups_and_updates_components(): void
    {
        $response = $this->actingAs($this->adminUser)->getJson('/api/hpp-produk');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'product_code',
                        'total_hpp',
                        'material_cost',
                        'labor_cost',
                        'overhead_cost',
                        'components',
                        'rates',
                    ]
                ]
            ]);

        $names = array_column($response->json('data'), 'name');
        $this->assertContains('BAGGY', $names);
        $this->assertContains('STREET PENDEK', $names);
        $this->assertContains('FASHOL', $names);
        $this->assertContains('SCUBA', $names);
        $this->assertContains('SHORTPANTS', $names);

        // Update Component Values on first HPP item
        $firstItem = $response->json('data.0');
        $updateRes = $this->actingAs($this->ownerUser)->putJson("/api/hpp-produk/{$firstItem['id']}", [
            'material_cost' => 36000,
            'overhead_cost' => 8000,
        ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $updatedTotal = 36000 + (float)$firstItem['labor_cost'] + 8000;
        $this->assertEquals($updatedTotal, (float)$updateRes->json('data.total_hpp'));
    }
}
