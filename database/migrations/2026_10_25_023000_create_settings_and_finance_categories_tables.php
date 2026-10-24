<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabel Kategori Keuangan Dinamis (Chart of Accounts resmi)
        if (!Schema::hasTable('finance_categories')) {
            Schema::create('finance_categories', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->nullable();
                $table->string('name', 255);
                $table->string('group', 50)->default('operating_expenses'); // income, deductions, cogs, operating_expenses, non_operating_expenses
                $table->string('cost_type', 50)->nullable(); // material, service, repair, overhead, general_operating
                $table->boolean('is_active')->default(true);
                $table->boolean('is_default')->default(false);
                $table->timestamps();

                $table->index(['group', 'is_active']);
            });
        }

        // 2. Tabel Jabatan Staf Kantor Dinamis
        if (!Schema::hasTable('staff_positions')) {
            Schema::create('staff_positions', function (Blueprint $table) {
                $table->id();
                $table->string('name', 255)->unique();
                $table->string('department', 100)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 3. Kolom cost_type & category_id di transaksi kas
        if (Schema::hasTable('finance_transactions')) {
            Schema::table('finance_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('finance_transactions', 'cost_type')) {
                    $table->string('cost_type', 50)->nullable()->after('category');
                }
                if (!Schema::hasColumn('finance_transactions', 'category_id')) {
                    $table->foreignId('category_id')->nullable()->after('cost_type')->constrained('finance_categories')->nullOnDelete();
                }
            });
        }

        // 4. Seed Kategori Resmi Standar
        $this->seedInitialCategories();
        $this->seedInitialStaffPositions();
        $this->syncExistingTransactionsCostType();
    }

    protected function seedInitialCategories(): void
    {
        if (DB::table('finance_categories')->count() > 0) {
            return;
        }

        $now = now();
        $categories = [
            // Income
            ['code' => 'INC-01', 'name' => 'Penjualan Produk', 'group' => 'income', 'cost_type' => null],
            ['code' => 'INC-02', 'name' => 'Pendapatan Jasa Maklon', 'group' => 'income', 'cost_type' => null],
            ['code' => 'INC-03', 'name' => 'Pendapatan Lain-lain', 'group' => 'income', 'cost_type' => null],
            
            // Deductions
            ['code' => 'DED-01', 'name' => 'Potongan Penjualan', 'group' => 'deductions', 'cost_type' => null],
            ['code' => 'DED-02', 'name' => 'Retur Penjualan', 'group' => 'deductions', 'cost_type' => null],

            // COGS
            ['code' => 'COG-01', 'name' => 'Harga Pokok Penjualan', 'group' => 'cogs', 'cost_type' => 'material'],
            ['code' => 'COG-02', 'name' => 'Bahan Baku Kain', 'group' => 'cogs', 'cost_type' => 'material'],
            ['code' => 'COG-03', 'name' => 'Aksesoris Jahit', 'group' => 'cogs', 'cost_type' => 'material'],

            // 27 Official Operating Expenses
            ['code' => 'OP-01', 'name' => 'Beban Promosi / Iklan', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-02', 'name' => 'Beban Endorse/Pemasaran', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-03', 'name' => 'Beban Gaji Karyawan', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-04', 'name' => 'Beban Listrik', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-05', 'name' => 'Beban Air', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-06', 'name' => 'Beban Internet', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-07', 'name' => 'Beban ATK Admin', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-08', 'name' => 'Beban Sewa', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-09', 'name' => 'Beban Kesejahteraan Karyawan', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-10', 'name' => 'Beban Asuransi', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-11', 'name' => 'Beban Penyusutan Mesin', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-12', 'name' => 'Beban Penyusutan Kendaraan', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-13', 'name' => 'Beban Penyusutan Peralatan Kantor', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-14', 'name' => 'Beban Penyusutan Peralatan Konveksi', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-15', 'name' => 'Beban Perlengkapan', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-16', 'name' => 'Beban Gaji', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-17', 'name' => 'Beban Konsumsi Admin', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-18', 'name' => 'Beban Konsumsi Produksi', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-19', 'name' => 'Beban ATK Konveksi', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-20', 'name' => 'Beban Transportasi', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-21', 'name' => 'Beban Kendaraan', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-22', 'name' => 'Beban Pengiriman', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-23', 'name' => 'Beban Service', 'group' => 'operating_expenses', 'cost_type' => 'repair'],
            ['code' => 'OP-24', 'name' => 'Beban Pemeliharaan', 'group' => 'operating_expenses', 'cost_type' => 'repair'],
            ['code' => 'OP-25', 'name' => 'Beban Kebersihan', 'group' => 'operating_expenses', 'cost_type' => 'overhead'],
            ['code' => 'OP-26', 'name' => 'Beban Operasional Admin', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'OP-27', 'name' => 'Beban Lain-lain', 'group' => 'operating_expenses', 'cost_type' => 'general_operating'],

            // Non Operating
            ['code' => 'NOP-01', 'name' => 'Beban Bank', 'group' => 'non_operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'NOP-02', 'name' => 'Beban PPh Final', 'group' => 'non_operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'NOP-03', 'name' => 'Beban Legalitas', 'group' => 'non_operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'NOP-04', 'name' => 'Beban Pajak dan Perizinan', 'group' => 'non_operating_expenses', 'cost_type' => 'general_operating'],
            ['code' => 'NOP-05', 'name' => 'Beban Zakat', 'group' => 'non_operating_expenses', 'cost_type' => 'general_operating'],
        ];

        foreach ($categories as $cat) {
            DB::table('finance_categories')->insert([
                'code' => $cat['code'],
                'name' => $cat['name'],
                'group' => $cat['group'],
                'cost_type' => $cat['cost_type'],
                'is_active' => true,
                'is_default' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    protected function seedInitialStaffPositions(): void
    {
        if (DB::table('staff_positions')->count() > 0) {
            return;
        }

        $now = now();
        $positions = [
            ['name' => 'Owner / Manajemen', 'department' => 'Eksekutif'],
            ['name' => 'Finance / Kasir', 'department' => 'Keuangan'],
            ['name' => 'Admin / Operasional', 'department' => 'Operasional'],
            ['name' => 'Legal', 'department' => 'Legalitas'],
            ['name' => 'Konten Spesialis', 'department' => 'Pemasaran'],
            ['name' => 'Host Live', 'department' => 'Pemasaran'],
            ['name' => 'Driver / Gudang', 'department' => 'Logistik'],
            ['name' => 'Packing', 'department' => 'Finishing'],
            ['name' => 'PIC Konveksi', 'department' => 'Produksi'],
            ['name' => 'PIC QC', 'department' => 'Produksi'],
            ['name' => 'Staf Konveksi', 'department' => 'Produksi'],
        ];

        foreach ($positions as $pos) {
            DB::table('staff_positions')->insert([
                'name' => $pos['name'],
                'department' => $pos['department'],
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    protected function syncExistingTransactionsCostType(): void
    {
        // Hubungkan transaksi kas yang sudah ada ke kategori dan cost_type masing-masing
        $cats = DB::table('finance_categories')->get()->keyBy('name');

        DB::table('finance_transactions')->orderBy('id')->chunk(100, function ($transactions) use ($cats) {
            foreach ($transactions as $t) {
                $matchedCat = $cats->get($t->category);
                $costType = null;

                if ($matchedCat) {
                    $costType = $matchedCat->cost_type;
                } else {
                    $cLower = strtolower($t->category . ' ' . $t->title);
                    if (str_contains($cLower, 'bahan') || str_contains($cLower, 'kain') || str_contains($cLower, 'benang')) {
                        $costType = 'material';
                    } elseif (str_contains($cLower, 'jasa') || str_contains($cLower, 'sablon') || str_contains($cLower, 'bordir')) {
                        $costType = 'service';
                    } elseif (str_contains($cLower, 'repair') || str_contains($cLower, 'rework') || str_contains($cLower, 'reject') || str_contains($cLower, 'service')) {
                        $costType = 'repair';
                    } elseif (str_contains($cLower, 'listrik') || str_contains($cLower, 'air') || str_contains($cLower, 'overhead') || str_contains($cLower, 'utilitas') || str_contains($cLower, 'sewa') || str_contains($cLower, 'konsumsi produksi')) {
                        $costType = 'overhead';
                    } else {
                        $costType = 'general_operating';
                    }
                }

                DB::table('finance_transactions')->where('id', $t->id)->update([
                    'cost_type' => $costType,
                    'category_id' => $matchedCat?->id ?? null,
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('finance_transactions')) {
            Schema::table('finance_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('finance_transactions', 'category_id')) {
                    $table->dropForeign(['category_id']);
                    $table->dropColumn('category_id');
                }
                if (Schema::hasColumn('finance_transactions', 'cost_type')) {
                    $table->dropColumn('cost_type');
                }
            });
        }

        Schema::dropIfExists('staff_positions');
        Schema::dropIfExists('finance_categories');
    }
};
