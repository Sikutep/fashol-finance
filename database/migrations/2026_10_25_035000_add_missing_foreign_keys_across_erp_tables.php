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
        // 1. product_process_rates -> production_process_id
        if (Schema::hasTable('product_process_rates') && !Schema::hasColumn('product_process_rates', 'production_process_id')) {
            Schema::table('product_process_rates', function (Blueprint $table) {
                $table->foreignId('production_process_id')
                    ->nullable()
                    ->after('product_group_id')
                    ->constrained('production_processes')
                    ->nullOnDelete();
            });

            // Backfill
            if (Schema::hasTable('production_processes')) {
                $processes = DB::table('production_processes')->get();
                foreach ($processes as $proc) {
                    DB::table('product_process_rates')
                        ->where('process_name', $proc->process_name)
                        ->update(['production_process_id' => $proc->id]);
                }
            }
        }

        // 2. daily_productions -> production_process_id
        if (Schema::hasTable('daily_productions') && !Schema::hasColumn('daily_productions', 'production_process_id')) {
            Schema::table('daily_productions', function (Blueprint $table) {
                $table->foreignId('production_process_id')
                    ->nullable()
                    ->after('worker_id')
                    ->constrained('production_processes')
                    ->nullOnDelete();
            });

            // Backfill
            if (Schema::hasTable('production_processes')) {
                $processes = DB::table('production_processes')->get();
                foreach ($processes as $proc) {
                    DB::table('daily_productions')
                        ->where('process_name', $proc->process_name)
                        ->update(['production_process_id' => $proc->id]);
                }
            }
        }

        // 3. product_hpp_components -> product_group_id
        if (Schema::hasTable('product_hpp_components') && !Schema::hasColumn('product_hpp_components', 'product_group_id')) {
            Schema::table('product_hpp_components', function (Blueprint $table) {
                $table->foreignId('product_group_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('product_groups')
                    ->nullOnDelete();
            });

            // Backfill
            if (Schema::hasTable('product_groups')) {
                $groups = DB::table('product_groups')->get();
                foreach ($groups as $grp) {
                    DB::table('product_hpp_components')
                        ->where('product_name', $grp->name)
                        ->update(['product_group_id' => $grp->id]);
                }
            }
        }

        // 4. monthly_payrolls -> staff_position_id
        if (Schema::hasTable('monthly_payrolls') && !Schema::hasColumn('monthly_payrolls', 'staff_position_id')) {
            Schema::table('monthly_payrolls', function (Blueprint $table) {
                $table->foreignId('staff_position_id')
                    ->nullable()
                    ->after('worker_id')
                    ->constrained('staff_positions')
                    ->nullOnDelete();
            });

            // Backfill
            if (Schema::hasTable('staff_positions')) {
                $positions = DB::table('staff_positions')->get();
                foreach ($positions as $pos) {
                    DB::table('monthly_payrolls')
                        ->where('position', $pos->name)
                        ->update(['staff_position_id' => $pos->id]);
                }
            }
        }

        // 5. daily_production_items -> product_group_id
        if (Schema::hasTable('daily_production_items') && !Schema::hasColumn('daily_production_items', 'product_group_id')) {
            Schema::table('daily_production_items', function (Blueprint $table) {
                $table->foreignId('product_group_id')
                    ->nullable()
                    ->after('product_id')
                    ->constrained('product_groups')
                    ->nullOnDelete();
            });

            // Backfill
            if (Schema::hasTable('product_groups')) {
                $groups = DB::table('product_groups')->get();
                foreach ($groups as $grp) {
                    DB::table('daily_production_items')
                        ->where('product_name', $grp->name)
                        ->update(['product_group_id' => $grp->id]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('daily_production_items') && Schema::hasColumn('daily_production_items', 'product_group_id')) {
            Schema::table('daily_production_items', function (Blueprint $table) {
                $table->dropForeign(['product_group_id']);
                $table->dropColumn('product_group_id');
            });
        }

        if (Schema::hasTable('monthly_payrolls') && Schema::hasColumn('monthly_payrolls', 'staff_position_id')) {
            Schema::table('monthly_payrolls', function (Blueprint $table) {
                $table->dropForeign(['staff_position_id']);
                $table->dropColumn('staff_position_id');
            });
        }

        if (Schema::hasTable('product_hpp_components') && Schema::hasColumn('product_hpp_components', 'product_group_id')) {
            Schema::table('product_hpp_components', function (Blueprint $table) {
                $table->dropForeign(['product_group_id']);
                $table->dropColumn('product_group_id');
            });
        }

        if (Schema::hasTable('daily_productions') && Schema::hasColumn('daily_productions', 'production_process_id')) {
            Schema::table('daily_productions', function (Blueprint $table) {
                $table->dropForeign(['production_process_id']);
                $table->dropColumn('production_process_id');
            });
        }

        if (Schema::hasTable('product_process_rates') && Schema::hasColumn('product_process_rates', 'production_process_id')) {
            Schema::table('product_process_rates', function (Blueprint $table) {
                $table->dropForeign(['production_process_id']);
                $table->dropColumn('production_process_id');
            });
        }
    }
};
