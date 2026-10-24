<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'group',
        'cost_type',
        'is_active',
        'is_default',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    public function transactions()
    {
        return $this->hasMany(FinanceTransaction::class, 'category_id');
    }
}
