# Frontend Architecture — DS ATELIER

Standalone static frontend. No bundler. No backend in this phase.

---

## Directory layout

```
/
  index.html                 Home page
  shop.html                  Shop page
  designs.html               Artwork discovery
  design.html                Artwork detail
  product.html               Product page
  about.html                 About page
  policy.html                Policy page
  support.html               Support page
  account.html               Customer account dashboard
  css/
    style.css                GLOBAL design system
    header.css               Header structure
    footer.css               Footer structure
    home.css                 Home-only layout
    shop.css                 Shop-only layout
    designs.css              Designs / artwork layout
    design.css               Artwork detail layout
    product.css              Product-only layout
    about.css                About-only layout
    policy.css               Policy-only layout
    support.css              Support-only layout
    account.css              Account dashboard layout
  js/
    theme.js                 Light/dark persistence
    catalog.js               Canonical frontend product catalog
    artworks.js              Canonical frontend artwork dataset
    main.js                  Home featured products, drawer, newsletter
    designs.js               Designs category filter and artwork grid
    design.js                Artwork detail hydration, available products, PDP handoff
    shop.js                  Shop filters, sort, pagination
    product.js               Product gallery, configuration, upload UI
    policy.js                Policy section navigation
    support.js               Support search, FAQ accordion, contact form
    account.js               Account dashboard sections, demo orders, addresses, profile
  components/
    header.html              Reusable header markup
    footer.html              Reusable footer markup
    product-card.html        Product card template
  assets/
    images/
      brand/                 Official logos (immutable)
        logo-full.png
        logo-icon.png
        logo-wordmark.png
      hero/                  Home/Shop/About hero and studio art
      categories/            Category cards
      products/
        <product-slug>/
          designs/           Future print artwork
          mockups/
            default/
              <color>/       Current combined mockup SVGs
      services/              DTF, sublimation, bulk illustrations
      icons/                 Reserved for UI icons
      miscellaneous/         Unclassified images
```

All six public pages inline header, mobile nav, drawer, and footer markup. `components/header.html` and `components/footer.html` are the canonical source copies for future PHP includes. They are not loaded at runtime.

Do not introduce a client-side `fetch()` include. This site must work as standalone static HTML (direct page URLs, local static server, no build step). PHP `include` is the later shared mechanism.

Keep inlined copies identical except for these intentional differences:

- Header / mobile nav `is-active` on the current page (Home, Shop, About, Support). Product uses Shop. Policy has no primary-nav active state.
- Support footer omits `id="support"` and newsletter `id="faq"` because those IDs already exist on the Support page.

---

## CSS layers

### Global — `css/style.css`

Owns:

- tokens and theme
- reset
- typography
- containers and spacing
- buttons, cards, badges, forms, links
- breadcrumbs, section headings
- product-card base
- outlined floating-label form system
- brand lockup image sizes
- shared responsive rules

### Component CSS

- `header.css` — pill header, desktop nav, mobile bottom nav, drawer
- `footer.css` — footer grid, social, newsletter row, payment badges

These files hold structural rules for those components, not a second token system.

### Page CSS

Page files may contain only layout unique to that page:

| File | Page | Status |
|---|---|---|
| `home.css` | Home | exists |
| `shop.css` | Shop | exists |
| `product.css` | Product | exists |
| `cart.css` | Cart | not built |
| `checkout.css` | Checkout | not built |
| `about.css` | About | exists |
| `support.css` | Support | exists |
| `policy.css` | Policy | exists |
| `account.css` | Account | exists |

Load order on every page:

`style.css` → component CSS → page CSS

Do not duplicate `.btn`, `.card`, `.product-card`, or form field skins inside page CSS.
Do not add another global override stylesheet.

---

## JavaScript

| File | Role |
|---|---|
| `js/theme.js` | Toggle + persistence (`ds-atelier-theme`); reapplies theme if needed |
| `js/catalog.js` | Canonical mock catalog; `DSAtelier.catalog` lookup, featured, related, `product.html?id=` URLs |
| `js/artworks.js` | Canonical mock artwork dataset; `DSAtelier.artworks` lookup, category filter, `design.html?id=` URLs |
| `js/main.js` | Home featured grid from catalog, cart badge demo, mobile drawer, newsletter preventDefault |
| `js/designs.js` | Designs category filter, URL state, artwork grid |
| `js/design.js` | Reads `?id=`, hydrates artwork detail from artworks |
| `js/shop.js` | Shop filters, sort, pagination from catalog |
| `js/product.js` | Reads `?id=`, hydrates PDP from catalog, gallery, required configuration, upload UI, estimated total |
| `js/policy.js` | Policy sidebar / mobile section navigation |
| `js/support.js` | Support search, FAQ accordion, frontend contact form |
| `js/account.js` | Account dashboard: overview, demo orders, addresses, profile, password UI |

Load `js/catalog.js` before `js/main.js`, `js/shop.js`, and `js/product.js`.
Load `js/artworks.js` before `js/designs.js` and `js/design.js`.

Future page scripts should be additive and must not fork the theme system.

---

## Reusable components

| Component | Classes / files |
|---|---|
| Header | `.site-header`, `.header-pill`, `components/header.html` |
| Footer | `.site-footer`, `components/footer.html` |
| Buttons | `.btn` variants |
| Cards | `.card`, `.feature-card`, `.promo-panel` |
| Product cards | `.product-card`, `components/product-card.html` |
| Forms | `.form-field`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.input-group` |
| Navigation | `.header-nav`, `.nav-link` |
| Mobile bottom nav | `.mobile-nav` |
| Drawer / menu | `.mobile-drawer` |
| Breadcrumbs | `.breadcrumb` (global; unused on Home) |
| FAQ | built inside Support (`#faq`, `.faq-item`, `.support-faq-section` in `css/support.css`); sits directly under the search field and doubles as the search-results area |

---

## Pages

| Page | File | Status |
|---|---|---|
| Home | `index.html` | built |
| Shop | `shop.html` | built |
| Designs | `designs.html` | built |
| Artwork detail | `design.html` | foundation |
| Product | `product.html` | built |
| About | `about.html` | built |
| Policy | `policy.html` | built |
| Support | `support.html` | built |
| Account | `account.html` | built |
| Cart | — | pending |
| Checkout | — | pending |
| Custom Order | — | pending |
| Bulk Orders | — | pending |
| Dropshipping | — | pending |
| FAQ | — | pending |
| Contact | — | pending |

Home section anchors (`#shop`, `#custom-printing`, `#bulk`, etc.) are in-page links, not separate routes.

---

## Theme

`html[data-theme="light"|"dark"]`  
Storage key: `ds-atelier-theme`

Each page includes a tiny blocking script in `<head>` (immediately after charset) that reads `ds-atelier-theme` or `prefers-color-scheme` and sets `data-theme` before CSS/paint. This prevents a Light flash when Dark is saved. `js/theme.js` at the end of `<body>` owns the toggle. Do not move theme init to the bottom of the page.

---

## Responsive

Breakpoints: 1200 / 992 / 768 / 576 / 480 / 360.

Below 768px: floating bottom navigation and extra body padding for safe area.

---

## Data

Products live in `js/catalog.js` (`DSAtelier.catalog`). Home, Shop, and Product cards are generated from that catalog so they can later be replaced by PHP-rendered cards without changing `.product-card` structure.

Product Details is `product.html?id=<product-id>`. Missing or unknown `id` falls back to `oversized-graphic-tee`. View Product CTAs use that query. Related cards use the same URL pattern. Direct URLs, refresh, and back/forward are full page loads.
