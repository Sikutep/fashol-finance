<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Worker;
use App\Models\ProductGroup;
use App\Models\Product;
use App\Models\ProductProcessRate;

class ReferenceController extends Controller
{
    public function getOptions()
    {
        // 1. Pekerja Aktif (termasuk staff/user sistem)
        $workers = Worker::where('status', 'Aktif')
            ->select('id', 'worker_code', 'name', 'type', 'process', 'payment_system')
            ->orderBy('id', 'asc')
            ->get();

        // 2. Master Produk (Product Groups sebagai master model konveksi & acuan tarif)
        $productGroups = ProductGroup::select('id', 'name', 'long_name')->get();
        $groupNames = $productGroups->pluck('name')->toArray();
        $rateProducts = ProductProcessRate::where('is_active', true)->distinct()->pluck('product_name')->toArray();

        // Model/Produk yang menjadi acuan proses & HPP
        $allProducts = array_values(array_unique(array_filter(array_merge($groupNames, $rateProducts))));

        // 3. Mapping Dinamis Atribut Warna & Ukuran per Grup dari data riil tabel products
        $groupAttributes = [];
        $allColors = [];
        $allVariations = [];

        foreach ($productGroups as $grp) {
            $prodsInGroup = Product::where('product_group_id', $grp->id)->get();
            $grpColors = [];
            $grpVars = [];

            foreach ($prodsInGroup as $p) {
                $parts = explode(',', $p->variation ?? '');
                if (count($parts) >= 2) {
                    $c = trim($parts[0]);
                    $v = trim($parts[1]);
                    if ($c) {
                        $grpColors[$c] = true;
                        $allColors[$c] = true;
                    }
                    if ($v) {
                        $grpVars[$v] = true;
                        $allVariations[$v] = true;
                    }
                } elseif (count($parts) === 1 && trim($parts[0])) {
                    $c = trim($parts[0]);
                    $grpColors[$c] = true;
                    $allColors[$c] = true;
                }
            }

            $groupAttributes[$grp->name] = [
                'id' => $grp->id,
                'name' => $grp->name,
                'long_name' => $grp->long_name,
                'colors' => !empty($grpColors) ? array_keys($grpColors) : ['HITAM'],
                'variations' => !empty($grpVars) ? array_keys($grpVars) : ['ALL SIZE'],
            ];
        }

        $colors = !empty($allColors) ? array_keys($allColors) : ['HITAM', 'PUTIH', 'NAVY', 'GREY'];
        $variations = !empty($allVariations) ? array_keys($allVariations) : ['ALL SIZE', 'S', 'M', 'L', 'XL', 'XXL'];

        // 4. Daftar Proses Pekerjaan (Diambil dari tarif proses yang terdaftar di database)
        $processes = ProductProcessRate::where('is_active', true)->distinct()->pluck('process_name')->toArray();
        if (empty($processes)) {
            $processes = ['Potong', 'Jahit Luar', 'Jahit Dalam', 'Kansay', 'Overdeck', 'QC', 'Finish Good', 'Packing'];
        }

        return response()->json([
            'status' => 'success',
            'workers' => $workers,
            'products' => $allProducts,
            'product_groups' => $productGroups,
            'group_attributes' => $groupAttributes,
            'variations' => $variations,
            'colors' => $colors,
            'processes' => $processes,
            'payment_systems' => ['Borongan', 'Harian', 'Bulanan'],
            'worker_types' => ['Produksi', 'Staff'],
        ]);
    }

