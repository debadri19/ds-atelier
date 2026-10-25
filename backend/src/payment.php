<?php

declare(strict_types=1);

const DS_ATELIER_PAYMENT_PROVIDER_RAZORPAY = 'razorpay';
const DS_ATELIER_PAYMENT_INTENT_CREATED = 'created';
const DS_ATELIER_PAYMENT_INTENT_PENDING = 'pending';
const DS_ATELIER_PAYMENT_INTENT_PAID = 'paid';
const DS_ATELIER_PAYMENT_INTENT_FAILED = 'failed';
const DS_ATELIER_PAYMENT_INTENT_CANCELLED = 'cancelled';
const DS_ATELIER_PAYMENT_API_ORDERS = 'https://api.razorpay.com/v1/orders';
const DS_ATELIER_MAIL_EVENT_PAYMENT_CAPTURED = 'payment_captured';

function ds_atelier_payment_missing_table(PDOException $e): bool
{
    $code = (string) $e->getCode();
    if ($code === '42S02' || $code === '42S22') {
        return true;
    }
    $message = strtolower($e->getMessage());
    return str_contains($message, "doesn't exist") || str_contains($message, 'unknown table');
}

function ds_atelier_payment_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM payment_intents LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_payment_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_payment_webhook_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM payment_webhook_events LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_payment_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_payment_settings(array $config): array
{
    $keyId = trim((string) ds_atelier_env('DS_ATELIER_RAZORPAY_KEY_ID', ''));
    $keySecret = (string) (ds_atelier_env('DS_ATELIER_RAZORPAY_KEY_SECRET', '') ?? '');
    $webhookSecret = (string) (ds_atelier_env('DS_ATELIER_RAZORPAY_WEBHOOK_SECRET', '') ?? '');
    $timeout = (int) (ds_atelier_env('DS_ATELIER_RAZORPAY_TIMEOUT', '10') ?: '10');
    if ($timeout < 1 || $timeout > 30) {
        $timeout = 10;
    }

    $errors = [];
    if ($keyId !== '' && !preg_match('/^rzp_(live|test)_[A-Za-z0-9]+$/', $keyId)) {
        $errors[] = 'DS_ATELIER_RAZORPAY_KEY_ID is not a valid Razorpay key id.';
        $keyId = '';
    }
    if ($keySecret !== '' && strlen($keySecret) < 8) {
        $errors[] = 'DS_ATELIER_RAZORPAY_KEY_SECRET is too short.';
        $keySecret = '';
    }
    if ($webhookSecret !== '' && strlen($webhookSecret) < 8) {
        $errors[] = 'DS_ATELIER_RAZORPAY_WEBHOOK_SECRET is too short.';
        $webhookSecret = '';
    }

    $configured = $keyId !== '' && $keySecret !== '';
    $ready = $configured && $errors === [];

    return [
        'ok' => $errors === [],
        'errors' => $errors,
        'provider' => DS_ATELIER_PAYMENT_PROVIDER_RAZORPAY,
        'key_id' => $keyId,
        'key_secret' => $keySecret,
        'webhook_secret' => $webhookSecret,
        'timeout' => $timeout,
        'configured' => $configured,
        'ready' => $ready,
        'live' => str_starts_with($keyId, 'rzp_live_'),
        'webhook_configured' => $webhookSecret !== '',
        'env' => (string) ($config['env'] ?? 'development'),
    ];
}

function ds_atelier_payment_status_summary(array $config): array
{
    $settings = ds_atelier_payment_settings($config);
    return [
        'provider' => $settings['provider'],
        'configured' => $settings['configured'] ? 1 : 0,
        'ready' => $settings['ready'] ? 1 : 0,
        'live' => $settings['live'] ? 1 : 0,
        'webhook_configured' => $settings['webhook_configured'] ? 1 : 0,
        'ok' => $settings['ok'] ? 1 : 0,
    ];
}

function ds_atelier_payment_http_handler(?callable $handler = null): ?callable
{
    static $current = null;
    if (func_num_args() === 1) {
        $current = $handler;
    }
    return $current;
}

