<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sku',
        'name',
        'variation',
        'unit',
        'current_stock',
        'status',
        'category',
        'min_stock',
        'description',
        'product_group_id',
        'image',
    ];

    public function productGroup()
    {
        return $this->belongsTo(ProductGroup::class);
    }
}
