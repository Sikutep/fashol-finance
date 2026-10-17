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

        $payrollThisWeek = (float) DailyProduction::whereBetween('production_date', [
            $payrollStart->format('Y-m-d'),
            $payrollEnd->format('Y-m-d')
        ])->sum('total_wage');

        $prevWeekStart = $payrollStart->copy()->subDays(7);
        $prevWeekEnd = $payrollEnd->copy()->subDays(7);
        $prevWeekPayroll = (float) DailyProduction::whereBetween('production_date', [
            $prevWeekStart->format('Y-m-d'),
            $prevWeekEnd->format('Y-m-d')
        ])->sum('total_wage');

        $payrollTrend = 0.0;
        $payrollTrendPos = true;
        if ($prevWeekPayroll > 0) {
            $payrollTrend = round((($payrollThisWeek - $prevWeekPayroll) / $prevWeekPayroll) * 100, 1);
            $payrollTrendPos = $payrollTrend >= 0;
        } elseif ($payrollThisWeek > 0) {
            $payrollTrend = 100.0;
            $payrollTrendPos = true;
        }
        $payrollTrendFormatted = ($payrollTrend >= 0 ? '+' : '') . str_replace('.', ',', (string)$payrollTrend) . '%';

        // 2. Total Pendapatan & Pengeluaran Bulan Ini vs Bulan Lalu
        $totalIncome = (float) FinanceTransaction::where('type', 'income')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');

        $prevMonthDate = $now->copy()->subMonth();
        $prevMonthIncome = (float) FinanceTransaction::where('type', 'income')
            ->whereMonth('transaction_date', $prevMonthDate->month)
            ->whereYear('transaction_date', $prevMonthDate->year)
            ->sum('amount');

        $incomeTrend = 0.0;
        $incomeTrendPos = true;
        if ($prevMonthIncome > 0) {
            $incomeTrend = round((($totalIncome - $prevMonthIncome) / $prevMonthIncome) * 100, 1);
            $incomeTrendPos = $incomeTrend >= 0;
        } elseif ($totalIncome > 0) {
            $incomeTrend = 100.0;
            $incomeTrendPos = true;
        }
        $incomeTrendFormatted = ($incomeTrend >= 0 ? '+' : '') . str_replace('.', ',', (string)$incomeTrend) . '%';

        $totalExpense = (float) FinanceTransaction::where('type', 'expense')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');

        $prevMonthExpense = (float) FinanceTransaction::where('type', 'expense')
            ->whereMonth('transaction_date', $prevMonthDate->month)
            ->whereYear('transaction_date', $prevMonthDate->year)
            ->sum('amount');

        $expenseTrend = 0.0;
        $expenseTrendPos = false;
        if ($prevMonthExpense > 0) {
            $expenseTrend = round((($totalExpense - $prevMonthExpense) / $prevMonthExpense) * 100, 1);
            $expenseTrendPos = $expenseTrend <= 0;
        } elseif ($totalExpense > 0) {
            $expenseTrend = 100.0;
            $expenseTrendPos = false;
        }
        $expenseTrendFormatted = ($expenseTrend >= 0 ? '+' : '') . str_replace('.', ',', (string)$expenseTrend) . '%';

        // 3. Biaya Produksi Bulan Ini vs Bulan Lalu
        $productionWageTotal = (float) DailyProduction::whereMonth('production_date', $now->month)
            ->whereYear('production_date', $now->year)
            ->sum('total_wage');
        $productionMaterialExpense = (float) FinanceTransaction::where('type', 'expense')
            ->where('category', 'like', '%Bahan%')
            ->whereMonth('transaction_date', $now->month)
            ->whereYear('transaction_date', $now->year)
            ->sum('amount');
        $totalProductionCost = $productionWageTotal + $productionMaterialExpense;

        $prevProdWage = (float) DailyProduction::whereMonth('production_date', $prevMonthDate->month)
            ->whereYear('production_date', $prevMonthDate->year)
            ->sum('total_wage');
        $prevProdMat = (float) FinanceTransaction::where('type', 'expense')
            ->where('category', 'like', '%Bahan%')
            ->whereMonth('transaction_date', $prevMonthDate->month)
            ->whereYear('transaction_date', $prevMonthDate->year)
            ->sum('amount');
        $prevProdCost = $prevProdWage + $prevProdMat;

        $prodCostTrend = 0.0;
        $prodCostTrendPos = true;
        if ($prevProdCost > 0) {
            $prodCostTrend = round((($totalProductionCost - $prevProdCost) / $prevProdCost) * 100, 1);
            $prodCostTrendPos = $prodCostTrend >= 0;
        } elseif ($totalProductionCost > 0) {
            $prodCostTrend = 100.0;
            $prodCostTrendPos = true;
        }
        $prodCostTrendFormatted = ($prodCostTrend >= 0 ? '+' : '') . str_replace('.', ',', (string)$prodCostTrend) . '%';

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
                'trend' => 'Aktif',
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

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $currentPeriodLabel = ($monthNames[$now->month] ?? $now->format('F')) . ' ' . $now->year;

        return response()->json([
            'status' => 'success',
            'period' => $currentPeriodLabel,
            'metrics' => [
                'payroll_this_week' => [
                    'value' => (float) $payrollThisWeek,
                    'formatted' => 'Rp ' . number_format($payrollThisWeek, 0, ',', '.'),
                    'trend' => $payrollTrendFormatted,
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => $payrollTrendPos,
                ],
                'total_income' => [
                    'value' => (float) $totalIncome,
                    'formatted' => 'Rp ' . number_format($totalIncome, 0, ',', '.'),
                    'trend' => $incomeTrendFormatted,
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => $incomeTrendPos,
                ],
                'total_expense' => [
                    'value' => (float) $totalExpense,
                    'formatted' => 'Rp ' . number_format($totalExpense, 0, ',', '.'),
                    'trend' => $expenseTrendFormatted,
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => $expenseTrendPos,
                ],
                'production_cost' => [
                    'value' => (float) $totalProductionCost,
                    'formatted' => 'Rp ' . number_format($totalProductionCost, 0, ',', '.'),
                    'trend' => $prodCostTrendFormatted,
                    'trend_label' => 'dibanding periode lalu',
                    'is_positive' => $prodCostTrendPos,
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
