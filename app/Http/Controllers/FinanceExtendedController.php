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

        // Normalize dashes (e.g. en-dash or em-dash) to standard ASCII hyphen
        $periodLabel = str_replace(['–', '—'], '-', trim($periodLabel));

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

    // 1. Payroll Mingguan (Kamis & Sabtu Dual-Cycle)
    public function getWeeklyPayroll(Request $request)
    {
        $now = Carbon::now();
        $cycle = strtolower($request->input('cycle', 'all'));
        if (!in_array($cycle, ['kamis', 'sabtu', 'all'])) {
            $cycle = 'all';
        }

        // Resolusi daftar nama proses per siklus murni dari database (Single Source of Truth)
        $kamisProcesses = \App\Models\ProductionProcess::where('payroll_day', 'Kamis')->pluck('process_name')->toArray();
        $sabtuProcesses = \App\Models\ProductionProcess::where('payroll_day', 'Sabtu')->pluck('process_name')->toArray();

        $targetProcesses = match($cycle) {
            'kamis' => $kamisProcesses,
            'sabtu' => $sabtuProcesses,
            default => null,
        };

        // Hitung siklus mingguan dinamis
        $dayOfWeek = $now->dayOfWeek; // 0 = Sun, 4 = Thu, 6 = Sat

        if ($cycle === 'sabtu') {
            // Siklus Sabtu (Sabtu s/d Jumat)
            if ($dayOfWeek === Carbon::SATURDAY) {
                $currStart = $now->copy()->startOfDay();
            } else {
                $currStart = $now->copy()->previous(Carbon::SATURDAY)->startOfDay();
            }
            $currEnd = $currStart->copy()->addDays(6)->endOfDay();
        } else {
            // Siklus Kamis (Kamis s/d Rabu) atau All
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

        // Query daily productions strictly within the period and matching cycle
        $query = DailyProduction::with('worker');
        if ($startDate && $endDate) {
            $query->whereBetween('production_date', [$startDate, $endDate]);
        }
        if (!empty($targetProcesses)) {
            $query->whereIn('process_name', $targetProcesses);
        }

        $grouped = $query->selectRaw('worker_id, SUM(total_qty) as total_qty, SUM(total_wage) as total_wage, COUNT(id) as total_trx, MAX(status) as max_status, MIN(status) as min_status')
            ->groupBy('worker_id')
            ->get();

        $totalPayroll = 0;
        $items = [];
        $idx = 1;

        // Determine weekly status based on underlying records for this specific cycle
        $determinedStatus = 'Draft';
        if ($grouped->isNotEmpty()) {
            $allPaid = true;
            $allApprovedOrPaid = true;
            $allSubmittedOrHigher = true;

            foreach ($grouped as $g) {
                $minSt = $g->min_status;
                $maxSt = $g->max_status;

                if (!in_array($minSt, ['Dibayar', 'Masuk Payroll']) || !in_array($maxSt, ['Dibayar', 'Masuk Payroll'])) {
                    $allPaid = false;
                }
                if (!in_array($minSt, ['Disetujui', 'Dibayar', 'Masuk Payroll']) || !in_array($maxSt, ['Disetujui', 'Dibayar', 'Masuk Payroll'])) {
                    $allApprovedOrPaid = false;
                }
                if (in_array($minSt, ['Draft', 'Tercatat']) || in_array($maxSt, ['Draft', 'Tercatat'])) {
                    $allSubmittedOrHigher = false;
                }
            }

            if ($allPaid) {
                $determinedStatus = 'Dibayar';
            } elseif ($allApprovedOrPaid) {
                $determinedStatus = 'Disetujui';
            } elseif ($allSubmittedOrHigher) {
                $determinedStatus = 'Diperiksa';
            } else {
                $determinedStatus = 'Draft';
            }
        }

        foreach ($grouped as $g) {
            $totalPayroll += (float) $g->total_wage;

            // Detail transaksi harian pekerja dalam periode dan siklus ini (Sesuai SPK Modul 4)
            $workerProdQuery = DailyProduction::with('items')
                ->where('worker_id', $g->worker_id)
                ->whereBetween('production_date', [$startDate, $endDate]);

            if (!empty($targetProcesses)) {
                $workerProdQuery->whereIn('process_name', $targetProcesses);
            }

            $workerProductions = $workerProdQuery->orderBy('production_date', 'asc')
                ->get()
                ->flatMap(function ($prod) {
                    return $prod->items->map(function ($item) use ($prod) {
                        return [
                            'date' => Carbon::parse($prod->production_date)->translatedFormat('d M Y'),
                            'production_date' => Carbon::parse($prod->production_date)->translatedFormat('d M Y'),
                            'raw_date' => $prod->production_date->format('Y-m-d'),
                            'transaction_number' => $prod->transaction_number,
                            'process' => $prod->process_name,
                            'process_name' => $prod->process_name,
                            'product' => $item->product_name,
                            'product_name' => $item->product_name,
                            'variation' => $item->variation ?: 'All Size',
                            'color' => $item->color ?: 'Hitam',
                            'qty' => (int) $item->qty,
                            'rate' => (float) $item->rate,
                            'formatted_rate' => 'Rp ' . number_format($item->rate, 0, ',', '.'),
                            'rate_formatted' => 'Rp ' . number_format($item->rate, 0, ',', '.'),
                            'total_wage' => (float) $item->total_wage,
                            'formatted_total_wage' => 'Rp ' . number_format($item->total_wage, 0, ',', '.'),
                            'total_wage_formatted' => 'Rp ' . number_format($item->total_wage, 0, ',', '.'),
                        ];
                    });
                })->values();

            $workerStatus = 'Draft';
            if (in_array($g->min_status, ['Dibayar', 'Masuk Payroll']) && in_array($g->max_status, ['Dibayar', 'Masuk Payroll'])) {
                $workerStatus = 'Dibayar';
            } elseif (in_array($g->min_status, ['Disetujui', 'Dibayar', 'Masuk Payroll']) && in_array($g->max_status, ['Disetujui', 'Dibayar', 'Masuk Payroll'])) {
                $workerStatus = 'Disetujui';
            } elseif (in_array($g->max_status, ['Diperiksa', 'Disetujui', 'Dibayar']) && !in_array($g->min_status, ['Draft', 'Tercatat'])) {
                $workerStatus = 'Diperiksa';
            } else {
                $workerStatus = 'Draft';
            }

            $workerCycle = null;
            if ($cycle === 'kamis') {
                $workerCycle = 'Kamis';
            } elseif ($cycle === 'sabtu') {
                $workerCycle = 'Sabtu';
            } else {
                // Pada tab 'all', siklus ditentukan oleh Master Proses dari transaksi riil yang dikerjakan
                $firstProc = $workerProductions->first()['process_name'] ?? ($g->worker?->process ?? null);
                $procRecord = \App\Models\ProductionProcess::where('process_name', $firstProc)->first();
                $workerCycle = $procRecord?->payroll_day ?? ($g->worker?->payroll_day ?? 'Kamis');
            }

            $items[] = [
                'id' => $g->worker_id,
                'worker_id' => $g->worker_id,
                'payroll_number' => 'PYW-' . Carbon::parse($endDate)->format('ym') . '-' . str_pad($idx++, 2, '0', STR_PAD_LEFT),
                'worker_name' => $g->worker ? $g->worker->name : 'Pekerja #' . $g->worker_id,
                'payroll_day' => $workerCycle,
                'period' => $periodLabel,
                'payment_date' => $paymentDate,
                'total_qty' => (int) $g->total_qty,
                'formatted_qty' => (int) $g->total_qty . ' pcs',
                'total_wage' => (float) $g->total_wage,
                'formatted_wage' => 'Rp ' . number_format($g->total_wage, 0, ',', '.'),
                'status' => $workerStatus,
                'details' => $workerProductions,
            ];
        }

        // Available periods for dropdown selection
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
            'Diperiksa' => 'Diajukan (Menunggu Persetujuan Owner)',
            'Disetujui' => 'Telah disetujui Owner',
            'Dibayar' => 'Telah dibayarkan kepada Pekerja',
        ];

        $cycleLabelMap = [
            'kamis' => 'Kelompok Kamis (Potong, Jahit, Overdek, Kansay)',
            'sabtu' => 'Kelompok Sabtu (QC, Lipat, OPP, Rambuan, dll)',
            'all' => 'Semua Siklus (Kamis & Sabtu)',
        ];

        $totalQty = (int) $grouped->sum('total_qty');
        $totalTransactions = (int) $grouped->sum('total_trx');
        $totalWorkers = $grouped->count();

        return response()->json([
            'status' => 'success',
            'cycle' => $cycle,
            'cycle_label' => $cycleLabelMap[$cycle] ?? 'Kelompok Kamis',
            'payroll_status' => $determinedStatus,
            'period' => $periodLabel,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'payment_date' => $paymentDate,
            'total_payroll' => $totalPayroll,
            'formatted_total_payroll' => 'Rp ' . number_format($totalPayroll, 0, ',', '.'),
            'summary' => [
                'total_payroll' => $totalPayroll,
                'formatted_payroll' => 'Rp ' . number_format($totalPayroll, 0, ',', '.'),
                'total_qty' => $totalQty,
                'formatted_qty' => number_format($totalQty, 0, ',', '.') . ' pcs',
                'total_workers' => $totalWorkers,
                'total_transactions' => $totalTransactions,
            ],
            'status_label' => $statusLabelMap[$determinedStatus] ?? 'Draft Pengajuan',
            'available_periods' => $availablePeriods,
            'data' => $items,
        ]);
    }

    public function updateWeeklyPayrollStatus(Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|in:Draft,Diperiksa,Disetujui,Dibayar',
            'cycle' => 'nullable|string|in:kamis,sabtu,all',
            'period' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $status = $validated['status'];
        $cycle = strtolower($validated['cycle'] ?? 'all');

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

        $startDate = null;
        $endDate = null;
        if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
            $startDate = $validated['start_date'];
            $endDate = $validated['end_date'];
        } elseif (!empty($validated['period'])) {
            [$startDate, $endDate] = $this->parsePeriodDates($validated['period']);
        }

        if (!$startDate || !$endDate) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'start_date' => ['Rentang tanggal periode payroll mingguan tidak valid atau tidak dapat ditentukan.'],
            ]);
        }

        $kamisProcesses = \App\Models\ProductionProcess::where('payroll_day', 'Kamis')->pluck('process_name')->toArray();
        $sabtuProcesses = \App\Models\ProductionProcess::where('payroll_day', 'Sabtu')->pluck('process_name')->toArray();

        $targetProcesses = match($cycle) {
            'kamis' => $kamisProcesses,
            'sabtu' => $sabtuProcesses,
            default => null,
        };

        // Query builder restricted to target processes (if cycle is specified)
        $recordsQuery = DailyProduction::whereBetween('production_date', [$startDate, $endDate]);
        if (!empty($targetProcesses)) {
            $recordsQuery->whereIn('process_name', $targetProcesses);
        }

        // Scope Guard & RBAC: Cegah demosi status jika sudah Disetujui atau Dibayar tanpa otorisasi Owner
        $existingRecords = (clone $recordsQuery)->get();
        if ($existingRecords->isNotEmpty()) {
            $isCurrentlyLocked = $existingRecords->every(fn($r) => in_array($r->status, ['Disetujui', 'Dibayar', 'Masuk Payroll']));
            if ($isCurrentlyLocked && in_array($status, ['Draft', 'Diperiksa']) && !Auth::user()->isOwner()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya Owner yang memiliki wewenang untuk membuka kembali status payroll mingguan yang telah disetujui atau dibayar.',
                ], 403);
            }
        }

        if ($dailyStatus === 'Diperiksa') {
            (clone $recordsQuery)->whereIn('status', ['Draft', 'Tercatat'])->update(['status' => 'Diperiksa']);
        } elseif ($dailyStatus === 'Disetujui') {
            (clone $recordsQuery)->whereIn('status', ['Draft', 'Tercatat', 'Diperiksa'])->update(['status' => 'Disetujui']);
        } elseif ($dailyStatus === 'Dibayar') {
            (clone $recordsQuery)->update(['status' => 'Dibayar']);
        } else {
            (clone $recordsQuery)->update(['status' => $dailyStatus]);
        }

        $cycleLabel = match($cycle) {
            'kamis' => 'Kelompok Kamis',
            'sabtu' => 'Kelompok Sabtu',
            default => 'Semua Kelompok',
        };

        return response()->json([
            'status' => 'success',
            'message' => 'Status payroll mingguan (' . $cycleLabel . ') berhasil diperbarui menjadi ' . $status,
            'new_status' => $status,
            'cycle' => $cycle,
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

        // Tampilkan slip payroll yang sudah masuk proses (Diperiksa, Disetujui, Dibayar)
        // ATAU pekerjanya berstatus aktif di master (tidak di-soft-delete)
        $query->where(function ($q) {
            $q->whereIn('status', ['Diperiksa', 'Disetujui', 'Dibayar'])
              ->orWhereHas('worker', function ($wq) {
                  $wq->whereNull('deleted_at');
              });
        });

        $rawItems = $query->orderBy('id', 'asc')->get();

        $items = $rawItems->map(function ($p) {
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
                'deductions' => (float) $p->deductions,
                'formatted_deductions' => 'Rp ' . number_format($p->deductions, 0, ',', '.'),
                'total_salary' => (float) $p->total_salary,
                'formatted_total_salary' => 'Rp ' . number_format($p->total_salary, 0, ',', '.'),
                'status' => $p->status,
            ];
        });

        // Hitung status siklus payroll periode ini
        $periodStatus = 'Draft';
        $statusLabel = 'Draft (Belum Diajukan)';
        if ($rawItems->isNotEmpty()) {
            $statuses = $rawItems->pluck('status')->unique()->toArray();
            if (count($statuses) === 1 && $statuses[0] === 'Dibayar') {
                $periodStatus = 'Dibayar';
                $statusLabel = 'Telah Dibayar';
            } elseif (!in_array('Draft', $statuses) && !in_array('Diperiksa', $statuses) && in_array('Disetujui', $statuses)) {
                $periodStatus = 'Disetujui';
                $statusLabel = 'Telah Disetujui Owner';
            } elseif (in_array('Diperiksa', $statuses)) {
                $periodStatus = 'Diperiksa';
                $statusLabel = 'Menunggu Persetujuan Owner';
            } else {
                $periodStatus = 'Draft';
                $statusLabel = 'Draft (Belum Diajukan)';
            }
        }

        $totalBasic = (float) $rawItems->sum('basic_salary');
        $totalAllowance = (float) $rawItems->sum('allowance');
        $totalOvertime = (float) $rawItems->sum('overtime');
        $totalDeductions = (float) $rawItems->sum('deductions');
        $totalSalary = (float) $rawItems->sum('total_salary');

        $summary = [
            'total_basic_salary' => $totalBasic,
            'formatted_total_basic' => 'Rp ' . number_format($totalBasic, 0, ',', '.'),
            'formatted_basic_salary' => 'Rp ' . number_format($totalBasic, 0, ',', '.'),
            'total_allowance' => $totalAllowance,
            'formatted_total_allowance' => 'Rp ' . number_format($totalAllowance, 0, ',', '.'),
            'total_overtime' => $totalOvertime,
            'formatted_total_overtime' => 'Rp ' . number_format($totalOvertime, 0, ',', '.'),
            'total_deductions' => $totalDeductions,
            'formatted_total_deductions' => 'Rp ' . number_format($totalDeductions, 0, ',', '.'),
            'total_salary' => $totalSalary,
            'formatted_total_salary' => 'Rp ' . number_format($totalSalary, 0, ',', '.'),
            'total_payroll' => $totalSalary,
            'formatted_total_payroll' => 'Rp ' . number_format($totalSalary, 0, ',', '.'),
            'total_employees' => $rawItems->count(),
            'total_workers' => $rawItems->count(),
        ];

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
            'payroll_status' => $periodStatus,
            'status_label' => $statusLabel,
            'available_periods' => $availablePeriods,
            'summary' => $summary,
            'data' => $items,
        ]);
    }

    protected function ensureMonthlyPayrollForPeriod(string $periodLabel): void
    {
        // Get all active staff / monthly workers (secara otomatis mengabaikan soft-deleted workers)
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
            $existing = MonthlyPayroll::where('period', $periodLabel)
                ->where(function ($q) use ($w) {
                    $q->where('worker_id', $w->id)
                      ->orWhere('worker_name', $w->name);
                })
                ->first();

            if ($existing) {
                // Pastikan worker_id & posisi tersinkronisasi jika belum sesuai
                $needsUpdate = false;
                if (!$existing->worker_id) {
                    $existing->worker_id = $w->id;
                    $needsUpdate = true;
                }
                if ($w->process && $existing->position !== $w->process) {
                    $existing->position = $w->process;
                    $needsUpdate = true;
                }
                if ((float)$existing->basic_salary <= 0 && (float)($w->default_salary ?? 0) > 0) {
                    $existing->basic_salary = (float) $w->default_salary;
                    $existing->total_salary = max(0, $existing->basic_salary + $existing->allowance + $existing->overtime - $existing->deductions);
                    $needsUpdate = true;
                }
                if ($needsUpdate) {
                    $existing->save();
                }
                continue;
            }

            // Tentukan nominal gaji pokok dan tunjangan
            $lastPayroll = MonthlyPayroll::where('worker_id', $w->id)
                ->where('total_salary', '>', 0)
                ->latest('id')
                ->first();

            if ($lastPayroll && (float)$lastPayroll->basic_salary > 0) {
                $basicSalary = (float) $lastPayroll->basic_salary;
                $allowance = (float) $lastPayroll->allowance;
            } elseif ((float)($w->default_salary ?? 0) > 0) {
                $basicSalary = (float) $w->default_salary;
                $allowance = 0.0;
            } else {
                // Tidak ada hardcode angka rupiah; jika belum diset maka 0.0
                $basicSalary = 0.0;
                $allowance = 0.0;
            }

            $overtime = 0.0;
            $deductions = 0.0;
            $totalSalary = max(0, $basicSalary + $allowance + $overtime - $deductions);

            $pNumber = 'PYM-' . $dateCode . '-' . str_pad($seq++, 2, '0', STR_PAD_LEFT);
            while (MonthlyPayroll::where('payroll_number', $pNumber)->exists()) {
                $pNumber = 'PYM-' . $dateCode . '-' . str_pad($seq++, 2, '0', STR_PAD_LEFT);
            }

            MonthlyPayroll::create([
                'payroll_number' => $pNumber,
                'worker_id' => $w->id,
                'staff_position_id' => $w->staff_position_id ?? \App\Models\StaffPosition::where('name', $w->process)->value('id'),
                'worker_name' => $w->name,
                'position' => $w->process ?: 'Staff Operasional',
                'period' => $periodLabel,
                'basic_salary' => $basicSalary,
                'allowance' => $allowance,
                'overtime' => $overtime,
                'deductions' => $deductions,
                'total_salary' => $totalSalary,
                'status' => 'Draft',
            ]);
        }
    }

    protected function populateBenchmarkSalariesForPeriod(string $periodLabel): void
    {
        $records = MonthlyPayroll::where('period', $periodLabel)->get();
        foreach ($records as $p) {
            $lastPayroll = MonthlyPayroll::where('worker_id', $p->worker_id)
                ->where('id', '!=', $p->id)
                ->where('total_salary', '>', 0)
                ->latest('id')
                ->first();

            $worker = Worker::withTrashed()->find($p->worker_id);

            if ($lastPayroll && (float)$lastPayroll->basic_salary > 0) {
                $basicSalary = (float) $lastPayroll->basic_salary;
                $allowance = (float) $lastPayroll->allowance;
            } elseif ($worker && (float)($worker->default_salary ?? 0) > 0) {
                $basicSalary = (float) $worker->default_salary;
                $allowance = 0.0;
            } else {
                // Tidak ada hardcode angka rupiah; jika belum diset maka 0.0
                $basicSalary = 0.0;
                $allowance = 0.0;
            }

            $p->update([
                'basic_salary' => $basicSalary,
                'allowance' => $allowance,
                'overtime' => 0.0,
                'deductions' => 0.0,
                'total_salary' => $basicSalary + $allowance,
                'status' => 'Draft',
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
                    'product_group_id' => $g->id,
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
            } elseif (!$hpp->product_group_id) {
                $hpp->update(['product_group_id' => $g->id]);
            }
        }
    }

    // 4. Keuangan (Pendapatan & Pengeluaran)
    public function getFinanceTransactions(Request $request)
    {
        $now = Carbon::now();
        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $monthMap = [
            'Januari' => 1, 'Februari' => 2, 'Maret' => 3, 'April' => 4,
            'Mei' => 5, 'Juni' => 6, 'Juli' => 7, 'Agustus' => 8,
            'September' => 9, 'Oktober' => 10, 'November' => 11, 'Desember' => 12,
            'January' => 1, 'February' => 2, 'March' => 3, 'April' => 4,
            'May' => 5, 'June' => 6, 'July' => 7, 'August' => 8,
            'September' => 9, 'October' => 10, 'November' => 11, 'December' => 12
        ];

        $periodInput = $request->input('period', 'Semua Periode');
        $targetMonth = null;
        $targetYear = null;

        if ($periodInput && $periodInput !== 'Semua' && $periodInput !== 'Semua Periode') {
            if (preg_match('/([A-Za-z]+)\s*(\d{4})/', $periodInput, $pm)) {
                $targetMonth = $monthMap[$pm[1]] ?? null;
                $targetYear = (int) $pm[2];
            }
        }

        $query = FinanceTransaction::query();

        if ($targetMonth && $targetYear) {
            $query->whereYear('transaction_date', $targetYear)
                  ->whereMonth('transaction_date', $targetMonth);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('transaction_number', 'like', "%{$s}%")
                  ->orWhere('category', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%")
                  ->orWhere('reference', 'like', "%{$s}%");
            });
        }

        if ($request->filled('type') && $request->type !== 'Semua') {
            $query->where('type', $request->type === 'Pendapatan' ? 'income' : 'expense');
        }

        // Metrics filtered by chosen period or all time
        $metricIncomeQuery = FinanceTransaction::where('type', 'income');
        $metricExpenseQuery = FinanceTransaction::where('type', 'expense');

        if ($targetMonth && $targetYear) {
            $metricIncomeQuery->whereYear('transaction_date', $targetYear)->whereMonth('transaction_date', $targetMonth);
            $metricExpenseQuery->whereYear('transaction_date', $targetYear)->whereMonth('transaction_date', $targetMonth);
        }

        $totalIncome = (float) $metricIncomeQuery->sum('amount');
        $totalExpense = (float) $metricExpenseQuery->sum('amount');
        $netBalance = $totalIncome - $totalExpense;

        $rawPerPage = (int) $request->input('per_page', 10);
        $perPage = ($rawPerPage > 100 && $request->boolean('is_export')) ? min(10000, $rawPerPage) : min(100, max(5, $rawPerPage));
        $transactions = $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        $formatted = collect($transactions->items())->map(function ($t) {
            $isIncome = $t->type === 'income';
            return [
                'id' => $t->id,
                'transaction_number' => $t->transaction_number,
                'date' => Carbon::parse($t->transaction_date)->translatedFormat('d M Y'),
                'raw_date' => Carbon::parse($t->transaction_date)->format('Y-m-d'),
                'type' => $isIncome ? 'Pendapatan' : 'Pengeluaran',
                'raw_type' => $t->type,
                'category' => $t->category,
                'description' => $t->title,
                'amount' => (float) $t->amount,
                'formatted_amount' => ($isIncome ? '+ ' : '- ') . 'Rp ' . number_format($t->amount, 0, ',', '.'),
                'reference' => $t->reference,
                'notes' => $t->notes,
                'is_income' => $isIncome,
                'status' => 'Tercatat',
            ];
        });

        // Available periods for dropdown
        $availablePeriods = ['Semua Periode'];
        $dbMonths = FinanceTransaction::selectRaw('DATE_FORMAT(transaction_date, "%Y-%m") as ym')
            ->distinct()
            ->orderBy('ym', 'desc')
            ->pluck('ym')
            ->toArray();

        foreach ($dbMonths as $ym) {
            if (preg_match('/^(\d{4})-(\d{2})$/', $ym, $mParts)) {
                $mNum = (int) $mParts[2];
                $yNum = (int) $mParts[1];
                $pLabel = ($monthNames[$mNum] ?? $ym) . ' ' . $yNum;
                if (!in_array($pLabel, $availablePeriods)) {
                    $availablePeriods[] = $pLabel;
                }
            }
        }

        $defaultMonthLabel = ($monthNames[$now->month] ?? $now->format('F')) . ' ' . $now->year;
        if (!in_array($defaultMonthLabel, $availablePeriods)) {
            $availablePeriods[] = $defaultMonthLabel;
        }

        return response()->json([
            'status' => 'success',
            'period' => $periodInput,
            'available_periods' => $availablePeriods,
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
                'from' => $transactions->firstItem(),
                'to' => $transactions->lastItem(),
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

        $type = $validated['type'];
        if (stripos($validated['category'], 'Potongan') !== false || stripos($validated['category'], 'Retur') !== false) {
            $type = 'expense';
        }

        $matchedCat = \App\Models\FinanceCategory::where('name', $validated['category'])->first();
        $costType = $matchedCat?->cost_type;
        $catId = $matchedCat?->id;

        if (!$costType) {
            $cLower = strtolower($validated['category'] . ' ' . $validated['title']);
            if (str_contains($cLower, 'bahan') || str_contains($cLower, 'kain') || str_contains($cLower, 'benang')) {
                $costType = 'material';
            } elseif (str_contains($cLower, 'jasa') || str_contains($cLower, 'sablon') || str_contains($cLower, 'bordir')) {
                $costType = 'service';
            } elseif (str_contains($cLower, 'repair') || str_contains($cLower, 'rework') || str_contains($cLower, 'reject') || str_contains($cLower, 'service')) {
                $costType = 'repair';
            } elseif (str_contains($cLower, 'listrik') || str_contains($cLower, 'air') || str_contains($cLower, 'overhead') || str_contains($cLower, 'utilitas') || str_contains($cLower, 'sewa') || str_contains($cLower, 'konsumsi produksi')) {
                $costType = 'overhead';
            } else {
                $costType = 'general_operating';
            }
        }

        $trx = FinanceTransaction::create([
            'transaction_number' => $trxNumber,
            'type' => $type,
            'category' => $validated['category'],
            'cost_type' => $costType,
            'category_id' => $catId,
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

    public function updateFinanceTransaction(Request $request, $id)
    {
        $trx = FinanceTransaction::findOrFail($id);

        $validated = $request->validate([
            'type' => 'required|in:income,expense',
            'category' => 'required|string|max:100',
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:1',
            'transaction_date' => 'required|date',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $type = $validated['type'];
        if (stripos($validated['category'], 'Potongan') !== false || stripos($validated['category'], 'Retur') !== false) {
            $type = 'expense';
        }

        $matchedCat = \App\Models\FinanceCategory::where('name', $validated['category'])->first();
        $costType = $matchedCat?->cost_type;
        $catId = $matchedCat?->id;

        if (!$costType) {
            $cLower = strtolower($validated['category'] . ' ' . $validated['title']);
            if (str_contains($cLower, 'bahan') || str_contains($cLower, 'kain') || str_contains($cLower, 'benang')) {
                $costType = 'material';
            } elseif (str_contains($cLower, 'jasa') || str_contains($cLower, 'sablon') || str_contains($cLower, 'bordir')) {
                $costType = 'service';
            } elseif (str_contains($cLower, 'repair') || str_contains($cLower, 'rework') || str_contains($cLower, 'reject') || str_contains($cLower, 'service')) {
                $costType = 'repair';
            } elseif (str_contains($cLower, 'listrik') || str_contains($cLower, 'air') || str_contains($cLower, 'overhead') || str_contains($cLower, 'utilitas') || str_contains($cLower, 'sewa') || str_contains($cLower, 'konsumsi produksi')) {
                $costType = 'overhead';
            } else {
                $costType = 'general_operating';
            }
        }

        $trx->update([
            'type' => $type,
            'category' => $validated['category'],
            'cost_type' => $costType,
            'category_id' => $catId,
            'title' => $validated['title'],
            'amount' => $validated['amount'],
            'transaction_date' => $validated['transaction_date'],
            'reference' => $validated['reference'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Transaksi keuangan berhasil diperbarui.',
            'data' => $trx,
        ]);
    }

    public function destroyFinanceTransaction($id)
    {
        $trx = FinanceTransaction::findOrFail($id);
        $trx->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Transaksi keuangan berhasil dihapus.',
        ]);
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
            if (empty($validated['period'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Parameter periode payroll bulanan wajib disertakan.',
                ], 422);
            }

            // Scope Guard & RBAC: Cegah demosi status jika sudah Disetujui atau Dibayar tanpa otorisasi Owner
            $hasApprovedOrPaid = MonthlyPayroll::where('period', $validated['period'])
                ->whereIn('status', ['Disetujui', 'Dibayar'])
                ->exists();

            if ($hasApprovedOrPaid && in_array($status, ['Draft', 'Diperiksa']) && !Auth::user()->isOwner()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya Owner yang memiliki wewenang untuk membuka kembali status payroll bulanan yang telah disetujui atau dibayar.',
                ], 403);
            }

            MonthlyPayroll::where('period', $validated['period'])->update(['status' => $status]);
            $message = "Seluruh status payroll bulanan periode {$validated['period']} berhasil diperbarui menjadi {$status}";
        } else {
            $payroll = MonthlyPayroll::findOrFail($id);

            // Scope Guard & RBAC: Cegah demosi status jika sudah Disetujui atau Dibayar tanpa otorisasi Owner
            if (in_array($payroll->status, ['Disetujui', 'Dibayar']) && in_array($status, ['Draft', 'Diperiksa']) && !Auth::user()->isOwner()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Hanya Owner yang memiliki wewenang untuk membuka kembali status payroll bulanan yang telah disetujui atau dibayar.',
                ], 403);
            }

            $payroll->update(['status' => $status]);
            $message = "Status payroll {$payroll->worker_name} berhasil diperbarui menjadi {$status}";
        }

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'new_status' => $status,
        ]);
    }

    public function updateMonthlyPayrollItem(Request $request, $id)
    {
        $payroll = MonthlyPayroll::findOrFail($id);

        // Scope Guard: Cegah manipulasi slip gaji jika sudah Disetujui atau Dibayar
        if (in_array($payroll->status, ['Disetujui', 'Dibayar']) && !Auth::user()->isOwner()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Komponen gaji bulanan yang telah disetujui atau dibayar tidak dapat diubah tanpa otorisasi Owner.',
            ], 403);
        }

        $validated = $request->validate([
            'basic_salary' => 'required|numeric|min:0',
            'allowance' => 'nullable|numeric|min:0',
            'overtime' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
        ]);

        $basic = (float) $validated['basic_salary'];
        $allowance = (float) ($validated['allowance'] ?? 0);
        $overtime = (float) ($validated['overtime'] ?? 0);
        $deductions = (float) ($validated['deductions'] ?? 0);
        $totalSalary = max(0, $basic + $allowance + $overtime - $deductions);

        $payroll->update([
            'basic_salary' => $basic,
            'allowance' => $allowance,
            'overtime' => $overtime,
            'deductions' => $deductions,
            'total_salary' => $totalSalary,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Komponen gaji bulanan untuk {$payroll->worker_name} berhasil diperbarui.",
            'data' => $payroll,
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
            $q->where('cost_type', 'material')
              ->orWhere(function($sub) {
                  $sub->whereNull('cost_type')
                      ->where(function($sq) {
                          $sq->where('category', 'like', '%Bahan%')
                            ->orWhere('category', 'like', '%Kain%')
                            ->orWhere('category', 'like', '%Benang%')
                            ->orWhere('title', 'like', '%Bahan%')
                            ->orWhere('title', 'like', '%Kain%')
                            ->orWhere('title', 'like', '%Benang%');
                      });
              });
        })->sum('amount');

        $serviceExpense = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('cost_type', 'service')
              ->orWhere(function($sub) {
                  $sub->whereNull('cost_type')
                      ->where(function($sq) {
                          $sq->where('category', 'like', '%Jasa%')
                            ->orWhere('category', 'like', '%Maklon%')
                            ->orWhere('title', 'like', '%Jasa%')
                            ->orWhere('title', 'like', '%Sablon%')
                            ->orWhere('title', 'like', '%Bordir%');
                      });
              });
        })->sum('amount');

        $repairExpense = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('cost_type', 'repair')
              ->orWhere(function($sub) {
                  $sub->whereNull('cost_type')
                      ->where(function($sq) {
                          $sq->where('category', 'like', '%Repair%')
                            ->orWhere('title', 'like', '%Repair%')
                            ->orWhere('title', 'like', '%Rework%')
                            ->orWhere('title', 'like', '%Reject%');
                      });
              });
        })->sum('amount');

        $overheadCost = (float) (clone $expenseQuery)->where(function($q) {
            $q->where('cost_type', 'overhead')
              ->orWhere(function($sub) {
                  $sub->whereNull('cost_type')
                      ->where(function($sq) {
                          $sq->where('category', 'like', '%Overhead%')
                            ->orWhere('title', 'like', '%Overhead%')
                            ->orWhere('category', 'like', '%Konsumsi Produksi%')
                            ->orWhere('category', 'like', '%Penyusutan Mesin%')
                            ->orWhere('category', 'like', '%Peralatan Konveksi%')
                            ->orWhere('category', 'like', '%Pemeliharaan%')
                            ->orWhere('category', 'like', '%ATK Konveksi%')
                            ->orWhere('category', 'like', '%Operasional & Utilitas%');
                      });
              });
        })->sum('amount');

        // Jika ada output produksi tetapi belum ada kas keluar pembelian bahan di periode ini,
        // gunakan alokasi bahan baku dari standar HPP produk (Modul 6 SPK) agar biaya unit realistis
        $matSource = 'Kas Keluar';
        if ($matExpense <= 0 && $totalOutput > 0) {
            $avgMat = (float) ProductHppComponent::where('status', 'Aktif')->avg('material_cost');
            if ($avgMat > 0) {
                $matExpense = round($totalOutput * $avgMat);
                $matSource = 'Alokasi HPP Standar';
            }
        }

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
                'source' => $matSource,
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
                'source' => 'Alokasi Utilitas Konveksi',
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
        $cats = \App\Models\FinanceCategory::where('is_active', true)->orderBy('id')->get();
        if ($cats->isNotEmpty()) {
            return [
                'income' => $cats->where('group', 'income')->pluck('name')->values()->toArray(),
                'deductions' => $cats->where('group', 'deductions')->pluck('name')->values()->toArray(),
                'cogs' => $cats->where('group', 'cogs')->pluck('name')->values()->toArray(),
                'operating_expenses' => $cats->where('group', 'operating_expenses')->pluck('name')->values()->toArray(),
                'non_operating_expenses' => $cats->where('group', 'non_operating_expenses')->pluck('name')->values()->toArray(),
            ];
        }

        return [
            'income' => ['Penjualan Produk', 'Pendapatan Jasa Maklon', 'Pendapatan Lain-lain'],
            'deductions' => ['Potongan Penjualan', 'Retur Penjualan'],
            'cogs' => ['Harga Pokok Penjualan', 'Bahan Baku Kain', 'Aksesoris Jahit'],
            'operating_expenses' => [],
            'non_operating_expenses' => [],
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

        if ($cogs === 0.0 && $grossSales > 0) {
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
        $matchedExpenseIds = [];

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $monthLabel = ($monthNames[$month] ?? 'Bulan ' . $month) . ' ' . $year;

        foreach ($officialCategories as $cat) {
            $catAmount = (float) $transactions->where('type', 'expense')
                ->filter(function ($t) use ($cat, &$matchedExpenseIds) {
                    if (in_array($t->id, $matchedExpenseIds)) return false;
                    $cleanT = trim(preg_replace('/\s*\(.*?\)\s*/', '', $t->category));
                    $cleanCat = trim(preg_replace('/\s*\(.*?\)\s*/', '', $cat));
                    $isMatch = ($t->category === $cat) || (strcasecmp($cleanT, $cleanCat) === 0);
                    if ($isMatch) {
                        $matchedExpenseIds[] = $t->id;
                    }
                    return $isMatch;
                })
                ->sum('amount');

            // Sinkronisasi otomatis dari Payroll Bulanan jika transaksi kas Beban Gaji Karyawan belum dicatat terpisah
            if ($cat === 'Beban Gaji Karyawan' && $catAmount == 0.0) {
                $monthlySalary = (float) MonthlyPayroll::where('period', $monthLabel)->sum('total_salary');
                if ($monthlySalary > 0) {
                    $catAmount = $monthlySalary;
                }
            }

            $operatingExpensesList[] = [
                'account' => $cat,
                'amount' => $catAmount,
                'formatted_amount' => 'Rp ' . number_format($catAmount, 0, ',', '.'),
            ];
            $totalOperatingExpenses += $catAmount;
        }

        $otherOpExpenses = (float) $transactions->where('type', 'expense')
            ->whereNotIn('id', $matchedExpenseIds)
            ->filter(fn ($t) => stripos($t->category, 'Bahan') === false &&
                                stripos($t->category, 'Potongan') === false &&
                                stripos($t->category, 'Retur') === false &&
                                stripos($t->category, 'Harga Pokok') === false &&
                                stripos($t->category, 'HPP') === false &&
                                stripos($t->category, 'Bank') === false &&
                                stripos($t->category, 'Pajak') === false &&
                                stripos($t->category, 'Zakat') === false &&
                                stripos($t->category, 'Legalitas') === false)
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
                ->filter(function ($t) use ($noc, &$matchedExpenseIds) {
                    if (in_array($t->id, $matchedExpenseIds)) return false;
                    $cleanT = trim(preg_replace('/\s*\(.*?\)\s*/', '', $t->category));
                    $cleanNoc = trim(preg_replace('/\s*\(.*?\)\s*/', '', $noc));
                    $isMatch = ($t->category === $noc) || (strcasecmp($cleanT, $cleanNoc) === 0) || (stripos($t->category, $cleanNoc) !== false);
                    if ($isMatch) {
                        $matchedExpenseIds[] = $t->id;
                    }
                    return $isMatch;
                })
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

    // ==========================================
    // 7. Ekspor Excel / CSV Sesuai SPK
    // ==========================================

    public function exportWeeklyPayroll(Request $request)
    {
        $res = $this->getWeeklyPayroll($request)->getData(true);
        $period = $res['period'] ?? 'Weekly';
        $cycle = $res['cycle'] ?? $request->input('cycle', 'all');
        $cycleLabel = match(strtolower($cycle)) {
            'kamis' => 'Kelompok Kamis (Jahit, Potong, Overdek, Kansay)',
            'sabtu' => 'Kelompok Sabtu (Finishing, QC, Packing)',
            default => 'Semua Kelompok',
        };
        $filename = "rekap_payroll_mingguan_" . $cycle . "_" . preg_replace('/[^A-Za-z0-9_-]/', '_', $period) . ".csv";

        $csv = "\xEF\xBB\xBF";
        $csv .= "REKAP PAYROLL MINGGUAN - CV FASHOL MITSLI SEE\n";
        $csv .= "Kelompok:," . '"' . $cycleLabel . '"' . "\n";
        $csv .= "Periode:," . '"' . $period . '"' . "\n";
        $csv .= "Tanggal Bayar:," . '"' . ($res['payment_date'] ?? '-') . '"' . "\n\n";
        $csv .= "No,No Payroll,Nama Pekerja,Total Output (pcs),Total Upah (Rp),Status\n";

        $no = 1;
        $totalWage = 0;
        $totalQty = 0;
        foreach ($res['data'] ?? [] as $row) {
            $csv .= "{$no}," . '"' . $row['payroll_number'] . '",' . '"' . $row['worker_name'] . '",' . $row['total_qty'] . ',' . $row['total_wage'] . ',' . '"' . $row['status'] . '"' . "\n";
            $totalWage += (float) $row['total_wage'];
            $totalQty += (int) $row['total_qty'];
            $no++;
        }
        $csv .= "TOTAL,,,{$totalQty},{$totalWage},\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportMonthlyPayroll(Request $request)
    {
        $res = $this->getMonthlyPayroll($request)->getData(true);
        $period = $res['period'] ?? 'Bulanan';
        $filename = "rekap_payroll_bulanan_" . preg_replace('/[^A-Za-z0-9_-]/', '_', $period) . ".csv";

        $csv = "\xEF\xBB\xBF";
        $csv .= "REKAP PAYROLL BULANAN - CV FASHOL MITSLI SEE\n";
        $csv .= "Periode:," . '"' . $period . '"' . "\n\n";
        $csv .= "No,No Payroll,Nama Pekerja,Jabatan,Gaji Pokok,Tunjangan,Lembur,Potongan,Total Gaji Bersih,Status\n";

        $no = 1;
        $totalSalary = 0;
        foreach ($res['data'] ?? [] as $r) {
            $csv .= "{$no}," . '"' . $r['payroll_number'] . '",' . '"' . $r['worker_name'] . '",' . '"' . $r['position'] . '",' . $r['basic_salary'] . ',' . $r['allowance'] . ',' . $r['overtime'] . ',' . $r['deductions'] . ',' . $r['total_salary'] . ',' . '"' . $r['status'] . '"' . "\n";
            $totalSalary += (float) $r['total_salary'];
            $no++;
        }
        $csv .= "TOTAL,,,,,,,,{$totalSalary},\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportFinanceTransactions(Request $request)
    {
        $request->merge(['per_page' => 10000, 'is_export' => true]);
        $res = $this->getFinanceTransactions($request)->getData(true);
        $period = $res['period'] ?? 'Semua';
        $filename = "buku_kas_keuangan_" . preg_replace('/[^A-Za-z0-9_-]/', '_', $period) . ".csv";

        $csv = "\xEF\xBB\xBF";
        $csv .= "BUKU KAS & ARUS DANA - CV FASHOL MITSLI SEE\n";
        $csv .= "Periode:," . '"' . $period . '"' . "\n\n";
        $csv .= "No,No Transaksi,Tanggal,Tipe,Kategori,Keterangan,Nominal (Rp),Referensi\n";

        $no = 1;
        foreach ($res['data'] ?? [] as $t) {
            $csv .= "{$no}," . '"' . $t['transaction_number'] . '",' . '"' . $t['date'] . '",' . '"' . $t['type'] . '",' . '"' . $t['category'] . '",' . '"' . str_replace('"', '""', $t['description']) . '",' . $t['amount'] . ',' . '"' . ($t['reference'] ?? '') . '"' . "\n";
            $no++;
        }
        $csv .= "\n";
        $csv .= "TOTAL PENDAPATAN,,,,,,{$res['summary']['total_income']},\n";
        $csv .= "TOTAL PENGELUARAN,,,,,,{$res['summary']['total_expense']},\n";
        $csv .= "SALDO KAS BERSIH,,,,,,{$res['summary']['net_balance']},\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportProductionCost(Request $request)
    {
        $res = $this->getProductionCostSummary($request)->getData(true);
        $period = $res['period'] ?? 'Biaya Produksi';
        $filename = "rekap_biaya_produksi_" . preg_replace('/[^A-Za-z0-9_-]/', '_', $period) . ".csv";

        $csv = "\xEF\xBB\xBF";
        $csv .= "REKAP BIAYA PRODUKSI - CV FASHOL MITSLI SEE\n";
        $csv .= "Periode:," . '"' . $period . '"' . "\n\n";
        $csv .= "Komponen Biaya,Sumber Data,Nilai Biaya (Rp),Status Keterhubungan\n";
        foreach ($res['components'] ?? [] as $c) {
            $csv .= '"' . $c['component'] . '",' . '"' . $c['source'] . '",' . $c['amount'] . ',' . '"' . $c['link_type'] . '"' . "\n";
        }
        $csv .= "\n";
        $csv .= "TOTAL BIAYA PRODUKSI,," . $res['summary']['total_cost'] . ",\n";
        $csv .= "TOTAL OUTPUT PRODUKSI,," . $res['summary']['total_output'] . " pcs,\n";
        $csv .= "BIAYA PER UNIT RATA-RATA,," . $res['summary']['avg_cost_per_unit'] . ",\n";
        $csv .= "TARGET RATA-RATA HPP,," . $res['summary']['target_avg_hpp'] . ",\n";
        $csv .= "EFISIENSI BIAYA PRODUKSI,," . $res['summary']['efficiency_percentage'] . "%,\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportIncomeStatement(Request $request)
    {
        $res = $this->getIncomeStatement($request)->getData(true);
        $period = $res['period'] ?? 'Laba Rugi';
        $filename = "laporan_laba_rugi_" . preg_replace('/[^A-Za-z0-9_-]/', '_', $period) . ".csv";

        $csv = "\xEF\xBB\xBF";
        $csv .= "LAPORAN LABA RUGI - CV FASHOL MITSLI SEE\n";
        $csv .= "Periode:," . '"' . $period . '"' . "\n\n";
        $csv .= "KOMPONEN KEUANGAN,NOMINAL (Rp)\n";
        $csv .= "1. PENDAPATAN\n";
        $csv .= "Penjualan Produk (Gross)," . $res['summary']['gross_sales'] . "\n";
        $csv .= "Retur Penjualan,-" . $res['summary']['sales_returns'] . "\n";
        $csv .= "Potongan Penjualan / Biaya Marketplace,-" . $res['summary']['sales_discounts'] . "\n";
        $csv .= "JUMLAH PENDAPATAN BERSIH," . $res['summary']['net_sales'] . "\n\n";
        $csv .= "2. HARGA POKOK PENJUALAN (HPP)\n";
        $csv .= "HPP Penjualan (Bahan Baku & Upah)," . $res['summary']['cogs'] . "\n";
        $csv .= "LABA KOTOR (GROSS PROFIT)," . $res['summary']['gross_profit'] . "\n\n";
        $csv .= "3. BIAYA OPERASIONAL (27 AKUN RESMI)\n";
        foreach ($res['operating_expenses'] ?? [] as $exp) {
            $csv .= '"' . $exp['account'] . '",' . $exp['amount'] . "\n";
        }
        $csv .= "JUMLAH BIAYA OPERASIONAL," . $res['summary']['total_operating_expenses'] . "\n";
        $csv .= "LABA (RUGI) OPERASIONAL," . $res['summary']['operating_profit'] . "\n\n";
        $csv .= "4. PENDAPATAN & BIAYA LUAR USAHA\n";
        $csv .= "Pendapatan Lain-lain," . $res['summary']['other_income'] . "\n";
        foreach ($res['non_operating_expenses'] ?? [] as $nexp) {
            $csv .= '"' . $nexp['account'] . '",' . $nexp['amount'] . "\n";
        }
        $csv .= "LABA (RUGI) BERSIH," . $res['summary']['net_profit'] . "\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}

