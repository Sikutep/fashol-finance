<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyProduction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_number',
        'production_date',
        'worker_id',
        'process_name',
        'total_qty',
        'total_wage',
        'notes',
        'status',
        'created_by',
    ];

    protected $casts = [
        'production_date' => 'date',
        'total_qty' => 'integer',
        'total_wage' => 'float',
    ];

    public function worker()
    {
        return $this->belongsTo(Worker::class);
    }

    public function items()
    {
        return $this->hasMany(DailyProductionItem::class, 'daily_production_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
