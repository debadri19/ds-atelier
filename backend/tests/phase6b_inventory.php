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
$httpPid = null;
$httpPort = 8097;
$testCustomerIds = [];
$testGuestHashes = [];
$testProductIds = [];
$testOrderIds = [];

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

function ds_phase6b_cleanup(PDO $pdo, array $customerIds, array $guestHashes, array $productIds, array $orderIds): void
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($guestHashes !== []) {
        $placeholders = implode(',', array_fill(0, count($guestHashes), '?'));
        $stmt = $pdo->prepare("SELECT id FROM orders WHERE guest_token_hash IN ($placeholders)");
        $stmt->execute($guestHashes);
        $orderIds = array_merge($orderIds, array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
    }
    if ($customerIds !== []) {
        $placeholders = implode(',', array_fill(0, count($customerIds), '?'));
        $stmt = $pdo->prepare("SELECT id FROM orders WHERE customer_id IN ($placeholders)");
        $stmt->execute($customerIds);
        $orderIds = array_merge($orderIds, array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []));
    }
    $orderIds = array_values(array_unique(array_filter($orderIds)));
    if ($orderIds !== []) {
        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        ds_atelier_inventory_purge_orders($pdo, $orderIds);
        $pdo->prepare("DELETE FROM order_items WHERE order_id IN ($placeholders)")->execute($orderIds);
        $pdo->prepare("DELETE FROM orders WHERE id IN ($placeholders)")->execute($orderIds);
    }
    if ($guestHashes !== []) {
        $placeholders = implode(',', array_fill(0, count($guestHashes), '?'));
        $pdo->prepare("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE guest_token_hash IN ($placeholders))")
            ->execute($guestHashes);
        $pdo->prepare("DELETE FROM wishlist_items WHERE wishlist_id IN (SELECT id FROM wishlists WHERE guest_token_hash IN ($placeholders))")
            ->execute($guestHashes);
        $pdo->prepare("DELETE FROM carts WHERE guest_token_hash IN ($placeholders)")->execute($guestHashes);
        $pdo->prepare("DELETE FROM wishlists WHERE guest_token_hash IN ($placeholders)")->execute($guestHashes);
    }
    if ($customerIds !== []) {
        $placeholders = implode(',', array_fill(0, count($customerIds), '?'));
        $pdo->prepare("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE customer_id IN ($placeholders))")
            ->execute($customerIds);
        $pdo->prepare("DELETE FROM wishlist_items WHERE wishlist_id IN (SELECT id FROM wishlists WHERE customer_id IN ($placeholders))")
            ->execute($customerIds);
        $pdo->prepare("DELETE FROM carts WHERE customer_id IN ($placeholders)")->execute($customerIds);
        $pdo->prepare("DELETE FROM wishlists WHERE customer_id IN ($placeholders)")->execute($customerIds);
        $pdo->prepare("DELETE FROM customer_password_resets WHERE customer_id IN ($placeholders)")->execute($customerIds);
        $pdo->prepare("DELETE FROM customers WHERE id IN ($placeholders)")->execute($customerIds);
    }
    if ($productIds !== []) {
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $pdo->prepare("DELETE FROM cart_items WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM wishlist_items WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM order_items WHERE product_id IN ($placeholders)")->execute($productIds);
        ds_atelier_inventory_purge_products($pdo, $productIds);
        $pdo->prepare("DELETE FROM product_variants WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM product_media WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM product_print_types WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)")->execute($productIds);
    }
}

function ds_phase6b_guest(string $raw): array
{
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember']);
    return ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
}

function ds_phase6b_place_input(array $overrides = []): array
{
    $base = [
        'contact' => ['email' => 'phase6b.guest@example.test'],
        'shipping' => [
            'name' => 'Phase Six Bee',
            'phone' => '9876543210',
            'line1' => '12 Studio Lane',
            'city' => 'Kolkata',
            'state' => 'West Bengal',
            'pincode' => '700001',
            'country' => 'India',
        ],
        'billingSame' => true,
        'paymentMethod' => 'UPI',
        'coupon' => '',
        'idempotencyKey' => 'chk_phase6b_' . bin2hex(random_bytes(8)),
    ];
    return array_replace_recursive($base, $overrides);
}