    public function getRate(Request $request)
    {
        $productName = $request->input('product_name') ?: $request->input('product');
        $processName = $request->input('process_name') ?: $request->input('process');

        if (!$productName || !$processName) {
            return response()->json([
                'status' => 'error',
                'message' => 'Parameter product_name dan process_name wajib disertakan.',
            ], 422);
        }

        // Rate lookup with intelligent group resolution
        $rateRecord = ProductProcessRate::where('process_name', $processName)
            ->where('is_active', true)
            ->where('product_name', $productName)
            ->first();

        if (!$rateRecord) {
            $hasSpecificCustomRates = ProductProcessRate::where('product_name', $productName)->exists();

            if (!$hasSpecificCustomRates) {
                $matchedGroup = ProductGroup::where('name', $productName)
                    ->orWhereRaw("? LIKE CONCAT('%', name, '%')", [$productName])
                    ->first();

                if ($matchedGroup) {
                    $rateRecord = ProductProcessRate::where('process_name', $processName)
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
                'status' => 'not_found',
                'found' => false,
                'rate' => 0,
                'formatted_rate' => 'Rp 0',
                'unit' => 'pcs',
                'message' => "Tarif aktif untuk produk '{$productName}' dan proses '{$processName}' belum ditentukan di modul Master Proses / HPP.",
            ]);
        }

        $rate = (float) $rateRecord->rate;

        return response()->json([
            'status' => 'success',
            'found' => true,
            'rate' => $rate,
            'formatted_rate' => 'Rp ' . number_format($rate, 0, ',', '.'),
            'unit' => $rateRecord->unit ?? 'pcs',
        ]);
    }

    // ==========================================
    // Master Proses Pekerjaan (CRUD API)
    // ==========================================

    public function getProcessRates(Request $request)
    {
        FinanceExtendedController::ensureHppStandardsExist();

        $query = ProductProcessRate::with('productGroup');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('process_name', 'like', "%{$s}%")
                  ->orWhere('product_name', 'like', "%{$s}%");
            });
        }

        if ($request->filled('product_group_id') && $request->product_group_id !== 'Semua') {
            $query->where('product_group_id', $request->product_group_id);
        }

        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('is_active', $request->status === 'Aktif');
        }

        $rates = $query->orderBy('product_name', 'asc')
            ->orderBy('process_name', 'asc')
            ->get();

        $groups = ProductGroup::select('id', 'name')->get();

        return response()->json([
            'status' => 'success',
            'data' => $rates,
            'product_groups' => $groups,
            'summary' => [
                'total_rates' => $rates->count(),
                'active_rates' => $rates->where('is_active', true)->count(),
                'avg_rate' => round($rates->avg('rate') ?? 0),
                'formatted_avg_rate' => 'Rp ' . number_format($rates->avg('rate') ?? 0, 0, ',', '.'),
            ]
        ]);
    }

    public function storeProcessRate(Request $request)
    {
        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'product_group_id' => 'nullable|exists:product_groups,id',
            'process_name' => 'required|string|max:100',
            'rate' => 'required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        // Auto-match product_group_id if not given
        if (empty($validated['product_group_id'])) {
            $grp = ProductGroup::where('name', $validated['product_name'])->first();
            if ($grp) {
                $validated['product_group_id'] = $grp->id;
            }
        }

        $rate = ProductProcessRate::create([
            'product_name' => $validated['product_name'],
            'product_group_id' => $validated['product_group_id'] ?? null,
            'process_name' => $validated['process_name'],
            'rate' => $validated['rate'],
            'unit' => $validated['unit'] ?? 'pcs',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Tarif proses '{$rate->process_name}' untuk '{$rate->product_name}' berhasil ditambahkan.",
            'data' => $rate->load('productGroup'),
        ], 201);
    }

    public function updateProcessRate(Request $request, $id)
    {
        $rate = ProductProcessRate::findOrFail($id);

        $validated = $request->validate([
            'product_name' => 'sometimes|required|string|max:255',
            'product_group_id' => 'nullable|exists:product_groups,id',
            'process_name' => 'sometimes|required|string|max:100',
            'rate' => 'sometimes|required|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $rate->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Tarif proses pekerjaan berhasil diperbarui.',
            'data' => $rate->fresh(['productGroup']),
        ]);
    }

    public function destroyProcessRate($id)
    {
        $rate = ProductProcessRate::findOrFail($id);
        $rate->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Tarif proses '{$rate->process_name}' berhasil dihapus.",
        ]);
    }
}
