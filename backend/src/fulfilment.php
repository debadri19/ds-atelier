<?php

declare(strict_types=1);

const DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED = 'unfulfilled';
const DS_ATELIER_SHIPMENT_STATUS_PROCESSING = 'processing';
const DS_ATELIER_SHIPMENT_STATUS_DISPATCHED = 'dispatched';
const DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT = 'in_transit';
const DS_ATELIER_SHIPMENT_STATUS_DELIVERED = 'delivered';
const DS_ATELIER_SHIPMENT_STATUS_CANCELLED = 'cancelled';
const DS_ATELIER_SHIPMENT_STATUSES = [
    DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED,
    DS_ATELIER_SHIPMENT_STATUS_PROCESSING,
    DS_ATELIER_SHIPMENT_STATUS_DISPATCHED,
    DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT,
    DS_ATELIER_SHIPMENT_STATUS_DELIVERED,
    DS_ATELIER_SHIPMENT_STATUS_CANCELLED,
];
const DS_ATELIER_SHIPMENT_TRANSITIONS = [
    DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED => [
        DS_ATELIER_SHIPMENT_STATUS_PROCESSING,
        DS_ATELIER_SHIPMENT_STATUS_CANCELLED,
    ],
    DS_ATELIER_SHIPMENT_STATUS_PROCESSING => [
        DS_ATELIER_SHIPMENT_STATUS_DISPATCHED,
        DS_ATELIER_SHIPMENT_STATUS_CANCELLED,
    ],
    DS_ATELIER_SHIPMENT_STATUS_DISPATCHED => [
        DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT,
        DS_ATELIER_SHIPMENT_STATUS_DELIVERED,
    ],
    DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT => [
        DS_ATELIER_SHIPMENT_STATUS_DELIVERED,
    ],
    DS_ATELIER_SHIPMENT_STATUS_DELIVERED => [],
    DS_ATELIER_SHIPMENT_STATUS_CANCELLED => [],
];

function ds_atelier_fulfilment_missing_table(PDOException $e): bool
{
    $code = (string) $e->getCode();
    if ($code === '42S02' || $code === '42S22') {
        return true;
    }
    $message = strtolower($e->getMessage());
    return str_contains($message, "doesn't exist") || str_contains($message, 'unknown table');
}

function ds_atelier_fulfilment_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM shipments LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_fulfilment_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_fulfilment_can_transition(string $from, string $to): bool
{
    if ($from === $to) {
        return false;
    }
    $allowed = DS_ATELIER_SHIPMENT_TRANSITIONS[$from] ?? [];
    return in_array($to, $allowed, true);
}

function ds_atelier_fulfilment_order_status_for_shipment(string $shipmentStatus, string $paymentStatus): string
{
    if ($shipmentStatus === DS_ATELIER_SHIPMENT_STATUS_CANCELLED) {
        return DS_ATELIER_ORDER_STATUS_CANCELLED;
    }
    if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_PENDING) {
        return DS_ATELIER_ORDER_STATUS_PENDING_PAYMENT;
    }
    if ($shipmentStatus === DS_ATELIER_SHIPMENT_STATUS_DELIVERED) {
        return DS_ATELIER_ORDER_STATUS_DELIVERED;
    }
    if (
        $shipmentStatus === DS_ATELIER_SHIPMENT_STATUS_DISPATCHED
        || $shipmentStatus === DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT
    ) {
        return DS_ATELIER_ORDER_STATUS_SHIPPED;
    }
    if ($shipmentStatus === DS_ATELIER_SHIPMENT_STATUS_PROCESSING) {
        return DS_ATELIER_ORDER_STATUS_PROCESSING;
    }
    if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_PAID) {
        return DS_ATELIER_ORDER_STATUS_PENDING;
    }
    return DS_ATELIER_ORDER_STATUS_PENDING_PAYMENT;
}