function ds_phase6b_http(string $method, string $url, ?array $body, array &$jar, ?string $csrf = null): array
{
    $headers = [];
    if ($jar !== []) {
        $parts = [];
        foreach ($jar as $name => $value) {
            $parts[] = $name . '=' . $value;
        }
        $headers[] = 'Cookie: ' . implode('; ', $parts);
    }
    if ($csrf !== null) {
        $headers[] = 'X-CSRF-TOKEN: ' . $csrf;
    }
    $content = null;
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $content = json_encode($body, JSON_UNESCAPED_SLASHES);
    }
    $ctx = stream_context_create([
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $content ?? '',
            'ignore_errors' => true,
            'timeout' => 5,
        ],
    ]);
    $json = @file_get_contents($url, false, $ctx);
    $responseHeaders = $http_response_header ?? [];
    foreach ($responseHeaders as $header) {
        if (stripos($header, 'Set-Cookie:') === 0 && preg_match('/Set-Cookie:\s*([^=]+)=([^;]*)/i', $header, $m) === 1) {
            $jar[$m[1]] = $m[2];
        }
    }
    $code = 0;
    if (isset($responseHeaders[0]) && preg_match('/\s(\d{3})\s/', $responseHeaders[0], $m) === 1) {
        $code = (int) $m[1];
    }
    $payload = is_string($json) ? json_decode($json, true) : null;
    return ['code' => $code, 'body' => is_array($payload) ? $payload : null, 'raw' => $json];
}

function ds_phase6b_on_hand(PDO $pdo, int $variantId): int
{
    $stmt = $pdo->prepare('SELECT stock FROM product_variants WHERE id = ? LIMIT 1');
    $stmt->execute([$variantId]);
    return (int) $stmt->fetchColumn();
}

function ds_phase6b_available(PDO $pdo, array $product, int $variantId): int
{
    $variant = ds_atelier_commerce_load_variant($pdo, (int) $product['id'], $variantId, '', '');
    if ($variant === null) {
        return 0;
    }
    return ds_atelier_inventory_available($product, $variant);
}

$root = dirname(__DIR__, 2);
$migrations = glob($root . '/backend/migrations/*inventory*.sql') ?: [];
$inventorySrc = (string) file_get_contents($root . '/backend/src/inventory.php');
$catalogSrc = (string) file_get_contents($root . '/backend/src/catalog.php');
$cartSrc = (string) file_get_contents($root . '/backend/src/cart.php');
$checkoutSrc = (string) file_get_contents($root . '/backend/src/checkout.php');

ds_test('inventory reservation migration exists', $migrations !== []);
ds_test('inventory source is loaded by bootstrap', str_contains((string) file_get_contents($root . '/backend/src/bootstrap.php'), 'inventory.php'));
ds_test('catalog uses available-to-sell for purchasability', str_contains($catalogSrc, 'ds_atelier_inventory_available'));
ds_test('cart stock limit uses available-to-sell', str_contains($cartSrc, 'ds_atelier_inventory_available'));
ds_test('checkout place reserves inventory', str_contains($checkoutSrc, 'ds_atelier_inventory_reserve_order'));
ds_test('on-hand stock column is not treated as available', str_contains($inventorySrc, 'on_hand') && str_contains($inventorySrc, 'available'));
ds_test('admin guard remains fail-closed without an admin session', ds_atelier_admin_authenticated() === false);
ds_test('admin require denies inventory until a later phase', (ds_atelier_admin_require()['code'] ?? 0) === 403);
ds_test(
    'no public admin inventory endpoint exists',
    !is_file($root . '/backend/public/admin/inventory.php')
        && !is_file($root . '/backend/public/inventory/adjust.php')
        && !is_file($root . '/backend/public/checkout/inventory.php')
);

