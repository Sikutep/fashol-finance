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
        Schema::table('workers', function (Blueprint $table) {
            if (!Schema::hasColumn('workers', 'staff_position_id')) {
                $table->foreignId('staff_position_id')
                    ->nullable()
                    ->after('process')
                    ->constrained('staff_positions')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('workers', 'production_process_id')) {
                $table->foreignId('production_process_id')
                    ->nullable()
                    ->after('staff_position_id')
                    ->constrained('production_processes')
                    ->nullOnDelete();
            }
        });

        // Backfill data relasi untuk data eksisting
        if (Schema::hasTable('staff_positions')) {
            $positions = DB::table('staff_positions')->get();
            foreach ($positions as $pos) {
                DB::table('workers')
                    ->where('type', 'Staff')
                    ->where('process', $pos->name)
                    ->update(['staff_position_id' => $pos->id]);
            }
        }

        if (Schema::hasTable('production_processes')) {
            $processes = DB::table('production_processes')->get();
            foreach ($processes as $proc) {
                DB::table('workers')
                    ->where('type', 'Produksi')
                    ->where('process', $proc->process_name)
                    ->update(['production_process_id' => $proc->id]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('workers', function (Blueprint $table) {
            if (Schema::hasColumn('workers', 'staff_position_id')) {
                $table->dropForeign(['staff_position_id']);
                $table->dropColumn('staff_position_id');
            }

            if (Schema::hasColumn('workers', 'production_process_id')) {
                $table->dropForeign(['production_process_id']);
                $table->dropColumn('production_process_id');
            }
        });
    }
};
