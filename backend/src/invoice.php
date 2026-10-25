<?php

declare(strict_types=1);

const DS_ATELIER_INVOICE_STATUS_ISSUED = 'issued';
const DS_ATELIER_INVOICE_KIND_DEVELOPMENT = 'development_test';
const DS_ATELIER_INVOICE_KIND_BLOCKED = 'blocked';

function ds_atelier_invoice_missing_table(PDOException $e): bool
{
    $code = (string) $e->getCode();
    if ($code === '42S02' || $code === '42S22') {
        return true;
    }
    $message = strtolower($e->getMessage());
    return str_contains($message, "doesn't exist") || str_contains($message, 'unknown table');
}

function ds_atelier_invoice_tables_exist(PDO $pdo): bool
{
    static $exists = false;
    if ($exists) {
        return true;
    }
    try {
        $pdo->query('SELECT 1 FROM invoices LIMIT 1');
        $exists = true;
        return true;
    } catch (PDOException $e) {
        if (ds_atelier_invoice_missing_table($e)) {
            return false;
        }
        throw $e;
    }
}

function ds_atelier_invoice_settings(array $config): array
{
    $path = $config['paths']['root'] . '/config/invoice.php';
    $file = is_file($path) ? require $path : [];
    if (!is_array($file)) {
        $file = [];
    }
    $seller = is_array($file['seller'] ?? null) ? $file['seller'] : [];
    $policy = (string) ($seller['policy'] ?? 'unconfigured');
    return [
        'seller' => [
            'policy' => $policy,
            'legal_name' => trim((string) ($seller['legal_name'] ?? '')),
            'gstin' => trim((string) ($seller['gstin'] ?? '')),
            'address' => trim((string) ($seller['address'] ?? '')),
        ],
    ];
}

function ds_atelier_invoice_parse_number(mixed $value): string
{
    $number = strtoupper(trim((string) $value));
    if (!preg_match('/^DSA-INV-[A-Z0-9]{8,32}$/', $number)) {
        return '';
    }
    return $number;
}

function ds_atelier_invoice_public_number(string $orderRef): string
{
    $suffix = strtoupper(substr(hash('sha256', $orderRef . '|invoice'), 0, 12));
    return 'DSA-INV-' . $suffix;
}

function ds_atelier_invoice_filename(string $number): string
{
    return preg_replace('/[^A-Z0-9-]/', '', $number) . '.html';
}

