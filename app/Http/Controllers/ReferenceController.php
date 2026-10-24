<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Worker;
use App\Models\ProductGroup;
use App\Models\Product;
use App\Models\ProductProcessRate;
use App\Models\ProductionProcess;
use App\Models\DailyProduction;

class ReferenceController extends Controller
{
    /**
     * Memastikan katalog proses standar telah terisi di database (zero-setup seeder).
     */
    public static function ensureStandardProcessesExist(): void
    {
        if (ProductionProcess::count() === 0) {
            $standards = [
                ['code' => 'PRC-POTONG', 'name' => 'Potong', 'rate' => 350, 'unit' => 'pcs', 'desc' => 'Pemotongan pola kain bahan baku sesuai ukuran pola konveksi'],
                ['code' => 'PRC-JAHIT', 'name' => 'Jahit', 'rate' => 2500, 'unit' => 'pcs', 'desc' => 'Penjahitan utama perakitan komponen kain menjadi pakaian jadi'],
                ['code' => 'PRC-OVERDEK', 'name' => 'Overdek', 'rate' => 200, 'unit' => 'pcs', 'desc' => 'Proses penguncian kelim bawah baju dan ujung lengan (overdeck)'],
                ['code' => 'PRC-KANSAY', 'name' => 'Kansay', 'rate' => 200, 'unit' => 'pcs', 'desc' => 'Penjahitan rantai / kansai untuk ban pinggang dan kerah'],
                ['code' => 'PRC-QC', 'name' => 'QC', 'rate' => 300, 'unit' => 'pcs', 'desc' => 'Pemeriksaan mutu jahitan, ukuran, dan penyortiran produk reject'],
                ['code' => 'PRC-OPP', 'name' => 'OPP', 'rate' => 250, 'unit' => 'pcs', 'desc' => 'Pengemasan produk bersih ke dalam plastik OPP individual'],
                ['code' => 'PRC-BENANG', 'name' => 'Benang', 'rate' => 500, 'unit' => 'pcs', 'desc' => 'Pembersihan sisa benang jahitan (finishing / buang benang)'],
                ['code' => 'PRC-BORDIR', 'name' => 'Bordir', 'rate' => 900, 'unit' => 'pcs', 'desc' => 'Aplikasi bordir logo / emblem panel pakaian'],
            ];

            foreach ($standards as $s) {
                ProductionProcess::create([
                    'process_code' => $s['code'],
                    'process_name' => $s['name'],
                    'description' => $s['desc'],
                    'default_rate' => $s['rate'],
                    'unit' => $s['unit'],
                    'payroll_day' => in_array($s['name'], ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : 'Sabtu',
                    'is_active' => true,
                ]);
            }
        }
    }

    public function getOptions()
    {
        self::ensureStandardProcessesExist();

        // 1. Pekerja Aktif (termasuk staff/user sistem)
        $workers = Worker::where('status', 'Aktif')
            ->select('id', 'worker_code', 'name', 'type', 'process', 'payment_system')
            ->orderBy('id', 'asc')
            ->get();

        // Khusus Pekerja Produksi Harian (Hanya pekerja borongan fisik konveksi, bukan staf kantor/bulanan)
        $productionWorkers = $workers->filter(function ($w) {
            return $w->payment_system !== 'Bulanan' && $w->type !== 'Staff';
        })->values();

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

        // 4. Daftar Proses Pekerjaan (Diambil dari Katalog Master Proses Resmi)
        $standardProcesses = ProductionProcess::where('is_active', true)
            ->orderBy('id', 'asc')
            ->get();

        $processes = $standardProcesses->pluck('process_name')->toArray();
        if (empty($processes)) {
            $processes = ProductProcessRate::where('is_active', true)->distinct()->pluck('process_name')->toArray();
        }

        // 5. Peta Tarif Aktif (Rates Map) murni dari Tarif Pekerjaan per Produk (Option A - Strict)
        $ratesMap = [];
        $activeRates = ProductProcessRate::where('is_active', true)->get();
        foreach ($activeRates as $ar) {
            $ratesMap[$ar->product_name . '|' . $ar->process_name] = (float) $ar->rate;
        }

        return response()->json([
            'status' => 'success',
            'workers' => $workers,
            'production_workers' => $productionWorkers,
            'products' => $allProducts,
            'product_groups' => $productGroups,
            'group_attributes' => $groupAttributes,
            'variations' => $variations,
            'colors' => $colors,
            'processes' => $processes,
            'standard_processes' => $standardProcesses,
            'rates_map' => $ratesMap,
            'payment_systems' => ['Borongan', 'Harian', 'Bulanan'],
            'worker_types' => ['Produksi', 'Staff'],
        ]);
    }

    public function getRate(Request $request)
    {
        self::ensureStandardProcessesExist();

        $productName = $request->input('product_name') ?: $request->input('product');
        $processName = $request->input('process_name') ?: $request->input('process');

        if (!$productName || !$processName) {
            return response()->json([
                'status' => 'error',
                'message' => 'Parameter product_name dan process_name wajib disertakan.',
            ], 422);
        }

        // 1. Hierarki Pertama: Cek Tarif Spesifik per Produk di ProductProcessRate
        $rateRecord = ProductProcessRate::where('process_name', $processName)
            ->where('is_active', true)
            ->where('product_name', $productName)
            ->first();

        if (!$rateRecord) {
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

        if ($rateRecord) {
            $rate = (float) $rateRecord->rate;
            return response()->json([
                'status' => 'success',
                'found' => true,
                'rate' => $rate,
                'formatted_rate' => 'Rp ' . number_format($rate, 0, ',', '.'),
                'unit' => $rateRecord->unit ?? 'pcs',
                'source' => $rateRecord->is_custom_rate ? 'custom' : 'product_rate',
            ]);
        }

        // Option A (Strict): Produk yang belum didaftarkan di Tarif Pekerjaan (Tab 2) TIDAK otomatis memiliki tarif
        return response()->json([
            'status' => 'not_found',
            'found' => false,
            'rate' => 0,
            'formatted_rate' => 'Rp 0',
            'unit' => 'pcs',
            'message' => "Tarif aktif untuk produk '{$productName}' dan proses '{$processName}' belum ditentukan di modul Master Proses.",
        ]);
    }

    // ==========================================
    // BAGIAN 1: Master Proses Standar (Katalog Proses Pabrik)
    // ==========================================

    public function getProductionProcesses(Request $request)
    {
        self::ensureStandardProcessesExist();

        $query = ProductionProcess::query();

        // Search filter (process_name, process_code, description)
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('process_name', 'like', "%{$s}%")
                  ->orWhere('process_code', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%");
            });
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('is_active', $request->status === 'Aktif');
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortDir = strtolower($request->input('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['id', 'process_name', 'process_code', 'default_rate', 'unit', 'is_active', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('id', 'asc');
        }

        // Pagination capped safely
        $perPage = min(100, max(5, (int) $request->input('per_page', 10)));
        $processes = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $processes->items(),
            'pagination' => [
                'current_page' => $processes->currentPage(),
                'last_page' => $processes->lastPage(),
                'per_page' => $processes->perPage(),
                'total' => $processes->total(),
                'from' => $processes->firstItem() ?? 0,
                'to' => $processes->lastItem() ?? 0,
            ],
            'summary' => [
                'total_processes' => ProductionProcess::count(),
                'active_processes' => ProductionProcess::where('is_active', true)->count(),
                'avg_default_rate' => round(ProductionProcess::where('is_active', true)->avg('default_rate') ?? 0),
                'formatted_avg_default_rate' => 'Rp ' . number_format(ProductionProcess::where('is_active', true)->avg('default_rate') ?? 0, 0, ',', '.'),
            ],
        ]);
    }

