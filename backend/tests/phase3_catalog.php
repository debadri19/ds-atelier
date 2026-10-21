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
$httpPort = 8093;

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

function ds_phase3_cleanup(PDO $pdo, array $productIds): void
{
    if ($productIds === []) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $pdo->prepare("DELETE FROM product_variants WHERE product_id IN ($placeholders)")->execute($productIds);
    $pdo->prepare("DELETE FROM product_media WHERE product_id IN ($placeholders)")->execute($productIds);
    $pdo->prepare("DELETE FROM product_print_types WHERE product_id IN ($placeholders)")->execute($productIds);
    $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)")->execute($productIds);
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

$parsed = ds_atelier_catalog_parse_list_query([
    'page' => '0',
    'per_page' => '999',
    'sort' => 'nope',
    'price' => 'cheap',
    'availability' => 'soon',
    'min_price' => 'abc',
]);
ds_test('invalid list filters return 422', $parsed['ok'] === false && (int) $parsed['code'] === 422);
ds_test('invalid sort is reported', isset($parsed['errors']['sort']));
ds_test('invalid page is reported', isset($parsed['errors']['page']));
ds_test('invalid per_page is reported', isset($parsed['errors']['per_page']));
ds_test('invalid price bucket is reported', isset($parsed['errors']['price']));
ds_test('invalid availability is reported', isset($parsed['errors']['availability']));
ds_test('invalid min_price is reported', isset($parsed['errors']['min_price']));

$valid = ds_atelier_catalog_parse_list_query([
    'page' => '2',
    'per_page' => '8',
    'sort' => 'price-asc',
    'q' => 'hoodie',
    'category' => 'Hoodies',
    'size' => 'M,L',
    'colour' => 'Black',
    'price' => '800-1199',
    'min_price' => '100',
    'max_price' => '2000',
]);
ds_test('valid list filters parse', $valid['ok'] === true);
ds_test('size values are uppercased', $valid['size'] === ['M', 'L']);

$sql = ds_atelier_catalog_build_list_sql($valid);
ds_test('list SQL uses placeholders', substr_count($sql['select'], '?') >= 1);
ds_test('user search is not interpolated into SQL', !str_contains($sql['select'], 'hoodie'));

$unknown = ds_atelier_catalog_handle_product($config, 'not-a-real-product');
ds_test(
    'unknown product fails closed without a database row lookup crash',
    ($unknown['ok'] ?? true) === false && in_array((int) ($unknown['code'] ?? 0), [404, 503], true)
);

$result = ds_atelier_try_pdo($config);
if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
    ds_skip('live catalog queries', 'ds_atelier_dev unavailable');
    fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
    exit(0);
}

    $pdo = $result['pdo'];
    $emulatePrepares = $pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES);
    ds_test('native PDO prepares are enabled', $emulatePrepares === false || $emulatePrepares === 0);

