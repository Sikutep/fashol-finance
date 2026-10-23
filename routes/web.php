<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\WorkerController;
use App\Http\Controllers\DailyProductionController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\FinanceExtendedController;

// API Group for ERP Finance
Route::prefix('api')->group(function () {
    // Public Auth endpoints
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    // Protected Operational Endpoints (Requires Authenticated Session)
    Route::middleware('auth')->group(function () {
        // Authenticated Logout
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Dashboard Finance
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Master Pekerja (Modul 1)
        Route::get('/workers', [WorkerController::class, 'index']);
        Route::post('/workers', [WorkerController::class, 'store']);
        Route::post('/workers/sync-users', [WorkerController::class, 'syncUsers']);
        Route::put('/workers/{id}', [WorkerController::class, 'update']);
        Route::delete('/workers/{id}', [WorkerController::class, 'destroy']);

        // Input & Riwayat Produksi Harian (Modul 2 & 3)
        Route::get('/daily-productions', [DailyProductionController::class, 'index']);
        Route::post('/daily-productions', [DailyProductionController::class, 'store']);
        Route::delete('/daily-productions/{id}', [DailyProductionController::class, 'destroy']);

        // Dynamic Reference Options & Rate Lookup
        Route::get('/references/options', [ReferenceController::class, 'getOptions']);
        Route::get('/references/rate', [ReferenceController::class, 'getRate']);

        // Master Proses Standar (Katalog Proses Pabrik)
        Route::get('/production-processes', [ReferenceController::class, 'getProductionProcesses']);
        Route::post('/production-processes', [ReferenceController::class, 'storeProductionProcess']);
        Route::put('/production-processes/{id}', [ReferenceController::class, 'updateProductionProcess']);
        Route::delete('/production-processes/{id}', [ReferenceController::class, 'destroyProductionProcess']);

        // Tarif Pekerjaan per Produk (Modul 1 & 6)
        Route::get('/master-proses', [ReferenceController::class, 'getProcessRates']);
        Route::post('/master-proses', [ReferenceController::class, 'storeProcessRate']);
        Route::put('/master-proses/{id}', [ReferenceController::class, 'updateProcessRate']);
        Route::delete('/master-proses/{id}', [ReferenceController::class, 'destroyProcessRate']);

        // Extended Finance Modules
        Route::get('/payroll-mingguan', [FinanceExtendedController::class, 'getWeeklyPayroll']);
        Route::post('/payroll-mingguan/status', [FinanceExtendedController::class, 'updateWeeklyPayrollStatus']);

        Route::get('/payroll-bulanan', [FinanceExtendedController::class, 'getMonthlyPayroll']);
        Route::post('/payroll-bulanan/{id}/status', [FinanceExtendedController::class, 'updateMonthlyPayrollStatus']);
        Route::put('/payroll-bulanan/{id}', [FinanceExtendedController::class, 'updateMonthlyPayrollItem']);
        Route::post('/payroll-bulanan/{id}', [FinanceExtendedController::class, 'updateMonthlyPayrollItem']);

        Route::get('/hpp-produk', [FinanceExtendedController::class, 'getHppProducts']);
        Route::post('/hpp-produk/status', [FinanceExtendedController::class, 'updateHppStatus']);
        Route::put('/hpp-produk/{id}', [FinanceExtendedController::class, 'updateHppItem']);
        Route::post('/hpp-produk/{id}', [FinanceExtendedController::class, 'updateHppItem']);

        Route::get('/keuangan', [FinanceExtendedController::class, 'getFinanceTransactions']);
        Route::post('/keuangan', [FinanceExtendedController::class, 'storeFinanceTransaction']);
        Route::put('/keuangan/{id}', [FinanceExtendedController::class, 'updateFinanceTransaction']);
        Route::delete('/keuangan/{id}', [FinanceExtendedController::class, 'destroyFinanceTransaction']);
        Route::get('/finance-categories', [FinanceExtendedController::class, 'getFinanceCategories']);

        Route::get('/laporan-laba-rugi', [FinanceExtendedController::class, 'getIncomeStatement']);

        Route::get('/rekap-biaya-produksi', [FinanceExtendedController::class, 'getProductionCostSummary']);

        // Export Endpoints (Excel / CSV) with Rate Limiting (30 requests / minute)
        Route::middleware('throttle:30,1')->group(function () {
            Route::get('/export/payroll-mingguan', [FinanceExtendedController::class, 'exportWeeklyPayroll']);
            Route::get('/export/payroll-bulanan', [FinanceExtendedController::class, 'exportMonthlyPayroll']);
            Route::get('/export/keuangan', [FinanceExtendedController::class, 'exportFinanceTransactions']);
            Route::get('/export/rekap-biaya-produksi', [FinanceExtendedController::class, 'exportProductionCost']);
            Route::get('/export/laporan-laba-rugi', [FinanceExtendedController::class, 'exportIncomeStatement']);
            Route::get('/export/produksi-harian', [DailyProductionController::class, 'exportDailyProduction']);
        });
    });
});

// Single Page Application Catch-all
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '.*')->name('login');
