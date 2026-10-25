<?php

declare(strict_types=1);

const DS_ATELIER_ORDER_STATUS_PENDING_PAYMENT = 'pending_payment';
const DS_ATELIER_ORDER_STATUS_PENDING = 'pending';
const DS_ATELIER_ORDER_STATUS_PROCESSING = 'processing';
const DS_ATELIER_ORDER_STATUS_SHIPPED = 'shipped';
const DS_ATELIER_ORDER_STATUS_DELIVERED = 'delivered';
const DS_ATELIER_ORDER_STATUS_CANCELLED = 'cancelled';
const DS_ATELIER_PAYMENT_STATUS_PENDING = 'pending';
const DS_ATELIER_PAYMENT_STATUS_PAID = 'paid';
const DS_ATELIER_PAYMENT_STATUS_FAILED = 'failed';
const DS_ATELIER_PAYMENT_STATUS_REFUNDED = 'refunded';
const DS_ATELIER_CHECKOUT_COUNTRY = 'India';
const DS_ATELIER_CHECKOUT_CURRENCY = 'INR';
const DS_ATELIER_ORDERS_PAGE_DEFAULT = 1;
const DS_ATELIER_ORDERS_PER_PAGE_DEFAULT = 20;
const DS_ATELIER_ORDERS_PER_PAGE_MAX = 50;
const DS_ATELIER_ORDER_STATUSES = [
    DS_ATELIER_ORDER_STATUS_PENDING_PAYMENT,
    DS_ATELIER_ORDER_STATUS_PENDING,
    DS_ATELIER_ORDER_STATUS_PROCESSING,
    DS_ATELIER_ORDER_STATUS_SHIPPED,
    DS_ATELIER_ORDER_STATUS_DELIVERED,
    DS_ATELIER_ORDER_STATUS_CANCELLED,
];
const DS_ATELIER_PAYMENT_STATUSES = [
    DS_ATELIER_PAYMENT_STATUS_PENDING,
    DS_ATELIER_PAYMENT_STATUS_PAID,
    DS_ATELIER_PAYMENT_STATUS_FAILED,
    DS_ATELIER_PAYMENT_STATUS_REFUNDED,
];

function ds_atelier_checkout_settings(array $config): array
{
    $path = $config['paths']['root'] . '/config/checkout.php';
    $file = is_file($path) ? require $path : [];
    if (!is_array($file)) {
        $file = [];
    }
    $shipping = is_array($file['shipping'] ?? null) ? $file['shipping'] : [];
    $tax = is_array($file['tax'] ?? null) ? $file['tax'] : [];
    $discounts = is_array($file['discounts'] ?? null) ? $file['discounts'] : [];
    $codes = is_array($discounts['codes'] ?? null) ? $discounts['codes'] : [];

    return [
        'currency' => strtoupper((string) ($file['currency'] ?? DS_ATELIER_CHECKOUT_CURRENCY)),
        'country' => (string) ($file['country'] ?? DS_ATELIER_CHECKOUT_COUNTRY),
        'rounding' => (string) ($file['rounding'] ?? 'half_up_paise'),
        'payment_methods' => array_values(array_filter(
            is_array($file['payment_methods'] ?? null) ? $file['payment_methods'] : ['UPI', 'Razorpay', 'Card'],
            static fn ($method): bool => is_string($method) && $method !== ''
        )),
        'shipping' => [
            'policy' => (string) ($shipping['policy'] ?? 'unconfigured'),
            'flat_fee' => (string) ($shipping['flat_fee'] ?? '0.00'),
            'free_subtotal_threshold' => (string) ($shipping['free_subtotal_threshold'] ?? '0.00'),
            'label' => (string) ($shipping['label'] ?? 'Shipping'),
        ],
        'tax' => [
            'policy' => (string) ($tax['policy'] ?? 'unconfigured'),
            'rate' => (string) ($tax['rate'] ?? '0.00'),
            'label' => (string) ($tax['label'] ?? 'Tax'),
        ],
        'discounts' => [
            'policy' => (string) ($discounts['policy'] ?? 'unconfigured'),
            'codes' => $codes,
        ],
    ];
}

function ds_atelier_money_paise(mixed $value): int
{
    if (is_int($value)) {
        return $value;
    }
    if (is_float($value)) {
        return (int) round($value * 100, 0, PHP_ROUND_HALF_UP);
    }
    $raw = trim((string) $value);
    if ($raw === '' || !preg_match('/^-?\d+(?:\.\d{1,2})?$/', $raw)) {
        return (int) round((float) $raw * 100, 0, PHP_ROUND_HALF_UP);
    }
    $negative = str_starts_with($raw, '-');
    $raw = ltrim($raw, '+-');
    $parts = explode('.', $raw, 2);
    $rupees = (int) ($parts[0] === '' ? '0' : $parts[0]);
    $fraction = str_pad(substr($parts[1] ?? '00', 0, 2), 2, '0');
    $paise = ($rupees * 100) + (int) $fraction;
    return $negative ? -$paise : $paise;
}

