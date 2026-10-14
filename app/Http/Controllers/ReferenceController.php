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
        // 1. Pekerja Aktif
        $workers = Worker::where('status', 'Aktif')
            ->select('id', 'worker_code', 'name', 'type', 'process', 'payment_system')
            ->get();

        // 2. Master Produk (Kombinasi product_groups dan daftar produk tarif HPP)
        $productGroups = ProductGroup::pluck('name')->toArray();
        $rateProducts = ProductProcessRate::distinct()->pluck('product_name')->toArray();
        $allProducts = array_values(array_unique(array_merge($rateProducts, [
            'Baggy Pants Reguler',
            'Baggy Pants Premium',
            'Scuba Pants',
            'Jogger Pants Reguler',
            'Pants'
        ])));

        // 3. Varian Ukuran (Diambil dari tabel products asli yang sudah ada di warehouse)
        $variations = Product::whereNotNull('variation')
            ->selectRaw("TRIM(SUBSTRING_INDEX(variation, ',', -1)) as var_name")
            ->distinct()
            ->pluck('var_name')
            ->filter()
            ->values()
            ->toArray();

        if (empty($variations)) {
            $variations = ['All Size', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        } else {
            $variations = array_values(array_unique(array_merge(['All Size', 'S', 'M', 'L', 'XL', 'XXL'], $variations)));
        }

        // 4. Warna Produk (Diambil dari nama / varian produk warehouse)
        $colors = Product::whereNotNull('variation')
            ->selectRaw("TRIM(SUBSTRING_INDEX(variation, ',', 1)) as color_name")
            ->distinct()
            ->pluck('color_name')
            ->filter()
            ->values()
            ->toArray();

        if (empty($colors)) {
            $colors = ['Black', 'Navy', 'Mocca', 'Olive', 'Cream', 'Hitam', 'Putih', 'Beige', 'Blue', 'Misty', 'Grey'];
        }

        // 5. Daftar Proses Pekerjaan
        $processes = ProductProcessRate::distinct()->pluck('process_name')->toArray();
        if (empty($processes)) {
            $processes = ['Potong', 'Jahit Luar', 'Jahit Dalam', 'Kansay', 'Overdeck', 'QC', 'Packing'];
        }

        return response()->json([
            'status' => 'success',
            'workers' => $workers,
            'products' => $allProducts,
            'variations' => $variations,
            'colors' => $colors,
            'processes' => $processes,
            'payment_systems' => ['Borongan', 'Harian', 'Bulanan'],
            'worker_types' => ['Produksi', 'Staff'],
        ]);
    }

    public function getRate(Request $request)
    {
        $request->validate([
            'product_name' => 'required|string',
            'process_name' => 'required|string',
        ]);

        $rateRecord = ProductProcessRate::where('product_name', $request->product_name)
            ->where('process_name', $request->process_name)
            ->where('is_active', true)
            ->first();

        // Fallback jika belum terdaftar spesifik
        $rate = $rateRecord ? (float) $rateRecord->rate : 2000;

        return response()->json([
            'status' => 'success',
            'rate' => $rate,
            'formatted_rate' => 'Rp ' . number_format($rate, 0, ',', '.'),
            'unit' => $rateRecord?->unit ?? 'pcs',
        ]);
    }
}
