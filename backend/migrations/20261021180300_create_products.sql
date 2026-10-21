CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(80) NOT NULL,
    sku VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    default_colour_id INT UNSIGNED NULL,
    badge VARCHAR(40) NULL,
    material VARCHAR(40) NOT NULL,
    availability VARCHAR(40) NOT NULL,
    rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
    reviews INT UNSIGNED NOT NULL DEFAULT 0,
    popular INT UNSIGNED NOT NULL DEFAULT 0,
    weight INT UNSIGNED NOT NULL DEFAULT 0,
    gsm VARCHAR(40) NULL,
    lead TEXT NULL,
    details TEXT NULL,
    published TINYINT(1) NOT NULL DEFAULT 1,
    in_shop TINYINT(1) NOT NULL DEFAULT 1,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    featured_sort INT UNSIGNED NOT NULL DEFAULT 0,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_products_slug (slug),
    UNIQUE KEY uq_products_sku (sku),
    INDEX idx_products_category (category_id),
    INDEX idx_products_published_shop (published, in_shop, sort_order, id),
    INDEX idx_products_featured (featured, featured_sort, id),
    INDEX idx_products_material (material),
    INDEX idx_products_availability (availability),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_products_default_colour
        FOREIGN KEY (default_colour_id) REFERENCES colours(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
