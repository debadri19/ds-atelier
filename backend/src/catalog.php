<?php

declare(strict_types=1);

const DS_ATELIER_CATALOG_SORTS = ['latest', 'price-asc', 'price-desc', 'popular'];
const DS_ATELIER_CATALOG_PRICE_BUCKETS = ['under-799', '800-1199', '1200-plus'];
const DS_ATELIER_CATALOG_PAGE_DEFAULT = 1;
const DS_ATELIER_CATALOG_PER_PAGE_DEFAULT = 8;
const DS_ATELIER_CATALOG_PER_PAGE_MAX = 48;
const DS_ATELIER_CATALOG_SEARCH_MAX = 80;

function ds_atelier_catalog_like_contains(string $value): string
{
    $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    return '%' . $escaped . '%';
}

function ds_atelier_catalog_csv(mixed $value): array
{
    if (is_array($value)) {
        $parts = $value;
    } else {
        $parts = explode(',', (string) $value);
    }

    $out = [];
    foreach ($parts as $part) {
        if (!is_string($part) && !is_int($part) && !is_float($part)) {
            continue;
        }
        $item = trim((string) $part);
        if ($item === '' || in_array($item, $out, true)) {
            continue;
        }
        $out[] = $item;
    }

    return $out;
}

function ds_atelier_catalog_parse_list_query(array $input): array
{
    $errors = [];

    $pageRaw = $input['page'] ?? DS_ATELIER_CATALOG_PAGE_DEFAULT;
    if (is_array($pageRaw) || !preg_match('/^[0-9]+$/', (string) $pageRaw)) {
        $errors['page'] = 'page must be a positive integer.';
        $page = DS_ATELIER_CATALOG_PAGE_DEFAULT;
    } else {
        $page = (int) $pageRaw;
        if ($page < 1) {
            $errors['page'] = 'page must be a positive integer.';
            $page = DS_ATELIER_CATALOG_PAGE_DEFAULT;
        }
    }

    $perRaw = $input['per_page'] ?? DS_ATELIER_CATALOG_PER_PAGE_DEFAULT;
    if (is_array($perRaw) || !preg_match('/^[0-9]+$/', (string) $perRaw)) {
        $errors['per_page'] = 'per_page must be an integer between 1 and ' . DS_ATELIER_CATALOG_PER_PAGE_MAX . '.';
        $perPage = DS_ATELIER_CATALOG_PER_PAGE_DEFAULT;
    } else {
        $perPage = (int) $perRaw;
        if ($perPage < 1 || $perPage > DS_ATELIER_CATALOG_PER_PAGE_MAX) {
            $errors['per_page'] = 'per_page must be an integer between 1 and ' . DS_ATELIER_CATALOG_PER_PAGE_MAX . '.';
            $perPage = DS_ATELIER_CATALOG_PER_PAGE_DEFAULT;
        }
    }

    $sort = strtolower(trim((string) ($input['sort'] ?? 'latest')));
    if (!in_array($sort, DS_ATELIER_CATALOG_SORTS, true)) {
        $errors['sort'] = 'sort must be latest, price-asc, price-desc, or popular.';
        $sort = 'latest';
    }

    $search = trim((string) ($input['q'] ?? $input['search'] ?? ''));
    if (strlen($search) > DS_ATELIER_CATALOG_SEARCH_MAX) {
        $errors['q'] = 'search must be ' . DS_ATELIER_CATALOG_SEARCH_MAX . ' characters or fewer.';
        $search = substr($search, 0, DS_ATELIER_CATALOG_SEARCH_MAX);
    }
    $search = preg_replace('/\s+/', ' ', $search) ?? '';

    $categories = ds_atelier_catalog_csv($input['category'] ?? []);
    foreach ($categories as $category) {
        if (strlen($category) > 120) {
            $errors['category'] = 'category values are too long.';
            break;
        }
    }

    $sizes = ds_atelier_catalog_csv($input['size'] ?? []);
    foreach ($sizes as $size) {
        if (!preg_match('/^[A-Za-z0-9]{1,8}$/', $size)) {
            $errors['size'] = 'size contains an invalid value.';
            break;
        }
    }

    $colours = ds_atelier_catalog_csv($input['colour'] ?? $input['color'] ?? []);
    foreach ($colours as $colour) {
        if (strlen($colour) > 40) {
            $errors['colour'] = 'colour values are too long.';
            break;
        }
    }

    $materials = ds_atelier_catalog_csv($input['material'] ?? []);
    foreach ($materials as $material) {
        if (strlen($material) > 40) {
            $errors['material'] = 'material values are too long.';
            break;
        }
    }

    $availability = ds_atelier_catalog_csv($input['availability'] ?? []);
    foreach ($availability as $value) {
        if (!in_array($value, ['In stock', 'Made to order'], true)) {
            $errors['availability'] = 'availability must be In stock or Made to order.';
            break;
        }
    }

    $priceBuckets = ds_atelier_catalog_csv($input['price'] ?? []);
    foreach ($priceBuckets as $bucket) {
        if (!in_array($bucket, DS_ATELIER_CATALOG_PRICE_BUCKETS, true)) {
            $errors['price'] = 'price contains an invalid range.';
            break;
        }
    }

    $minPrice = null;
    if (array_key_exists('min_price', $input) && $input['min_price'] !== '' && $input['min_price'] !== null) {
        if (!is_numeric($input['min_price'])) {
            $errors['min_price'] = 'min_price must be numeric.';
        } else {
            $minPrice = round((float) $input['min_price'], 2);
            if ($minPrice < 0 || $minPrice > 999999) {
                $errors['min_price'] = 'min_price is out of range.';
                $minPrice = null;
            }
        }
    }

    $maxPrice = null;
    if (array_key_exists('max_price', $input) && $input['max_price'] !== '' && $input['max_price'] !== null) {
        if (!is_numeric($input['max_price'])) {
            $errors['max_price'] = 'max_price must be numeric.';
        } else {
            $maxPrice = round((float) $input['max_price'], 2);
            if ($maxPrice < 0 || $maxPrice > 999999) {
                $errors['max_price'] = 'max_price is out of range.';
                $maxPrice = null;
            }
        }
    }

    if ($minPrice !== null && $maxPrice !== null && $minPrice > $maxPrice) {
        $errors['max_price'] = 'max_price must be greater than or equal to min_price.';
    }

    $featured = false;
    if (isset($input['featured'])) {
        $featuredRaw = $input['featured'];
        $featured = $featuredRaw === true || $featuredRaw === 1 || $featuredRaw === '1' || $featuredRaw === 'true';
    }

    $scope = strtolower(trim((string) ($input['scope'] ?? ($featured ? 'featured' : 'shop'))));
    if (!in_array($scope, ['shop', 'featured', 'storefront'], true)) {
        $errors['scope'] = 'scope must be shop, featured, or storefront.';
        $scope = 'shop';
    }
    if ($featured) {
        $scope = 'featured';
    }

    return [
        'ok' => $errors === [],
        'errors' => $errors,
        'page' => $page,
        'per_page' => $perPage,
        'sort' => $sort,
        'q' => $search,
        'category' => $categories,
        'size' => array_map('strtoupper', $sizes),
        'colour' => $colours,
        'material' => $materials,
        'availability' => $availability,
        'price' => $priceBuckets,
        'min_price' => $minPrice,
        'max_price' => $maxPrice,
        'scope' => $scope,
        'code' => $errors === [] ? 200 : 422,
        'error' => $errors === [] ? null : 'Invalid catalog filters.',
    ];
}