function ds_atelier_invoice_find_by_order(PDO $pdo, int $orderId): ?array
{
    if ($orderId < 1 || !ds_atelier_invoice_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM invoices WHERE order_id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_invoice_find_by_number(PDO $pdo, string $number): ?array
{
    if ($number === '' || !ds_atelier_invoice_tables_exist($pdo)) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM invoices WHERE public_number = ? LIMIT 1');
    $stmt->execute([$number]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_invoice_map_for_orders(PDO $pdo, array $orderIds): array
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === [] || !ds_atelier_invoice_tables_exist($pdo)) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare("SELECT * FROM invoices WHERE order_id IN ($placeholders)");
    $stmt->execute($orderIds);
    $out = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $out[(int) $row['order_id']] = $row;
    }
    return $out;
}

function ds_atelier_invoice_snapshot(array $config, array $order, array $items): array
{
    $settings = ds_atelier_invoice_settings($config);
    $sellerConfigured = $settings['seller']['policy'] === 'configured'
        && $settings['seller']['legal_name'] !== '';
    $kind = $sellerConfigured ? 'tax_invoice' : DS_ATELIER_INVOICE_KIND_DEVELOPMENT;
    $notices = [
        'This document copies persisted checkout totals. It does not recalculate catalog prices.',
    ];
    if ($kind === DS_ATELIER_INVOICE_KIND_DEVELOPMENT) {
        $notices[] = 'Development/test invoice. Seller GST registration and legal invoice policy are not configured.';
    }
    if ((string) $order['tax_source'] === 'unconfigured' || (string) $order['shipping_source'] === 'development_demo') {
        $notices[] = 'Recorded shipping or tax values may be development demo amounts, not a confirmed production policy.';
    }
    if ((string) $order['payment_status'] === DS_ATELIER_PAYMENT_STATUS_PENDING) {
        $notices[] = 'Payment has not been collected. This is not a paid invoice.';
    }

    $lineItems = [];
    foreach ($items as $item) {
        $lineItems[] = [
            'productName' => (string) $item['product_name'],
            'sku' => (string) $item['sku'],
            'description' => trim(
                (string) $item['product_name'] . ' / ' . (string) $item['colour_name'] . ' / ' . (string) $item['size_code']
            ),
            'quantity' => (int) $item['quantity'],
            'unitPrice' => ds_atelier_money_format(ds_atelier_money_paise($item['unit_price'])),
            'linePrice' => ds_atelier_money_format(ds_atelier_money_paise($item['line_price'])),
        ];
    }

    return [
        'kind' => $kind,
        'currency' => (string) $order['currency'],
        'orderRef' => (string) $order['public_ref'],
        'orderCreatedAt' => (string) $order['created_at'],
        'paymentStatus' => (string) $order['payment_status'],
        'orderStatus' => (string) $order['status'],
        'paymentMethod' => (string) $order['payment_method'],
        'seller' => [
            'policy' => $settings['seller']['policy'],
            'legalName' => $sellerConfigured ? $settings['seller']['legal_name'] : 'DS ATELIER (development)',
            'gstin' => $sellerConfigured ? $settings['seller']['gstin'] : null,
            'address' => $sellerConfigured ? $settings['seller']['address'] : null,
        ],
        'buyer' => [
            'name' => (string) $order['billing_name'],
            'phone' => (string) $order['billing_phone'],
            'email' => (string) $order['contact_email'],
            'line1' => (string) $order['billing_line1'],
            'line2' => $order['billing_line2'],
            'city' => (string) $order['billing_city'],
            'state' => (string) $order['billing_state'],
            'pincode' => (string) $order['billing_pincode'],
            'country' => (string) $order['billing_country'],
        ],
        'totals' => [
            'itemSubtotal' => ds_atelier_money_format(ds_atelier_money_paise($order['item_subtotal'])),
            'discountTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['discount_total'])),
            'shippingTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['shipping_total'])),
            'taxTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['tax_total'])),
            'grandTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['grand_total'])),
            'coupon' => $order['coupon_code'],
        ],
        'items' => $lineItems,
        'notices' => $notices,
    ];
}

function ds_atelier_invoice_public(?array $invoice): ?array
{
    if ($invoice === null) {
        return null;
    }
    return [
        'number' => (string) $invoice['public_number'],
        'status' => (string) $invoice['status'],
        'kind' => (string) $invoice['document_kind'],
        'issuedAt' => (string) $invoice['issued_at'],
        'downloadPath' => 'backend/public/customer/invoice-download.php?number=' . rawurlencode((string) $invoice['public_number']),
    ];
}

function ds_atelier_invoice_issue(PDO $pdo, array $config, array $order, array $items): array
{
    if (!ds_atelier_invoice_tables_exist($pdo)) {
        return ['ok' => false, 'error' => 'Invoices are not available.', 'code' => 503];
    }
    $existing = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
    if ($existing !== null) {
        return ['ok' => true, 'invoice' => $existing, 'replayed' => true, 'code' => 200];
    }

    $snapshot = ds_atelier_invoice_snapshot($config, $order, $items);
    $number = ds_atelier_invoice_public_number((string) $order['public_ref']);
    $encoded = json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || $encoded === '') {
        return ['ok' => false, 'error' => 'Unable to issue this invoice.', 'code' => 500];
    }

    try {
        $pdo->prepare(
            'INSERT INTO invoices (
                order_id, public_number, status, document_kind, currency,
                item_subtotal, discount_total, shipping_total, tax_total, grand_total, snapshot_json
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            (int) $order['id'],
            $number,
            DS_ATELIER_INVOICE_STATUS_ISSUED,
            (string) $snapshot['kind'],
            (string) $order['currency'],
            ds_atelier_money_format(ds_atelier_money_paise($order['item_subtotal'])),
            ds_atelier_money_format(ds_atelier_money_paise($order['discount_total'])),
            ds_atelier_money_format(ds_atelier_money_paise($order['shipping_total'])),
            ds_atelier_money_format(ds_atelier_money_paise($order['tax_total'])),
            ds_atelier_money_format(ds_atelier_money_paise($order['grand_total'])),
            $encoded,
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            $replay = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
            if ($replay !== null) {
                return ['ok' => true, 'invoice' => $replay, 'replayed' => true, 'code' => 200];
            }
        }
        throw $e;
    }

    $created = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
    if ($created === null) {
        return ['ok' => false, 'error' => 'Unable to issue this invoice.', 'code' => 500];
    }
    return ['ok' => true, 'invoice' => $created, 'replayed' => false, 'code' => 200];
}

function ds_atelier_invoice_ensure_for_order(PDO $pdo, array $config, array $order): array
{
    $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
    return ds_atelier_invoice_issue($pdo, $config, $order, $items);
}

