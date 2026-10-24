# DS ATELIER Frontend v0.1.5

Premium custom apparel storefront. Tagline: **CREATE. PRINT. WEAR.**

DTF printing, sublimation, custom products, bulk orders, and dropshipping for creators, brands, teams, and businesses.

Current release: **v0.1.5** — Alpha. Storefront and Dashboard pages exist as a static frontend. Customer authentication is Phase 2 PHP against dedicated `ds_atelier_dev`. Catalog is Phase 3 read-only JSON. Cart and wishlist persist in Phase 4. Checkout creates pending-payment orders in Phase 5. Account order history is Phase 6A. Inventory reservation is Phase 6B. Payments are not connected.

---

## Purpose

Standalone frontend for the approved DS ATELIER visual system.

Home, Shop, Product, About, Policy, Support, Account, Cart, Checkout, Wishlist, Designs, and authentication pages follow the approved visual system. Additional pages must reuse the same global CSS and components.

Includes a global design system, Light/Dark mode, responsive navigation, official brand assets, and mock product data.

This is not a production PHP app yet. Customer login/register/reset, catalog reads, cart/wishlist persistence, pending-payment checkout, owned order history, and inventory reservation are wired; payments are not.

---

## Technology

- Static HTML5
- CSS (no preprocessor, no UI kit)
- Vanilla JavaScript
- Font Awesome 6 (icons)
- Google Fonts: Syne + DM Sans
- Official PNG brand assets

No Node build step. PHP lives under `backend/`. Customer `auth.html` posts to `backend/public/customer/*.php`. Shop/Product read `backend/public/catalog/*.php`. Cart/Wishlist use `backend/public/cart/*.php` and `backend/public/wishlist/*.php`. Checkout uses `backend/public/checkout/*.php`. Account order history uses `backend/public/customer/orders.php`. In-stock checkout reserves available-to-sell units. Payment is not collected.

---

## Frontend architecture

| Layer | Path |
|---|---|
| Global design system | `css/style.css` |
| Header structure | `css/header.css` |
| Footer structure | `css/footer.css` |
| Home layout | `css/home.css` |
| Shop layout | `css/shop.css` |
| Product layout | `css/product.css` |
| About layout | `css/about.css` |
| Policy layout | `css/policy.css` |
| Support layout | `css/support.css` |
| Dashboard layout | `css/admin.css` |
| Theme | `js/theme.js` |
| Catalog | `js/catalog.js` |
| Home behaviour | `js/main.js` |
| Shop behaviour | `js/shop.js` |
| Product behaviour | `js/product.js` |
| Policy behaviour | `js/policy.js` |
| Support behaviour | `js/support.js` |
| Markup templates | `components/` |

Details: `docs/FRONTEND_ARCHITECTURE.md`

---

## Pages

| Page | Status |
|---|---|
| Home (`index.html`) | Built |
| Shop (`shop.html`) | Built |
| Product (`product.html?id=`) | Built |
| About (`about.html`) | Built |
| Policy (`policy.html`) | Built |
| Support (`support.html`) | Built |
| Account (`account.html`) | Built (Phase 6A server order history; profile/addresses remain a frontend demo) |
| Cart (`cart.html`) | Built (Phase 4 server cart against `ds_atelier_dev`) |
| Checkout (`checkout.html`) | Built (Phase 5 pending-payment order creation; no payment capture) |
| Wishlist (`wishlist.html`) | Built (Phase 4 server wishlist against `ds_atelier_dev`) |
| Designs (`designs.html`, `design.html`) | Built (frontend demo) |
| Customer auth (`auth.html`) | Built (Phase 2 PHP/JSON against `ds_atelier_dev`; SMTP reset email not sent) |
| Dashboard (`dashboard/index.html`) | Built (frontend demo) |
| Dashboard Categories / Products / Designs / Media | Built (frontend demo) |
| Dashboard auth (`dashboard/auth.html`) | Built (frontend demo; separate from customer auth) |
| Dedicated FAQ / Contact pages | Not built; Support includes FAQ and a contact form |
| Custom Order, Bulk Orders, Dropshipping | Home sections only; dedicated pages not in this frontend repo |
| Header Search | Frontend search modal in `js/main.js` (mock catalog only; no backend search) |

---

## Theme system

`html[data-theme="light"]` / `html[data-theme="dark"]`

- Light: warm off-white `#F5F2EC`, white surfaces, dark text, **dark floating header**, orange CTA
- Dark: `#0F1113` page, charcoal cards, white text, orange accent

Toggle persists in `localStorage` key `ds-atelier-theme`.

---

## Design system

Canonical tokens and components: `docs/DESIGN_SYSTEM.md`  
Permanent agent rules: `AI_INSTRUCTIONS.md`  
UI constraints: `docs/UI_RULES.md`

Primary brand color: `#FF6A00`.

---

## Local development

From the project root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

No install step. Do not add a bundler unless explicitly requested.

---

## Assets

Official logos (do not redraw):

- `assets/images/brand/logo-full.png`
- `assets/images/brand/logo-icon.png`
- `assets/images/brand/logo-wordmark.png`

SVG placeholders live under `assets/images/`:

- `hero/` — Home, Shop, and About studio art
- `categories/` — category cards
- `products/<product-slug>/mockups/default/<color>/` — catalog and PDP mockups (original filenames)
- `services/` — DTF, sublimation, bulk illustrations
- `icons/` — reserved
- `miscellaneous/` — unclassified images

---

## Documentation

| File | Contents |
|---|---|
| `AI_INSTRUCTIONS.md` | Permanent rules for AI/code agents |
| `PROJECT_STATUS.md` | Truthful build status |
| `docs/PROJECT_AUDIT_PENDING.md` | Pending list and audit record |
| `CHANGELOG.md` | Chronological history |
| `docs/DESIGN_SYSTEM.md` | Tokens and components |
| `docs/UI_RULES.md` | Do / do-not UI rules |
| `docs/PRODUCT_GUIDE.md` | Catalog fields and custom-print flow |
| `docs/FRONTEND_ARCHITECTURE.md` | CSS/JS/page structure |
| `docs/BACKEND_INTEGRATION.md` | Future Core PHP wiring |
| `backend/README.md` | Phase 1 backend foundation setup |

When design, architecture, product flow, or integration changes, update the matching docs in the same task.

---

## Future backend integration

Phase 1 added a DS-specific PHP scaffold under `backend/`. Phase 2 wires customer auth, Phase 3 wires catalog reads, Phase 4 wires cart/wishlist, Phase 5 creates pending-payment orders, Phase 6A reads owned order history, and Phase 6B reserves inventory at place.

See `docs/BACKEND_INTEGRATION.md` and `backend/README.md`. Payments, Newsletter, and Meta Pixel are not implemented.

---

## Current limitations

- Payments are not implemented
- Cart and Wishlist persist in `ds_atelier_dev`; Checkout creates pending-payment orders and reserves in-stock units; Account order history reads owned server rows; profile/addresses remain frontend-only
- Header Search uses the loaded catalog API (demo fallback is explicit)
- Listing cards use View Product; configuration and Add to Cart live on Product
- Payment capture, admin CRUD, and production QA remain pending