function ds_atelier_money_format(int $paise): string
{
    $sign = $paise < 0 ? '-' : '';
    $paise = abs($paise);
    return $sign . sprintf('%d.%02d', intdiv($paise, 100), $paise % 100);
}

function ds_atelier_checkout_percent_paise(int $basePaise, string $percent): int
{
    $ratePaise = ds_atelier_money_paise($percent);
    return (int) intdiv($basePaise * $ratePaise + 5000, 10000);
}

function ds_atelier_checkout_normalize_text(mixed $value, int $max, bool $required = true): array
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    if ($text === '') {
        return ['ok' => !$required, 'value' => '', 'error' => $required ? 'This field is required.' : null];
    }
    if (mb_strlen($text) > $max) {
        return ['ok' => false, 'value' => $text, 'error' => 'This value is too long.'];
    }
    return ['ok' => true, 'value' => $text, 'error' => null];
}

function ds_atelier_checkout_parse_address(array $input, string $label): array
{
    $fields = [];
    $name = ds_atelier_checkout_normalize_text($input['name'] ?? '', 120);
    if ($name['ok'] !== true || !ds_atelier_valid_name($name['value'])) {
        $fields['name'] = 'Enter a full name.';
    }
    $phone = ds_atelier_normalize_mobile((string) ($input['phone'] ?? $input['mobile'] ?? ''));
    if (!ds_atelier_valid_mobile($phone)) {
        $fields['phone'] = 'Enter a valid 10-digit mobile number.';
    }
    $line1 = ds_atelier_checkout_normalize_text($input['line1'] ?? '', 160);
    if ($line1['ok'] !== true) {
        $fields['line1'] = 'Enter address line 1.';
    }
    $line2 = ds_atelier_checkout_normalize_text($input['line2'] ?? '', 160, false);
    if ($line2['ok'] !== true) {
        $fields['line2'] = 'Address line 2 is too long.';
    }
    $city = ds_atelier_checkout_normalize_text($input['city'] ?? '', 80);
    if ($city['ok'] !== true) {
        $fields['city'] = 'Enter a city.';
    }
    $state = ds_atelier_checkout_normalize_text($input['state'] ?? '', 80);
    if ($state['ok'] !== true) {
        $fields['state'] = 'Enter a state.';
    }
    $pincode = preg_replace('/\D+/', '', (string) ($input['pincode'] ?? '')) ?? '';
    if (!preg_match('/^\d{6}$/', $pincode)) {
        $fields['pincode'] = 'Enter a 6-digit PIN code.';
    }
    $country = trim((string) ($input['country'] ?? DS_ATELIER_CHECKOUT_COUNTRY));
    if ($country === '') {
        $country = DS_ATELIER_CHECKOUT_COUNTRY;
    }
    if (strcasecmp($country, DS_ATELIER_CHECKOUT_COUNTRY) !== 0) {
        $fields['country'] = 'Delivery is currently available in India only.';
    }

    if ($fields !== []) {
        return [
            'ok' => false,
            'error' => 'Check the ' . $label . ' address and try again.',
            'fields' => $fields,
            'code' => 422,
        ];
    }

    return [
        'ok' => true,
        'address' => [
            'name' => $name['value'],
            'phone' => $phone,
            'line1' => $line1['value'],
            'line2' => $line2['value'] !== '' ? $line2['value'] : null,
            'city' => $city['value'],
            'state' => $state['value'],
            'pincode' => $pincode,
            'country' => DS_ATELIER_CHECKOUT_COUNTRY,
        ],
    ];
}

function ds_atelier_checkout_parse_contact(array $input, ?array $customer, array $shipping): array
{
    $nameRaw = trim((string) ($input['name'] ?? ''));
    $emailRaw = trim((string) ($input['email'] ?? ''));
    $mobileRaw = (string) ($input['mobile'] ?? $input['phone'] ?? '');
    if ($nameRaw === '') {
        $nameRaw = $shipping['name'];
    }
    if ($emailRaw === '' && $customer !== null) {
        $emailRaw = (string) ($customer['email'] ?? '');
    }
    if ($mobileRaw === '') {
        $mobileRaw = $shipping['phone'];
    }

    $fields = [];
    $name = ds_atelier_checkout_normalize_text($nameRaw, 120);
    if ($name['ok'] !== true || !ds_atelier_valid_name($name['value'])) {
        $fields['name'] = 'Enter your full name.';
    }
    $email = ds_atelier_normalize_email($emailRaw);
    if (!ds_atelier_valid_email($email)) {
        $fields['email'] = 'Enter a valid email address.';
    }
    $mobile = ds_atelier_normalize_mobile($mobileRaw);
    if (!ds_atelier_valid_mobile($mobile)) {
        $fields['mobile'] = 'Enter a valid 10-digit mobile number.';
    }
    if ($fields !== []) {
        return [
            'ok' => false,
            'error' => 'Check your contact details and try again.',
            'fields' => $fields,
            'code' => 422,
        ];
    }
    return [
        'ok' => true,
        'contact' => [
            'name' => $name['value'],
            'email' => $email,
            'mobile' => $mobile,
        ],
    ];
}

