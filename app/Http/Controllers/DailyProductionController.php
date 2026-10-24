<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\Worker;
use App\Models\ProductProcessRate;
use App\Models\Product;
use App\Models\ProductGroup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class DailyProductionController extends Controller
{
    public function index(Request $request)
    {
        $query = DailyProduction::with(['worker', 'items']);

        // Dynamic Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', "%{$search}%")
                  ->orWhere('process_name', 'like', "%{$search}%")
                  ->orWhereHas('worker', function ($wq) use ($search) {
                      $wq->where('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('items', function ($iq) use ($search) {
                      $iq->where('product_name', 'like', "%{$search}%")
                         ->orWhere('variation', 'like', "%{$search}%")
                         ->orWhere('color', 'like', "%{$search}%");
                  });
            });
        }

        // Process Filter
        if ($request->filled('process') && $request->process !== 'Semua') {
            $query->where('process_name', $request->process);
        }

        // Date Filter
        if ($request->filled('date')) {
            $query->whereDate('production_date', $request->date);
        }

        // Calculate dynamic summary for the current filtered view or overall
        $summaryQuery = clone $query;
        $totalQty = (int) $summaryQuery->sum('total_qty');
        $totalWage = (float) $summaryQuery->sum('total_wage');
        $totalTransactions = (int) $summaryQuery->count();

        $perPage = min(100, max(5, (int) $request->input('per_page', 10)));
        $productions = $query->orderBy('production_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        // Format items for table display
        $formattedData = collect($productions->items())->map(function ($p) {
            $itemCount = $p->items->count();
            $firstItem = $p->items->first();

            if ($itemCount > 1) {
                $productDisplay = $p->items->map(function ($it) {
                    $parts = array_filter([$it->product_name, $it->color, $it->variation]);
                    return implode(' ', $parts) . " ({$it->qty} pcs)";
                })->join(', ');
                $qty = (int) $p->total_qty;
                $rate = $p->total_qty > 0 ? round($p->total_wage / $p->total_qty) : 0;
                $formattedRate = 'Rp ' . number_format($rate, 0, ',', '.') . ' (rata-rata)';
            } else {
                $productDisplay = $firstItem ? ($firstItem->product_name . ' - ' . ($firstItem->variation ? $firstItem->variation . ' • ' : '') . ($firstItem->color ?? '')) : '-';
                $qty = $firstItem ? (int) $firstItem->qty : (int) $p->total_qty;
                $rate = $firstItem ? (float) $firstItem->rate : ($p->total_qty > 0 ? ($p->total_wage / $p->total_qty) : 0);
                $formattedRate = 'Rp ' . number_format($rate, 0, ',', '.');
            }

            return [
                'id' => $p->id,
                'transaction_number' => $p->transaction_number,
                'production_date' => Carbon::parse($p->production_date)->translatedFormat('d M Y'),
                'raw_date' => $p->production_date->format('Y-m-d'),
                'worker_id' => $p->worker_id,
                'worker_name' => $p->worker ? $p->worker->name : 'Pekerja Tidak Ditemukan',
                'process_name' => $p->process_name,
                'product_display' => $productDisplay,
                'product_name' => $firstItem?->product_name ?? '',
                'variation' => $firstItem?->variation ?? '',
                'color' => $firstItem?->color ?? '',
                'qty' => $qty,
                'item_count' => $itemCount,
                'rate' => (float) $rate,
                'formatted_rate' => $formattedRate,
                'total_wage' => (float) $p->total_wage,
                'formatted_total_wage' => 'Rp ' . number_format($p->total_wage, 0, ',', '.'),
                'status' => $p->status,
                'items' => $p->items,
            ];
        });

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total_quantity' => $totalQty,
                'total_quantity_formatted' => number_format($totalQty, 0, ',', '.') . ' pcs',
                'total_wage' => $totalWage,
                'total_wage_formatted' => 'Rp ' . number_format($totalWage, 0, ',', '.'),
                'total_transactions' => $totalTransactions,
                'total_transactions_formatted' => $totalTransactions . ' transaksi',
            ],
            'data' => $formattedData,
            'pagination' => [
                'current_page' => $productions->currentPage(),
                'last_page' => $productions->lastPage(),
                'per_page' => $productions->perPage(),
                'total' => $productions->total(),
                'from' => $productions->firstItem() ?? 0,
                'to' => $productions->lastItem() ?? 0,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'production_date' => 'required|date',
            'worker_id' => 'required|exists:workers,id',
            'process_name' => 'required|string|max:100',
            'notes' => 'nullable|string',
            // Support either multiple items array OR single item fields
            'items' => 'nullable|array|min:1',
            'items.*.product_name' => 'required_with:items|string|max:255',
            'items.*.variation' => 'nullable|string|max:255',
            'items.*.color' => 'nullable|string|max:100',
            'items.*.qty' => 'required_with:items|integer|min:1',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.product_id' => 'nullable|integer',
            // Fallback for single item format
            'product_name' => 'required_without:items|string|max:255',
            'variation' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:100',
            'qty' => 'required_without:items|integer|min:1',
            'rate' => 'nullable|numeric|min:0',
            'product_id' => 'nullable|integer',
        ]);

        $worker = Worker::findOrFail($validated['worker_id']);
        if ($worker->status !== 'Aktif') {
            return response()->json([
                'status' => 'error',
                'message' => "Pekerja {$worker->name} berstatus Nonaktif dan tidak dapat menerima transaksi produksi baru.",
            ], 422);
        }

        // Scope Guard: Cegah karyawan bulanan / staf kantor dicatat dalam produksi harian borongan
        if ($worker->payment_system === 'Bulanan' && $worker->type === 'Staff') {
            return response()->json([
                'status' => 'error',
                'message' => "Pekerja {$worker->name} ({$worker->process}) merupakan karyawan Bulanan/Staff dan tidak dapat dicatat dalam transaksi Produksi Harian borongan.",
            ], 422);
        }

        // Scope Guard: Cegah pencatatan backdated ke periode payroll mingguan yang telah Disetujui atau Dibayar
        $prodDate = Carbon::parse($validated['production_date']);
        $processName = $validated['process_name'] ?? null;

        $procRecord = \App\Models\ProductionProcess::where('process_name', $processName)->first();
        $payrollDay = $procRecord->payroll_day ?? (in_array($processName, ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : 'Sabtu');

        if ($payrollDay === 'Sabtu') {
            $cycleStart = ($prodDate->dayOfWeek === Carbon::SATURDAY) ? $prodDate->copy()->startOfDay() : $prodDate->copy()->previous(Carbon::SATURDAY)->startOfDay();
            $cycleEnd = $cycleStart->copy()->addDays(6)->endOfDay();
        } else {
            $cycleStart = ($prodDate->dayOfWeek === Carbon::THURSDAY) ? $prodDate->copy()->startOfDay() : $prodDate->copy()->previous(Carbon::THURSDAY)->startOfDay();
            $cycleEnd = $cycleStart->copy()->addDays(6)->endOfDay();
        }

        $existingInPeriod = DailyProduction::whereBetween('production_date', [$cycleStart->format('Y-m-d'), $cycleEnd->format('Y-m-d')])
            ->where('process_name', $processName)
            ->get();
        $isPeriodLocked = $existingInPeriod->contains(fn($r) => in_array($r->status, ['Disetujui', 'Dibayar', 'Masuk Payroll']));

        if ($isPeriodLocked && !Auth::user()->isOwner()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode payroll untuk proses ' . $processName . ' pada tanggal ' . $prodDate->translatedFormat('d F Y') . ' telah disetujui atau dibayar. Transaksi baru tidak dapat dicatat.',
            ], 422);
        }

        // Normalize raw items list
        $rawItems = [];
        if (!empty($validated['items'])) {
            $rawItems = $validated['items'];
        } else {
            $rawItems[] = [
                'product_name' => $validated['product_name'],
                'variation' => $validated['variation'] ?? 'All Size',
                'color' => $validated['color'] ?? 'Black',
                'qty' => (int) $validated['qty'],
                'rate' => isset($validated['rate']) && $validated['rate'] > 0 ? (float) $validated['rate'] : null,
                'product_id' => $validated['product_id'] ?? null,
            ];
        }

        return DB::transaction(function () use ($validated, $rawItems, $request) {
            $preparedItems = [];
            $totalQty = 0;
            $totalWage = 0;

            foreach ($rawItems as $item) {
                $qty = (int) $item['qty'];
                $rate = isset($item['rate']) && $item['rate'] > 0 ? (float) $item['rate'] : null;

                // Look up rate from HPP if not provided
                if (!$rate || $rate <= 0) {
                    $rateRecord = ProductProcessRate::where('process_name', $validated['process_name'])
                        ->where('is_active', true)
                        ->where('product_name', $item['product_name'])
                        ->first();

                    if (!$rateRecord) {
                        $hasSpecificCustomRates = ProductProcessRate::where('product_name', $item['product_name'])->exists();

                        if (!$hasSpecificCustomRates) {
                            $matchedGroup = ProductGroup::where('name', $item['product_name'])
                                ->orWhereRaw("? LIKE CONCAT('%', name, '%')", [$item['product_name']])
                                ->first();

                            if ($matchedGroup) {
                                $rateRecord = ProductProcessRate::where('process_name', $validated['process_name'])
                                    ->where('is_active', true)
                                    ->where(function ($q) use ($matchedGroup) {
                                        $q->where('product_group_id', $matchedGroup->id)
                                          ->orWhere('product_name', $matchedGroup->name);
                                    })
                                    ->first();
                            }
                        }
                    }

                    if (!$rateRecord) {
                        throw new \Illuminate\Http\Exceptions\HttpResponseException(
                            response()->json([
                                'status' => 'error',
                                'message' => "Tarif aktif untuk produk '{$item['product_name']}' dan proses '{$validated['process_name']}' belum ditentukan di modul HPP.",
                                'errors' => [
                                    'process_name' => ["Tarif aktif untuk produk '{$item['product_name']}' dan proses '{$validated['process_name']}' belum ditentukan di modul HPP."],
                                ],
                            ], 422)
                        );
                    }
                    $rate = (float) $rateRecord->rate;
                }

                $itemWage = $qty * $rate;
                $totalQty += $qty;
                $totalWage += $itemWage;

                // Intelligent resolution to existing Warehouse product SKU
                $productModel = null;
                if (!empty($item['product_id'])) {
                    $productModel = Product::find($item['product_id']);
                }

                if (!$productModel) {
                    // 1. Resolve matching Product Group
                    $group = ProductGroup::where('name', $item['product_name'])
                        ->orWhere('long_name', 'like', "%{$item['product_name']}%")
                        ->first();

                    if (!$group) {
                        $allGroups = ProductGroup::all();
                        foreach ($allGroups as $g) {
                            if (stripos($item['product_name'], $g->name) !== false || 
                                ($g->long_name && stripos($item['product_name'], $g->long_name) !== false)) {
                                $group = $g;
                                break;
                            }
                        }
                    }

                    if ($group) {
                        // 2. Exact match on (product_group_id + color + variation)
                        $q = Product::where('product_group_id', $group->id);
                        if (!empty($item['color'])) {
                            $q->where('variation', 'like', '%' . trim($item['color']) . '%');
                        }
                        if (!empty($item['variation'])) {
                            $q->where('variation', 'like', '%' . trim($item['variation']) . '%');
                        }
                        $productModel = $q->first();

                        // 3. Fallback: match by color in that group
                        if (!$productModel && !empty($item['color'])) {
                            $productModel = Product::where('product_group_id', $group->id)
                                ->where('variation', 'like', '%' . trim($item['color']) . '%')
                                ->first();
                        }

                        // 4. Fallback: first product in that group
                        if (!$productModel) {
                            $productModel = Product::where('product_group_id', $group->id)->first();
                        }
                    }
                }

                if (!$productModel) {
                    $productModel = Product::where('name', 'like', "%{$item['product_name']}%")->first() ?? Product::first();
                }

                $preparedItems[] = [
                    'product_id' => $productModel?->id,
                    'product_name' => $item['product_name'],
                    'variation' => $item['variation'] ?? 'All Size',
                    'color' => $item['color'] ?? 'Black',
                    'qty' => $qty,
                    'rate' => $rate,
                    'total_wage' => $itemWage,
                ];
            }

            // Generate unique sequential transaction number PRD-YYMM-XXX
            $datePart = Carbon::parse($validated['production_date'])->format('ym');
            $countThisMonth = DailyProduction::where('transaction_number', 'like', "PRD-{$datePart}%")->count();
            $seq = $countThisMonth + 1;
            $trxNumber = 'PRD-' . $datePart . str_pad($seq, 2, '0', STR_PAD_LEFT);

            while (DailyProduction::where('transaction_number', $trxNumber)->exists()) {
                $seq++;
                $trxNumber = 'PRD-' . $datePart . str_pad($seq, 2, '0', STR_PAD_LEFT);
            }

            $production = DailyProduction::create([
                'transaction_number' => $trxNumber,
                'production_date' => $validated['production_date'],
                'worker_id' => $validated['worker_id'],
                'process_name' => $validated['process_name'],
                'total_qty' => $totalQty,
                'total_wage' => $totalWage,
                'notes' => $validated['notes'] ?? 'Input produksi via sistem ERP Finance',
                'status' => 'Tercatat',
                'created_by' => Auth::id(),
            ]);

            foreach ($preparedItems as $prep) {
                DailyProductionItem::create(array_merge($prep, [
                    'daily_production_id' => $production->id,
                ]));
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Produksi harian berhasil dicatat.',
                'data' => $production->load(['worker', 'items']),
            ], 201);
        });
    }

    public function destroy($id)
    {
        $production = DailyProduction::findOrFail($id);

        // Scope Guard: Transaksi yang sedang diperiksa / disetujui / dibayar tidak boleh dihapus
        if (in_array($production->status, ['Diperiksa', 'Disetujui', 'Dibayar', 'Masuk Payroll'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Transaksi produksi yang sedang diperiksa, telah disetujui, atau masuk payroll tidak dapat dihapus demi integritas keuangan.',
            ], 422);
        }

        $production->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Transaksi produksi berhasil dihapus.',
        ]);
    }

    public function exportDailyProduction(Request $request)
    {
        $query = DailyProduction::with(['worker', 'items']);
        if ($request->filled('date')) {
            $query->whereDate('production_date', $request->date);
        }
        if ($request->filled('process') && $request->process !== 'Semua') {
            $query->where('process_name', $request->process);
        }
        $productions = $query->orderBy('production_date', 'desc')->get();

        $filename = "riwayat_produksi_" . ($request->filled('date') ? $request->date : 'all') . ".csv";

        $csv = "\xEF\xBB\xBF";
        $csv .= "RIWAYAT PRODUKSI HARIAN - CV FASHOL MITSLI SEE\n";
        $csv .= "Tanggal:," . ($request->filled('date') ? $request->date : 'Semua Tanggal') . "\n\n";
        $csv .= "No,No Transaksi,Tanggal,Nama Pekerja,Proses,Produk,Varian,Warna,Qty (pcs),Tarif Satuan (Rp),Total Upah (Rp),Status\n";

        $no = 1;
        $totalQty = 0;
        $totalWage = 0;
        foreach ($productions as $p) {
            foreach ($p->items as $it) {
                $pDate = $p->production_date ? Carbon::parse($p->production_date)->format('Y-m-d') : '-';
                $csv .= "{$no}," . '"' . $p->transaction_number . '",' . '"' . $pDate . '",' . '"' . ($p->worker->name ?? '-') . '",' . '"' . $p->process_name . '",' . '"' . $it->product_name . '",' . '"' . ($it->variation ?: '-') . '",' . '"' . ($it->color ?: '-') . '",' . $it->qty . ',' . $it->rate . ',' . $it->total_wage . ',' . '"' . $p->status . '"' . "\n";
                $totalQty += (int) $it->qty;
                $totalWage += (float) $it->total_wage;
                $no++;
            }
        }
        $csv .= "TOTAL,,,,,,,,{$totalQty},,{$totalWage},\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
