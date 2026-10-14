<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_number',
        'type',
        'category',
        'title',
        'amount',
        'transaction_date',
        'reference',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'transaction_date' => 'date',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