function ds_atelier_catalog_price_bucket_bounds(string $bucket): ?array
{
    return match ($bucket) {
        'under-799' => [null, 799.99],
        '800-1199' => [800.00, 1199.00],
        '1200-plus' => [1200.00, null],
        default => null,
    };
}

function ds_atelier_catalog_build_list_sql(array $query): array
{
    $where = ['p.published = 1'];
    $params = [];

    if ($query['scope'] === 'shop') {
        $where[] = 'p.in_shop = 1';
    } elseif ($query['scope'] === 'featured') {
        $where[] = 'p.featured = 1';
    } else {
        $where[] = '(p.in_shop = 1 OR p.featured = 1)';
    }

    $where[] = 'EXISTS (SELECT 1 FROM product_variants vx WHERE vx.product_id = p.id AND vx.active = 1)';

    if ($query['q'] !== '') {
        $like = ds_atelier_catalog_like_contains($query['q']);
        $where[] = '(p.name LIKE ? ESCAPE \'\\\\\' OR p.sku LIKE ? ESCAPE \'\\\\\' OR p.badge LIKE ? ESCAPE \'\\\\\' OR p.material LIKE ? ESCAPE \'\\\\\' OR cat.name LIKE ? ESCAPE \'\\\\\'
            OR EXISTS (
                SELECT 1 FROM product_variants vq
                INNER JOIN sizes sq ON sq.id = vq.size_id
                INNER JOIN colours cq ON cq.id = vq.colour_id
                WHERE vq.product_id = p.id AND vq.active = 1
                  AND (sq.code LIKE ? ESCAPE \'\\\\\' OR cq.name LIKE ? ESCAPE \'\\\\\')
            ))';
        array_push($params, $like, $like, $like, $like, $like, $like, $like);
    }

    if ($query['category'] !== []) {
        $placeholders = implode(',', array_fill(0, count($query['category']), '?'));
        $where[] = "(cat.slug IN ($placeholders) OR cat.name IN ($placeholders))";
        foreach ($query['category'] as $category) {
            $params[] = $category;
        }
        foreach ($query['category'] as $category) {
            $params[] = $category;
        }
    }

    if ($query['material'] !== []) {
        $placeholders = implode(',', array_fill(0, count($query['material']), '?'));
        $where[] = "p.material IN ($placeholders)";
        foreach ($query['material'] as $material) {
            $params[] = $material;
        }
    }

    if ($query['availability'] !== []) {
        $placeholders = implode(',', array_fill(0, count($query['availability']), '?'));
        $where[] = "p.availability IN ($placeholders)";
        foreach ($query['availability'] as $availability) {
            $params[] = $availability;
        }
    }

    if ($query['size'] !== []) {
        $placeholders = implode(',', array_fill(0, count($query['size']), '?'));
        $where[] = "EXISTS (SELECT 1 FROM product_variants vs INNER JOIN sizes sz ON sz.id = vs.size_id WHERE vs.product_id = p.id AND vs.active = 1 AND sz.code IN ($placeholders))";
        foreach ($query['size'] as $size) {
            $params[] = $size;
        }
    }

    if ($query['colour'] !== []) {
        $placeholders = implode(',', array_fill(0, count($query['colour']), '?'));
        $where[] = "EXISTS (SELECT 1 FROM product_variants vc INNER JOIN colours cl ON cl.id = vc.colour_id WHERE vc.product_id = p.id AND vc.active = 1 AND (cl.slug IN ($placeholders) OR cl.name IN ($placeholders)))";
        foreach ($query['colour'] as $colour) {
            $params[] = $colour;
        }
        foreach ($query['colour'] as $colour) {
            $params[] = $colour;
        }
    }

    $priceGroups = [];
    foreach ($query['price'] as $bucket) {
        $bounds = ds_atelier_catalog_price_bucket_bounds($bucket);
        if ($bounds === null) {
            continue;
        }
        $parts = [];
        if ($bounds[0] !== null) {
            $parts[] = 'vp.price >= ?';
            $params[] = $bounds[0];
        }
        if ($bounds[1] !== null) {
            $parts[] = 'vp.price <= ?';
            $params[] = $bounds[1];
        }
        if ($parts !== []) {
            $priceGroups[] = '(' . implode(' AND ', $parts) . ')';
        }
    }
    if ($query['min_price'] !== null || $query['max_price'] !== null) {
        $parts = [];
        if ($query['min_price'] !== null) {
            $parts[] = 'vp.price >= ?';
            $params[] = $query['min_price'];
        }
        if ($query['max_price'] !== null) {
            $parts[] = 'vp.price <= ?';
            $params[] = $query['max_price'];
        }
        $priceGroups[] = '(' . implode(' AND ', $parts) . ')';
    }
    if ($priceGroups !== []) {
        $where[] = 'EXISTS (SELECT 1 FROM product_variants vp WHERE vp.product_id = p.id AND vp.active = 1 AND (' . implode(' OR ', $priceGroups) . '))';
    }

    $latestOrder = $query['scope'] === 'featured'
        ? 'p.featured_sort ASC, p.sort_order ASC, p.id ASC'
        : 'p.sort_order ASC, p.id ASC';
    $order = match ($query['sort']) {
        'price-asc' => 'listed.price ASC, p.sort_order ASC, p.id ASC',
        'price-desc' => 'listed.price DESC, p.sort_order ASC, p.id ASC',
        'popular' => 'p.popular DESC, p.sort_order ASC, p.id ASC',
        default => $latestOrder,
    };

    $from = 'FROM products p
        INNER JOIN categories cat ON cat.id = p.category_id
        INNER JOIN product_variants v ON v.product_id = p.id AND v.active = 1';

    $whereSql = implode(' AND ', $where);
    $listed = "SELECT p.id AS listed_id,
            MIN(v.price) AS price,
            SUBSTRING_INDEX(GROUP_CONCAT(v.mrp ORDER BY v.price ASC, v.id ASC), ',', 1) AS mrp
        $from
        WHERE $whereSql
        GROUP BY p.id";

    $select = "SELECT p.id, p.slug, p.sku, p.name, p.badge, p.material, p.availability, p.rating, p.reviews,
            p.popular, p.weight, p.gsm, p.lead, p.details, p.published, p.in_shop, p.featured, p.sort_order,
            cat.name AS category_name, cat.slug AS category_slug,
            defc.name AS default_colour_name, defc.slug AS default_colour_slug,
            listed.price, listed.mrp
        FROM ($listed) listed
        INNER JOIN products p ON p.id = listed.listed_id
        INNER JOIN categories cat ON cat.id = p.category_id
        LEFT JOIN colours defc ON defc.id = p.default_colour_id
        ORDER BY $order";

    return [
        'select' => $select,
        'count' => "SELECT COUNT(*) FROM ($listed) counted",
        'params' => $params,
    ];
}

