<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class AuthSecurityTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::where('email', 'marsaaljn200@gmail.com')->firstOrFail();

        $response = $this->postJson('/api/auth/login', [
            'email' => 'marsaaljn200@gmail.com',
            'password' => 'fashol123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'user' => [
                    'id' => $user->id,
                    'email' => 'marsaaljn200@gmail.com',
                    'role' => 'admin',
                ],
            ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_login_rejects_invalid_passwords_and_disallows_backdoor(): void
    {
        $user = User::where('email', 'atepriandipahmi@gmail.com')->firstOrFail();

        // Attempt login with wrong passwords (including old backdoor strings like admin123, password)
        $invalidPasswords = ['wrong_pass_123', 'admin123', 'password', 'root'];

        foreach ($invalidPasswords as $pwd) {
            $response = $this->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => $pwd,
            ]);

            $response->assertStatus(422)
                ->assertJson([
                    'status' => 'error',
                ]);

            $this->assertGuest();
        }
    }

    public function test_auth_me_returns_user_when_logged_in_and_unauthenticated_when_guest(): void
    {
        // When guest
        $resGuest = $this->getJson('/api/auth/me');
        $resGuest->assertStatus(200)
            ->assertJson([
                'status' => 'unauthenticated',
                'authenticated' => false,
                'user' => null,
            ]);

        // When authenticated
        $user = User::where('role', 'owner')->firstOrFail();
        $resAuth = $this->actingAs($user)->getJson('/api/auth/me');
        $resAuth->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'authenticated' => true,
                'user' => [
                    'id' => $user->id,
                    'role' => 'owner',
                ],
            ]);
    }

    public function test_logout_clears_session(): void
    {
        $user = User::firstOrFail();

        $response = $this->actingAs($user)->postJson('/api/auth/logout');
        $response->assertStatus(200)
            ->assertJson(['status' => 'success']);

        $this->assertGuest();
    }

    public function test_protected_routes_reject_unauthenticated_access(): void
    {
        $response = $this->getJson('/api/workers');
        $response->assertStatus(401);

        $responseDaily = $this->getJson('/api/daily-productions');
        $responseDaily->assertStatus(401);

        $responsePayroll = $this->getJson('/api/payroll-mingguan');
        $responsePayroll->assertStatus(401);

        $responseKeuangan = $this->getJson('/api/keuangan');
        $responseKeuangan->assertStatus(401);
    }
}
