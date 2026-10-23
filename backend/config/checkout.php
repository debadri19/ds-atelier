<?php

declare(strict_types=1);

return [
    'currency' => 'INR',
    'country' => 'India',
    'rounding' => 'half_up_paise',
    'payment_methods' => ['UPI', 'Razorpay', 'Card'],
    'shipping' => [
        'policy' => 'development_demo',
        'flat_fee' => '79.00',
        'free_subtotal_threshold' => '999.00',
        'label' => 'Standard delivery',
    ],
    'tax' => [
        'policy' => 'unconfigured',
        'rate' => '0.00',
        'label' => 'Tax',
    ],
    'discounts' => [
        'policy' => 'development_demo',
        'codes' => [
            'WELCOME10' => [
                'type' => 'percent',
                'value' => '10.00',
            ],
        ],
    ],
];
