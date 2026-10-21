<?php

declare(strict_types=1);

function ds_atelier_catalog_seed_allowed(array $config): void
{
    if (($config['env'] ?? '') !== 'development') {
        throw new RuntimeException('Catalog fixtures can only be seeded in development.');
    }
    if (($config['db']['name'] ?? '') !== 'ds_atelier_dev') {
        throw new RuntimeException('Catalog fixtures can only be seeded into ds_atelier_dev.');
    }
}

function ds_atelier_catalog_seed_data(): array
{
    $path = dirname(__DIR__) . '/fixtures/catalog-data.php';
    if (!is_file($path)) {
        throw new RuntimeException('Catalog fixture file is missing.');
    }
    $data = require $path;
    if (!is_array($data) || !isset($data['products']) || !is_array($data['products'])) {
        throw new RuntimeException('Catalog fixture file is invalid.');
    }
    return $data;
}

function ds_atelier_catalog_seed_lookup(PDO $pdo, string $sql, string $value): ?int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$value]);
    $id = $stmt->fetchColumn();
    return $id === false ? null : (int) $id;
}

function ds_atelier_catalog_seed_insert_lookups(PDO $pdo, array $data): array
{
    $categories = [];
    $insertCategory = $pdo->prepare(
        'INSERT INTO categories (slug, name, sort_order) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)'
    );
    foreach ($data['categories'] as $row) {
        $insertCategory->execute([$row['slug'], $row['name'], (int) $row['sort_order']]);
        $id = ds_atelier_catalog_seed_lookup($pdo, 'SELECT id FROM categories WHERE slug = ? LIMIT 1', $row['slug']);
        if ($id === null) {
            throw new RuntimeException('Unable to seed category: ' . $row['slug']);
        }
        $categories[$row['name']] = $id;
        $categories[$row['slug']] = $id;
    }

    $sizes = [];
    $insertSize = $pdo->prepare(
        'INSERT INTO sizes (code, name, sort_order) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)'
    );
    foreach ($data['sizes'] as $row) {
        $insertSize->execute([$row['code'], $row['name'], (int) $row['sort_order']]);
        $id = ds_atelier_catalog_seed_lookup($pdo, 'SELECT id FROM sizes WHERE code = ? LIMIT 1', $row['code']);
        if ($id === null) {
            throw new RuntimeException('Unable to seed size: ' . $row['code']);
        }
        $sizes[$row['code']] = $id;
    }

    $colours = [];
    $insertColour = $pdo->prepare(
        'INSERT INTO colours (slug, name, sort_order) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)'
    );
    foreach ($data['colours'] as $row) {
        $insertColour->execute([$row['slug'], $row['name'], (int) $row['sort_order']]);
        $id = ds_atelier_catalog_seed_lookup($pdo, 'SELECT id FROM colours WHERE slug = ? LIMIT 1', $row['slug']);
        if ($id === null) {
            throw new RuntimeException('Unable to seed colour: ' . $row['slug']);
        }
        $colours[$row['name']] = $id;
        $colours[$row['slug']] = $id;
    }

    return ['categories' => $categories, 'sizes' => $sizes, 'colours' => $colours];
}

function ds_atelier_catalog_seed_sku_suffix(string $size, string $colour): string
{
    $sizeCode = preg_replace('/[^A-Z0-9]/', '', strtoupper($size)) ?: 'NA';
    $colourCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $colour) ?: 'NA', 0, 3));
    return $sizeCode . '-' . $colourCode;
}

function ds_atelier_catalog_seed_stock(array $product): int
{
    return ($product['availability'] ?? '') === 'Made to order' ? 0 : 24;
}

