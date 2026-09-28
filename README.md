# DS ATELIER Frontend v0.1.4

Premium custom apparel storefront. Tagline: **CREATE. PRINT. WEAR.**

DTF printing, sublimation, custom products, bulk orders, and dropshipping for creators, brands, teams, and businesses.

Current release: **v0.1.4** — Alpha / Standalone Frontend. Home, Shop, Product, About, Policy, and Support pages. This is not a complete ecommerce website.

---

## Purpose

Standalone frontend for the approved DS ATELIER visual system.

Home, Shop, Product, About, Policy, and Support follow the approved visual system. Later pages (Cart, Checkout, and remaining content pages) must reuse the same global CSS and components.

Includes a global design system, Light/Dark mode, responsive navigation, official brand assets, and mock product data.

This is not a production PHP app yet. Future Core PHP backend integration is not implemented.

---

## Technology

- Static HTML5
- CSS (no preprocessor, no UI kit)
- Vanilla JavaScript
- Font Awesome 6 (icons)
- Google Fonts: Syne + DM Sans
- Official PNG brand assets

No Node build step. No database in this repo.

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
| Theme | `js/theme.js` |
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
| Product (`product.html`) | Built |
| About (`about.html`) | Built |
| Policy (`policy.html`) | Built |
| Support (`support.html`) | Built |
| Cart, Checkout | Not built |
| Dedicated FAQ / Contact pages | Not built; Support includes FAQ and a contact form |
| Custom Order, Bulk Orders, Dropshipping | Home sections only; dedicated pages not built |

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

Home illustrations are SVG placeholders in `assets/`.

---

## Documentation

| File | Contents |
|---|---|
| `AI_INSTRUCTIONS.md` | Permanent rules for AI/code agents |
| `PROJECT_STATUS.md` | Truthful build status |
| `CHANGELOG.md` | Chronological history |
| `docs/DESIGN_SYSTEM.md` | Tokens and components |
| `docs/UI_RULES.md` | Do / do-not UI rules |
| `docs/PRODUCT_GUIDE.md` | Catalog fields and custom-print flow |
| `docs/FRONTEND_ARCHITECTURE.md` | CSS/JS/page structure |
| `docs/BACKEND_INTEGRATION.md` | Future Core PHP wiring |

When design, architecture, product flow, or integration changes, update the matching docs in the same task.

---

## Future backend integration

The frontend will later connect to the existing Core PHP backend (products, cart, checkout, payment, auth, sessions, orders, tax, wishlist, admin).

See `docs/BACKEND_INTEGRATION.md`. This is not implemented.

---

## Current limitations

- Home, Shop, Product, About, Policy, and Support pages only
- Mock product data in JavaScript
- Cart badge is a demo counter
- Account and Checkout are placeholders or unbuilt
- No PHP, no database, no payments
- Listing cards use View Product; configuration and Add to Cart live on Product
