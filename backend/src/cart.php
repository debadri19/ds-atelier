<?php

declare(strict_types=1);

const DS_ATELIER_GUEST_COOKIE = 'ds_atelier_guest';
const DS_ATELIER_GUEST_TTL = 2592000;
const DS_ATELIER_CART_QTY_MAX = 20;
const DS_ATELIER_PRINT_POSITIONS = ['Front', 'Back', 'Front + Back'];

function ds_atelier_guest_cookie_params(array $config, int $expires): array
{
    return [
        'expires' => $expires,
        'path' => '/',
        'secure' => (bool) $config['session']['secure'],
        'httponly' => true,
        'samesite' => $config['session']['samesite'],
    ];
}

function ds_atelier_guest_token_raw(): ?string
{
    $raw = $_COOKIE[DS_ATELIER_GUEST_COOKIE] ?? null;
    if (!is_string($raw) || !preg_match('/^[a-f0-9]{64}$/', $raw)) {
        return null;
    }
    return $raw;
}

function ds_atelier_guest_hash(string $raw): string
{
    return hash('sha256', $raw);
}

function ds_atelier_guest_ensure(array $config): string
{
    $raw = ds_atelier_guest_token_raw();
    if ($raw !== null) {
        return $raw;
    }
    $raw = bin2hex(random_bytes(32));
    if (PHP_SAPI !== 'cli') {
        setcookie(DS_ATELIER_GUEST_COOKIE, $raw, ds_atelier_guest_cookie_params($config, time() + DS_ATELIER_GUEST_TTL));
    }
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    return $raw;
}

function ds_atelier_guest_clear(array $config): void
{
    if (PHP_SAPI !== 'cli') {
        setcookie(DS_ATELIER_GUEST_COOKIE, '', ds_atelier_guest_cookie_params($config, time() - 3600));
    }
    unset($_COOKIE[DS_ATELIER_GUEST_COOKIE]);
}

function ds_atelier_commerce_actor(PDO $pdo, array $config, bool $createGuest = false): array
{
    $customer = ds_atelier_customer_from_session($pdo);
    if ($customer !== null) {
        return [
            'type' => 'customer',
            'customer_id' => (int) $customer['id'],
            'guest_hash' => null,
        ];
    }

    $raw = ds_atelier_guest_token_raw();
    if ($raw === null && !$createGuest) {
        return [
            'type' => 'anonymous',
            'customer_id' => null,
            'guest_hash' => null,
        ];
    }

    $raw = ds_atelier_guest_ensure($config);
    return [
        'type' => 'guest',
        'customer_id' => null,
        'guest_hash' => ds_atelier_guest_hash($raw),
    ];
}

function ds_atelier_commerce_normalize_slug(mixed $value): string
{
    $slug = strtolower(trim((string) $value));
    if ($slug === '' || strlen($slug) > 80 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        return '';
    }
    return $slug;
}

function ds_atelier_commerce_normalize_artwork_id(mixed $value): string
{
    $id = trim((string) $value);
    if ($id === '') {
        return '';
    }
    if (strlen($id) > 80 || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/', $id)) {
        return '';
    }
    return $id;
}

function ds_atelier_commerce_normalize_artwork_name(mixed $value): ?string
{
    $name = trim((string) $value);
    if ($name === '') {
        return null;
    }
    if (mb_strlen($name) > 160) {
        $name = mb_substr($name, 0, 160);
    }
    return $name;
}

function ds_atelier_commerce_line_key(string $slug, string $colour, string $size, string $printType, string $printPosition, string $artworkId): string
{
    return implode('|', [$slug, $colour, $size, $printType, $printPosition, $artworkId]);
}

function ds_atelier_commerce_product_storefront(array $row): bool
{
    return (int) ($row['published'] ?? 0) === 1
        && ((int) ($row['in_shop'] ?? 0) === 1 || (int) ($row['featured'] ?? 0) === 1);
}

function ds_atelier_cart_find(PDO $pdo, array $actor, bool $forUpdate = false): ?array
{
    if ($actor['type'] === 'customer') {
        $sql = 'SELECT id, customer_id, guest_token_hash FROM carts WHERE customer_id = ? LIMIT 1';
        $param = $actor['customer_id'];
    } elseif ($actor['type'] === 'guest' && is_string($actor['guest_hash'])) {
        $sql = 'SELECT id, customer_id, guest_token_hash FROM carts WHERE guest_token_hash = ? LIMIT 1';
        $param = $actor['guest_hash'];
    } else {
        return null;
    }
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$param]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_cart_create(PDO $pdo, array $actor): array
{
    try {
        if ($actor['type'] === 'customer') {
            $stmt = $pdo->prepare('INSERT INTO carts (customer_id, guest_token_hash) VALUES (?, NULL)');
            $stmt->execute([$actor['customer_id']]);
        } elseif ($actor['type'] === 'guest' && is_string($actor['guest_hash'])) {
            $stmt = $pdo->prepare('INSERT INTO carts (customer_id, guest_token_hash) VALUES (NULL, ?)');
            $stmt->execute([$actor['guest_hash']]);
        } else {
            throw new RuntimeException('Cannot create a cart without an owner.');
        }
    } catch (PDOException $e) {
        if ($e->getCode() !== '23000') {
            throw $e;
        }
        $existing = ds_atelier_cart_find($pdo, $actor, true);
        if ($existing !== null) {
            return $existing;
        }
        throw $e;
    }
    $id = (int) $pdo->lastInsertId();
    return [
        'id' => $id,
        'customer_id' => $actor['customer_id'],
        'guest_token_hash' => $actor['guest_hash'],
    ];
}

