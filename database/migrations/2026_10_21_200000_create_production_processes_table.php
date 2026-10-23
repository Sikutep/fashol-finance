<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('production_processes')) {
            Schema::create('production_processes', function (Blueprint $table) {
                $table->id();
                $table->string('process_code', 50)->unique();
                $table->string('process_name', 100)->unique();
                $table->text('description')->nullable();
                $table->decimal('default_rate', 12, 2)->default(0);
                $table->string('unit', 50)->default('pcs');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('product_process_rates')) {
            Schema::table('product_process_rates', function (Blueprint $table) {
                if (!Schema::hasColumn('product_process_rates', 'is_custom_rate')) {
                    $table->boolean('is_custom_rate')->default(false)->after('rate');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('product_process_rates')) {
            Schema::table('product_process_rates', function (Blueprint $table) {
                if (Schema::hasColumn('product_process_rates', 'is_custom_rate')) {
                    $table->dropColumn('is_custom_rate');
                }
            });
        }

        Schema::dropIfExists('production_processes');
    }
};
