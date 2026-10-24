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
$httpPort = 8095;
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

function ds_phase5_cleanup(PDO $pdo, array $customerIds, array $guestHashes, array $productIds, array $orderIds): void
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

function ds_phase5_guest(string $raw): array
{
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember']);
    return ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
}

function ds_phase5_customer(int $id): array
{
    unset($_COOKIE[DS_ATELIER_GUEST_COOKIE]);
    $_SESSION['_ds_atelier_customer_id'] = $id;
    return ['type' => 'customer', 'customer_id' => $id, 'guest_hash' => null];
}

function ds_phase5_register(PDO $pdo, string $suffix, int $mobileLead = 8): array
{
    $email = "phase5.{$suffix}@example.test";
    $mobile = (string) $mobileLead . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
    $password = 'Phase5pass!';
    $registered = ds_atelier_register_customer($pdo, [
        'name' => "Phase Five {$suffix}",
        'email' => $email,
        'mobile' => $mobile,
        'password' => $password,
        'confirm' => $password,
        'terms' => true,
    ]);
    return [
        'result' => $registered,
        'email' => $email,
        'mobile' => $mobile,
        'password' => $password,
        'id' => (int) ($registered['customer']['id'] ?? 0),
    ];
}

function ds_phase5_place_input(array $overrides = []): array
{
    $base = [
        'contact' => ['email' => 'phase5.guest@example.test'],
        'shipping' => [
            'name' => 'Phase Five Guest',
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
        'idempotencyKey' => 'chk_phase5_' . bin2hex(random_bytes(8)),
    ];
    return array_replace_recursive($base, $overrides);
}

function ds_phase5_quote_item(array $overrides = []): array
{
    return array_merge([
        'itemId' => 1,
        'id' => 'oversized-graphic-tee',
        'name' => 'Oversized Graphic Tee',
        'image' => '',
        'alt' => 'Oversized Graphic Tee',
        'sku' => 'DSA-TEE-M-BLA',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'artworkId' => '',
        'artworkName' => null,
        'qty' => 1,
        'unitPrice' => '799.00',
        'unitMrp' => '999.00',
        'purchasable' => true,
        'issues' => [],
    ], $overrides);
}

function ds_phase5_add_tee(PDO $pdo, array $config, int $qty = 1, string $color = 'Black'): array
{
    return ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => $color,
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => $qty,
    ]);
}

function ds_phase5_http(string $method, string $url, ?array $body, array &$jar, ?string $csrf = null): array
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