function ds_atelier_checkout_parse_coupon(mixed $value): string
{
    $code = strtoupper(trim((string) $value));
    if ($code === '' || strlen($code) > 40 || !preg_match('/^[A-Z0-9][A-Z0-9_-]{0,39}$/', $code)) {
        return '';
    }
    return $code;
}

function ds_atelier_checkout_parse_idempotency(mixed $value): string
{
    $key = trim((string) $value);
    if ($key === '') {
        return '';
    }
    if (strlen($key) < 16 || strlen($key) > 80 || !preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{15,79}$/', $key)) {
        return '';
    }
    return $key;
}

function ds_atelier_checkout_public_ref(): string
{
    return 'DSA-' . strtoupper(bin2hex(random_bytes(12)));
}

function ds_atelier_checkout_cart_items(PDO $pdo, array $config, bool $createGuest): array
{
    $actor = ds_atelier_commerce_actor($pdo, $config, $createGuest);
    $cart = ds_atelier_cart_find($pdo, $actor, false);
    $items = $cart !== null ? ds_atelier_cart_fetch_items($pdo, (int) $cart['id']) : [];
    return [
        'actor' => $actor,
        'cart' => $cart,
        'items' => $items,
    ];
}

function ds_atelier_checkout_blocked_items(array $items): array
{
    $blocked = [];
    foreach ($items as $item) {
        if (($item['purchasable'] ?? false) !== true || ($item['issues'] ?? []) !== []) {
            $blocked[] = [
                'itemId' => $item['itemId'] ?? null,
                'productId' => $item['id'] ?? '',
                'issues' => $item['issues'] ?? ['unavailable'],
            ];
        }
    }
    return $blocked;
}

function ds_atelier_checkout_discount(array $settings, string $coupon, int $itemSubtotalPaise): array
{
    if ($coupon === '') {
        return ['ok' => true, 'coupon' => null, 'discount' => 0, 'source' => $settings['discounts']['policy']];
    }
    $policy = $settings['discounts']['policy'];
    $codes = $settings['discounts']['codes'];
    if ($policy === 'unconfigured' || $codes === []) {
        return ['ok' => false, 'error' => 'That coupon is not available.', 'code' => 422];
    }
    if (!isset($codes[$coupon]) || !is_array($codes[$coupon])) {
        return ['ok' => false, 'error' => 'That coupon is not available.', 'code' => 422];
    }
    $rule = $codes[$coupon];
    $type = (string) ($rule['type'] ?? '');
    if ($type !== 'percent') {
        return ['ok' => false, 'error' => 'That coupon is not available.', 'code' => 422];
    }
    $discount = ds_atelier_checkout_percent_paise($itemSubtotalPaise, (string) ($rule['value'] ?? '0'));
    $discount = max(0, min($itemSubtotalPaise, $discount));
    return [
        'ok' => true,
        'coupon' => $coupon,
        'discount' => $discount,
        'source' => $policy,
    ];
}

function ds_atelier_checkout_shipping(array $config, array $settings, int $afterDiscountPaise): array
{
    $policy = $settings['shipping']['policy'];
    if ($policy === 'development_demo') {
        if ($config['env'] === 'production') {
            return ['ok' => false, 'error' => 'Shipping is not configured.', 'code' => 503];
        }
        $threshold = ds_atelier_money_paise($settings['shipping']['free_subtotal_threshold']);
        $fee = ds_atelier_money_paise($settings['shipping']['flat_fee']);
        $amount = ($afterDiscountPaise <= 0 || $afterDiscountPaise >= $threshold) ? 0 : $fee;
        return [
            'ok' => true,
            'amount' => $amount,
            'source' => 'development_demo',
            'label' => $settings['shipping']['label'],
            'notice' => 'Shipping uses development demo rates, not a confirmed production policy.',
        ];
    }
    if ($policy === 'flat') {
        $threshold = ds_atelier_money_paise($settings['shipping']['free_subtotal_threshold']);
        $fee = ds_atelier_money_paise($settings['shipping']['flat_fee']);
        $amount = ($afterDiscountPaise <= 0 || ($threshold > 0 && $afterDiscountPaise >= $threshold)) ? 0 : $fee;
        return [
            'ok' => true,
            'amount' => $amount,
            'source' => 'flat',
            'label' => $settings['shipping']['label'],
            'notice' => null,
        ];
    }
    return ['ok' => false, 'error' => 'Shipping is not configured.', 'code' => 503];
}

function ds_atelier_checkout_tax(array $config, array $settings, int $taxablePaise): array
{
    $policy = $settings['tax']['policy'];
    if ($policy === 'unconfigured') {
        if ($config['env'] === 'production') {
            return ['ok' => false, 'error' => 'Tax is not configured.', 'code' => 503];
        }
        return [
            'ok' => true,
            'amount' => 0,
            'source' => 'unconfigured',
            'label' => $settings['tax']['label'],
            'notice' => 'Tax is not configured. No tax has been added.',
        ];
    }
    if ($policy === 'exclusive_percent') {
        $amount = ds_atelier_checkout_percent_paise(max(0, $taxablePaise), $settings['tax']['rate']);
        return [
            'ok' => true,
            'amount' => $amount,
            'source' => 'exclusive_percent',
            'label' => $settings['tax']['label'],
            'notice' => null,
        ];
    }
    return ['ok' => false, 'error' => 'Tax is not configured.', 'code' => 503];
}

