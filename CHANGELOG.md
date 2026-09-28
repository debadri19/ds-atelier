# Changelog — DS ATELIER

Chronological history of changes that actually exist. Dates use the work session calendar.

---

## [0.1.1] - 2026-09-24

Patch release. Alpha / Standalone Frontend.

### Fixed
- Restored approved DS ATELIER Home presentation
- Corrected header logo/tagline alignment
- Restored tagline: “CREATE. PRINT. WEAR.”
- Balanced floating pill header spacing
- Converted desktop/tablet Search, Account, Cart and Theme controls to circular icon buttons
- Added tooltips/accessibility labels for icon-only utility actions
- Preserved mobile bottom navigation
- Removed footer email address
- Removed footer phone number
- Removed YouTube social icon
- Removed Pinterest social icon

### Design
- Preserved approved DS ATELIER visual direction
- Preserved Light/Dark theme system
- Preserved global css/style.css architecture
- Preserved View Product CTA on product cards

---

## 2026-09-24

### Home approved-design correction

- Restored compact floating pill header with official logo assets
- Added non-clickable tagline `CREATE. PRINT. WEAR.` under the header logo
- Increased hero top spacing so the heading is not hidden by the header
- Restored global button radius to the approved rounded rectangle (removed pill glow)
- Product cards now use View Product instead of Add to Cart

### Documentation lock

- Added `AI_INSTRUCTIONS.md` as permanent rules for future agents
- Added `README.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`
- Added `docs/DESIGN_SYSTEM.md`, `docs/UI_RULES.md`, `docs/PRODUCT_GUIDE.md`, `docs/FRONTEND_ARCHITECTURE.md`, `docs/BACKEND_INTEGRATION.md`
- No application UI or functionality changes in this documentation task

### Home visual polish and official brand assets

- Copied official logos to `assets/images/brand/` (`logo-full.png`, `logo-icon.png`, `logo-wordmark.png`)
- Replaced text/CSS logo lockups with official image assets in header, drawer, footer, and favicon
- Header remains dark glass in light and dark themes
- Desktop nav uses Font Awesome icons plus labels; mobile uses floating bottom nav and drawer
- Footer expanded with official full logo, quick links, shop, support, policies, contact, social, newsletter, payment badges
- Theme tokens updated so the floating header stays dark in light mode

### Initial standalone Home frontend

- Created static Home page `index.html`
- Created global design system `css/style.css`
- Created `css/header.css`, `css/footer.css`, `css/home.css`
- Created `js/theme.js` and `js/main.js` (theme persistence, mock products, drawer, newsletter)
- Created reusable markup in `components/header.html`, `components/footer.html`, `components/product-card.html`
- Home sections: announcement bar, floating pill header, hero, shop by category, USP strip, best sellers (mock data), custom printing CTA, DTF, sublimation, why DS ATELIER, bulk orders, dropshipping, reviews, newsletter, footer
- Light and dark themes via `html[data-theme]`

---

## [0.1.2] - 2026-09-25

### Product page

- Added `product.html`, `css/product.css`, and `js/product.js`
- Gallery with thumbnails, navigation, swipe, and lightbox
- Required configuration: print type, color, size, quantity, design upload, print position, special instructions
- Add to Cart and Buy Now stay disabled until required options are selected
- Related products reuse `.product-card` with View Product
- Frontend-only mock product and pricing; no backend submission

---

## [0.1.3] - 2026-09-25

### About and Policy pages

- Added `about.html` and `css/about.css`
- About includes editorial hero, brand story, services, why, process, values, quality, non-numeric highlights, and CTA
- Added `policy.html`, `css/policy.css`, and `js/policy.js`
- Policy hub: shipping, returns, cancellation, custom products, artwork, bulk, privacy, terms
- Desktop sidebar navigation; collapsible section nav on mobile
- Customer-facing DS ATELIER branding only; no provider names
- No invented delivery guarantees or free-shipping promise in policy copy
- Light and dark themes reuse the approved system

---

## [0.1.4] - 2026-09-25

### Support page

- Added `support.html`, `css/support.css`, and `js/support.js`
- Hero, frontend search, help topic cards, order-help actions, contact options, contact form, FAQ accordion, custom-order CTA
- Contact cards use placeholders; no invented email, phone, or WhatsApp number
- FAQ wording aligned with Policy: no fixed delivery guarantees
- Form and search are frontend-only

---

## 2026-09-28

### Global floating-label forms

- Outlined floating-label fields are the official form standard in `css/style.css`
- Migrated newsletter, support search/contact, product special instructions, and shop sort
- Field names, IDs, validation, autocomplete, and submit behaviour unchanged
- Removed duplicated shop select skin; page CSS keeps layout-only form rules
- `css/style.css` remains the only global design system; no override stylesheet

---

## 2026-09-28 (Support)

### Support search / FAQ placement

- FAQ section moved directly below the search field and now acts as the search-results area; no duplicate FAQ section
- Section order: Hero, Search, FAQ, Help Topics, Order Help, Contact options, Contact form, CTA
- Search logic, result count, FAQ content and accordion behaviour unchanged (`js/support.js` untouched)
- No-results: the existing note stays under the search field and the empty FAQ block is hidden (CSS `:has()`)
- Reduced the gap between search and FAQ heading (page-specific `css/support.css` only)
- Help Topics now 2 columns x 3 rows at 576px and below; tablet (2 columns) and desktop (3 columns) unchanged
- `#faq` anchor and footer/drawer FAQ links unchanged

---

## Unreleased / not implemented

- Cart, Checkout, and other inner pages
- Core PHP backend integration
- Real catalog, cart, checkout, auth, payments
