<?php

declare(strict_types=1);

const DS_ATELIER_INVENTORY_STATUS_RESERVED = 'reserved';
const DS_ATELIER_INVENTORY_STATUS_COMMITTED = 'committed';
const DS_ATELIER_INVENTORY_STATUS_RELEASED = 'released';
const DS_ATELIER_INVENTORY_KIND_RESERVE = 'reserve';
const DS_ATELIER_INVENTORY_KIND_COMMIT = 'commit';
const DS_ATELIER_INVENTORY_KIND_RELEASE = 'release';
const DS_ATELIER_INVENTORY_KIND_EXPIRE = 'expire';
const DS_ATELIER_INVENTORY_KIND_RETURN = 'return';
const DS_ATELIER_INVENTORY_RESERVATION_TTL = 900;

function ds_atelier_inventory_missing_table(PDOException $e): bool
{
    $code = (string) $e->getCode();
    if ($code === '42S02' || $code === '42S22') {
        return true;
    }
    $message = strtolower($e->getMessage());
    return str_contains($message, "doesn't exist") || str_contains($message, 'unknown table');
}

function ds_atelier_inventory_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM inventory_reservations LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_inventory_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_inventory_tracks(array $product): bool
{
    return (string) ($product['availability'] ?? '') !== 'Made to order';
}

function ds_atelier_inventory_utc_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('UTC'));
}

function ds_atelier_inventory_expires_at(?DateTimeImmutable $from = null): string
{
    $from = $from ?? ds_atelier_inventory_utc_now();
    return $from->modify('+' . DS_ATELIER_INVENTORY_RESERVATION_TTL . ' seconds')->format('Y-m-d H:i:s');
}

function ds_atelier_inventory_held_map(PDO $pdo, array $variantIds): array
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $variantIds), static fn (int $id): bool => $id > 0)));
    if ($ids === []) {
        return [];
    }
    if (!ds_atelier_inventory_tables_exist($pdo)) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT variant_id,
                COALESCE(SUM(CASE
                    WHEN status = '" . DS_ATELIER_INVENTORY_STATUS_RESERVED . "'
                         AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
                    THEN quantity ELSE 0 END), 0) AS reserved_qty,
                COALESCE(SUM(CASE
                    WHEN status = '" . DS_ATELIER_INVENTORY_STATUS_COMMITTED . "'
                    THEN quantity ELSE 0 END), 0) AS committed_qty
         FROM inventory_reservations
         WHERE variant_id IN ($placeholders)
           AND status IN (?, ?)
         GROUP BY variant_id"
    );
    $stmt->execute([...$ids, DS_ATELIER_INVENTORY_STATUS_RESERVED, DS_ATELIER_INVENTORY_STATUS_COMMITTED]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $out[(int) $row['variant_id']] = [
            'reserved' => (int) $row['reserved_qty'],
            'committed' => (int) $row['committed_qty'],
        ];
    }
    return $out;
}

function ds_atelier_inventory_decorate_variant(array $row, array $held): array
{
    $onHand = (int) ($row['on_hand'] ?? $row['stock'] ?? 0);
    $reserved = (int) ($held['reserved'] ?? 0);
    $committed = (int) ($held['committed'] ?? 0);
    $available = max(0, $onHand - $reserved - $committed);
    $row['on_hand'] = $onHand;
    $row['reserved'] = $reserved;
    $row['committed'] = $committed;
    $row['available'] = $available;
    $row['stock'] = $available;
    return $row;
}

function ds_atelier_inventory_decorate_variants(PDO $pdo, array $rows): array
{
    if ($rows === []) {
        return [];
    }
    $ids = [];
    foreach ($rows as $row) {
        $ids[] = (int) ($row['id'] ?? $row['variant_id'] ?? 0);
    }
    $held = ds_atelier_inventory_held_map($pdo, $ids);
    $out = [];
    foreach ($rows as $row) {
        $id = (int) ($row['id'] ?? $row['variant_id'] ?? 0);
        $out[] = ds_atelier_inventory_decorate_variant($row, $held[$id] ?? []);
    }
    return $out;
}

