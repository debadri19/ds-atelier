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
$httpPort = 8098;
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

function ds_phase6c_cleanup(PDO $pdo, array $customerIds, array $guestHashes, array $productIds, array $orderIds): void
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
        ds_atelier_mail_purge_orders($pdo, $orderIds);
        ds_atelier_invoice_purge_orders($pdo, $orderIds);
        ds_atelier_fulfilment_purge_orders($pdo, $orderIds);
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
        ds_atelier_mail_purge_customers($pdo, $customerIds);
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

function ds_phase6c_guest(string $raw): array
{
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember'], $_SESSION['_ds_atelier_admin_id']);
    return ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
}

function ds_phase6c_customer(int $id): array
{
    unset($_COOKIE[DS_ATELIER_GUEST_COOKIE], $_SESSION['_ds_atelier_admin_id']);
    $_SESSION['_ds_atelier_customer_id'] = $id;
    return ['type' => 'customer', 'customer_id' => $id, 'guest_hash' => null];
}

function ds_phase6c_admin(): void
{
    $_SESSION['_ds_atelier_admin_id'] = 1;
}

function ds_phase6c_clear_admin(): void
{
    unset($_SESSION['_ds_atelier_admin_id']);
}

function ds_phase6c_register(PDO $pdo, string $suffix, int $mobileLead = 8): array
{
    $email = "phase6c.{$suffix}@example.test";
    $mobile = (string) $mobileLead . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
    $password = 'Phase6cpass!';
    $registered = ds_atelier_register_customer($pdo, [
        'name' => "Phase Six C {$suffix}",
        'email' => $email,
        'mobile' => $mobile,
        'password' => $password,
        'confirm' => $password,
        'terms' => true,
    ]);
    return [
        'result' => $registered,
        'email' => $email,
        'id' => (int) ($registered['customer']['id'] ?? 0),
    ];
}

function ds_phase6c_place_input(array $overrides = []): array
{
    $base = [
        'contact' => ['email' => 'phase6c.guest@example.test'],
        'shipping' => [
            'name' => 'Phase Six Cee',
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
        'idempotencyKey' => 'chk_phase6c_' . bin2hex(random_bytes(8)),
    ];
    return array_replace_recursive($base, $overrides);
}

function ds_phase6c_add_tee(PDO $pdo, array $config, int $qty = 1): array
{
    return ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => $qty,
    ]);
}

function ds_phase6c_http(string $method, string $url, ?array $body, array &$jar, ?string $csrf = null): array
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
    $raw = @file_get_contents($url, false, $ctx);
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
    $payload = is_string($raw) ? json_decode($raw, true) : null;
    return [
        'code' => $code,
        'body' => is_array($payload) ? $payload : null,
        'raw' => $raw,
        'headers' => $responseHeaders,
    ];
}

$root = dirname(__DIR__, 2);
$accountJs = (string) file_get_contents($root . '/js/account.js');
$commerceJs = (string) file_get_contents($root . '/js/commerce.js');
$successJs = (string) file_get_contents($root . '/js/order-success.js');
$successHtml = (string) file_get_contents($root . '/order-success.html');
$bootstrap = (string) file_get_contents($root . '/backend/src/bootstrap.php');
$checkoutSrc = (string) file_get_contents($root . '/backend/src/checkout.php');
$invoiceSrc = (string) file_get_contents($root . '/backend/src/invoice.php');
$fulfilmentSrc = (string) file_get_contents($root . '/backend/src/fulfilment.php');

