# DS ATELIER — Project Audit and Pending Record

**Project scope:** DS ATELIER only. MoonAura Crystals is a separate project and is not part of this record.

**Current verification date:** 2026-10-11  
**Workspace HEAD:** `555d3959e59117f191aaa6f46861979d224ed23c` (`Customer Login and Passward Forget UI Change`)  
**Branch:** `main`, reported up to date with `origin/main`  
**Historical audit reference:** `DS_ATELIER_PENDING_AND_AUDIT_2026-10-11.md` (attached 2026-10-11 working baseline). That file is not treated as fully current; statuses below were checked against this workspace.

This record separates **page existence**, **frontend-demo behavior**, **backend integration**, and **production QA**. Presence of an HTML/JS file is not production completeness.

---

## Confirmed Pending

These items are supported by the current workspace and/or the 2026-10-11 historical audit.

### P1 — Connect storefront to the existing Core PHP/MySQL backend

Required future implementation.

- Catalog still lives in `js/catalog.js` mock data.
- Customer auth is Phase 2 PHP against `ds_atelier_dev`. Account, addresses, wishlist and order history remain frontend/demo stores (`localStorage` / `sessionStorage`).
- Cart and Checkout pages exist, but totals, stock, shipping, tax and payment are not server-validated.
- Success/error copy is demo-only.

**Evidence:** `docs/BACKEND_INTEGRATION.md` still states catalog/cart/checkout are not done; `js/catalog.js`, `js/commerce.js`, `js/checkout.js` remain client-side. Customer `js/auth.js` posts to `backend/public/customer/*.php` (Phase 2).

### P2 — Production catalog and artwork data

Required future implementation.

- Replace mock products and SVG/placeholder imagery with approved production catalog, mockups, categories, variants, pricing and stock.
- Connect Designs/Artwork records and product-artwork mappings to persistent backend data.
- Preserve existing frontend layout during content migration.

**Evidence:** `js/catalog.js` and `js/artworks.js` are frontend datasets; `docs/PRODUCT_GUIDE.md` describes them as presentation placeholders.

### P3 — Dashboard production functionality

Required future implementation.

- `js/admin.js` still treats Orders, Customers, Discounts and Settings as placeholder sections.
- Categories, Products, Designs and Media pages exist as frontend demos (`dashboard/*.html` plus `js/admin-*.js`) using a namespaced browser demo store, not durable backend CRUD or media storage.

**Evidence:** `PLACEHOLDERS` in `js/admin.js`; dashboard pages present; `js/admin-data.js` session demo store.

### P4 — Dedicated Custom Order / Bulk Orders / Dropshipping pages

Unresolved against older notes; **not** confirmed as missing product features in the current frontend.

- This workspace has **no** `custom-order.php`, `bulk-orders.php` or `dropshipping.php`.
- Home sections for Custom Order, Bulk Orders and Dropshipping exist (`index.html` anchors).
- Older notes elsewhere reported dedicated PHP pages as shipped. Until a backend repository is checked, do not mark those PHP pages complete or definitively unfinished.

**Current frontend fact:** dedicated storefront routes for those three services are not present here. Home sections are present.

### P6 — Production end-to-end QA (after backend work)

Required after P1–P3, not a current frontend blocker.

- Real product → cart → checkout → payment → order confirmation → account history is not testable against a backend in this repo.
- Customer **authentication UI** QA was executed in this workspace on 2026-10-11 and passed (see Completed). Do not rebuild that UI unless a new regression is found.

### P7 — Git synchronization

Confirmed pending until the project owner explicitly asks to commit/push.

- Working tree is **not clean**.
- Authentication rename/redirect work is present locally and **not committed**.
- Do not commit or push without owner approval.

**Evidence (2026-10-11 workspace `git status`):**

Modified: `css/auth.css`, `dashboard/forgot-password.html`, `dashboard/login.html`, `forgot-password.html`, `js/account.js`, `js/auth.js`, `js/main.js`, `login.html`, `register.html`, `reset-password.html`

Untracked: `auth.html`, `dashboard/auth.html`

HEAD remains `555d3959e59117f191aaa6f46861979d224ed23c`. `origin/main` matches that commit. Local `master` (`9737233`) is an unrelated initial commit and was left in place.

---

## Completed / Verified

Verified against files in this workspace on 2026-10-11, and against Playwright runs executed in this session (not re-run during this documentation task).

### Storefront pages present (frontend)

Home, Shop, Product, About, Policy, Support, Account, Cart, Checkout, Wishlist, Designs, Design detail, Order Success. These are **built as frontend pages**. Cart/Checkout/Account/Wishlist are **not** production backend flows.

### Dashboard pages present (frontend demo)

`dashboard/index.html`, `dashboard/categories.html`, `dashboard/products.html`, `dashboard/designs.html`, `dashboard/media.html`, plus dashboard authentication (below). The removed `admin/` directory remains absent.

### Customer authentication UI and route consolidation

