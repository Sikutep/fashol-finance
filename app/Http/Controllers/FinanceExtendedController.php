<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyProduction;
use App\Models\Worker;
use App\Models\MonthlyPayroll;
use App\Models\ProductHppComponent;
use App\Models\ProductProcessRate;
use App\Models\FinanceTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class FinanceExtendedController extends Controller
{
    // 1. Payroll Mingguan (Kamis s/d Rabu)
    public function getWeeklyPayroll(Request $request)
    {
        $periodLabel = $request->input('period', '08 - 14 Oktober 2026');

        // Parse date range from period or default to Kamis s/d Rabu cycle
        $startDate = null;
        $endDate = null;
        $paymentDate = 'Kamis, 15 Oktober 2026';

        if (preg_match('/(\d{1,2})\s*-\s*(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})/', $periodLabel, $m)) {
            $monthMap = [
                'Januari' => '01', 'Februari' => '02', 'Maret' => '03', 'April' => '04',
                'Mei' => '05', 'Juni' => '06', 'Juli' => '07', 'Agustus' => '08',
                'September' => '09', 'Oktober' => '10', 'November' => '11', 'Desember' => '12',
                'January' => '01', 'February' => '02', 'March' => '03', 'April' => '04',
                'May' => '05', 'June' => '06', 'July' => '07', 'August' => '08',
                'September' => '09', 'October' => '10', 'November' => '11', 'December' => '12'
            ];
            $monthNum = $monthMap[$m[3]] ?? '10';
            $startDate = "{$m[4]}-{$monthNum}-" . str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $endDate = "{$m[4]}-{$monthNum}-" . str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $payCarbon = Carbon::parse($endDate)->addDay();
            $paymentDate = $payCarbon->translatedFormat('l, d F Y');
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = $request->start_date;
            $endDate = $request->end_date;
            $paymentDate = Carbon::parse($endDate)->addDay()->translatedFormat('l, d F Y');
        }

        // Query daily productions strictly within the period
        $query = DailyProduction::with('worker');
        if ($startDate && $endDate) {
            $query->whereBetween('production_date', [$startDate, $endDate]);
        }

        $grouped = $query->selectRaw('worker_id, SUM(total_qty) as total_qty, SUM(total_wage) as total_wage, COUNT(id) as total_trx, MAX(status) as max_status')
            ->groupBy('worker_id')
            ->get();

        $totalPayroll = 0;
        $items = [];
        $idx = 1;

        // Determine weekly status based on underlying records
        $determinedStatus = 'Draft';
        if ($grouped->isNotEmpty()) {
            $hasUnpaid = false;
            $hasDisetujui = false;
            foreach ($grouped as $g) {
                if ($g->max_status === 'Masuk Payroll') {
                    // Paid
                } elseif ($g->max_status === 'Disetujui') {
                    $hasDisetujui = true;
                    $hasUnpaid = true;
                } else {
                    $hasUnpaid = true;
                }
            }
            if (!$hasUnpaid) {
                $determinedStatus = 'Dibayar';
            } elseif ($hasDisetujui) {
                $determinedStatus = 'Disetujui';
            } else {
                $determinedStatus = 'Diperiksa';
            }
        }

        foreach ($grouped as $g) {
            $totalPayroll += (float) $g->total_wage;
            $itemStatus = $determinedStatus;
            $items[] = [
                'id' => $g->worker_id,
                'payroll_number' => 'PYW-' . Carbon::now()->format('ym') . '-' . str_pad($idx++, 2, '0', STR_PAD_LEFT),
                'worker_name' => $g->worker ? $g->worker->name : 'Pekerja #' . $g->worker_id,
                'period' => $periodLabel,
                'total_qty' => (int) $g->total_qty,
                'formatted_qty' => (int) $g->total_qty . ' pcs',
                'total_wage' => (float) $g->total_wage,
                'formatted_wage' => 'Rp ' . number_format($g->total_wage, 0, ',', '.'),
                'status' => $itemStatus,
            ];
        }

        // Available periods for dropdown selection (Kamis - Rabu)
        $availablePeriods = [
            '08 - 14 Oktober 2026',
            '01 - 07 Oktober 2026',
            '24 - 30 September 2026',
            '12 - 18 Juni 2025',
        ];

        $statusLabelMap = [
            'Draft' => 'Draft Pengajuan',
            'Diperiksa' => 'Siap diajukan ke Owner',
            'Disetujui' => 'Telah disetujui Owner',
            'Dibayar' => 'Telah dibayarkan kepada Pekerja',
        ];

        return response()->json([
            'status' => 'success',
            'period' => $periodLabel,
            'payment_date' => $paymentDate,
            'total_payroll' => $totalPayroll,
            'formatted_total_payroll' => 'Rp ' . number_format($totalPayroll, 0, ',', '.'),
            'status' => $determinedStatus,
            'status_label' => $statusLabelMap[$determinedStatus] ?? 'Siap diajukan ke Owner',
            'available_periods' => $availablePeriods,
            'data' => $items,
        ]);
    }

    public function updateWeeklyPayrollStatus(Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|in:Draft,Diperiksa,Disetujui,Dibayar',
            'period' => 'nullable|string',
        ]);

        $status = $validated['status'];
        $periodLabel = $validated['period'] ?? null;

        $dailyStatus = match($status) {
            'Dibayar' => 'Masuk Payroll',
            'Disetujui' => 'Disetujui',
            'Diperiksa' => 'Tercatat',
            default => 'Tercatat',
        };

        $query = DailyProduction::query();
        if ($periodLabel && preg_match('/(\d{1,2})\s*-\s*(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})/', $periodLabel, $m)) {
            $monthMap = [
                'Januari' => '01', 'Februari' => '02', 'Maret' => '03', 'April' => '04',
                'Mei' => '05', 'Juni' => '06', 'Juli' => '07', 'Agustus' => '08',
                'September' => '09', 'Oktober' => '10', 'November' => '11', 'Desember' => '12',
                'January' => '01', 'February' => '02', 'March' => '03', 'April' => '04',
                'May' => '05', 'June' => '06', 'July' => '07', 'August' => '08',
                'September' => '09', 'October' => '10', 'November' => '11', 'December' => '12'
            ];
            $monthNum = $monthMap[$m[3]] ?? '10';
            $startDate = "{$m[4]}-{$monthNum}-" . str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $endDate = "{$m[4]}-{$monthNum}-" . str_pad($m[2], 2, '0', STR_PAD_LEFT);
            $query->whereBetween('production_date', [$startDate, $endDate]);
        }

        $query->update(['status' => $dailyStatus]);

        return response()->json([
            'status' => 'success',
            'message' => 'Status payroll mingguan berhasil diperbarui menjadi ' . $status,
            'new_status' => $status,
        ]);
    }

    // 2. Payroll Bulanan (Staff & Administrasi)
    public function getMonthlyPayroll(Request $request)
    {
        $query = MonthlyPayroll::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('worker_name', 'like', "%{$s}%")
                  ->orWhere('position', 'like', "%{$s}%")
                  ->orWhere('payroll_number', 'like', "%{$s}%");
            });
        }

        if ($request->filled('period')) {
            $query->where('period', $request->period);
        }

        $items = $query->orderBy('id', 'asc')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'payroll_number' => $p->payroll_number,
                'worker_name' => $p->worker_name,
                'position' => $p->position,
                'basic_salary' => (float) $p->basic_salary,
                'formatted_basic_salary' => 'Rp ' . number_format($p->basic_salary, 0, ',', '.'),
                'allowance' => (float) $p->allowance,
                'formatted_allowance' => 'Rp ' . number_format($p->allowance, 0, ',', '.'),
                'overtime' => (float) $p->overtime,
                'formatted_overtime' => 'Rp ' . number_format($p->overtime, 0, ',', '.'),
                'total_salary' => (float) $p->total_salary,
                'formatted_total_salary' => 'Rp ' . number_format($p->total_salary, 0, ',', '.'),
                'status' => $p->status,
            ];
        });

        return response()->json([
            'status' => 'success',
            'period' => 'Juni 2025',
            'data' => $items,
        ]);
    }

    // 3. HPP Produk & Tarif Proses
    public function getHppProducts(Request $request)
    {
        $hppList = ProductHppComponent::where('status', 'Aktif')->get();

        $result = $hppList->map(function ($h) {
            // Get active process rates for this product
            $rates = ProductProcessRate::where('product_name', $h->product_name)
                ->where('is_active', true)
                ->get()
                ->map(function ($r) {
                    return [
                        'id' => $r->id,
                        'process_name' => $r->process_name,
                        'rate' => (float) $r->rate,
                        'formatted_rate' => 'Rp ' . number_format($r->rate, 0, ',', '.'),
                        'unit' => $r->unit,
                    ];
                });

            // Calculate percentage breakdown
            $total = (float) $h->total_hpp;
            $matPct = $total > 0 ? round(($h->material_cost / $total) * 100) : 0;
            $laborPct = $total > 0 ? round(($h->labor_cost / $total) * 100) : 0;
            $overheadPct = $total > 0 ? round(($h->overhead_cost / $total) * 100) : 0;

            return [
                'id' => $h->id,
                'name' => $h->product_name,
                'product_code' => $h->product_code,
                'code' => $h->code,
                'status' => $h->status,
                'effective_date' => $h->effective_date ? Carbon::parse($h->effective_date)->translatedFormat('d F Y') : '1 Juni 2025',
                'total_hpp' => (float) $h->total_hpp,
                'formatted_total_hpp' => 'Rp ' . number_format($h->total_hpp, 0, ',', '.'),
                'components' => [
                    [
                        'name' => 'Bahan & Material',
                        'percentage' => $matPct,
                        'amount' => (float) $h->material_cost,
                        'formatted_amount' => 'Rp ' . number_format($h->material_cost, 0, ',', '.'),
                    ],
                    [
                        'name' => 'Upah Proses Produksi',
                        'percentage' => $laborPct,
                        'amount' => (float) $h->labor_cost,
                        'formatted_amount' => 'Rp ' . number_format($h->labor_cost, 0, ',', '.'),
                    ],
                    [
                        'name' => 'Overhead & Biaya Lain',
                        'percentage' => $overheadPct,
                        'amount' => (float) $h->overhead_cost,
                        'formatted_amount' => 'Rp ' . number_format($h->overhead_cost, 0, ',', '.'),
                    ],
                ],
                'rates' => $rates,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    // 4. Keuangan (Pendapatan & Pengeluaran)
    public function getFinanceTransactions(Request $request)
    {
        $query = FinanceTransaction::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('transaction_number', 'like', "%{$s}%")
                  ->orWhere('category', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%");
            });
        }

        if ($request->filled('type') && $request->type !== 'Semua') {
            $query->where('type', $request->type === 'Pendapatan' ? 'income' : 'expense');
        }

        // Top 3 Metrics
        $totalIncome = (float) FinanceTransaction::where('type', 'income')->sum('amount');
        $totalExpense = (float) FinanceTransaction::where('type', 'expense')->sum('amount');
        $netBalance = $totalIncome - $totalExpense;

        $perPage = $request->input('per_page', 10);
        $transactions = $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        $formatted = collect($transactions->items())->map(function ($t) {
            $isIncome = $t->type === 'income';
            return [
                'id' => $t->id,
                'transaction_number' => $t->transaction_number,
                'date' => Carbon::parse($t->transaction_date)->translatedFormat('d M Y'),
                'type' => $isIncome ? 'Pendapatan' : 'Pengeluaran',
                'category' => $t->category,
                'description' => $t->title,
                'amount' => (float) $t->amount,
                'formatted_amount' => ($isIncome ? '+ ' : '- ') . 'Rp ' . number_format($t->amount, 0, ',', '.'),
                'is_income' => $isIncome,
                'status' => 'Tercatat',
            ];
        });

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total_income' => $totalIncome,
                'formatted_income' => 'Rp ' . number_format($totalIncome, 0, ',', '.'),
                'total_expense' => $totalExpense,
                'formatted_expense' => 'Rp ' . number_format($totalExpense, 0, ',', '.'),
                'net_balance' => $netBalance,
                'formatted_net_balance' => 'Rp ' . number_format($netBalance, 0, ',', '.'),
            ],
            'data' => $formatted,
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function storeFinanceTransaction(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'category' => 'required|string|max:100',
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'transaction_date' => 'required|date',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $trxNumber = 'TRX-' . Carbon::parse($validated['transaction_date'])->format('ymd') . '-' . str_pad(rand(1, 99), 2, '0', STR_PAD_LEFT);

        $trx = FinanceTransaction::create([
            'transaction_number' => $trxNumber,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'title' => $validated['title'],
            'amount' => $validated['amount'],
            'transaction_date' => $validated['transaction_date'],
            'reference' => $validated['reference'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Transaksi keuangan berhasil dicatat.',
            'data' => $trx,
        ], 201);
    }

    public function updateMonthlyPayrollStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:Draft,Diperiksa,Disetujui,Dibayar',
            'period' => 'nullable|string',
        ]);

        $status = $validated['status'];

        if ($id === 'all') {
            $query = MonthlyPayroll::query();
            if (!empty($validated['period'])) {
                $query->where('period', $validated['period']);
            }
            $query->update(['status' => $status]);
            $message = "Seluruh status payroll bulanan berhasil diperbarui menjadi {$status}";
        } else {
            $payroll = MonthlyPayroll::findOrFail($id);
            $payroll->update(['status' => $status]);
            $message = "Status payroll {$payroll->worker_name} berhasil diperbarui menjadi {$status}";
        }

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'new_status' => $status,
        ]);
    }

    public function updateHppStatus(Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|string',
        ]);

        ProductHppComponent::query()->update(['status' => $validated['status']]);

        return response()->json([
            'status' => 'success',
            'message' => 'Standar HPP berhasil dikunci dan divalidasi.',
            'new_status' => $validated['status'],
        ]);
    }

    // 5. Rekap Biaya Produksi (Image 5)
    public function getProductionCostSummary(Request $request)
    {
        $period = $request->input('period', 'Juni 2025');

        // Dynamic components queried directly from DailyProduction and FinanceTransaction
        $wageWeekly = (float) DailyProduction::sum('total_wage');

        $matExpense = (float) FinanceTransaction::where('type', 'expense')
            ->where(function($q) {
                $q->where('category', 'like', '%Bahan%')
                  ->orWhere('title', 'like', '%Bahan%')
                  ->orWhere('title', 'like', '%Kain%')
                  ->orWhere('title', 'like', '%Benang%');
            })->sum('amount');

        $serviceExpense = (float) FinanceTransaction::where('type', 'expense')
            ->where(function($q) {
                $q->where('category', 'like', '%Jasa%')
                  ->orWhere('title', 'like', '%Jasa%')
                  ->orWhere('title', 'like', '%Sablon%')
                  ->orWhere('title', 'like', '%Bordir%');
            })->sum('amount');

        $repairExpense = (float) FinanceTransaction::where('type', 'expense')
            ->where(function($q) {
                $q->where('category', 'like', '%Repair%')
                  ->orWhere('title', 'like', '%Repair%')
                  ->orWhere('title', 'like', '%Rework%')
                  ->orWhere('title', 'like', '%Reject%');
            })->sum('amount');

        $overheadCost = (float) FinanceTransaction::where('type', 'expense')
            ->where(function($q) {
                $q->where('category', 'like', '%Overhead%')
                  ->orWhere('title', 'like', '%Overhead%')
                  ->orWhere('category', 'like', '%Operasional & Utilitas%');
            })->sum('amount');

        $totalCost = $wageWeekly + $matExpense + $serviceExpense + $repairExpense + $overheadCost;
        $totalOutput = (int) DailyProduction::sum('total_qty');
        $avgCostPerUnit = $totalOutput > 0 ? round($totalCost / $totalOutput) : 0;

        // Dynamic target calculation
        $targetAvgHpp = (float) ProductHppComponent::where('status', 'Aktif')->avg('total_hpp');
        if ($targetAvgHpp <= 0) $targetAvgHpp = 50000;
        
        $efficiencyPct = $avgCostPerUnit > 0 ? round(min(100.0, ($targetAvgHpp / $avgCostPerUnit) * 100), 1) : 98.4;

        $rows = [
            [
                'component' => 'Upah Produksi Mingguan',
                'source' => 'Payroll Mingguan',
                'amount' => $wageWeekly,
                'formatted_amount' => 'Rp ' . number_format($wageWeekly, 0, ',', '.'),
                'link_type' => 'Otomatis',
                'link_color' => 'emerald',
            ],
            [
                'component' => 'Bahan & Material',
                'source' => 'Keuangan',
                'amount' => $matExpense,
                'formatted_amount' => 'Rp ' . number_format($matExpense, 0, ',', '.'),
                'link_type' => 'Terhubung',
                'link_color' => 'teal',
            ],
            [
                'component' => 'Jasa Produksi Lainnya',
                'source' => 'Keuangan',
                'amount' => $serviceExpense,
                'formatted_amount' => 'Rp ' . number_format($serviceExpense, 0, ',', '.'),
                'link_type' => 'Terhubung',
                'link_color' => 'teal',
            ],
            [
                'component' => 'Repair & Rework',
                'source' => 'Keuangan',
                'amount' => $repairExpense,
                'formatted_amount' => 'Rp ' . number_format($repairExpense, 0, ',', '.'),
                'link_type' => 'Terhubung',
                'link_color' => 'teal',
            ],
            [
                'component' => 'Overhead Produksi',
                'source' => 'Alokasi',
                'amount' => $overheadCost,
                'formatted_amount' => 'Rp ' . number_format($overheadCost, 0, ',', '.'),
                'link_type' => 'Tercatat',
                'link_color' => 'slate',
            ],
        ];

        return response()->json([
            'status' => 'success',
            'period' => $period,
            'summary' => [
                'total_cost' => $totalCost,
                'formatted_total_cost' => 'Rp ' . number_format($totalCost, 0, ',', '.'),
                'avg_cost_per_unit' => $avgCostPerUnit,
                'formatted_avg_cost' => 'Rp ' . number_format($avgCostPerUnit, 0, ',', '.'),
                'total_output' => $totalOutput,
                'formatted_output' => number_format($totalOutput, 0, ',', '.') . ' pcs',
                'target_avg_hpp' => $targetAvgHpp,
                'formatted_target_avg_hpp' => 'Rp ' . number_format($targetAvgHpp, 0, ',', '.'),
                'efficiency_percentage' => $efficiencyPct,
                'formatted_efficiency' => $efficiencyPct . '% efisien',
            ],
            'components' => $rows,
        ]);
    }
}