function ds_atelier_checkout_quote_from_items(array $config, array $items, string $coupon): array
{
    if ($items === []) {
        return ['ok' => false, 'error' => 'Your cart is empty.', 'code' => 422];
    }
    $blocked = ds_atelier_checkout_blocked_items($items);
    if ($blocked !== []) {
        return [
            'ok' => false,
            'error' => 'Some items are no longer available. Update your cart before checkout.',
            'code' => 409,
            'unavailable' => $blocked,
        ];
    }

    $settings = ds_atelier_checkout_settings($config);
    $itemSubtotal = 0;
    $itemMrp = 0;
    $mapped = [];
    foreach ($items as $item) {
        $qty = (int) $item['qty'];
        $unit = ds_atelier_money_paise($item['unitPrice'] ?? $item['price']);
        $mrp = ds_atelier_money_paise($item['unitMrp'] ?? $item['mrp']);
        $line = $unit * $qty;
        $lineMrp = $mrp * $qty;
        $itemSubtotal += $line;
        $itemMrp += $lineMrp;
        $mapped[] = [
            'itemId' => (int) $item['itemId'],
            'id' => (string) $item['id'],
            'name' => (string) $item['name'],
            'image' => (string) ($item['image'] ?? ''),
            'alt' => (string) ($item['alt'] ?? $item['name']),
            'sku' => (string) $item['sku'],
            'color' => (string) $item['color'],
            'size' => (string) $item['size'],
            'printType' => (string) $item['printType'],
            'printPosition' => (string) $item['printPosition'],
            'artworkId' => (string) ($item['artworkId'] ?? ''),
            'artworkName' => $item['artworkName'] ?? null,
            'qty' => $qty,
            'unitPrice' => ds_atelier_money_format($unit),
            'unitMrp' => ds_atelier_money_format($mrp),
            'linePrice' => ds_atelier_money_format($line),
            'lineMrp' => ds_atelier_money_format($lineMrp),
        ];
    }

    $discount = ds_atelier_checkout_discount($settings, $coupon, $itemSubtotal);
    if ($discount['ok'] !== true) {
        return $discount;
    }
    $afterDiscount = $itemSubtotal - $discount['discount'];
    $shipping = ds_atelier_checkout_shipping($config, $settings, $afterDiscount);
    if ($shipping['ok'] !== true) {
        return $shipping;
    }
    $tax = ds_atelier_checkout_tax($config, $settings, $afterDiscount);
    if ($tax['ok'] !== true) {
        return $tax;
    }
    $grand = $afterDiscount + $shipping['amount'] + $tax['amount'];
    $notices = array_values(array_filter([
        $shipping['notice'] ?? null,
        $tax['notice'] ?? null,
        $discount['source'] === 'development_demo' && $discount['coupon'] !== null
            ? 'WELCOME10 is a development demo coupon, not a confirmed production promotion.'
            : null,
    ]));

    return [
        'ok' => true,
        'quote' => [
            'currency' => $settings['currency'],
            'items' => $mapped,
            'itemSubtotal' => ds_atelier_money_format($itemSubtotal),
            'itemMrp' => ds_atelier_money_format($itemMrp),
            'discountTotal' => ds_atelier_money_format($discount['discount']),
            'shippingTotal' => ds_atelier_money_format($shipping['amount']),
            'taxTotal' => ds_atelier_money_format($tax['amount']),
            'grandTotal' => ds_atelier_money_format($grand),
            'coupon' => $discount['coupon'],
            'shipping' => [
                'source' => $shipping['source'],
                'label' => $shipping['label'],
                'amount' => ds_atelier_money_format($shipping['amount']),
            ],
            'tax' => [
                'source' => $tax['source'],
                'label' => $tax['label'],
                'amount' => ds_atelier_money_format($tax['amount']),
            ],
            'notices' => $notices,
        ],
        'totals_paise' => [
            'item_subtotal' => $itemSubtotal,
            'discount' => $discount['discount'],
            'shipping' => $shipping['amount'],
            'tax' => $tax['amount'],
            'grand' => $grand,
        ],
        'code' => 200,
    ];
}

function ds_atelier_checkout_quote(PDO $pdo, array $config, array $input): array
{
    $loaded = ds_atelier_checkout_cart_items($pdo, $config, false);
    $coupon = ds_atelier_checkout_parse_coupon($input['coupon'] ?? '');
    $quoted = ds_atelier_checkout_quote_from_items($config, $loaded['items'], $coupon);
    if (($quoted['ok'] ?? false) !== true) {
        return $quoted;
    }
    $quoted['cart'] = ds_atelier_cart_payload($loaded['cart'], $loaded['items'], $loaded['actor']['type']);
    unset($quoted['totals_paise']);
    return $quoted;
}

