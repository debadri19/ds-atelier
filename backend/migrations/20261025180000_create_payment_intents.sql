CREATE TABLE IF NOT EXISTS payment_intents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'razorpay',
    provider_order_id VARCHAR(64) NULL,
    provider_payment_id VARCHAR(64) NULL,
    amount_paise INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL,
    signature_hash CHAR(64) NULL,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payment_intents_order (order_id),
    UNIQUE KEY uq_payment_intents_provider_order (provider_order_id),
    INDEX idx_payment_intents_status (status),
    INDEX idx_payment_intents_payment (provider_payment_id),
    CONSTRAINT fk_payment_intents_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
