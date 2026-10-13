<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

require_once dirname(__DIR__) . '/src/bootstrap.php';

$pass = 0;
$fail = 0;
$skip = 0;
$testIds = [];

function ds_test(string $name, bool $ok): void
{
    global $pass, $fail;
    if ($ok) {
        $pass++;
        fwrite(STDOUT, "PASS  $name\n");
        return;
    }
    $fail++;
    fwrite(STDOUT, "FAIL  $name\n");
}

function ds_skip(string $name, string $reason): void
{
    global $skip;
    $skip++;
    fwrite(STDOUT, "SKIP  $name ($reason)\n");
}

function ds_cleanup(PDO $pdo, array $ids): void
{
    if ($ids === []) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $pdo->prepare("UPDATE customer_password_resets SET used_at = COALESCE(used_at, NOW()) WHERE customer_id IN ($placeholders)")
        ->execute($ids);
    $pdo->prepare("DELETE FROM customer_password_resets WHERE customer_id IN ($placeholders)")
        ->execute($ids);
    $pdo->prepare("DELETE FROM customers WHERE id IN ($placeholders)")
        ->execute($ids);
}

try {
    $config = ds_atelier_bootstrap();
} catch (Throwable $e) {
    fwrite(STDERR, "Configuration failed.\n");
    exit(1);
}

if ($config['db']['name'] !== 'ds_atelier_dev') {
    fwrite(STDERR, "Refusing to run tests against a non-dev database.\n");
    exit(1);
}

