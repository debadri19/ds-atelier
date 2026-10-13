<?php

declare(strict_types=1);

const DS_ATELIER_RESET_TTL_SECONDS = 3600;
const DS_ATELIER_AUTH_GENERIC_LOGIN = 'Invalid email, mobile number, or password.';
const DS_ATELIER_AUTH_GENERIC_FORGOT = 'If an account exists for that email, a reset link will be sent when email delivery is configured. No email was sent.';

function ds_atelier_customer_public(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'email' => (string) $row['email'],
        'mobile' => (string) $row['mobile'],
    ];
}

function ds_atelier_normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function ds_atelier_normalize_mobile(string $mobile): string
{
    $digits = preg_replace('/\D+/', '', $mobile) ?? '';
    if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
        $digits = substr($digits, 2);
    }
    return $digits;
}

function ds_atelier_valid_name(string $name): bool
{
    $name = trim($name);
    return mb_strlen($name) >= 2 && mb_strlen($name) <= 120;
}

function ds_atelier_valid_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false && strlen($email) <= 255;
}

function ds_atelier_valid_mobile(string $mobile): bool
{
    return (bool) preg_match('/^[6-9]\d{9}$/', $mobile);
}

function ds_atelier_valid_password(string $password): bool
{
    return strlen($password) >= 8 && strlen($password) <= 255;
}

