<?php

declare(strict_types=1);

const DS_ATELIER_ADMIN_RESET_TTL_SECONDS = 3600;
const DS_ATELIER_ADMIN_GENERIC_LOGIN = 'Invalid email, username, or password.';
const DS_ATELIER_ADMIN_GENERIC_FORGOT = 'If an admin account exists for that email, a reset link will be sent when email delivery is configured. No email was sent.';
const DS_ATELIER_MAIL_EVENT_ADMIN_PASSWORD_RESET = 'admin_password_reset';

function ds_atelier_admin_missing_table(PDOException $e): bool
{
    $code = (string) $e->getCode();
    if ($code === '42S02' || $code === '42S22') {
        return true;
    }
    $message = strtolower($e->getMessage());
    return str_contains($message, "doesn't exist") || str_contains($message, 'unknown table');
}

function ds_atelier_admin_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM admins LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_admin_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_admin_reset_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM admin_password_resets LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_admin_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_admin_public(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'email' => (string) $row['email'],
        'username' => (string) $row['username'],
    ];
}

function ds_atelier_normalize_username(string $username): string
{
    return strtolower(trim($username));
}

function ds_atelier_valid_username(string $username): bool
{
    return (bool) preg_match('/^[a-z0-9._-]{3,80}$/', $username);
}

function ds_atelier_admin_count(PDO $pdo): int
{
    if (!ds_atelier_admin_tables_exist($pdo)) {
        return 0;
    }
    $count = $pdo->query('SELECT COUNT(*) FROM admins');
    return $count ? (int) $count->fetchColumn() : 0;
}