    public function storeProductionProcess(Request $request)
    {
        $validated = $request->validate([
            'process_name' => 'required|string|max:100|unique:production_processes,process_name',
            'process_code' => 'nullable|string|max:50|unique:production_processes,process_code',
            'description' => 'nullable|string',
            'default_rate' => 'required|numeric|min:0|max:50000',
            'unit' => 'nullable|string|max:50',
            'payroll_day' => 'nullable|string|in:Kamis,Sabtu',
            'is_active' => 'nullable|boolean',
        ]);

        $code = $validated['process_code'] ?? null;
        if (empty($code)) {
            $cleanName = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $validated['process_name']));
            $code = 'PRC-' . substr($cleanName, 0, 8);
            $base = $code;
            $counter = 1;
            while (ProductionProcess::where('process_code', $code)->exists()) {
                $code = $base . '-' . $counter++;
            }
        }

        $defaultDay = in_array($validated['process_name'], ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : 'Sabtu';

        $process = ProductionProcess::create([
            'process_code' => $code,
            'process_name' => $validated['process_name'],
            'description' => $validated['description'] ?? null,
            'default_rate' => $validated['default_rate'],
            'unit' => $validated['unit'] ?? 'pcs',
            'payroll_day' => $validated['payroll_day'] ?? $defaultDay,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Master proses '{$process->process_name}' berhasil ditambahkan ke katalog standar pabrik.",
            'data' => $process,
        ], 201);
    }

    public function updateProductionProcess(Request $request, $id)
    {
        $process = ProductionProcess::findOrFail($id);

        $validated = $request->validate([
            'process_name' => 'sometimes|required|string|max:100|unique:production_processes,process_name,' . $process->id,
            'process_code' => 'nullable|string|max:50|unique:production_processes,process_code,' . $process->id,
            'description' => 'nullable|string',
            'default_rate' => 'sometimes|required|numeric|min:0|max:50000',
            'unit' => 'nullable|string|max:50',
            'payroll_day' => 'nullable|string|in:Kamis,Sabtu',
            'is_active' => 'nullable|boolean',
        ]);

        $process->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => "Master proses '{$process->process_name}' berhasil diperbarui.",
            'data' => $process,
        ]);
    }

    public function destroyProductionProcess($id)
    {
        $process = ProductionProcess::findOrFail($id);

        // Periksa apakah proses ini sedang dipakai pada tarif produk atau transaksi produksi
        $isUsedInRates = ProductProcessRate::where('process_name', $process->process_name)->exists();
        $isUsedInProductions = DailyProduction::where('process_name', $process->process_name)->exists();

        if ($isUsedInRates || $isUsedInProductions) {
            // Lindungi integritas data dengan menonaktifkan proses (Soft Deactivate)
            $process->update(['is_active' => false]);
            return response()->json([
                'status' => 'success',
                'message' => "Proses '{$process->process_name}' dinonaktifkan (diarsipkan) untuk menjaga integritas data tarif dan riwayat produksi.",
                'data' => $process,
            ]);
        }

        $process->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Master proses '{$process->process_name}' berhasil dihapus.",
        ]);
    }

    // ==========================================
    // BAGIAN 2: Tarif Pekerjaan per Produk
    // ==========================================

    public function getProcessRates(Request $request)
    {
        self::ensureStandardProcessesExist();
        FinanceExtendedController::ensureHppStandardsExist();

        $query = ProductProcessRate::with(['productGroup', 'productionProcess']);

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

        if ($request->filled('type') && $request->type !== 'Semua') {
            if ($request->type === 'Khusus') {
                $query->where('is_custom_rate', true);
            } elseif ($request->type === 'Standar') {
                $query->where('is_custom_rate', false);
            }
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'product_name');
        $sortDir = strtolower($request->input('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['product_name', 'process_name', 'rate', 'unit', 'is_custom_rate', 'is_active', 'created_at'];

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
            if ($sortBy === 'product_name') {
                $query->orderBy('process_name', 'asc');
            }
        } else {
            $query->orderBy('product_name', 'asc')->orderBy('process_name', 'asc');
        }

        // Pagination capped safely
        $perPageInput = $request->input('per_page', 10);
        $groups = ProductGroup::select('id', 'name')->get();
        $standardProcesses = ProductionProcess::where('is_active', true)->orderBy('id', 'asc')->get();

        $totalRates = ProductProcessRate::count();
        $activeRatesCount = ProductProcessRate::where('is_active', true)->count();
        $customRatesCount = ProductProcessRate::where('is_custom_rate', true)->count();
        $avgRate = round(ProductProcessRate::where('is_active', true)->avg('rate') ?? 0);

        if ($perPageInput === 'all' || $perPageInput === '-1') {
            $rates = $query->get();
            return response()->json([
                'status' => 'success',
                'data' => $rates,
                'pagination' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $rates->count(),
                    'total' => $rates->count(),
                    'from' => $rates->count() > 0 ? 1 : 0,
                    'to' => $rates->count(),
                ],
                'product_groups' => $groups,
                'standard_processes' => $standardProcesses,
                'summary' => [
                    'total_rates' => $totalRates,
                    'active_rates' => $activeRatesCount,
                    'custom_rates_count' => $customRatesCount,
                    'avg_rate' => $avgRate,
                    'formatted_avg_rate' => 'Rp ' . number_format($avgRate, 0, ',', '.'),
                ]
            ]);
        }

        $perPage = min(100, max(5, (int) $perPageInput));
        $paginated = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem() ?? 0,
                'to' => $paginated->lastItem() ?? 0,
            ],
            'product_groups' => $groups,
            'standard_processes' => $standardProcesses,
            'summary' => [
                'total_rates' => $totalRates,
                'active_rates' => $activeRatesCount,
                'custom_rates_count' => $customRatesCount,
                'avg_rate' => $avgRate,
                'formatted_avg_rate' => 'Rp ' . number_format($avgRate, 0, ',', '.'),
            ]
        ]);
    }

    public function storeProcessRate(Request $request)
    {
        self::ensureStandardProcessesExist();

        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'product_group_id' => 'nullable|exists:product_groups,id',
            'process_name' => 'required|string|max:100',
            'rate' => 'nullable|numeric|min:0|max:50000',
            'is_custom_rate' => 'nullable|boolean',
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

        $isCustom = (bool) ($validated['is_custom_rate'] ?? false);
        $rateValue = isset($validated['rate']) && $validated['rate'] !== '' ? (float) $validated['rate'] : null;

        // Jika bukan tarif khusus dan rate kosong, ambil otomatis dari tarif bawaan Master Proses
        if (!$isCustom && ($rateValue === null || $rateValue <= 0)) {
            $std = ProductionProcess::where('process_name', $validated['process_name'])->first();
            $rateValue = $std ? (float) $std->default_rate : 0;
        }

        // Cek apakah tarif untuk kombinasi produk dan proses ini sudah ada
        $existing = ProductProcessRate::where('product_name', $validated['product_name'])
            ->where('process_name', $validated['process_name'])
            ->first();

        if ($existing) {
            $existing->update([
                'product_group_id' => $validated['product_group_id'] ?? $existing->product_group_id,
                'rate' => $rateValue,
                'is_custom_rate' => $isCustom,
                'unit' => $validated['unit'] ?? $existing->unit,
                'is_active' => $validated['is_active'] ?? $existing->is_active,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Tarif proses '{$existing->process_name}' untuk '{$existing->product_name}' berhasil diperbarui.",
                'data' => $existing->fresh(['productGroup', 'productionProcess']),
            ]);
        }

        $rate = ProductProcessRate::create([
            'product_name' => $validated['product_name'],
            'product_group_id' => $validated['product_group_id'] ?? null,
            'process_name' => $validated['process_name'],
            'rate' => $rateValue ?? 0,
            'is_custom_rate' => $isCustom,
            'unit' => $validated['unit'] ?? 'pcs',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Tarif proses '{$rate->process_name}' untuk '{$rate->product_name}' berhasil ditetapkan.",
            'data' => $rate->load(['productGroup', 'productionProcess']),
        ], 201);
    }

    public function updateProcessRate(Request $request, $id)
    {
        $rate = ProductProcessRate::findOrFail($id);

        $validated = $request->validate([
            'product_name' => 'sometimes|required|string|max:255',
            'product_group_id' => 'nullable|exists:product_groups,id',
            'process_name' => 'sometimes|required|string|max:100',
            'rate' => 'sometimes|required|numeric|min:0|max:50000',
            'is_custom_rate' => 'nullable|boolean',
            'unit' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $rate->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Tarif pekerjaan berhasil diperbarui.',
            'data' => $rate->fresh(['productGroup', 'productionProcess']),
        ]);
    }

    public function destroyProcessRate($id)
    {
        $rate = ProductProcessRate::findOrFail($id);
        $rate->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Tarif proses '{$rate->process_name}' untuk produk '{$rate->product_name}' berhasil dihapus.",
        ]);
    }
}
