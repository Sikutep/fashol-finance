<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Worker;

class WorkerController extends Controller
{
    public function index(Request $request)
    {
        $query = Worker::query();

        // Dynamic Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('worker_code', 'like', "%{$search}%")
                  ->orWhere('process', 'like', "%{$search}%")
                  ->orWhere('type', 'like', "%{$search}%");
            });
        }

        // Status Filter
        if ($request->filled('status') && $request->status !== 'Semua') {
            $query->where('status', $request->status);
        }

        // Payment System Filter
        if ($request->filled('payment_system') && $request->payment_system !== 'Semua') {
            $query->where('payment_system', $request->payment_system);
        }

        $perPage = $request->input('per_page', 10);
        $workers = $query->orderBy('id', 'asc')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $workers->items(),
            'pagination' => [
                'current_page' => $workers->currentPage(),
                'last_page' => $workers->lastPage(),
                'per_page' => $workers->perPage(),
                'total' => $workers->total(),
                'from' => $workers->firstItem() ?? 0,
                'to' => $workers->lastItem() ?? 0,
            ],
            'summary' => [
                'total' => Worker::count(),
                'active' => Worker::where('status', 'Aktif')->count(),
                'inactive' => Worker::where('status', 'Nonaktif')->count(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'process' => 'required|string|max:100',
            'payment_system' => 'required|in:Borongan,Harian,Bulanan',
            'status' => 'required|in:Aktif,Nonaktif',
            'notes' => 'nullable|string',
        ]);

        // Auto-generate worker_code (PKR-001, PKR-002, ...)
        $lastWorker = Worker::withTrashed()->orderBy('id', 'desc')->first();
        $nextId = $lastWorker ? ($lastWorker->id + 1) : 1;
        $workerCode = 'PKR-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);

        $worker = Worker::create([
            'worker_code' => $workerCode,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'process' => $validated['process'],
            'payment_system' => $validated['payment_system'],
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Pekerja berhasil ditambahkan.',
            'data' => $worker,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $worker = Worker::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:100',
            'process' => 'sometimes|required|string|max:100',
            'payment_system' => 'sometimes|required|in:Borongan,Harian,Bulanan',
            'status' => 'sometimes|required|in:Aktif,Nonaktif',
            'notes' => 'nullable|string',
        ]);

        $worker->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Data pekerja berhasil diperbarui.',
            'data' => $worker,
        ]);
    }

    public function destroy($id)
    {
        $worker = Worker::findOrFail($id);

        // Check if worker already has transactions
        if ($worker->dailyProductions()->exists()) {
            // Keep history intact, soft delete only
            $worker->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Pekerja dinonaktifkan / diarsipkan untuk menjaga histori transaksi.',
            ]);
        }

        $worker->forceDelete();
        return response()->json([
            'status' => 'success',
            'message' => 'Pekerja berhasil dihapus.',
        ]);
    }
}