Canonical page: `auth.html`

States: `#login`, `#register`, `#forgot-password`, `#reset-password`

Legacy redirects retained: `login.html`, `register.html`, `forgot-password.html`, `reset-password.html` (query string before hash; `location.replace()`).

Registration fields remain on the shared card: Full Name, Email, Mobile, Password, Confirm Password, Terms. Phase 2 stores hashed passwords in `ds_atelier_dev`. SMTP is not configured, so forgot-password does not send email.

**QA (executed 2026-10-11, before this documentation task):**

- Registration-as-fourth-state Playwright: 20/20 PASS.
- Auth rename Playwright: required customer cases PASS (four states, Back/Forward, validation, toggles, query-before-hash, four legacy redirects, full reset query string, unknown hash → login, no redirect loops). One extra case (`login.html?ref=home#register`) first FAIL due to leftover demo session; retest with a clean session PASS.

Customer backend authentication is Phase 2 (implemented locally, not committed). Catalog/cart/checkout backend work remains under P1. Dashboard authentication remains demo/UI-only.

### Dashboard authentication UI and route rename

Canonical page: `dashboard/auth.html`

States: `#login`, `#forgot-password`, `#reset-password`

Legacy redirects retained: `dashboard/login.html`, `dashboard/forgot-password.html`.

Separate from customer `auth.html` / `js/auth.js`. Uses `css/admin-login.css` and `js/admin-login.js`. Relative asset paths (`../css`, `../js`, `../assets`) remain valid.

**QA (executed 2026-10-11):** direct load, state/validation, `dashboard/login.html` redirect, query/hash preservation, assets, and independence from customer auth PASS.

Dashboard authentication remains demo/UI-only.

### Header search (frontend)

`js/main.js` implements a search modal (recent/popular chips, catalog/artwork suggestions). It is **not** only a header icon. Search is still frontend-only against mock data; it is not a backend search API.

### Theme / responsive shell

Light/Dark via `ds-atelier-theme` and in-page blocking theme script remain in use. Auth rename QA also checked light/dark and mobile card layout PASS.

---

## Needs Verification

Do not promote these to Confirmed Pending or Completed without more evidence.

| Item | Why unresolved |
|---|---|
| Dedicated PHP service pages (`custom-order.php`, `bulk-orders.php`, `dropshipping.php`) in another backend repo | Absent here; older notes claimed they shipped. See P4. |
| Whether Header Search should be documented as “complete” for launch | Frontend modal exists; production/backend search does not. |
| Whether Dashboard Orders / Customers / Discounts / Settings should be built or explicitly deferred for launch | Placeholder modules exist; product owner has not recorded a launch-scope decision in this repo. |
| Whether uncommitted auth files match a later remote commit | Local HEAD is still `555d395`; auth rename is only in the working tree. |
| Historical ZIP vs this workspace file-for-file | The 2026-10-11 attached audit reviewed `DS_ATELIER_57_Auth.html implemented.zip`. This record verified the current `/workspace` tree instead of re-extracting that ZIP. |

---

## Demo-only limitations versus real backend

| Area | Current (frontend) | Not present |
|---|---|---|
| Catalog | `js/catalog.js` mock products | PHP product queries, stock, production imagery |
| Artwork | `js/artworks.js` mock dataset | Persistent artwork/product mapping |
| Cart / Checkout | `cart.html`, `checkout.html`, `js/commerce.js` localStorage | Server cart, payment capture, tax/shipping authority |
| Customer auth | `auth.html` + `js/auth.js` + PHP session on `ds_atelier_dev` | SMTP password-reset email (not configured) |
| Account / orders | `account.html` demo orders | Server order history |
| Wishlist | `wishlist.html` local store | Server wishlist |
| Dashboard | session demo store; placeholder commerce modules | Persistent CRUD, media uploads, admin auth |
| Payments | Footer badge labels / demo checkout copy | Gateway verification |

Do not describe Cart, Checkout, Account, Wishlist, or Auth as “not built.” Describe backend/production behavior as pending.

---

## Outstanding backend and production integration

Supported by current files and `docs/BACKEND_INTEGRATION.md`:

- Core PHP/MySQL wiring for products, cart, checkout, payment, auth, sessions, orders, tax, wishlist, admin
- Server-side validation of price, discount, stock, shipping and tax
- Durable media storage for Dashboard Media/mockups
- Production end-to-end QA after that wiring (P6)

This frontend repository has no Node build step. Phase 1 added `backend/` foundation files. Phase 2 added customer auth tables and PHP/JSON handlers against `ds_atelier_dev`. Catalog/cart/checkout handlers are not present.

---

## Known documentation / source discrepancies

Recorded 2026-10-11. Several of these are corrected in the same documentation pass as this file.

