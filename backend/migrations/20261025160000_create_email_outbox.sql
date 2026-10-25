CREATE TABLE IF NOT EXISTS email_outbox (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_key VARCHAR(120) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    template VARCHAR(40) NOT NULL,
    order_id INT UNSIGNED NULL,
    customer_id INT UNSIGNED NULL,
    recipient_email VARCHAR(255) NOT NULL,
    payload_json MEDIUMTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts INT UNSIGNED NOT NULL DEFAULT 5,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    claimed_at DATETIME NULL,
    claimed_token CHAR(16) NULL,
    sent_at DATETIME NULL,
    last_error VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email_outbox_event (event_key),
    INDEX idx_email_outbox_status_next (status, next_attempt_at, id),
    INDEX idx_email_outbox_order (order_id),
    INDEX idx_email_outbox_customer (customer_id),
    CONSTRAINT fk_email_outbox_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_email_outbox_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
