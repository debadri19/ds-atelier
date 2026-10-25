<?php

declare(strict_types=1);

function ds_atelier_mail_missing_table(PDOException $e): bool
{
    $code = (string) $e->getCode();
    if ($code === '42S02' || $code === '42S22') {
        return true;
    }
    $message = strtolower($e->getMessage());
    return str_contains($message, "doesn't exist") || str_contains($message, 'unknown table');
}

function ds_atelier_mail_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM email_outbox LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_mail_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_mail_event_key(string $type, string $subjectId, string $detail = ''): string
{
    $parts = [$type, $subjectId];
    if ($detail !== '') {
        $parts[] = $detail;
    }
    $key = implode(':', $parts);
    return mb_substr($key, 0, 120);
}

function ds_atelier_mail_enqueue(
    PDO $pdo,
    array $config,
    string $eventType,
    string $eventKey,
    string $template,
    string $recipient,
    array $payload,
    ?int $orderId = null,
    ?int $customerId = null
): array {
    if (!ds_atelier_mail_tables_exist($pdo)) {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Email queue is not available.', 'code' => 503];
    }
    $recipient = ds_atelier_normalize_email($recipient);
    if (!ds_atelier_valid_email($recipient)) {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Invalid recipient.', 'code' => 422];
    }
    $eventKey = mb_substr(trim($eventKey), 0, 120);
    if ($eventKey === '') {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Missing email event key.', 'code' => 422];
    }
    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || $encoded === '') {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Unable to queue this email.', 'code' => 500];
    }

    try {
        $pdo->prepare(
            'INSERT INTO email_outbox (
                event_key, event_type, template, order_id, customer_id, recipient_email, payload_json, status, max_attempts, next_attempt_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        )->execute([
            $eventKey,
            $eventType,
            $template,
            $orderId,
            $customerId,
            $recipient,
            $encoded,
            'pending',
            DS_ATELIER_MAIL_MAX_ATTEMPTS,
        ]);
    } catch (PDOException $e) {
        if ((string) $e->getCode() === '23000') {
            $existing = ds_atelier_mail_find_by_key($pdo, $eventKey);
            return [
                'ok' => true,
                'queued' => false,
                'replayed' => true,
                'row' => $existing,
                'code' => 200,
            ];
        }
        throw $e;
    }

    return [
        'ok' => true,
        'queued' => true,
        'replayed' => false,
        'row' => ds_atelier_mail_find_by_key($pdo, $eventKey),
        'code' => 201,
    ];
}

