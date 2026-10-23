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
        'payment_system',
        'default_salary',
        'status',
        'notes',
    ];

    protected $casts = [
        'default_salary' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
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