function ds_atelier_checkout_order_public(array $order, array $items, ?array $shipment = null, ?array $invoice = null): array
{
    $shipping = [
        'name' => (string) $order['shipping_name'],
        'phone' => (string) $order['shipping_phone'],
        'line1' => (string) $order['shipping_line1'],
        'line2' => $order['shipping_line2'],
        'city' => (string) $order['shipping_city'],
        'state' => (string) $order['shipping_state'],
        'pincode' => (string) $order['shipping_pincode'],
        'country' => (string) $order['shipping_country'],
    ];
    $created = (string) $order['created_at'];
    $timestamp = strtotime($created) ?: time();
    $payload = [
        'id' => (string) $order['public_ref'],
        'ref' => (string) $order['public_ref'],
        'status' => (string) $order['status'],
        'paymentStatus' => (string) $order['payment_status'],
        'paymentMethod' => (string) $order['payment_method'],
        'currency' => (string) $order['currency'],
        'itemSubtotal' => ds_atelier_money_format(ds_atelier_money_paise($order['item_subtotal'])),
        'discountTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['discount_total'])),
        'shippingTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['shipping_total'])),
        'taxTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['tax_total'])),
        'grandTotal' => ds_atelier_money_format(ds_atelier_money_paise($order['grand_total'])),
        'coupon' => $order['coupon_code'],
        'contact' => [
            'name' => (string) $order['contact_name'],
            'email' => (string) $order['contact_email'],
            'mobile' => (string) $order['contact_mobile'],
        ],
        'shipping' => $shipping,
        'billingSame' => (int) $order['billing_same'] === 1,
        'createdAt' => $created,
        'date' => date('j M Y', $timestamp),
        'notices' => ds_atelier_checkout_order_notices($order),
        'items' => array_map(static function (array $item): array {
            return [
                'productId' => (string) $item['product_slug'],
                'name' => (string) $item['product_name'],
                'sku' => (string) $item['sku'],
                'color' => (string) $item['colour_name'],
                'size' => (string) $item['size_code'],
                'printType' => (string) $item['print_type'],
                'printPosition' => (string) $item['print_position'],
                'artworkId' => (string) $item['artwork_id'],
                'artworkName' => $item['artwork_name'],
                'qty' => (int) $item['quantity'],
                'unitPrice' => ds_atelier_money_format(ds_atelier_money_paise($item['unit_price'])),
                'linePrice' => ds_atelier_money_format(ds_atelier_money_paise($item['line_price'])),
            ];
        }, $items),
    ];
    $payload['fulfilment'] = ds_atelier_fulfilment_public($shipment);
    $payload['invoice'] = ds_atelier_invoice_public($invoice);
    return $payload;
}

