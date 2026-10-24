<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductHppComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_group_id',
        'product_name',
        'product_code',
        'code',
        'material_cost',
        'labor_cost',
        'overhead_cost',
        'total_hpp',
        'effective_date',
        'status',
    ];

    protected $casts = [
        'product_group_id' => 'integer',
        'material_cost' => 'float',
        'labor_cost' => 'float',
        'overhead_cost' => 'float',
        'total_hpp' => 'float',
        'effective_date' => 'date',
    ];

    public function productGroup()
    {
        return $this->belongsTo(ProductGroup::class, 'product_group_id');
    }
}
