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
        // 1. Master Pekerja (Modul 1 SPK)
        if (!Schema::hasTable('workers')) {
            Schema::create('workers', function (Blueprint $table) {
                $table->id();
                $table->string('worker_code', 50)->unique(); // PKR-001
                $table->string('name', 255);
                $table->string('type', 100)->default('Produksi'); // Produksi / Staff
                $table->string('process', 100); // Jahit Luar, Potong, Kansay, QC, Finance
                $table->enum('payment_system', ['Borongan', 'Harian', 'Bulanan'])->default('Borongan');
                $table->enum('status', ['Aktif', 'Nonaktif'])->default('Aktif');
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Master Tarif HPP & Proses Produksi (Modul 6 SPK)
        if (!Schema::hasTable('product_process_rates')) {
            Schema::create('product_process_rates', function (Blueprint $table) {
                $table->id();
                $table->string('product_name', 255); // Baggy Pants Reguler, dsb
                $table->foreignId('product_group_id')->nullable()->constrained('product_groups')->nullOnDelete();
                $table->string('process_name', 100); // Jahit Luar, Potong, Kansay, Packing, dsb
                $table->decimal('rate', 12, 2)->unsigned(); // 3200, 1800, dsb
                $table->string('unit', 50)->default('pcs');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['product_name', 'process_name']);
            });
        }

        // 3. Transaksi Header Produksi Harian (Modul 2 & 3 SPK)
        if (!Schema::hasTable('daily_productions')) {
            Schema::create('daily_productions', function (Blueprint $table) {
                $table->id();
                $table->string('transaction_number', 50)->unique(); // PRD-240601
                $table->date('production_date');
                $table->foreignId('worker_id')->constrained('workers')->restrictOnDelete();
                $table->string('process_name', 100);
                $table->integer('total_qty')->default(0);
                $table->decimal('total_wage', 15, 2)->default(0);
                $table->text('notes')->nullable();
                $table->enum('status', ['Draft', 'Tercatat', 'Masuk Payroll'])->default('Tercatat');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('production_date');
                $table->index(['worker_id', 'production_date']);
            });
        }

        // 4. Detail Baris Produksi Harian (Banyak baris produk/varian/warna)
        if (!Schema::hasTable('daily_production_items')) {
            Schema::create('daily_production_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('daily_production_id')->constrained('daily_productions')->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->string('product_name', 255);
                $table->string('variation', 255)->nullable(); // All Size, XL, dsb
                $table->string('color', 100)->nullable(); // Black, Navy, dsb
                $table->integer('qty');
                $table->decimal('rate', 12, 2); // Snapshot historis tarif saat transaksi dibuat
                $table->decimal('total_wage', 15, 2); // qty * rate
                $table->timestamps();
            });
        }

        // 5. Pencatatan Keuangan / Pendapatan & Pengeluaran (Modul 7 & Dashboard)
        if (!Schema::hasTable('finance_transactions')) {
            Schema::create('finance_transactions', function (Blueprint $table) {
                $table->id();
                $table->string('transaction_number', 50)->unique(); // TRX-250618-01
                $table->enum('type', ['income', 'expense']);
                $table->string('category', 100); // Penjualan Marketplace, Bahan Baku, dsb
                $table->string('title', 255);
                $table->decimal('amount', 15, 2);
                $table->date('transaction_date');
                $table->string('reference', 255)->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['type', 'transaction_date']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_production_items');
        Schema::dropIfExists('daily_productions');
        Schema::dropIfExists('product_process_rates');
        Schema::dropIfExists('workers');
        Schema::dropIfExists('finance_transactions');
    }
};