function ds_atelier_catalog_fetch_media(PDO $pdo, array $productIds): array
{
    if ($productIds === []) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT product_id, src, alt, sort_order, is_primary, colour_id
         FROM product_media
         WHERE product_id IN ($placeholders)
         ORDER BY is_primary DESC, sort_order ASC, id ASC"
    );
    $stmt->execute(array_values($productIds));
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $out[(int) $row['product_id']][] = $row;
    }
    return $out;
}

function ds_atelier_catalog_fetch_print_types(PDO $pdo, array $productIds): array
{
    if ($productIds === []) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT product_id, print_type
         FROM product_print_types
         WHERE product_id IN ($placeholders)
         ORDER BY sort_order ASC, print_type ASC"
    );
    $stmt->execute(array_values($productIds));
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $out[(int) $row['product_id']][] = (string) $row['print_type'];
    }
    return $out;
}

function ds_atelier_catalog_fetch_active_variants(PDO $pdo, array $productIds): array
{
    if ($productIds === []) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT v.id, v.product_id, v.sku, v.price, v.mrp, v.stock, v.active, v.image,
                s.code AS size_code, s.name AS size_name,
                c.slug AS colour_slug, c.name AS colour_name
         FROM product_variants v
         INNER JOIN sizes s ON s.id = v.size_id
         INNER JOIN colours c ON c.id = v.colour_id
         WHERE v.product_id IN ($placeholders) AND v.active = 1
         ORDER BY s.sort_order ASC, c.sort_order ASC, v.id ASC"
    );
    $stmt->execute(array_values($productIds));
    $rows = ds_atelier_inventory_decorate_variants($pdo, $stmt->fetchAll());
    $out = [];
    foreach ($rows as $row) {
        $out[(int) $row['product_id']][] = $row;
    }
    return $out;
}

