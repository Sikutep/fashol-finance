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
        if (Schema::hasTable('production_processes')) {
            Schema::table('production_processes', function (Blueprint $table) {
                if (!Schema::hasColumn('production_processes', 'payroll_day')) {
                    $table->string('payroll_day', 20)->default('Kamis')->after('unit');
                }
            });

            // Backfill standard production processes
            DB::table('production_processes')
                ->whereIn('process_name', ['Potong', 'Jahit', 'Overdek', 'Kansay'])
                ->update(['payroll_day' => 'Kamis']);

            DB::table('production_processes')
                ->whereNotIn('process_name', ['Potong', 'Jahit', 'Overdek', 'Kansay'])
                ->update(['payroll_day' => 'Sabtu']);
        }

        if (Schema::hasTable('workers')) {
            Schema::table('workers', function (Blueprint $table) {
                if (!Schema::hasColumn('workers', 'payroll_day')) {
                    $table->string('payroll_day', 20)->nullable()->after('payment_system');
                }
            });

            // Backfill workers based on assigned process
            DB::table('workers')
                ->whereIn('process', ['Potong', 'Jahit', 'Overdek', 'Kansay'])
                ->update(['payroll_day' => 'Kamis']);

            DB::table('workers')
                ->whereNotIn('process', ['Potong', 'Jahit', 'Overdek', 'Kansay', 'Owner / Manajemen', 'Admin / Operasional', 'Finance / Kasir', 'Legal', 'Konten Spesialis'])
                ->where('type', 'Produksi')
                ->update(['payroll_day' => 'Sabtu']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('production_processes') && Schema::hasColumn('production_processes', 'payroll_day')) {
            Schema::table('production_processes', function (Blueprint $table) {
                $table->dropColumn('payroll_day');
            });
        }

        if (Schema::hasTable('workers') && Schema::hasColumn('workers', 'payroll_day')) {
            Schema::table('workers', function (Blueprint $table) {
                $table->dropColumn('payroll_day');
            });
        }
    }
};