function ds_atelier_cart_get_or_create(PDO $pdo, array $actor, bool $forUpdate = false): array
{
    $row = ds_atelier_cart_find($pdo, $actor, $forUpdate);
    if ($row !== null) {
        return $row;
    }
    return ds_atelier_cart_create($pdo, $actor);
}

function ds_atelier_wishlist_find(PDO $pdo, array $actor, bool $forUpdate = false): ?array
{
    if ($actor['type'] === 'customer') {
        $sql = 'SELECT id, customer_id, guest_token_hash FROM wishlists WHERE customer_id = ? LIMIT 1';
        $param = $actor['customer_id'];
    } elseif ($actor['type'] === 'guest' && is_string($actor['guest_hash'])) {
        $sql = 'SELECT id, customer_id, guest_token_hash FROM wishlists WHERE guest_token_hash = ? LIMIT 1';
        $param = $actor['guest_hash'];
    } else {
        return null;
    }
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$param]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_wishlist_create(PDO $pdo, array $actor): array
{
    try {
        if ($actor['type'] === 'customer') {
            $stmt = $pdo->prepare('INSERT INTO wishlists (customer_id, guest_token_hash) VALUES (?, NULL)');
            $stmt->execute([$actor['customer_id']]);
        } elseif ($actor['type'] === 'guest' && is_string($actor['guest_hash'])) {
            $stmt = $pdo->prepare('INSERT INTO wishlists (customer_id, guest_token_hash) VALUES (NULL, ?)');
            $stmt->execute([$actor['guest_hash']]);
        } else {
            throw new RuntimeException('Cannot create a wishlist without an owner.');
        }
    } catch (PDOException $e) {
        if ($e->getCode() !== '23000') {
            throw $e;
        }
        $existing = ds_atelier_wishlist_find($pdo, $actor, true);
        if ($existing !== null) {
            return $existing;
        }
        throw $e;
    }
    return [
        'id' => (int) $pdo->lastInsertId(),
        'customer_id' => $actor['customer_id'],
        'guest_token_hash' => $actor['guest_hash'],
    ];
}

function ds_atelier_wishlist_get_or_create(PDO $pdo, array $actor, bool $forUpdate = false): array
{
    $row = ds_atelier_wishlist_find($pdo, $actor, $forUpdate);
    if ($row !== null) {
        return $row;
    }
    return ds_atelier_wishlist_create($pdo, $actor);
}

function ds_atelier_commerce_load_product_by_slug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare(
        'SELECT p.id, p.slug, p.sku, p.name, p.badge, p.material, p.availability, p.rating, p.reviews,
                p.popular, p.weight, p.gsm, p.lead, p.details, p.published, p.in_shop, p.featured, p.sort_order,
                cat.name AS category_name, cat.slug AS category_slug,
                defc.name AS default_colour_name, defc.slug AS default_colour_slug
         FROM products p
         INNER JOIN categories cat ON cat.id = p.category_id
         LEFT JOIN colours defc ON defc.id = p.default_colour_id
         WHERE p.slug = ?
         LIMIT 1'
    );
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_commerce_load_variant(PDO $pdo, int $productId, ?int $variantId, string $colour, string $size): ?array
{
    $sql = 'SELECT v.id, v.product_id, v.sku, v.price, v.mrp, v.stock, v.active, v.image,
                   s.code AS size_code, s.name AS size_name,
                   c.slug AS colour_slug, c.name AS colour_name
            FROM product_variants v
            INNER JOIN sizes s ON s.id = v.size_id
            INNER JOIN colours c ON c.id = v.colour_id
            WHERE v.product_id = ?';
    $params = [$productId];
    if ($variantId !== null && $variantId > 0) {
        $sql .= ' AND v.id = ?';
        $params[] = $variantId;
    } else {
        $sql .= ' AND s.code = ? AND c.name = ?';
        $params[] = $size;
        $params[] = $colour;
    }
    $sql .= ' LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $decorated = ds_atelier_inventory_decorate_variants($pdo, [$row]);
    return $decorated[0] ?? $row;
}

function ds_atelier_commerce_print_types(PDO $pdo, int $productId): array
{
    $stmt = $pdo->prepare('SELECT print_type FROM product_print_types WHERE product_id = ? ORDER BY sort_order ASC, print_type ASC');
    $stmt->execute([$productId]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $out[] = (string) $row['print_type'];
    }
    return $out;
}

function ds_atelier_commerce_parse_qty(mixed $value, int $default = 1): array
{
    if (is_array($value) || (!is_int($value) && !is_float($value) && !is_string($value))) {
        return ['ok' => false, 'qty' => $default, 'error' => 'Quantity must be a positive integer.'];
    }
    if (is_string($value) && !preg_match('/^[0-9]+$/', $value)) {
        return ['ok' => false, 'qty' => $default, 'error' => 'Quantity must be a positive integer.'];
    }
    $qty = (int) $value;
    if ($qty < 1) {
        return ['ok' => false, 'qty' => $default, 'error' => 'Quantity must be at least 1.'];
    }
    if ($qty > DS_ATELIER_CART_QTY_MAX) {
        return ['ok' => false, 'qty' => DS_ATELIER_CART_QTY_MAX, 'error' => 'Quantity cannot exceed ' . DS_ATELIER_CART_QTY_MAX . '.'];
    }
    return ['ok' => true, 'qty' => $qty, 'error' => null];
}

