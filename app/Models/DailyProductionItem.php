<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyProductionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'daily_production_id',
        'product_id',
        'product_name',
        'variation',
        'color',
        'qty',
        'rate',
        'total_wage',
    ];

    protected $casts = [
        'qty' => 'integer',
        'rate' => 'float',
        'total_wage' => 'float',
    ];

    public function dailyProduction()
    {
        return $this->belongsTo(DailyProduction::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
