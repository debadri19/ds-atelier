# Changelog — DS ATELIER

Chronological history of changes that actually exist. Dates use the work session calendar.

---

## 2026-10-04

### Customer account dashboard

- Added `account.html`, `css/account.css`, and `js/account.js`
- Overview, orders, order details, saved addresses, profile settings, and change-password UI
- Header and mobile Account controls now open `account.html`
- Wishlist remains on `wishlist.html`; account shows the current saved-item count
- Frontend-only demo data; passwords are not stored

---

## [0.1.5] - 2026-10-01

Patch release. Alpha / Standalone Frontend. Frontend UI polish for the current six pages is complete. Overall project remains in progress.

### Added

- Shop page: filters, sort, pagination, mobile filter sheet, mobile sort sheet
- Product image architecture under `assets/images/products/<product-slug>/mockups/default/<color>/`
- Asset folder architecture: `hero/`, `categories/`, `products/`, `services/`, reserved `icons/` and `miscellaneous/`
- Dynamic artwork upload on PDP: Front, Back, or Front + Back zones
- In-box upload preview (filename, size, image thumb)

### Improved

- PDP mobile UX: facts 2×2, print type side-by-side, print position row, size-guide pill
- PDP CTA hierarchy: Buy Now and Add to Cart on one tighter row
- PDP upload experience: position-driven zones, preview inside the drop area
- Footer branding: dual logo lockup (`logo-icon.png` + `logo-wordmark.png`) with extra left breathing room
- Mobile header spacing and Search icon visibility (Search remains a visual placeholder)
- Home USP card spacing on mobile (content-driven height)

### Fixed

- Catalog color consistency
- PDP spacing next to the browser scrollbar
- Mobile header right-side empty gap
- Mobile USP card oversized bottom space
- Mobile print type / print position stacking

---

## 2026-09-30

### Product image architecture

- Moved each catalog product SVG into `assets/images/products/<product-slug>/mockups/default/<color>/`
- Kept original filenames; reserved empty `designs/` per product
- `minimal-hoodie` shares `motivational-hoodie` charcoal mockup (no duplicate file)
- Updated `js/catalog.js`, `product.html`, and docs paths

### Asset folder restructure

- Moved SVG placeholders into `assets/images/{hero,categories,products,services}/`
- Official logos remain in `assets/images/brand/`
- Reserved empty `icons/` and `miscellaneous/` folders

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

## 2026-09-29

### DTF card, button contrast, focus polish

- About Quality/DTF media is a light padded card with the existing DTF artwork contained in a rounded inner frame
- Ghost/secondary buttons on `.promo-dark` use white text so they stay readable in Light theme
- Mouse/touch no longer leave a residual focus/tap box; keyboard `:focus-visible` remains

### Footer + Custom Printing polish

- Reduced desktop `.site-footer` top padding so the logo sits at the top of the brand block; mobile footer padding unchanged
- Custom Printing buttons stay side-by-side on mobile with nowrap and equal height, remaining inside the card
- Custom Printing media uses the existing `print-studio.svg` composition (inset mockup + colour swatches) with internal padding so artwork does not touch the outer frame

### Dark mode initial flash

- HTML still defaults to `data-theme="light"` for no-JS
- Added a blocking `<head>` script on all 6 pages that applies `ds-atelier-theme` or system preference before first paint
- `js/theme.js` remains the toggle/persistence owner
- No Light → Dark flash when Dark is saved

### Frontend product switching

- Added `js/catalog.js` as the canonical frontend catalog (`DSAtelier.catalog`)
- Home, Shop, and related cards link to `product.html?id=<product-id>`
- `js/product.js` reads `id`, hydrates the existing PDP, and falls back to Oversized Graphic Tee when `id` is missing or unknown
- Listing prices used for Oversized Graphic Tee (₹799 / ₹1199); previous PDP-only ₹699 / ₹999 was not carried forward
- Motivational Hoodie remains Home-only; Shop still lists Minimal Hoodie as a separate id

### Mobile Priority-1 audit

- Kept Home hero floating cards ("48h print", "No MOQ") visible on 360–430px and repositioned them onto the artwork corners
- Hero artwork uses contain on tablet/mobile so the illustration stays centered without aggressive crop
- Category captions and media captions use the same rounded-rectangle CTA language as `.btn` (no remaining pill CTAs)
- Product card View Product matches global button height, radius, padding, and type
- Home Custom Printing, DTF, Sublimation, and Bulk media contain artwork on mobile instead of cropping it
- Shop, Product, and About heroes/galleries keep artwork visible; Product tabs scroll horizontally instead of wrapping awkwardly

### Header / footer duplication review

- Audited all 6 pages against `components/header.html` and `components/footer.html`
- Kept inlined static markup (no runtime `fetch()` loader, no PHP yet)
- Restored missing footer `id="policies"` on About, Policy, and Support so column markup matches the canonical footer
- Support footer still omits `id="support"` and newsletter `id="faq"` to avoid duplicate IDs on that page
- Header copies remain identical except page-specific `is-active` nav state

---

## Unreleased / not implemented

- Cart, Checkout, and other inner pages
- Core PHP backend integration
- Real catalog, cart, checkout, auth, payments