function ds_atelier_commerce_stock_limit(array $product, array $variant): int
{
    if ((string) ($product['availability'] ?? '') === 'Made to order') {
        return DS_ATELIER_CART_QTY_MAX;
    }
    return min(DS_ATELIER_CART_QTY_MAX, ds_atelier_inventory_available($product, $variant));
}

function ds_atelier_commerce_resolve_add(PDO $pdo, array $input): array
{
    $slug = ds_atelier_commerce_normalize_slug($input['productId'] ?? $input['id'] ?? '');
    if ($slug === '') {
        return ['ok' => false, 'error' => 'Select a valid product.', 'code' => 422];
    }

    $product = ds_atelier_commerce_load_product_by_slug($pdo, $slug);
    if ($product === null || !ds_atelier_commerce_product_storefront($product)) {
        return ['ok' => false, 'error' => 'This product is not available.', 'code' => 404];
    }

    $variantIdRaw = $input['variantId'] ?? $input['variant_id'] ?? null;
    $variantId = null;
    if ($variantIdRaw !== null && $variantIdRaw !== '') {
        if (!is_numeric($variantIdRaw) || (int) $variantIdRaw < 1) {
            return ['ok' => false, 'error' => 'Select a valid product variant.', 'code' => 422];
        }
        $variantId = (int) $variantIdRaw;
    }

    $colour = trim((string) ($input['color'] ?? $input['colour'] ?? ''));
    $size = strtoupper(trim((string) ($input['size'] ?? '')));
    $variant = ds_atelier_commerce_load_variant($pdo, (int) $product['id'], $variantId, $colour, $size);
    if ($variant === null || (int) $variant['product_id'] !== (int) $product['id']) {
        return ['ok' => false, 'error' => 'That size and colour combination is not available.', 'code' => 422];
    }
    if ((int) $variant['active'] !== 1) {
        return ['ok' => false, 'error' => 'That variant is no longer available.', 'code' => 422];
    }

    $printType = trim((string) ($input['printType'] ?? $input['print_type'] ?? ''));
    $printTypes = ds_atelier_commerce_print_types($pdo, (int) $product['id']);
    if ($printType === '' && $printTypes !== []) {
        $printType = $printTypes[0];
    }
    if ($printTypes !== [] && !in_array($printType, $printTypes, true)) {
        return ['ok' => false, 'error' => 'Select a valid print type.', 'code' => 422];
    }
    if ($printType === '' || strlen($printType) > 40) {
        return ['ok' => false, 'error' => 'Select a valid print type.', 'code' => 422];
    }

    $printPosition = trim((string) ($input['printPosition'] ?? $input['print_position'] ?? 'Front'));
    if (!in_array($printPosition, DS_ATELIER_PRINT_POSITIONS, true)) {
        return ['ok' => false, 'error' => 'Select a valid print position.', 'code' => 422];
    }

    $qtyParsed = ds_atelier_commerce_parse_qty($input['qty'] ?? $input['quantity'] ?? 1);
    if ($qtyParsed['ok'] !== true) {
        return ['ok' => false, 'error' => $qtyParsed['error'], 'code' => 422];
    }

    $stockLimit = ds_atelier_commerce_stock_limit($product, $variant);
    if ($stockLimit < 1) {
        return ['ok' => false, 'error' => 'This variant is out of stock.', 'code' => 409];
    }
    if ($qtyParsed['qty'] > $stockLimit) {
        return ['ok' => false, 'error' => 'Only ' . $stockLimit . ' remaining for this variant.', 'code' => 409];
    }

    $artworkId = ds_atelier_commerce_normalize_artwork_id($input['artworkId'] ?? $input['artwork_id'] ?? '');
    $artworkName = ds_atelier_commerce_normalize_artwork_name($input['artworkName'] ?? $input['artwork_name'] ?? '');
    $lineKey = ds_atelier_commerce_line_key(
        (string) $product['slug'],
        (string) $variant['colour_name'],
        (string) $variant['size_code'],
        $printType,
        $printPosition,
        $artworkId
    );

    return [
        'ok' => true,
        'product' => $product,
        'variant' => $variant,
        'qty' => $qtyParsed['qty'],
        'print_type' => $printType,
        'print_position' => $printPosition,
        'artwork_id' => $artworkId,
        'artwork_name' => $artworkName,
        'line_key' => $lineKey,
        'stock_limit' => $stockLimit,
    ];
}

function ds_atelier_cart_item_issues(array $product, array $variant, int $qty): array
{
    $issues = [];
    if (!ds_atelier_commerce_product_storefront($product)) {
        $issues[] = 'unavailable';
    }
    if ((int) ($variant['active'] ?? 0) !== 1) {
        $issues[] = 'variant_inactive';
    }
    $limit = ds_atelier_commerce_stock_limit($product, $variant);
    if ($limit < 1) {
        $issues[] = 'out_of_stock';
    } elseif ($qty > $limit) {
        $issues[] = 'insufficient_stock';
    }
    return $issues;
}