function ds_atelier_find_admin_by_email(PDO $pdo, string $email): ?array
{
    if (!ds_atelier_admin_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, name, email, username, password_hash FROM admins WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_find_admin_by_username(PDO $pdo, string $username): ?array
{
    if (!ds_atelier_admin_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, name, email, username, password_hash FROM admins WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_find_admin_by_id(PDO $pdo, int $id): ?array
{
    if ($id < 1 || !ds_atelier_admin_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id, name, email, username, password_hash FROM admins WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_admin_session_set(array $admin): void
{
    ds_atelier_session_regenerate();
    $_SESSION['_ds_atelier_admin_id'] = (int) $admin['id'];
}

function ds_atelier_admin_session_clear(): void
{
    unset($_SESSION['_ds_atelier_admin_id']);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
}

function ds_atelier_admin_from_session(PDO $pdo): ?array
{
    $id = $_SESSION['_ds_atelier_admin_id'] ?? null;
    if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
        return null;
    }
    return ds_atelier_find_admin_by_id($pdo, (int) $id);
}

function ds_atelier_admin_login(PDO $pdo, array $input): array
{
    if (!ds_atelier_admin_tables_exist($pdo)) {
        return ['ok' => false, 'error' => 'Dashboard authentication is not available.', 'code' => 503];
    }
    $identifier = trim((string) ($input['identifier'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $fieldErrors = [];
    $asEmail = str_contains($identifier, '@');

    if ($identifier === '') {
        $fieldErrors['identifier'] = 'Enter your email address or username.';
    } elseif ($asEmail) {
        $identifier = ds_atelier_normalize_email($identifier);
        if (!ds_atelier_valid_email($identifier)) {
            $fieldErrors['identifier'] = 'Enter a valid email address.';
        }
    } else {
        $identifier = ds_atelier_normalize_username($identifier);
        if (!ds_atelier_valid_username($identifier)) {
            $fieldErrors['identifier'] = 'Enter a valid email address or username.';
        }
    }
    if ($password === '') {
        $fieldErrors['password'] = 'Enter your password.';
    } elseif (strlen($password) < 8) {
        $fieldErrors['password'] = 'Password must be at least 8 characters.';
    }
    if ($fieldErrors !== []) {
        return ['ok' => false, 'error' => 'Check the highlighted fields and try again.', 'fields' => $fieldErrors, 'code' => 422];
    }

    $admin = $asEmail
        ? ds_atelier_find_admin_by_email($pdo, $identifier)
        : ds_atelier_find_admin_by_username($pdo, $identifier);
    if ($admin === null || !password_verify($password, (string) $admin['password_hash'])) {
        return ['ok' => false, 'error' => DS_ATELIER_ADMIN_GENERIC_LOGIN, 'code' => 401];
    }

    ds_atelier_admin_session_set($admin);
    return ['ok' => true, 'admin' => ds_atelier_admin_public($admin), 'code' => 200];
}

function ds_atelier_admin_logout(): array
{
    ds_atelier_admin_session_clear();
    return ['ok' => true, 'csrf' => ds_atelier_csrf_token(), 'code' => 200];
}

function ds_atelier_mail_queue_admin_password_reset(PDO $pdo, array $config, array $admin, string $rawToken, int $resetId): array
{
    $email = ds_atelier_normalize_email((string) ($admin['email'] ?? ''));
    if (!ds_atelier_valid_email($email) || !preg_match('/^[a-f0-9]{64}$/', $rawToken)) {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Unable to queue a reset email.', 'code' => 422];
    }
    $resetUrl = ds_atelier_mail_public_url($config, 'dashboard/auth.html', ['token' => $rawToken], 'reset-password');
    if ($resetUrl === '') {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Application URL is not configured for password-reset email.', 'code' => 503];
    }
    $payload = [
        'admin_name' => (string) ($admin['name'] ?? ''),
        'reset_url' => $resetUrl,
        'expires_minutes' => (int) (DS_ATELIER_ADMIN_RESET_TTL_SECONDS / 60),
    ];
    return ds_atelier_mail_enqueue(
        $pdo,
        $config,
        DS_ATELIER_MAIL_EVENT_ADMIN_PASSWORD_RESET,
        ds_atelier_mail_event_key(DS_ATELIER_MAIL_EVENT_ADMIN_PASSWORD_RESET, (string) $resetId),
        'password_reset',
        $email,
        $payload,
        null,
        null
    );
}

function ds_atelier_create_admin_password_reset(PDO $pdo, string $email, array $config = []): array
{
    $email = ds_atelier_normalize_email($email);
    $generic = ['ok' => true, 'message' => DS_ATELIER_ADMIN_GENERIC_FORGOT, 'issued' => false, 'email_sent' => false, 'code' => 200];
    if (!ds_atelier_valid_email($email)) {
        return ['ok' => false, 'error' => 'Enter a valid email address.', 'fields' => ['email' => 'Enter a valid email address.'], 'code' => 422];
    }
    if (!ds_atelier_admin_tables_exist($pdo) || !ds_atelier_admin_reset_tables_exist($pdo)) {
        return $generic;
    }
    $admin = ds_atelier_find_admin_by_email($pdo, $email);
    if ($admin === null) {
        return $generic;
    }

    $raw = bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $expires = (new DateTimeImmutable('now'))->modify('+' . DS_ATELIER_ADMIN_RESET_TTL_SECONDS . ' seconds')->format('Y-m-d H:i:s');
    $queued = false;
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $pdo->prepare('UPDATE admin_password_resets SET used_at = COALESCE(used_at, NOW()) WHERE admin_id = ? AND used_at IS NULL')
            ->execute([(int) $admin['id']]);
        $stmt = $pdo->prepare('INSERT INTO admin_password_resets (admin_id, token_hash, expires_at) VALUES (?, ?, ?)');
        $stmt->execute([(int) $admin['id'], $hash, $expires]);
        $resetId = (int) $pdo->lastInsertId();
        if ($config !== []) {
            try {
                $queue = ds_atelier_mail_queue_admin_password_reset($pdo, $config, $admin, $raw, $resetId);
                $queued = ($queue['ok'] ?? false) === true && (($queue['queued'] ?? false) === true || ($queue['replayed'] ?? false) === true);
                if ($queued !== true) {
                    ds_atelier_log('error', 'Admin password reset email was not queued', $config);
                }
            } catch (Throwable $e) {
                ds_atelier_log('error', 'Admin password reset email was not queued', $config);
            }
        }
        if ($own) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return [
        'ok' => true,
        'message' => DS_ATELIER_ADMIN_GENERIC_FORGOT,
        'issued' => true,
        'email_sent' => false,
        'queued' => $queued,
        'code' => 200,
        'token' => $raw,
        'email' => $email,
    ];
}

function ds_atelier_reset_admin_password(PDO $pdo, array $input): array
{
    if (!ds_atelier_admin_tables_exist($pdo) || !ds_atelier_admin_reset_tables_exist($pdo)) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired.', 'code' => 400];
    }
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
    $stmt = $pdo->prepare('SELECT id, admin_id, expires_at, used_at FROM admin_password_resets WHERE token_hash = ? LIMIT 1');
    $stmt->execute([$hash]);
    $row = $stmt->fetch();
    if (!$row || $row['used_at'] !== null || strtotime((string) $row['expires_at']) < time()) {
        return ['ok' => false, 'error' => 'This reset link is invalid or has expired.', 'code' => 400];
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($passwordHash) || $passwordHash === '') {
        return ['ok' => false, 'error' => 'Unable to update the password. Please try again later.', 'code' => 500];
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([$passwordHash, (int) $row['admin_id']]);
        $pdo->prepare('UPDATE admin_password_resets SET used_at = NOW() WHERE id = ?')->execute([(int) $row['id']]);
        $pdo->prepare('UPDATE admin_password_resets SET used_at = COALESCE(used_at, NOW()) WHERE admin_id = ? AND used_at IS NULL')
            ->execute([(int) $row['admin_id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    ds_atelier_admin_session_clear();
    return ['ok' => true, 'message' => 'Password updated. You can sign in with your new password.', 'code' => 200];
}

function ds_atelier_admin_bootstrap_create(PDO $pdo, array $input): array
{
    if (!ds_atelier_admin_tables_exist($pdo)) {
        return ['ok' => false, 'error' => 'Admin tables are not available.', 'code' => 503];
    }
    if (ds_atelier_admin_count($pdo) > 0) {
        return ['ok' => false, 'error' => 'An admin account already exists.', 'code' => 409];
    }
    $name = trim((string) ($input['name'] ?? ''));
    $email = ds_atelier_normalize_email((string) ($input['email'] ?? ''));
    $username = ds_atelier_normalize_username((string) ($input['username'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    if (!ds_atelier_valid_name($name)) {
        return ['ok' => false, 'error' => 'Enter a valid admin name.', 'code' => 422];
    }
    if (!ds_atelier_valid_email($email)) {
        return ['ok' => false, 'error' => 'Enter a valid admin email.', 'code' => 422];
    }
    if (!ds_atelier_valid_username($username)) {
        return ['ok' => false, 'error' => 'Username must be 3-80 characters using letters, numbers, dots, underscores, or hyphens.', 'code' => 422];
    }
    if (!ds_atelier_valid_password($password)) {
        return ['ok' => false, 'error' => 'Password must be at least 8 characters.', 'code' => 422];
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    if (!is_string($hash) || $hash === '') {
        return ['ok' => false, 'error' => 'Unable to create the admin account.', 'code' => 500];
    }
    try {
        $pdo->prepare('INSERT INTO admins (name, email, username, password_hash) VALUES (?, ?, ?, ?)')
            ->execute([$name, $email, $username, $hash]);
    } catch (PDOException $e) {
        if ((string) $e->getCode() === '23000') {
            return ['ok' => false, 'error' => 'An admin account already exists.', 'code' => 409];
        }
        throw $e;
    }
    $id = (int) $pdo->lastInsertId();
    $admin = ds_atelier_find_admin_by_id($pdo, $id);
    if ($admin === null) {
        return ['ok' => false, 'error' => 'Unable to create the admin account.', 'code' => 500];
    }
    return ['ok' => true, 'admin' => ds_atelier_admin_public($admin), 'code' => 201];
}

function ds_atelier_admin_list_orders(PDO $pdo, array $input): array
{
    $guard = ds_atelier_admin_require();
    if (($guard['ok'] ?? false) !== true) {
        return $guard;
    }
    $pageRequested = ds_atelier_checkout_parse_page($input['page'] ?? DS_ATELIER_ORDERS_PAGE_DEFAULT);
    $perPage = ds_atelier_checkout_parse_per_page($input['per_page'] ?? DS_ATELIER_ORDERS_PER_PAGE_DEFAULT);
    $count = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
    $totalPages = $count > 0 ? (int) ceil($count / $perPage) : 1;
    $page = min($pageRequested, $totalPages);
    $offset = ($page - 1) * $perPage;
    $stmt = $pdo->prepare(
        'SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT ' . (int) $perPage . ' OFFSET ' . (int) $offset
    );
    $stmt->execute();
    $rows = $stmt->fetchAll() ?: [];
    $orderIds = array_map(static fn (array $row): int => (int) $row['id'], $rows);
    $itemsByOrder = ds_atelier_checkout_order_items_for_ids($pdo, $orderIds);
    $shipments = ds_atelier_fulfilment_map_for_orders($pdo, $orderIds);
    $invoices = ds_atelier_invoice_map_for_orders($pdo, $orderIds);
    $orders = [];
    foreach ($rows as $row) {
        $orderId = (int) $row['id'];
        $orders[] = ds_atelier_checkout_order_public(
            $row,
            $itemsByOrder[$orderId] ?? [],
            $shipments[$orderId] ?? null,
            $invoices[$orderId] ?? null
        );
    }
    return [
        'ok' => true,
        'orders' => $orders,
        'meta' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $count,
            'total_pages' => $totalPages,
        ],
        'code' => 200,
    ];
}

function ds_atelier_admin_get_order(PDO $pdo, array $input): array
{
    $guard = ds_atelier_admin_require();
    if (($guard['ok'] ?? false) !== true) {
        return $guard;
    }
    $ref = ds_atelier_checkout_parse_ref($input['ref'] ?? $input['id'] ?? '');
    if ($ref === '') {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    if ($order === null) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
    return [
        'ok' => true,
        'order' => ds_atelier_checkout_order_public(
            $order,
            $items,
            ds_atelier_fulfilment_find_by_order($pdo, (int) $order['id']),
            ds_atelier_invoice_find_by_order($pdo, (int) $order['id'])
        ),
        'code' => 200,
    ];
}

function ds_atelier_admin_purge(PDO $pdo, array $adminIds): void
{
    $adminIds = array_values(array_unique(array_filter(array_map('intval', $adminIds))));
    if ($adminIds === []) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($adminIds), '?'));
    if (ds_atelier_admin_reset_tables_exist($pdo)) {
        $pdo->prepare("DELETE FROM admin_password_resets WHERE admin_id IN ($placeholders)")->execute($adminIds);
    }
    if (ds_atelier_admin_tables_exist($pdo)) {
        $pdo->prepare("DELETE FROM admins WHERE id IN ($placeholders)")->execute($adminIds);
    }
}