function ds_atelier_fulfilment_normalize_text(mixed $value, int $max, bool $required = false): array
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    if ($text === '') {
        return ['ok' => !$required, 'value' => null, 'error' => $required ? 'This field is required.' : null];
    }
    if (mb_strlen($text) > $max) {
        return ['ok' => false, 'value' => $text, 'error' => 'This value is too long.'];
    }
    return ['ok' => true, 'value' => $text, 'error' => null];
}

function ds_atelier_fulfilment_parse_tracking_url(mixed $value): array
{
    $raw = trim((string) $value);
    if ($raw === '') {
        return ['ok' => true, 'value' => null];
    }
    if (strlen($raw) > 500) {
        return ['ok' => false, 'error' => 'Tracking URL is too long.'];
    }
    if (filter_var($raw, FILTER_VALIDATE_URL) === false) {
        return ['ok' => false, 'error' => 'Enter a valid tracking URL.'];
    }
    $parts = parse_url($raw);
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    if ($scheme !== 'https' && $scheme !== 'http') {
        return ['ok' => false, 'error' => 'Enter a valid tracking URL.'];
    }
    if ($scheme !== 'https') {
        return ['ok' => false, 'error' => 'Tracking URL must use HTTPS.'];
    }
    $host = strtolower((string) ($parts['host'] ?? ''));
    if ($host === '' || $host === 'localhost' || str_ends_with($host, '.local')) {
        return ['ok' => false, 'error' => 'Enter a valid tracking URL.'];
    }
    return ['ok' => true, 'value' => $raw];
}

function ds_atelier_fulfilment_parse_status(mixed $value): string
{
    $status = strtolower(trim((string) $value));
    return in_array($status, DS_ATELIER_SHIPMENT_STATUSES, true) ? $status : '';
}

function ds_atelier_fulfilment_empty_public(): array
{
    return [
        'status' => DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED,
        'courierName' => null,
        'trackingNumber' => null,
        'trackingUrl' => null,
        'dispatchedAt' => null,
        'deliveredAt' => null,
        'updatedAt' => null,
    ];
}

function ds_atelier_fulfilment_public(?array $shipment): array
{
    if ($shipment === null) {
        return ds_atelier_fulfilment_empty_public();
    }
    $status = (string) ($shipment['status'] ?? DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED);
    $courier = $shipment['courier_name'] ?? null;
    $trackingNumber = $shipment['tracking_number'] ?? null;
    $trackingUrl = $shipment['tracking_url'] ?? null;
    $hasTracking = is_string($trackingNumber) && $trackingNumber !== '';
    return [
        'status' => $status,
        'courierName' => is_string($courier) && $courier !== '' ? $courier : null,
        'trackingNumber' => $hasTracking ? $trackingNumber : null,
        'trackingUrl' => $hasTracking && is_string($trackingUrl) && $trackingUrl !== '' ? $trackingUrl : null,
        'dispatchedAt' => $shipment['dispatched_at'] ?? null,
        'deliveredAt' => $shipment['delivered_at'] ?? null,
        'updatedAt' => $shipment['updated_at'] ?? null,
    ];
}

function ds_atelier_fulfilment_find_by_order(PDO $pdo, int $orderId): ?array
{
    if ($orderId < 1 || !ds_atelier_fulfilment_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM shipments WHERE order_id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_fulfilment_map_for_orders(PDO $pdo, array $orderIds): array
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === [] || !ds_atelier_fulfilment_tables_exist($pdo)) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare("SELECT * FROM shipments WHERE order_id IN ($placeholders)");
    $stmt->execute($orderIds);
    $out = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $out[(int) $row['order_id']] = $row;
    }
    return $out;
}

function ds_atelier_fulfilment_ensure_row(PDO $pdo, int $orderId): array
{
    $existing = ds_atelier_fulfilment_find_by_order($pdo, $orderId);
    if ($existing !== null) {
        return $existing;
    }
    $pdo->prepare(
        'INSERT INTO shipments (order_id, status) VALUES (?, ?)'
    )->execute([$orderId, DS_ATELIER_SHIPMENT_STATUS_UNFULFILLED]);
    $created = ds_atelier_fulfilment_find_by_order($pdo, $orderId);
    if ($created === null) {
        throw new RuntimeException('Unable to create shipment row.');
    }
    return $created;
}

