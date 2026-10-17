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

        $perPage = $request->input('per_page', 10);
        $productions = $query->orderBy('production_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        // Format items for table display
        $formattedData = collect($productions->items())->map(function ($p) {
            $firstItem = $p->items->first();
            $productDisplay = $firstItem ? ($firstItem->product_name . ' - ' . ($firstItem->variation ? $firstItem->variation . ' • ' : '') . ($firstItem->color ?? '')) : '-';
            $qty = $firstItem ? $firstItem->qty : $p->total_qty;
            $rate = $firstItem ? $firstItem->rate : ($p->total_qty > 0 ? ($p->total_wage / $p->total_qty) : 0);

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
                'rate' => (float) $rate,
                'formatted_rate' => 'Rp ' . number_format($rate, 0, ',', '.'),
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
                        return response()->json([
                            'status' => 'error',
                            'message' => "Tarif aktif untuk produk '{$item['product_name']}' dan proses '{$validated['process_name']}' belum ditentukan di modul HPP.",
                        ], 422);
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

        // Scope Guard: Transaksi yang sudah masuk payroll / disetujui / dibayar tidak boleh dihapus
        if (in_array($production->status, ['Disetujui', 'Dibayar', 'Masuk Payroll'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Transaksi produksi yang telah disetujui atau masuk payroll tidak dapat dihapus demi integritas keuangan.',
            ], 422);
        }

        $production->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Transaksi produksi berhasil dihapus.',
        ]);
    }
}