function ds_atelier_find_customer_by_email(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, email, mobile, password_hash FROM customers WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_find_customer_by_mobile(PDO $pdo, string $mobile): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, email, mobile, password_hash FROM customers WHERE mobile = ? LIMIT 1');
    $stmt->execute([$mobile]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_find_customer_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, email, mobile, password_hash FROM customers WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_customer_session_set(array $customer, bool $remember): void
{
    ds_atelier_session_regenerate();
    $_SESSION['_ds_atelier_customer_id'] = (int) $customer['id'];
    $_SESSION['_ds_atelier_customer_remember'] = $remember;
}

function ds_atelier_customer_session_clear(): void
{
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember']);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}

function ds_atelier_customer_from_session(PDO $pdo): ?array
{
    $id = $_SESSION['_ds_atelier_customer_id'] ?? null;
    if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
        return null;
    }
    return ds_atelier_find_customer_by_id($pdo, (int) $id);
}

function ds_atelier_register_customer(PDO $pdo, array $input): array
{
    $name = trim((string) ($input['name'] ?? ''));
    $email = ds_atelier_normalize_email((string) ($input['email'] ?? ''));
    $mobile = ds_atelier_normalize_mobile((string) ($input['mobile'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $confirm = (string) ($input['confirm'] ?? '');
    $terms = !empty($input['terms']);

    $fieldErrors = [];
    if (!ds_atelier_valid_name($name)) {
        $fieldErrors['name'] = 'Enter your full name.';
    }
    if ($email === '') {
        $fieldErrors['email'] = 'Enter your email.';
    } elseif (!ds_atelier_valid_email($email)) {
        $fieldErrors['email'] = 'Enter a valid email address.';
    }
    if ($mobile === '') {
        $fieldErrors['mobile'] = 'Enter your mobile number.';
    } elseif (!ds_atelier_valid_mobile($mobile)) {
        $fieldErrors['mobile'] = 'Enter a valid 10-digit mobile number.';
    }
    if (!ds_atelier_valid_password($password)) {
        $fieldErrors['password'] = 'Password must be at least 8 characters.';
    }
    if ($confirm === '') {
        $fieldErrors['confirm'] = 'Confirm your password.';
    } elseif ($password !== $confirm) {
        $fieldErrors['confirm'] = 'Passwords do not match.';
    }
    if (!$terms) {
        $fieldErrors['terms'] = 'Please agree to the terms to continue.';
    }

    if ($fieldErrors !== []) {
        return ['ok' => false, 'error' => 'Check the highlighted fields and try again.', 'fields' => $fieldErrors, 'code' => 422];
    }

    if (ds_atelier_find_customer_by_email($pdo, $email)) {
        return ['ok' => false, 'error' => 'An account with this email already exists.', 'fields' => ['email' => 'An account with this email already exists.'], 'code' => 409];
    }
    if (ds_atelier_find_customer_by_mobile($pdo, $mobile)) {
        return ['ok' => false, 'error' => 'An account with this mobile number already exists.', 'fields' => ['mobile' => 'An account with this mobile number already exists.'], 'code' => 409];
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === '') {
        return ['ok' => false, 'error' => 'Unable to create the account. Please try again later.', 'code' => 500];
    }

    try {
        $stmt = $pdo->prepare('INSERT INTO customers (name, email, mobile, password_hash) VALUES (?, ?, ?, ?)');
        $stmt->execute([$name, $email, $mobile, $hash]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            return ['ok' => false, 'error' => 'An account with this email or mobile number already exists.', 'code' => 409];
        }
        throw $e;
    }
    $id = (int) $pdo->lastInsertId();
    $customer = ds_atelier_find_customer_by_id($pdo, $id);
    if ($customer === null) {
        return ['ok' => false, 'error' => 'Unable to create the account. Please try again later.', 'code' => 500];
    }

    ds_atelier_customer_session_set($customer, true);
    return ['ok' => true, 'customer' => ds_atelier_customer_public($customer), 'code' => 201];
}

function ds_atelier_login_customer(PDO $pdo, array $input): array
{
    $identifier = trim((string) ($input['identifier'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $remember = !empty($input['remember']);
    $fieldErrors = [];

    $asEmail = str_contains($identifier, '@');
    $mobile = ds_atelier_normalize_mobile($identifier);

    if ($identifier === '') {
        $fieldErrors['identifier'] = 'Enter your email or mobile number.';
    } elseif ($asEmail) {
        $identifier = ds_atelier_normalize_email($identifier);
        if (!ds_atelier_valid_email($identifier)) {
            $fieldErrors['identifier'] = 'Enter a valid email address.';
        }
    } elseif (!ds_atelier_valid_mobile($mobile)) {
        $fieldErrors['identifier'] = 'Enter a valid email or 10-digit mobile number.';
    }

    if ($password === '') {
        $fieldErrors['password'] = 'Enter your password.';
    } elseif (strlen($password) < 8) {
        $fieldErrors['password'] = 'Password must be at least 8 characters.';
    }

    if ($fieldErrors !== []) {
        return ['ok' => false, 'error' => 'Check the highlighted fields and try again.', 'fields' => $fieldErrors, 'code' => 422];
    }

    $customer = $asEmail
        ? ds_atelier_find_customer_by_email($pdo, $identifier)
        : ds_atelier_find_customer_by_mobile($pdo, $mobile);

    if ($customer === null || !password_verify($password, (string) $customer['password_hash'])) {
        return ['ok' => false, 'error' => DS_ATELIER_AUTH_GENERIC_LOGIN, 'code' => 401];
    }

    ds_atelier_customer_session_set($customer, $remember);
    return ['ok' => true, 'customer' => ds_atelier_customer_public($customer), 'code' => 200];
}

function ds_atelier_create_password_reset(PDO $pdo, string $email): array
{
    $email = ds_atelier_normalize_email($email);
    $generic = ['ok' => true, 'message' => DS_ATELIER_AUTH_GENERIC_FORGOT, 'issued' => false, 'email_sent' => false, 'code' => 200];

    if (!ds_atelier_valid_email($email)) {
        return ['ok' => false, 'error' => 'Enter a valid email address.', 'fields' => ['email' => 'Enter a valid email address.'], 'code' => 422];
    }

    $customer = ds_atelier_find_customer_by_email($pdo, $email);
    if ($customer === null) {
        return $generic;
    }

    $raw = bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $expires = (new DateTimeImmutable('now'))->modify('+' . DS_ATELIER_RESET_TTL_SECONDS . ' seconds')->format('Y-m-d H:i:s');

    $pdo->prepare('UPDATE customer_password_resets SET used_at = COALESCE(used_at, NOW()) WHERE customer_id = ? AND used_at IS NULL')
        ->execute([(int) $customer['id']]);

    $stmt = $pdo->prepare('INSERT INTO customer_password_resets (customer_id, token_hash, expires_at) VALUES (?, ?, ?)');
    $stmt->execute([(int) $customer['id'], $hash, $expires]);

    return [
        'ok' => true,
        'message' => DS_ATELIER_AUTH_GENERIC_FORGOT,
        'issued' => true,
        'email_sent' => false,
        'code' => 200,
        'token' => $raw,
        'email' => $email,
    ];
}

function ds_atelier_reset_password(PDO $pdo, array $input): array
{
    $token = trim((string) ($input['token'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $confirm = (string) ($input['confirm'] ?? '');
    $fieldErrors = [];

    if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired.', 'code' => 400];
    }
    if (!ds_atelier_valid_password($password)) {
        $fieldErrors['password'] = 'Password must be at least 8 characters.';
    }
    if ($confirm === '') {
        $fieldErrors['confirm'] = 'Confirm your new password.';
    } elseif ($password !== $confirm) {
        $fieldErrors['confirm'] = 'Passwords do not match.';
    }
    if ($fieldErrors !== []) {
        return ['ok' => false, 'error' => 'Check the highlighted fields and try again.', 'fields' => $fieldErrors, 'code' => 422];
    }

    $hash = hash('sha256', $token);
    $stmt = $pdo->prepare(
        'SELECT id, customer_id, expires_at, used_at FROM customer_password_resets WHERE token_hash = ? LIMIT 1'
    );
    $stmt->execute([$hash]);
    $row = $stmt->fetch();
    if (!$row) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired.', 'code' => 400];
    }
    if ($row['used_at'] !== null) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired.', 'code' => 400];
    }
    if (strtotime((string) $row['expires_at']) < time()) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired.', 'code' => 400];
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($passwordHash) || $passwordHash === '') {
        return ['ok' => false, 'error' => 'Unable to update the password. Please try again later.', 'code' => 500];
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE customers SET password_hash = ? WHERE id = ?')
            ->execute([$passwordHash, (int) $row['customer_id']]);
        $pdo->prepare('UPDATE customer_password_resets SET used_at = NOW() WHERE id = ?')
            ->execute([(int) $row['id']]);
        $pdo->prepare('UPDATE customer_password_resets SET used_at = COALESCE(used_at, NOW()) WHERE customer_id = ? AND used_at IS NULL')
            ->execute([(int) $row['customer_id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    ds_atelier_customer_session_clear();
    return ['ok' => true, 'message' => 'Password updated. You can sign in with your new password.', 'code' => 200];
}