$availableMath = ds_atelier_inventory_decorate_variant(
    ['id' => 1, 'stock' => 10],
    ['reserved' => 3, 'committed' => 2]
);
ds_test('available equals on-hand minus reserved minus committed', ($availableMath['available'] ?? -1) === 5);
ds_test('catalog stock mapping uses available not on-hand', ($availableMath['stock'] ?? -1) === 5);
ds_test('on-hand is preserved separately from available', ($availableMath['on_hand'] ?? -1) === 10);

$mtoLimit = ds_atelier_inventory_available(['availability' => 'Made to order'], ['stock' => 0, 'available' => 0]);
ds_test('made-to-order is not qty-capped by on-hand stock', $mtoLimit === DS_ATELIER_CART_QTY_MAX);

$inStockLimit = ds_atelier_commerce_stock_limit(
    ['availability' => 'In stock'],
    ['available' => 4, 'stock' => 4, 'on_hand' => 10]
);
ds_test('in-stock cart limit uses available-to-sell', $inStockLimit === 4);

ds_test('reservation TTL is fifteen minutes', DS_ATELIER_INVENTORY_RESERVATION_TTL === 900);

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
    ds_skip('live inventory queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    ds_atelier_apply_migrations($pdo, $config['paths']['migrations']);
    ds_test('inventory tables exist after migrate', ds_atelier_inventory_tables_exist($pdo) === true);

    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('catalog seed is available for inventory tests', ($seed['ok'] ?? false) === true);

    $guestA = bin2hex(random_bytes(32));
    $guestB = bin2hex(random_bytes(32));
    $testGuestHashes[] = ds_atelier_guest_hash($guestA);
    $testGuestHashes[] = ds_atelier_guest_hash($guestB);

    $categoryId = (int) $pdo->query("SELECT id FROM categories WHERE slug = 'hoodies' LIMIT 1")->fetchColumn();
    $colourId = (int) $pdo->query("SELECT id FROM colours WHERE slug = 'black' LIMIT 1")->fetchColumn();
    $sizeId = (int) $pdo->query("SELECT id FROM sizes WHERE code = 'M' LIMIT 1")->fetchColumn();
    $suffix = bin2hex(random_bytes(3));
    $slug = 'phase6b-stock-' . $suffix;
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 1, 1, 0, 997)'
    )->execute([$slug, 'DSA-P6B-' . $suffix, 'Phase 6B Stock Tee', $categoryId, $colourId, 'Test', 'Cotton', 'In stock']);
    $productId = (int) $pdo->lastInsertId();
    $testProductIds[] = $productId;
    $pdo->prepare(
        'INSERT INTO product_print_types (product_id, print_type, sort_order) VALUES (?, ?, 1)'
    )->execute([$productId, 'DTF']);
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 799, 999, 1, 1)'
    )->execute([$productId, $sizeId, $colourId, 'DSA-P6B-' . $suffix . '-M-BLA']);
    $variantId = (int) $pdo->lastInsertId();

    $mtoSlug = 'phase6b-mto-' . $suffix;
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 1, 1, 0, 996)'
    )->execute([$mtoSlug, 'DSA-P6M-' . $suffix, 'Phase 6B Made To Order', $categoryId, $colourId, 'Test', 'Cotton', 'Made to order']);
    $mtoId = (int) $pdo->lastInsertId();
    $testProductIds[] = $mtoId;
    $pdo->prepare(
        'INSERT INTO product_print_types (product_id, print_type, sort_order) VALUES (?, ?, 1)'
    )->execute([$mtoId, 'DTF']);
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 799, 999, 0, 1)'
    )->execute([$mtoId, $sizeId, $colourId, 'DSA-P6M-' . $suffix . '-M-BLA']);

    $product = ds_atelier_commerce_load_product_by_slug($pdo, $slug);
    ds_test('low-stock fixture product loads', is_array($product) && (int) ($product['id'] ?? 0) === $productId);
    ds_test('on-hand remains 1 before reservation', ds_phase6b_on_hand($pdo, $variantId) === 1);
    ds_test('available equals on-hand before reservation', ds_phase6b_available($pdo, $product ?: [], $variantId) === 1);

    $detail = ds_atelier_catalog_get_product($pdo, $slug);
    $variantPayload = $detail['product']['variants'][0] ?? [];
    ds_test('catalog stock is available-to-sell', (int) ($variantPayload['stock'] ?? -1) === 1);
    ds_test('catalog onHand is the physical quantity', (int) ($variantPayload['onHand'] ?? -1) === 1);
    ds_test('low-stock variant is purchasable', ($variantPayload['purchasable'] ?? false) === true);

    ds_phase6b_guest($guestA);
    $add = ds_atelier_cart_add($pdo, $config, [
        'productId' => $slug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('guest can add the last available unit', ($add['ok'] ?? false) === true);

    $tooMany = ds_atelier_cart_add($pdo, $config, [
        'productId' => $slug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('cart rejects quantity above available-to-sell', ($tooMany['ok'] ?? true) === false && (int) ($tooMany['code'] ?? 0) === 409);

    $placed = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input());
    ds_test('placing the last unit succeeds', ($placed['ok'] ?? false) === true && ($placed['order']['ref'] ?? '') !== '');
    $refA = (string) ($placed['order']['ref'] ?? '');
    $orderA = $refA !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $refA) : null;
    if ($orderA !== null) {
        $testOrderIds[] = (int) $orderA['id'];
    }
    ds_test('on-hand is unchanged after reservation', ds_phase6b_on_hand($pdo, $variantId) === 1);
    ds_test('available drops after reservation', ds_phase6b_available($pdo, $product ?: [], $variantId) === 0);

    $reservedRow = $pdo->prepare(
        'SELECT status, quantity FROM inventory_reservations WHERE order_id = ? LIMIT 1'
    );
    $reservedRow->execute([(int) ($orderA['id'] ?? 0)]);
    $reservation = $reservedRow->fetch();
    ds_test('checkout creates a reserved inventory row', ($reservation['status'] ?? '') === DS_ATELIER_INVENTORY_STATUS_RESERVED);
    ds_test('reservation quantity matches the order line', (int) ($reservation['quantity'] ?? 0) === 1);

    $afterDetail = ds_atelier_catalog_get_product($pdo, $slug);
    $afterVariant = $afterDetail['product']['variants'][0] ?? [];
    ds_test('catalog hides reserved units from available stock', (int) ($afterVariant['stock'] ?? -1) === 0);
    ds_test('reserved variant is not purchasable', ($afterVariant['purchasable'] ?? true) === false);

    ds_phase6b_guest($guestB);
    $addB = ds_atelier_cart_add($pdo, $config, [
        'productId' => $slug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('second guest cannot add a reserved-out variant', ($addB['ok'] ?? true) === false && (int) ($addB['code'] ?? 0) === 409);

    $raceSlug = 'phase6b-race-' . $suffix;
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 1, 1, 0, 995)'
    )->execute([$raceSlug, 'DSA-P6R-' . $suffix, 'Phase 6B Race Tee', $categoryId, $colourId, 'Test', 'Cotton', 'In stock']);
    $raceProductId = (int) $pdo->lastInsertId();
    $testProductIds[] = $raceProductId;
    $pdo->prepare(
        'INSERT INTO product_print_types (product_id, print_type, sort_order) VALUES (?, ?, 1)'
    )->execute([$raceProductId, 'DTF']);
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 799, 999, 1, 1)'
    )->execute([$raceProductId, $sizeId, $colourId, 'DSA-P6R-' . $suffix . '-M-BLA']);

    ds_phase6b_guest($guestA);
    $raceAddA = ds_atelier_cart_add($pdo, $config, [
        'productId' => $raceSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_phase6b_guest($guestB);
    $raceAddB = ds_atelier_cart_add($pdo, $config, [
        'productId' => $raceSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('cart does not reserve stock before checkout', ($raceAddA['ok'] ?? false) === true && ($raceAddB['ok'] ?? false) === true);

    ds_phase6b_guest($guestA);
    $racePlaceA = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input([
        'contact' => ['email' => 'phase6b.racea@example.test'],
        'idempotencyKey' => 'chk_phase6b_race_a_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('first concurrent checkout reserves the last unit', ($racePlaceA['ok'] ?? false) === true);
    $raceRefA = (string) ($racePlaceA['order']['ref'] ?? '');
    $raceOrderA = $raceRefA !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $raceRefA) : null;
    if ($raceOrderA !== null) {
        $testOrderIds[] = (int) $raceOrderA['id'];
    }

    ds_phase6b_guest($guestB);
    $racePlaceB = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input([
        'contact' => ['email' => 'phase6b.raceb@example.test'],
        'idempotencyKey' => 'chk_phase6b_race_b_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('second concurrent checkout cannot oversell reserved stock', ($racePlaceB['ok'] ?? true) === false && (int) ($racePlaceB['code'] ?? 0) === 409);

    ds_phase6b_guest($guestA);
    $keyA = 'chk_phase6b_replay_' . bin2hex(random_bytes(6));
    ds_atelier_cart_add($pdo, $config, [
        'productId' => $mtoSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 2,
    ]);
    $mtoPlace = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input([
        'idempotencyKey' => $keyA,
        'contact' => ['email' => 'phase6b.mto@example.test'],
    ]));
    ds_test('made-to-order checkout succeeds at zero on-hand', ($mtoPlace['ok'] ?? false) === true);
    $mtoRef = (string) ($mtoPlace['order']['ref'] ?? '');
    $mtoOrder = $mtoRef !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $mtoRef) : null;
    if ($mtoOrder !== null) {
        $testOrderIds[] = (int) $mtoOrder['id'];
        $mtoReserved = (int) $pdo->query(
            'SELECT COUNT(*) FROM inventory_reservations WHERE order_id = ' . (int) $mtoOrder['id']
        )->fetchColumn();
        ds_test('made-to-order does not create inventory reservations', $mtoReserved === 0);
    } else {
        ds_test('made-to-order does not create inventory reservations', false);
    }

    $replayMto = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input([
        'idempotencyKey' => $keyA,
        'contact' => ['email' => 'phase6b.mto@example.test'],
    ]));
    ds_test('idempotent replay does not double-reserve', ($replayMto['replayed'] ?? false) === true);

    if ($orderA !== null) {
        $commit = ds_atelier_inventory_commit_order($pdo, (int) $orderA['id']);
        ds_test('commit converts reserved units', ($commit['ok'] ?? false) === true && (int) ($commit['committed'] ?? 0) === 1);
        $committedStatus = (string) $pdo->query(
            'SELECT status FROM inventory_reservations WHERE order_id = ' . (int) $orderA['id'] . ' LIMIT 1'
        )->fetchColumn();
        ds_test('committed reservation status is committed', $committedStatus === DS_ATELIER_INVENTORY_STATUS_COMMITTED);
        ds_test('on-hand is still unchanged after commit', ds_phase6b_on_hand($pdo, $variantId) === 1);
        ds_test('available stays zero after commit', ds_phase6b_available($pdo, $product ?: [], $variantId) === 0);

        $release = ds_atelier_inventory_release_order($pdo, (int) $orderA['id'], 'cancelled');
        ds_test('release restores reserved or committed units', ($release['ok'] ?? false) === true && (int) ($release['released'] ?? 0) === 1);
        ds_test('available returns after release', ds_phase6b_available($pdo, $product ?: [], $variantId) === 1);
        ds_test('on-hand remains unchanged after release', ds_phase6b_on_hand($pdo, $variantId) === 1);
    }

    ds_phase6b_guest($guestB);
    $expireAdd = ds_atelier_cart_add($pdo, $config, [
        'productId' => $slug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('released stock can be added again', ($expireAdd['ok'] ?? false) === true);
    $expirePlace = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input([
        'contact' => ['email' => 'phase6b.expire@example.test'],
        'idempotencyKey' => 'chk_phase6b_exp_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('released stock can be reserved again', ($expirePlace['ok'] ?? false) === true);
    $expireRef = (string) ($expirePlace['order']['ref'] ?? '');
    $expireOrder = $expireRef !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $expireRef) : null;
    if ($expireOrder !== null) {
        $testOrderIds[] = (int) $expireOrder['id'];
        $pdo->prepare(
            'UPDATE inventory_reservations SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE order_id = ?'
        )->execute([(int) $expireOrder['id']]);
        $expired = ds_atelier_inventory_expire_stale($pdo, $variantId);
        ds_test('expired reservations are released', $expired >= 1);
        ds_test('available returns after expiry', ds_phase6b_available($pdo, $product ?: [], $variantId) === 1);
        $expireKind = (string) $pdo->query(
            "SELECT kind FROM inventory_movements WHERE order_id = " . (int) $expireOrder['id'] . " ORDER BY id DESC LIMIT 1"
        )->fetchColumn();
        ds_test('expiry writes an expire movement', $expireKind === DS_ATELIER_INVENTORY_KIND_EXPIRE);
    } else {
        ds_test('expired reservations are released', false);
        ds_test('available returns after expiry', false);
        ds_test('expiry writes an expire movement', false);
    }

    ds_phase6b_guest($guestA);
    ds_atelier_cart_add($pdo, $config, [
        'productId' => $slug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    $returnPlace = ds_atelier_checkout_place($pdo, $config, ds_phase6b_place_input([
        'contact' => ['email' => 'phase6b.return@example.test'],
        'idempotencyKey' => 'chk_phase6b_ret_' . bin2hex(random_bytes(6)),
    ]));
    $returnRef = (string) ($returnPlace['order']['ref'] ?? '');
    $returnOrder = $returnRef !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $returnRef) : null;
    if ($returnOrder !== null) {
        $testOrderIds[] = (int) $returnOrder['id'];
        ds_atelier_inventory_commit_order($pdo, (int) $returnOrder['id']);
        $returned = ds_atelier_inventory_release_order($pdo, (int) $returnOrder['id'], 'return');
        ds_test('return restocks committed units', ($returned['ok'] ?? false) === true && (int) ($returned['released'] ?? 0) === 1);
        ds_test('available returns after a stock-safety return', ds_phase6b_available($pdo, $product ?: [], $variantId) === 1);
        $returnKind = (string) $pdo->query(
            "SELECT kind FROM inventory_movements WHERE order_id = " . (int) $returnOrder['id'] . " ORDER BY id DESC LIMIT 1"
        )->fetchColumn();
        ds_test('return writes a return movement', $returnKind === DS_ATELIER_INVENTORY_KIND_RETURN);
    } else {
        ds_test('return restocks committed units', false);
        ds_test('available returns after a stock-safety return', false);
        ds_test('return writes a return movement', false);
    }

    $docRoot = dirname(__DIR__, 2);
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['file', '/tmp/ds-atelier-phase6b-http.log', 'w'],
        2 => ['file', '/tmp/ds-atelier-phase6b-http.log', 'a'],
    ];
    $process = proc_open(
        sprintf('php -S 127.0.0.1:%d -t %s', $httpPort, escapeshellarg($docRoot)),
        $descriptor,
        $pipes,
        $docRoot
    );
    if (is_resource($process)) {
        $status = proc_get_status($process);
        $httpPid = (int) ($status['pid'] ?? 0);
        usleep(250000);
    }

    if (is_resource($process) && $httpPid > 0) {
        $base = 'http://127.0.0.1:' . $httpPort;
        $jar = [];
        $admin = ds_phase6b_http('GET', $base . '/backend/public/admin/inventory.php', null, $jar);
        ds_test('HTTP admin inventory path is not public', in_array($admin['code'], [403, 404], true));
        $index = ds_phase6b_http('GET', $base . '/backend/public/checkout/index.php', null, $jar);
        ds_test('HTTP checkout directory remains forbidden', $index['code'] === 403);
    } else {
        ds_skip('HTTP inventory endpoints', 'php built-in server unavailable');
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase6b_cleanup(
        $pdo,
        array_values(array_unique(array_filter($testCustomerIds))),
        array_values(array_unique(array_filter($testGuestHashes))),
        array_values(array_unique(array_filter($testProductIds))),
        array_values(array_unique(array_filter($testOrderIds)))
    );
    if (isset($process) && is_resource($process)) {
        proc_terminate($process);
        proc_close($process);
    }
}

fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
exit($fail === 0 ? 0 : 1);