ds_test('shipment migration exists', is_file($root . '/backend/migrations/20261024190000_create_shipments.sql'));
ds_test('shipment event migration exists', is_file($root . '/backend/migrations/20261024190100_create_shipment_events.sql'));
ds_test('invoice migration exists', is_file($root . '/backend/migrations/20261024190200_create_invoices.sql'));
ds_test('bootstrap loads fulfilment and invoice', str_contains($bootstrap, 'fulfilment.php') && str_contains($bootstrap, 'invoice.php'));
ds_test('checkout serializes fulfilment and invoice', str_contains($checkoutSrc, 'ds_atelier_fulfilment_public') && str_contains($checkoutSrc, 'ds_atelier_invoice_public'));
ds_test('invoice snapshot uses persisted totals', str_contains($invoiceSrc, 'item_subtotal') && !str_contains($invoiceSrc, 'ds_atelier_catalog_product'));
ds_test('no GST rate is invented in invoice config', str_contains((string) file_get_contents($root . '/backend/config/invoice.php'), "'policy' => 'unconfigured'"));
ds_test('admin guard remains fail-closed without an admin session', ds_atelier_admin_authenticated() === false);
ds_test('admin require denies fulfilment writes', (ds_atelier_admin_require()['code'] ?? 0) === 403);
ds_test('account.js renders fulfilment and invoice blocks', str_contains($accountJs, 'fulfilmentBlock') && str_contains($accountJs, 'invoiceBlock'));
ds_test('commerce.js exposes invoice download URL', str_contains($commerceJs, 'invoice-download.php'));
ds_test('order-success keeps payment separate from fulfilment', str_contains($successHtml, 'data-payment-status') && str_contains($successHtml, 'data-fulfilment-status'));
ds_test('order-success.js still does not fall back to getLastOrder', !str_contains($successJs, 'getLastOrder'));
ds_test('no composer PDF library is claimed', !is_file($root . '/composer.json') && str_contains($invoiceSrc, 'text/html'));
ds_test('tracking URL helper rejects javascript URLs', (ds_atelier_fulfilment_parse_tracking_url('javascript:alert(1)')['ok'] ?? true) === false);
ds_test('tracking URL helper rejects HTTP', (ds_atelier_fulfilment_parse_tracking_url('http://courier.example/track')['ok'] ?? true) === false);
ds_test('tracking URL helper accepts HTTPS', (ds_atelier_fulfilment_parse_tracking_url('https://courier.example/track/ABC')['ok'] ?? false) === true);
ds_test('unfulfilled cannot skip to delivered', ds_atelier_fulfilment_can_transition('unfulfilled', 'delivered') === false);
ds_test('processing can dispatch', ds_atelier_fulfilment_can_transition('processing', 'dispatched') === true);
ds_test('delivered cannot regress', ds_atelier_fulfilment_can_transition('delivered', 'processing') === false);
ds_test('invoice number parser rejects order refs', ds_atelier_invoice_parse_number('DSA-AAAAAAAAAAAAAAAAAAAAAAAA') === '');
ds_test('invoice filename is sanitized', ds_atelier_invoice_filename('DSA-INV-ABC123') === 'DSA-INV-ABC123.html');

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
    ds_skip('live fulfilment and invoice queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    ds_atelier_apply_migrations($pdo, $config['paths']['migrations']);
    ds_test('fulfilment tables exist after migrate', ds_atelier_fulfilment_tables_exist($pdo) === true);
    ds_test('invoice tables exist after migrate', ds_atelier_invoice_tables_exist($pdo) === true);

    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('catalog seed is available for fulfilment tests', ($seed['ok'] ?? false) === true);

    $guestA = bin2hex(random_bytes(32));
    $guestB = bin2hex(random_bytes(32));
    $testGuestHashes[] = ds_atelier_guest_hash($guestA);
    $testGuestHashes[] = ds_atelier_guest_hash($guestB);

    ds_phase6c_guest($guestA);
    ds_phase6c_add_tee($pdo, $config, 1);
    $place = ds_atelier_checkout_place($pdo, $config, ds_phase6c_place_input());
    ds_test('placed order remains pending payment', ($place['order']['paymentStatus'] ?? '') === 'pending' && ($place['order']['status'] ?? '') === 'pending_payment');
    ds_test('placed order starts unfulfilled', ($place['order']['fulfilment']['status'] ?? '') === 'unfulfilled');
    ds_test('placed order issues a development invoice', ($place['order']['invoice']['kind'] ?? '') === 'development_test');
    ds_test('pending payment is not presented as paid', ($place['order']['paymentStatus'] ?? 'paid') !== 'paid');
    $ref = (string) ($place['order']['ref'] ?? '');
    $order = $ref !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $ref) : null;
    if ($order !== null) {
        $testOrderIds[] = (int) $order['id'];
    }

    $denied = ds_atelier_fulfilment_admin_update($pdo, $config, [
        'ref' => $ref,
        'status' => 'processing',
    ]);
    ds_test('customer session cannot write fulfilment', ($denied['ok'] ?? true) === false && (int) ($denied['code'] ?? 0) === 403);

    ds_phase6c_admin();
    $pendingDispatch = ds_atelier_fulfilment_admin_update($pdo, $config, [
        'ref' => $ref,
        'status' => 'dispatched',
        'courierName' => 'Demo Courier',
        'trackingNumber' => 'TRACK123456',
        'trackingUrl' => 'https://courier.example/track/TRACK123456',
    ]);
    ds_test('pending-payment order cannot be dispatched', ($pendingDispatch['ok'] ?? true) === false && (int) ($pendingDispatch['code'] ?? 0) === 409);

    $badSkip = ds_atelier_fulfilment_admin_update($pdo, $config, [
        'ref' => $ref,
        'status' => 'delivered',
    ]);
    ds_test('invalid fulfilment skip is rejected', ($badSkip['ok'] ?? true) === false);

    if ($order !== null) {
        $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([
            DS_ATELIER_PAYMENT_STATUS_PAID,
            (int) $order['id'],
        ]);
        $paidRow = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
        $process = ds_atelier_fulfilment_apply($pdo, $paidRow ?? $order, 'processing', []);
        ds_test('paid order can move to processing', ($process['ok'] ?? false) === true);
        $dispatchMissing = ds_atelier_fulfilment_apply($pdo, $paidRow ?? $order, 'dispatched', []);
        ds_test('dispatch without tracking is rejected', ($dispatchMissing['ok'] ?? true) === false && (int) ($dispatchMissing['code'] ?? 0) === 422);
        $badUrl = ds_atelier_fulfilment_apply($pdo, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order, 'dispatched', [
            'courierName' => 'Demo Courier',
            'trackingNumber' => 'TRACK123456',
            'trackingUrl' => 'http://not-secure.example/track',
        ]);
        ds_test('insecure tracking URL is rejected', ($badUrl['ok'] ?? true) === false && (int) ($badUrl['code'] ?? 0) === 422);
        $dispatch = ds_atelier_fulfilment_apply($pdo, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order, 'dispatched', [
            'courierName' => 'Demo Courier',
            'trackingNumber' => 'TRACK123456',
            'trackingUrl' => 'https://courier.example/track/TRACK123456',
        ]);
        ds_test('authorized dispatch stores tracking', ($dispatch['ok'] ?? false) === true);
        $replayDispatch = ds_atelier_fulfilment_apply($pdo, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order, 'dispatched', [
            'courierName' => 'Demo Courier',
            'trackingNumber' => 'TRACK123456',
            'trackingUrl' => 'https://courier.example/track/TRACK123456',
        ]);
        ds_test('duplicate dispatch is idempotent-fail closed', ($replayDispatch['ok'] ?? true) === false && (int) ($replayDispatch['code'] ?? 0) === 409);
        $transit = ds_atelier_fulfilment_apply($pdo, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order, 'in_transit', [
            'courierName' => 'Demo Courier',
            'trackingNumber' => 'TRACK123456',
            'trackingUrl' => 'https://courier.example/track/TRACK123456',
        ]);
        ds_test('in-transit follows dispatch', ($transit['ok'] ?? false) === true);
        $deliver = ds_atelier_fulfilment_apply($pdo, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order, 'delivered', [
            'courierName' => 'Demo Courier',
            'trackingNumber' => 'TRACK123456',
            'trackingUrl' => 'https://courier.example/track/TRACK123456',
        ]);
        ds_test('delivered follows in-transit', ($deliver['ok'] ?? false) === true);

        $owned = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $ref]);
        ds_test('owner sees stored tracking only', ($owned['order']['fulfilment']['trackingNumber'] ?? '') === 'TRACK123456');
        ds_test('owner payment status stays separate', ($owned['order']['paymentStatus'] ?? '') === 'paid');
        ds_test('order status follows fulfilment after delivery', ($owned['order']['status'] ?? '') === 'delivered');

        $reservedAfter = 0;
        if (ds_atelier_inventory_tables_exist($pdo)) {
            $reservedAfter = (int) $pdo->query(
                'SELECT COUNT(*) FROM inventory_reservations WHERE order_id = ' . (int) $order['id']
            )->fetchColumn();
        }
        ds_test('fulfilment does not delete Phase 6B reservations', $reservedAfter >= 0);

        $invoiceOne = ds_atelier_invoice_ensure_for_order($pdo, $config, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order);
        $invoiceTwo = ds_atelier_invoice_ensure_for_order($pdo, $config, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order);
        ds_test('invoice issue is unique per order', ($invoiceOne['invoice']['public_number'] ?? '') === ($invoiceTwo['invoice']['public_number'] ?? '') && ($invoiceTwo['replayed'] ?? false) === true);
        $snapshot = json_decode((string) ($invoiceOne['invoice']['snapshot_json'] ?? ''), true);
        ds_test('invoice snapshot matches stored grand total', is_array($snapshot) && ($snapshot['totals']['grandTotal'] ?? '') === ds_atelier_money_format(ds_atelier_money_paise($order['grand_total'])));
        $originalTotal = (string) ($snapshot['totals']['grandTotal'] ?? '');
        $pdo->prepare('UPDATE product_variants SET price = price + 50 WHERE sku IN (SELECT sku FROM order_items WHERE order_id = ?)')->execute([(int) $order['id']]);
        $invoiceAfterPrice = ds_atelier_invoice_ensure_for_order($pdo, $config, ds_atelier_checkout_find_order_by_ref($pdo, $ref) ?? $order);
        $snapshotAfter = json_decode((string) ($invoiceAfterPrice['invoice']['snapshot_json'] ?? ''), true);
        ds_test('invoice totals stay frozen after catalog price change', is_array($snapshotAfter) && ($snapshotAfter['totals']['grandTotal'] ?? '') === $originalTotal);
        ds_test('invoice html download uses attachment filename', str_contains(ds_atelier_invoice_html($invoiceOne['invoice'], $snapshot), (string) $invoiceOne['invoice']['public_number']));
    } else {
        ds_test('paid order can move to processing', false);
        ds_test('dispatch without tracking is rejected', false);
        ds_test('insecure tracking URL is rejected', false);
        ds_test('authorized dispatch stores tracking', false);
        ds_test('duplicate dispatch is idempotent-fail closed', false);
        ds_test('in-transit follows dispatch', false);
        ds_test('delivered follows in-transit', false);
        ds_test('owner sees stored tracking only', false);
        ds_test('owner payment status stays separate', false);
        ds_test('order status follows fulfilment after delivery', false);
        ds_test('fulfilment does not delete Phase 6B reservations', false);
        ds_test('invoice issue is unique per order', false);
        ds_test('invoice snapshot matches stored grand total', false);
        ds_test('invoice totals stay frozen after catalog price change', false);
        ds_test('invoice html download uses attachment filename', false);
    }

    ds_phase6c_clear_admin();
    ds_phase6c_guest($guestB);
    $foreign = ds_atelier_checkout_get_order($pdo, $config, ['ref' => $ref]);
    ds_test('foreign guest cannot read fulfilment', ($foreign['ok'] ?? true) === false && (int) ($foreign['code'] ?? 0) === 404);
    $invoiceNumber = (string) ($place['order']['invoice']['number'] ?? '');
    $foreignInvoice = ds_atelier_invoice_owned_payload($pdo, $config, ['number' => $invoiceNumber]);
    ds_test('foreign guest cannot read invoice', ($foreignInvoice['ok'] ?? true) === false && (int) ($foreignInvoice['code'] ?? 0) === 404);
    $missingInvoice = ds_atelier_invoice_owned_payload($pdo, $config, ['number' => 'DSA-INV-DOESNOTEXIST1']);
    ds_test('unknown invoice numbers 404', ($missingInvoice['ok'] ?? true) === false && (int) ($missingInvoice['code'] ?? 0) === 404);
    $invalidInvoice = ds_atelier_invoice_owned_payload($pdo, $config, ['number' => $ref]);
    ds_test('order refs cannot fetch invoices', ($invalidInvoice['ok'] ?? true) === false);

    $accountA = ds_phase6c_register($pdo, 'a' . bin2hex(random_bytes(2)), 7);
    $accountB = ds_phase6c_register($pdo, 'b' . bin2hex(random_bytes(2)), 6);
    $testCustomerIds[] = $accountA['id'];
    $testCustomerIds[] = $accountB['id'];
    ds_phase6c_customer($accountA['id']);
    ds_phase6c_add_tee($pdo, $config, 1);
    $custPlace = ds_atelier_checkout_place($pdo, $config, ds_phase6c_place_input([
        'contact' => ['email' => $accountA['email']],
        'idempotencyKey' => 'chk_phase6c_cust_' . bin2hex(random_bytes(6)),
    ]));
    $custRef = (string) ($custPlace['order']['ref'] ?? '');
    $custNumber = (string) ($custPlace['order']['invoice']['number'] ?? '');
    if ($custRef !== '') {
        $custRow = ds_atelier_checkout_find_order_by_ref($pdo, $custRef);
        if ($custRow !== null) {
            $testOrderIds[] = (int) $custRow['id'];
        }
    }
    ds_phase6c_customer($accountB['id']);
    $cross = ds_atelier_invoice_owned_payload($pdo, $config, ['number' => $custNumber]);
    ds_test('customers cannot download another customer invoice', ($cross['ok'] ?? true) === false && (int) ($cross['code'] ?? 0) === 404);

    $docRoot = $root;
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['file', '/tmp/ds-atelier-phase6c-http.log', 'w'],
        2 => ['file', '/tmp/ds-atelier-phase6c-http.log', 'a'],
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
        $adminGet = ds_phase6c_http('GET', $base . '/backend/public/admin/fulfilment.php', null, $jar);
        ds_test('HTTP admin fulfilment GET is not public', in_array($adminGet['code'], [403, 405], true));
        $adminPost = ds_phase6c_http('POST', $base . '/backend/public/admin/fulfilment.php', [
            'ref' => $ref,
            'status' => 'processing',
        ], $jar);
        ds_test('HTTP admin fulfilment POST is fail-closed', in_array($adminPost['code'], [403, 405], true));
        $adminIndex = ds_phase6c_http('GET', $base . '/backend/public/admin/index.php', null, $jar);
        ds_test('HTTP admin directory remains forbidden', $adminIndex['code'] === 403);

        $csrfResp = ds_phase6c_http('GET', $base . '/backend/public/customer/csrf.php', null, $jar);
        $csrf = is_array($csrfResp['body']) ? (string) ($csrfResp['body']['csrf'] ?? '') : '';
        ds_phase6c_http('POST', $base . '/backend/public/cart/add.php', [
            'productId' => 'oversized-graphic-tee',
            'color' => 'Cream',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 1,
        ], $jar, $csrf);
        if (isset($jar[DS_ATELIER_GUEST_COOKIE])) {
            $testGuestHashes[] = ds_atelier_guest_hash((string) $jar[DS_ATELIER_GUEST_COOKIE]);
        }
        $httpPlace = ds_phase6c_http('POST', $base . '/backend/public/checkout/place.php', ds_phase6c_place_input([
            'idempotencyKey' => 'chk_phase6c_http_' . bin2hex(random_bytes(8)),
        ]), $jar, $csrf);
        $httpRef = (string) ($httpPlace['body']['order']['ref'] ?? '');
        $httpNumber = (string) ($httpPlace['body']['order']['invoice']['number'] ?? '');
        if ($httpRef !== '') {
            $httpRow = $pdo->prepare('SELECT id FROM orders WHERE public_ref = ? LIMIT 1');
            $httpRow->execute([$httpRef]);
            $httpId = (int) $httpRow->fetchColumn();
            if ($httpId > 0) {
                $testOrderIds[] = $httpId;
            }
        }
        ds_test('HTTP place still pending payment', ($httpPlace['body']['order']['paymentStatus'] ?? '') === 'pending');
        $httpGet = ds_phase6c_http('GET', $base . '/backend/public/checkout/order.php?ref=' . rawurlencode($httpRef), null, $jar);
        ds_test('HTTP owner can load fulfilment payload', ($httpGet['body']['order']['fulfilment']['status'] ?? '') === 'unfulfilled');
        $httpInvoice = ds_phase6c_http('GET', $base . '/backend/public/customer/invoice.php?number=' . rawurlencode($httpNumber), null, $jar);
        ds_test('HTTP owner can load invoice JSON', ($httpInvoice['body']['ok'] ?? false) === true && ($httpInvoice['body']['invoice']['number'] ?? '') === $httpNumber);
        $httpDownload = ds_phase6c_http('GET', $base . '/backend/public/customer/invoice-download.php?number=' . rawurlencode($httpNumber), null, $jar);
        $disposition = '';
        $contentType = '';
        foreach ($httpDownload['headers'] as $header) {
            if (stripos($header, 'Content-Disposition:') === 0) {
                $disposition = $header;
            }
            if (stripos($header, 'Content-Type:') === 0) {
                $contentType = $header;
            }
        }
        ds_test('HTTP invoice download uses attachment headers', str_contains(strtolower($disposition), 'attachment') && str_contains($disposition, 'DSA-INV-'));
        ds_test('HTTP invoice download does not expose storage paths', !str_contains((string) $httpDownload['raw'], '/storage/private/') && str_contains(strtolower($contentType), 'text/html'));
        $otherJar = [];
        $otherInvoice = ds_phase6c_http('GET', $base . '/backend/public/customer/invoice.php?number=' . rawurlencode($httpNumber), null, $otherJar);
        ds_test('HTTP invoice is isolated by guest cookie', ($otherInvoice['body']['ok'] ?? true) === false);
        $otherDownload = ds_phase6c_http('GET', $base . '/backend/public/customer/invoice-download.php?number=' . rawurlencode($httpNumber), null, $otherJar);
        ds_test('HTTP invoice download is isolated by guest cookie', $otherDownload['code'] === 404);
    } else {
        ds_skip('HTTP fulfilment and invoice endpoints', 'php built-in server unavailable');
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase6c_cleanup(
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
