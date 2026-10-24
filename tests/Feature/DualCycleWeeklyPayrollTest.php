<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\Worker;
use App\Models\ProductionProcess;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class DualCycleWeeklyPayrollTest extends TestCase
{
    use DatabaseTransactions;

    protected User $owner;
    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::where('role', 'owner')->firstOrFail();
        $this->admin = User::where('role', 'admin')->firstOrFail();
    }

    public function test_weekly_payroll_returns_cycle_specific_metadata(): void
    {
        // 1. Kamis Cycle
        $resKamis = $this->actingAs($this->owner)->getJson('/api/payroll-mingguan?cycle=kamis');
        $resKamis->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'cycle' => 'kamis',
            ]);
        $this->assertStringContainsString('Kamis', $resKamis->json('cycle_label'));
        $this->assertStringContainsString('Kamis', $resKamis->json('payment_date'));

        // 2. Sabtu Cycle
        $resSabtu = $this->actingAs($this->owner)->getJson('/api/payroll-mingguan?cycle=sabtu');
        $resSabtu->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'cycle' => 'sabtu',
            ]);
        $this->assertStringContainsString('Sabtu', $resSabtu->json('cycle_label'));
        $this->assertStringContainsString('Sabtu', $resSabtu->json('payment_date'));
    }

    public function test_weekly_payroll_filters_data_by_cycle_target_processes(): void
    {
        $workerKamis = Worker::create([
            'worker_code' => 'W-TEST-KMS01',
            'name' => 'Pekerja Jahit Test',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $workerSabtu = Worker::create([
            'worker_code' => 'W-TEST-SBT01',
            'name' => 'Pekerja QC Test',
            'type' => 'Produksi',
            'process' => 'QC',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Sabtu',
            'status' => 'Aktif',
        ]);

        // Input data pada tanggal 2026-10-15 (Kamis)
        $prodJahit = DailyProduction::create([
            'transaction_number' => 'PRD-TEST-JHT01',
            'production_date' => '2026-10-15',
            'worker_id' => $workerKamis->id,
            'process_name' => 'Jahit',
            'total_qty' => 100,
            'total_wage' => 250000,
            'status' => 'Tercatat',
        ]);
        DailyProductionItem::create([
            'daily_production_id' => $prodJahit->id,
            'product_name' => 'Baggy Pants Premium',
            'color' => 'Hitam',
            'qty' => 100,
            'rate' => 2500,
            'total_wage' => 250000,
        ]);

        $prodQc = DailyProduction::create([
            'transaction_number' => 'PRD-TEST-QC01',
            'production_date' => '2026-10-15',
            'worker_id' => $workerSabtu->id,
            'process_name' => 'QC',
            'total_qty' => 100,
            'total_wage' => 30000,
            'status' => 'Tercatat',
        ]);
        DailyProductionItem::create([
            'daily_production_id' => $prodQc->id,
            'product_name' => 'Baggy Pants Premium',
            'color' => 'Hitam',
            'qty' => 100,
            'rate' => 300,
            'total_wage' => 30000,
        ]);

        // Query Kamis: Harus ada Jahit, TIDAK ADA QC
        $resKamis = $this->actingAs($this->owner)->getJson('/api/payroll-mingguan?cycle=kamis&period=15%20-%2021%20Oktober%202026');
        $resKamis->assertStatus(200);
        $dataKamis = collect($resKamis->json('data'));
        $this->assertTrue($dataKamis->contains('worker_id', $workerKamis->id));
        $this->assertFalse($dataKamis->contains('worker_id', $workerSabtu->id));

        // Query Sabtu: Harus ada QC, TIDAK ADA Jahit
        $resSabtu = $this->actingAs($this->owner)->getJson('/api/payroll-mingguan?cycle=sabtu&period=10%20-%2016%20Oktober%202026');
        $resSabtu->assertStatus(200);
        $dataSabtu = collect($resSabtu->json('data'));
        $this->assertTrue($dataSabtu->contains('worker_id', $workerSabtu->id));
        $this->assertFalse($dataSabtu->contains('worker_id', $workerKamis->id));
    }

    public function test_status_update_isolates_between_cycles_preventing_status_collision(): void
    {
        $workerKamis = Worker::create([
            'worker_code' => 'W-TEST-KMS02',
            'name' => 'Pekerja Potong Test',
            'type' => 'Produksi',
            'process' => 'Potong',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $workerSabtu = Worker::create([
            'worker_code' => 'W-TEST-SBT02',
            'name' => 'Pekerja Lipat Test',
            'type' => 'Produksi',
            'process' => 'Lipat Celana',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Sabtu',
            'status' => 'Aktif',
        ]);

        $prodPotong = DailyProduction::create([
            'transaction_number' => 'PRD-TEST-PTG02',
            'production_date' => '2026-10-15',
            'worker_id' => $workerKamis->id,
            'process_name' => 'Potong',
            'total_qty' => 50,
            'total_wage' => 17500,
            'status' => 'Tercatat',
        ]);

        $prodLipat = DailyProduction::create([
            'transaction_number' => 'PRD-TEST-LPT02',
            'production_date' => '2026-10-15',
            'worker_id' => $workerSabtu->id,
            'process_name' => 'Lipat Celana',
            'total_qty' => 50,
            'total_wage' => 10000,
            'status' => 'Tercatat',
        ]);

        // 1. Setujui payroll kelompok KAMIS saja
        $resApproveKamis = $this->actingAs($this->owner)->postJson('/api/payroll-mingguan/status', [
            'period' => '15 - 21 Oktober 2026',
            'cycle' => 'kamis',
            'status' => 'Disetujui',
        ]);
        $resApproveKamis->assertStatus(200)->assertJson(['status' => 'success', 'new_status' => 'Disetujui']);

        // 2. Verifikasi status di database
        $this->assertEquals('Disetujui', $prodPotong->fresh()->status);
        // Produksi Lipat Celana (Sabtu) HARUS TETAP 'Tercatat', tidak boleh ikut tertimpa jadi 'Disetujui'!
        $this->assertEquals('Tercatat', $prodLipat->fresh()->status);
    }

    public function test_daily_production_backdate_lock_is_isolated_by_payroll_cycle(): void
    {
        $workerJahit = Worker::create([
            'worker_code' => 'W-TEST-LOCK-JHT',
            'name' => 'Pekerja Jahit Lock Test',
            'type' => 'Produksi',
            'process' => 'Jahit',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis',
            'status' => 'Aktif',
        ]);

        $workerQc = Worker::create([
            'worker_code' => 'W-TEST-LOCK-QC',
            'name' => 'Pekerja QC Lock Test',
            'type' => 'Produksi',
            'process' => 'QC',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Sabtu',
            'status' => 'Aktif',
        ]);

        // Buat produksi Jahit yang sudah Dibayar pada tanggal 2026-10-15
        DailyProduction::create([
            'transaction_number' => 'PRD-TEST-LOCKED-01',
            'production_date' => '2026-10-15',
            'worker_id' => $workerJahit->id,
            'process_name' => 'Jahit',
            'total_qty' => 20,
            'total_wage' => 50000,
            'status' => 'Dibayar',
        ]);

        // 1. Coba input transaksi Jahit baru di tanggal 2026-10-15 -> HARUS DITOLAK karena Jahit sudah Dibayar
        $resInputJahit = $this->actingAs($this->admin)->postJson('/api/daily-productions', [
            'production_date' => '2026-10-15',
            'worker_id' => $workerJahit->id,
            'process_name' => 'Jahit',
            'items' => [
                [
                    'product_name' => 'Baggy Pants Premium',
                    'color' => 'Hitam',
                    'qty' => 10,
                    'rate' => 2500,
                ]
            ]
        ]);
        $resInputJahit->assertStatus(422);
        $this->assertStringContainsString('telah disetujui atau dibayar', $resInputJahit->json('message'));

        // 2. Coba input transaksi QC baru di tanggal 2026-10-15 -> HARUS DITERIMA karena siklus QC belum Dibayar
        $resInputQc = $this->actingAs($this->admin)->postJson('/api/daily-productions', [
            'production_date' => '2026-10-15',
            'worker_id' => $workerQc->id,
            'process_name' => 'QC',
            'items' => [
                [
                    'product_name' => 'Baggy Pants Premium',
                    'color' => 'Hitam',
                    'qty' => 10,
                    'rate' => 300,
                ]
            ]
        ]);
        $resInputQc->assertStatus(201)
            ->assertJson(['status' => 'success']);
    }

    public function test_master_process_and_worker_persist_payroll_day_attribute(): void
    {
        // 1. Tambah master proses dengan payroll_day Sabtu
        $resProcess = $this->actingAs($this->owner)->postJson('/api/production-processes', [
            'process_name' => 'Steam & Ironing',
            'process_code' => 'STM',
            'description' => 'Penyetrikaan uap',
            'default_rate' => 450,
            'unit' => 'pcs',
            'payroll_day' => 'Sabtu',
            'is_active' => true,
        ]);
        $resProcess->assertStatus(201);
        $this->assertDatabaseHas('production_processes', [
            'process_name' => 'Steam & Ironing',
            'payroll_day' => 'Sabtu',
        ]);

        // 2. Tambah worker dengan payroll_day Sabtu
        $resWorker = $this->actingAs($this->owner)->postJson('/api/workers', [
            'name' => 'Budi Steam Test',
            'type' => 'Produksi',
            'process' => 'Steam & Ironing',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Sabtu',
            'status' => 'Aktif',
        ]);
        $resWorker->assertStatus(201);
        $this->assertDatabaseHas('workers', [
            'name' => 'Budi Steam Test',
            'payroll_day' => 'Sabtu',
        ]);
    }

    public function test_mismatched_worker_payroll_day_is_harmonized_with_process_cycle(): void
    {
        // Simulasi jika ada pekerja yang di master pekerja tertulis 'Kamis', tapi mengerjakan proses 'QC' (Sabtu)
        $mismatchedWorker = Worker::create([
            'worker_code' => 'W-MISMATCH-01',
            'name' => 'Pekerja Anomali Jadwal',
            'type' => 'Produksi',
            'process' => 'QC',
            'payment_system' => 'Borongan',
            'payroll_day' => 'Kamis', // Anomali / tidak sinkron
            'status' => 'Aktif',
        ]);

        // Input transaksi harian QC pada periode Sabtu (misal 2026-10-14)
        $prod = DailyProduction::create([
            'transaction_number' => 'PRD-MISMATCH-01',
            'production_date' => '2026-10-14',
            'worker_id' => $mismatchedWorker->id,
            'process_name' => 'QC',
            'total_qty' => 50,
            'total_wage' => 15000,
            'status' => 'Tercatat',
        ]);
        DailyProductionItem::create([
            'daily_production_id' => $prod->id,
            'product_name' => 'Baggy Pants Premium',
            'color' => 'Hitam',
            'qty' => 50,
            'rate' => 300,
            'total_wage' => 15000,
        ]);

        // 1. Pada siklus Kamis: Transaksi QC TIDAK BOLEH MUNCUL (karena proses QC adalah siklus Sabtu)
        $resKamis = $this->actingAs($this->owner)->getJson('/api/payroll-mingguan?cycle=kamis&period=08%20-%2014%20Oktober%202026');
        $resKamis->assertStatus(200);
        $dataKamis = collect($resKamis->json('data'));
        $this->assertFalse($dataKamis->contains('worker_id', $mismatchedWorker->id), 'QC tidak boleh muncul di siklus Kamis');

        // 2. Pada siklus Sabtu: Transaksi QC HARUS MUNCUL dan payroll_day baris/slip gaji HARUS 'Sabtu'
        $resSabtu = $this->actingAs($this->owner)->getJson('/api/payroll-mingguan?cycle=sabtu&period=10%20-%2016%20Oktober%202026');
        $resSabtu->assertStatus(200);
        $dataSabtu = collect($resSabtu->json('data'));
        $workerRow = $dataSabtu->firstWhere('worker_id', $mismatchedWorker->id);

        $this->assertNotNull($workerRow, 'Transaksi QC harus muncul di siklus Sabtu');
        $this->assertEquals('Sabtu', $workerRow['payroll_day'], 'Jadwal payroll pada slip gaji wajib diselaraskan dengan siklus proses riil (Sabtu)');
    }
}
