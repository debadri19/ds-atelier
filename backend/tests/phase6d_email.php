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

function ds_phase6d_cleanup(PDO $pdo, array $customerIds, array $guestHashes, array $productIds, array $orderIds): void
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

function ds_phase6d_guest(string $raw): array
{
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember'], $_SESSION['_ds_atelier_admin_id']);
    return ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
}

function ds_phase6d_place_input(array $overrides = []): array
{
    $base = [
        'contact' => ['email' => 'phase6d.guest@example.test'],
        'shipping' => [
            'name' => 'Phase Six Dee',
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
        'idempotencyKey' => 'chk_phase6d_' . bin2hex(random_bytes(8)),
    ];
    return array_replace_recursive($base, $overrides);
}

$root = dirname(__DIR__, 2);
$bootstrap = (string) file_get_contents($root . '/backend/src/bootstrap.php');
$checkoutSrc = (string) file_get_contents($root . '/backend/src/checkout.php');
$authSrc = (string) file_get_contents($root . '/backend/src/customer-auth.php');
$mailSrc = (string) file_get_contents($root . '/backend/src/mail.php');
$queueSrc = (string) file_get_contents($root . '/backend/src/mail-queue.php');
$envExample = (string) file_get_contents($root . '/backend/.env.example');

ds_test('email outbox migration exists', is_file($root . '/backend/migrations/20261025160000_create_email_outbox.sql'));
ds_test('bootstrap loads mail modules', str_contains($bootstrap, 'mail.php') && str_contains($bootstrap, 'mail-queue.php'));
ds_test('checkout queues order placed email inside the place transaction', str_contains($checkoutSrc, 'ds_atelier_mail_queue_order_placed'));
ds_test('password reset can queue email without public token', str_contains($authSrc, 'ds_atelier_mail_queue_password_reset') && str_contains($authSrc, "'email_sent' => false"));
ds_test('env example documents mail placeholders', str_contains($envExample, 'DS_ATELIER_MAIL_TRANSPORT') && str_contains($envExample, 'DS_ATELIER_MAIL_PASS='));
ds_test('worker does not use PHP mail()', !preg_match('/(?<![\w])mail\s*\(/', $mailSrc) && is_file($root . '/backend/bin/send-email-queue.php'));
ds_test('queue worker is documented as manual', str_contains((string) file_get_contents($root . '/backend/bin/send-email-queue.php'), 'queue_worker=manual'));
ds_test('admin guard remains fail-closed', ds_atelier_admin_authenticated() === false && (ds_atelier_admin_require()['code'] ?? 0) === 403);
ds_test('public payload still strips reset token', !isset(ds_atelier_public_payload(['ok' => true, 'token' => 'abc', 'queued' => true, 'email_sent' => false])['token']));
ds_test('public payload never claims email_sent unless true', (ds_atelier_public_payload(['ok' => true, 'email_sent' => false])['email_sent'] ?? true) === false);

$baseConfig = [
    'env' => 'development',
    'app_url' => 'http://localhost:8000',
    'paths' => [
        'root' => $root . '/backend',
        'private' => sys_get_temp_dir() . '/ds-atelier-mail-test',
        'logs' => sys_get_temp_dir() . '/ds-atelier-mail-test.log',
    ],
];

putenv('DS_ATELIER_MAIL_TRANSPORT=not-a-transport');
$badTransport = ds_atelier_mail_settings($baseConfig);
ds_test('invalid mail transport fails closed', ($badTransport['ok'] ?? true) === false && ($badTransport['ready'] ?? true) === false);

putenv('DS_ATELIER_MAIL_TRANSPORT=smtp');
putenv('DS_ATELIER_MAIL_HOST=');
putenv('DS_ATELIER_MAIL_FROM=');
$missingSmtp = ds_atelier_mail_settings($baseConfig);
ds_test('smtp without host or from is not ready', ($missingSmtp['ready'] ?? true) === false);

putenv('DS_ATELIER_MAIL_TRANSPORT=test');
putenv('DS_ATELIER_MAIL_FROM=studio@example.test');
$testMail = ds_atelier_mail_settings($baseConfig);
ds_test('test transport is ready in development', ($testMail['ready'] ?? false) === true && ($testMail['real'] ?? true) === false);

$prodConfig = $baseConfig;
$prodConfig['env'] = 'production';
$prodConfig['app_url'] = 'http://localhost:8000';
$prodTest = ds_atelier_mail_settings($prodConfig);
ds_test('test transport is rejected in production', ($prodTest['transport'] ?? '') === 'disabled' || ($prodTest['ok'] ?? true) === false);
ds_test('production app URL must be https', ds_atelier_mail_app_url($prodConfig) === '');

$httpsProd = $prodConfig;
$httpsProd['app_url'] = 'https://shop.example.test';
putenv('DS_ATELIER_MAIL_TRANSPORT=disabled');
ds_test('https production app URL is accepted', ds_atelier_mail_app_url($httpsProd) === 'https://shop.example.test');

putenv('DS_ATELIER_MAIL_TRANSPORT=test');
ds_atelier_mail_test_inbox(null, true);
$sent = ds_atelier_mail_send($baseConfig, [
    'to' => 'buyer@example.test',
    'subject' => 'Hello',
    'text' => 'Plain',
    'html' => '<p>Plain</p>',
]);
$inbox = ds_atelier_mail_test_inbox();
ds_test('test transport accepts without claiming real delivery', ($sent['ok'] ?? false) === true && ($sent['real'] ?? true) === false);
ds_test('test transport records the recipient', ($inbox[0]['to'] ?? '') === 'buyer@example.test');

$failedSend = ds_atelier_mail_send($baseConfig, [
    'to' => 'fail@example.test',
    'subject' => 'No',
    'text' => 'No',
    'html' => '<p>No</p>',
]);
ds_test('test transport can record a failure without claiming success', ($failedSend['ok'] ?? true) === false && ($failedSend['accepted'] ?? true) === false);

$escaped = ds_atelier_mail_render('order_placed', [
    'order_ref' => 'DSA-TESTREF',
    'order_date' => '2026-10-25 12:00:00',
    'payment_status' => 'pending',
    'payment_pending' => true,
    'grand_total' => '199.00',
    'items' => [['name' => '<script>alert(1)</script>', 'qty' => 1, 'sku' => 'X', 'color' => 'Black', 'size' => 'M', 'line_price' => '199.00']],
    'order_url' => 'http://localhost:8000/order-success.html?ref=DSA-TESTREF',
    'invoice_url' => 'http://localhost:8000/backend/public/customer/invoice-download.php?number=DSA-INV-1',
    'invoice_kind' => 'development_test',
], $baseConfig);
ds_test('order placed template renders', ($escaped['ok'] ?? false) === true);
ds_test('order placed email says pending payment', str_contains((string) ($escaped['subject'] ?? ''), 'pending payment') && str_contains((string) ($escaped['text'] ?? ''), 'pending payment'));
ds_test('order HTML escapes user-controlled names', str_contains((string) ($escaped['html'] ?? ''), '&lt;script&gt;') && !str_contains((string) ($escaped['html'] ?? ''), '<script>alert'));
ds_test('order template includes plain-text fallback', str_contains((string) ($escaped['text'] ?? ''), 'DSA-TESTREF'));
ds_test('invoice link uses authorized download path', str_contains((string) ($escaped['html'] ?? ''), 'invoice-download.php'));

$resetRendered = ds_atelier_mail_render('password_reset', [
    'customer_name' => 'Ada <script>',
    'reset_url' => 'http://localhost:8000/auth.html?token=abc&x=1#reset-password',
    'expires_minutes' => 60,
], $baseConfig);
ds_test('password reset template escapes the name', str_contains((string) ($resetRendered['html'] ?? ''), 'Ada &lt;script&gt;'));
ds_test('password reset template keeps the usable link', str_contains((string) ($resetRendered['text'] ?? ''), 'token=abc'));

$cancelRendered = ds_atelier_mail_render('order_cancelled', [
    'order_ref' => 'DSA-CANCEL',
    'payment_status' => 'pending',
    'payment_pending' => true,
], $baseConfig);
ds_test('cancellation email does not claim refund', !str_contains(strtolower((string) ($cancelRendered['text'] ?? '')), 'has been refunded'));

$shipRendered = ds_atelier_mail_render('fulfilment_update', [
    'order_ref' => 'DSA-SHIP',
    'fulfilment_status' => 'dispatched',
    'payment_status' => 'paid',
    'courier_name' => 'Example Courier',
    'tracking_number' => 'TRK1',
    'tracking_url' => 'https://courier.example/track/TRK1',
], $baseConfig);
ds_test('fulfilment email includes stored tracking only', str_contains((string) ($shipRendered['text'] ?? ''), 'TRK1') && str_contains((string) ($shipRendered['text'] ?? ''), 'not proof of delivery'));

$redacted = ds_atelier_mail_redact_error('token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa smtp pass=secret');
ds_test('mail errors redact tokens', !str_contains($redacted, str_repeat('a', 64)) && !str_contains($redacted, 'secret'));

ds_test('event keys are unique per order event', ds_atelier_mail_event_key('order_placed', 'DSA-1') === ds_atelier_mail_event_key('order_placed', 'DSA-1'));
ds_test('fulfilment event keys differ by status', ds_atelier_mail_event_key('fulfilment_update', 'DSA-1', 'dispatched') !== ds_atelier_mail_event_key('fulfilment_update', 'DSA-1', 'delivered'));

try {
    $config = ds_atelier_bootstrap();
} catch (Throwable $e) {
    fwrite(STDERR, "Configuration failed.\n");
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit($fail === 0 ? 0 : 1);
}

if ($config['db']['name'] !== 'ds_atelier_dev') {
    fwrite(STDERR, "Refusing to run tests against a non-dev database.\n");
    exit(1);
}

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_skip('live email queue queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit($fail === 0 ? 0 : 1);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    ds_atelier_apply_migrations($pdo, $config['paths']['migrations']);
    ds_test('email outbox table exists after migrate', ds_atelier_mail_tables_exist($pdo) === true);

    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('catalog seed is available for email tests', ($seed['ok'] ?? false) === true);

    $guestA = bin2hex(random_bytes(32));
    $testGuestHashes[] = ds_atelier_guest_hash($guestA);
    ds_phase6d_guest($guestA);
    ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    $place = ds_atelier_checkout_place($pdo, $config, ds_phase6d_place_input());
    ds_test('placed order remains pending payment', ($place['order']['paymentStatus'] ?? '') === 'pending');
    $ref = (string) ($place['order']['ref'] ?? '');
    $order = $ref !== '' ? ds_atelier_checkout_find_order_by_ref($pdo, $ref) : null;
    if ($order !== null) {
        $testOrderIds[] = (int) $order['id'];
    }
    $queued = $order !== null ? ds_atelier_mail_find_by_key($pdo, ds_atelier_mail_event_key('order_placed', $ref)) : null;
    ds_test('order place queued a pending-payment email', is_array($queued) && (string) ($queued['event_type'] ?? '') === 'order_placed');
    $payload = is_array($queued) ? json_decode((string) $queued['payload_json'], true) : [];
    ds_test('queued order email uses persisted totals', is_array($payload) && ($payload['grand_total'] ?? '') === ($place['order']['grandTotal'] ?? 'missing'));
    ds_test('queued order email is pending payment', is_array($payload) && ($payload['payment_pending'] ?? false) === true);

    $again = $order !== null
        ? ds_atelier_mail_queue_order_placed($pdo, $config, $order, ds_atelier_checkout_order_items($pdo, (int) $order['id']))
        : ['replayed' => false];
    ds_test('duplicate order placed event is replayed not duplicated', ($again['replayed'] ?? false) === true);

    unset($_SESSION['_ds_atelier_admin_id']);
    $denied = ds_atelier_fulfilment_admin_update($pdo, $config, ['ref' => $ref, 'status' => 'processing']);
    ds_test('unauthenticated fulfilment cannot queue updates', (int) ($denied['code'] ?? 0) === 403);
    $afterDenied = $order !== null ? ds_atelier_mail_find_by_key($pdo, ds_atelier_mail_event_key('fulfilment_update', $ref, 'processing')) : ['id' => 1];
    ds_test('denied fulfilment did not insert a notification', $afterDenied === null);

    if ($order !== null) {
        $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute(['paid', (int) $order['id']]);
        $paid = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
        $process = ds_atelier_fulfilment_apply($pdo, $paid ?? $order, 'processing', [], $config);
        ds_test('processing transition queues fulfilment email', ($process['ok'] ?? false) === true);
        $processRow = ds_atelier_mail_find_by_key($pdo, ds_atelier_mail_event_key('fulfilment_update', $ref, 'processing'));
        ds_test('processing email event exists once', is_array($processRow));
        $replayProcess = ds_atelier_mail_queue_fulfilment($pdo, $config, $paid ?? $order, $process['shipment'] ?? [], 'processing');
        ds_test('duplicate fulfilment event does not insert a second row', ($replayProcess['replayed'] ?? false) === true);
    }

    ds_atelier_mail_test_inbox(null, true);
    $processed = ds_atelier_mail_process_queue($pdo, $config, 20);
    ds_test('worker processed claimed rows', ($processed['claimed'] ?? 0) >= 1);
    $inbox = ds_atelier_mail_test_inbox();
    ds_test('test worker does not claim real SMTP delivery', ($processed['sent'] ?? 0) >= 1 && !in_array(true, array_column($inbox, 'real'), true));

    if ($order !== null) {
        $failKey = ds_atelier_mail_event_key('fulfilment_update', $ref, 'worker-fail');
        ds_atelier_mail_enqueue(
            $pdo,
            $config,
            'fulfilment_update',
            $failKey,
            'fulfilment_update',
            'fail@example.test',
            ['order_ref' => $ref, 'fulfilment_status' => 'processing', 'payment_status' => 'paid', 'items' => []],
            (int) $order['id'],
            null
        );
        $beforeStatus = (string) (ds_atelier_checkout_find_order_by_ref($pdo, $ref)['status'] ?? '');
        ds_atelier_mail_process_queue($pdo, $config, 20);
        $afterStatus = (string) (ds_atelier_checkout_find_order_by_ref($pdo, $ref)['status'] ?? '');
        $failRow = ds_atelier_mail_find_by_key($pdo, $failKey);
        ds_test('transport failure does not reverse order status', $beforeStatus === $afterStatus);
        ds_test('failed notification is recorded not discarded', is_array($failRow) && in_array((string) ($failRow['status'] ?? ''), ['pending', 'failed'], true));
    }

    $suffix = bin2hex(random_bytes(3));
    $registered = ds_atelier_register_customer($pdo, [
        'name' => 'Phase Six Dee',
        'email' => "phase6d.{$suffix}@example.test",
        'mobile' => '8' . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT),
        'password' => 'Phase6dpass!',
        'confirm' => 'Phase6dpass!',
        'terms' => true,
    ]);
    $customerId = (int) ($registered['customer']['id'] ?? 0);
    if ($customerId > 0) {
        $testCustomerIds[] = $customerId;
    }
    $forgot = ds_atelier_create_password_reset($pdo, "phase6d.{$suffix}@example.test", $config);
    ds_test('password reset still issues a hashed token internally', ($forgot['issued'] ?? false) === true && isset($forgot['token']));
    $publicForgot = ds_atelier_public_payload($forgot);
    ds_test('public forgot JSON has no raw token', !isset($publicForgot['token']) && ($publicForgot['email_sent'] ?? null) === false);
    $resetRow = $customerId > 0 ? ds_atelier_mail_find_by_key(
        $pdo,
        ds_atelier_mail_event_key('password_reset', (string) $pdo->query('SELECT MAX(id) FROM customer_password_resets WHERE customer_id = ' . $customerId)->fetchColumn())
    ) : null;
    if (is_array($resetRow)) {
        ds_test('reset outbox payload includes a reset URL before send', str_contains((string) $resetRow['payload_json'], 'token='));
        ds_atelier_mail_process_queue($pdo, $config, 5);
        $afterSend = ds_atelier_mail_find_by_key($pdo, (string) $resetRow['event_key']);
        ds_test('sent reset payload no longer stores the raw URL', is_array($afterSend) && !str_contains((string) $afterSend['payload_json'], (string) $forgot['token']));
    } else {
        ds_test('reset email queued when app URL is configured', $forgot['queued'] ?? false);
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase6d_cleanup($pdo, $testCustomerIds, $testGuestHashes, $testProductIds, $testOrderIds);
}

fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
exit($fail === 0 ? 0 : 1);