function ds_atelier_payment_http_json(string $method, string $url, array $headers, ?string $body, int $timeout): array
{
    $override = ds_atelier_payment_http_handler();
    if (is_callable($override)) {
        return $override($method, $url, $headers, $body, $timeout);
    }

    if (filter_var($url, FILTER_VALIDATE_URL) === false) {
        return ['ok' => false, 'status' => 0, 'json' => null, 'raw' => '', 'error' => 'Invalid payment URL.'];
    }
    $parts = parse_url($url);
    if (strtolower((string) ($parts['scheme'] ?? '')) !== 'https') {
        return ['ok' => false, 'status' => 0, 'json' => null, 'raw' => '', 'error' => 'Payment API must use HTTPS.'];
    }

    $headerLines = [];
    foreach ($headers as $name => $value) {
        $headerLines[] = $name . ': ' . $value;
    }
    $context = stream_context_create([
        'http' => [
            'method' => strtoupper($method),
            'header' => implode("\r\n", $headerLines),
            'content' => $body ?? '',
            'timeout' => $timeout,
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);
    $raw = @file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header) && is_array($http_response_header) && isset($http_response_header[0])) {
        if (preg_match('/\s(\d{3})\s/', (string) $http_response_header[0], $match) === 1) {
            $status = (int) $match[1];
        }
    }
    if (!is_string($raw)) {
        return ['ok' => false, 'status' => $status, 'json' => null, 'raw' => '', 'error' => 'Payment gateway is unavailable.'];
    }
    $json = json_decode($raw, true);
    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'json' => is_array($json) ? $json : null,
        'raw' => $raw,
        'error' => $status >= 200 && $status < 300 ? null : 'Payment gateway rejected the request.',
    ];
}

function ds_atelier_payment_checkout_signature(string $orderId, string $paymentId, string $secret): string
{
    return hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);
}

function ds_atelier_payment_webhook_signature(string $rawBody, string $secret): string
{
    return hash_hmac('sha256', $rawBody, $secret);
}

function ds_atelier_payment_signature_valid(string $expected, string $provided): bool
{
    if ($expected === '' || $provided === '') {
        return false;
    }
    return hash_equals($expected, $provided);
}