function ds_atelier_catalog_seed_products(PDO $pdo, array $data, array $lookups): array
{
    $featured = [];
    foreach ($data['featured'] as $index => $slug) {
        $featured[$slug] = $index + 1;
    }

    $findProduct = $pdo->prepare('SELECT id FROM products WHERE slug = ? LIMIT 1');
    $insertProduct = $pdo->prepare(
        'INSERT INTO products (
            slug, sku, name, category_id, default_colour_id, badge, material, availability,
            rating, reviews, popular, weight, gsm, lead, details, published, in_shop,
            featured, featured_sort, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)'
    );
    $insertPrint = $pdo->prepare(
        'INSERT INTO product_print_types (product_id, print_type, sort_order) VALUES (?, ?, ?)'
    );
    $insertMedia = $pdo->prepare(
        'INSERT INTO product_media (product_id, src, alt, sort_order, is_primary, colour_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $insertVariant = $pdo->prepare(
        'INSERT INTO product_variants (product_id, size_id, colour_id, sku, price, mrp, stock, active, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
    );

    $inserted = 0;
    $skipped = 0;
    $sort = 0;

    foreach ($data['products'] as $product) {
        $sort++;
        $slug = (string) $product['slug'];
        $findProduct->execute([$slug]);
        if ($findProduct->fetchColumn() !== false) {
            $skipped++;
            continue;
        }

        $categoryId = $lookups['categories'][$product['category']] ?? null;
        $defaultColourId = $lookups['colours'][$product['color']] ?? null;
        if ($categoryId === null || $defaultColourId === null) {
            throw new RuntimeException('Fixture references an unknown category or colour for ' . $slug);
        }

        $inShop = ($product['inShop'] ?? true) === false ? 0 : 1;
        $featuredSort = $featured[$slug] ?? 0;
        $pdo->beginTransaction();
        try {
        $insertProduct->execute([
            $slug,
            $product['sku'],
            $product['name'],
            $categoryId,
            $defaultColourId,
            $product['badge'] ?? null,
            $product['material'],
            $product['availability'],
            $product['rating'],
            $product['reviews'],
            $product['popular'],
            $product['weight'],
            $product['gsm'] ?? null,
            $product['lead'] ?? null,
            $product['details'] ?? null,
            $inShop,
            $featuredSort > 0 ? 1 : 0,
            $featuredSort,
            $sort,
        ]);
        $productId = (int) $pdo->lastInsertId();
        if ($productId < 1) {
            throw new RuntimeException('Unable to insert product: ' . $slug);
        }

        foreach (array_values($product['printTypes'] ?? []) as $index => $printType) {
            $insertPrint->execute([$productId, $printType, $index + 1]);
        }

        $images = $product['images'] ?? [];
        if ($images === [] && !empty($product['image'])) {
            $images[] = ['src' => $product['image'], 'alt' => $product['alt'] ?? $product['name']];
        }
        foreach (array_values($images) as $index => $image) {
            $insertMedia->execute([
                $productId,
                $image['src'],
                $image['alt'] ?? $product['name'],
                $index + 1,
                $index === 0 ? 1 : 0,
                $index === 0 ? $defaultColourId : null,
            ]);
        }

        $primaryImage = $images[0]['src'] ?? ($product['image'] ?? null);
        $stock = ds_atelier_catalog_seed_stock($product);
        foreach ($product['sizes'] as $size) {
            $sizeId = $lookups['sizes'][$size] ?? null;
            if ($sizeId === null) {
                throw new RuntimeException('Fixture references an unknown size for ' . $slug);
            }
            foreach ($product['colors'] as $colour) {
                $colourId = $lookups['colours'][$colour] ?? null;
                if ($colourId === null) {
                    throw new RuntimeException('Fixture references an unknown colour for ' . $slug);
                }
                $variantSku = $product['sku'] . '-' . ds_atelier_catalog_seed_sku_suffix($size, $colour);
                $insertVariant->execute([
                    $productId,
                    $sizeId,
                    $colourId,
                    $variantSku,
                    $product['price'],
                    $product['mrp'],
                    $stock,
                    $colour === $product['color'] ? $primaryImage : null,
                ]);
            }
        }

        $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        $inserted++;
    }

    return ['inserted' => $inserted, 'skipped' => $skipped];
}

function ds_atelier_catalog_seed(PDO $pdo, array $config): array
{
    ds_atelier_catalog_seed_allowed($config);
    $data = ds_atelier_catalog_seed_data();
    $lookups = ds_atelier_catalog_seed_insert_lookups($pdo, $data);
    $products = ds_atelier_catalog_seed_products($pdo, $data, $lookups);
    return [
        'ok' => true,
        'categories' => count($data['categories']),
        'sizes' => count($data['sizes']),
        'colours' => count($data['colours']),
        'products_inserted' => $products['inserted'],
        'products_skipped' => $products['skipped'],
    ];
}
