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
        // Alter daily_productions status column to VARCHAR(50)
        DB::statement("ALTER TABLE `daily_productions` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'Tercatat'");

        // Alter monthly_payrolls status column to VARCHAR(50)
        DB::statement("ALTER TABLE `monthly_payrolls` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'Draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `daily_productions` MODIFY COLUMN `status` ENUM('Draft', 'Tercatat', 'Masuk Payroll') NOT NULL DEFAULT 'Tercatat'");
        DB::statement("ALTER TABLE `monthly_payrolls` MODIFY COLUMN `status` ENUM('Draft', 'Diperiksa', 'Dibayar') NOT NULL DEFAULT 'Diperiksa'");
    }
};
