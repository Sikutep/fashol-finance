<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyProduction;
use App\Models\Worker;
use App\Models\MonthlyPayroll;
use App\Models\ProductHppComponent;
use App\Models\ProductProcessRate;
use App\Models\ProductGroup;
use App\Models\Product;
use App\Models\FinanceTransaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class FinanceExtendedController extends Controller
{
    /**
     * Parse date range from period label (supports same-month, cross-month, cross-year, or Y-m-d).
     */
    protected function parsePeriodDates(?string $periodLabel): array
    {
        $monthMap = [
            'Januari' => '01', 'Februari' => '02', 'Maret' => '03', 'April' => '04',
            'Mei' => '05', 'Juni' => '06', 'Juli' => '07', 'Agustus' => '08',
            'September' => '09', 'Oktober' => '10', 'November' => '11', 'Desember' => '12',
            'January' => '01', 'February' => '02', 'March' => '03', 'April' => '04',
            'May' => '05', 'June' => '06', 'July' => '07', 'August' => '08',
            'September' => '09', 'October' => '10', 'November' => '11', 'December' => '12'
        ];

        if (empty($periodLabel)) {
            return [null, null];
        }

        // Case 1: Cross-month or cross-year e.g. "29 Oktober - 04 November 2026" or "31 Desember 2026 - 06 Januari 2027"
        if (preg_match('/(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/', $periodLabel, $m)) {
            $mStart = $monthMap[ucfirst(strtolower($m[2]))] ?? null;
            $mEnd = $monthMap[ucfirst(strtolower($m[5]))] ?? null;
            if (!$mStart || !$mEnd) {
                return [null, null];
            }
            $yEnd = $m[6];
            $yStart = !empty($m[3]) ? $m[3] : $yEnd;

            $startDate = "{$yStart}-{$mStart}-" . str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $endDate = "{$yEnd}-{$mEnd}-" . str_pad($m[4], 2, '0', STR_PAD_LEFT);
            return [$startDate, $endDate];
        }

        // Case 2: Same-month e.g. "08 - 14 Oktober 2026"
        if (preg_match('/(\d{1,2})\s*-\s*(\d{1,2})\s*([A-Za-z]+)\s*(\d{4})/', $periodLabel, $m)) {
            $monthNum = $monthMap[ucfirst(strtolower($m[3]))] ?? null;
            if (!$monthNum) {
                return [null, null];
            }
            $startDate = "{$m[4]}-{$monthNum}-" . str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $endDate = "{$m[4]}-{$monthNum}-" . str_pad($m[2], 2, '0', STR_PAD_LEFT);
            return [$startDate, $endDate];
        }

        return [null, null];
    }

    // 1. Payroll Mingguan (Kamis s/d Rabu)
    public function getWeeklyPayroll(Request $request)
    {
        $now = Carbon::now();

        // Calculate dynamic current weekly cycle (Thursday to Wednesday)
        $dayOfWeek = $now->dayOfWeek; // 0 = Sun, 4 = Thu
        if ($dayOfWeek >= Carbon::THURSDAY) {
            $currStart = $now->copy()->previous(Carbon::THURSDAY);
            if ($dayOfWeek === Carbon::THURSDAY) {
                $currStart = $now->copy()->startOfDay();
            }
            $currEnd = $currStart->copy()->addDays(6)->endOfDay();
        } else {
            $currStart = $now->copy()->subWeek()->next(Carbon::THURSDAY)->startOfDay();
            $currEnd = $currStart->copy()->addDays(6)->endOfDay();
        }

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        // Format dynamic current period label
        if ($currStart->month === $currEnd->month) {
            $defaultPeriodLabel = sprintf('%02d - %02d %s %d', $currStart->day, $currEnd->day, $monthNames[$currEnd->month], $currEnd->year);
        } else {
            $defaultPeriodLabel = sprintf('%02d %s - %02d %s %d', $currStart->day, $monthNames[$currStart->month], $currEnd->day, $monthNames[$currEnd->month], $currEnd->year);
        }

        $periodLabel = $request->input('period', $defaultPeriodLabel);

        $startDate = null;
        $endDate = null;

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = $request->start_date;
            $endDate = $request->end_date;
        } else {
            [$startDate, $endDate] = $this->parsePeriodDates($periodLabel);
            if (!$startDate || !$endDate) {
                $startDate = $currStart->format('Y-m-d');
                $endDate = $currEnd->format('Y-m-d');
            }
        }

        $payCarbon = Carbon::parse($endDate)->addDay();
        $daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $paymentDate = $daysIndo[$payCarbon->dayOfWeek] . ', ' . $payCarbon->day . ' ' . ($monthNames[$payCarbon->month] ?? $payCarbon->format('F')) . ' ' . $payCarbon->year;

        // Query daily productions strictly within the period
        $query = DailyProduction::with('worker');
        if ($startDate && $endDate) {
            $query->whereBetween('production_date', [$startDate, $endDate]);
        }

        $grouped = $query->selectRaw('worker_id, SUM(total_qty) as total_qty, SUM(total_wage) as total_wage, COUNT(id) as total_trx, MAX(status) as max_status, MIN(status) as min_status')
            ->groupBy('worker_id')
            ->get();

        $totalPayroll = 0;
        $items = [];
        $idx = 1;

        // Determine weekly status based on underlying records
        $determinedStatus = 'Draft';
        if ($grouped->isNotEmpty()) {
            $allPaid = true;
            $allApprovedOrPaid = true;
            $hasDiperiksa = false;
            $hasDraftOnly = true;

            foreach ($grouped as $g) {
                $st = $g->max_status;
                if (!in_array($st, ['Dibayar', 'Masuk Payroll'])) {
                    $allPaid = false;
                }
                if (!in_array($st, ['Disetujui', 'Dibayar', 'Masuk Payroll'])) {
                    $allApprovedOrPaid = false;
                }
                if (in_array($st, ['Diperiksa', 'Tercatat', 'Disetujui', 'Dibayar', 'Masuk Payroll'])) {
                    $hasDraftOnly = false;
                }
                if (in_array($st, ['Diperiksa', 'Tercatat'])) {
                    $hasDiperiksa = true;
                }
            }

            if ($allPaid) {
                $determinedStatus = 'Dibayar';
            } elseif ($allApprovedOrPaid) {
                $determinedStatus = 'Disetujui';
            } elseif ($hasDiperiksa) {
                $determinedStatus = 'Diperiksa';
            } else {
                $determinedStatus = 'Draft';
            }
        }

        foreach ($grouped as $g) {
            $totalPayroll += (float) $g->total_wage;
            $items[] = [
                'id' => $g->worker_id,
                'worker_id' => $g->worker_id,
                'payroll_number' => 'PYW-' . Carbon::parse($endDate)->format('ym') . '-' . str_pad($idx++, 2, '0', STR_PAD_LEFT),
                'worker_name' => $g->worker ? $g->worker->name : 'Pekerja #' . $g->worker_id,
                'period' => $periodLabel,
                'total_qty' => (int) $g->total_qty,
                'formatted_qty' => (int) $g->total_qty . ' pcs',
                'total_wage' => (float) $g->total_wage,
                'formatted_wage' => 'Rp ' . number_format($g->total_wage, 0, ',', '.'),
                'status' => $determinedStatus,
            ];
        }

        // Available periods for dropdown selection (Kamis - Rabu dinamis)
        $availablePeriods = [$defaultPeriodLabel];
        $scanStart = $currStart->copy();
        for ($w = 1; $w <= 8; $w++) {
            $pastStart = $scanStart->copy()->subWeeks($w);
            $pastEnd = $pastStart->copy()->addDays(6);
            if ($pastStart->month === $pastEnd->month) {
                $lbl = sprintf('%02d - %02d %s %d', $pastStart->day, $pastEnd->day, $monthNames[$pastEnd->month] ?? $pastEnd->format('F'), $pastEnd->year);
            } else {
                $lbl = sprintf('%02d %s - %02d %s %d', $pastStart->day, $monthNames[$pastStart->month] ?? $pastStart->format('F'), $pastEnd->day, $monthNames[$pastEnd->month] ?? $pastEnd->format('F'), $pastEnd->year);
            }
            $availablePeriods[] = $lbl;
        }

        if ($periodLabel && !in_array($periodLabel, $availablePeriods)) {
            array_unshift($availablePeriods, $periodLabel);
        }
        $availablePeriods = array_values(array_unique($availablePeriods));

        $statusLabelMap = [
            'Draft' => 'Draft Pengajuan',
            'Diperiksa' => 'Siap diajukan ke Owner',
            'Disetujui' => 'Telah disetujui Owner',
            'Dibayar' => 'Telah dibayarkan kepada Pekerja',
        ];

        return response()->json([
            'status' => 'success',
            'payroll_status' => $determinedStatus,
            'period' => $periodLabel,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'payment_date' => $paymentDate,
            'total_payroll' => $totalPayroll,
            'formatted_total_payroll' => 'Rp ' . number_format($totalPayroll, 0, ',', '.'),
            'status_label' => $statusLabelMap[$determinedStatus] ?? 'Draft Pengajuan',
            'available_periods' => $availablePeriods,
            'data' => $items,
        ]);
    }

    public function updateWeeklyPayrollStatus(Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|in:Draft,Diperiksa,Disetujui,Dibayar',
            'period' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $status = $validated['status'];

        // Scope Guard & RBAC: Only Owner can approve or pay payroll
        if (in_array($status, ['Disetujui', 'Dibayar']) && !Auth::user()->isOwner()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Owner yang memiliki wewenang untuk menyetujui atau menandai payroll dibayar.',
            ], 403);
        }

        $dailyStatus = match($status) {
            'Dibayar' => 'Dibayar',
            'Disetujui' => 'Disetujui',
            'Diperiksa' => 'Diperiksa',
            'Draft' => 'Draft',
            default => 'Draft',
        };

        $query = DailyProduction::query();
        if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
            $query->whereBetween('production_date', [$validated['start_date'], $validated['end_date']]);
        } elseif (!empty($validated['period'])) {
            [$sDate, $eDate] = $this->parsePeriodDates($validated['period']);
            if ($sDate && $eDate) {
                $query->whereBetween('production_date', [$sDate, $eDate]);
            }
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
        $now = Carbon::now();
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $defaultPeriodLabel = ($monthNames[$now->month] ?? $now->format('F')) . ' ' . $now->year;
        $periodLabel = $request->input('period', $defaultPeriodLabel);

        // Ensure monthly payroll records exist for this period if empty
        $this->ensureMonthlyPayrollForPeriod($periodLabel);

        $query = MonthlyPayroll::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('worker_name', 'like', "%{$s}%")
                  ->orWhere('position', 'like', "%{$s}%")
                  ->orWhere('payroll_number', 'like', "%{$s}%");
            });
        }

        $query->where('period', $periodLabel);

        $items = $query->orderBy('id', 'asc')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'worker_id' => $p->worker_id,
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

        // Available periods for dropdown selection (current + past 11 months + any in DB)
        $availablePeriods = [$defaultPeriodLabel];
        for ($m = 1; $m <= 11; $m++) {
            $pastDate = $now->copy()->subMonths($m);
            $availablePeriods[] = ($monthNames[$pastDate->month] ?? $pastDate->format('F')) . ' ' . $pastDate->year;
        }
        $dbPeriods = MonthlyPayroll::distinct()->pluck('period')->toArray();
        $availablePeriods = array_values(array_unique(array_merge($availablePeriods, $dbPeriods)));

        return response()->json([
            'status' => 'success',
            'period' => $periodLabel,
            'available_periods' => $availablePeriods,
            'data' => $items,
        ]);
    }

    protected function ensureMonthlyPayrollForPeriod(string $periodLabel): void
    {
        $existingCount = MonthlyPayroll::where('period', $periodLabel)->count();
        if ($existingCount > 0) {
            return;
        }

        // Get all active staff / monthly workers
        $monthlyWorkers = Worker::where('status', 'Aktif')
            ->where(function ($q) {
                $q->where('payment_system', 'Bulanan')
                  ->orWhere('type', 'Staff');
            })
            ->get();

        if ($monthlyWorkers->isEmpty()) {
            return;
        }

        $now = Carbon::now();
        $dateCode = $now->format('ym');

        $countThisMonth = MonthlyPayroll::where('payroll_number', 'like', "PYM-{$dateCode}%")->count();
        $seq = $countThisMonth + 1;

        foreach ($monthlyWorkers as $w) {
            $lastPayroll = MonthlyPayroll::where('worker_id', $w->id)->latest('id')->first();
            $basicSalary = $lastPayroll ? (float) $lastPayroll->basic_salary : 0.0;
            $allowance = $lastPayroll ? (float) $lastPayroll->allowance : 0.0;
            $overtime = 0.0;
            $totalSalary = $basicSalary + $allowance + $overtime;

            $pNumber = 'PYM-' . $dateCode . '-' . str_pad($seq++, 2, '0', STR_PAD_LEFT);
            while (MonthlyPayroll::where('payroll_number', $pNumber)->exists()) {
                $pNumber = 'PYM-' . $dateCode . '-' . str_pad($seq++, 2, '0', STR_PAD_LEFT);
            }

            MonthlyPayroll::create([
                'payroll_number' => $pNumber,
                'worker_id' => $w->id,
                'worker_name' => $w->name,
                'position' => $w->process ?: 'Staff Operasional',
                'period' => $periodLabel,
                'basic_salary' => $basicSalary,
                'allowance' => $allowance,
                'overtime' => $overtime,
                'deductions' => 0,
                'total_salary' => $totalSalary,
                'status' => 'Diperiksa',
            ]);
        }
    }

    // 3. HPP Produk & Tarif Proses
    public function getHppProducts(Request $request)
    {
        // Ensure HPP standards and process rates exist for all product groups in database
        $this->ensureHppStandardsExist();

        $hppList = ProductHppComponent::where('status', 'Aktif')->get();

        $result = $hppList->map(function ($h) {
            // Get active process rates strictly for this product group
            $grp = ProductGroup::where('name', $h->product_name)->first();
            $rates = ProductProcessRate::where('is_active', true)
                ->where(function ($q) use ($h, $grp) {
                    if ($grp) {
                        $q->where('product_group_id', $grp->id);
                    } else {
                        $q->where('product_name', $h->product_name);
                    }
                })
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

            // Calculate live labor cost from sum of process rates if available
            $laborCost = $rates->isNotEmpty() ? $rates->sum('rate') : (float) $h->labor_cost;
            $total = (float) ($h->material_cost + $laborCost + $h->overhead_cost);

            // Keep persisted values updated
            if (abs($h->labor_cost - $laborCost) > 0.01 || abs($h->total_hpp - $total) > 0.01) {
                $h->update([
                    'labor_cost' => $laborCost,
                    'total_hpp' => $total,
                ]);
            }

            $matPct = $total > 0 ? round(($h->material_cost / $total) * 100) : 0;
            $laborPct = $total > 0 ? round(($laborCost / $total) * 100) : 0;
            $overheadPct = $total > 0 ? round(($h->overhead_cost / $total) * 100) : 0;

            return [
                'id' => $h->id,
                'name' => $h->product_name,
                'product_code' => $h->product_code,
                'code' => $h->code,
                'status' => $h->status,
                'effective_date' => $h->effective_date ? Carbon::parse($h->effective_date)->translatedFormat('d F Y') : Carbon::now()->translatedFormat('d F Y'),
                'total_hpp' => $total,
                'formatted_total_hpp' => 'Rp ' . number_format($total, 0, ',', '.'),
                'material_cost' => (float) $h->material_cost,
                'labor_cost' => (float) $laborCost,
                'overhead_cost' => (float) $h->overhead_cost,
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
                        'amount' => (float) $laborCost,
                        'formatted_amount' => 'Rp ' . number_format($laborCost, 0, ',', '.'),
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

    public function updateHppItem(Request $request, $id)
    {
        $hpp = ProductHppComponent::findOrFail($id);
        $validated = $request->validate([
            'material_cost' => 'required|numeric|min:0',
            'overhead_cost' => 'required|numeric|min:0',
            'effective_date' => 'nullable|date',
            'status' => 'nullable|in:Aktif,Nonaktif',
        ]);

        $laborCost = (float) $hpp->labor_cost;
        $totalHpp = $validated['material_cost'] + $laborCost + $validated['overhead_cost'];

        $hpp->update([
            'material_cost' => $validated['material_cost'],
            'overhead_cost' => $validated['overhead_cost'],
            'total_hpp' => $totalHpp,
            'effective_date' => $validated['effective_date'] ?? now(),
            'status' => $validated['status'] ?? $hpp->status,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Standar HPP untuk {$hpp->product_name} berhasil diperbarui.",
            'data' => $hpp,
        ]);
    }

    public static function ensureHppStandardsExist(): void
    {
        $groups = ProductGroup::all();
        if ($groups->isEmpty()) {
            return;
        }

        // Pastikan setiap grup produk memiliki record HPP Component tanpa meng-inject data dummy
        foreach ($groups as $g) {
            $hpp = ProductHppComponent::where('product_name', $g->name)->first();
            if (!$hpp) {
                $cleanCode = strtoupper(substr(str_replace(' ', '', $g->name), 0, 4));
                $code = strtoupper(substr(str_replace(' ', '', $g->name), 0, 3));
                $labor = (float) ProductProcessRate::where('is_active', true)
                    ->where(function ($q) use ($g) {
                        $q->where('product_group_id', $g->id)->orWhere('product_name', $g->name);
                    })->sum('rate');

                ProductHppComponent::create([
                    'product_name' => $g->name,
                    'product_code' => 'PRD-' . $cleanCode,
                    'code' => $code,
                    'material_cost' => 0,
                    'labor_cost' => $labor,
                    'overhead_cost' => 0,
                    'total_hpp' => $labor,
                    'effective_date' => Carbon::now(),
                    'status' => 'Aktif',
                ]);
            }
        }
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

        $datePart = Carbon::parse($validated['transaction_date'])->format('ymd');
        $countToday = FinanceTransaction::where('transaction_number', 'like', "TRX-{$datePart}%")->count();
        $seq = $countToday + 1;
        $trxNumber = 'TRX-' . $datePart . '-' . str_pad($seq, 2, '0', STR_PAD_LEFT);

        while (FinanceTransaction::where('transaction_number', $trxNumber)->exists()) {
            $seq++;
            $trxNumber = 'TRX-' . $datePart . '-' . str_pad($seq, 2, '0', STR_PAD_LEFT);
        }

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

        // Scope Guard & RBAC: Only Owner can approve or pay monthly payroll
        if (in_array($status, ['Disetujui', 'Dibayar']) && !Auth::user()->isOwner()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Owner yang memiliki wewenang untuk menyetujui atau menandai payroll bulanan dibayar.',
            ], 403);
        }

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
        // Scope Guard & RBAC: Only Owner can lock & validate HPP standards
        if (!Auth::user()->isOwner()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Owner yang memiliki wewenang untuk mengunci dan memvalidasi standar HPP.',
            ], 403);
        }

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
        $now = Carbon::now();
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $defaultPeriodLabel = ($monthNames[$now->month] ?? $now->format('F')) . ' ' . $now->year;
        $period = $request->input('period', $defaultPeriodLabel);

        $monthMap = [
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
            'January' => 1, 'February' => 2, 'March' => 3, 'April' => 4,
            'May' => 5, 'June' => 6, 'July' => 7, 'August' => 8,
            'September' => 9, 'October' => 10, 'November' => 11, 'December' => 12
        ];

        $targetMonth = null;
        $targetYear = null;
        if (preg_match('/([A-Za-z]+)\s*(\d{4})/', $period, $pm)) {
            $targetMonth = $monthMap[$pm[1]] ?? null;
            $targetYear = (int) $pm[2];
        }

        // Filter queries by period if specified
        $dailyQuery = DailyProduction::query();
        $expenseQuery = FinanceTransaction::where('type', 'expense');

        if ($targetMonth && $targetYear) {
            $dailyQuery->whereYear('production_date', $targetYear)->whereMonth('production_date', $targetMonth);
            $expenseQuery->whereYear('transaction_date', $targetYear)->whereMonth('transaction_date', $targetMonth);
        }

        $wageWeekly = (float) (clone $dailyQuery)->sum('total_wage');
        $totalOutput = (int) (clone $dailyQuery)->sum('total_qty');

        $matExpense = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('category', 'like', '%Bahan%')
              ->orWhere('title', 'like', '%Bahan%')
              ->orWhere('title', 'like', '%Kain%')
              ->orWhere('title', 'like', '%Benang%');
        })->sum('amount');

        $serviceExpense = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('category', 'like', '%Jasa%')
              ->orWhere('title', 'like', '%Jasa%')
              ->orWhere('title', 'like', '%Sablon%')
              ->orWhere('title', 'like', '%Bordir%');
        })->sum('amount');

        $repairExpense = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('category', 'like', '%Repair%')
              ->orWhere('title', 'like', '%Repair%')
              ->orWhere('title', 'like', '%Rework%')
              ->orWhere('title', 'like', '%Reject%');
        })->sum('amount');

        $overheadCost = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('category', 'like', '%Overhead%')
              ->orWhere('title', 'like', '%Overhead%')
              ->orWhere('category', 'like', '%Operasional & Utilitas%');
        })->sum('amount');

        $totalCost = $wageWeekly + $matExpense + $serviceExpense + $repairExpense + $overheadCost;
        $avgCostPerUnit = $totalOutput > 0 ? round($totalCost / $totalOutput) : 0;

        // Dynamic target calculation
        $targetAvgHpp = (float) ProductHppComponent::where('status', 'Aktif')->avg('total_hpp');
        if ($targetAvgHpp <= 0) {
            $targetAvgHpp = (float) ProductProcessRate::where('is_active', true)->sum('rate');
        }
        
        $efficiencyPct = $avgCostPerUnit > 0 ? round(min(100.0, ($targetAvgHpp / $avgCostPerUnit) * 100), 1) : 0.0;

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

        // Dynamic available periods (current + past 11 months + any distinct)
        $availablePeriods = [$defaultPeriodLabel];
        for ($m = 1; $m <= 11; $m++) {
            $pastDate = $now->copy()->subMonths($m);
            $availablePeriods[] = ($monthNames[$pastDate->month] ?? $pastDate->format('F')) . ' ' . $pastDate->year;
        }
        if ($period && !in_array($period, $availablePeriods)) {
            array_unshift($availablePeriods, $period);
        }
        $availablePeriods = array_values(array_unique($availablePeriods));

        return response()->json([
            'status' => 'success',
            'period' => $period,
            'available_periods' => $availablePeriods,
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
                'formatted_efficiency' => $efficiencyPct > 0 ? ($efficiencyPct . '% efisien') : '0% efisien',
            ],
            'components' => $rows,
        ]);
    }

    // ==========================================
    // 6. Laporan Laba Rugi & Akun Resmi (Sesuai LAPORAN LABA RUGI.xlsx)
    // ==========================================

    public static function getOfficialFinanceCategories(): array
    {
        return [
            'income' => [
                'Penjualan Produk',
                'Pendapatan Jasa Maklon',
                'Pendapatan Lain-lain',
            ],
            'deductions' => [
                'Potongan Penjualan',
                'Retur Penjualan',
            ],
            'cogs' => [
                'Harga Pokok Penjualan',
            ],
            'operating_expenses' => [
                'Beban Promosi / Iklan',
                'Beban Endorse/Pemasaran',
                'Beban Gaji Karyawan',
                'Beban Listrik',
                'Beban Air',
                'Beban Internet',
                'Beban ATK Admin',
                'Beban Sewa',
                'Beban Kesejahteraan Karyawan',
                'Beban Asuransi',
                'Beban Penyusutan Mesin',
                'Beban Penyusutan Kendaraan',
                'Beban Penyusutan Peralatan Kantor',
                'Beban Penyusutan Peralatan Konveksi',
                'Beban Perlengkapan',
                'Beban Gaji',
                'Beban Konsumsi Admin',
                'Beban Konsumsi Produksi',
                'Beban ATK Konveksi',
                'Beban Transportasi',
                'Beban Kendaraan',
                'Beban Pengiriman',
                'Beban Service',
                'Beban Pemeliharaan',
                'Beban Kebersihan',
                'Beban Operasional Admin',
                'Beban Lain-lain',
            ],
            'non_operating_expenses' => [
                'Beban Bank',
                'Beban PPh Final',
                'Beban Legalitas',
                'Beban Pajak dan Perizinan',
                'Beban Zakat',
            ],
        ];
    }

    public function getFinanceCategories(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'data' => self::getOfficialFinanceCategories(),
        ]);
    }

    public function getIncomeStatement(Request $request)
    {
        $monthInput = $request->input('month');
        $yearInput = $request->input('year');

        if (is_string($monthInput) && str_contains($monthInput, '-')) {
            $parts = explode('-', $monthInput);
            $year = (int) $parts[0];
            $month = (int) $parts[1];
        } else {
            $year = $yearInput ? (int) $yearInput : Carbon::now()->year;
            $month = $monthInput ? (int) $monthInput : Carbon::now()->month;
        }

        if ($month < 1 || $month > 12) {
            $month = Carbon::now()->month;
        }
        if ($year < 2000 || $year > 2100) {
            $year = Carbon::now()->year;
        }

        $dateStart = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $dateEnd = $dateStart->copy()->endOfMonth();

        $transactions = FinanceTransaction::whereBetween('transaction_date', [
            $dateStart->format('Y-m-d'),
            $dateEnd->format('Y-m-d'),
        ])->get();

        // 1. PENDAPATAN
        $grossSales = (float) $transactions->where('type', 'income')
            ->filter(fn ($t) => stripos($t->category, 'Penjualan') !== false || stripos($t->category, 'Produk') !== false)
            ->sum('amount');

        if ($grossSales === 0.0) {
            $grossSales = (float) $transactions->where('type', 'income')
                ->where('category', '!=', 'Pendapatan Lain-lain')
                ->sum('amount');
        }

        $salesReturns = (float) $transactions->filter(fn ($t) => stripos($t->category, 'Retur') !== false)->sum('amount');
        $salesDiscounts = (float) $transactions->filter(fn ($t) => stripos($t->category, 'Potongan') !== false)->sum('amount');
        $netSales = $grossSales - $salesReturns - $salesDiscounts;

        // 2. HARGA POKOK PENJUALAN (HPP)
        $cogs = (float) $transactions->filter(fn ($t) => stripos($t->category, 'Harga Pokok') !== false || stripos($t->category, 'HPP') !== false)->sum('amount');

        if ($cogs === 0.0) {
            $prodWage = (float) DailyProduction::whereBetween('production_date', [
                $dateStart->format('Y-m-d'),
                $dateEnd->format('Y-m-d'),
            ])->sum('total_wage');

            $prodMat = (float) $transactions->where('type', 'expense')
                ->filter(fn ($t) => stripos($t->category, 'Bahan') !== false)
                ->sum('amount');

            $cogs = $prodWage + $prodMat;
        }

        $grossProfit = $netSales - $cogs;

        // 3. BIAYA OPERASIONAL (27 Akun Resmi)
        $officialCategories = self::getOfficialFinanceCategories()['operating_expenses'];
        $operatingExpensesList = [];
        $totalOperatingExpenses = 0.0;

        foreach ($officialCategories as $cat) {
            $catAmount = (float) $transactions->where('type', 'expense')
                ->where('category', $cat)
                ->sum('amount');

            $operatingExpensesList[] = [
                'account' => $cat,
                'amount' => $catAmount,
                'formatted_amount' => 'Rp ' . number_format($catAmount, 0, ',', '.'),
            ];
            $totalOperatingExpenses += $catAmount;
        }

        $capturedCategories = array_merge(
            $officialCategories,
            ['Potongan Penjualan', 'Retur Penjualan', 'Harga Pokok Penjualan'],
            self::getOfficialFinanceCategories()['non_operating_expenses']
        );

        $otherOpExpenses = (float) $transactions->where('type', 'expense')
            ->whereNotIn('category', $capturedCategories)
            ->filter(fn ($t) => stripos($t->category, 'Bahan') === false)
            ->sum('amount');

        if ($otherOpExpenses > 0) {
            $operatingExpensesList[] = [
                'account' => 'Beban Operasional Lainnya',
                'amount' => $otherOpExpenses,
                'formatted_amount' => 'Rp ' . number_format($otherOpExpenses, 0, ',', '.'),
            ];
            $totalOperatingExpenses += $otherOpExpenses;
        }

        $operatingProfit = $grossProfit - $totalOperatingExpenses;

        // 4. PENDAPATAN & BIAYA LUAR USAHA
        $otherIncome = (float) $transactions->where('type', 'income')
            ->filter(fn ($t) => stripos($t->category, 'Lain-lain') !== false)
            ->sum('amount');

        $nonOpCategories = self::getOfficialFinanceCategories()['non_operating_expenses'];
        $nonOpExpensesList = [];
        $totalNonOpExpenses = 0.0;

        foreach ($nonOpCategories as $noc) {
            $nocAmount = (float) $transactions->where('type', 'expense')
                ->where('category', $noc)
                ->sum('amount');

            $nonOpExpensesList[] = [
                'account' => $noc,
                'amount' => $nocAmount,
                'formatted_amount' => 'Rp ' . number_format($nocAmount, 0, ',', '.'),
            ];
            $totalNonOpExpenses += $nocAmount;
        }

        $netProfit = $operatingProfit + $otherIncome - $totalNonOpExpenses;

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        return response()->json([
            'status' => 'success',
            'period' => ($monthNames[$month] ?? 'Bulan ' . $month) . ' ' . $year,
            'month' => $month,
            'year' => $year,
            'summary' => [
                'gross_sales' => $grossSales,
                'formatted_gross_sales' => 'Rp ' . number_format($grossSales, 0, ',', '.'),
                'sales_returns' => $salesReturns,
                'formatted_sales_returns' => 'Rp ' . number_format($salesReturns, 0, ',', '.'),
                'sales_discounts' => $salesDiscounts,
                'formatted_sales_discounts' => 'Rp ' . number_format($salesDiscounts, 0, ',', '.'),
                'net_sales' => $netSales,
                'formatted_net_sales' => 'Rp ' . number_format($netSales, 0, ',', '.'),
                'cogs' => $cogs,
                'formatted_cogs' => 'Rp ' . number_format($cogs, 0, ',', '.'),
                'gross_profit' => $grossProfit,
                'formatted_gross_profit' => 'Rp ' . number_format($grossProfit, 0, ',', '.'),
                'total_operating_expenses' => $totalOperatingExpenses,
                'formatted_total_operating_expenses' => 'Rp ' . number_format($totalOperatingExpenses, 0, ',', '.'),
                'operating_profit' => $operatingProfit,
                'formatted_operating_profit' => 'Rp ' . number_format($operatingProfit, 0, ',', '.'),
                'other_income' => $otherIncome,
                'formatted_other_income' => 'Rp ' . number_format($otherIncome, 0, ',', '.'),
                'total_non_operating_expenses' => $totalNonOpExpenses,
                'formatted_total_non_operating_expenses' => 'Rp ' . number_format($totalNonOpExpenses, 0, ',', '.'),
                'net_profit' => $netProfit,
                'formatted_net_profit' => 'Rp ' . number_format($netProfit, 0, ',', '.'),
                'is_profitable' => $netProfit >= 0,
            ],
            'operating_expenses' => $operatingExpensesList,
            'non_operating_expenses' => $nonOpExpensesList,
        ]);
    }
}