if (preg_match('/moonaura/i', $config['db']['name']) === 1) {
    fwrite(STDERR, "MoonAura databases are not allowed.\n");
    exit(1);
}

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_skip('live PDO customer auth', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
$suffix = bin2hex(random_bytes(4));
$email = "phase2.{$suffix}@example.test";
$mobile = '9' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
$password = 'Phase2pass!';
$stamp = date('YmdHis');
$name = "Phase Two {$stamp}";

try {
    $missing = ds_atelier_register_customer($pdo, [
        'name' => '',
        'email' => '',
        'mobile' => '',
        'password' => '',
        'confirm' => '',
        'terms' => false,
    ]);
    ds_test('register rejects empty fields', ($missing['ok'] ?? true) === false && (int) ($missing['code'] ?? 0) === 422);

    $registered = ds_atelier_register_customer($pdo, [
        'name' => $name,
        'email' => strtoupper($email),
        'mobile' => '+91 ' . $mobile,
        'password' => $password,
        'confirm' => $password,
        'terms' => true,
    ]);
    ds_test('register succeeds', ($registered['ok'] ?? false) === true && (int) ($registered['code'] ?? 0) === 201);
    ds_test('register returns public customer fields', isset($registered['customer']['id'], $registered['customer']['email']) && !isset($registered['customer']['password_hash']));

    $customerId = (int) ($registered['customer']['id'] ?? 0);
    if ($customerId > 0) {
        $testIds[] = $customerId;
    }

    $row = ds_atelier_find_customer_by_email($pdo, $email);
    ds_test('email is stored normalized lowercase', is_array($row) && $row['email'] === strtolower($email));
    ds_test('password is hashed not stored plaintext', is_array($row) && $row['password_hash'] !== $password && password_verify($password, (string) $row['password_hash']));
    ds_test('mobile is stored as 10 digits', is_array($row) && $row['mobile'] === $mobile);

    $dupEmail = ds_atelier_register_customer($pdo, [
        'name' => $name,
        'email' => $email,
        'mobile' => '8' . substr($mobile, 1),
        'password' => $password,
        'confirm' => $password,
        'terms' => true,
    ]);
    ds_test('duplicate email is rejected', ($dupEmail['ok'] ?? true) === false && (int) ($dupEmail['code'] ?? 0) === 409);

    $dupMobile = ds_atelier_register_customer($pdo, [
        'name' => $name,
        'email' => "other.{$suffix}@example.test",
        'mobile' => $mobile,
        'password' => $password,
        'confirm' => $password,
        'terms' => true,
    ]);
    ds_test('duplicate mobile is rejected', ($dupMobile['ok'] ?? true) === false && (int) ($dupMobile['code'] ?? 0) === 409);

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $_SESSION = [];
    $loginBad = ds_atelier_login_customer($pdo, [
        'identifier' => $email,
        'password' => 'wrong-password',
        'remember' => false,
    ]);
    ds_test('wrong password uses generic error', ($loginBad['ok'] ?? true) === false && ($loginBad['error'] ?? '') === DS_ATELIER_AUTH_GENERIC_LOGIN);

    $loginMissing = ds_atelier_login_customer($pdo, [
        'identifier' => "missing.{$suffix}@example.test",
        'password' => $password,
        'remember' => false,
    ]);
    ds_test('unknown account uses the same generic error', ($loginMissing['error'] ?? '') === DS_ATELIER_AUTH_GENERIC_LOGIN);

    $_SESSION = [];
    $beforeId = session_id();
    $loginOk = ds_atelier_login_customer($pdo, [
        'identifier' => $email,
        'password' => $password,
        'remember' => true,
    ]);
    ds_test('login with email succeeds', ($loginOk['ok'] ?? false) === true);
    ds_test('login regenerates session', session_id() !== $beforeId && session_id() !== '');
    ds_test('login stores customer id in session', (int) ($_SESSION['_ds_atelier_customer_id'] ?? 0) === $customerId);

    $_SESSION = [];
    $loginMobile = ds_atelier_login_customer($pdo, [
        'identifier' => $mobile,
        'password' => $password,
        'remember' => false,
    ]);
    ds_test('login with mobile succeeds', ($loginMobile['ok'] ?? false) === true);

    $forgotUnknown = ds_atelier_create_password_reset($pdo, "missing.{$suffix}@example.test");
    ds_test('forgot unknown email is generic success', ($forgotUnknown['ok'] ?? false) === true && ($forgotUnknown['issued'] ?? true) === false);
    ds_test('forgot does not claim email was sent', ($forgotUnknown['email_sent'] ?? true) === false);

    $forgot = ds_atelier_create_password_reset($pdo, $email);
    ds_test('forgot known email issues a token internally', ($forgot['ok'] ?? false) === true && ($forgot['issued'] ?? false) === true && isset($forgot['token']));
    ds_test('forgot public message does not claim delivery', str_contains((string) ($forgot['message'] ?? ''), 'No email was sent'));
    $rawToken = (string) ($forgot['token'] ?? '');
    ds_test('reset token is 64 hex chars', (bool) preg_match('/^[a-f0-9]{64}$/', $rawToken));

    $stored = $pdo->prepare('SELECT token_hash, used_at, expires_at FROM customer_password_resets WHERE customer_id = ? ORDER BY id DESC LIMIT 1');
    $stored->execute([$customerId]);
    $resetRow = $stored->fetch();
    ds_test('reset stores SHA-256 hash not raw token', is_array($resetRow) && $resetRow['token_hash'] === hash('sha256', $rawToken) && $resetRow['token_hash'] !== $rawToken);
    ds_test('reset token is unused and expiring', is_array($resetRow) && $resetRow['used_at'] === null && strtotime((string) $resetRow['expires_at']) > time());

    $tampered = ds_atelier_reset_password($pdo, [
        'token' => str_repeat('ab', 32),
        'password' => 'NewPhase2pass!',
        'confirm' => 'NewPhase2pass!',
    ]);
    ds_test('tampered reset token is rejected', ($tampered['ok'] ?? true) === false && (int) ($tampered['code'] ?? 0) === 400);

    $newPassword = 'NewPhase2pass!';
    $resetOk = ds_atelier_reset_password($pdo, [
        'token' => $rawToken,
        'password' => $newPassword,
        'confirm' => $newPassword,
    ]);
    ds_test('valid reset updates the password', ($resetOk['ok'] ?? false) === true);

    $reused = ds_atelier_reset_password($pdo, [
        'token' => $rawToken,
        'password' => 'AnotherPhase2!',
        'confirm' => 'AnotherPhase2!',
    ]);
    ds_test('reset token is single-use', ($reused['ok'] ?? true) === false);

    $oldLogin = ds_atelier_login_customer($pdo, [
        'identifier' => $email,
        'password' => $password,
        'remember' => false,
    ]);
    ds_test('old password fails after reset', ($oldLogin['ok'] ?? true) === false);

    $newLogin = ds_atelier_login_customer($pdo, [
        'identifier' => $email,
        'password' => $newPassword,
        'remember' => false,
    ]);
    ds_test('new password succeeds after reset', ($newLogin['ok'] ?? false) === true);

    $pdo->prepare('INSERT INTO customer_password_resets (customer_id, token_hash, expires_at, used_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL)')
        ->execute([$customerId, hash('sha256', str_repeat('cd', 32))]);
    $expired = ds_atelier_reset_password($pdo, [
        'token' => str_repeat('cd', 32),
        'password' => 'ExpiredPass1',
        'confirm' => 'ExpiredPass1',
    ]);
    ds_test('expired reset token is rejected', ($expired['ok'] ?? true) === false && (int) ($expired['code'] ?? 0) === 400);

    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    $_SESSION = [];
    $csrf = ds_atelier_csrf_token();
    ds_test('CSRF token issued for customer session', is_string($csrf) && strlen($csrf) >= 32);
    ds_test('CSRF rejects missing token', ds_atelier_csrf_validate(null) === false);
    ds_test('CSRF rejects tampered token', ds_atelier_csrf_validate($csrf . 'x') === false);
    ds_test('CSRF accepts matching token', ds_atelier_csrf_validate($csrf) === true);

    $public = ds_atelier_public_payload([
        'ok' => true,
        'message' => 'x',
        'code' => 200,
        'token' => $rawToken,
        'issued' => true,
        'email' => $email,
        'email_sent' => false,
    ]);
    ds_test(
        'public JSON strips reset token',
        !isset($public['token'], $public['issued'], $public['email'], $public['code']) && ($public['email_sent'] ?? null) === false
    );
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_cleanup($pdo, array_values(array_unique(array_filter($testIds))));
}

fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
exit($fail === 0 ? 0 : 1);
