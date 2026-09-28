# Frontend Architecture — DS ATELIER

Standalone static frontend. No bundler. No backend in this phase.

---

## Directory layout

```
/
  index.html                 Home page
  shop.html                  Shop page
  product.html               Product page
  about.html                 About page
  policy.html                Policy page
  support.html               Support page
  css/
    style.css                GLOBAL design system
    header.css               Header structure
    footer.css               Footer structure
    home.css                 Home-only layout
    shop.css                 Shop-only layout
    product.css              Product-only layout
    about.css                About-only layout
    policy.css               Policy-only layout
    support.css              Support-only layout
  js/
    theme.js                 Light/dark persistence
    main.js                  Home mock products, drawer, newsletter
    shop.js                  Shop filters, sort, pagination
    product.js               Product gallery, configuration, upload UI
    policy.js                Policy section navigation
    support.js               Support search, FAQ accordion, contact form
  components/
    header.html              Reusable header markup
    footer.html              Reusable footer markup
    product-card.html        Product card template
  assets/
    *.svg                    Home section illustrations
    images/brand/
      logo-full.png
      logo-icon.png
      logo-wordmark.png
```

`index.html` currently inlines header and footer markup (same structure as `components/`). Keep them visually identical when pages are split later.

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

Load order on every page:

`style.css` → component CSS → page CSS

Do not duplicate `.btn`, `.card`, `.product-card`, or form field skins inside page CSS.
Do not add another global override stylesheet.

---

## JavaScript

| File | Role |
|---|---|
| `js/theme.js` | Reads/writes `ds-atelier-theme`, sets `html[data-theme]` |
| `js/main.js` | Mock product grid, cart badge demo, mobile drawer, newsletter preventDefault |
| `js/shop.js` | Shop filters, sort, pagination, mock catalog |
| `js/product.js` | Product gallery, required configuration, upload UI, estimated total |
| `js/policy.js` | Policy sidebar / mobile section navigation |
| `js/support.js` | Support search, FAQ accordion, frontend contact form |

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
| FAQ | not built; use global typography/cards when added |

---

## Pages

| Page | File | Status |
|---|---|---|
| Home | `index.html` | built |
| Shop | `shop.html` | built |
| Product | `product.html` | built |
| About | `about.html` | built |
| Policy | `policy.html` | built |
| Support | `support.html` | built |
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

---

## Responsive

Breakpoints: 1200 / 992 / 768 / 576 / 480 / 360.

Below 768px: floating bottom navigation and extra body padding for safe area.

---

## Data

Products are a JS array. Markup is generated so it can later be replaced by PHP-rendered cards without changing `.product-card` structure.
