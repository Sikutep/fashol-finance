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
        'process_name',
        'rate',
        'unit',
        'is_active',
    ];

    protected $casts = [
        'rate' => 'float',
        'is_active' => 'boolean',
    ];

    public function productGroup()
    {
        return $this->belongsTo(ProductGroup::class);
    }
}