function ds_atelier_cart_map_item(array $row): array
{
    $qty = (int) $row['quantity'];
    $unitPrice = (float) $row['price'];
    $unitMrp = (float) $row['mrp'];
    $issues = ds_atelier_cart_item_issues($row, $row, $qty);
    $purchasable = $issues === [];
    $image = $row['variant_image'] !== null && $row['variant_image'] !== ''
        ? (string) $row['variant_image']
        : (string) ($row['image'] ?? '');
    $alt = (string) ($row['alt'] ?? $row['name'] ?? '');

    return [
        'itemId' => (int) $row['item_id'],
        'id' => (string) $row['slug'],
        'lineKey' => (string) $row['line_key'],
        'productId' => (string) $row['slug'],
        'numericProductId' => (int) $row['product_id'],
        'variantId' => (int) $row['variant_id'],
        'sku' => (string) $row['sku'],
        'name' => (string) $row['name'],
        'image' => $image,
        'alt' => $alt,
        'color' => (string) $row['colour_name'],
        'size' => (string) $row['size_code'],
        'printType' => (string) $row['print_type'],
        'printPosition' => (string) $row['print_position'],
        'artworkId' => (string) $row['artwork_id'],
        'artworkName' => $row['artwork_name'] !== null && $row['artwork_name'] !== '' ? (string) $row['artwork_name'] : null,
        'qty' => $qty,
        'price' => $unitPrice,
        'mrp' => $unitMrp,
        'unitPrice' => $unitPrice,
        'unitMrp' => $unitMrp,
        'linePrice' => round($unitPrice * $qty, 2),
        'lineMrp' => round($unitMrp * $qty, 2),
        'stock' => (int) ($row['available'] ?? $row['stock'] ?? 0),
        'availability' => (string) $row['availability'],
        'purchasable' => $purchasable,
        'issues' => $issues,
    ];
}

function ds_atelier_cart_fetch_items(PDO $pdo, int $cartId): array
{
    $stmt = $pdo->prepare(
        'SELECT ci.id AS item_id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity, ci.print_type,
                ci.print_position, ci.artwork_id, ci.artwork_name, ci.line_key,
                p.slug, p.name, p.availability, p.published, p.in_shop, p.featured,
                v.sku, v.price, v.mrp, v.stock, v.active, v.image AS variant_image,
                s.code AS size_code, c.name AS colour_name,
                (
                    SELECT pm.src FROM product_media pm
                    WHERE pm.product_id = p.id
                    ORDER BY pm.is_primary DESC, pm.sort_order ASC, pm.id ASC
                    LIMIT 1
                ) AS image,
                (
                    SELECT pm.alt FROM product_media pm
                    WHERE pm.product_id = p.id
                    ORDER BY pm.is_primary DESC, pm.sort_order ASC, pm.id ASC
                    LIMIT 1
                ) AS alt
         FROM cart_items ci
         INNER JOIN products p ON p.id = ci.product_id
         INNER JOIN product_variants v ON v.id = ci.variant_id
         INNER JOIN sizes s ON s.id = v.size_id
         INNER JOIN colours c ON c.id = v.colour_id
         WHERE ci.cart_id = ?
         ORDER BY ci.id ASC'
    );
    $stmt->execute([$cartId]);
    $rows = ds_atelier_inventory_decorate_variants($pdo, $stmt->fetchAll());
    $items = [];
    foreach ($rows as $row) {
        $items[] = ds_atelier_cart_map_item($row);
    }
    return $items;
}

function ds_atelier_cart_payload(?array $cart, array $items, string $owner): array
{
    $subtotal = 0.0;
    $mrp = 0.0;
    $count = 0;
    $warnings = [];
    foreach ($items as $item) {
        $subtotal += (float) $item['linePrice'];
        $mrp += (float) $item['lineMrp'];
        $count += (int) $item['qty'];
        if ($item['issues'] !== []) {
            $warnings[] = [
                'itemId' => $item['itemId'],
                'productId' => $item['id'],
                'issues' => $item['issues'],
            ];
        }
    }

    return [
        'id' => $cart !== null ? (int) $cart['id'] : null,
        'owner' => $owner,
        'items' => $items,
        'count' => $count,
        'subtotal' => round($subtotal, 2),
        'mrp' => round($mrp, 2),
        'discount' => round(max(0, $mrp - $subtotal), 2),
        'warnings' => $warnings,
    ];
}

function ds_atelier_cart_get(PDO $pdo, array $config): array
{
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $cart = ds_atelier_cart_find($pdo, $actor, false);
    $items = $cart !== null ? ds_atelier_cart_fetch_items($pdo, (int) $cart['id']) : [];
    return [
        'ok' => true,
        'cart' => ds_atelier_cart_payload($cart, $items, $actor['type']),
        'code' => 200,
    ];
}

