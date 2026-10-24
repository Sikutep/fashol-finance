<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionProcess extends Model
{
    use HasFactory;

    protected $fillable = [
        'process_code',
        'process_name',
        'description',
        'default_rate',
        'unit',
        'payroll_day',
        'is_active',
    ];

    protected $casts = [
        'default_rate' => 'float',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'formatted_default_rate',
    ];

    public function getFormattedDefaultRateAttribute(): string
    {
        return 'Rp ' . number_format($this->default_rate ?? 0, 0, ',', '.');
    }

    public function productRates()
    {
        return $this->hasMany(ProductProcessRate::class, 'process_name', 'process_name');
    }
}