function ds_atelier_mail_find_by_key(PDO $pdo, string $eventKey): ?array
{
    if (!ds_atelier_mail_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM email_outbox WHERE event_key = ? LIMIT 1');
    $stmt->execute([$eventKey]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_mail_queue_order_placed(PDO $pdo, array $config, array $order, array $items, ?array $invoice = null): array
{
    $email = ds_atelier_normalize_email((string) ($order['contact_email'] ?? ''));
    if (!ds_atelier_valid_email($email)) {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Order contact email is invalid.', 'code' => 422];
    }
    $ref = (string) ($order['public_ref'] ?? '');
    $payload = ds_atelier_mail_order_payload($config, $order, $items, $invoice, null);
    $customerId = isset($order['customer_id']) && $order['customer_id'] !== null ? (int) $order['customer_id'] : null;
    return ds_atelier_mail_enqueue(
        $pdo,
        $config,
        DS_ATELIER_MAIL_EVENT_ORDER_PLACED,
        ds_atelier_mail_event_key(DS_ATELIER_MAIL_EVENT_ORDER_PLACED, $ref),
        'order_placed',
        $email,
        $payload,
        (int) $order['id'],
        $customerId
    );
}

function ds_atelier_mail_queue_fulfilment(PDO $pdo, array $config, array $order, array $shipment, string $toStatus): array
{
    $email = ds_atelier_normalize_email((string) ($order['contact_email'] ?? ''));
    if (!ds_atelier_valid_email($email)) {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Order contact email is invalid.', 'code' => 422];
    }
    $ref = (string) ($order['public_ref'] ?? '');
    $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
    $invoice = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
    $eventType = $toStatus === DS_ATELIER_SHIPMENT_STATUS_CANCELLED
        ? DS_ATELIER_MAIL_EVENT_CANCELLED
        : DS_ATELIER_MAIL_EVENT_FULFILMENT;
    $template = $toStatus === DS_ATELIER_SHIPMENT_STATUS_CANCELLED ? 'order_cancelled' : 'fulfilment_update';
    $payload = ds_atelier_mail_order_payload($config, $order, $items, $invoice, $shipment);
    $payload['fulfilment_status'] = $toStatus;
    $customerId = isset($order['customer_id']) && $order['customer_id'] !== null ? (int) $order['customer_id'] : null;
    return ds_atelier_mail_enqueue(
        $pdo,
        $config,
        $eventType,
        ds_atelier_mail_event_key($eventType, $ref, $toStatus),
        $template,
        $email,
        $payload,
        (int) $order['id'],
        $customerId
    );
}

function ds_atelier_mail_queue_password_reset(PDO $pdo, array $config, array $customer, string $rawToken, int $resetId): array
{
    $email = ds_atelier_normalize_email((string) ($customer['email'] ?? ''));
    if (!ds_atelier_valid_email($email) || !preg_match('/^[a-f0-9]{64}$/', $rawToken)) {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Unable to queue a reset email.', 'code' => 422];
    }
    $resetUrl = ds_atelier_mail_public_url($config, 'auth.html', ['token' => $rawToken], 'reset-password');
    if ($resetUrl === '') {
        return ['ok' => false, 'queued' => false, 'replayed' => false, 'error' => 'Application URL is not configured for password-reset email.', 'code' => 503];
    }
    $payload = [
        'customer_name' => (string) ($customer['name'] ?? ''),
        'reset_url' => $resetUrl,
        'expires_minutes' => (int) (DS_ATELIER_RESET_TTL_SECONDS / 60),
    ];
    return ds_atelier_mail_enqueue(
        $pdo,
        $config,
        DS_ATELIER_MAIL_EVENT_PASSWORD_RESET,
        ds_atelier_mail_event_key(DS_ATELIER_MAIL_EVENT_PASSWORD_RESET, (string) $resetId),
        'password_reset',
        $email,
        $payload,
        null,
        (int) $customer['id']
    );
}

function ds_atelier_mail_order_payload(array $config, array $order, array $items, ?array $invoice, ?array $shipment): array
{
    $payment = (string) ($order['payment_status'] ?? '');
    $status = (string) ($order['status'] ?? '');
    $lines = [];
    foreach ($items as $item) {
        $lines[] = [
            'name' => (string) ($item['product_name'] ?? ''),
            'qty' => (int) ($item['quantity'] ?? 0),
            'sku' => (string) ($item['sku'] ?? ''),
            'color' => (string) ($item['colour_name'] ?? ''),
            'size' => (string) ($item['size_code'] ?? ''),
            'line_price' => ds_atelier_money_format(ds_atelier_money_paise($item['line_price'] ?? '0')),
        ];
    }
    $invoicePublic = ds_atelier_invoice_public($invoice);
    $invoiceUrl = '';
    if (is_array($invoicePublic) && isset($invoicePublic['number'])) {
        $invoiceUrl = ds_atelier_mail_public_url($config, 'backend/public/customer/invoice-download.php', [
            'number' => (string) $invoicePublic['number'],
        ]);
    }
    $orderUrl = ds_atelier_mail_public_url($config, 'order-success.html', [
        'ref' => (string) ($order['public_ref'] ?? ''),
    ]);
    $fulfilment = ds_atelier_fulfilment_public($shipment);
    return [
        'order_ref' => (string) ($order['public_ref'] ?? ''),
        'order_date' => (string) ($order['created_at'] ?? ''),
        'order_status' => $status,
        'payment_status' => $payment,
        'payment_pending' => $payment === DS_ATELIER_PAYMENT_STATUS_PENDING,
        'payment_method' => (string) ($order['payment_method'] ?? ''),
        'currency' => (string) ($order['currency'] ?? 'INR'),
        'contact_name' => (string) ($order['contact_name'] ?? ''),
        'item_subtotal' => ds_atelier_money_format(ds_atelier_money_paise($order['item_subtotal'] ?? '0')),
        'discount_total' => ds_atelier_money_format(ds_atelier_money_paise($order['discount_total'] ?? '0')),
        'shipping_total' => ds_atelier_money_format(ds_atelier_money_paise($order['shipping_total'] ?? '0')),
        'tax_total' => ds_atelier_money_format(ds_atelier_money_paise($order['tax_total'] ?? '0')),
        'grand_total' => ds_atelier_money_format(ds_atelier_money_paise($order['grand_total'] ?? '0')),
        'items' => $lines,
        'invoice_number' => is_array($invoicePublic) ? (string) $invoicePublic['number'] : '',
        'invoice_kind' => is_array($invoicePublic) ? (string) $invoicePublic['kind'] : '',
        'invoice_url' => $invoiceUrl,
        'order_url' => $orderUrl,
        'fulfilment_status' => (string) ($fulfilment['status'] ?? DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED),
        'courier_name' => $fulfilment['courierName'],
        'tracking_number' => $fulfilment['trackingNumber'],
        'tracking_url' => $fulfilment['trackingUrl'],
    ];
}

function ds_atelier_mail_claim_batch(PDO $pdo, int $limit = 20): array
{
    if (!ds_atelier_mail_tables_exist($pdo)) {
        return [];
    }
    $limit = max(1, min(50, $limit));
    $token = bin2hex(random_bytes(8));
    $pdo->beginTransaction();
    try {
        $select = $pdo->prepare(
            "SELECT id FROM email_outbox
             WHERE status IN ('pending', 'sending')
               AND next_attempt_at <= NOW()
               AND attempts < max_attempts
               AND (claimed_at IS NULL OR claimed_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE) OR status = 'pending')
             ORDER BY next_attempt_at ASC, id ASC
             LIMIT {$limit}
             FOR UPDATE"
        );
        $select->execute();
        $ids = array_map('intval', $select->fetchAll(PDO::FETCH_COLUMN) ?: []);
        if ($ids === []) {
            $pdo->commit();
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $pdo->prepare(
            "UPDATE email_outbox
             SET status = 'sending', claimed_at = NOW(), claimed_token = ?
             WHERE id IN ($placeholders)"
        )->execute(array_merge([$token], $ids));
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT * FROM email_outbox WHERE id IN ($placeholders) AND claimed_token = ?");
    $stmt->execute(array_merge($ids, [$token]));
    return $stmt->fetchAll() ?: [];
}

function ds_atelier_mail_redact_payload(array $payload): array
{
    if (isset($payload['reset_url']) && is_string($payload['reset_url'])) {
        $payload['reset_url'] = '[redacted]';
    }
    return $payload;
}

function ds_atelier_mail_mark_sent(PDO $pdo, int $id, string $token, ?array $payload = null): void
{
    $encoded = null;
    if (is_array($payload)) {
        $json = json_encode(ds_atelier_mail_redact_payload($payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (is_string($json)) {
            $encoded = $json;
        }
    }
    if ($encoded !== null) {
        $pdo->prepare(
            "UPDATE email_outbox
             SET status = 'sent', sent_at = NOW(), last_error = NULL, claimed_at = NULL, claimed_token = NULL, attempts = attempts + 1, payload_json = ?
             WHERE id = ? AND claimed_token = ?"
        )->execute([$encoded, $id, $token]);
        return;
    }
    $pdo->prepare(
        "UPDATE email_outbox
         SET status = 'sent', sent_at = NOW(), last_error = NULL, claimed_at = NULL, claimed_token = NULL, attempts = attempts + 1
         WHERE id = ? AND claimed_token = ?"
    )->execute([$id, $token]);
}

function ds_atelier_mail_mark_failure(PDO $pdo, array $row, string $error, bool $retryable): void
{
    $attempts = (int) $row['attempts'] + 1;
    $max = (int) $row['max_attempts'];
    $permanent = !$retryable || $attempts >= $max;
    $status = $permanent ? 'failed' : 'pending';
    $next = $permanent ? null : gmdate('Y-m-d H:i:s', time() + ds_atelier_mail_backoff_seconds($attempts));
    $pdo->prepare(
        "UPDATE email_outbox
         SET status = ?, attempts = ?, last_error = ?, next_attempt_at = COALESCE(?, next_attempt_at), claimed_at = NULL, claimed_token = NULL
         WHERE id = ?"
    )->execute([
        $status,
        $attempts,
        ds_atelier_mail_redact_error($error),
        $next,
        (int) $row['id'],
    ]);
}

function ds_atelier_mail_process_row(PDO $pdo, array $config, array $row): array
{
    $payload = json_decode((string) ($row['payload_json'] ?? ''), true);
    if (!is_array($payload)) {
        ds_atelier_mail_mark_failure($pdo, $row, 'Invalid email payload.', false);
        return ['ok' => false, 'sent' => false, 'retryable' => false];
    }
    $rendered = ds_atelier_mail_render((string) $row['template'], $payload, $config);
    if (($rendered['ok'] ?? false) !== true) {
        ds_atelier_mail_mark_failure($pdo, $row, (string) ($rendered['error'] ?? 'Unable to render email.'), false);
        return ['ok' => false, 'sent' => false, 'retryable' => false];
    }
    $sent = ds_atelier_mail_send($config, [
        'to' => (string) $row['recipient_email'],
        'subject' => $rendered['subject'],
        'text' => $rendered['text'],
        'html' => $rendered['html'],
    ]);
    if (($sent['ok'] ?? false) === true && ($sent['accepted'] ?? false) === true) {
        ds_atelier_mail_mark_sent($pdo, (int) $row['id'], (string) $row['claimed_token'], $payload);
        return ['ok' => true, 'sent' => true, 'real' => (bool) ($sent['real'] ?? false)];
    }
    $retryable = (bool) ($sent['retryable'] ?? false);
    ds_atelier_mail_mark_failure($pdo, $row, (string) ($sent['error'] ?? 'Delivery was not accepted.'), $retryable);
    ds_atelier_log('error', 'Email delivery failed for event ' . (string) $row['event_type'], $config);
    return ['ok' => false, 'sent' => false, 'retryable' => $retryable];
}

function ds_atelier_mail_process_queue(PDO $pdo, array $config, int $limit = 20): array
{
    $claimed = ds_atelier_mail_claim_batch($pdo, $limit);
    $sent = 0;
    $failed = 0;
    foreach ($claimed as $row) {
        $result = ds_atelier_mail_process_row($pdo, $config, $row);
        if (($result['sent'] ?? false) === true) {
            $sent++;
        } else {
            $failed++;
        }
    }
    return [
        'ok' => true,
        'claimed' => count($claimed),
        'sent' => $sent,
        'failed' => $failed,
    ];
}

function ds_atelier_mail_purge_orders(PDO $pdo, array $orderIds): void
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === [] || !ds_atelier_mail_tables_exist($pdo)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $pdo->prepare("DELETE FROM email_outbox WHERE order_id IN ($placeholders)")->execute($orderIds);
}

function ds_atelier_mail_purge_customers(PDO $pdo, array $customerIds): void
{
    $customerIds = array_values(array_unique(array_filter(array_map('intval', $customerIds))));
    if ($customerIds === [] || !ds_atelier_mail_tables_exist($pdo)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($customerIds), '?'));
    $pdo->prepare("DELETE FROM email_outbox WHERE customer_id IN ($placeholders) AND order_id IS NULL")->execute($customerIds);
}