function ds_atelier_payment_find_intent_by_order(PDO $pdo, int $orderId): ?array
{
    if ($orderId < 1 || !ds_atelier_payment_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM payment_intents WHERE order_id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_payment_find_intent_by_provider_order(PDO $pdo, string $providerOrderId): ?array
{
    if ($providerOrderId === '' || !ds_atelier_payment_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM payment_intents WHERE provider_order_id = ? LIMIT 1');
    $stmt->execute([$providerOrderId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_payment_public_intent(?array $intent): ?array
{
    if ($intent === null) {
        return null;
    }
    return [
        'provider' => (string) ($intent['provider'] ?? DS_ATELIER_PAYMENT_PROVIDER_RAZORPAY),
        'status' => (string) ($intent['status'] ?? ''),
        'providerOrderId' => $intent['provider_order_id'] !== null ? (string) $intent['provider_order_id'] : null,
        'amountPaise' => (int) ($intent['amount_paise'] ?? 0),
        'currency' => (string) ($intent['currency'] ?? 'INR'),
    ];
}

function ds_atelier_payment_upsert_intent(
    PDO $pdo,
    int $orderId,
    int $amountPaise,
    string $currency,
    string $status,
    ?string $providerOrderId = null,
    ?string $providerPaymentId = null,
    ?string $signatureHash = null,
    ?string $lastError = null
): array {
    $existing = ds_atelier_payment_find_intent_by_order($pdo, $orderId);
    if ($existing === null) {
        $pdo->prepare(
            'INSERT INTO payment_intents (
                order_id, provider, provider_order_id, provider_payment_id, amount_paise, currency, status, signature_hash, last_error
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $orderId,
            DS_ATELIER_PAYMENT_PROVIDER_RAZORPAY,
            $providerOrderId,
            $providerPaymentId,
            $amountPaise,
            $currency,
            $status,
            $signatureHash,
            $lastError,
        ]);
        return ds_atelier_payment_find_intent_by_order($pdo, $orderId) ?? [];
    }
    $pdo->prepare(
        'UPDATE payment_intents
         SET provider_order_id = COALESCE(?, provider_order_id),
             provider_payment_id = COALESCE(?, provider_payment_id),
             amount_paise = ?,
             currency = ?,
             status = ?,
             signature_hash = COALESCE(?, signature_hash),
             last_error = ?
         WHERE id = ?'
    )->execute([
        $providerOrderId,
        $providerPaymentId,
        $amountPaise,
        $currency,
        $status,
        $signatureHash,
        $lastError,
        (int) $existing['id'],
    ]);
    return ds_atelier_payment_find_intent_by_order($pdo, $orderId) ?? $existing;
}

function ds_atelier_payment_create_razorpay_order(array $config, array $order, int $amountPaise): array
{
    $settings = ds_atelier_payment_settings($config);
    if ($settings['ready'] !== true) {
        return [
            'ok' => false,
            'configured' => false,
            'error' => 'Online payment is not configured.',
            'code' => 503,
        ];
    }
    $ref = (string) ($order['public_ref'] ?? '');
    $payload = json_encode([
        'amount' => $amountPaise,
        'currency' => (string) ($order['currency'] ?? DS_ATELIER_CHECKOUT_CURRENCY),
        'receipt' => $ref,
        'payment_capture' => 1,
        'notes' => [
            'public_ref' => $ref,
        ],
    ], JSON_UNESCAPED_SLASHES);
    if (!is_string($payload) || $payload === '') {
        return ['ok' => false, 'configured' => true, 'error' => 'Unable to start payment.', 'code' => 500];
    }
    $auth = base64_encode($settings['key_id'] . ':' . $settings['key_secret']);
    $response = ds_atelier_payment_http_json(
        'POST',
        DS_ATELIER_PAYMENT_API_ORDERS,
        [
            'Authorization' => 'Basic ' . $auth,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
        $payload,
        $settings['timeout']
    );
    $json = is_array($response['json'] ?? null) ? $response['json'] : [];
    $providerOrderId = trim((string) ($json['id'] ?? ''));
    $gatewayAmount = (int) ($json['amount'] ?? 0);
    $gatewayCurrency = strtoupper((string) ($json['currency'] ?? ''));
    if (
        ($response['ok'] ?? false) !== true
        || $providerOrderId === ''
        || !preg_match('/^order_[A-Za-z0-9]+$/', $providerOrderId)
        || $gatewayAmount !== $amountPaise
        || $gatewayCurrency !== strtoupper((string) ($order['currency'] ?? 'INR'))
    ) {
        ds_atelier_log('error', 'Razorpay order create failed', $config);
        return [
            'ok' => false,
            'configured' => true,
            'error' => 'Unable to start payment. Please try again later.',
            'code' => 502,
        ];
    }
    return [
        'ok' => true,
        'configured' => true,
        'provider_order_id' => $providerOrderId,
        'amount' => $gatewayAmount,
        'currency' => $gatewayCurrency,
        'code' => 200,
    ];
}

function ds_atelier_payment_create_order(PDO $pdo, array $config, array $input): array
{
    $ref = ds_atelier_checkout_parse_ref($input['ref'] ?? $input['id'] ?? '');
    if ($ref === '') {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    if (!ds_atelier_payment_tables_exist($pdo)) {
        return ['ok' => false, 'configured' => false, 'error' => 'Online payment is not available.', 'code' => 503];
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    if ($order === null || !ds_atelier_checkout_order_owned($order, $actor)) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    if ((string) $order['payment_status'] === DS_ATELIER_PAYMENT_STATUS_PAID) {
        $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
        return [
            'ok' => true,
            'configured' => true,
            'alreadyPaid' => true,
            'order' => ds_atelier_checkout_order_public(
                $order,
                $items,
                ds_atelier_fulfilment_find_by_order($pdo, (int) $order['id']),
                ds_atelier_invoice_find_by_order($pdo, (int) $order['id'])
            ),
            'code' => 200,
        ];
    }
    if ((string) $order['payment_status'] === DS_ATELIER_PAYMENT_STATUS_REFUNDED) {
        return ['ok' => false, 'error' => 'This order has been refunded.', 'code' => 409];
    }
    if ((string) $order['status'] === DS_ATELIER_ORDER_STATUS_CANCELLED) {
        return ['ok' => false, 'error' => 'This order is cancelled.', 'code' => 409];
    }

    $amountPaise = ds_atelier_money_paise($order['grand_total']);
    $currency = strtoupper((string) $order['currency']);
    if ($amountPaise < 100 || $currency !== 'INR') {
        return ['ok' => false, 'error' => 'This order cannot be paid online.', 'code' => 422];
    }

    $settings = ds_atelier_payment_settings($config);
    if ($settings['ready'] !== true) {
        return [
            'ok' => false,
            'configured' => false,
            'error' => 'Online payment is not configured.',
            'code' => 503,
        ];
    }

    $intent = ds_atelier_payment_find_intent_by_order($pdo, (int) $order['id']);
    $providerOrderId = is_array($intent) ? trim((string) ($intent['provider_order_id'] ?? '')) : '';
    if (
        $providerOrderId === ''
        || (int) ($intent['amount_paise'] ?? 0) !== $amountPaise
        || strtoupper((string) ($intent['currency'] ?? '')) !== $currency
        || (string) ($intent['status'] ?? '') === DS_ATELIER_PAYMENT_INTENT_FAILED
    ) {
        $created = ds_atelier_payment_create_razorpay_order($config, $order, $amountPaise);
        if (($created['ok'] ?? false) !== true) {
            return $created;
        }
        $providerOrderId = (string) $created['provider_order_id'];
        ds_atelier_payment_upsert_intent(
            $pdo,
            (int) $order['id'],
            $amountPaise,
            $currency,
            DS_ATELIER_PAYMENT_INTENT_CREATED,
            $providerOrderId
        );
    }

    $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
    return [
        'ok' => true,
        'configured' => true,
        'keyId' => $settings['key_id'],
        'order' => ds_atelier_checkout_order_public(
            $order,
            $items,
            ds_atelier_fulfilment_find_by_order($pdo, (int) $order['id']),
            ds_atelier_invoice_find_by_order($pdo, (int) $order['id'])
        ),
        'razorpay' => [
            'orderId' => $providerOrderId,
            'amount' => $amountPaise,
            'currency' => $currency,
            'name' => 'DS ATELIER',
            'description' => 'Order ' . $ref,
            'prefill' => [
                'name' => (string) $order['contact_name'],
                'email' => (string) $order['contact_email'],
                'contact' => (string) $order['contact_mobile'],
            ],
        ],
        'code' => 200,
    ];
}

function ds_atelier_payment_queue_captured(PDO $pdo, array $config, array $order): void
{
    try {
        $email = ds_atelier_normalize_email((string) ($order['contact_email'] ?? ''));
        if (!ds_atelier_valid_email($email) || !ds_atelier_mail_tables_exist($pdo)) {
            return;
        }
        $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
        $invoice = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
        $payload = ds_atelier_mail_order_payload($config, $order, $items, $invoice, ds_atelier_fulfilment_find_by_order($pdo, (int) $order['id']));
        ds_atelier_mail_enqueue(
            $pdo,
            $config,
            DS_ATELIER_MAIL_EVENT_PAYMENT_CAPTURED,
            ds_atelier_mail_event_key(DS_ATELIER_MAIL_EVENT_PAYMENT_CAPTURED, (string) $order['public_ref']),
            'order_placed',
            $email,
            $payload,
            (int) $order['id'],
            isset($order['customer_id']) && $order['customer_id'] !== null ? (int) $order['customer_id'] : null
        );
    } catch (Throwable $e) {
        ds_atelier_log('error', 'Payment captured email was not queued', $config);
    }
}

function ds_atelier_payment_apply_capture(PDO $pdo, array $config, array $order, array $facts): array
{
    $orderId = (int) ($order['id'] ?? 0);
    if ($orderId < 1) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $amountPaise = (int) ($facts['amount_paise'] ?? 0);
    $currency = strtoupper((string) ($facts['currency'] ?? 'INR'));
    $providerOrderId = trim((string) ($facts['provider_order_id'] ?? ''));
    $providerPaymentId = trim((string) ($facts['provider_payment_id'] ?? ''));
    $expectedPaise = ds_atelier_money_paise($order['grand_total']);
    if ($amountPaise !== $expectedPaise || $currency !== strtoupper((string) $order['currency'])) {
        return ['ok' => false, 'error' => 'Payment amount does not match this order.', 'code' => 409];
    }
    if ($providerOrderId === '' || $providerPaymentId === '') {
        return ['ok' => false, 'error' => 'Payment details are incomplete.', 'code' => 422];
    }

    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $lock = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE');
        $lock->execute([$orderId]);
        $locked = $lock->fetch();
        if ($locked === false) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
        }
        $paymentStatus = (string) $locked['payment_status'];
        if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_PAID) {
            if ($own) {
                $pdo->commit();
            }
            return ['ok' => true, 'replayed' => true, 'order' => $locked, 'code' => 200];
        }
        if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_REFUNDED) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => 'This order has been refunded.', 'code' => 409];
        }
        if ((string) $locked['status'] === DS_ATELIER_ORDER_STATUS_CANCELLED) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => 'This order is cancelled.', 'code' => 409];
        }

        $intent = ds_atelier_payment_find_intent_by_order($pdo, $orderId);
        if (is_array($intent) && (string) ($intent['provider_order_id'] ?? '') !== '' && (string) $intent['provider_order_id'] !== $providerOrderId) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => 'Payment does not match this order.', 'code' => 409];
        }

        $nextOrderStatus = (string) $locked['status'];
        if ($nextOrderStatus === DS_ATELIER_ORDER_STATUS_PENDING_PAYMENT) {
            $nextOrderStatus = DS_ATELIER_ORDER_STATUS_PENDING;
        }
        $pdo->prepare('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?')->execute([
            DS_ATELIER_PAYMENT_STATUS_PAID,
            $nextOrderStatus,
            $orderId,
        ]);
        $committed = ds_atelier_inventory_commit_order($pdo, $orderId);
        if (($committed['ok'] ?? false) !== true) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return $committed;
        }
        $signatureHash = isset($facts['signature']) && is_string($facts['signature']) && $facts['signature'] !== ''
            ? hash('sha256', $facts['signature'])
            : null;
        ds_atelier_payment_upsert_intent(
            $pdo,
            $orderId,
            $amountPaise,
            $currency,
            DS_ATELIER_PAYMENT_INTENT_PAID,
            $providerOrderId,
            $providerPaymentId,
            $signatureHash
        );
        $fresh = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $fresh->execute([$orderId]);
        $paidOrder = $fresh->fetch() ?: $locked;
        ds_atelier_payment_queue_captured($pdo, $config, $paidOrder);
        if ($own) {
            $pdo->commit();
        }
        return ['ok' => true, 'replayed' => false, 'order' => $paidOrder, 'code' => 200];
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function ds_atelier_payment_apply_failure(PDO $pdo, array $order, array $facts): array
{
    $orderId = (int) ($order['id'] ?? 0);
    if ($orderId < 1) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $paymentStatus = (string) ($order['payment_status'] ?? '');
    if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_PAID || $paymentStatus === DS_ATELIER_PAYMENT_STATUS_REFUNDED) {
        return ['ok' => true, 'ignored' => true, 'code' => 200];
    }
    $amountPaise = ds_atelier_money_paise($order['grand_total']);
    ds_atelier_payment_upsert_intent(
        $pdo,
        $orderId,
        $amountPaise,
        strtoupper((string) $order['currency']),
        DS_ATELIER_PAYMENT_INTENT_FAILED,
        isset($facts['provider_order_id']) ? (string) $facts['provider_order_id'] : null,
        isset($facts['provider_payment_id']) ? (string) $facts['provider_payment_id'] : null,
        null,
        'Payment was not completed.'
    );
    return ['ok' => true, 'failed' => true, 'code' => 200];
}