function ds_phase5_stock(PDO $pdo, string $slug, string $colour, string $size): int
{
    $stmt = $pdo->prepare(
        'SELECT v.stock
         FROM product_variants v
         INNER JOIN products p ON p.id = v.product_id
         INNER JOIN colours c ON c.id = v.colour_id
         INNER JOIN sizes s ON s.id = v.size_id
         WHERE p.slug = ? AND c.name = ? AND s.code = ?
         LIMIT 1'
    );
    $stmt->execute([$slug, $colour, $size]);
    return (int) $stmt->fetchColumn();
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

ds_test('money paise parses rupees', ds_atelier_money_paise('799.00') === 79900);
ds_test('money format keeps two decimals', ds_atelier_money_format(79900) === '799.00');
ds_test('percent half-up uses paise', ds_atelier_checkout_percent_paise(79900, '10.00') === 7990);

$emptyQuote = ds_atelier_checkout_quote_from_items($config, [], '');
ds_test('empty cart quote is rejected', ($emptyQuote['ok'] ?? true) === false && (int) ($emptyQuote['code'] ?? 0) === 422);

$quoted = ds_atelier_checkout_quote_from_items($config, [ds_phase5_quote_item()], '');
ds_test('demo shipping applies below free threshold', ($quoted['ok'] ?? false) === true && ($quoted['quote']['shippingTotal'] ?? '') === '79.00');
ds_test('unconfigured tax stays zero', ($quoted['ok'] ?? false) === true && ($quoted['quote']['taxTotal'] ?? '') === '0.00');
ds_test(
    'quote notices explain shipping and tax',
    ($quoted['ok'] ?? false) === true
        && is_array($quoted['quote']['notices'] ?? null)
        && implode(' ', $quoted['quote']['notices']) !== ''
);

$welcome = ds_atelier_checkout_quote_from_items($config, [ds_phase5_quote_item()], 'WELCOME10');
ds_test('WELCOME10 applies a 10 percent demo discount', ($welcome['ok'] ?? false) === true && ($welcome['quote']['discountTotal'] ?? '') === '79.90');
ds_test('WELCOME10 notice is not a production promotion', ($welcome['ok'] ?? false) === true && str_contains(implode(' ', $welcome['quote']['notices'] ?? []), 'development demo coupon'));

$freeShip = ds_atelier_checkout_quote_from_items($config, [ds_phase5_quote_item(['qty' => 2])], '');
ds_test('shipping is free at or above the demo threshold', ($freeShip['ok'] ?? false) === true && ($freeShip['quote']['shippingTotal'] ?? '') === '0.00');

$badCoupon = ds_atelier_checkout_quote_from_items($config, [ds_phase5_quote_item()], 'NOTREAL');
ds_test('unknown coupons are rejected', ($badCoupon['ok'] ?? true) === false && (int) ($badCoupon['code'] ?? 0) === 422);

$blocked = ds_atelier_checkout_quote_from_items($config, [ds_phase5_quote_item(['purchasable' => false, 'issues' => ['unavailable']])], '');
ds_test('unavailable cart lines block checkout', ($blocked['ok'] ?? true) === false && (int) ($blocked['code'] ?? 0) === 409);

$prodConfig = $config;
$prodConfig['env'] = 'production';
$settings = ds_atelier_checkout_settings($config);
$prodShip = ds_atelier_checkout_shipping($prodConfig, $settings, 50000);
ds_test('production blocks development_demo shipping', ($prodShip['ok'] ?? true) === false && (int) ($prodShip['code'] ?? 0) === 503);
$prodTax = ds_atelier_checkout_tax($prodConfig, $settings, 50000);
ds_test('production blocks unconfigured tax', ($prodTax['ok'] ?? true) === false && (int) ($prodTax['code'] ?? 0) === 503);

ds_test('invalid idempotency keys are empty', ds_atelier_checkout_parse_idempotency('short') === '');
ds_test('valid idempotency keys are kept', ds_atelier_checkout_parse_idempotency('chk_phase5_idemok01') !== '');

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_skip('live checkout queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('catalog seed is available for checkout tests', ($seed['ok'] ?? false) === true);

    $guestA = bin2hex(random_bytes(32));
    $guestB = bin2hex(random_bytes(32));
    $testGuestHashes[] = ds_atelier_guest_hash($guestA);
    $testGuestHashes[] = ds_atelier_guest_hash($guestB);

    ds_phase5_guest($guestA);
    $emptyCartQuote = ds_atelier_checkout_quote($pdo, $config, []);
    ds_test('live empty cart quote is rejected', ($emptyCartQuote['ok'] ?? true) === false && (int) ($emptyCartQuote['code'] ?? 0) === 422);

    $emptyPlace = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input());
    ds_test('live empty cart cannot be placed', ($emptyPlace['ok'] ?? true) === false && (int) ($emptyPlace['code'] ?? 0) === 422);

    $badMethod = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input(['paymentMethod' => 'Cash']));
    ds_test('invalid payment methods are rejected', ($badMethod['ok'] ?? true) === false && (int) ($badMethod['code'] ?? 0) === 422);

    $clientPaid = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input(['paymentStatus' => 'paid']));
    ds_test('clients cannot set payment status', ($clientPaid['ok'] ?? true) === false && (int) ($clientPaid['code'] ?? 0) === 422);

    $clientOwner = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input(['customerId' => 1]));
    ds_test('clients cannot set customer ownership', ($clientOwner['ok'] ?? true) === false && (int) ($clientOwner['code'] ?? 0) === 422);

    $badAddress = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input([
        'shipping' => ['pincode' => '12'],
    ]));
    ds_test('invalid shipping addresses are rejected', ($badAddress['ok'] ?? true) === false && (int) ($badAddress['code'] ?? 0) === 422);

    ds_phase5_add_tee($pdo, $config, 1);
    $liveQuote = ds_atelier_checkout_quote($pdo, $config, []);
    ds_test('guest quote uses catalog prices', ($liveQuote['ok'] ?? false) === true && ($liveQuote['quote']['itemSubtotal'] ?? '') === '799.00');
    ds_test('guest quote shipping is the development demo fee', ($liveQuote['ok'] ?? false) === true && ($liveQuote['quote']['shippingTotal'] ?? '') === '79.00');

    $stockBefore = ds_phase5_stock($pdo, 'oversized-graphic-tee', 'Black', 'M');
    $keyA = 'chk_phase5_guest_a_' . bin2hex(random_bytes(6));
    $placed = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input([
        'idempotencyKey' => $keyA,
        'coupon' => '',
    ]));
    ds_test('guest can place a pending-payment order', ($placed['ok'] ?? false) === true && ($placed['order']['ref'] ?? '') !== '');
    ds_test('placed orders are pending_payment', ($placed['order']['status'] ?? '') === 'pending_payment');
    ds_test('placed orders have pending payment status', ($placed['order']['paymentStatus'] ?? '') === 'pending');
    ds_test('confirmation copy does not claim paid', !str_contains(strtolower(implode(' ', $placed['order']['notices'] ?? [])), 'paid'));
    ds_test('cart is cleared after a successful place', (int) ($placed['cart']['count'] ?? -1) === 0);
    $stockAfter = ds_phase5_stock($pdo, 'oversized-graphic-tee', 'Black', 'M');
    ds_test('placing an order does not decrement inventory', $stockBefore === $stockAfter);

    $refA = (string) ($placed['order']['ref'] ?? '');
    if ($refA !== '') {
        $row = ds_atelier_checkout_find_order_by_ref($pdo, $refA);
        if ($row !== null) {
            $testOrderIds[] = (int) $row['id'];
        }
    }

    $replay = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input([
        'idempotencyKey' => $keyA,
    ]));
    ds_test('idempotent replay returns the same order', ($replay['ok'] ?? false) === true && ($replay['order']['ref'] ?? '') === $refA);
    ds_test('idempotent replay is marked replayed', ($replay['replayed'] ?? false) === true);

    $owned = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $refA]);
    ds_test('owner can load the placed order', ($owned['ok'] ?? false) === true && ($owned['order']['ref'] ?? '') === $refA);

    ds_phase5_guest($guestB);
    $foreign = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $refA]);
    ds_test('another guest cannot load the order', ($foreign['ok'] ?? true) === false && (int) ($foreign['code'] ?? 0) === 404);

    $stolenKey = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input([
        'idempotencyKey' => $keyA,
    ]));
    ds_test('another guest cannot replay a foreign idempotency key', ($stolenKey['ok'] ?? true) === false);

    ds_phase5_add_tee($pdo, $config, 1, 'White');
    $second = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input([
        'coupon' => 'WELCOME10',
        'idempotencyKey' => 'chk_phase5_guest_b_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('a second guest can place an isolated order', ($second['ok'] ?? false) === true && ($second['order']['ref'] ?? '') !== $refA);
    ds_test('demo coupon is stored on the order', ($second['order']['coupon'] ?? '') === 'WELCOME10');
    if (($second['order']['ref'] ?? '') !== '') {
        $rowB = ds_atelier_checkout_find_order_by_ref($pdo, (string) $second['order']['ref']);
        if ($rowB !== null) {
            $testOrderIds[] = (int) $rowB['id'];
        }
    }

    $accountA = ds_phase5_register($pdo, 'a' . bin2hex(random_bytes(2)), 7);
    $accountB = ds_phase5_register($pdo, 'b' . bin2hex(random_bytes(2)), 6);
    $testCustomerIds[] = $accountA['id'];
    $testCustomerIds[] = $accountB['id'];
    ds_test('checkout test customers register', $accountA['id'] > 0 && $accountB['id'] > 0);

    ds_phase5_customer($accountA['id']);
    ds_phase5_add_tee($pdo, $config, 2);
    $customerPlace = ds_atelier_checkout_place($pdo, $config, ds_phase5_place_input([
        'contact' => ['email' => $accountA['email']],
        'paymentMethod' => 'Card',
        'idempotencyKey' => 'chk_phase5_cust_a_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('signed-in customer can place an order', ($customerPlace['ok'] ?? false) === true);
    ds_test('customer orders are free-shipping above the demo threshold', ($customerPlace['order']['shippingTotal'] ?? '') === '0.00');
    $customerRef = (string) ($customerPlace['order']['ref'] ?? '');
    if ($customerRef !== '') {
        $rowC = ds_atelier_checkout_find_order_by_ref($pdo, $customerRef);
        if ($rowC !== null) {
            $testOrderIds[] = (int) $rowC['id'];
        }
    }

    ds_phase5_customer($accountB['id']);
    $otherCustomer = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $customerRef]);
    ds_test('customers cannot load another customer order', ($otherCustomer['ok'] ?? true) === false && (int) ($otherCustomer['code'] ?? 0) === 404);

    $guestPeek = ds_phase5_guest($guestA);
    $guestSeesCustomer = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $customerRef]);
    ds_test('guests cannot load a customer order', ($guestSeesCustomer['ok'] ?? true) === false && (int) ($guestSeesCustomer['code'] ?? 0) === 404);
    unset($guestPeek);

    $missing = ds_atelier_checkout_get_order($pdo, $config, ['ref' => 'DSA-000000000000000000000000']);
    ds_test('unknown order refs are not found', ($missing['ok'] ?? true) === false && (int) ($missing['code'] ?? 0) === 404);

    $docRoot = dirname(__DIR__, 2);
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['file', '/tmp/ds-atelier-phase5-http.log', 'w'],
        2 => ['file', '/tmp/ds-atelier-phase5-http.log', 'a'],
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
        $csrfResp = ds_phase5_http('GET', $base . '/backend/public/customer/csrf.php', null, $jar);
        $csrf = is_array($csrfResp['body']) ? (string) ($csrfResp['body']['csrf'] ?? '') : '';
        ds_test('HTTP CSRF endpoint issues a token', $csrfResp['code'] === 200 && strlen($csrf) >= 32);

        $noCsrf = ds_phase5_http('POST', $base . '/backend/public/checkout/quote.php', ['coupon' => ''], $jar);
        ds_test('HTTP quote without CSRF is forbidden', $noCsrf['code'] === 403);

        $badCsrf = ds_phase5_http('POST', $base . '/backend/public/checkout/place.php', ds_phase5_place_input(), $jar, $csrf . 'x');
        ds_test('HTTP place with a tampered CSRF token is forbidden', $badCsrf['code'] === 403);

        $httpAdd = ds_phase5_http('POST', $base . '/backend/public/cart/add.php', [
            'productId' => 'oversized-graphic-tee',
            'color' => 'Cream',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 1,
        ], $jar, $csrf);
        ds_test('HTTP cart add for checkout succeeds', $httpAdd['code'] === 200 && ($httpAdd['body']['ok'] ?? false) === true);
        if (isset($jar[DS_ATELIER_GUEST_COOKIE])) {
            $testGuestHashes[] = ds_atelier_guest_hash((string) $jar[DS_ATELIER_GUEST_COOKIE]);
        }

        $httpQuote = ds_phase5_http('POST', $base . '/backend/public/checkout/quote.php', ['coupon' => ''], $jar, $csrf);
        ds_test('HTTP quote with CSRF succeeds', $httpQuote['code'] === 200 && ($httpQuote['body']['ok'] ?? false) === true);

        $httpKey = 'chk_phase5_http_' . bin2hex(random_bytes(8));
        $httpPlace = ds_phase5_http('POST', $base . '/backend/public/checkout/place.php', ds_phase5_place_input([
            'idempotencyKey' => $httpKey,
            'paymentMethod' => 'Razorpay',
        ]), $jar, $csrf);
        ds_test('HTTP place with CSRF succeeds', ($httpPlace['body']['ok'] ?? false) === true);
        ds_test('HTTP place returns pending payment', ($httpPlace['body']['order']['paymentStatus'] ?? '') === 'pending');
        $httpRef = (string) ($httpPlace['body']['order']['ref'] ?? '');
        if ($httpRef !== '') {
            $httpRow = $pdo->prepare('SELECT id FROM orders WHERE public_ref = ? LIMIT 1');
            $httpRow->execute([$httpRef]);
            $httpId = (int) $httpRow->fetchColumn();
            if ($httpId > 0) {
                $testOrderIds[] = $httpId;
            }
        }

        $httpGet = ds_phase5_http('GET', $base . '/backend/public/checkout/order.php?ref=' . rawurlencode($httpRef), null, $jar);
        ds_test('HTTP order get returns the placed order', ($httpGet['body']['ok'] ?? false) === true && ($httpGet['body']['order']['ref'] ?? '') === $httpRef);

        $otherJar = [];
        $otherGet = ds_phase5_http('GET', $base . '/backend/public/checkout/order.php?ref=' . rawurlencode($httpRef), null, $otherJar);
        ds_test('HTTP order get is isolated by guest cookie', ($otherGet['body']['ok'] ?? true) === false);

        $index = ds_phase5_http('GET', $base . '/backend/public/checkout/index.php', null, $jar);
        ds_test('checkout directory index is forbidden', $index['code'] === 403);

        $checkoutHtml = ds_phase5_http('GET', $base . '/checkout.html', null, $jar);
        ds_test('checkout page remains available over HTTP', is_string($checkoutHtml['raw']) && str_contains((string) $checkoutHtml['raw'], 'data-place-order'));
        $successHtml = ds_phase5_http('GET', $base . '/order-success.html', null, $jar);
        ds_test('order success page remains available over HTTP', is_string($successHtml['raw']) && str_contains((string) $successHtml['raw'], 'data-success-filled'));
    } else {
        ds_skip('HTTP checkout endpoints', 'php built-in server unavailable');
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase5_cleanup(
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
