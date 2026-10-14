<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyProduction;
use App\Models\FinanceTransaction;
use App\Models\ProductProcessRate;
use App\Models\ProductGroup;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $now = Carbon::now();

        // 1. Hitung Payroll Minggu Berjalan (Kamis s/d Rabu sesuai SPK)
        $dayOfWeek = $now->dayOfWeek; // 0 = Sun, 4 = Thu
        if ($dayOfWeek >= Carbon::THURSDAY) {
            $payrollStart = $now->copy()->previous(Carbon::THURSDAY);
            if ($dayOfWeek === Carbon::THURSDAY) {
                $payrollStart = $now->copy()->startOfDay();
            }
            $payrollEnd = $payrollStart->copy()->addDays(6)->endOfDay();
        } else {
            $payrollStart = $now->copy()->subWeek()->next(Carbon::THURSDAY)->startOfDay();
            $payrollEnd = $payrollStart->copy()->addDays(6)->endOfDay();
        }

        $payrollThisWeek = DailyProduction::whereBetween('production_date', [
            $payrollStart->format('Y-m-d'),
            $payrollEnd->format('Y-m-d')
        ])->sum('total_wage');

        // Jika minggu ini belum ada transaksi, hitung total siklus minggu terakhir yang memiliki aktivitas
        if ($payrollThisWeek <= 0) {
            $latestTrxDate = DailyProduction::max('production_date');
            if ($latestTrxDate) {
                $lastTrxCarbon = Carbon::parse($latestTrxDate);
                $pStart = $lastTrxCarbon->copy()->previous(Carbon::THURSDAY);
                if ($lastTrxCarbon->dayOfWeek === Carbon::THURSDAY) {
                    $pStart = $lastTrxCarbon->copy()->startOfDay();
                }
                $pEnd = $pStart->copy()->addDays(6)->endOfDay();
                $payrollThisWeek = DailyProduction::whereBetween('production_date', [
                    $pStart->format('Y-m-d'),
                    $pEnd->format('Y-m-d')
                ])->sum('total_wage');
            }
        }

        // 2. Total Pendapatan & Pengeluaran Bulan Ini
        $totalIncome = (float) FinanceTransaction::where('type', 'income')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');

        $totalExpense = (float) FinanceTransaction::where('type', 'expense')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');

        // 3. Biaya Produksi (Total Upah Produksi + Pengeluaran Produksi)
        $productionWageTotal = (float) DailyProduction::sum('total_wage');
        $productionMaterialExpense = (float) FinanceTransaction::where('type', 'expense')
            ->where('category', 'like', '%Bahan%')
            ->sum('amount');
        $totalProductionCost = $productionWageTotal + $productionMaterialExpense;

        // 4. Arus Keuangan (Grafik 6 Bulan Terakhir Dinamis)
        $chartMonths = [];
        $incomeData = [];
        $expenseData = [];

        for ($i = 5; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i);
            $monthName = $m->translatedFormat('M');
            $chartMonths[] = $monthName;

            $inc = FinanceTransaction::where('type', 'income')
                ->whereMonth('transaction_date', $m->month)
                ->whereYear('transaction_date', $m->year)
                ->sum('amount');

            $exp = FinanceTransaction::where('type', 'expense')
                ->whereMonth('transaction_date', $m->month)
                ->whereYear('transaction_date', $m->year)
                ->sum('amount');

            $incomeData[] = (float) $inc;
            $expenseData[] = (float) $exp;
        }

        // 5. Ringkasan HPP Produk per Unit (Dihitung dinamis dari tarif proses aktif)
        $productRates = ProductProcessRate::where('is_active', true)
            ->selectRaw('product_name, SUM(rate) as total_hpp, COUNT(id) as total_processes')
            ->groupBy('product_name')
            ->get();

        $hppSummary = $productRates->map(function ($item) {
            $hppComp = \App\Models\ProductHppComponent::where('product_name', $item->product_name)->first();
            $code = $hppComp?->code ?? 'PRD';

            return [
                'code' => $code,
                'name' => $item->product_name,
                'total_hpp' => (float) $item->total_hpp,
                'total_processes' => $item->total_processes,
                'trend' => '+2.1%',
                'updated_at' => Carbon::now()->format('d M'),
            ];
        });

        // 6. Aktivitas Terbaru (Kombinasi Finansial & Produksi Terkini)
        $recentFinances = FinanceTransaction::latest('transaction_date')
            ->take(3)
            ->get()
            ->map(function ($f) {
                return [
                    'id' => 'fin-' . $f->id,
                    'type' => $f->type,
                    'title' => $f->title,
                    'reference' => $f->transaction_number . ' - ' . Carbon::parse($f->transaction_date)->format('d M Y'),
                    'amount' => (float) $f->amount,
                    'formatted_amount' => ($f->type === 'income' ? '+ ' : '- ') . 'Rp ' . number_format($f->amount, 0, ',', '.'),
                    'is_negative' => $f->type === 'expense',
                    'date' => $f->transaction_date,
                    'icon' => $f->type === 'income' ? 'income' : 'expense',
                ];
            });

        $recentProductions = DailyProduction::with(['worker', 'items'])
            ->latest('production_date')
            ->take(3)
            ->get()
            ->map(function ($p) {
                $item = $p->items->first();
                $title = 'Produksi ' . ($item ? $item->product_name : 'Apparel');
                $sub = ($p->worker ? $p->worker->name : 'Pekerja') . ' - ' . $p->total_qty . ' pcs (' . $p->process_name . ')';

                return [
                    'id' => 'prd-' . $p->id,
                    'type' => 'production',
                    'title' => $title,
                    'reference' => $sub,
                    'amount' => (float) $p->total_wage,
                    'formatted_amount' => 'Rp ' . number_format($p->total_wage, 0, ',', '.'),
                    'is_negative' => false,
                    'date' => $p->production_date,
                    'icon' => 'production',
                ];
            });

        $recentActivities = $recentFinances->concat($recentProductions)->sortByDesc('date')->values()->take(5);

        return response()->json([
            'status' => 'success',
            'period' => 'Juni ' . $now->year,
            'metrics' => [
                'payroll_this_week' => [
                    'value' => (float) $payrollThisWeek,
                    'formatted' => 'Rp ' . number_format($payrollThisWeek, 0, ',', '.'),
                    'trend' => '+0,4%',
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => true,
                ],
                'total_income' => [
                    'value' => (float) $totalIncome,
                    'formatted' => 'Rp ' . number_format($totalIncome, 0, ',', '.'),
                    'trend' => '+12,0%',
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => true,
                ],
                'total_expense' => [
                    'value' => (float) $totalExpense,
                    'formatted' => 'Rp ' . number_format($totalExpense, 0, ',', '.'),
                    'trend' => '-3,2%',
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => false,
                ],
                'production_cost' => [
                    'value' => (float) $totalProductionCost,
                    'formatted' => 'Rp ' . number_format($totalProductionCost, 0, ',', '.'),
                    'trend' => '+5,1%',
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => true,
                ],
            ],
            'cashflow_chart' => [
                'months' => $chartMonths,
                'income' => $incomeData,
                'expense' => $expenseData,
            ],
            'hpp_summary' => $hppSummary,
            'recent_activities' => $recentActivities,
        ]);
    }
}