function ds_atelier_payment_apply_refund(PDO $pdo, array $order, array $facts): array
{
    $orderId = (int) ($order['id'] ?? 0);
    if ($orderId < 1) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $lock = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE');
        $lock->execute([$orderId]);
        $locked = $lock->fetch();
        if ($locked === false) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
        }
        if ((string) $locked['payment_status'] === DS_ATELIER_PAYMENT_STATUS_REFUNDED) {
            if ($own) {
                $pdo->commit();
            }
            return ['ok' => true, 'replayed' => true, 'code' => 200];
        }
        $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([
            DS_ATELIER_PAYMENT_STATUS_REFUNDED,
            $orderId,
        ]);
        ds_atelier_inventory_release_order($pdo, $orderId, 'refund');
        ds_atelier_payment_upsert_intent(
            $pdo,
            $orderId,
            ds_atelier_money_paise($locked['grand_total']),
            strtoupper((string) $locked['currency']),
            DS_ATELIER_PAYMENT_INTENT_CANCELLED,
            isset($facts['provider_order_id']) ? (string) $facts['provider_order_id'] : null,
            isset($facts['provider_payment_id']) ? (string) $facts['provider_payment_id'] : null
        );
        if ($own) {
            $pdo->commit();
        }
        return ['ok' => true, 'replayed' => false, 'code' => 200];
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function ds_atelier_payment_verify(PDO $pdo, array $config, array $input): array
{
    $ref = ds_atelier_checkout_parse_ref($input['ref'] ?? $input['id'] ?? '');
    $providerOrderId = trim((string) ($input['razorpayOrderId'] ?? $input['razorpay_order_id'] ?? ''));
    $providerPaymentId = trim((string) ($input['razorpayPaymentId'] ?? $input['razorpay_payment_id'] ?? ''));
    $signature = trim((string) ($input['razorpaySignature'] ?? $input['razorpay_signature'] ?? ''));
    if ($ref === '') {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    if (
        !preg_match('/^order_[A-Za-z0-9]+$/', $providerOrderId)
        || !preg_match('/^pay_[A-Za-z0-9]+$/', $providerPaymentId)
        || !preg_match('/^[a-f0-9]{64}$/', $signature)
    ) {
        return ['ok' => false, 'error' => 'Payment could not be verified.', 'code' => 422];
    }
    $settings = ds_atelier_payment_settings($config);
    if ($settings['ready'] !== true) {
        return ['ok' => false, 'configured' => false, 'error' => 'Online payment is not configured.', 'code' => 503];
    }
    $expected = ds_atelier_payment_checkout_signature($providerOrderId, $providerPaymentId, $settings['key_secret']);
    if (!ds_atelier_payment_signature_valid($expected, $signature)) {
        return ['ok' => false, 'error' => 'Payment could not be verified.', 'code' => 400];
    }

    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    if ($order === null || !ds_atelier_checkout_order_owned($order, $actor)) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }

    $captured = ds_atelier_payment_apply_capture($pdo, $config, $order, [
        'provider_order_id' => $providerOrderId,
        'provider_payment_id' => $providerPaymentId,
        'amount_paise' => ds_atelier_money_paise($order['grand_total']),
        'currency' => (string) $order['currency'],
        'signature' => $signature,
        'source' => 'verify',
    ]);
    if (($captured['ok'] ?? false) !== true) {
        return $captured;
    }
    $fresh = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    $items = $fresh !== null ? ds_atelier_checkout_order_items($pdo, (int) $fresh['id']) : [];
    return [
        'ok' => true,
        'verified' => true,
        'replayed' => (bool) ($captured['replayed'] ?? false),
        'order' => $fresh !== null ? ds_atelier_checkout_order_public(
            $fresh,
            $items,
            ds_atelier_fulfilment_find_by_order($pdo, (int) $fresh['id']),
            ds_atelier_invoice_find_by_order($pdo, (int) $fresh['id'])
        ) : null,
        'code' => 200,
    ];
}

