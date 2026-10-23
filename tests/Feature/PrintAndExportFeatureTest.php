<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class PrintAndExportFeatureTest extends TestCase
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
     * Test Export Payroll Mingguan
     */
    public function test_export_payroll_mingguan(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/api/export/payroll-mingguan?format=csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringContainsString('REKAP PAYROLL MINGGUAN - CV FASHOL MITSLI SEE', $content);
        $this->assertStringContainsString('No,No Payroll,Nama Pekerja,Total Output (pcs),Total Upah (Rp),Status', $content);
    }

    /**
     * Test Export Payroll Bulanan
     */
    public function test_export_payroll_bulanan(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/api/export/payroll-bulanan?format=csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringContainsString('REKAP PAYROLL BULANAN - CV FASHOL MITSLI SEE', $content);
        $this->assertStringContainsString('No,No Payroll,Nama Pekerja,Jabatan,Gaji Pokok,Tunjangan,Lembur,Potongan,Total Gaji Bersih,Status', $content);
    }

    /**
     * Test Export Buku Kas / Keuangan
     */
    public function test_export_keuangan(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/api/export/keuangan?period=Oktober%202026&format=csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringContainsString('BUKU KAS & ARUS DANA - CV FASHOL MITSLI SEE', $content);
        $this->assertStringContainsString('No,No Transaksi,Tanggal,Tipe,Kategori,Keterangan,Nominal (Rp),Referensi', $content);
        $this->assertStringContainsString('TOTAL PENDAPATAN', $content);
        $this->assertStringContainsString('TOTAL PENGELUARAN', $content);
    }

    /**
     * Test Export Rekap Biaya Produksi
     */
    public function test_export_rekap_biaya_produksi(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/api/export/rekap-biaya-produksi?period=Oktober%202026&format=csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringContainsString('REKAP BIAYA PRODUKSI - CV FASHOL MITSLI SEE', $content);
        $this->assertStringContainsString('Komponen Biaya,Sumber Data,Nilai Biaya (Rp),Status Keterhubungan', $content);
        $this->assertStringContainsString('TOTAL BIAYA PRODUKSI', $content);
    }

    /**
     * Test Export Laporan Laba Rugi
     */
    public function test_export_laporan_laba_rugi(): void
    {
        $response = $this->actingAs($this->ownerUser)->get('/api/export/laporan-laba-rugi?period=Oktober%202026&format=csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringContainsString('LAPORAN LABA RUGI - CV FASHOL MITSLI SEE', $content);
        $this->assertStringContainsString('KOMPONEN KEUANGAN,NOMINAL (Rp)', $content);
        $this->assertStringContainsString('JUMLAH PENDAPATAN BERSIH', $content);
        $this->assertStringContainsString('LABA KOTOR (GROSS PROFIT)', $content);
        $this->assertStringContainsString('LABA (RUGI) BERSIH', $content);
    }

    /**
     * Test Export Produksi Harian
     */
    public function test_export_produksi_harian(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/api/export/produksi-harian?format=csv');
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $content = $response->getContent();
        $this->assertStringContainsString('RIWAYAT PRODUKSI HARIAN - CV FASHOL MITSLI SEE', $content);
        $this->assertStringContainsString('No,No Transaksi,Tanggal,Nama Pekerja,Proses,Produk,Varian,Warna,Qty (pcs),Tarif Satuan (Rp),Total Upah (Rp),Status', $content);
    }

    /**
     * Test Unauthenticated Request is Protected
     */
    public function test_export_unauthenticated_is_redirected(): void
    {
        $response = $this->get('/api/export/keuangan');
        $response->assertStatus(401);
    }
}
