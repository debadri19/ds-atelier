# Frontend Architecture — DS ATELIER

Standalone static frontend plus Phase 2 customer authentication, Phase 3 read-only catalog APIs, Phase 4 persistent cart/wishlist, and Phase 5 checkout/order creation. No bundler. Dashboard authentication remains frontend-only.

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
  cart.html                  Cart (Phase 4 server cart)
  checkout.html              Checkout (Phase 5 pending-payment orders)
  wishlist.html              Wishlist (Phase 4 server wishlist)
  order-success.html         Order success (Phase 5 server order)
  auth.html                  Customer authentication (canonical)
  login.html                 Compatibility redirect → auth.html#login
  register.html              Compatibility redirect → auth.html#register
  forgot-password.html       Compatibility redirect → auth.html#forgot-password
  reset-password.html        Compatibility redirect → auth.html#reset-password
  dashboard/
    index.html               Dashboard overview
    categories.html          Category management
    products.html            Product management
    designs.html             Designs / artworks
    media.html               Media / mockups
    auth.html                Dashboard authentication (canonical)
    login.html               Compatibility redirect → dashboard/auth.html
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
    commerce.css             Shared cart/wishlist commerce layout
    checkout.css             Checkout layout
    auth.css                 Customer authentication layout
    admin.css                Dashboard layout (internal admin* class names)
    admin-login.css          Dashboard authentication layout
  js/
    theme.js                 Light/dark persistence
    catalog.js               Catalog API client plus development mock fallback
    artworks.js              Canonical frontend artwork dataset
    main.js                  Home featured products, drawer, newsletter
    designs.js               Designs category filter and artwork grid
    design.js                Artwork detail hydration, available products, PDP handoff
    shop.js                  Shop filters, sort, pagination
    product.js               Product gallery, configuration, upload UI
    policy.js                Policy section navigation
    support.js               Support search, FAQ accordion, contact form
    account.js               Account dashboard sections, demo orders, addresses, profile
    commerce.js              Server cart/wishlist/checkout client with localStorage migration
    cart.js                  Cart page
    checkout.js              Checkout page (Phase 5 quote/place)
    order-success.js         Order confirmation (Phase 5 server order)
    wishlist.js              Wishlist page
    auth.js                  Customer authentication states (PHP/JSON in Phase 2)
    admin-data.js            Dashboard session demo data (`ds-atelier-admin-demo`)
    admin.js                 Dashboard shell, nav, toast, confirm modal
    admin-login.js           Dashboard authentication states
    admin-categories.js      Category CRUD against the shared demo store
    admin-products.js        Product CRUD, dashboard totals, Recent Products
    admin-designs.js         Design / artwork demo management
    admin-media.js           Media / mockup demo management
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
| `commerce.css` | Cart / Wishlist | exists |
| `checkout.css` | Checkout | exists |
| `auth.css` | Customer auth | exists |
| `about.css` | About | exists |
| `support.css` | Support | exists |
| `policy.css` | Policy | exists |
| `account.css` | Account | exists |
| `admin.css` | Dashboard | exists |

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
| `js/commerce.js` | Server cart/wishlist/checkout client, CSRF, guest cookie, localStorage migration |
| `js/cart.js` | Cart page |
| `js/checkout.js` | Checkout page (quote/place pending-payment orders) |
| `js/order-success.js` | Order confirmation (loads server order by ref) |
| `js/wishlist.js` | Wishlist page |
| `js/auth.js` | Customer authentication hash states |
| `js/admin-data.js` | Dashboard demo catalog in namespaced `sessionStorage`; `DSAtelier.admin.data` |
| `js/admin.js` | Dashboard shell, sidebar, theme, toast, confirm modal |
| `js/admin-login.js` | Dashboard authentication hash states |
| `js/admin-categories.js` | Category list/add/edit/delete for `dashboard/categories.html` |
| `js/admin-products.js` | Product list/add/edit/delete for `dashboard/products.html` |
| `js/admin-designs.js` | Designs demo management |
| `js/admin-media.js` | Media demo management |

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
| Account | `account.html` | built (frontend demo) |
| Cart | `cart.html` | built (Phase 4 server cart) |
| Checkout | `checkout.html` | built (Phase 5 pending-payment orders) |
| Order success | `order-success.html` | built (Phase 5 server order; pending payment) |
| Wishlist | `wishlist.html` | built (Phase 4 server wishlist) |
| Customer auth | `auth.html` | built (frontend demo; local uncommitted canonical) |
| Dashboard | `dashboard/index.html` | built (frontend demo) |
| Dashboard auth | `dashboard/auth.html` | built (frontend demo) |
| Custom Order | Home `#custom-printing` | dedicated page not in this repo |
| Bulk Orders | Home `#bulk` | dedicated page not in this repo |
| Dropshipping | Home `#dropshipping` | dedicated page not in this repo |
| FAQ | Support `#faq` | dedicated page not built |
| Contact | Support contact form | dedicated page not built |

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

Products live in `backend/public/catalog/*.php` at runtime, with `js/catalog.js` as development/demo fallback. Cart and wishlist persist in `ds_atelier_dev` through `js/commerce.js`. Checkout still uses frontend-only address/order demo data.

Product Details is `product.html?id=<product-id>`. Missing or unknown `id` falls back to `oversized-graphic-tee`. View Product CTAs use that query. Related cards use the same URL pattern. Direct URLs, refresh, and back/forward are full page loads.