function ds_atelier_fulfilment_record_event(
    PDO $pdo,
    int $shipmentId,
    int $orderId,
    ?string $fromStatus,
    string $toStatus,
    ?string $courier,
    ?string $trackingNumber,
    ?string $note
): void {
    $pdo->prepare(
        'INSERT INTO shipment_events (
            shipment_id, order_id, from_status, to_status, courier_name, tracking_number, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $shipmentId,
        $orderId,
        $fromStatus,
        $toStatus,
        $courier,
        $trackingNumber,
        $note,
    ]);
}

function ds_atelier_fulfilment_apply_locked(
    PDO $pdo,
    array $order,
    string $toStatus,
    array $input,
    array $config = []
): array {
    $orderId = (int) $order['id'];
    $shipment = ds_atelier_fulfilment_ensure_row($pdo, $orderId);
    $fromStatus = (string) $shipment['status'];
    if ($fromStatus === $toStatus) {
        return ['ok' => false, 'error' => 'That fulfilment update has already been applied.', 'code' => 409];
    }
    if (!ds_atelier_fulfilment_can_transition($fromStatus, $toStatus)) {
        return ['ok' => false, 'error' => 'That fulfilment status change is not allowed.', 'code' => 409];
    }

    $paymentStatus = (string) $order['payment_status'];
    if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_PENDING && $toStatus !== DS_ATELIER_SHIPMENT_STATUS_CANCELLED) {
        return ['ok' => false, 'error' => 'Payment has not been verified for this order.', 'code' => 409];
    }
    if ($paymentStatus === DS_ATELIER_PAYMENT_STATUS_FAILED) {
        return ['ok' => false, 'error' => 'This order cannot be fulfilled.', 'code' => 409];
    }

    $courier = ds_atelier_fulfilment_normalize_text($input['courierName'] ?? $input['courier_name'] ?? $shipment['courier_name'] ?? '', 80);
    if ($courier['ok'] !== true) {
        return ['ok' => false, 'error' => $courier['error'] ?? 'Enter a valid courier name.', 'code' => 422];
    }
    $trackingNumber = ds_atelier_fulfilment_normalize_text(
        $input['trackingNumber'] ?? $input['tracking_number'] ?? $shipment['tracking_number'] ?? '',
        80
    );
    if ($trackingNumber['ok'] !== true) {
        return ['ok' => false, 'error' => $trackingNumber['error'] ?? 'Enter a valid tracking number.', 'code' => 422];
    }
    $trackingUrl = ds_atelier_fulfilment_parse_tracking_url($input['trackingUrl'] ?? $input['tracking_url'] ?? $shipment['tracking_url'] ?? '');
    if ($trackingUrl['ok'] !== true) {
        return ['ok' => false, 'error' => $trackingUrl['error'] ?? 'Enter a valid tracking URL.', 'code' => 422];
    }
    $notes = ds_atelier_fulfilment_normalize_text($input['notes'] ?? $input['note'] ?? '', 255);
    if ($notes['ok'] !== true) {
        return ['ok' => false, 'error' => $notes['error'] ?? 'Fulfilment notes are too long.', 'code' => 422];
    }

    $needsTracking = in_array($toStatus, [
        DS_ATELIER_SHIPMENT_STATUS_DISPATCHED,
        DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT,
        DS_ATELIER_SHIPMENT_STATUS_DELIVERED,
    ], true);
    if ($needsTracking && ($courier['value'] === null || $trackingNumber['value'] === null)) {
        return ['ok' => false, 'error' => 'Courier name and tracking number are required before dispatch.', 'code' => 422];
    }

    $dispatchedAt = $shipment['dispatched_at'] ?? null;
    $deliveredAt = $shipment['delivered_at'] ?? null;
    if (
        $toStatus === DS_ATELIER_SHIPMENT_STATUS_DISPATCHED
        || $toStatus === DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT
        || $toStatus === DS_ATELIER_SHIPMENT_STATUS_DELIVERED
    ) {
        if ($dispatchedAt === null) {
            $dispatchedAt = gmdate('Y-m-d H:i:s');
        }
    }
    if ($toStatus === DS_ATELIER_SHIPMENT_STATUS_DELIVERED) {
        $deliveredAt = gmdate('Y-m-d H:i:s');
    }

    $update = $pdo->prepare(
        'UPDATE shipments
         SET status = ?, courier_name = ?, tracking_number = ?, tracking_url = ?, dispatched_at = ?, delivered_at = ?, notes = ?
         WHERE id = ? AND status = ?'
    );
    $update->execute([
        $toStatus,
        $courier['value'],
        $trackingNumber['value'],
        $trackingUrl['value'],
        $dispatchedAt,
        $deliveredAt,
        $notes['value'],
        (int) $shipment['id'],
        $fromStatus,
    ]);
    if ($update->rowCount() !== 1) {
        return ['ok' => false, 'error' => 'Unable to update fulfilment.', 'code' => 409];
    }

    ds_atelier_fulfilment_record_event(
        $pdo,
        (int) $shipment['id'],
        $orderId,
        $fromStatus,
        $toStatus,
        $courier['value'],
        $trackingNumber['value'],
        $notes['value']
    );

    $nextOrderStatus = ds_atelier_fulfilment_order_status_for_shipment($toStatus, $paymentStatus);
    $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$nextOrderStatus, $orderId]);

    $updated = ds_atelier_fulfilment_find_by_order($pdo, $orderId);
    if ($config !== [] && is_array($updated)) {
        $order['status'] = $nextOrderStatus;
        try {
            ds_atelier_mail_queue_fulfilment($pdo, $config, $order, $updated, $toStatus);
        } catch (Throwable $e) {
            ds_atelier_log('error', 'Fulfilment email was not queued', $config);
        }
    }
    return [
        'ok' => true,
        'shipment' => $updated,
        'order_status' => $nextOrderStatus,
        'code' => 200,
    ];
}

