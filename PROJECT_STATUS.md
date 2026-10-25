# Project Status — DS ATELIER

Version: v0.1.6  
Status: Alpha — Frontend plus Phase 2 customer authentication, Phase 3 read-only catalog, Phase 4 persistent cart/wishlist, Phase 5 checkout/order creation, Phase 6A customer order history, Phase 6B inventory reservation, Phase 6C fulfilment/invoices (partial), and Phase 6D transactional email queue (partial)

Truthful snapshot. Do not treat planned work as done.

Payments are not integrated. Phase 2 wires customer `auth.html` to same-origin PHP against dedicated `ds_atelier_dev`. Phase 3 wires Shop, Home, and Product to read-only catalog JSON. Phase 4 stores cart and wishlist in `ds_atelier_dev` for guests and signed-in customers. Phase 5 creates pending-payment orders from the server cart. Phase 6A reads those owned orders on Account and order confirmation. Phase 6B reserves in-stock units at place so available-to-sell cannot oversell. Phase 6C adds shipment/invoice data, owned customer tracking/invoice download, and fail-closed admin fulfilment writes. Phase 6D queues order/fulfilment/reset email in an outbox; a worker must be run and real SMTP is not verified. Dashboard authentication remains a frontend demo.

---

## Completed

- Global design system
- Light/Dark mode
- Home page
- Shop page
- Product page
- About page
- Policy page
- Support page
- Customer account dashboard (`account.html`) — profile/addresses remain a frontend demo; order history is Phase 6A against `ds_atelier_dev`
- Cart and Wishlist — Phase 4 server persistence against `ds_atelier_dev`
- Checkout — Phase 5 pending-payment order creation against `ds_atelier_dev`; payment is not collected; Designs remain a frontend demo page
- Customer authentication (`auth.html`) — Phase 2 server login/register/logout/reset against `ds_atelier_dev`; `#login` `#register` `#forgot-password` `#reset-password`; legacy redirects retained. Password-reset email is queued by Phase 6D when the outbox is available; public JSON still reports `email_sent: false` until a worker accepts delivery. Real SMTP is not verified.
- Studio Dashboard (`dashboard/index.html`, categories, products, designs, media) — frontend demo
- Dashboard authentication (`dashboard/auth.html`) — frontend demo; separate from customer auth; legacy `dashboard/login.html` redirect retained
- Responsive header
- Mobile bottom navigation
- Official logo integration
- Header/footer correction pass
- Product card View Product CTA
- Documentation lock
- Frontend UI polish phase for the current six pages
- Phase 1 backend foundation files under `backend/`
- Phase 2 customer PHP/JSON handlers under `backend/public/customer/` and `customers` / `customer_password_resets` tables in `ds_atelier_dev`
- Phase 3 catalog tables, development fixtures, and read-only JSON under `backend/public/catalog/`
- Phase 4 cart/wishlist tables and CSRF-protected JSON under `backend/public/cart/` and `backend/public/wishlist/`
- Phase 5 order tables and CSRF-protected JSON under `backend/public/checkout/`
- Phase 6A customer order list/detail against owned pending-payment rows; confirmation no longer falls back to a different localStorage order
- Phase 6B inventory reservation: available-to-sell is on-hand minus reserved minus committed; checkout cannot oversell in-stock variants
- Phase 6C fulfilment and invoices: shipment/invoice tables, owned tracking display, development/test invoice download, fail-closed admin fulfilment writes
- Phase 6D transactional email: additive `email_outbox`, test/SMTP transport, order/fulfilment/reset templates, manual worker `backend/bin/send-email-queue.php`

### Header

- Mobile Search icon visibility; Header Search is a frontend modal against the loaded catalog (API-backed after Phase 3; demo fallback is explicit)
- Mobile utility alignment and right-side spacing

### Footer

- Dual logo lockup (`logo-icon.png` + `logo-wordmark.png`)
- Footer brand spacing optimization

### Shop

- Filters
- Sort
- Pagination
- Mobile filter sheet
- Mobile sort sheet

### PDP