function ds_atelier_checkout_find_order_by_ref(PDO $pdo, string $ref): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE public_ref = ? LIMIT 1');
    $stmt->execute([$ref]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_checkout_find_order_by_idempotency(PDO $pdo, string $key): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE idempotency_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ds_atelier_checkout_order_owned(array $order, array $actor): bool
{
    if ($actor['type'] === 'customer') {
        return (int) ($order['customer_id'] ?? 0) === (int) $actor['customer_id'];
    }
    if ($actor['type'] === 'guest' && is_string($actor['guest_hash'])) {
        return hash_equals((string) ($order['guest_token_hash'] ?? ''), $actor['guest_hash']);
    }
    return false;
}

function ds_atelier_checkout_order_items(PDO $pdo, int $orderId): array
{
    $stmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
    $stmt->execute([$orderId]);
    return $stmt->fetchAll() ?: [];
}

function ds_atelier_checkout_order_notices(array $order): array
{
    $payment = (string) ($order['payment_status'] ?? '');
    if ($payment === DS_ATELIER_PAYMENT_STATUS_PENDING) {
        return ['Payment has not been collected. This order is pending payment.'];
    }
    if ($payment === DS_ATELIER_PAYMENT_STATUS_FAILED) {
        return ['Payment was not completed for this order.'];
    }
    if ($payment === DS_ATELIER_PAYMENT_STATUS_REFUNDED) {
        return ['This order has been refunded.'];
    }
    return [];
}

function ds_atelier_checkout_parse_ref(mixed $value): string
{
    $ref = strtoupper(trim((string) $value));
    if (!preg_match('/^DSA-[A-F0-9]{24}$/', $ref)) {
        return '';
    }
    return $ref;
}

function ds_atelier_checkout_parse_page(mixed $value): int
{
    if (is_array($value) || !preg_match('/^[0-9]+$/', (string) $value)) {
        return DS_ATELIER_ORDERS_PAGE_DEFAULT;
    }
    $page = (int) $value;
    return $page < 1 ? DS_ATELIER_ORDERS_PAGE_DEFAULT : $page;
}

function ds_atelier_checkout_parse_per_page(mixed $value): int
{
    if ($value === null || $value === '') {
        return DS_ATELIER_ORDERS_PER_PAGE_DEFAULT;
    }
    if (is_array($value) || !preg_match('/^[0-9]+$/', (string) $value)) {
        return DS_ATELIER_ORDERS_PER_PAGE_DEFAULT;
    }
    $perPage = (int) $value;
    if ($perPage < 1) {
        return DS_ATELIER_ORDERS_PER_PAGE_DEFAULT;
    }
    return min($perPage, DS_ATELIER_ORDERS_PER_PAGE_MAX);
}

function ds_atelier_checkout_actor_filter(array $actor): ?array
{
    if ($actor['type'] === 'customer' && (int) ($actor['customer_id'] ?? 0) > 0) {
        return ['sql' => 'customer_id = ?', 'value' => (int) $actor['customer_id']];
    }
    if ($actor['type'] === 'guest' && is_string($actor['guest_hash']) && $actor['guest_hash'] !== '') {
        return ['sql' => 'guest_token_hash = ?', 'value' => $actor['guest_hash']];
    }
    return null;
}

function ds_atelier_checkout_claim_guest_orders(PDO $pdo, int $customerId, string $guestHash): void
{
    if ($customerId < 1 || $guestHash === '') {
        return;
    }
    $pdo->prepare(
        'UPDATE orders
         SET customer_id = ?, guest_token_hash = NULL
         WHERE guest_token_hash = ? AND customer_id IS NULL'
    )->execute([$customerId, $guestHash]);
}

function ds_atelier_checkout_list_orders(PDO $pdo, array $config, array $input): array
{
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $filter = ds_atelier_checkout_actor_filter($actor);
    $pageRequested = ds_atelier_checkout_parse_page($input['page'] ?? DS_ATELIER_ORDERS_PAGE_DEFAULT);
    $perPage = ds_atelier_checkout_parse_per_page($input['per_page'] ?? DS_ATELIER_ORDERS_PER_PAGE_DEFAULT);
    if ($filter === null) {
        return [
            'ok' => true,
            'orders' => [],
            'meta' => [
                'page' => 1,
                'per_page' => $perPage,
                'total' => 0,
                'total_pages' => 1,
            ],
            'code' => 200,
        ];
    }

    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE ' . $filter['sql']);
    $countStmt->execute([$filter['value']]);
    $total = (int) $countStmt->fetchColumn();
    $totalPages = $total > 0 ? (int) ceil($total / $perPage) : 1;
    $page = min($pageRequested, $totalPages);
    $offset = ($page - 1) * $perPage;

    $listStmt = $pdo->prepare(
        'SELECT * FROM orders WHERE ' . $filter['sql'] . ' ORDER BY created_at DESC, id DESC LIMIT ' . (int) $perPage . ' OFFSET ' . (int) $offset
    );
    $listStmt->execute([$filter['value']]);
    $rows = $listStmt->fetchAll() ?: [];
    $orderIds = array_map(static fn (array $row): int => (int) $row['id'], $rows);
    $itemsByOrder = ds_atelier_checkout_order_items_for_ids($pdo, $orderIds);
    $shipments = ds_atelier_fulfilment_map_for_orders($pdo, $orderIds);
    $invoices = ds_atelier_invoice_map_for_orders($pdo, $orderIds);

    $orders = [];
    foreach ($rows as $row) {
        $orderId = (int) $row['id'];
        $orders[] = ds_atelier_checkout_order_public(
            $row,
            $itemsByOrder[$orderId] ?? [],
            $shipments[$orderId] ?? null,
            $invoices[$orderId] ?? null
        );
    }

    return [
        'ok' => true,
        'orders' => $orders,
        'meta' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => $totalPages,
        ],
        'code' => 200,
    ];
}

function ds_atelier_checkout_order_items_for_ids(PDO $pdo, array $orderIds): array
{
    $orderIds = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
    if ($orderIds === []) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare(
        'SELECT * FROM order_items WHERE order_id IN (' . $placeholders . ') ORDER BY order_id ASC, id ASC'
    );
    $stmt->execute($orderIds);
    $grouped = [];
    foreach ($stmt->fetchAll() ?: [] as $item) {
        $grouped[(int) $item['order_id']][] = $item;
    }
    return $grouped;
}