function ds_atelier_fulfilment_apply(PDO $pdo, array $order, string $toStatus, array $input, array $config = []): array
{
    if (!ds_atelier_fulfilment_tables_exist($pdo)) {
        return ['ok' => false, 'error' => 'Fulfilment is not available.', 'code' => 503];
    }
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $lock = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE');
        $lock->execute([(int) $order['id']]);
        $locked = $lock->fetch();
        if ($locked === false) {
            if ($own) {
                $pdo->rollBack();
            }
            return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
        }
        $result = ds_atelier_fulfilment_apply_locked($pdo, $locked, $toStatus, $input, $config);
        if (($result['ok'] ?? false) !== true) {
            if ($own && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return $result;
        }
        if ($own) {
            $pdo->commit();
        }
        return $result;
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function ds_atelier_fulfilment_admin_update(PDO $pdo, array $config, array $input): array
{
    $guard = ds_atelier_admin_require();
    if (($guard['ok'] ?? false) !== true) {
        return $guard;
    }
    $ref = ds_atelier_checkout_parse_ref($input['ref'] ?? $input['orderRef'] ?? $input['id'] ?? '');
    if ($ref === '') {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $status = ds_atelier_fulfilment_parse_status($input['status'] ?? $input['shipmentStatus'] ?? '');
    if ($status === '') {
        return ['ok' => false, 'error' => 'Select a valid fulfilment status.', 'code' => 422];
    }
    $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    if ($order === null) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    return ds_atelier_fulfilment_apply($pdo, $order, $status, $input, $config);
}

function ds_atelier_fulfilment_purge_orders(PDO $pdo, array $orderIds): void
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === [] || !ds_atelier_fulfilment_tables_exist($pdo)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $pdo->prepare("DELETE FROM shipment_events WHERE order_id IN ($placeholders)")->execute($orderIds);
    $pdo->prepare("DELETE FROM shipments WHERE order_id IN ($placeholders)")->execute($orderIds);
}
