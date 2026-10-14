<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyProduction;
use App\Models\DailyProductionItem;
use App\Models\Worker;
use App\Models\ProductProcessRate;
use App\Models\Product;
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
            'product_name' => 'required|string|max:255',
            'variation' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:100',
            'qty' => 'required|integer|min:1',
            'rate' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            // Determine rate: if not provided or 0, dynamically look up from product_process_rates
            $rate = $validated['rate'] ?? null;
            if (!$rate || $rate <= 0) {
                $rateRecord = ProductProcessRate::where('product_name', $validated['product_name'])
                    ->where('process_name', $validated['process_name'])
                    ->where('is_active', true)
                    ->first();

                $rate = $rateRecord ? (float) $rateRecord->rate : 2000;
            }

            $totalWage = (int) $validated['qty'] * (float) $rate;

            // Generate transaction number PRD-YYMMXX
            $datePart = Carbon::parse($validated['production_date'])->format('ym');
            $latestTrx = DailyProduction::where('transaction_number', 'like', "PRD-{$datePart}%")
                ->orderBy('id', 'desc')
                ->first();

            $seq = 1;
            if ($latestTrx) {
                $lastSeq = (int) substr($latestTrx->transaction_number, -2);
                $seq = $lastSeq + 1;
            }
            $trxNumber = 'PRD-' . $datePart . str_pad($seq, 2, '0', STR_PAD_LEFT);

            // Intelligent resolution to existing Warehouse product SKU
            $productModel = null;
            if (!empty($validated['product_id'])) {
                $productModel = Product::find($validated['product_id']);
            }
            if (!$productModel) {
                if (stripos($validated['product_name'], 'Baggy') !== false) {
                    $productModel = Product::where('product_group_id', 1)->first();
                } elseif (stripos($validated['product_name'], 'Scuba') !== false) {
                    $productModel = Product::where('product_group_id', 4)->first();
                } elseif (stripos($validated['product_name'], 'Jogger') !== false) {
                    $productModel = Product::where('product_group_id', 2)->first();
                } elseif (stripos($validated['product_name'], 'Pants') !== false) {
                    $productModel = Product::where('product_group_id', 3)->first();
                } else {
                    $productModel = Product::where('name', 'like', "%{$validated['product_name']}%")->first() ?? Product::first();
                }
            }

            $production = DailyProduction::create([
                'transaction_number' => $trxNumber,
                'production_date' => $validated['production_date'],
                'worker_id' => $validated['worker_id'],
                'process_name' => $validated['process_name'],
                'total_qty' => $validated['qty'],
                'total_wage' => $totalWage,
                'notes' => 'Input produksi via sistem ERP Finance',
                'status' => 'Tercatat',
                'created_by' => Auth::id(),
            ]);

            DailyProductionItem::create([
                'daily_production_id' => $production->id,
                'product_id' => $productModel?->id,
                'product_name' => $validated['product_name'],
                'variation' => $validated['variation'] ?? 'All Size',
                'color' => $validated['color'] ?? 'Black',
                'qty' => $validated['qty'],
                'rate' => $rate,
                'total_wage' => $totalWage,
            ]);

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
        $production->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Transaksi produksi berhasil dihapus.',
        ]);
    }
}