function ds_atelier_cart_touch(PDO $pdo, int $cartId): void
{
    $pdo->prepare('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$cartId]);
}

function ds_atelier_cart_owned_item(PDO $pdo, int $cartId, int $itemId, bool $forUpdate = false): ?array
{
    $sql = 'SELECT id, cart_id, product_id, variant_id, quantity, line_key FROM cart_items WHERE id = ? AND cart_id = ? LIMIT 1';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$itemId, $cartId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_cart_update(PDO $pdo, array $config, array $input): array
{
    $itemIdRaw = $input['itemId'] ?? $input['item_id'] ?? null;
    if (!is_numeric($itemIdRaw) || (int) $itemIdRaw < 1) {
        return ['ok' => false, 'error' => 'Cart item not found.', 'code' => 404];
    }
    $qtyParsed = ds_atelier_commerce_parse_qty($input['qty'] ?? $input['quantity'] ?? null);
    if ($qtyParsed['ok'] !== true) {
        return ['ok' => false, 'error' => $qtyParsed['error'], 'code' => 422];
    }

    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $pdo->beginTransaction();
    try {
        $cart = ds_atelier_cart_find($pdo, $actor, true);
        if ($cart === null) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Cart item not found.', 'code' => 404];
        }
        $item = ds_atelier_cart_owned_item($pdo, (int) $cart['id'], (int) $itemIdRaw, true);
        if ($item === null) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Cart item not found.', 'code' => 404];
        }
        $productStmt = $pdo->prepare('SELECT id, slug, published, in_shop, featured, availability FROM products WHERE id = ? LIMIT 1');
        $productStmt->execute([(int) $item['product_id']]);
        $product = $productStmt->fetch();
        $variant = ds_atelier_commerce_load_variant($pdo, (int) $item['product_id'], (int) $item['variant_id'], '', '');
        if (!$product || !$variant) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'This product is no longer available.', 'code' => 409];
        }
        $limit = ds_atelier_commerce_stock_limit($product, $variant);
        if ((int) $variant['active'] !== 1 || !ds_atelier_commerce_product_storefront($product) || $limit < 1) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'This item is no longer available.', 'code' => 409];
        }
        if ($qtyParsed['qty'] > $limit) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Only ' . $limit . ' remaining for this variant.', 'code' => 409];
        }
        $pdo->prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')->execute([$qtyParsed['qty'], (int) $item['id']]);
        ds_atelier_cart_touch($pdo, (int) $cart['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return ds_atelier_cart_get($pdo, $config);
}

function ds_atelier_cart_remove(PDO $pdo, array $config, array $input): array
{
    $itemIdRaw = $input['itemId'] ?? $input['item_id'] ?? null;
    if (!is_numeric($itemIdRaw) || (int) $itemIdRaw < 1) {
        return ['ok' => false, 'error' => 'Cart item not found.', 'code' => 404];
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $pdo->beginTransaction();
    try {
        $cart = ds_atelier_cart_find($pdo, $actor, true);
        if ($cart === null) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Cart item not found.', 'code' => 404];
        }
        $item = ds_atelier_cart_owned_item($pdo, (int) $cart['id'], (int) $itemIdRaw, true);
        if ($item === null) {
            $pdo->rollBack();
            return ['ok' => false, 'error' => 'Cart item not found.', 'code' => 404];
        }
        $pdo->prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?')->execute([(int) $item['id'], (int) $cart['id']]);
        ds_atelier_cart_touch($pdo, (int) $cart['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    return ds_atelier_cart_get($pdo, $config);
}

function ds_atelier_cart_clear(PDO $pdo, array $config): array
{
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $cart = ds_atelier_cart_find($pdo, $actor, false);
    if ($cart !== null) {
        $pdo->beginTransaction();
        try {
            $locked = ds_atelier_cart_find($pdo, $actor, true);
            if ($locked !== null) {
                $pdo->prepare('DELETE FROM cart_items WHERE cart_id = ?')->execute([(int) $locked['id']]);
                ds_atelier_cart_touch($pdo, (int) $locked['id']);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
    return ds_atelier_cart_get($pdo, $config);
}

function ds_atelier_cart_upsert_line(PDO $pdo, array $actor, array $resolved, string $mode): array
{
    $pdo->beginTransaction();
    try {
        $cart = ds_atelier_cart_get_or_create($pdo, $actor, true);
        $cartId = (int) $cart['id'];
        $stmt = $pdo->prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND line_key = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$cartId, $resolved['line_key']]);
        $existing = $stmt->fetch();
        if ($existing) {
            $nextQty = $mode === 'max'
                ? max((int) $existing['quantity'], $resolved['qty'])
                : (int) $existing['quantity'] + $resolved['qty'];
            if ($nextQty > $resolved['stock_limit']) {
                $pdo->rollBack();
                return ['ok' => false, 'error' => 'Only ' . $resolved['stock_limit'] . ' remaining for this variant.', 'code' => 409];
            }
            $pdo->prepare('UPDATE cart_items SET quantity = ?, artwork_name = COALESCE(?, artwork_name) WHERE id = ?')
                ->execute([$nextQty, $resolved['artwork_name'], (int) $existing['id']]);
        } else {
            try {
                $pdo->prepare(
                    'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, print_type, print_position, artwork_id, artwork_name, line_key)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                )->execute([
                    $cartId,
                    (int) $resolved['product']['id'],
                    (int) $resolved['variant']['id'],
                    $resolved['qty'],
                    $resolved['print_type'],
                    $resolved['print_position'],
                    $resolved['artwork_id'],
                    $resolved['artwork_name'],
                    $resolved['line_key'],
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() !== '23000') {
                    throw $e;
                }
                $stmt = $pdo->prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND line_key = ? LIMIT 1 FOR UPDATE');
                $stmt->execute([$cartId, $resolved['line_key']]);
                $existing = $stmt->fetch();
                if (!$existing) {
                    throw $e;
                }
                $nextQty = $mode === 'max'
                    ? max((int) $existing['quantity'], $resolved['qty'])
                    : (int) $existing['quantity'] + $resolved['qty'];
                if ($nextQty > $resolved['stock_limit']) {
                    $pdo->rollBack();
                    return ['ok' => false, 'error' => 'Only ' . $resolved['stock_limit'] . ' remaining for this variant.', 'code' => 409];
                }
                $pdo->prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')->execute([$nextQty, (int) $existing['id']]);
            }
        }
        ds_atelier_cart_touch($pdo, $cartId);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $fresh = ds_atelier_cart_find($pdo, $actor);
    $items = $fresh !== null ? ds_atelier_cart_fetch_items($pdo, (int) $fresh['id']) : [];
    return [
        'ok' => true,
        'cart' => ds_atelier_cart_payload($fresh, $items, $actor['type']),
        'code' => 200,
    ];
}

function ds_atelier_cart_add(PDO $pdo, array $config, array $input): array
{
    $actor = ds_atelier_commerce_actor($pdo, $config, true);
    $resolved = ds_atelier_commerce_resolve_add($pdo, $input);
    if ($resolved['ok'] !== true) {
        return $resolved;
    }
    return ds_atelier_cart_upsert_line($pdo, $actor, $resolved, 'increment');
}

function ds_atelier_cart_migrate(PDO $pdo, array $config, array $input): array
{
    $items = $input['items'] ?? [];
    if (!is_array($items)) {
        return ['ok' => false, 'error' => 'Cart items must be a list.', 'code' => 422];
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, true);
    $skipped = 0;
    foreach (array_slice($items, 0, 50) as $item) {
        if (!is_array($item)) {
            $skipped++;
            continue;
        }
        $resolved = ds_atelier_commerce_resolve_add($pdo, $item);
        if ($resolved['ok'] !== true) {
            $skipped++;
            continue;
        }
        $result = ds_atelier_cart_upsert_line($pdo, $actor, $resolved, 'max');
        if (($result['ok'] ?? false) !== true) {
            $skipped++;
        }
    }
    $out = ds_atelier_cart_get($pdo, $config);
    $out['migrated'] = true;
    $out['skipped'] = $skipped;
    return $out;
}

function ds_atelier_wishlist_payload(PDO $pdo, ?array $wishlist, string $owner): array
{
    $products = [];
    $ids = [];
    if ($wishlist !== null) {
        $stmt = $pdo->prepare(
            'SELECT wi.product_id
             FROM wishlist_items wi
             INNER JOIN products p ON p.id = wi.product_id
             WHERE wi.wishlist_id = ? AND p.published = 1 AND (p.in_shop = 1 OR p.featured = 1)
             ORDER BY wi.created_at DESC, wi.id DESC'
        );
        $stmt->execute([(int) $wishlist['id']]);
        foreach ($stmt->fetchAll() as $row) {
            $ids[] = (int) $row['product_id'];
        }
    }
    if ($ids !== []) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $pdo->prepare(
            "SELECT p.id, p.slug, p.sku, p.name, p.badge, p.material, p.availability, p.rating, p.reviews,
                    p.popular, p.weight, p.gsm, p.lead, p.details, p.published, p.in_shop, p.featured, p.sort_order,
                    cat.name AS category_name, cat.slug AS category_slug,
                    defc.name AS default_colour_name, defc.slug AS default_colour_slug,
                    (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS price,
                    (SELECT SUBSTRING_INDEX(GROUP_CONCAT(v.mrp ORDER BY v.price ASC, v.id ASC), ',', 1)
                     FROM product_variants v WHERE v.product_id = p.id AND v.active = 1) AS mrp
             FROM products p
             INNER JOIN categories cat ON cat.id = p.category_id
             LEFT JOIN colours defc ON defc.id = p.default_colour_id
             WHERE p.id IN ($placeholders)"
        );
        $stmt->execute($ids);
        $rowsById = [];
        foreach ($stmt->fetchAll() as $row) {
            $rowsById[(int) $row['id']] = $row;
        }
        $media = ds_atelier_catalog_fetch_media($pdo, $ids);
        $printTypes = ds_atelier_catalog_fetch_print_types($pdo, $ids);
        $variants = ds_atelier_catalog_fetch_active_variants($pdo, $ids);
        foreach ($ids as $id) {
            if (!isset($rowsById[$id])) {
                continue;
            }
            $products[] = ds_atelier_catalog_map_product(
                $rowsById[$id],
                $media[$id] ?? [],
                $printTypes[$id] ?? [],
                $variants[$id] ?? []
            );
        }
    }

    $productIds = array_map(static fn (array $item): string => (string) $item['id'], $products);
    return [
        'id' => $wishlist !== null ? (int) $wishlist['id'] : null,
        'owner' => $owner,
        'items' => $products,
        'productIds' => $productIds,
        'count' => count($productIds),
    ];
}

function ds_atelier_wishlist_get(PDO $pdo, array $config): array
{
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $wishlist = ds_atelier_wishlist_find($pdo, $actor, false);
    return [
        'ok' => true,
        'wishlist' => ds_atelier_wishlist_payload($pdo, $wishlist, $actor['type']),
        'code' => 200,
    ];
}

function ds_atelier_wishlist_resolve_product(PDO $pdo, mixed $productId): array
{
    $slug = ds_atelier_commerce_normalize_slug($productId);
    if ($slug === '') {
        return ['ok' => false, 'error' => 'Select a valid product.', 'code' => 422];
    }
    $product = ds_atelier_commerce_load_product_by_slug($pdo, $slug);
    if ($product === null || !ds_atelier_commerce_product_storefront($product)) {
        return ['ok' => false, 'error' => 'This product is not available.', 'code' => 404];
    }
    return ['ok' => true, 'product' => $product];
}

function ds_atelier_wishlist_add(PDO $pdo, array $config, array $input): array
{
    $resolved = ds_atelier_wishlist_resolve_product($pdo, $input['productId'] ?? $input['id'] ?? '');
    if ($resolved['ok'] !== true) {
        return $resolved;
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, true);
    $pdo->beginTransaction();
    try {
        $wishlist = ds_atelier_wishlist_get_or_create($pdo, $actor, true);
        try {
            $pdo->prepare('INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)')
                ->execute([(int) $wishlist['id'], (int) $resolved['product']['id']]);
        } catch (PDOException $e) {
            if ($e->getCode() !== '23000') {
                throw $e;
            }
        }
        $pdo->prepare('UPDATE wishlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([(int) $wishlist['id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    return ds_atelier_wishlist_get($pdo, $config);
}

function ds_atelier_wishlist_remove(PDO $pdo, array $config, array $input): array
{
    $slug = ds_atelier_commerce_normalize_slug($input['productId'] ?? $input['id'] ?? '');
    if ($slug === '') {
        return ['ok' => false, 'error' => 'Select a valid product.', 'code' => 422];
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $pdo->beginTransaction();
    try {
        $wishlist = ds_atelier_wishlist_find($pdo, $actor, true);
        if ($wishlist !== null) {
            $pdo->prepare(
                'DELETE wi FROM wishlist_items wi
                 INNER JOIN products p ON p.id = wi.product_id
                 WHERE wi.wishlist_id = ? AND p.slug = ?'
            )->execute([(int) $wishlist['id'], $slug]);
            $pdo->prepare('UPDATE wishlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([(int) $wishlist['id']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    return ds_atelier_wishlist_get($pdo, $config);
}

function ds_atelier_wishlist_toggle(PDO $pdo, array $config, array $input): array
{
    $resolved = ds_atelier_wishlist_resolve_product($pdo, $input['productId'] ?? $input['id'] ?? '');
    if ($resolved['ok'] !== true) {
        return $resolved;
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, true);
    $pdo->beginTransaction();
    try {
        $wishlist = ds_atelier_wishlist_get_or_create($pdo, $actor, true);
        $stmt = $pdo->prepare('SELECT id FROM wishlist_items WHERE wishlist_id = ? AND product_id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([(int) $wishlist['id'], (int) $resolved['product']['id']]);
        $existing = $stmt->fetch();
        if ($existing) {
            $pdo->prepare('DELETE FROM wishlist_items WHERE id = ?')->execute([(int) $existing['id']]);
        } else {
            $pdo->prepare('INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)')
                ->execute([(int) $wishlist['id'], (int) $resolved['product']['id']]);
        }
        $pdo->prepare('UPDATE wishlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([(int) $wishlist['id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    return ds_atelier_wishlist_get($pdo, $config);
}

function ds_atelier_wishlist_migrate(PDO $pdo, array $config, array $input): array
{
    $ids = $input['productIds'] ?? $input['items'] ?? [];
    if (!is_array($ids)) {
        return ['ok' => false, 'error' => 'Wishlist products must be a list.', 'code' => 422];
    }
    $skipped = 0;
    foreach (array_slice($ids, 0, 50) as $id) {
        if (is_array($id)) {
            $id = $id['productId'] ?? $id['id'] ?? '';
        }
        $result = ds_atelier_wishlist_add($pdo, $config, ['productId' => $id]);
        if (($result['ok'] ?? false) !== true) {
            $skipped++;
        }
    }
    $out = ds_atelier_wishlist_get($pdo, $config);
    $out['migrated'] = true;
    $out['skipped'] = $skipped;
    return $out;
}

function ds_atelier_commerce_merge_carts(PDO $pdo, array $guestCart, array $customerCart): void
{
    $guestItems = $pdo->prepare('SELECT * FROM cart_items WHERE cart_id = ? FOR UPDATE');
    $guestItems->execute([(int) $guestCart['id']]);
    foreach ($guestItems->fetchAll() as $item) {
        $existing = $pdo->prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND line_key = ? LIMIT 1 FOR UPDATE');
        $existing->execute([(int) $customerCart['id'], $item['line_key']]);
        $row = $existing->fetch();
        $productStmt = $pdo->prepare('SELECT id, published, in_shop, featured, availability FROM products WHERE id = ? LIMIT 1');
        $productStmt->execute([(int) $item['product_id']]);
        $product = $productStmt->fetch();
        $variant = ds_atelier_commerce_load_variant($pdo, (int) $item['product_id'], (int) $item['variant_id'], '', '');
        if (!$product || !$variant || (int) $variant['active'] !== 1 || !ds_atelier_commerce_product_storefront($product)) {
            $pdo->prepare('DELETE FROM cart_items WHERE id = ?')->execute([(int) $item['id']]);
            continue;
        }
        $limit = ds_atelier_commerce_stock_limit($product, $variant);
        if ($limit < 1) {
            $pdo->prepare('DELETE FROM cart_items WHERE id = ?')->execute([(int) $item['id']]);
            continue;
        }
        if ($row) {
            $next = min($limit, (int) $row['quantity'] + (int) $item['quantity']);
            $pdo->prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')->execute([$next, (int) $row['id']]);
            $pdo->prepare('DELETE FROM cart_items WHERE id = ?')->execute([(int) $item['id']]);
        } else {
            $qty = min($limit, (int) $item['quantity']);
            $pdo->prepare('UPDATE cart_items SET cart_id = ?, quantity = ? WHERE id = ?')
                ->execute([(int) $customerCart['id'], $qty, (int) $item['id']]);
        }
    }
    $pdo->prepare('DELETE FROM carts WHERE id = ?')->execute([(int) $guestCart['id']]);
}

function ds_atelier_commerce_merge_wishlists(PDO $pdo, array $guestWishlist, array $customerWishlist): void
{
    $guestItems = $pdo->prepare('SELECT * FROM wishlist_items WHERE wishlist_id = ? FOR UPDATE');
    $guestItems->execute([(int) $guestWishlist['id']]);
    foreach ($guestItems->fetchAll() as $item) {
        try {
            $pdo->prepare('INSERT INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)')
                ->execute([(int) $customerWishlist['id'], (int) $item['product_id']]);
        } catch (PDOException $e) {
            if ($e->getCode() !== '23000') {
                throw $e;
            }
        }
        $pdo->prepare('DELETE FROM wishlist_items WHERE id = ?')->execute([(int) $item['id']]);
    }
    $pdo->prepare('DELETE FROM wishlists WHERE id = ?')->execute([(int) $guestWishlist['id']]);
}

function ds_atelier_commerce_merge_guest(PDO $pdo, array $config, int $customerId): array
{
    $raw = ds_atelier_guest_token_raw();
    if ($raw === null) {
        return ['ok' => true, 'merged' => false];
    }
    $guestActor = ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
    $customerActor = ['type' => 'customer', 'customer_id' => $customerId, 'guest_hash' => null];

    $pdo->beginTransaction();
    try {
        $guestCart = ds_atelier_cart_find($pdo, $guestActor, true);
        $customerCart = ds_atelier_cart_find($pdo, $customerActor, true);
        if ($guestCart !== null && $customerCart === null) {
            $pdo->prepare('UPDATE carts SET customer_id = ?, guest_token_hash = NULL WHERE id = ?')
                ->execute([$customerId, (int) $guestCart['id']]);
        } elseif ($guestCart !== null && $customerCart !== null && (int) $guestCart['id'] !== (int) $customerCart['id']) {
            ds_atelier_commerce_merge_carts($pdo, $guestCart, $customerCart);
            ds_atelier_cart_touch($pdo, (int) $customerCart['id']);
        }

        $guestWishlist = ds_atelier_wishlist_find($pdo, $guestActor, true);
        $customerWishlist = ds_atelier_wishlist_find($pdo, $customerActor, true);
        if ($guestWishlist !== null && $customerWishlist === null) {
            $pdo->prepare('UPDATE wishlists SET customer_id = ?, guest_token_hash = NULL WHERE id = ?')
                ->execute([$customerId, (int) $guestWishlist['id']]);
        } elseif ($guestWishlist !== null && $customerWishlist !== null && (int) $guestWishlist['id'] !== (int) $customerWishlist['id']) {
            ds_atelier_commerce_merge_wishlists($pdo, $guestWishlist, $customerWishlist);
            $pdo->prepare('UPDATE wishlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([(int) $customerWishlist['id']]);
        }

        ds_atelier_checkout_claim_guest_orders($pdo, $customerId, (string) $guestActor['guest_hash']);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    ds_atelier_guest_clear($config);
    return ['ok' => true, 'merged' => true];
}

function ds_atelier_commerce_try_merge(PDO $pdo, array $config, int $customerId): void
{
    try {
        ds_atelier_commerce_merge_guest($pdo, $config, $customerId);
    } catch (Throwable $e) {
        ds_atelier_log('error', 'Guest cart merge failed: ' . $e->getMessage(), $config);
    }
}

function ds_atelier_commerce_maybe_merge(PDO $pdo, array $config): void
{
    $customer = ds_atelier_customer_from_session($pdo);
    if ($customer === null || ds_atelier_guest_token_raw() === null) {
        return;
    }
    ds_atelier_commerce_try_merge($pdo, $config, (int) $customer['id']);
}

function ds_atelier_commerce_handle(array $config, callable $callback, string $failMessage = 'Unable to update your cart. Please try again later.'): array
{
    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        return ['ok' => false, 'error' => 'Something went wrong. Please try again later.', 'code' => 503];
    }
    try {
        ds_atelier_commerce_maybe_merge($result['pdo'], $config);
        return $callback($result['pdo']);
    } catch (Throwable $e) {
        return ds_atelier_fail_closed($failMessage, $e, $config);
    }
}
