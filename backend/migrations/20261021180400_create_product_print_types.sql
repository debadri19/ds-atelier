CREATE TABLE IF NOT EXISTS product_print_types (
    product_id INT UNSIGNED NOT NULL,
    print_type VARCHAR(40) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, print_type),
    INDEX idx_product_print_types_sort (product_id, sort_order),
    CONSTRAINT fk_product_print_types_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