| Source (as found) | Workspace fact |
|---|---|
| `README.md` / `PROJECT_STATUS.md` said Cart and Checkout were not built | `cart.html` and `checkout.html` exist, with `css/commerce.css`, `css/checkout.css`, `js/cart.js`, `js/checkout.js` |
| Same docs said Header Search is only a visual placeholder | `js/main.js` has a working frontend search modal |
| `docs/FRONTEND_ARCHITECTURE.md` omitted Cart/Checkout/auth/dashboard Designs/Media and listed `cart.css` as not built | Pages and `css/commerce.css` / `css/auth.css` / `css/admin-login.css` exist |
| `docs/BACKEND_INTEGRATION.md` said Checkout/Wishlist/Orders/Auth were unbuilt | Frontend pages exist; backend wiring does not |
| `CHANGELOG.md` “Unreleased” listed Cart/Checkout as unimplemented pages | Pages exist; backend remains unimplemented |
| `AI_INSTRUCTIONS.md` still says Header Search is a visual placeholder only | Frontend search modal exists. Left unchanged in this pass (agent-rules file; not a status summary). |
| Docs listed Dashboard Categories/Products but not Designs/Media | `dashboard/designs.html` and `dashboard/media.html` exist |
| Canonical customer auth still named `login.html` in older notes | Canonical file is now uncommitted `auth.html` |

---

## Authentication rename and compatibility redirects

**Status in this workspace (2026-10-11): implemented locally, not committed.**

Customer canonical: `auth.html#login` / `#register` / `#forgot-password` / `#reset-password`

Customer redirects: `login.html`, `register.html`, `forgot-password.html`, `reset-password.html` → `auth.html` + preserved search + hash

Dashboard canonical: `dashboard/auth.html#login` / `#forgot-password` / `#reset-password`

Dashboard redirects: `dashboard/login.html`, `dashboard/forgot-password.html` → `dashboard/auth.html` + preserved search + hash

Internal customer links updated in uncommitted `js/auth.js` and `js/account.js` (`auth.html#login`). `js/main.js` `PAGE_ASSETS` includes `auth.html` only for the canonical customer page (legacy files are full-page redirects, not soft-nav targets).

The two systems remain separate. `admin/` remains absent. Internal `admin-*` identifiers may remain.

---

## Git synchronization status (2026-10-11)

Verified with `git status`, `git rev-parse HEAD`, and `git branch -vv` in this workspace.

| Fact | Value |
|---|---|
| Branch | `main` tracking `origin/main` |
| HEAD | `555d3959e59117f191aaa6f46861979d224ed23c` |
| Matches `origin/main` at that commit | Yes |
| Working tree | Dirty — auth consolidation + route rename uncommitted |
| Commit/push during 2026-10-11 auth or docs work | No |
| Safe to treat GitHub `main` as containing `auth.html` | **No** — only local working tree has `auth.html` / `dashboard/auth.html` |

Preserve all local diffs. Do not reset, revert, stash, commit, or push unless the owner asks.

---

## Items not to invent as pending

- Do not add the previously suggested generic UI-polish list (announcement transparency, header palette, CTA restyle, button slimming, etc.) unless the owner confirms them.
- Do not import MoonAura Crystals backlog.
- Do not call Cart/Checkout “not built.”
- Do not call authentication incomplete solely because backend auth is missing; the UI/route work is verified locally. Backend auth belongs under P1.
- Do not mark a feature production-complete just because its page exists.

---

## Recommended order

1. Keep uncommitted auth rename/redirects; sync Git only when the owner approves (P7).
2. Confirm production catalog requirements and connect the frontend to Core PHP/MySQL (P1, P2).
3. Decide launch scope for Dashboard placeholder modules; persist Categories/Products/Designs/Media (P3).
4. Resolve dedicated service-page notes against the backend repo (P4).
5. Run production end-to-end QA (P6).

P5 (documentation reconciliation) is the purpose of this 2026-10-11 documentation pass. Remaining stale lines may still exist in `AI_INSTRUCTIONS.md` and older changelog entries; those older entries are historical and should not be rewritten as if they were current.

---

## Project boundary

This record is for **DS ATELIER only**.

---

## Phase 1 backend foundation (2026-10-11)

Scaffold only. Not customer authentication and not storefront integration.

- New files live under `backend/`
- Existing auth/docs working-tree files were preserved
- Admin guard denies by default
- PDO live connection was later verified against dedicated `ds_atelier_dev` (`database=ok`)

## Phase 2 customer authentication (2026-10-13)

Implemented locally, not committed. Dedicated `ds_atelier_dev` only.

- Migrations applied: `customers`, `customer_password_resets`
- `auth.html` / `js/auth.js` post to `backend/public/customer/*.php`
- Tests: `backend/tests/phase2_customer_auth.php` PASS; HTTP CSRF/register/login/forgot PASS; Playwright register/login/forgot PASS
- Password-reset email: **not sent**. SMTP is not configured. Public JSON reports `email_sent: false` and never includes the raw token
- Dashboard `dashboard/auth.html` was not modified
- Catalog, cart, wishlist, checkout, payments, Newsletter, Meta Pixel/CAPI were not implemented