function ds_atelier_inventory_available(array $product, array $variant): int
{
    if (!ds_atelier_inventory_tracks($product)) {
        return DS_ATELIER_CART_QTY_MAX;
    }
    if (array_key_exists('available', $variant)) {
        return max(0, (int) $variant['available']);
    }
    $onHand = (int) ($variant['on_hand'] ?? $variant['stock'] ?? 0);
    $reserved = (int) ($variant['reserved'] ?? 0);
    $committed = (int) ($variant['committed'] ?? 0);
    return max(0, $onHand - $reserved - $committed);
}

function ds_atelier_inventory_lock_variant(PDO $pdo, int $variantId): ?array
{
    $stmt = $pdo->prepare('SELECT id, stock FROM product_variants WHERE id = ? LIMIT 1 FOR UPDATE');
    $stmt->execute([$variantId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_inventory_snapshot_locked(PDO $pdo, int $variantId): ?array
{
    $row = ds_atelier_inventory_lock_variant($pdo, $variantId);
    if ($row === null) {
        return null;
    }
    $held = ds_atelier_inventory_held_map($pdo, [$variantId]);
    return ds_atelier_inventory_decorate_variant($row, $held[$variantId] ?? []);
}

function ds_atelier_inventory_record_movement(
    PDO $pdo,
    int $variantId,
    ?int $reservationId,
    ?int $orderId,
    int $quantity,
    string $kind,
    array $before,
    array $after,
    ?string $note = null
): void {
    $stmt = $pdo->prepare(
        'INSERT INTO inventory_movements (
            variant_id, reservation_id, order_id, quantity, kind,
            on_hand_before, on_hand_after, available_before, available_after, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $variantId,
        $reservationId,
        $orderId,
        $quantity,
        $kind,
        (int) ($before['on_hand'] ?? 0),
        (int) ($after['on_hand'] ?? 0),
        (int) ($before['available'] ?? 0),
        (int) ($after['available'] ?? 0),
        $note,
    ]);
}

function ds_atelier_inventory_expire_stale(PDO $pdo, ?int $variantId = null): int
{
    if (!ds_atelier_inventory_tables_exist($pdo)) {
        return 0;
    }
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $findSql = 'SELECT DISTINCT variant_id
                    FROM inventory_reservations
                    WHERE status = ?
                      AND expires_at IS NOT NULL
                      AND expires_at <= UTC_TIMESTAMP()';
        $findParams = [DS_ATELIER_INVENTORY_STATUS_RESERVED];
        if ($variantId !== null && $variantId > 0) {
            $findSql .= ' AND variant_id = ?';
            $findParams[] = $variantId;
        }
        $find = $pdo->prepare($findSql);
        $find->execute($findParams);
        $ids = array_map('intval', $find->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $ids = array_values(array_filter($ids, static fn (int $id): bool => $id > 0));
        sort($ids, SORT_NUMERIC);
        foreach ($ids as $vid) {
            ds_atelier_inventory_lock_variant($pdo, $vid);
        }
        if ($ids === []) {
            if ($own) {
                $pdo->commit();
            }
            return 0;
        }

        $sql = 'SELECT id, variant_id, order_id, quantity
                FROM inventory_reservations
                WHERE status = ?
                  AND expires_at IS NOT NULL
                  AND expires_at <= UTC_TIMESTAMP()';
        $params = [DS_ATELIER_INVENTORY_STATUS_RESERVED];
        if ($variantId !== null && $variantId > 0) {
            $sql .= ' AND variant_id = ?';
            $params[] = $variantId;
        }
        $sql .= ' ORDER BY variant_id ASC, id ASC FOR UPDATE';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        $released = 0;
        $locked = [];
        foreach ($rows as $row) {
            $vid = (int) $row['variant_id'];
            if (!isset($locked[$vid])) {
                $held = ds_atelier_inventory_held_map($pdo, [$vid]);
                $onHand = 0;
                $lockedRow = $pdo->prepare('SELECT id, stock FROM product_variants WHERE id = ? LIMIT 1');
                $lockedRow->execute([$vid]);
                $variant = $lockedRow->fetch();
                if (!$variant) {
                    continue;
                }
                $onHand = (int) $variant['stock'];
                $locked[$vid] = ds_atelier_inventory_decorate_variant(
                    ['id' => $vid, 'stock' => $onHand],
                    $held[$vid] ?? []
                );
            }
            $before = $locked[$vid];
            $pdo->prepare(
                'UPDATE inventory_reservations
                 SET status = ?, expires_at = NULL
                 WHERE id = ? AND status = ?'
            )->execute([
                DS_ATELIER_INVENTORY_STATUS_RELEASED,
                (int) $row['id'],
                DS_ATELIER_INVENTORY_STATUS_RESERVED,
            ]);
            $after = ds_atelier_inventory_decorate_variant(
                ['id' => $vid, 'stock' => (int) $before['on_hand']],
                ds_atelier_inventory_held_map($pdo, [$vid])[$vid] ?? []
            );
            ds_atelier_inventory_record_movement(
                $pdo,
                $vid,
                (int) $row['id'],
                (int) $row['order_id'],
                (int) $row['quantity'],
                DS_ATELIER_INVENTORY_KIND_EXPIRE,
                $before,
                $after,
                'expired reservation'
            );
            $locked[$vid] = $after;
            $released++;
        }
        if ($own) {
            $pdo->commit();
        }
        return $released;
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function ds_atelier_inventory_reserve_order(PDO $pdo, int $orderId, array $items): array
{
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        $result = ds_atelier_inventory_reserve_order_locked($pdo, $orderId, $items);
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

function ds_atelier_inventory_reserve_order_locked(PDO $pdo, int $orderId, array $items): array
{
    if (!ds_atelier_inventory_tables_exist($pdo)) {
        return ['ok' => true, 'reserved' => 0, 'skipped' => true];
    }
    $tracked = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $availability = (string) ($item['availability'] ?? '');
        if ($availability === 'Made to order') {
            continue;
        }
        $variantId = (int) ($item['variantId'] ?? $item['variant_id'] ?? 0);
        $qty = (int) ($item['qty'] ?? $item['quantity'] ?? 0);
        $orderItemId = (int) ($item['orderItemId'] ?? $item['order_item_id'] ?? 0);
        if ($variantId < 1 || $qty < 1 || $orderItemId < 1) {
            return ['ok' => false, 'error' => 'Unable to reserve inventory for this order.', 'code' => 409];
        }
        $tracked[] = [
            'variant_id' => $variantId,
            'qty' => $qty,
            'order_item_id' => $orderItemId,
            'product_id' => (string) ($item['id'] ?? $item['productId'] ?? ''),
        ];
    }
    if ($tracked === []) {
        return ['ok' => true, 'reserved' => 0];
    }

    $variantIds = array_values(array_unique(array_map(static fn (array $row): int => $row['variant_id'], $tracked)));
    sort($variantIds, SORT_NUMERIC);
    foreach ($variantIds as $variantId) {
        ds_atelier_inventory_expire_stale($pdo, $variantId);
    }

    $snapshots = [];
    foreach ($variantIds as $variantId) {
        $snap = ds_atelier_inventory_snapshot_locked($pdo, $variantId);
        if ($snap === null) {
            return ['ok' => false, 'error' => 'This item is no longer available.', 'code' => 409];
        }
        $snapshots[$variantId] = $snap;
    }

    $unavailable = [];
    $needed = [];
    foreach ($tracked as $row) {
        $needed[$row['variant_id']] = ($needed[$row['variant_id']] ?? 0) + $row['qty'];
    }
    foreach ($needed as $variantId => $qty) {
        $available = (int) ($snapshots[$variantId]['available'] ?? 0);
        if ($qty > $available) {
            $unavailable[] = [
                'variantId' => $variantId,
                'issues' => $available < 1 ? ['out_of_stock'] : ['insufficient_stock'],
            ];
        }
    }
    if ($unavailable !== []) {
        return [
            'ok' => false,
            'error' => 'Some items are out of stock.',
            'code' => 409,
            'unavailable' => $unavailable,
        ];
    }

    $insert = $pdo->prepare(
        'INSERT INTO inventory_reservations (
            variant_id, order_id, order_item_id, quantity, status, expires_at
         ) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $expires = ds_atelier_inventory_expires_at();
    $count = 0;
    foreach ($tracked as $row) {
        $variantId = $row['variant_id'];
        $before = $snapshots[$variantId];
        try {
            $insert->execute([
                $variantId,
                $orderId,
                $row['order_item_id'],
                $row['qty'],
                DS_ATELIER_INVENTORY_STATUS_RESERVED,
                $expires,
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                continue;
            }
            throw $e;
        }
        $reservationId = (int) $pdo->lastInsertId();
        $afterHeld = ds_atelier_inventory_held_map($pdo, [$variantId])[$variantId] ?? [];
        $after = ds_atelier_inventory_decorate_variant(
            ['id' => $variantId, 'stock' => (int) $before['on_hand']],
            $afterHeld
        );
        ds_atelier_inventory_record_movement(
            $pdo,
            $variantId,
            $reservationId,
            $orderId,
            $row['qty'],
            DS_ATELIER_INVENTORY_KIND_RESERVE,
            $before,
            $after,
            'checkout place'
        );
        $snapshots[$variantId] = $after;
        $count++;
    }

    return ['ok' => true, 'reserved' => $count];
}

function ds_atelier_inventory_order_reservations(PDO $pdo, int $orderId, bool $forUpdate = false): array
{
    $sql = 'SELECT id, variant_id, order_id, order_item_id, quantity, status, expires_at
            FROM inventory_reservations
            WHERE order_id = ?
            ORDER BY variant_id ASC, id ASC';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$orderId]);
    return $stmt->fetchAll() ?: [];
}

function ds_atelier_inventory_commit_order(PDO $pdo, int $orderId): array
{
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        if (!ds_atelier_inventory_tables_exist($pdo)) {
            if ($own) {
                $pdo->commit();
            }
            return ['ok' => true, 'committed' => 0, 'skipped' => true];
        }
        $preview = ds_atelier_inventory_order_reservations($pdo, $orderId, false);
        $variantIds = [];
        foreach ($preview as $row) {
            $variantIds[(int) $row['variant_id']] = true;
        }
        $ids = array_keys($variantIds);
        sort($ids, SORT_NUMERIC);
        foreach ($ids as $variantId) {
            ds_atelier_inventory_expire_stale($pdo, $variantId);
            ds_atelier_inventory_lock_variant($pdo, $variantId);
        }
        $rows = ds_atelier_inventory_order_reservations($pdo, $orderId, true);
        if ($rows === []) {
            if ($own) {
                $pdo->commit();
            }
            return ['ok' => true, 'committed' => 0];
        }
        $committed = 0;
        foreach ($rows as $row) {
            $status = (string) $row['status'];
            if ($status === DS_ATELIER_INVENTORY_STATUS_COMMITTED) {
                $committed++;
                continue;
            }
            if ($status !== DS_ATELIER_INVENTORY_STATUS_RESERVED) {
                if ($own && $pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                return ['ok' => false, 'error' => 'Inventory is no longer reserved for this order.', 'code' => 409];
            }
            $variantId = (int) $row['variant_id'];
            $before = ds_atelier_inventory_snapshot_locked($pdo, $variantId);
            if ($before === null) {
                if ($own && $pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                return ['ok' => false, 'error' => 'This item is no longer available.', 'code' => 409];
            }
            $pdo->prepare(
                'UPDATE inventory_reservations
                 SET status = ?, expires_at = NULL
                 WHERE id = ? AND status = ?'
            )->execute([
                DS_ATELIER_INVENTORY_STATUS_COMMITTED,
                (int) $row['id'],
                DS_ATELIER_INVENTORY_STATUS_RESERVED,
            ]);
            $after = ds_atelier_inventory_decorate_variant(
                ['id' => $variantId, 'stock' => (int) $before['on_hand']],
                ds_atelier_inventory_held_map($pdo, [$variantId])[$variantId] ?? []
            );
            ds_atelier_inventory_record_movement(
                $pdo,
                $variantId,
                (int) $row['id'],
                $orderId,
                (int) $row['quantity'],
                DS_ATELIER_INVENTORY_KIND_COMMIT,
                $before,
                $after,
                'payment captured'
            );
            $committed++;
        }
        if ($own) {
            $pdo->commit();
        }
        return ['ok' => true, 'committed' => $committed];
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function ds_atelier_inventory_release_order(PDO $pdo, int $orderId, string $reason = 'release'): array
{
    $kind = $reason === 'return' ? DS_ATELIER_INVENTORY_KIND_RETURN : DS_ATELIER_INVENTORY_KIND_RELEASE;
    $own = !$pdo->inTransaction();
    if ($own) {
        $pdo->beginTransaction();
    }
    try {
        if (!ds_atelier_inventory_tables_exist($pdo)) {
            if ($own) {
                $pdo->commit();
            }
            return ['ok' => true, 'released' => 0, 'skipped' => true];
        }
        $preview = ds_atelier_inventory_order_reservations($pdo, $orderId, false);
        $variantIds = [];
        foreach ($preview as $row) {
            $variantIds[(int) $row['variant_id']] = true;
        }
        $ids = array_keys($variantIds);
        sort($ids, SORT_NUMERIC);
        foreach ($ids as $variantId) {
            ds_atelier_inventory_lock_variant($pdo, $variantId);
        }
        $rows = ds_atelier_inventory_order_reservations($pdo, $orderId, true);
        $released = 0;
        foreach ($rows as $row) {
            $status = (string) $row['status'];
            if ($status === DS_ATELIER_INVENTORY_STATUS_RELEASED) {
                continue;
            }
            if (
                $status !== DS_ATELIER_INVENTORY_STATUS_RESERVED
                && $status !== DS_ATELIER_INVENTORY_STATUS_COMMITTED
            ) {
                continue;
            }
            $variantId = (int) $row['variant_id'];
            $before = ds_atelier_inventory_snapshot_locked($pdo, $variantId);
            if ($before === null) {
                continue;
            }
            $pdo->prepare(
                'UPDATE inventory_reservations
                 SET status = ?, expires_at = NULL
                 WHERE id = ? AND status IN (?, ?)'
            )->execute([
                DS_ATELIER_INVENTORY_STATUS_RELEASED,
                (int) $row['id'],
                DS_ATELIER_INVENTORY_STATUS_RESERVED,
                DS_ATELIER_INVENTORY_STATUS_COMMITTED,
            ]);
            $after = ds_atelier_inventory_decorate_variant(
                ['id' => $variantId, 'stock' => (int) $before['on_hand']],
                ds_atelier_inventory_held_map($pdo, [$variantId])[$variantId] ?? []
            );
            ds_atelier_inventory_record_movement(
                $pdo,
                $variantId,
                (int) $row['id'],
                $orderId,
                (int) $row['quantity'],
                $kind,
                $before,
                $after,
                $reason
            );
            $released++;
        }
        if ($own) {
            $pdo->commit();
        }
        return ['ok' => true, 'released' => $released];
    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function ds_atelier_inventory_purge_orders(PDO $pdo, array $orderIds): void
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === [] || !ds_atelier_inventory_tables_exist($pdo)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $pdo->prepare("DELETE FROM inventory_movements WHERE order_id IN ($placeholders)")->execute($orderIds);
    $pdo->prepare("DELETE FROM inventory_reservations WHERE order_id IN ($placeholders)")->execute($orderIds);
}

function ds_atelier_inventory_purge_products(PDO $pdo, array $productIds): void
{
    $productIds = array_values(array_unique(array_filter(array_map('intval', $productIds))));
    if ($productIds === [] || !ds_atelier_inventory_tables_exist($pdo)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $variantStmt = $pdo->prepare("SELECT id FROM product_variants WHERE product_id IN ($placeholders)");
    $variantStmt->execute($productIds);
    $variantIds = array_map('intval', $variantStmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    if ($variantIds === []) {
        return;
    }
    $vPlace = implode(',', array_fill(0, count($variantIds), '?'));
    $pdo->prepare("DELETE FROM inventory_movements WHERE variant_id IN ($vPlace)")->execute($variantIds);
    $pdo->prepare("DELETE FROM inventory_reservations WHERE variant_id IN ($vPlace)")->execute($variantIds);
}
