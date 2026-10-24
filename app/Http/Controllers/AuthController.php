<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    public function me(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'status' => 'unauthenticated',
                'authenticated' => false,
                'user' => null,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'authenticated' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'admin',
            ],
        ]);
    }

    public function login(Request $request)
    {
        $input = $request->input('email') ?? $request->input('login') ?? $request->input('username');
        $password = $request->input('password');

        if (!$input || !$password) {
            return response()->json([
                'status' => 'error',
                'message' => 'Alamat email atau nama pengguna dan kata sandi wajib diisi.',
            ], 422);
        }

        $user = null;
        if (filter_var($input, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $input)->first();
        } else {
            // Mendukung login mudah bagi pengguna awam: cukup ketik 'admin' atau 'owner'
            $clean = strtolower(trim($input));
            $user = User::where('email', $clean . '@fashol.com')
                ->orWhere('role', $clean)
                ->orWhere('name', 'like', "%{$input}%")
                ->first();
        }

        if ($user && Hash::check($password, $user->password)) {
            Auth::login($user);
            $request->session()->regenerate();

            return response()->json([
                'status' => 'success',
                'message' => 'Login berhasil. Selamat datang kembali, ' . $user->name,
                'csrf_token' => csrf_token(),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? 'admin',
                ],
            ]);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Email / nama pengguna atau kata sandi yang Anda masukkan tidak sesuai.',
        ], 422);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'status' => 'success',
            'message' => 'Berhasil logout dari sistem.',
        ]);
    }
}
