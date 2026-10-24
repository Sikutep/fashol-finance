<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'long_name',
        'description',
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function rates()
    {
        return $this->hasMany(ProductProcessRate::class);
    }

    public function hppComponent()
    {
        return $this->hasOne(ProductHppComponent::class, 'product_group_id');
    }

    public function dailyProductionItems()
    {
        return $this->hasMany(DailyProductionItem::class, 'product_group_id');
    }
}
