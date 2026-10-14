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
        'status',
        'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function dailyProductions()
    {
        return $this->hasMany(DailyProduction::class);
    }
}
