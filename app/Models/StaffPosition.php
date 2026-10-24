<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffPosition extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'department',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function workers()
    {
        return $this->hasMany(Worker::class, 'staff_position_id');
    }

    public function monthlyPayrolls()
    {
        return $this->hasMany(MonthlyPayroll::class, 'staff_position_id');
    }
}