- Dynamic Front/Back upload flow
- Upload preview inside the upload area
- Size Guide modal
- Lightbox
- Mobile layout corrections
- CTA hierarchy (`Buy Now` / `Add to Cart`)
- Scrollbar breathing room

### Catalog / assets

- Product image architecture
- Asset folder restructure
- Catalog color cleanup

### Home

- Mobile USP card spacing optimization

---

## Pending

- Core PHP/MySQL integration (payment capture, production tax invoices, admin orders). Customer auth is Phase 2; catalog read APIs are Phase 3; cart/wishlist persistence is Phase 4; checkout/order creation is Phase 5; customer order history is Phase 6A; inventory reservation is Phase 6B; fulfilment/invoice services are Phase 6C; transactional email queue is Phase 6D; Dashboard auth is not.
- Artwork migration (replace `js/artworks.js` mocks) and admin catalog CRUD
- Dashboard production persistence (Categories/Products/Designs/Media) and placeholder modules (Orders, Customers, Discounts, Settings)
- Dedicated Custom Order / Bulk Orders / Dropshipping PHP pages — **Needs Verification** against the backend repo (Home sections exist here; dedicated PHP files do not)
- Production end-to-end QA after backend work
- Git commit/push of local authentication rename (`auth.html`, `dashboard/auth.html`) — uncommitted as of 2026-10-11; HEAD remains `555d395`

See `docs/PROJECT_AUDIT_PENDING.md` for evidence and status labels.

---

## Known issues / limitations

- No public preview tunnel is guaranteed in every environment; local static server is `python3 -m http.server 8000`
- Home listing cards use View Product; Product Details handles configuration and frontend-only Add to Cart / Buy Now
- Header/footer markup is inlined on all 6 pages and mirrored in `components/*.html`. Keep copies identical until PHP includes exist. Do not use a runtime JS loader. Support footer omits colliding `#support` / `#faq` ids.
- Apparel visuals on Home are SVG placeholders, not photography
- Storefront images live under `assets/images/{hero,categories,products,services,icons,miscellaneous}/`
- Product mockups live under `assets/images/products/<product-slug>/mockups/default/<color>/`
- Cart and Wishlist persist in `ds_atelier_dev` (guest cookie `ds_atelier_guest` or customer session). Checkout creates pending-payment orders; Account order history reads owned rows from `backend/public/customer/orders.php`. Coupons remain local (`ds-atelier-coupon`) until quote/place.
- Customer Auth uses a PHP session against `ds_atelier_dev`. Forgot-password issues a hashed token and may queue a reset email; public JSON still reports `email_sent: false`. Real SMTP delivery is not verified. Reset requires `?token=` on `auth.html#reset-password`.
- `account.html` still uses the demo session store for profile and addresses; order history is server-backed
- Admin order management and live fulfilment writes are blocked until server-side admin authorization exists
- Phase 6C invoices are development/test documents; seller GST/legal details are unconfigured and no PDF renderer is installed
- Phase 6D does not run a scheduler. `php backend/bin/send-email-queue.php` must be invoked. Test transport never claims a real send. SMTP credentials and inbox delivery are unverified.
- Catalog listings and PDP read `backend/public/catalog/*.php`. Variant `stock` in those payloads is available-to-sell after Phase 6B. `js/catalog.js` mock data is development/demo fallback only.
- Canonical customer auth in this working tree is `auth.html`; that rename is not in commit `555d395`

---

## Next phase

1. Safely commit/push the local authentication route rename and Phase 2 backend when the owner approves
2. Configure real SMTP and run the email worker before claiming password-reset or order email delivery
3. Payment capture, production tax invoices, and admin catalog/order CRUD (Phase 7)
4. Production end-to-end QA

Frontend pages for Home, Shop, Product, About, Policy, Support, Account, Cart, Checkout, Wishlist, Designs, and Auth exist. Payments, production catalog CRUD, admin orders, real SMTP delivery, and production QA are not complete.

Do not claim payments or production search is complete. Do not describe Cart or Wishlist as browser-only after Phase 4. Do not describe Checkout as unbuilt. Do not describe placed orders as paid. Do not describe Account order history as demo-only after Phase 6A.
