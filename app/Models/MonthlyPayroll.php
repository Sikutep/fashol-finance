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
        'basic_salary' => 'float',
        'allowance' => 'float',
        'overtime' => 'float',
        'deductions' => 'float',
        'total_salary' => 'float',
    ];

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }
}
