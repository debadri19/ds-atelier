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
$httpPort = 8094;
$testCustomerIds = [];
$testGuestHashes = [];
$testProductIds = [];

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

function ds_phase4_cleanup(PDO $pdo, array $customerIds, array $guestHashes, array $productIds): void
{
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
        $pdo->prepare("DELETE FROM product_variants WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM product_media WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM product_print_types WHERE product_id IN ($placeholders)")->execute($productIds);
        $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)")->execute($productIds);
    }
}

function ds_phase4_guest(string $raw): array
{
    $_COOKIE[DS_ATELIER_GUEST_COOKIE] = $raw;
    unset($_SESSION['_ds_atelier_customer_id'], $_SESSION['_ds_atelier_customer_remember']);
    return ['type' => 'guest', 'customer_id' => null, 'guest_hash' => ds_atelier_guest_hash($raw)];
}

function ds_phase4_customer(int $id): array
{
    unset($_COOKIE[DS_ATELIER_GUEST_COOKIE]);
    $_SESSION['_ds_atelier_customer_id'] = $id;
    return ['type' => 'customer', 'customer_id' => $id, 'guest_hash' => null];
}

function ds_phase4_register(PDO $pdo, string $suffix, int $mobileLead = 9): array
{
    $email = "phase4.{$suffix}@example.test";
    $mobile = (string) $mobileLead . str_pad((string) random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
    $password = 'Phase4pass!';
    $registered = ds_atelier_register_customer($pdo, [
        'name' => "Phase Four {$suffix}",
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

function ds_phase4_http(string $method, string $url, ?array $body, array &$jar, ?string $csrf = null): array
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

$qtyBad = ds_atelier_commerce_parse_qty('abc');
ds_test('non-numeric quantity is rejected', $qtyBad['ok'] === false);

$qtyZero = ds_atelier_commerce_parse_qty(0);
ds_test('zero quantity is rejected', $qtyZero['ok'] === false);

$qtyOver = ds_atelier_commerce_parse_qty(21);
ds_test('quantity above 20 is rejected', $qtyOver['ok'] === false);

$qtyOk = ds_atelier_commerce_parse_qty(3);
ds_test('valid quantity parses', $qtyOk['ok'] === true && $qtyOk['qty'] === 3);

ds_test('invalid product slug is empty', ds_atelier_commerce_normalize_slug('../etc/passwd') === '');
ds_test('valid product slug is kept', ds_atelier_commerce_normalize_slug('oversized-graphic-tee') === 'oversized-graphic-tee');
ds_test(
    'line keys include configuration',
    ds_atelier_commerce_line_key('tee', 'Black', 'M', 'DTF', 'Front', 'art-1')
        !== ds_atelier_commerce_line_key('tee', 'Black', 'M', 'DTF', 'Back', 'art-1')
);
ds_test('guest token hashes are SHA-256', strlen(ds_atelier_guest_hash(str_repeat('ab', 32))) === 64);

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_skip('live cart queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

$pdo = $result['pdo'];
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

try {
    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('catalog seed is available for cart tests', ($seed['ok'] ?? false) === true);

    $guestA = bin2hex(random_bytes(32));
    $guestB = bin2hex(random_bytes(32));
    $testGuestHashes[] = ds_atelier_guest_hash($guestA);
    $testGuestHashes[] = ds_atelier_guest_hash($guestB);

    ds_phase4_guest($guestA);
    $empty = ds_atelier_cart_get($pdo, $config);
    ds_test('anonymous/guest get without a cart is empty', ($empty['ok'] ?? false) === true && (int) ($empty['cart']['count'] ?? -1) === 0);

    $add = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
        'price' => 1,
    ]);
    ds_test('guest can add a catalog line', ($add['ok'] ?? false) === true && (int) ($add['cart']['count'] ?? 0) === 1);
    ds_test('cart prices come from the catalog', isset($add['cart']['items'][0]['price']) && (float) $add['cart']['items'][0]['price'] === 799.0);
    ds_test('guest cookie hash is stored not the raw token', (int) $pdo->query(
        'SELECT COUNT(*) FROM carts WHERE guest_token_hash = ' . $pdo->quote(ds_atelier_guest_hash($guestA))
    )->fetchColumn() === 1);

    $again = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('adding the same configuration increments quantity', (int) ($again['cart']['count'] ?? 0) === 2 && count($again['cart']['items'] ?? []) === 1);

    $otherColour = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'White',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('different colour creates a new line', count($otherColour['cart']['items'] ?? []) === 2);

    $otherPrint = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'Sublimation',
        'printPosition' => 'Front',
        'qty' => 1,
        'artworkId' => 'art-front',
        'artworkName' => 'Front print',
    ]);
    ds_test('print type and artwork change the line key', count($otherPrint['cart']['items'] ?? []) === 3);

    $qtyCap = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'minimal-hoodie',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 21,
    ]);
    ds_test('quantity above the 20 cap is rejected', ($qtyCap['ok'] ?? true) === false && (int) ($qtyCap['code'] ?? 0) === 422);

    $unknown = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'not-a-real-product',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('unknown products cannot be added', ($unknown['ok'] ?? true) === false && (int) ($unknown['code'] ?? 0) === 404);

    $badVariant = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'oversized-graphic-tee',
        'color' => 'NotAColour',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('invalid colour/size is rejected', ($badVariant['ok'] ?? true) === false && (int) ($badVariant['code'] ?? 0) === 422);

    $mto = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'custom-sports-jersey',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('made-to-order products remain purchasable at zero stock', ($mto['ok'] ?? false) === true);

    $wish = ds_atelier_wishlist_add($pdo, $config, ['productId' => 'minimal-hoodie']);
    ds_test('guest can save a wishlist product', ($wish['ok'] ?? false) === true && in_array('minimal-hoodie', $wish['wishlist']['productIds'] ?? [], true));
    $wishDup = ds_atelier_wishlist_add($pdo, $config, ['productId' => 'minimal-hoodie']);
    ds_test('duplicate wishlist add is idempotent', ($wishDup['ok'] ?? false) === true && (int) ($wishDup['wishlist']['count'] ?? 0) === 1);
    $wishToggle = ds_atelier_wishlist_toggle($pdo, $config, ['productId' => 'minimal-hoodie']);
    ds_test('wishlist toggle removes a saved product', ($wishToggle['ok'] ?? false) === true && (int) ($wishToggle['wishlist']['count'] ?? -1) === 0);
    ds_atelier_wishlist_add($pdo, $config, ['productId' => 'minimal-hoodie']);

    ds_phase4_guest($guestB);
    $otherGuest = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'minimal-hoodie',
        'color' => 'Navy',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 2,
    ]);
    ds_test('second guest can add an isolated cart', ($otherGuest['ok'] ?? false) === true && (int) ($otherGuest['cart']['count'] ?? 0) === 2);
    ds_atelier_wishlist_add($pdo, $config, ['productId' => 'oversized-graphic-tee']);

    ds_phase4_guest($guestA);
    $guestACart = ds_atelier_cart_get($pdo, $config);
    $guestAWish = ds_atelier_wishlist_get($pdo, $config);
    ds_test('guest carts are isolated by cookie hash', (int) ($guestACart['cart']['count'] ?? 0) !== 2);
    ds_test('guest wishlists are isolated by cookie hash', in_array('minimal-hoodie', $guestAWish['wishlist']['productIds'] ?? [], true) && !in_array('oversized-graphic-tee', $guestAWish['wishlist']['productIds'] ?? [], true));

    $migrateOnce = ds_atelier_cart_migrate($pdo, $config, [
        'items' => [[
            'productId' => 'oversized-graphic-tee',
            'color' => 'Black',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 2,
        ]],
    ]);
    $blackQty = 0;
    foreach ($migrateOnce['cart']['items'] ?? [] as $item) {
        if (($item['lineKey'] ?? '') === 'oversized-graphic-tee|Black|M|DTF|Front|') {
            $blackQty = (int) $item['qty'];
        }
    }
    ds_test('migrate uses max quantity so retries do not double', $blackQty === 2);

    $migrateAgain = ds_atelier_cart_migrate($pdo, $config, [
        'items' => [[
            'productId' => 'oversized-graphic-tee',
            'color' => 'Black',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 2,
        ]],
    ]);
    $blackQtyAgain = 0;
    foreach ($migrateAgain['cart']['items'] ?? [] as $item) {
        if (($item['lineKey'] ?? '') === 'oversized-graphic-tee|Black|M|DTF|Front|') {
            $blackQtyAgain = (int) $item['qty'];
        }
    }
    ds_test('second migrate of the same line stays at max qty', $blackQtyAgain === 2);

    $suffixA = bin2hex(random_bytes(3));
    $suffixB = bin2hex(random_bytes(3));
    $_SESSION = [];
    $accountA = ds_phase4_register($pdo, $suffixA, 9);
    ds_test('customer A registers', ($accountA['result']['ok'] ?? false) === true && $accountA['id'] > 0);
    if ($accountA['id'] > 0) {
        $testCustomerIds[] = $accountA['id'];
    }
    $_SESSION = [];
    $accountB = ds_phase4_register($pdo, $suffixB, 8);
    ds_test('customer B registers', ($accountB['result']['ok'] ?? false) === true && $accountB['id'] > 0);
    if ($accountB['id'] > 0) {
        $testCustomerIds[] = $accountB['id'];
    }

    ds_phase4_customer($accountA['id']);
    $customerAdd = ds_atelier_cart_add($pdo, $config, [
        'productId' => 'minimal-hoodie',
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('authenticated customer can add to a server cart', ($customerAdd['ok'] ?? false) === true && (int) ($customerAdd['cart']['count'] ?? 0) === 1);
    ds_atelier_wishlist_add($pdo, $config, ['productId' => 'custom-tote-bag']);

    ds_phase4_guest($guestA);
    $_SESSION['_ds_atelier_customer_id'] = $accountA['id'];
    $merged = ds_atelier_commerce_merge_guest($pdo, $config, $accountA['id']);
    ds_test('guest cart merges into the customer cart', ($merged['ok'] ?? false) === true && ($merged['merged'] ?? false) === true);

    ds_phase4_customer($accountA['id']);
    $mergedCart = ds_atelier_cart_get($pdo, $config);
    $mergedWish = ds_atelier_wishlist_get($pdo, $config);
    $mergedCount = (int) ($mergedCart['cart']['count'] ?? 0);
    ds_test('merged cart keeps guest and customer lines', $mergedCount >= 5);
    ds_test('merged wishlist unions unique products', in_array('minimal-hoodie', $mergedWish['wishlist']['productIds'] ?? [], true) && in_array('custom-tote-bag', $mergedWish['wishlist']['productIds'] ?? [], true));
    ds_test('guest cookie is cleared after merge', ds_atelier_guest_token_raw() === null);
    ds_test(
        'guest cart row is removed after merge',
        (int) $pdo->query('SELECT COUNT(*) FROM carts WHERE guest_token_hash = ' . $pdo->quote(ds_atelier_guest_hash($guestA)))->fetchColumn() === 0
    );

    ds_phase4_customer($accountB['id']);
    $otherCustomer = ds_atelier_cart_get($pdo, $config);
    ds_test('customer carts are isolated', (int) ($otherCustomer['cart']['count'] ?? -1) === 0);
    $foreignId = (int) ($mergedCart['cart']['items'][0]['itemId'] ?? 0);
    $stolen = ds_atelier_cart_remove($pdo, $config, ['itemId' => $foreignId]);
    ds_test('a customer cannot remove another customer line', ($stolen['ok'] ?? true) === false && (int) ($stolen['code'] ?? 0) === 404);

    $categoryId = (int) $pdo->query("SELECT id FROM categories WHERE slug = 'hoodies' LIMIT 1")->fetchColumn();
    $colourId = (int) $pdo->query("SELECT id FROM colours WHERE slug = 'black' LIMIT 1")->fetchColumn();
    $sizeId = (int) $pdo->query("SELECT id FROM sizes WHERE code = 'M' LIMIT 1")->fetchColumn();
    $lowSlug = 'low-stock-cart-' . bin2hex(random_bytes(3));
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 1, 1, 0, 990)'
    )->execute([$lowSlug, 'DSA-LOW-' . substr($lowSlug, -6), 'Low Stock Cart Product', $categoryId, $colourId, 'Test', 'Cotton', 'In stock']);
    $lowId = (int) $pdo->lastInsertId();
    $testProductIds[] = $lowId;
    $pdo->prepare('INSERT INTO product_print_types (product_id, print_type, sort_order) VALUES (?, ?, 1)')->execute([$lowId, 'DTF']);
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 500, 700, 2, 1)'
    )->execute([$lowId, $sizeId, $colourId, 'DSA-LOW-M-BLA']);

    ds_phase4_customer($accountA['id']);
    $overStock = ds_atelier_cart_add($pdo, $config, [
        'productId' => $lowSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 3,
    ]);
    ds_test('adding more than remaining stock is rejected', ($overStock['ok'] ?? true) === false && (int) ($overStock['code'] ?? 0) === 409);

    $stockOk = ds_atelier_cart_add($pdo, $config, [
        'productId' => $lowSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 2,
    ]);
    ds_test('adding exactly remaining stock succeeds', ($stockOk['ok'] ?? false) === true);
    $stockExtra = ds_atelier_cart_add($pdo, $config, [
        'productId' => $lowSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('increment past remaining stock is rejected', ($stockExtra['ok'] ?? true) === false && (int) ($stockExtra['code'] ?? 0) === 409);

    $hiddenSlug = 'hidden-cart-' . bin2hex(random_bytes(3));
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 0, 1, 0, 989)'
    )->execute([$hiddenSlug, 'DSA-HID-' . substr($hiddenSlug, -6), 'Hidden Cart Product', $categoryId, $colourId, 'Hidden', 'Cotton', 'In stock']);
    $hiddenId = (int) $pdo->lastInsertId();
    $testProductIds[] = $hiddenId;
    $pdo->prepare('INSERT INTO product_print_types (product_id, print_type, sort_order) VALUES (?, ?, 1)')->execute([$hiddenId, 'DTF']);
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 400, 500, 5, 1)'
    )->execute([$hiddenId, $sizeId, $colourId, 'DSA-HID-M-BLA']);
    $hiddenAdd = ds_atelier_cart_add($pdo, $config, [
        'productId' => $hiddenSlug,
        'color' => 'Black',
        'size' => 'M',
        'printType' => 'DTF',
        'printPosition' => 'Front',
        'qty' => 1,
    ]);
    ds_test('unpublished products cannot be added', ($hiddenAdd['ok'] ?? true) === false && (int) ($hiddenAdd['code'] ?? 0) === 404);

    $itemId = (int) ($stockOk['cart']['items'][count($stockOk['cart']['items']) - 1]['itemId'] ?? 0);
    $updated = ds_atelier_cart_update($pdo, $config, ['itemId' => $itemId, 'qty' => 1]);
    ds_test('owned cart line quantity can be updated', ($updated['ok'] ?? false) === true);
    $removed = ds_atelier_cart_remove($pdo, $config, ['itemId' => $itemId]);
    ds_test('owned cart line can be removed', ($removed['ok'] ?? false) === true);
    $cleared = ds_atelier_cart_clear($pdo, $config);
    ds_test('clear empties the customer cart', ($cleared['ok'] ?? false) === true && (int) ($cleared['cart']['count'] ?? -1) === 0);

    $docRoot = dirname(__DIR__, 2);
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['file', '/tmp/ds-atelier-phase4-http.log', 'w'],
        2 => ['file', '/tmp/ds-atelier-phase4-http.log', 'a'],
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
        $csrfResp = ds_phase4_http('GET', $base . '/backend/public/customer/csrf.php', null, $jar);
        $csrf = is_array($csrfResp['body']) ? (string) ($csrfResp['body']['csrf'] ?? '') : '';
        ds_test('HTTP CSRF endpoint issues a token', $csrfResp['code'] === 200 && strlen($csrf) >= 32);

        $noCsrf = ds_phase4_http('POST', $base . '/backend/public/cart/add.php', [
            'productId' => 'oversized-graphic-tee',
            'color' => 'Black',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 1,
        ], $jar);
        ds_test('HTTP add without CSRF is forbidden', $noCsrf['code'] === 403);

        $badCsrf = ds_phase4_http('POST', $base . '/backend/public/cart/add.php', [
            'productId' => 'oversized-graphic-tee',
            'color' => 'Black',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 1,
        ], $jar, $csrf . 'x');
        ds_test('HTTP add with a tampered CSRF token is forbidden', $badCsrf['code'] === 403);

        $httpAdd = ds_phase4_http('POST', $base . '/backend/public/cart/add.php', [
            'productId' => 'oversized-graphic-tee',
            'color' => 'Cream',
            'size' => 'M',
            'printType' => 'DTF',
            'printPosition' => 'Front',
            'qty' => 1,
        ], $jar, $csrf);
        ds_test('HTTP add with CSRF succeeds', $httpAdd['code'] === 200 && ($httpAdd['body']['ok'] ?? false) === true);
        ds_test('HTTP add sets a guest cookie', isset($jar[DS_ATELIER_GUEST_COOKIE]) && (bool) preg_match('/^[a-f0-9]{64}$/', (string) $jar[DS_ATELIER_GUEST_COOKIE]));
        if (isset($jar[DS_ATELIER_GUEST_COOKIE])) {
            $testGuestHashes[] = ds_atelier_guest_hash((string) $jar[DS_ATELIER_GUEST_COOKIE]);
        }

        $httpGet = ds_phase4_http('GET', $base . '/backend/public/cart/get.php', null, $jar);
        ds_test('HTTP cart get returns the guest line', ($httpGet['body']['ok'] ?? false) === true && (int) ($httpGet['body']['cart']['count'] ?? 0) === 1);

        $httpWish = ds_phase4_http('POST', $base . '/backend/public/wishlist/add.php', [
            'productId' => 'minimal-hoodie',
        ], $jar, $csrf);
        ds_test('HTTP wishlist add succeeds', ($httpWish['body']['ok'] ?? false) === true);

        $index = ds_phase4_http('GET', $base . '/backend/public/cart/index.php', null, $jar);
        ds_test('cart directory index is forbidden', $index['code'] === 403);
        $wishIndex = ds_phase4_http('GET', $base . '/backend/public/wishlist/index.php', null, $jar);
        ds_test('wishlist directory index is forbidden', $wishIndex['code'] === 403);

        $cartHtml = ds_phase4_http('GET', $base . '/cart.html', null, $jar);
        ds_test('cart page remains available over HTTP', is_string($cartHtml['raw']) && str_contains((string) $cartHtml['raw'], 'data-cart-list'));
        $wishHtml = ds_phase4_http('GET', $base . '/wishlist.html', null, $jar);
        ds_test('wishlist page remains available over HTTP', is_string($wishHtml['raw']) && str_contains((string) $wishHtml['raw'], 'data-wishlist-grid'));
    } else {
        ds_skip('HTTP cart endpoints', 'php built-in server unavailable');
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase4_cleanup(
        $pdo,
        array_values(array_unique(array_filter($testCustomerIds))),
        array_values(array_unique(array_filter($testGuestHashes))),
        array_values(array_unique(array_filter($testProductIds)))
    );
    if (isset($process) && is_resource($process)) {
        proc_terminate($process);
        proc_close($process);
    }
}

fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
exit($fail === 0 ? 0 : 1);