function ds_atelier_checkout_get_order(PDO $pdo, array $config, array $input): array
{
    $ref = ds_atelier_checkout_parse_ref($input['ref'] ?? $input['id'] ?? '');
    if ($ref === '') {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $actor = ds_atelier_commerce_actor($pdo, $config, false);
    $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    if ($order === null || !ds_atelier_checkout_order_owned($order, $actor)) {
        return ['ok' => false, 'error' => 'Order not found.', 'code' => 404];
    }
    $items = ds_atelier_checkout_order_items($pdo, (int) $order['id']);
    $shipment = ds_atelier_fulfilment_find_by_order($pdo, (int) $order['id']);
    $invoice = ds_atelier_invoice_find_by_order($pdo, (int) $order['id']);
    return [
        'ok' => true,
        'order' => ds_atelier_checkout_order_public($order, $items, $shipment, $invoice),
        'code' => 200,
    ];
}

function ds_atelier_checkout_place(PDO $pdo, array $config, array $input): array
{
    $settings = ds_atelier_checkout_settings($config);
    $paymentMethod = trim((string) ($input['paymentMethod'] ?? $input['payment_method'] ?? ''));
    if (!in_array($paymentMethod, $settings['payment_methods'], true)) {
        return ['ok' => false, 'error' => 'Select a valid payment method.', 'code' => 422];
    }
    if (isset($input['paymentStatus']) || isset($input['payment_status']) || isset($input['status'])) {
        return ['ok' => false, 'error' => 'Payment status cannot be set from checkout.', 'code' => 422];
    }
    if (isset($input['customerId']) || isset($input['customer_id'])) {
        return ['ok' => false, 'error' => 'Customer ownership is determined by the signed-in session.', 'code' => 422];
    }

    $idempotency = ds_atelier_checkout_parse_idempotency($input['idempotencyKey'] ?? $input['idempotency_key'] ?? '');
    if (($input['idempotencyKey'] ?? $input['idempotency_key'] ?? '') !== '' && $idempotency === '') {
        return ['ok' => false, 'error' => 'That checkout request could not be verified. Refresh and try again.', 'code' => 422];
    }

    $shippingParsed = ds_atelier_checkout_parse_address(
        is_array($input['shipping'] ?? null) ? $input['shipping'] : [],
        'shipping'
    );
    if ($shippingParsed['ok'] !== true) {
        return $shippingParsed;
    }
    $billingSame = !isset($input['billingSame']) || $input['billingSame'] === true || $input['billingSame'] === 1 || $input['billingSame'] === '1';
    if ($billingSame) {
        $billingParsed = ['ok' => true, 'address' => $shippingParsed['address']];
    } else {
        $billingParsed = ds_atelier_checkout_parse_address(
            is_array($input['billing'] ?? null) ? $input['billing'] : [],
            'billing'
        );
        if ($billingParsed['ok'] !== true) {
            return $billingParsed;
        }
    }

    $actor = ds_atelier_commerce_actor($pdo, $config, true);
    $customer = $actor['type'] === 'customer' ? ds_atelier_find_customer_by_id($pdo, (int) $actor['customer_id']) : null;
    $contactParsed = ds_atelier_checkout_parse_contact(
        is_array($input['contact'] ?? null) ? $input['contact'] : [],
        $customer,
        $shippingParsed['address']
    );
    if ($contactParsed['ok'] !== true) {
        return $contactParsed;
    }

    if ($idempotency !== '') {
        $existing = ds_atelier_checkout_find_order_by_idempotency($pdo, $idempotency);
        if ($existing !== null) {
            if (!ds_atelier_checkout_order_owned($existing, $actor)) {
                return ['ok' => false, 'error' => 'That checkout request could not be verified. Refresh and try again.', 'code' => 409];
            }
            $existingItems = ds_atelier_checkout_order_items($pdo, (int) $existing['id']);
            $cartState = ds_atelier_cart_get($pdo, $config);
            return [
                'ok' => true,
                'order' => ds_atelier_checkout_order_public(
                    $existing,
                    $existingItems,
                    ds_atelier_fulfilment_find_by_order($pdo, (int) $existing['id']),
                    ds_atelier_invoice_find_by_order($pdo, (int) $existing['id'])
                ),
                'cart' => $cartState['cart'],
                'replayed' => true,
                'code' => 200,
            ];
        }
    }

    $coupon = ds_atelier_checkout_parse_coupon($input['coupon'] ?? '');
    $pdo->beginTransaction();
    try {
        $cart = ds_atelier_cart_find($pdo, $actor, true);
        $items = $cart !== null ? ds_atelier_cart_fetch_items($pdo, (int) $cart['id']) : [];
        $quoted = ds_atelier_checkout_quote_from_items($config, $items, $coupon);
        if (($quoted['ok'] ?? false) !== true) {
            $pdo->rollBack();
            return $quoted;
        }
        $totals = $quoted['totals_paise'];
        $quote = $quoted['quote'];
        $ref = ds_atelier_checkout_public_ref();
        $shipping = $shippingParsed['address'];
        $billing = $billingParsed['address'];
        $contact = $contactParsed['contact'];

        $insert = $pdo->prepare(
            'INSERT INTO orders (
                public_ref, customer_id, guest_token_hash, status, payment_status, payment_method, currency,
                item_subtotal, discount_total, shipping_total, tax_total, grand_total, coupon_code,
                contact_name, contact_email, contact_mobile,
                shipping_name, shipping_phone, shipping_line1, shipping_line2, shipping_city, shipping_state, shipping_pincode, shipping_country,
                billing_same, billing_name, billing_phone, billing_line1, billing_line2, billing_city, billing_state, billing_pincode, billing_country,
                idempotency_key, cart_id, shipping_source, tax_source
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?
            )'
        );
        try {
            $insert->execute([
                $ref,
                $actor['type'] === 'customer' ? $actor['customer_id'] : null,
                $actor['type'] === 'guest' ? $actor['guest_hash'] : null,
                DS_ATELIER_ORDER_STATUS_PENDING_PAYMENT,
                DS_ATELIER_PAYMENT_STATUS_PENDING,
                $paymentMethod,
                $quote['currency'],
                $quote['itemSubtotal'],
                $quote['discountTotal'],
                $quote['shippingTotal'],
                $quote['taxTotal'],
                $quote['grandTotal'],
                $quote['coupon'],
                $contact['name'],
                $contact['email'],
                $contact['mobile'],
                $shipping['name'],
                $shipping['phone'],
                $shipping['line1'],
                $shipping['line2'],
                $shipping['city'],
                $shipping['state'],
                $shipping['pincode'],
                $shipping['country'],
                $billingSame ? 1 : 0,
                $billing['name'],
                $billing['phone'],
                $billing['line1'],
                $billing['line2'],
                $billing['city'],
                $billing['state'],
                $billing['pincode'],
                $billing['country'],
                $idempotency !== '' ? $idempotency : null,
                $cart !== null ? (int) $cart['id'] : null,
                $quote['shipping']['source'],
                $quote['tax']['source'],
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000' && $idempotency !== '') {
                $pdo->rollBack();
                $existing = ds_atelier_checkout_find_order_by_idempotency($pdo, $idempotency);
                if ($existing !== null && ds_atelier_checkout_order_owned($existing, $actor)) {
                    $existingItems = ds_atelier_checkout_order_items($pdo, (int) $existing['id']);
                    $cartState = ds_atelier_cart_get($pdo, $config);
                    return [
                        'ok' => true,
                        'order' => ds_atelier_checkout_order_public(
                            $existing,
                            $existingItems,
                            ds_atelier_fulfilment_find_by_order($pdo, (int) $existing['id']),
                            ds_atelier_invoice_find_by_order($pdo, (int) $existing['id'])
                        ),
                        'cart' => $cartState['cart'],
                        'replayed' => true,
                        'code' => 200,
                    ];
                }
            }
            throw $e;
        }

        $orderId = (int) $pdo->lastInsertId();
        $itemStmt = $pdo->prepare(
            'INSERT INTO order_items (
                order_id, product_id, variant_id, product_slug, product_name, sku, colour_name, size_code,
                print_type, print_position, artwork_id, artwork_name, quantity, unit_price, unit_mrp, line_price, line_mrp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $reserveItems = [];
        foreach ($items as $item) {
            $itemStmt->execute([
                $orderId,
                (int) $item['numericProductId'],
                (int) $item['variantId'],
                (string) $item['id'],
                (string) $item['name'],
                (string) $item['sku'],
                (string) $item['color'],
                (string) $item['size'],
                (string) $item['printType'],
                (string) $item['printPosition'],
                (string) ($item['artworkId'] ?? ''),
                $item['artworkName'] !== null && $item['artworkName'] !== '' ? (string) $item['artworkName'] : null,
                (int) $item['qty'],
                ds_atelier_money_format(ds_atelier_money_paise($item['unitPrice'] ?? $item['price'])),
                ds_atelier_money_format(ds_atelier_money_paise($item['unitMrp'] ?? $item['mrp'])),
                ds_atelier_money_format(ds_atelier_money_paise($item['linePrice'])),
                ds_atelier_money_format(ds_atelier_money_paise($item['lineMrp'])),
            ]);
            $orderItemId = (int) $pdo->lastInsertId();
            $reserveItems[] = array_merge($item, [
                'order_item_id' => $orderItemId,
                'orderItemId' => $orderItemId,
            ]);
        }

        $reserved = ds_atelier_inventory_reserve_order($pdo, $orderId, $reserveItems);
        if (($reserved['ok'] ?? false) !== true) {
            $pdo->rollBack();
            return $reserved;
        }

        if (ds_atelier_fulfilment_tables_exist($pdo)) {
            ds_atelier_fulfilment_ensure_row($pdo, $orderId);
        }

        $placedStmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
        $placedStmt->execute([$orderId]);
        $placedOrder = $placedStmt->fetch();
        if (is_array($placedOrder)) {
            $placedItems = ds_atelier_checkout_order_items($pdo, $orderId);
            $issued = ds_atelier_invoice_issue($pdo, $config, $placedOrder, $placedItems);
            $invoiceRow = is_array($issued['invoice'] ?? null) ? $issued['invoice'] : null;
            try {
                ds_atelier_mail_queue_order_placed($pdo, $config, $placedOrder, $placedItems, $invoiceRow);
            } catch (Throwable $e) {
                ds_atelier_log('error', 'Order placed email was not queued', $config);
            }
        }

        $pdo->prepare('DELETE FROM cart_items WHERE cart_id = ?')->execute([(int) $cart['id']]);
        ds_atelier_cart_touch($pdo, (int) $cart['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    $order = ds_atelier_checkout_find_order_by_ref($pdo, $ref);
    $orderItems = $order !== null ? ds_atelier_checkout_order_items($pdo, (int) $order['id']) : [];
    $cartState = ds_atelier_cart_get($pdo, $config);
    return [
        'ok' => true,
        'order' => $order !== null ? ds_atelier_checkout_order_public(
            $order,
            $orderItems,
            $order !== null ? ds_atelier_fulfilment_find_by_order($pdo, (int) $order['id']) : null,
            $order !== null ? ds_atelier_invoice_find_by_order($pdo, (int) $order['id']) : null
        ) : null,
        'cart' => $cartState['cart'],
        'code' => 201,
    ];
}