function ds_atelier_catalog_variant_purchasable(array $variant, string $availability): bool
{
    if ((int) ($variant['active'] ?? 0) !== 1) {
        return false;
    }
    if ($availability === 'Made to order') {
        return true;
    }
    return ds_atelier_inventory_available(['availability' => $availability], $variant) > 0;
}

function ds_atelier_catalog_map_variant(array $row, string $availability): array
{
    $purchasable = ds_atelier_catalog_variant_purchasable($row, $availability);
    return [
        'id' => (int) $row['id'],
        'sku' => (string) $row['sku'],
        'size' => (string) $row['size_code'],
        'colour' => (string) $row['colour_name'],
        'color' => (string) $row['colour_name'],
        'price' => (float) $row['price'],
        'mrp' => (float) $row['mrp'],
        'stock' => (int) ($row['available'] ?? $row['stock'] ?? 0),
        'available' => (int) ($row['available'] ?? $row['stock'] ?? 0),
        'onHand' => (int) ($row['on_hand'] ?? $row['stock'] ?? 0),
        'active' => true,
        'purchasable' => $purchasable,
        'image' => $row['image'] !== null && $row['image'] !== '' ? (string) $row['image'] : null,
    ];
}

function ds_atelier_catalog_map_product(array $row, array $media, array $printTypes, array $variants): array
{
    $availability = (string) $row['availability'];
    $mappedVariants = [];
    $sizes = [];
    $colours = [];
    $variantImages = [];
    $colorImages = [];
    foreach ($variants as $variantRow) {
        $mapped = ds_atelier_catalog_map_variant($variantRow, $availability);
        $mappedVariants[] = $mapped;
        if (!in_array($mapped['size'], $sizes, true)) {
            $sizes[] = $mapped['size'];
        }
        if (!in_array($mapped['colour'], $colours, true)) {
            $colours[] = $mapped['colour'];
        }
        if ($mapped['image']) {
            $variantImages[$mapped['colour'] . '|' . $mapped['size']] = $mapped['image'];
            if (!isset($colorImages[$mapped['colour']])) {
                $colorImages[$mapped['colour']] = $mapped['image'];
            }
        }
    }

    $images = [];
    foreach ($media as $item) {
        $images[] = [
            'src' => (string) $item['src'],
            'alt' => (string) $item['alt'],
        ];
    }
    $primary = $images[0] ?? ['src' => '', 'alt' => (string) $row['name']];
    $price = isset($row['price']) ? (float) $row['price'] : (float) ($mappedVariants[0]['price'] ?? 0);
    $mrp = isset($row['mrp']) ? (float) $row['mrp'] : (float) ($mappedVariants[0]['mrp'] ?? 0);

    $payload = [
        'id' => (string) $row['slug'],
        'productId' => (int) $row['id'],
        'sku' => (string) $row['sku'],
        'name' => (string) $row['name'],
        'price' => $price,
        'mrp' => $mrp,
        'rating' => (float) $row['rating'],
        'reviews' => (int) $row['reviews'],
        'badge' => (string) ($row['badge'] ?? ''),
        'image' => $primary['src'],
        'alt' => $primary['alt'],
        'category' => (string) $row['category_name'],
        'sizes' => $sizes,
        'color' => (string) ($row['default_colour_name'] ?? ($colours[0] ?? '')),
        'colors' => $colours,
        'material' => (string) $row['material'],
        'availability' => $availability,
        'popular' => (int) $row['popular'],
        'weight' => (int) $row['weight'],
        'gsm' => (string) ($row['gsm'] ?? ''),
        'printTypes' => $printTypes,
        'lead' => (string) ($row['lead'] ?? ''),
        'details' => (string) ($row['details'] ?? ''),
        'images' => $images,
        'inShop' => (int) $row['in_shop'] === 1,
        'featured' => (int) ($row['featured'] ?? 0) === 1,
        'variants' => $mappedVariants,
    ];
    if ($variantImages !== []) {
        $payload['variantImages'] = $variantImages;
    }
    if ($colorImages !== []) {
        $payload['colorImages'] = $colorImages;
    }
    return $payload;
}