function ds_atelier_payment_record_webhook(PDO $pdo, string $eventKey, string $eventType, array $payload, ?int $orderId, ?string $providerOrderId, ?string $providerPaymentId): array
{
    if (!ds_atelier_payment_webhook_tables_exist($pdo)) {
        return ['ok' => true, 'recorded' => false, 'replayed' => false];
    }
    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || $encoded === '') {
        $encoded = '{}';
    }
    try {
        $pdo->prepare(
            'INSERT INTO payment_webhook_events (
                provider, event_key, event_type, order_id, provider_order_id, provider_payment_id, payload_json
             ) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            DS_ATELIER_PAYMENT_PROVIDER_RAZORPAY,
            mb_substr($eventKey, 0, 120),
            mb_substr($eventType, 0, 80),
            $orderId,
            $providerOrderId,
            $providerPaymentId,
            $encoded,
        ]);
        return ['ok' => true, 'recorded' => true, 'replayed' => false];
    } catch (PDOException $e) {
        if ((string) $e->getCode() === '23000') {
            return ['ok' => true, 'recorded' => false, 'replayed' => true];
        }
        throw $e;
    }
}

function ds_atelier_payment_webhook(PDO $pdo, array $config, string $rawBody, ?string $signature): array
{
    $settings = ds_atelier_payment_settings($config);
    if ($settings['webhook_configured'] !== true || $settings['webhook_secret'] === '') {
        return ['ok' => false, 'error' => 'Webhook is not configured.', 'code' => 503];
    }
    if (!is_string($signature) || $signature === '') {
        return ['ok' => false, 'error' => 'Forbidden.', 'code' => 403];
    }
    $expected = ds_atelier_payment_webhook_signature($rawBody, $settings['webhook_secret']);
    if (!ds_atelier_payment_signature_valid($expected, $signature)) {
        return ['ok' => false, 'error' => 'Forbidden.', 'code' => 403];
    }
    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        return ['ok' => false, 'error' => 'Invalid webhook payload.', 'code' => 400];
    }
    $eventType = trim((string) ($payload['event'] ?? ''));
    $eventId = trim((string) ($payload['id'] ?? ''));
    $eventKey = $eventId !== '' ? $eventId : hash('sha256', $eventType . ':' . $rawBody);
    $paymentEntity = is_array($payload['payload']['payment']['entity'] ?? null) ? $payload['payload']['payment']['entity'] : [];
    $orderEntity = is_array($payload['payload']['order']['entity'] ?? null) ? $payload['payload']['order']['entity'] : [];
    $providerPaymentId = trim((string) ($paymentEntity['id'] ?? ''));
    $providerOrderId = trim((string) ($paymentEntity['order_id'] ?? $orderEntity['id'] ?? ''));
    $receipt = trim((string) ($orderEntity['receipt'] ?? $paymentEntity['notes']['public_ref'] ?? ''));
    $amountPaise = (int) ($paymentEntity['amount'] ?? $orderEntity['amount'] ?? 0);
    $currency = strtoupper((string) ($paymentEntity['currency'] ?? $orderEntity['currency'] ?? 'INR'));

    $order = null;
    if ($providerOrderId !== '') {
        $intent = ds_atelier_payment_find_intent_by_provider_order($pdo, $providerOrderId);
        if (is_array($intent)) {
            $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
            $stmt->execute([(int) $intent['order_id']]);
            $row = $stmt->fetch();
            $order = $row ?: null;
        }
    }
    if ($order === null && $receipt !== '') {
        $order = ds_atelier_checkout_find_order_by_ref($pdo, ds_atelier_checkout_parse_ref($receipt));
    }
    $orderId = is_array($order) ? (int) $order['id'] : null;
    $recorded = ds_atelier_payment_record_webhook($pdo, $eventKey, $eventType, $payload, $orderId, $providerOrderId !== '' ? $providerOrderId : null, $providerPaymentId !== '' ? $providerPaymentId : null);
    if (($recorded['replayed'] ?? false) === true) {
        return ['ok' => true, 'replayed' => true, 'code' => 200];
    }
    if ($order === null) {
        return ['ok' => true, 'ignored' => true, 'code' => 200];
    }

    $facts = [
        'provider_order_id' => $providerOrderId,
        'provider_payment_id' => $providerPaymentId,
        'amount_paise' => $amountPaise > 0 ? $amountPaise : ds_atelier_money_paise($order['grand_total']),
        'currency' => $currency !== '' ? $currency : (string) $order['currency'],
        'source' => 'webhook',
    ];

    if (in_array($eventType, ['payment.captured', 'order.paid'], true)) {
        $result = ds_atelier_payment_apply_capture($pdo, $config, $order, $facts);
        if (($result['ok'] ?? false) !== true) {
            return $result;
        }
        return ['ok' => true, 'captured' => true, 'replayed' => (bool) ($result['replayed'] ?? false), 'code' => 200];
    }
    if ($eventType === 'payment.failed') {
        ds_atelier_payment_apply_failure($pdo, $order, $facts);
        return ['ok' => true, 'failed' => true, 'code' => 200];
    }
    if (in_array($eventType, ['refund.processed', 'payment.refunded'], true)) {
        $result = ds_atelier_payment_apply_refund($pdo, $order, $facts);
        if (($result['ok'] ?? false) !== true) {
            return $result;
        }
        return ['ok' => true, 'refunded' => true, 'code' => 200];
    }
    return ['ok' => true, 'ignored' => true, 'code' => 200];
}

function ds_atelier_payment_purge_orders(PDO $pdo, array $orderIds): void
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === []) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    if (ds_atelier_payment_webhook_tables_exist($pdo)) {
        $pdo->prepare("DELETE FROM payment_webhook_events WHERE order_id IN ($placeholders)")->execute($orderIds);
    }
    if (ds_atelier_payment_tables_exist($pdo)) {
        $pdo->prepare("DELETE FROM payment_intents WHERE order_id IN ($placeholders)")->execute($orderIds);
    }
}
