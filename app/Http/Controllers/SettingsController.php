<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ProductionProcess;
use App\Models\Worker;
use App\Models\FinanceCategory;
use App\Models\StaffPosition;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    // ==========================================
    // 1. MAPPING SIKLUS PAYROLL (KAMIS VS SABTU)
    // ==========================================

    public function getPayrollCycles(Request $request)
    {
        // Optimized: Single aggregation query to prevent N+1 queries
        $workerCounts = Worker::select('process', DB::raw('count(*) as total'))
            ->whereNotNull('process')
            ->groupBy('process')
            ->pluck('total', 'process');

        $processes = ProductionProcess::orderBy('payroll_day', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($p) use ($workerCounts) {
                $workerCount = $workerCounts[$p->process_name] ?? 0;
                return [
                    'id' => $p->id,
                    'process_code' => $p->process_code,
                    'process_name' => $p->process_name,
                    'process' => $p->process_name,
                    'payroll_day' => $p->payroll_day ?: 'Kamis',
                    'cycle_day' => $p->payroll_day ?: 'Kamis',
                    'default_rate' => (float) $p->default_rate,
                    'formatted_rate' => 'Rp ' . number_format($p->default_rate, 0, ',', '.'),
                    'unit' => $p->unit,
                    'is_active' => (bool) $p->is_active,
                    'worker_count' => $workerCount,
                    'active_workers_count' => $workerCount,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $processes,
            'summary' => [
                'total_processes' => $processes->count(),
                'kamis_count' => $processes->where('payroll_day', 'Kamis')->count(),
                'sabtu_count' => $processes->where('payroll_day', 'Sabtu')->count(),
            ]
        ]);
    }

    public function updatePayrollCycle(Request $request)
    {
        $validated = $request->validate([
            'process_id' => 'nullable|exists:production_processes,id',
            'process' => 'nullable|string',
            'process_name' => 'nullable|string',
            'cycle_day' => 'nullable|in:Kamis,Sabtu',
            'payroll_day' => 'nullable|in:Kamis,Sabtu',
            'sync_workers' => 'nullable|boolean',
        ]);

        $procName = $validated['process_name'] ?? $validated['process'] ?? null;
        $targetDay = $validated['payroll_day'] ?? $validated['cycle_day'] ?? 'Kamis';

        if (!empty($validated['process_id'])) {
            $proc = ProductionProcess::findOrFail($validated['process_id']);
        } elseif ($procName) {
            $proc = ProductionProcess::where('process_name', $procName)->firstOrFail();
        } else {
            return response()->json(['status' => 'error', 'message' => 'Proses tidak valid.'], 422);
        }

        $oldDay = $proc->payroll_day;
        $proc->update(['payroll_day' => $targetDay]);

        $syncedWorkers = 0;
        if ($request->input('sync_workers', true)) {
            $syncedWorkers = Worker::where('process', $proc->process_name)
                ->where('type', 'Produksi')
                ->update(['payroll_day' => $targetDay]);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Proses {$proc->process_name} berhasil dialihkan dari {$oldDay} ke siklus {$targetDay} ({$syncedWorkers} pekerja tersinkron).",
            'data' => $proc,
        ]);
    }

    // ==========================================
    // 2. KELOLA KATEGORI KEUANGAN (CHART OF ACCOUNTS)
    // ==========================================

    public function getFinanceCategories(Request $request)
    {
        $query = FinanceCategory::query();

        if ($request->filled('group') && $request->group !== 'all') {
            $query->where('group', $request->group);
        }

        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }

        $categories = $query->orderBy('group', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
            'grouped' => [
                'income' => $categories->where('group', 'income')->values(),
                'deductions' => $categories->where('group', 'deductions')->values(),
                'cogs' => $categories->where('group', 'cogs')->values(),
                'operating_expenses' => $categories->where('group', 'operating_expenses')->values(),
                'non_operating_expenses' => $categories->where('group', 'non_operating_expenses')->values(),
            ],
            'summary' => [
                'total_categories' => $categories->count(),
                'active_categories' => $categories->where('is_active', true)->count(),
            ]
        ]);
    }

    public function storeFinanceCategory(Request $request)
    {
        $id = $request->input('id');

        $validated = $request->validate([
            'id' => 'nullable|exists:finance_categories,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('finance_categories', 'name')->ignore($id),
            ],
            'code' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('finance_categories', 'code')->ignore($id),
            ],
            'group' => 'required|in:income,deduction,deductions,cogs,operating_expense,operating_expenses,non_operating,non_operating_expenses',
            'cost_type' => 'nullable|in:material,service,repair,overhead,general_operating',
            'is_active' => 'nullable|boolean',
        ]);

        $group = match ($validated['group']) {
            'deduction' => 'deductions',
            'operating_expense' => 'operating_expenses',
            'non_operating' => 'non_operating_expenses',
            default => $validated['group'],
        };

        if (!empty($validated['id'])) {
            $cat = FinanceCategory::findOrFail($validated['id']);
            $cat->update([
                'name' => $validated['name'],
                'code' => $validated['code'] ?? $cat->code,
                'group' => $group,
                'cost_type' => $validated['cost_type'] ?? $cat->cost_type,
                'is_active' => $request->has('is_active') ? $validated['is_active'] : $cat->is_active,
            ]);
            $msg = "Kategori keuangan '{$cat->name}' berhasil diperbarui.";
        } else {
            $code = $validated['code'] ?? null;
            if (!$code) {
                $prefixMap = [
                    'income' => 'INC',
                    'deductions' => 'DED',
                    'cogs' => 'COG',
                    'operating_expenses' => 'OP',
                    'non_operating_expenses' => 'NOP',
                ];
                $p = $prefixMap[$group] ?? 'CAT';
                $count = FinanceCategory::where('group', $group)->count() + 1;
                $code = $p . '-' . str_pad($count, 2, '0', STR_PAD_LEFT);
                while (FinanceCategory::where('code', $code)->exists()) {
                    $count++;
                    $code = $p . '-' . str_pad($count, 2, '0', STR_PAD_LEFT);
                }
            }

            $cat = FinanceCategory::create([
                'code' => $code,
                'name' => $validated['name'],
                'group' => $group,
                'cost_type' => $validated['cost_type'] ?? ($group === 'operating_expenses' ? 'general_operating' : null),
                'is_active' => $validated['is_active'] ?? true,
                'is_default' => false,
            ]);
            $msg = "Kategori keuangan baru '{$cat->name}' berhasil ditambahkan.";
        }

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'data' => $cat,
        ]);
    }

    public function toggleFinanceCategoryStatus(Request $request, $id)
    {
        $cat = FinanceCategory::findOrFail($id);

        // Core system categories protection
        if ($cat->is_default && in_array($cat->name, ['Penjualan Produk', 'Harga Pokok Penjualan'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Kategori inti sistem '{$cat->name}' tidak boleh dinonaktifkan demi integritas Laporan Laba Rugi.",
            ], 422);
        }

        $cat->update(['is_active' => !$cat->is_active]);

        $stText = $cat->is_active ? 'diaktifkan' : 'dinonaktifkan';
        return response()->json([
            'status' => 'success',
            'message' => "Kategori '{$cat->name}' berhasil {$stText}.",
            'data' => $cat,
        ]);
    }

    // ==========================================
    // 3. KELOLA JABATAN STAF KANTOR
    // ==========================================

    public function getStaffPositions(Request $request)
    {
        $positions = StaffPosition::withCount('workers')->orderBy('id', 'asc')->get();
        $positions->each(function ($p) {
            $p->worker_count = $p->workers_count;
        });

        return response()->json([
            'status' => 'success',
            'data' => $positions,
        ]);
    }

    public function storeStaffPosition(Request $request)
    {
        $id = $request->input('id');

        $validated = $request->validate([
            'id' => 'nullable|exists:staff_positions,id',
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('staff_positions', 'name')->ignore($id),
            ],
            'department' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['id'])) {
            $pos = StaffPosition::findOrFail($validated['id']);
            $oldName = $pos->name;
            $pos->update([
                'name' => $validated['name'],
                'department' => $validated['department'] ?? $pos->department,
                'is_active' => $request->has('is_active') ? $validated['is_active'] : $pos->is_active,
            ]);

            // Sync all workers linked to this position if name changed
            if ($oldName !== $pos->name) {
                Worker::where('staff_position_id', $pos->id)
                    ->orWhere('process', $oldName)
                    ->update([
                        'process' => $pos->name,
                        'staff_position_id' => $pos->id,
                    ]);
            }

            $msg = "Jabatan '{$pos->name}' berhasil diperbarui.";
        } else {
            $pos = StaffPosition::create([
                'name' => $validated['name'],
                'department' => $validated['department'] ?? 'Operasional',
                'is_active' => $validated['is_active'] ?? true,
            ]);
            $msg = "Jabatan baru '{$pos->name}' berhasil ditambahkan.";
        }

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'data' => $pos,
        ]);
    }

    public function deleteStaffPosition($id)
    {
        $pos = StaffPosition::findOrFail($id);
        $name = $pos->name;

        // Check if any worker is currently using this position via foreign key or legacy process name
        $workerCount = Worker::where('staff_position_id', $pos->id)
            ->orWhere('process', $name)
            ->count();

        if ($workerCount > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Jabatan '{$name}' tidak dapat dihapus karena masih digunakan oleh {$workerCount} pekerja aktif. Silakan ubah jabatan pekerja terlebih dahulu.",
            ], 422);
        }

        $pos->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Jabatan '{$name}' berhasil dihapus.",
        ]);
    }
}