$testIds = [];
try {
    $seed = ds_atelier_catalog_seed($pdo, $config);
    ds_test('development catalog seed succeeds', ($seed['ok'] ?? false) === true);
    ds_test('seed inserts or skips mock products', ((int) ($seed['products_inserted'] ?? 0) + (int) ($seed['products_skipped'] ?? 0)) >= 13);

    $again = ds_atelier_catalog_seed($pdo, $config);
    ds_test('re-running seed does not duplicate products', (int) ($again['products_inserted'] ?? -1) === 0);

    $count = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
    ds_test('catalog products exist after seed', $count >= 13);

    $native = $pdo->prepare('SELECT slug FROM products WHERE slug = ? LIMIT 1');
    ds_test('catalog queries use native PDOStatement', $native instanceof PDOStatement);
    $native->execute(['oversized-graphic-tee']);
    ds_test('seeded oversized tee exists', $native->fetchColumn() === 'oversized-graphic-tee');

    $shop = ds_atelier_catalog_list_products($pdo, ['scope' => 'shop', 'per_page' => 48, 'page' => 1]);
    ds_test('shop listing succeeds', ($shop['ok'] ?? false) === true);
    $shopIds = array_map(static fn (array $item): string => $item['id'], $shop['products'] ?? []);
    ds_test('shop listing excludes inShop=false products', !in_array('motivational-hoodie', $shopIds, true));
    ds_test('shop listing includes in-shop products', in_array('oversized-graphic-tee', $shopIds, true));
    ds_test('shop listing includes variant data', isset($shop['products'][0]['variants']) && is_array($shop['products'][0]['variants']));

    $featured = ds_atelier_catalog_list_products($pdo, ['featured' => '1', 'per_page' => 12]);
    $featuredIds = array_map(static fn (array $item): string => $item['id'], $featured['products'] ?? []);
    ds_test('featured listing includes motivational hoodie', in_array('motivational-hoodie', $featuredIds, true));

    $search = ds_atelier_catalog_list_products($pdo, ['q' => 'hoodie', 'scope' => 'storefront', 'per_page' => 24]);
    $searchIds = array_map(static fn (array $item): string => $item['id'], $search['products'] ?? []);
    ds_test('search finds hoodie products', in_array('minimal-hoodie', $searchIds, true));

    $injection = ds_atelier_catalog_list_products($pdo, ['q' => "' OR 1=1 --", 'scope' => 'shop', 'per_page' => 48]);
    ds_test('parameterized search does not return the full catalog', (int) ($injection['meta']['total'] ?? 0) < (int) ($shop['meta']['total'] ?? 0));

    $category = ds_atelier_catalog_list_products($pdo, ['category' => 'Hoodies', 'scope' => 'shop', 'per_page' => 24]);
    $categoryIds = array_map(static fn (array $item): string => $item['id'], $category['products'] ?? []);
    ds_test('category filter returns hoodies', in_array('minimal-hoodie', $categoryIds, true));
    ds_test('category filter excludes other categories', !in_array('oversized-graphic-tee', $categoryIds, true));

    $size = ds_atelier_catalog_list_products($pdo, ['size' => 'XXL', 'scope' => 'shop', 'per_page' => 48]);
    $sizeIds = array_map(static fn (array $item): string => $item['id'], $size['products'] ?? []);
    ds_test('size filter includes XXL products', in_array('minimal-hoodie', $sizeIds, true));
    ds_test('size filter excludes products without XXL', !in_array('anime-graphic-tee', $sizeIds, true));

    $colour = ds_atelier_catalog_list_products($pdo, ['colour' => 'Cream', 'scope' => 'shop', 'per_page' => 48]);
    $colourIds = array_map(static fn (array $item): string => $item['id'], $colour['products'] ?? []);
    ds_test('colour filter includes cream products', in_array('oversized-graphic-tee', $colourIds, true));

    $price = ds_atelier_catalog_list_products($pdo, ['price' => 'under-799', 'scope' => 'shop', 'per_page' => 48]);
    $priceOk = true;
    foreach ($price['products'] ?? [] as $item) {
        if ((float) $item['price'] >= 800) {
            $priceOk = false;
        }
    }
    ds_test('price range filter keeps under-799 products', $priceOk && (int) ($price['meta']['total'] ?? 0) > 0);

    $range = ds_atelier_catalog_list_products($pdo, ['min_price' => '800', 'max_price' => '1199', 'scope' => 'shop', 'per_page' => 48]);
    $rangeOk = true;
    foreach ($range['products'] ?? [] as $item) {
        if ((float) $item['price'] < 800 || (float) $item['price'] > 1199) {
            $rangeOk = false;
        }
    }
    ds_test('numeric price range filter is applied', $rangeOk && (int) ($range['meta']['total'] ?? 0) > 0);

    $asc = ds_atelier_catalog_list_products($pdo, ['sort' => 'price-asc', 'scope' => 'shop', 'per_page' => 8]);
    $desc = ds_atelier_catalog_list_products($pdo, ['sort' => 'price-desc', 'scope' => 'shop', 'per_page' => 8]);
    $ascPrices = array_map(static fn (array $item): float => (float) $item['price'], $asc['products'] ?? []);
    $descPrices = array_map(static fn (array $item): float => (float) $item['price'], $desc['products'] ?? []);
    $ascCopy = $ascPrices;
    sort($ascCopy);
    $descCopy = $descPrices;
    rsort($descCopy);
    ds_test('price-asc sorting is applied', $ascPrices === $ascCopy && $ascPrices !== []);
    ds_test('price-desc sorting is applied', $descPrices === $descCopy && $descPrices !== []);
    ds_test('price-asc and price-desc differ', ($ascPrices[0] ?? null) !== ($descPrices[0] ?? null));

    $page1 = ds_atelier_catalog_list_products($pdo, ['scope' => 'shop', 'per_page' => 4, 'page' => 1, 'sort' => 'latest']);
    $page2 = ds_atelier_catalog_list_products($pdo, ['scope' => 'shop', 'per_page' => 4, 'page' => 2, 'sort' => 'latest']);
    $page1Ids = array_map(static fn (array $item): string => $item['id'], $page1['products'] ?? []);
    $page2Ids = array_map(static fn (array $item): string => $item['id'], $page2['products'] ?? []);
    ds_test('pagination returns the requested page size', count($page1Ids) === 4);
    ds_test('pagination page 2 is distinct', $page2Ids !== [] && array_intersect($page1Ids, $page2Ids) === []);
    ds_test('pagination meta includes totals', (int) ($page1['meta']['total'] ?? 0) >= 8 && (int) ($page1['meta']['total_pages'] ?? 0) >= 2);

    $detail = ds_atelier_catalog_get_product($pdo, 'oversized-graphic-tee');
    ds_test('product detail succeeds', ($detail['ok'] ?? false) === true);
    $product = $detail['product'] ?? [];
    ds_test('product detail includes variants', isset($product['variants']) && count($product['variants']) >= 2);
    ds_test('product detail includes sizes and colours', isset($product['sizes'], $product['colors']) && $product['sizes'] !== [] && $product['colors'] !== []);
    ds_test('variant payloads include sku price mrp stock', isset($product['variants'][0]['sku'], $product['variants'][0]['price'], $product['variants'][0]['mrp'], $product['variants'][0]['stock']));
    $purchasable = array_filter($product['variants'], static fn (array $variant): bool => $variant['purchasable'] === true);
    ds_test('in-stock product has purchasable variants', $purchasable !== []);

    $missing = ds_atelier_catalog_get_product($pdo, 'does-not-exist');
    ds_test('unknown product returns 404', ($missing['ok'] ?? true) === false && (int) ($missing['code'] ?? 0) === 404);

    $invalidSlug = ds_atelier_catalog_get_product($pdo, '../etc/passwd');
    ds_test('invalid product slug is rejected', ($invalidSlug['ok'] ?? true) === false && (int) ($invalidSlug['code'] ?? 0) === 404);

    $categoryId = (int) $pdo->query("SELECT id FROM categories WHERE slug = 'hoodies' LIMIT 1")->fetchColumn();
    $colourId = (int) $pdo->query("SELECT id FROM colours WHERE slug = 'black' LIMIT 1")->fetchColumn();
    $sizeId = (int) $pdo->query("SELECT id FROM sizes WHERE code = 'M' LIMIT 1")->fetchColumn();
    $suffix = bin2hex(random_bytes(3));
    $hiddenSlug = 'hidden-catalog-' . $suffix;
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 0, 1, 0, 999)'
    )->execute([$hiddenSlug, 'DSA-HID-' . $suffix, 'Hidden Catalog Product', $categoryId, $colourId, 'Hidden', 'Cotton', 'In stock']);
    $hiddenId = (int) $pdo->lastInsertId();
    $testIds[] = $hiddenId;
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 999, 1299, 5, 1)'
    )->execute([$hiddenId, $sizeId, $colourId, 'DSA-HID-' . $suffix . '-M-BLA']);

    $inactiveSlug = 'inactive-variant-' . $suffix;
    $pdo->prepare(
        'INSERT INTO products (slug, sku, name, category_id, default_colour_id, badge, material, availability, rating, reviews, popular, weight, published, in_shop, featured, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 100, 1, 1, 0, 998)'
    )->execute([$inactiveSlug, 'DSA-INA-' . $suffix, 'Inactive Variant Product', $categoryId, $colourId, 'Test', 'Cotton', 'In stock']);
    $inactiveId = (int) $pdo->lastInsertId();
    $testIds[] = $inactiveId;
    $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active) VALUES (?, ?, ?, ?, 500, 700, 0, 0)'
    )->execute([$inactiveId, $sizeId, $colourId, 'DSA-INA-' . $suffix . '-M-BLA']);

    $hiddenList = ds_atelier_catalog_list_products($pdo, ['q' => 'Hidden Catalog Product', 'scope' => 'shop', 'per_page' => 24]);
    $hiddenIds = array_map(static fn (array $item): string => $item['id'], $hiddenList['products'] ?? []);
    ds_test('unpublished products are excluded from listings', !in_array($hiddenSlug, $hiddenIds, true));
    $hiddenDetail = ds_atelier_catalog_get_product($pdo, $hiddenSlug);
    ds_test('unpublished products are not returned by detail', ($hiddenDetail['ok'] ?? true) === false && (int) ($hiddenDetail['code'] ?? 0) === 404);

    $inactiveList = ds_atelier_catalog_list_products($pdo, ['q' => 'Inactive Variant Product', 'scope' => 'shop', 'per_page' => 24]);
    $inactiveIds = array_map(static fn (array $item): string => $item['id'], $inactiveList['products'] ?? []);
    ds_test('products with only inactive variants are excluded', !in_array($inactiveSlug, $inactiveIds, true));
    $inactiveDetail = ds_atelier_catalog_get_product($pdo, $inactiveSlug);
    $inactiveVariants = $inactiveDetail['product']['variants'] ?? ['present'];
    ds_test('inactive variants are omitted from product detail', ($inactiveDetail['ok'] ?? false) === true && $inactiveVariants === []);

    $madeToOrder = ds_atelier_catalog_get_product($pdo, 'custom-sports-jersey');
    $mtoVariants = $madeToOrder['product']['variants'] ?? [];
    $mtoPurchasable = array_filter($mtoVariants, static fn (array $variant): bool => $variant['purchasable'] === true);
    ds_test('made-to-order variants remain purchasable at zero stock', $mtoPurchasable !== []);

    $categories = ds_atelier_catalog_list_categories($pdo);
    $categoryNames = array_map(static fn (array $item): string => $item['name'], $categories['categories'] ?? []);
    ds_test('category listing succeeds', ($categories['ok'] ?? false) === true);
    ds_test('approved categories are present', in_array('Custom T-Shirts', $categoryNames, true) && in_array('Hoodies', $categoryNames, true));

    $invalidList = ds_atelier_catalog_list_products($pdo, ['sort' => 'nope']);
    ds_test('list validation is enforced with a live database', ($invalidList['ok'] ?? true) === false && (int) ($invalidList['code'] ?? 0) === 422);

    $docRoot = dirname(__DIR__, 2);
    $descriptor = [
        0 => ['pipe', 'r'],
        1 => ['file', '/tmp/ds-atelier-phase3-http.log', 'w'],
        2 => ['file', '/tmp/ds-atelier-phase3-http.log', 'a'],
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
    $httpContext = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 3]]);
    if (is_resource($process) && $httpPid > 0) {
        $json = @file_get_contents('http://127.0.0.1:' . $httpPort . '/backend/public/catalog/products.php?scope=shop&per_page=4', false, $httpContext);
        $payload = is_string($json) ? json_decode($json, true) : null;
        ds_test('HTTP products endpoint returns JSON', is_array($payload) && ($payload['ok'] ?? false) === true);
        ds_test('HTTP products endpoint paginates', isset($payload['meta']['per_page']) && (int) $payload['meta']['per_page'] === 4);

        $detailJson = @file_get_contents('http://127.0.0.1:' . $httpPort . '/backend/public/catalog/product.php?id=oversized-graphic-tee', false, $httpContext);
        $detailPayload = is_string($detailJson) ? json_decode($detailJson, true) : null;
        ds_test('HTTP product detail endpoint returns the product', is_array($detailPayload) && ($detailPayload['ok'] ?? false) === true);

        $missingJson = @file_get_contents('http://127.0.0.1:' . $httpPort . '/backend/public/catalog/product.php?id=missing-product', false, $httpContext);
        $missingPayload = is_string($missingJson) ? json_decode($missingJson, true) : null;
        ds_test('HTTP unknown product returns not found', is_array($missingPayload) && ($missingPayload['ok'] ?? true) === false);

        $catJson = @file_get_contents('http://127.0.0.1:' . $httpPort . '/backend/public/catalog/categories.php', false, $httpContext);
        $catPayload = is_string($catJson) ? json_decode($catJson, true) : null;
        ds_test('HTTP categories endpoint returns JSON', is_array($catPayload) && ($catPayload['ok'] ?? false) === true);

        $shopHtml = @file_get_contents('http://127.0.0.1:' . $httpPort . '/shop.html', false, $httpContext);
        ds_test('shop page remains available over HTTP', is_string($shopHtml) && str_contains($shopHtml, 'data-shop-grid'));
        $productHtml = @file_get_contents('http://127.0.0.1:' . $httpPort . '/product.html?id=oversized-graphic-tee', false, $httpContext);
        ds_test('product page remains available over HTTP', is_string($productHtml) && str_contains($productHtml, 'data-product-name'));
    } else {
        ds_skip('HTTP catalog endpoints', 'php built-in server unavailable');
    }
} catch (Throwable $e) {
    fwrite(STDOUT, 'FAIL  unexpected exception: ' . $e->getMessage() . "\n");
    $fail++;
} finally {
    ds_phase3_cleanup($pdo, array_values(array_unique(array_filter($testIds))));
    if (isset($process) && is_resource($process)) {
        proc_terminate($process);
        proc_close($process);
    }
}

fwrite(STDOUT, "\n$pass passed, $fail failed, $skip skipped\n");
exit($fail === 0 ? 0 : 1);
