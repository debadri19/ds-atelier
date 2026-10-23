CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    variant_id INT UNSIGNED NULL,
    product_slug VARCHAR(80) NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    sku VARCHAR(80) NOT NULL,
    colour_name VARCHAR(80) NOT NULL,
    size_code VARCHAR(16) NOT NULL,
    print_type VARCHAR(40) NOT NULL,
    print_position VARCHAR(40) NOT NULL,
    artwork_id VARCHAR(80) NOT NULL DEFAULT '',
    artwork_name VARCHAR(160) NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    unit_mrp DECIMAL(12,2) NOT NULL,
    line_price DECIMAL(12,2) NOT NULL,
    line_mrp DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id),
    INDEX idx_order_items_variant (variant_id),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
