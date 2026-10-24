CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT UNSIGNED NOT NULL,
    reservation_id INT UNSIGNED NULL,
    order_id INT UNSIGNED NULL,
    quantity INT NOT NULL,
    kind VARCHAR(32) NOT NULL,
    on_hand_before INT UNSIGNED NOT NULL,
    on_hand_after INT UNSIGNED NOT NULL,
    available_before INT NOT NULL,
    available_after INT NOT NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_inventory_movements_variant (variant_id, created_at),
    INDEX idx_inventory_movements_order (order_id),
    INDEX idx_inventory_movements_reservation (reservation_id),
    CONSTRAINT fk_inventory_movements_variant
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
