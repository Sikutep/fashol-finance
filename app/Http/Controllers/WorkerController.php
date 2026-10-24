<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Worker;
use App\Models\User;
use App\Models\ProductionProcess;

class WorkerController extends Controller
{
    public function index(Request $request)
    {
        // Auto-sync users to workers only if master worker table is empty (or via explicit /api/workers/sync-users)
        if (Worker::count() === 0) {
            $this->syncUsersWithWorkers();
        }

        $query = Worker::with('user');

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

        $perPage = min(100, max(5, (int) $request->input('per_page', 10)));
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

    public function syncUsers(Request $request)
    {
        $count = $this->syncUsersWithWorkers();
        return response()->json([
            'status' => 'success',
            'message' => "Berhasil menyinkronkan {$count} user sistem ke Master Pekerja.",
        ]);
    }

    protected function syncUsersWithWorkers(): int
    {
        $synced = 0;
        $users = User::all();

        foreach ($users as $u) {
            $worker = Worker::withTrashed()->where('user_id', $u->id)->first();
            if (!$worker) {
                $workerByName = Worker::withTrashed()->where('name', $u->name)->first();
                if ($workerByName) {
                    $workerByName->update(['user_id' => $u->id]);
                    $synced++;
                } else {
                    $lastWorker = Worker::withTrashed()->orderBy('id', 'desc')->first();
                    $nextId = $lastWorker ? ($lastWorker->id + 1) : 1;
                    $workerCode = 'PKR-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
                    while (Worker::withTrashed()->where('worker_code', $workerCode)->exists()) {
                        $nextId++;
                        $workerCode = 'PKR-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
                    }

                    $roleLower = strtolower($u->role ?? 'admin');
                    $isStaff = in_array($roleLower, ['owner', 'admin', 'finance']);
                    $process = match($roleLower) {
                        'owner' => 'Owner / Manajemen',
                        'admin' => 'Admin / Operasional',
                        'finance' => 'Finance / Kasir',
                        default => 'Produksi',
                    };

                    Worker::create([
                        'user_id' => $u->id,
                        'worker_code' => $workerCode,
                        'name' => $u->name,
                        'type' => $isStaff ? 'Staff' : 'Produksi',
                        'process' => $process,
                        'payment_system' => 'Bulanan',
                        'status' => 'Aktif',
                        'notes' => 'User sistem (' . ucfirst($u->role ?? 'Admin') . ')',
                    ]);
                    $synced++;
                }
            }
        }

        return $synced;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'process' => 'required|string|max:100',
            'payment_system' => 'required|in:Borongan,Harian,Bulanan',
            'default_salary' => 'nullable|numeric|min:0',
            'payroll_day' => 'nullable|string|in:Kamis,Sabtu',
            'status' => 'required|in:Aktif,Nonaktif',
            'notes' => 'nullable|string',
        ]);

        // Auto-generate worker_code (PKR-001, PKR-002, ...)
        $lastWorker = Worker::withTrashed()->orderBy('id', 'desc')->first();
        $nextId = $lastWorker ? ($lastWorker->id + 1) : 1;
        $workerCode = 'PKR-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
        while (Worker::withTrashed()->where('worker_code', $workerCode)->exists()) {
            $nextId++;
            $workerCode = 'PKR-' . str_pad($nextId, 3, '0', STR_PAD_LEFT);
        }

        $procRecord = ProductionProcess::where('process_name', $validated['process'])->first();
        $defaultDay = $procRecord?->payroll_day ?? (in_array($validated['process'], ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : 'Sabtu');

        // Jika pekerja bertipe Produksi, single source of truth jadwal payroll adalah Master Proses
        $payrollDay = $validated['type'] === 'Produksi' ? ($procRecord?->payroll_day ?? $defaultDay) : ($validated['payroll_day'] ?? null);

        $worker = Worker::create([
            'user_id' => $validated['user_id'] ?? null,
            'worker_code' => $workerCode,
            'name' => $validated['name'],
            'type' => $validated['type'],
            'process' => $validated['process'],
            'payment_system' => $validated['payment_system'],
            'default_salary' => $validated['default_salary'] ?? 0,
            'payroll_day' => $payrollDay,
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
            'user_id' => 'nullable|exists:users,id',
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:100',
            'process' => 'sometimes|required|string|max:100',
            'payment_system' => 'sometimes|required|in:Borongan,Harian,Bulanan',
            'default_salary' => 'nullable|numeric|min:0',
            'payroll_day' => 'nullable|string|in:Kamis,Sabtu',
            'status' => 'sometimes|required|in:Aktif,Nonaktif',
            'notes' => 'nullable|string',
        ]);

        // Auto-align payroll_day jika process diubah untuk pekerja Produksi
        $targetProcess = $validated['process'] ?? $worker->process;
        $targetType = $validated['type'] ?? $worker->type;
        if ($targetType === 'Produksi' && $targetProcess) {
            $procRecord = ProductionProcess::where('process_name', $targetProcess)->first();
            $standardDay = $procRecord?->payroll_day ?? (in_array($targetProcess, ['Potong', 'Jahit', 'Overdek', 'Kansay']) ? 'Kamis' : 'Sabtu');
            $validated['payroll_day'] = $validated['payroll_day'] ?? $standardDay;
        }

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

        // Check if worker already has transactions or payroll history
        if ($worker->dailyProductions()->exists() || $worker->monthlyPayrolls()->exists()) {
            // Keep history intact, soft delete only
            $worker->delete();
            return response()->json([
                'status' => 'success',
                'message' => 'Pekerja dinonaktifkan / diarsipkan untuk menjaga histori transaksi dan penggajian.',
            ]);
        }

        $worker->forceDelete();
        return response()->json([
            'status' => 'success',
            'message' => 'Pekerja berhasil dihapus.',
        ]);
    }
}
