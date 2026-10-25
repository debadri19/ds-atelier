CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    event_key VARCHAR(120) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    order_id INT UNSIGNED NULL,
    provider_order_id VARCHAR(64) NULL,
    provider_payment_id VARCHAR(64) NULL,
    payload_json MEDIUMTEXT NOT NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payment_webhook_event (provider, event_key),
    INDEX idx_payment_webhook_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