function ds_atelier_invoice_owned_payload(PDO $pdo, array $config, array $input): array
{
    $number = ds_atelier_invoice_parse_number($input['number'] ?? $input['id'] ?? '');
    $ref = ds_atelier_checkout_parse_ref($input['ref'] ?? $input['orderRef'] ?? '');
    if ($number === '' && $ref === '') {
        return ['ok' => false, 'error' => 'Invoice not found.', 'code' => 404];
    }

    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $invoice = null;
    $order = null;
    if ($number !== '') {
        $invoice = ds_atelier_invoice_find_by_number($pdo, $number);
        if ($invoice !== null) {
            $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
            $stmt->execute([(int) $invoice['order_id']]);
            $order = $stmt->fetch() ?: null;
        }
    } elseif ($ref !== '') {
        $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
        if ($order !== null) {
            $invoice = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
        }
    }

    if ($invoice === null || $order === null || !ds_atelier_checkout_order_owned($order, $actor)) {
        return ['ok' => false, 'error' => 'Invoice not found.', 'code' => 404];
    }

    $snapshot = json_decode((string) $invoice['snapshot_json'], true);
    if (!is_array($snapshot)) {
        return ['ok' => false, 'error' => 'Invoice not found.', 'code' => 404];
    }

    return [
        'ok' => true,
        'invoice' => array_merge(ds_atelier_invoice_public($invoice) ?? [], [
            'snapshot' => $snapshot,
            'orderRef' => (string) $order['public_ref'],
        ]),
        'order' => $order,
        'code' => 200,
    ];
}

function ds_atelier_invoice_html(array $invoice, array $snapshot): string
{
    $esc = static fn (mixed $value): string => htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $number = $esc($invoice['public_number'] ?? '');
    $issued = $esc($invoice['issued_at'] ?? '');
    $kind = $esc($invoice['document_kind'] ?? '');
    $seller = is_array($snapshot['seller'] ?? null) ? $snapshot['seller'] : [];
    $buyer = is_array($snapshot['buyer'] ?? null) ? $snapshot['buyer'] : [];
    $totals = is_array($snapshot['totals'] ?? null) ? $snapshot['totals'] : [];
    $items = is_array($snapshot['items'] ?? null) ? $snapshot['items'] : [];
    $notices = is_array($snapshot['notices'] ?? null) ? $snapshot['notices'] : [];

    $rows = '';
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $rows .= '<tr>'
            . '<td>' . $esc($item['description'] ?? $item['productName'] ?? '') . '</td>'
            . '<td>' . $esc($item['sku'] ?? '') . '</td>'
            . '<td>' . $esc((string) ($item['quantity'] ?? '')) . '</td>'
            . '<td>' . $esc($item['unitPrice'] ?? '') . '</td>'
            . '<td>' . $esc($item['linePrice'] ?? '') . '</td>'
            . '</tr>';
    }
    $noticeHtml = '';
    foreach ($notices as $notice) {
        $noticeHtml .= '<li>' . $esc($notice) . '</li>';
    }

    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
        . '<title>' . $number . '</title>'
        . '<style>body{font-family:Arial,sans-serif;color:#111;margin:24px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1{margin:0 0 8px}</style>'
        . '</head><body>'
        . '<h1>DS ATELIER invoice</h1>'
        . '<p><strong>Number:</strong> ' . $number . '<br><strong>Issued:</strong> ' . $issued . '<br><strong>Kind:</strong> ' . $kind . '</p>'
        . '<p><strong>Seller:</strong> ' . $esc($seller['legalName'] ?? 'DS ATELIER') . '</p>'
        . '<p><strong>Buyer:</strong> ' . $esc($buyer['name'] ?? '') . '<br>'
        . $esc($buyer['line1'] ?? '') . ' ' . $esc($buyer['city'] ?? '') . ' ' . $esc($buyer['pincode'] ?? '') . '</p>'
        . '<p><strong>Order:</strong> ' . $esc($snapshot['orderRef'] ?? '') . '<br>'
        . '<strong>Payment status:</strong> ' . $esc($snapshot['paymentStatus'] ?? '') . '</p>'
        . '<table><thead><tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Line</th></tr></thead><tbody>'
        . $rows
        . '</tbody></table>'
        . '<p>Subtotal: ' . $esc($totals['itemSubtotal'] ?? '') . '<br>'
        . 'Discount: ' . $esc($totals['discountTotal'] ?? '') . '<br>'
        . 'Shipping: ' . $esc($totals['shippingTotal'] ?? '') . '<br>'
        . 'Tax: ' . $esc($totals['taxTotal'] ?? '') . '<br>'
        . '<strong>Total: ' . $esc($totals['grandTotal'] ?? '') . '</strong></p>'
        . '<ul>' . $noticeHtml . '</ul>'
        . '</body></html>';
}

function ds_atelier_invoice_send_download(array $invoice, array $snapshot): void
{
    $html = ds_atelier_invoice_html($invoice, $snapshot);
    $filename = ds_atelier_invoice_filename((string) $invoice['public_number']);
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo $html;
    exit;
}

function ds_atelier_invoice_purge_orders(PDO $pdo, array $orderIds): void
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === [] || !ds_atelier_invoice_tables_exist($pdo)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $pdo->prepare("DELETE FROM invoices WHERE order_id IN ($placeholders)")->execute($orderIds);
}
