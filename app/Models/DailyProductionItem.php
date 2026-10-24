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
        'product_group_id',
        'product_name',
        'variation',
        'color',
        'qty',
        'rate',
        'total_wage',
    ];

    protected $casts = [
        'daily_production_id' => 'integer',
        'product_id' => 'integer',
        'product_group_id' => 'integer',
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
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function productGroup()
    {
        return $this->belongsTo(ProductGroup::class, 'product_group_id');
    }
}
