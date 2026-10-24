<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductProcessRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_name',
        'product_group_id',
        'production_process_id',
        'process_name',
        'rate',
        'is_custom_rate',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'product_group_id' => 'integer',
        'production_process_id' => 'integer',
        'rate' => 'float',
        'is_custom_rate' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function productGroup()
    {
        return $this->belongsTo(ProductGroup::class);
    }

    public function productionProcess()
    {
        return $this->belongsTo(ProductionProcess::class, 'production_process_id');
    }

    protected static function booted(): void
    {
        static::saved(function ($rate) {
            static::syncHppLaborCost($rate->product_name);
        });

        static::deleted(function ($rate) {
            static::syncHppLaborCost($rate->product_name);
        });
    }

    public static function syncHppLaborCost(?string $productName): void
    {
        if (empty($productName)) {
            return;
        }

        $hpp = ProductHppComponent::where('product_name', $productName)->first();
        if (!$hpp) {
            return;
        }

        $laborCost = (float) static::where('product_name', $productName)
            ->where('is_active', true)
            ->sum('rate');

        $totalHpp = (float) $hpp->material_cost + $laborCost + (float) $hpp->overhead_cost;

        $hpp->update([
            'labor_cost' => $laborCost,
            'total_hpp' => $totalHpp,
        ]);
    }
}
