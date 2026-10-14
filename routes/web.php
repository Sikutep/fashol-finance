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
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Protected Operational Endpoints (Requires Authenticated Session)
    Route::middleware('auth')->group(function () {
        // Dashboard Finance
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Master Pekerja (Modul 1)
        Route::get('/workers', [WorkerController::class, 'index']);
        Route::post('/workers', [WorkerController::class, 'store']);
        Route::put('/workers/{id}', [WorkerController::class, 'update']);
        Route::delete('/workers/{id}', [WorkerController::class, 'destroy']);

        // Input & Riwayat Produksi Harian (Modul 2 & 3)
        Route::get('/daily-productions', [DailyProductionController::class, 'index']);
        Route::post('/daily-productions', [DailyProductionController::class, 'store']);
        Route::delete('/daily-productions/{id}', [DailyProductionController::class, 'destroy']);

        // Dynamic Reference Options & Rate Lookup
        Route::get('/references/options', [ReferenceController::class, 'getOptions']);
        Route::get('/references/rate', [ReferenceController::class, 'getRate']);

        // Extended Finance Modules
        Route::get('/payroll-mingguan', [FinanceExtendedController::class, 'getWeeklyPayroll']);
        Route::post('/payroll-mingguan/status', [FinanceExtendedController::class, 'updateWeeklyPayrollStatus']);

        Route::get('/payroll-bulanan', [FinanceExtendedController::class, 'getMonthlyPayroll']);
        Route::post('/payroll-bulanan/{id}/status', [FinanceExtendedController::class, 'updateMonthlyPayrollStatus']);

        Route::get('/hpp-produk', [FinanceExtendedController::class, 'getHppProducts']);
        Route::post('/hpp-produk/status', [FinanceExtendedController::class, 'updateHppStatus']);

        Route::get('/keuangan', [FinanceExtendedController::class, 'getFinanceTransactions']);
        Route::post('/keuangan', [FinanceExtendedController::class, 'storeFinanceTransaction']);

        Route::get('/rekap-biaya-produksi', [FinanceExtendedController::class, 'getProductionCostSummary']);
    });
});

// Single Page Application Catch-all
Route::get('/{any?}', function () {
    return view('welcome');
})->where('any', '.*')->name('login');
