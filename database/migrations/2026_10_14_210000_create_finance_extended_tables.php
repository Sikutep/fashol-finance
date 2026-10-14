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
        // 1. Tabel Payroll Bulanan (Modul 5 SPK)
        if (!Schema::hasTable('monthly_payrolls')) {
            Schema::create('monthly_payrolls', function (Blueprint $table) {
                $table->id();
                $table->string('payroll_number', 50)->unique(); // PYM-2506-01
                $table->foreignId('worker_id')->nullable()->constrained('workers')->nullOnDelete();
                $table->string('worker_name', 255);
                $table->string('position', 100);
                $table->string('period', 50); // Juni 2025
                $table->decimal('basic_salary', 15, 2);
                $table->decimal('allowance', 15, 2)->default(0);
                $table->decimal('overtime', 15, 2)->default(0);
                $table->decimal('deductions', 15, 2)->default(0);
                $table->decimal('total_salary', 15, 2);
                $table->enum('status', ['Draft', 'Diperiksa', 'Dibayar'])->default('Diperiksa');
                $table->timestamps();

                $table->index('period');
            });
        }

        // 2. Tabel Komponen HPP Produk per Unit (Modul 6 SPK)
        if (!Schema::hasTable('product_hpp_components')) {
            Schema::create('product_hpp_components', function (Blueprint $table) {
                $table->id();
                $table->string('product_name', 255)->unique(); // Baggy Pants Reguler
                $table->string('product_code', 50); // PRD-BPR
                $table->string('code', 10); // BPR
                $table->decimal('material_cost', 15, 2)->default(0);
                $table->decimal('labor_cost', 15, 2)->default(0);
                $table->decimal('overhead_cost', 15, 2)->default(0);
                $table->decimal('total_hpp', 15, 2)->default(0);
                $table->date('effective_date')->nullable();
                $table->enum('status', ['Aktif', 'Nonaktif'])->default('Aktif');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_hpp_components');
        Schema::dropIfExists('monthly_payrolls');
    }
};
