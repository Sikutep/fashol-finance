<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Worker extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'worker_code',
        'name',
        'type',
        'process',
        'staff_position_id',
        'production_process_id',
        'payment_system',
        'default_salary',
        'payroll_day',
        'status',
        'notes',
    ];

    protected $casts = [
        'default_salary' => 'float',
        'staff_position_id' => 'integer',
        'production_process_id' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function staffPosition()
    {
        return $this->belongsTo(StaffPosition::class, 'staff_position_id');
    }

    public function productionProcess()
    {
        return $this->belongsTo(ProductionProcess::class, 'production_process_id');
    }

    public function dailyProductions()
    {
        return $this->hasMany(DailyProduction::class);
    }

    public function monthlyPayrolls()
    {
        return $this->hasMany(MonthlyPayroll::class);
    }
}