function ds_atelier_catalog_list_products(PDO $pdo, array $input): array
{
    $query = ds_atelier_catalog_parse_list_query($input);
    if ($query['ok'] !== true) {
        return [
            'ok' => false,
            'error' => $query['error'],
            'fields' => $query['errors'],
            'code' => 422,
        ];
    }

    $sql = ds_atelier_catalog_build_list_sql($query);
    $countStmt = $pdo->prepare($sql['count']);
    $countStmt->execute($sql['params']);
    $total = (int) $countStmt->fetchColumn();
    $totalPages = max(1, (int) ceil(($total > 0 ? $total : 1) / $query['per_page']));
    if ($total === 0) {
        $totalPages = 1;
    }
    $page = min($query['page'], $totalPages);
    $offset = ($page - 1) * $query['per_page'];

    $limit = (int) $query['per_page'];
    $offset = (int) $offset;
    $listStmt = $pdo->prepare($sql['select'] . ' LIMIT ' . $limit . ' OFFSET ' . $offset);
    $listStmt->execute($sql['params']);
    $rows = $listStmt->fetchAll();
    $ids = array_map(static fn (array $row): int => (int) $row['id'], $rows);
    $media = ds_atelier_catalog_fetch_media($pdo, $ids);
    $printTypes = ds_atelier_catalog_fetch_print_types($pdo, $ids);
    $variants = ds_atelier_catalog_fetch_active_variants($pdo, $ids);

    $products = [];
    foreach ($rows as $row) {
        $id = (int) $row['id'];
        $products[] = ds_atelier_catalog_map_product(
            $row,
            $media[$id] ?? [],
            $printTypes[$id] ?? [],
            $variants[$id] ?? []
        );
    }

    return [
        'ok' => true,
        'products' => $products,
        'meta' => [
            'page' => $page,
            'per_page' => $query['per_page'],
            'total' => $total,
            'total_pages' => $totalPages,
            'sort' => $query['sort'],
            'scope' => $query['scope'],
            'q' => $query['q'],
        ],
        'code' => 200,
    ];
}

