<?php

declare(strict_types=1);

function ds_atelier_mail_esc(mixed $value): string
{
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function ds_atelier_mail_payment_copy(array $payload): string
{
    $status = (string) ($payload['payment_status'] ?? '');
    if ($status === DS_ATELIER_PAYMENT_STATUS_PENDING || !empty($payload['payment_pending'])) {
        return 'Payment has not been collected. This order is pending payment.';
    }
    if ($status === DS_ATELIER_PAYMENT_STATUS_FAILED) {
        return 'Payment for this order failed.';
    }
    if ($status === DS_ATELIER_PAYMENT_STATUS_REFUNDED) {
        return 'This order is marked refunded in the order record.';
    }
    if ($status === DS_ATELIER_PAYMENT_STATUS_PAID) {
        return 'Payment status on file: paid.';
    }
    return 'Payment status on file: ' . $status . '.';
}

function ds_atelier_mail_fulfilment_copy(string $status): string
{
    return match ($status) {
        DS_ATELIER_SHIPMENT_STATUS_PROCESSING => 'Your order is being prepared.',
        DS_ATELIER_SHIPMENT_STATUS_DISPATCHED => 'Your order has been marked dispatched. Tracking details below are only shown when they were stored on the order.',
        DS_ATELIER_SHIPMENT_STATUS_IN_TRANSIT => 'Your order is marked in transit. Stored tracking details are shown when available.',
        DS_ATELIER_SHIPMENT_STATUS_DELIVERED => 'Your order is marked delivered in our records. This is not an independent courier confirmation.',
        DS_ATELIER_SHIPMENT_STATUS_CANCELLED => 'This order has been cancelled.',
        default => 'Fulfilment status: ' . $status . '.',
    };
}

function ds_atelier_mail_brand_wrap(string $title, string $innerHtml, string $innerText): array
{
    $escTitle = ds_atelier_mail_esc($title);
    $html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>' . $escTitle . '</title></head><body style="margin:0;padding:0;background:#F5F2EC;color:#0F1113;font-family:Arial,Helvetica,sans-serif;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EC;padding:24px 0;">'
        . '<tr><td align="center">'
        . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E6E0D6;">'
        . '<tr><td style="background:#0F1113;color:#ffffff;padding:20px 24px;font-size:18px;letter-spacing:0.08em;">DS ATELIER</td></tr>'
        . '<tr><td style="padding:8px 24px 0;color:#FF6A00;font-size:12px;letter-spacing:0.12em;">CREATE. PRINT. WEAR.</td></tr>'
        . '<tr><td style="padding:16px 24px 28px;font-size:15px;line-height:1.55;">' . $innerHtml . '</td></tr>'
        . '<tr><td style="padding:16px 24px;background:#F5F2EC;color:#5b574f;font-size:12px;line-height:1.5;">This is a transactional message from DS ATELIER. Images are not required to read this email.</td></tr>'
        . '</table></td></tr></table></body></html>';
    $text = "DS ATELIER\nCREATE. PRINT. WEAR.\n\n" . trim($innerText) . "\n\nThis is a transactional message from DS ATELIER.";
    return ['html' => $html, 'text' => $text];
}

function ds_atelier_mail_items_html(array $items): string
{
    if ($items === []) {
        return '<p>No line items were stored on this order.</p>';
    }
    $rows = '';
    foreach ($items as $item) {
        $rows .= '<tr>'
            . '<td style="padding:8px 0;border-bottom:1px solid #E6E0D6;">' . ds_atelier_mail_esc($item['name'] ?? '')
            . '<br><span style="color:#5b574f;font-size:12px;">' . ds_atelier_mail_esc($item['sku'] ?? '') . ' '
            . ds_atelier_mail_esc($item['color'] ?? '') . ' ' . ds_atelier_mail_esc($item['size'] ?? '') . '</span></td>'
            . '<td style="padding:8px 0;border-bottom:1px solid #E6E0D6;" align="right">x' . ds_atelier_mail_esc($item['qty'] ?? 0) . '</td>'
            . '<td style="padding:8px 0;border-bottom:1px solid #E6E0D6;" align="right">INR ' . ds_atelier_mail_esc($item['line_price'] ?? '0.00') . '</td>'
            . '</tr>';
    }
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table>';
}

function ds_atelier_mail_items_text(array $items): string
{
    if ($items === []) {
        return 'No line items were stored on this order.';
    }
    $lines = [];
    foreach ($items as $item) {
        $lines[] = sprintf(
            '- %s x%s INR %s',
            (string) ($item['name'] ?? ''),
            (string) ($item['qty'] ?? 0),
            (string) ($item['line_price'] ?? '0.00')
        );
    }
    return implode("\n", $lines);
}

function ds_atelier_mail_render(string $template, array $payload, array $config): array
{
    unset($config);
    return match ($template) {
        'order_placed' => ds_atelier_mail_render_order_placed($payload),
        'payment_captured' => ds_atelier_mail_render_payment_captured($payload),
        'fulfilment_update' => ds_atelier_mail_render_fulfilment($payload),
        'order_cancelled' => ds_atelier_mail_render_cancelled($payload),
        'password_reset' => ds_atelier_mail_render_password_reset($payload),
        default => ['ok' => false, 'error' => 'Unknown email template.'],
    };
}

function ds_atelier_mail_render_order_placed(array $payload): array
{
    $ref = ds_atelier_mail_esc($payload['order_ref'] ?? '');
    $date = ds_atelier_mail_esc($payload['order_date'] ?? '');
    $payment = ds_atelier_mail_esc(ds_atelier_mail_payment_copy($payload));
    $total = ds_atelier_mail_esc($payload['grand_total'] ?? '0.00');
    $orderUrl = (string) ($payload['order_url'] ?? '');
    $invoiceUrl = (string) ($payload['invoice_url'] ?? '');
    $invoiceKind = (string) ($payload['invoice_kind'] ?? '');
    $inner = '<p>We received your order <strong>' . $ref . '</strong> on ' . $date . '.</p>'
        . '<p><strong>' . $payment . '</strong></p>'
        . ds_atelier_mail_items_html(is_array($payload['items'] ?? null) ? $payload['items'] : [])
        . '<p>Order total: INR ' . $total . '</p>';
    if ($invoiceUrl !== '') {
        $inner .= '<p>A development/test invoice is available through your signed-in account or guest session'
            . ($invoiceKind !== '' ? ' (' . ds_atelier_mail_esc($invoiceKind) . ').' : '.')
            . ' Open: ' . ds_atelier_mail_esc($invoiceUrl) . '</p>';
    }
    if ($orderUrl !== '') {
        $inner .= '<p>Order details: ' . ds_atelier_mail_esc($orderUrl) . '</p>';
    }
    $inner .= '<p>This message does not confirm payment capture.</p>';
    $text = "We received your order {$payload['order_ref']} on {$payload['order_date']}.\n"
        . ds_atelier_mail_payment_copy($payload) . "\n"
        . ds_atelier_mail_items_text(is_array($payload['items'] ?? null) ? $payload['items'] : []) . "\n"
        . 'Order total: INR ' . ($payload['grand_total'] ?? '0.00') . "\n"
        . 'This message does not confirm payment capture.';
    $wrapped = ds_atelier_mail_brand_wrap('Order received — pending payment', $inner, $text);
    return [
        'ok' => true,
        'subject' => 'DS ATELIER order ' . (string) ($payload['order_ref'] ?? '') . ' received — pending payment',
        'html' => $wrapped['html'],
        'text' => $wrapped['text'],
    ];
}

function ds_atelier_mail_render_fulfilment(array $payload): array
{
    $ref = ds_atelier_mail_esc($payload['order_ref'] ?? '');
    $status = (string) ($payload['fulfilment_status'] ?? '');
    $copy = ds_atelier_mail_esc(ds_atelier_mail_fulfilment_copy($status));
    $payment = ds_atelier_mail_esc(ds_atelier_mail_payment_copy($payload));
    $inner = '<p>Update for order <strong>' . $ref . '</strong>.</p><p>' . $copy . '</p><p>' . $payment . '</p>';
    $courier = (string) ($payload['courier_name'] ?? '');
    $trackingNumber = (string) ($payload['tracking_number'] ?? '');
    $trackingUrl = (string) ($payload['tracking_url'] ?? '');
    if ($courier !== '' && $trackingNumber !== '') {
        $inner .= '<p>Courier: ' . ds_atelier_mail_esc($courier) . '<br>Tracking number: ' . ds_atelier_mail_esc($trackingNumber) . '</p>';
        if ($trackingUrl !== '') {
            $inner .= '<p>Tracking URL: ' . ds_atelier_mail_esc($trackingUrl) . '</p>';
        }
        $inner .= '<p>A stored tracking URL is not proof of delivery.</p>';
    }
    $orderUrl = (string) ($payload['order_url'] ?? '');
    if ($orderUrl !== '') {
        $inner .= '<p>Order details: ' . ds_atelier_mail_esc($orderUrl) . '</p>';
    }
    $text = "Update for order {$payload['order_ref']}.\n"
        . ds_atelier_mail_fulfilment_copy($status) . "\n"
        . ds_atelier_mail_payment_copy($payload);
    if ($courier !== '' && $trackingNumber !== '') {
        $text .= "\nCourier: {$courier}\nTracking number: {$trackingNumber}";
        if ($trackingUrl !== '') {
            $text .= "\nTracking URL: {$trackingUrl}";
        }
        $text .= "\nA stored tracking URL is not proof of delivery.";
    }
    $wrapped = ds_atelier_mail_brand_wrap('Order fulfilment update', $inner, $text);
    return [
        'ok' => true,
        'subject' => 'DS ATELIER order ' . (string) ($payload['order_ref'] ?? '') . ' fulfilment update',
        'html' => $wrapped['html'],
        'text' => $wrapped['text'],
    ];
}

function ds_atelier_mail_render_cancelled(array $payload): array
{
    $ref = ds_atelier_mail_esc($payload['order_ref'] ?? '');
    $payment = ds_atelier_mail_esc(ds_atelier_mail_payment_copy($payload));
    $inner = '<p>Order <strong>' . $ref . '</strong> has been cancelled.</p>'
        . '<p>' . $payment . '</p>'
        . '<p>Cancellation is not a refund confirmation unless payment status is refunded on the order record.</p>';
    $text = "Order {$payload['order_ref']} has been cancelled.\n"
        . ds_atelier_mail_payment_copy($payload) . "\n"
        . 'Cancellation is not a refund confirmation unless payment status is refunded on the order record.';
    $wrapped = ds_atelier_mail_brand_wrap('Order cancelled', $inner, $text);
    return [
        'ok' => true,
        'subject' => 'DS ATELIER order ' . (string) ($payload['order_ref'] ?? '') . ' cancelled',
        'html' => $wrapped['html'],
        'text' => $wrapped['text'],
    ];
}

function ds_atelier_mail_render_password_reset(array $payload): array
{
    $url = (string) ($payload['reset_url'] ?? '');
    if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false) {
        return ['ok' => false, 'error' => 'Reset URL is missing.'];
    }
    $minutes = (int) ($payload['expires_minutes'] ?? 60);
    $name = trim((string) ($payload['customer_name'] ?? ''));
    $hello = $name !== '' ? 'Hello ' . ds_atelier_mail_esc($name) . ',' : 'Hello,';
    $inner = '<p>' . $hello . '</p>'
        . '<p>Use this link to choose a new password. It expires in ' . ds_atelier_mail_esc((string) $minutes) . ' minutes and can be used once.</p>'
        . '<p><a href="' . ds_atelier_mail_esc($url) . '">' . ds_atelier_mail_esc($url) . '</a></p>'
        . '<p>If you did not request this, you can ignore this email.</p>';
    $text = ($name !== '' ? "Hello {$name},\n" : "Hello,\n")
        . "Use this link to choose a new password. It expires in {$minutes} minutes and can be used once.\n"
        . $url . "\nIf you did not request this, you can ignore this email.";
    $wrapped = ds_atelier_mail_brand_wrap('Password reset', $inner, $text);
    return [
        'ok' => true,
        'subject' => 'DS ATELIER password reset',
        'html' => $wrapped['html'],
        'text' => $wrapped['text'],
    ];
}
