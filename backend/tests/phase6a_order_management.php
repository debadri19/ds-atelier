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
$httpPort = 8096;
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

function ds_phase6a_cleanup(PDO $pdo, array $customerIds, array $guestHashes, array $productIds, array $orderIds): void
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

function ds_phase6a_guest(string $raw): array
{
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember']);
    return ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
}

function ds_phase6a_customer(int $id): array
{
    unset($_COOKIE[DS_ATELIER_GUEST_COOKIE]);
    $_SESSION['_ds_atelier_customer_id'] = $id;
    return ['type' => 'customer', 'customer_id' => $id, 'guest_hash' => null];
}

function ds_phase6a_anonymous(): void
{
    unset($_COOKIE[DS_ATELIER_GUEST_COOKIE], $_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember']);
}

function ds_phase6a_register(PDO $pdo, string $suffix, int $mobileLead = 8): array
{
    $email = "phase6a.{$suffix}@example.test";
    $mobile = (string) $mobileLead . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
    $password = 'Phase6apass!';
    $registered = ds_atelier_register_customer($pdo, [
        'name' => "Phase Six {$suffix}",
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

function ds_phase6a_place_input(array $overrides = []): array
{
    $base = [
        'contact' => ['email' => 'phase6a.guest@example.test'],
        'shipping' => [
            'name' => 'Phase Six Guest',
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
        'idempotencyKey' => 'chk_phase6a_' . bin2hex(random_bytes(8)),
    ];
    return array_replace_recursive($base, $overrides);
}

function ds_phase6a_add_tee(PDO $pdo, array $config, int $qty = 1, string $color = 'Black'): array
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

function ds_phase6a_http(string $method, string $url, ?array $body, array &$jar, ?string $csrf = null): array
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

function ds_phase6a_order_refs(array $payload): array
{
    $orders = is_array($payload['orders'] ?? null) ? $payload['orders'] : [];
    $refs = [];
    foreach ($orders as $order) {
        if (is_array($order) && isset($order['ref'])) {
            $refs[] = (string) $order['ref'];
        }
    }
    return $refs;
}

$root = dirname(__DIR__, 2);
$accountJs = (string) file_get_contents($root . '/js/account.js');
$commerceJs = (string) file_get_contents($root . '/js/commerce.js');
$successJs = (string) file_get_contents($root . '/js/order-success.js');
$accountHtml = (string) file_get_contents($root . '/account.html');
$successHtml = (string) file_get_contents($root . '/order-success.html');

ds_test('account page keeps the order list hook', str_contains($accountHtml, 'data-order-list'));
ds_test('account.js lists orders from the customer API', str_contains($accountJs, 'listOrders') && str_contains($commerceJs, 'customer/orders.php'));
ds_test('account.js does not seed demo order history', !str_contains($accountJs, 'DSA-261002-7721'));
ds_test('order-success.js does not fall back to getLastOrder', !str_contains($successJs, 'getLastOrder'));
ds_test('order-success.js does not render a local unmatched order', !str_contains($successJs, 'localOrder('));
ds_test('order-success empty state remains available', str_contains($successHtml, 'data-success-empty'));
ds_test('admin guard remains fail-closed without an admin session', ds_atelier_admin_authenticated() === false);
ds_test('admin require denies until a later phase', (ds_atelier_admin_require()['code'] ?? 0) === 403);
ds_test('no public admin order endpoint exists', !is_file($root . '/backend/public/admin/orders.php') && !is_file($root . '/backend/public/checkout/admin.php'));

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
    ds_skip('live order management queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('catalog seed is available for order management tests', ($seed['ok'] ?? false) === true);

    $guestA = bin2hex(random_bytes(32));
    $guestB = bin2hex(random_bytes(32));
    $testGuestHashes[] = ds_atelier_guest_hash($guestA);
    $testGuestHashes[] = ds_atelier_guest_hash($guestB);

    ds_phase6a_anonymous();
    $anonList = ds_atelier_checkout_list_orders($pdo, $config, []);
    ds_test('anonymous actors receive an empty order list', ($anonList['ok'] ?? false) === true && ($anonList['orders'] ?? null) === []);
    ds_test('anonymous order list total is zero', (int) ($anonList['meta']['total'] ?? -1) === 0);

    ds_phase6a_guest($guestA);
    ds_phase6a_add_tee($pdo, $config, 1);
    $guestPlace = ds_atelier_checkout_place($pdo, $config, ds_phase6a_place_input([
        'idempotencyKey' => 'chk_phase6a_guest_a_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('guest can place a pending-payment order', ($guestPlace['ok'] ?? false) === true);
    $guestRef = (string) ($guestPlace['order']['ref'] ?? '');
    ds_test('guest confirmation stays pending payment', ($guestPlace['order']['status'] ?? '') === 'pending_payment' && ($guestPlace['order']['paymentStatus'] ?? '') === 'pending');
    ds_test('guest confirmation copy does not claim paid', !str_contains(strtolower(implode(' ', $guestPlace['order']['notices'] ?? [])), 'paid'));
    if ($guestRef !== '') {
        $row = ds_atelier_checkout_find_order_by_ref($pdo, $guestRef);
        if ($row !== null) {
            $testOrderIds[] = (int) $row['id'];
        }
    }

    $guestList = ds_atelier_checkout_list_orders($pdo, $config, []);
    $guestRefs = ds_phase6a_order_refs($guestList);
    ds_test('guest can list their own order', in_array($guestRef, $guestRefs, true));
    ds_test('guest list includes pending payment presentation', ($guestList['orders'][0]['paymentStatus'] ?? '') === 'pending');

    $owned = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $guestRef]);
    ds_test('guest can load their own order by ref', ($owned['ok'] ?? false) === true && ($owned['order']['ref'] ?? '') === $guestRef);

    ds_phase6a_guest($guestB);
    $otherGuestList = ds_atelier_checkout_list_orders($pdo, $config, []);
    ds_test('another guest list does not include a foreign order', !in_array($guestRef, ds_phase6a_order_refs($otherGuestList), true));
    $otherGuestGet = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $guestRef]);
    ds_test('another guest cannot load a foreign order', ($otherGuestGet['ok'] ?? true) === false && (int) ($otherGuestGet['code'] ?? 0) === 404);

    $accountA = ds_phase6a_register($pdo, 'a' . bin2hex(random_bytes(2)), 7);
    $accountB = ds_phase6a_register($pdo, 'b' . bin2hex(random_bytes(2)), 6);
    $testCustomerIds[] = $accountA['id'];
    $testCustomerIds[] = $accountB['id'];
    ds_test('order management test customers register', $accountA['id'] > 0 && $accountB['id'] > 0);

    ds_phase6a_customer($accountA['id']);
    ds_phase6a_add_tee($pdo, $config, 2);
    $customerPlace = ds_atelier_checkout_place($pdo, $config, ds_phase6a_place_input([
        'contact' => ['email' => $accountA['email']],
        'paymentMethod' => 'Card',
        'idempotencyKey' => 'chk_phase6a_cust_a_' . bin2hex(random_bytes(6)),
    ]));
    ds_test('signed-in customer can place an order', ($customerPlace['ok'] ?? false) === true);
    $customerRef = (string) ($customerPlace['order']['ref'] ?? '');
    ds_test('customer order remains pending payment', ($customerPlace['order']['status'] ?? '') === 'pending_payment' && ($customerPlace['order']['paymentStatus'] ?? '') === 'pending');
    if ($customerRef !== '') {
        $rowC = ds_atelier_checkout_find_order_by_ref($pdo, $customerRef);
        if ($rowC !== null) {
            $testOrderIds[] = (int) $rowC['id'];
        }
    }

    ds_phase6a_add_tee($pdo, $config, 1, 'White');
    $customerPlaceTwo = ds_atelier_checkout_place($pdo, $config, ds_phase6a_place_input([
        'contact' => ['email' => $accountA['email']],
        'paymentMethod' => 'UPI',
        'idempotencyKey' => 'chk_phase6a_cust_a2_' . bin2hex(random_bytes(6)),
    ]));
    $customerRefTwo = (string) ($customerPlaceTwo['order']['ref'] ?? '');
    if ($customerRefTwo !== '') {
        $rowC2 = ds_atelier_checkout_find_order_by_ref($pdo, $customerRefTwo);
        if ($rowC2 !== null) {
            $testOrderIds[] = (int) $rowC2['id'];
        }
    }

    $customerList = ds_atelier_checkout_list_orders($pdo, $config, []);
    $customerRefs = ds_phase6a_order_refs($customerList);
    ds_test('customer list includes their own orders', in_array($customerRef, $customerRefs, true) && in_array($customerRefTwo, $customerRefs, true));
    ds_test('customer list does not include a guest order', !in_array($guestRef, $customerRefs, true));
    ds_test('customer list newest-first', ($customerList['orders'][0]['ref'] ?? '') === $customerRefTwo);

    $pageOne = ds_atelier_checkout_list_orders($pdo, $config, ['page' => 1, 'per_page' => 1]);
    $pageTwo = ds_atelier_checkout_list_orders($pdo, $config, ['page' => 2, 'per_page' => 1]);
    ds_test('order list pagination returns one row per page', count($pageOne['orders'] ?? []) === 1 && count($pageTwo['orders'] ?? []) === 1);
    ds_test('order list pagination separates pages', ($pageOne['orders'][0]['ref'] ?? '') !== ($pageTwo['orders'][0]['ref'] ?? ''));
    ds_test('order list pagination meta is accurate', (int) ($pageOne['meta']['total'] ?? 0) >= 2 && (int) ($pageOne['meta']['per_page'] ?? 0) === 1);

    ds_phase6a_customer($accountB['id']);
    $otherCustomerList = ds_atelier_checkout_list_orders($pdo, $config, []);
    ds_test('customers cannot list another customer order', !in_array($customerRef, ds_phase6a_order_refs($otherCustomerList), true));
    $otherCustomerGet = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $customerRef]);
    ds_test('customers cannot load another customer order', ($otherCustomerGet['ok'] ?? true) === false && (int) ($otherCustomerGet['code'] ?? 0) === 404);

    ds_phase6a_guest($guestA);
    $guestSeesCustomer = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $customerRef]);
    ds_test('guests cannot load a customer order', ($guestSeesCustomer['ok'] ?? true) === false && (int) ($guestSeesCustomer['code'] ?? 0) === 404);
    $guestListCustomer = ds_atelier_checkout_list_orders($pdo, $config, []);
    ds_test('guest list does not include a customer order', !in_array($customerRef, ds_phase6a_order_refs($guestListCustomer), true));

    $missing = ds_atelier_checkout_get_order($pdo, $config, ['ref' => 'DSA-000000000000000000000000']);
    ds_test('unknown order refs are not found', ($missing['ok'] ?? true) === false && (int) ($missing['code'] ?? 0) === 404);

    $unmatched = ds_atelier_checkout_get_order($pdo, $config, ['ref' => 'not-an-order']);
    ds_test('invalid order refs are not found', ($unmatched['ok'] ?? true) === false && (int) ($unmatched['code'] ?? 0) === 404);

    $docRoot = $root;
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['file', '/tmp/ds-atelier-phase6a-http.log', 'w'],
        2 => ['file', '/tmp/ds-atelier-phase6a-http.log', 'a'],
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
        $csrfResp = ds_phase6a_http('GET', $base . '/backend/public/customer/csrf.php', null, $jar);
        $csrf = is_array($csrfResp['body']) ? (string) ($csrfResp['body']['csrf'] ?? '') : '';
        ds_test('HTTP CSRF endpoint issues a token', $csrfResp['code'] === 200 && strlen($csrf) >= 32);

        $httpAdd = ds_phase6a_http('POST', $base . '/backend/public/cart/add.php', [
            'productId' => 'oversized-graphic-tee',
            'color' => 'Cream',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 1,
        ], $jar, $csrf);
        ds_test('HTTP cart add for order list succeeds', $httpAdd['code'] === 200 && ($httpAdd['body']['ok'] ?? false) === true);
        if (isset($jar[DS_ATELIER_GUEST_COOKIE])) {
            $testGuestHashes[] = ds_atelier_guest_hash((string) $jar[DS_ATELIER_GUEST_COOKIE]);
        }

        $httpPlace = ds_phase6a_http('POST', $base . '/backend/public/checkout/place.php', ds_phase6a_place_input([
            'idempotencyKey' => 'chk_phase6a_http_' . bin2hex(random_bytes(8)),
            'paymentMethod' => 'Razorpay',
        ]), $jar, $csrf);
        ds_test('HTTP place with CSRF succeeds', ($httpPlace['body']['ok'] ?? false) === true);
        $httpRef = (string) ($httpPlace['body']['order']['ref'] ?? '');
        if ($httpRef !== '') {
            $httpRow = $pdo->prepare('SELECT id FROM orders WHERE public_ref = ? LIMIT 1');
            $httpRow->execute([$httpRef]);
            $httpId = (int) $httpRow->fetchColumn();
            if ($httpId > 0) {
                $testOrderIds[] = $httpId;
            }
        }

        $httpList = ds_phase6a_http('GET', $base . '/backend/public/checkout/orders.php', null, $jar);
        ds_test('HTTP checkout order list returns the placed order', in_array($httpRef, ds_phase6a_order_refs($httpList['body'] ?? []), true));
        ds_test('HTTP checkout order list stays pending payment', ($httpList['body']['orders'][0]['paymentStatus'] ?? '') === 'pending');

        $httpCustomerList = ds_phase6a_http('GET', $base . '/backend/public/customer/orders.php', null, $jar);
        ds_test('HTTP customer order list returns the placed order', in_array($httpRef, ds_phase6a_order_refs($httpCustomerList['body'] ?? []), true));

        $httpGet = ds_phase6a_http('GET', $base . '/backend/public/checkout/order.php?ref=' . rawurlencode($httpRef), null, $jar);
        ds_test('HTTP order get returns the placed order', ($httpGet['body']['ok'] ?? false) === true && ($httpGet['body']['order']['ref'] ?? '') === $httpRef);

        $otherJar = [];
        $otherList = ds_phase6a_http('GET', $base . '/backend/public/customer/orders.php', null, $otherJar);
        ds_test('HTTP order list is isolated by guest cookie', !in_array($httpRef, ds_phase6a_order_refs($otherList['body'] ?? []), true));
        $otherGet = ds_phase6a_http('GET', $base . '/backend/public/checkout/order.php?ref=' . rawurlencode($httpRef), null, $otherJar);
        ds_test('HTTP order get is isolated by guest cookie', ($otherGet['body']['ok'] ?? true) === false);

        $indexCheckout = ds_phase6a_http('GET', $base . '/backend/public/checkout/index.php', null, $jar);
        ds_test('checkout directory index is forbidden', $indexCheckout['code'] === 403);
        $indexCustomer = ds_phase6a_http('GET', $base . '/backend/public/customer/index.php', null, $jar);
        ds_test('customer directory index is forbidden', $indexCustomer['code'] === 403);
        $indexTests = ds_phase6a_http('GET', $base . '/backend/tests/index.php', null, $jar);
        ds_test('tests directory index is forbidden', $indexTests['code'] === 403);

        $accountPage = ds_phase6a_http('GET', $base . '/account.html', null, $jar);
        ds_test('account page remains available over HTTP', is_string($accountPage['raw']) && str_contains((string) $accountPage['raw'], 'data-order-list'));
        $successPage = ds_phase6a_http('GET', $base . '/order-success.html', null, $jar);
        ds_test('order success page remains available over HTTP', is_string($successPage['raw']) && str_contains((string) $successPage['raw'], 'data-success-filled'));
    } else {
        ds_skip('HTTP order management endpoints', 'php built-in server unavailable');
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase6a_cleanup(
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