function ds_atelier_catalog_get_product(PDO $pdo, string $slug): array
{
    $slug = trim($slug);
    if ($slug === '' || strlen($slug) > 80 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        return ['ok' => false, 'error' => 'Product not found.', 'code' => 404];
    }

    $stmt = $pdo->prepare(
        'SELECT p.id, p.slug, p.sku, p.name, p.badge, p.material, p.availability, p.rating, p.reviews,
                p.popular, p.weight, p.gsm, p.lead, p.details, p.published, p.in_shop, p.featured, p.sort_order,
                cat.name AS category_name, cat.slug AS category_slug,
                defc.name AS default_colour_name, defc.slug AS default_colour_slug
         FROM products p
         INNER JOIN categories cat ON cat.id = p.category_id
         LEFT JOIN colours defc ON defc.id = p.default_colour_id
         WHERE p.slug = ? AND p.published = 1
         LIMIT 1'
    );
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return ['ok' => false, 'error' => 'Product not found.', 'code' => 404];
    }

    $id = [(int) $row['id']];
    $media = ds_atelier_catalog_fetch_media($pdo, $id);
    $printTypes = ds_atelier_catalog_fetch_print_types($pdo, $id);
    $variants = ds_atelier_catalog_fetch_active_variants($pdo, $id);
    $variantRows = $variants[(int) $row['id']] ?? [];
    if ($variantRows !== []) {
        $cheapest = $variantRows[0];
        foreach ($variantRows as $variantRow) {
            if ((float) $variantRow['price'] < (float) $cheapest['price']) {
                $cheapest = $variantRow;
            }
        }
        $row['price'] = $cheapest['price'];
        $row['mrp'] = $cheapest['mrp'];
    } else {
        $row['price'] = 0;
        $row['mrp'] = 0;
    }

    return [
        'ok' => true,
        'product' => ds_atelier_catalog_map_product(
            $row,
            $media[(int) $row['id']] ?? [],
            $printTypes[(int) $row['id']] ?? [],
            $variantRows
        ),
        'code' => 200,
    ];
}

function ds_atelier_catalog_list_categories(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT c.id, c.slug, c.name, c.sort_order,
                COUNT(DISTINCT CASE WHEN p.published = 1 AND p.in_shop = 1 THEN p.id END) AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.id ASC'
    );
    $categories = [];
    foreach ($stmt->fetchAll() as $row) {
        $categories[] = [
            'id' => (int) $row['id'],
            'slug' => (string) $row['slug'],
            'name' => (string) $row['name'],
            'count' => (int) $row['product_count'],
        ];
    }

    return [
        'ok' => true,
        'categories' => $categories,
        'code' => 200,
    ];
}

function ds_atelier_catalog_handle_list(array $config, array $input): array
{
    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        return ['ok' => false, 'error' => 'Catalog is temporarily unavailable.', 'code' => 503];
    }
    try {
        return ds_atelier_catalog_list_products($result['pdo'], $input);
    } catch (Throwable $e) {
        return ds_atelier_fail_closed('Unable to load products. Please try again later.', $e, $config);
    }
}

function ds_atelier_catalog_handle_product(array $config, string $slug): array
{
    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        return ['ok' => false, 'error' => 'Catalog is temporarily unavailable.', 'code' => 503];
    }
    try {
        return ds_atelier_catalog_get_product($result['pdo'], $slug);
    } catch (Throwable $e) {
        return ds_atelier_fail_closed('Unable to load this product. Please try again later.', $e, $config);
    }
}

function ds_atelier_catalog_handle_categories(array $config): array
{
    $result = ds_atelier_try_pdo($config);
    if (!$result['ok'] || !$result['pdo'] instanceof PDO) {
        return ['ok' => false, 'error' => 'Catalog is temporarily unavailable.', 'code' => 503];
    }
    try {
        return ds_atelier_catalog_list_categories($result['pdo']);
    } catch (Throwable $e) {
        return ds_atelier_fail_closed('Unable to load categories. Please try again later.', $e, $config);
    }
}
