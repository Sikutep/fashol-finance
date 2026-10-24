<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MonthlyPayroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_number',
        'worker_id',
        'staff_position_id',
        'worker_name',
        'position',
        'period',
        'basic_salary',
        'allowance',
        'overtime',
        'deductions',
        'total_salary',
        'status',
    ];

    protected $casts = [
        'worker_id' => 'integer',
        'staff_position_id' => 'integer',
        'basic_salary' => 'float',
        'allowance' => 'float',
        'overtime' => 'float',
        'deductions' => 'float',
        'total_salary' => 'float',
    ];

    public function worker()
    {
        return $this->belongsTo(Worker::class)->withTrashed();
    }

    public function staffPosition()
    {
        return $this->belongsTo(StaffPosition::class, 'staff_position_id');
    }
}
