CREATE TABLE IF NOT EXISTS shipment_events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shipment_id INT UNSIGNED NOT NULL,
    order_id INT UNSIGNED NOT NULL,
    from_status VARCHAR(32) NULL,
    to_status VARCHAR(32) NOT NULL,
    courier_name VARCHAR(80) NULL,
    tracking_number VARCHAR(80) NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_shipment_events_shipment (shipment_id, created_at),
    INDEX idx_shipment_events_order (order_id),
    CONSTRAINT fk_shipment_events_shipment
        FOREIGN KEY (shipment_id) REFERENCES shipments(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_shipment_events_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
