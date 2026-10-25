(function (global) {
  var WISHLIST_KEY = "ds-atelier-wishlist";
  var CART_KEY = "ds-atelier-cart";
  var COUPON_KEY = "ds-atelier-coupon";
  var CART_MIGRATED_KEY = "ds-atelier-cart-migrated";
  var WISHLIST_MIGRATED_KEY = "ds-atelier-wishlist-migrated";
  var COLLECTION_IDS = ["minimal-hoodie", "custom-tote-bag", "caps", "sublimation-cushion"];
  var SHIPPING_THRESHOLD = 999;
  var SHIPPING_FEE = 79;
  var API = {
    csrf: "backend/public/customer/csrf.php",
    cartGet: "backend/public/cart/get.php",
    cartAdd: "backend/public/cart/add.php",
    cartUpdate: "backend/public/cart/update.php",
    cartRemove: "backend/public/cart/remove.php",
    cartClear: "backend/public/cart/clear.php",
    cartMigrate: "backend/public/cart/migrate.php",
    wishlistGet: "backend/public/wishlist/get.php",
    wishlistAdd: "backend/public/wishlist/add.php",
    wishlistRemove: "backend/public/wishlist/remove.php",
    wishlistToggle: "backend/public/wishlist/toggle.php",
    wishlistMigrate: "backend/public/wishlist/migrate.php",
    checkoutQuote: "backend/public/checkout/quote.php",
    checkoutPlace: "backend/public/checkout/place.php",
    checkoutOrder: "backend/public/checkout/order.php",
    checkoutOrders: "backend/public/checkout/orders.php",
    customerOrders: "backend/public/customer/orders.php",
    customerInvoice: "backend/public/customer/invoice.php",
    customerInvoiceDownload: "backend/public/customer/invoice-download.php"
  };

  function catalog() {
    return global.DSAtelier && global.DSAtelier.catalog;
  }

  function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function forceEmpty() {
    try {
      return new URLSearchParams(global.location.search).get("empty") === "1";
    } catch (e) {
      return false;
    }
  }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function flag(key) {
    try {
      return localStorage.getItem(key) === "1";
    } catch (e) {
      return false;
    }
  }

  function setFlag(key) {
    try {
      localStorage.setItem(key, "1");
    } catch (e) {}
  }

  var csrfToken = "";
  var bootPromise = null;
  var state = {
    ready: false,
    loading: false,
    source: "pending",
    error: null,
    cart: emptyCart(),
    wishlistIds: [],
    wishlistItems: [],
    coupon: forceEmpty() ? "" : (read(COUPON_KEY, "") || ""),
    quote: null
  };

  function emptyCart() {
    return {
      id: null,
      owner: "anonymous",
      items: [],
      count: 0,
      subtotal: 0,
      mrp: 0,
      discount: 0,
      warnings: []
    };
  }

  function emit() {
    syncCounts();
    try {
      document.dispatchEvent(new CustomEvent("ds-atelier-commerce"));
    } catch (e) {}
  }

  function persistCoupon() {
    if (!forceEmpty()) write(COUPON_KEY, state.coupon);
  }

  function persistLocalFallback() {
    if (forceEmpty() || state.source === "api") return;
    write(CART_KEY, state.cart.items.map(function (item) {
      return {
        id: item.id,
        color: item.color,
        size: item.size,
        printType: item.printType,
        printPosition: item.printPosition,
        artworkId: item.artworkId || "",
        artworkName: item.artworkName || "",
        qty: item.qty,
        variantId: item.variantId
      };
    }));
    write(WISHLIST_KEY, state.wishlistIds.slice());
  }

  function localCartRows() {
    if (forceEmpty()) return [];
    var stored = read(CART_KEY, null);
    return Array.isArray(stored) ? stored : [];
  }

  function localWishlistIds() {
    if (forceEmpty()) return [];
    var stored = read(WISHLIST_KEY, null);
    return Array.isArray(stored) ? stored.filter(Boolean) : [];
  }

  function applyCart(payload) {
    state.cart = payload && typeof payload === "object" ? payload : emptyCart();
    if (!Array.isArray(state.cart.items)) state.cart.items = [];
    state.cart.count = Number(state.cart.count || 0);
    state.cart.subtotal = Number(state.cart.subtotal || 0);
    state.cart.mrp = Number(state.cart.mrp || 0);
    state.cart.discount = Number(state.cart.discount || 0);
    state.cart.warnings = Array.isArray(state.cart.warnings) ? state.cart.warnings : [];
  }

  function applyWishlist(payload) {
    var ids = payload && Array.isArray(payload.productIds) ? payload.productIds.slice() : [];
    var items = payload && Array.isArray(payload.items) ? payload.items.slice() : [];
    state.wishlistIds = ids;
    state.wishlistItems = items;
    items.forEach(function (item) {
      var cat = catalog();
      if (cat && item && item.id) {
        try { cat.products && (void 0); } catch (e) {}
      }
    });
  }

  function ensureCsrf() {
    if (csrfToken) return Promise.resolve(csrfToken);
    return fetch(API.csrf, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    }).then(function (response) {
      return response.json().catch(function () { return {}; });
    }).then(function (data) {
      if (data && data.csrf) csrfToken = data.csrf;
      return csrfToken;
    });
  }

  function parseJson(response) {
    return response.json().catch(function () {
      return { ok: false, error: "Something went wrong. Please try again later." };
    }).then(function (data) {
      if (!data || typeof data !== "object") data = {};
      if (data.csrf) csrfToken = data.csrf;
      data.status = response.status;
      return data;
    });
  }

  function postJson(url, payload) {
    payload = payload || {};
    return ensureCsrf().then(function () {
      payload._csrf = csrfToken;
      return fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken
        },
        body: JSON.stringify(payload)
      });
    }).then(parseJson);
  }

  function getJson(url) {
    return fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    }).then(parseJson);
  }

  function networkError() {
    return { ok: false, error: "Unable to reach the cart service. Please try again.", code: 503 };
  }

  function applySuccess(data) {
    if (data && data.cart) applyCart(data.cart);
    if (data && data.wishlist) applyWishlist(data.wishlist);
    state.source = "api";
    state.error = null;
    emit();
    return data;
  }

  function getProduct(id) {
    var cat = catalog();
    return cat && cat.getById ? cat.getById(id) : null;
  }

  function cartLineId(row) {
    return [row.id, row.color, row.size, row.printType, row.printPosition, row.artworkId || ""].join("|");
  }

  function defaultConfig(product) {
    return {
      id: product.id,
      color: (product.colors && product.colors[0]) || product.color || "Black",
      size: (product.sizes && product.sizes[0]) || "M",
      printType: (product.printTypes && product.printTypes[0]) || "DTF",
      printPosition: "Front",
      qty: 1
    };
  }

  function variantAllowed(product, extras) {
    var cat = catalog();
    if (!product) return false;
    var color = extras && extras.color;
    var size = extras && extras.size;
    if (!color || !size) return false;
    if (cat && cat.variantPurchasable) return cat.variantPurchasable(product, color, size);
    if (!Array.isArray(product.variants) || !product.variants.length) return true;
    var variant = cat && cat.findVariant ? cat.findVariant(product, color, size) : null;
    if (!variant) return false;
    if (product.availability === "Made to order") return variant.active !== false;
    return variant.active !== false && Number(variant.stock || 0) > 0;
  }

  function productFromCartItem(item) {
    var existing = getProduct(item.id);
    if (existing) {
      return existing;
    }
    return {
      id: item.id,
      name: item.name,
      image: item.image,
      alt: item.alt || item.name,
      price: item.unitPrice || item.price,
      mrp: item.unitMrp || item.mrp,
      sku: item.sku
    };
  }

  function cartItems() {
    return (state.cart.items || []).map(function (item, index) {
      var product = productFromCartItem(item);
      var qty = Number(item.qty || 0);
      var unitPrice = Number(item.unitPrice != null ? item.unitPrice : item.price || 0);
      var unitMrp = Number(item.unitMrp != null ? item.unitMrp : item.mrp || 0);
      return {
        index: index,
        itemId: item.itemId,
        row: {
          id: item.id,
          color: item.color,
          size: item.size,
          printType: item.printType,
          printPosition: item.printPosition,
          artworkId: item.artworkId || "",
          artworkName: item.artworkName || "",
          qty: qty,
          variantId: item.variantId,
          sku: item.sku,
          price: unitPrice,
          mrp: unitMrp,
          lineKey: item.lineKey
        },
        product: product,
        lineMrp: Number(item.lineMrp != null ? item.lineMrp : unitMrp * qty),
        linePrice: Number(item.linePrice != null ? item.linePrice : unitPrice * qty),
        purchasable: item.purchasable !== false,
        issues: item.issues || []
      };
    });
  }

  function cartCount() {
    return Number(state.cart.count || 0);
  }

  function wishlistIds() {
    return state.wishlistIds.slice();
  }

  function wishlistItems() {
    if (state.wishlistItems.length) return state.wishlistItems.slice();
    return state.wishlistIds.map(getProduct).filter(Boolean);
  }

  function inWishlist(id) {
    return state.wishlistIds.indexOf(id) !== -1;
  }

  function totals() {
    var items = cartItems();
    var mrp = 0;
    var price = 0;
    items.forEach(function (item) {
      mrp += Number(item.lineMrp || 0);
      price += Number(item.linePrice || 0);
    });
    var discount = Math.max(0, mrp - price);
    if (state.coupon === "WELCOME10" && price) {
      var extra = Math.round(price * 0.1);
      discount += extra;
      price -= extra;
    }
    var shipping = !items.length || price >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return {
      mrp: mrp,
      discount: discount,
      shipping: shipping,
      total: price + shipping,
      coupon: state.coupon
    };
  }

  function applyCoupon(code) {
    var next = String(code || "").trim().toUpperCase();
    state.coupon = next;
    persistCoupon();
    emit();
    return next;
  }

  function clearCoupon() {
    state.coupon = "";
    persistCoupon();
    emit();
  }

  function quoteCheckout(coupon) {
    var code = coupon != null ? String(coupon).trim().toUpperCase() : state.coupon;
    return withReady(function () {
      return postJson(API.checkoutQuote, { coupon: code }).then(function (data) {
        if (data && data.ok && data.quote) {
          state.quote = data.quote;
          if (data.cart) applyCart(data.cart);
          state.error = null;
          emit();
          return data;
        }
        state.quote = null;
        state.error = (data && data.error) || "Unable to calculate checkout totals.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to calculate checkout totals.");
      });
    });
  }

  function placeOrder(payload) {
    payload = payload || {};
    if (!payload.idempotencyKey) {
      payload.idempotencyKey = "chk_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
    }
    return withReady(function () {
      return postJson(API.checkoutPlace, payload).then(function (data) {
        if (data && data.ok && data.order) {
          if (data.cart) applyCart(data.cart);
          state.coupon = "";
          persistCoupon();
          state.quote = null;
          state.error = null;
          emit();
          return data;
        }
        if (data && data.cart) applyCart(data.cart);
        state.error = (data && data.error) || "Unable to place this order.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to place this order.");
      });
    });
  }

  function getOrder(ref) {
    var query = "ref=" + encodeURIComponent(ref || "");
    return getJson(API.checkoutOrder + "?" + query).then(function (data) {
      return data || { ok: false, error: "Order not found." };
    }).catch(function () {
      return { ok: false, error: "Unable to load this order." };
    });
  }

  function invoiceDownloadUrl(number) {
    return API.customerInvoiceDownload + "?number=" + encodeURIComponent(number || "");
  }

  function getInvoice(params) {
    var query = [];
    if (params && params.number) query.push("number=" + encodeURIComponent(params.number));
    if (params && params.ref) query.push("ref=" + encodeURIComponent(params.ref));
    var url = API.customerInvoice + (query.length ? "?" + query.join("&") : "");
    return getJson(url).then(function (data) {
      return data || { ok: false, error: "Invoice not found." };
    }).catch(function () {
      return { ok: false, error: "Unable to load this invoice." };
    });
  }

  function listOrders(params) {
    var query = [];
    if (params && params.page) query.push("page=" + encodeURIComponent(params.page));
    if (params && (params.perPage || params.per_page)) {
      query.push("per_page=" + encodeURIComponent(params.perPage || params.per_page));
    }
    var url = API.customerOrders + (query.length ? "?" + query.join("&") : "");
    return getJson(url).then(function (data) {
      return data || { ok: false, error: "Unable to load your orders." };
    }).catch(function () {
      return { ok: false, error: "Unable to load your orders." };
    });
  }

  function excludeIds(base, extra) {
    var skip = {};
    (extra || []).forEach(function (id) { skip[id] = true; });
    return base.filter(function (item) { return item && !skip[item.id]; });
  }

  function recommended(limit, extraSkip) {
    var cat = catalog();
    var max = limit || 4;
    var skip = (extraSkip || []).concat(state.wishlistIds, (state.cart.items || []).map(function (row) { return row.id; }));
    var pool = [];
    if (cat && cat.getFeatured) pool = pool.concat(cat.getFeatured());
    if (cat && cat.getAll) pool = pool.concat(cat.getAll());
    var seen = {};
    var unique = [];
    pool.forEach(function (item) {
      if (!item || seen[item.id]) return;
      seen[item.id] = true;
      unique.push(item);
    });
    return excludeIds(unique, skip).slice(0, max);
  }

  function collection(limit) {
    var max = limit || 4;
    var skip = (state.cart.items || []).map(function (row) { return row.id; });
    var items = COLLECTION_IDS.map(getProduct).filter(Boolean);
    var list = excludeIds(items, skip);
    if (list.length < max) list = list.concat(recommended(max, skip.concat(list.map(function (item) { return item.id; }))));
    var seen = {};
    return list.filter(function (item) {
      if (seen[item.id]) return false;
      seen[item.id] = true;
      return true;
    }).slice(0, max);
  }

  function card(item, opts) {
    opts = opts || {};
    var cat = catalog();
    var url = cat ? cat.productUrl(item.id) : "product.html?id=" + encodeURIComponent(item.id);
    var heart = opts.heart
      ? '<button class="wishlist-heart' + (inWishlist(item.id) ? " is-active" : "") + '" type="button" data-wishlist-toggle="' + escapeHtml(item.id) + '" aria-label="' + (inWishlist(item.id) ? "Remove from wishlist" : "Add to wishlist") + '"><i class="fa-' + (inWishlist(item.id) ? "solid" : "regular") + ' fa-heart" aria-hidden="true"></i></button>'
      : "";
    var category = opts.category
      ? '<p class="product-card-category">' + escapeHtml(item.category) + "</p>"
      : "";
    var rating = opts.rating
      ? '<div class="rating"><span class="rating-star" aria-hidden="true">★</span><span>' + escapeHtml(item.rating) + "</span></div>"
      : "";
    var actions = "";
    if (opts.variant === "wishlist") {
      actions =
        '<div class="product-card-actions product-card-actions-wishlist">' +
          '<button class="btn btn-secondary btn-sm" type="button" data-quick-view="' + escapeHtml(item.id) + '">Quick View</button>' +
          '<button class="btn btn-primary btn-sm" type="button" data-move-cart="' + escapeHtml(item.id) + '">Move To Cart</button>' +
        "</div>";
    } else if (opts.variant === "recommend") {
      actions =
        '<div class="product-card-actions">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-quick-view="' + escapeHtml(item.id) + '">Quick View</button>' +
          '<button class="btn btn-secondary btn-sm" type="button" data-add-cart="' + escapeHtml(item.id) + '">Add To Cart</button>' +
        "</div>";
    } else if (opts.variant === "alsolike") {
      actions = '<button class="btn btn-secondary" type="button" data-add-cart="' + escapeHtml(item.id) + '">Add To Cart</button>';
    } else {
      actions = '<a class="btn btn-secondary" href="' + url + '">View Product</a>';
    }
    return (
      '<article class="product-card" data-product-id="' + escapeHtml(item.id) + '">' +
        '<div class="product-card-media">' +
          (item.badge ? '<span class="badge product-card-badge">' + escapeHtml(item.badge) + "</span>" : "") +
          heart +
          '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.alt) + '">' +
        "</div>" +
        '<div class="product-card-body">' +
          '<h3 class="product-card-name">' + escapeHtml(item.name) + "</h3>" +
          category +
          '<div class="product-card-meta">' +
            '<div class="price"><span class="price-now">' + money(item.price) + '</span><span class="price-mrp">' + money(item.mrp) + "</span></div>" +
            rating +
          "</div>" +
          actions +
        "</div>" +
      "</article>"
    );
  }

  var quickView = null;

  function closeQuickView() {
    if (!quickView) return;
    quickView.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openQuickView(id) {
    var item = getProduct(id) || wishlistItems().filter(function (row) { return row.id === id; })[0];
    if (!item) return;
    if (!quickView) {
      quickView = document.createElement("div");
      quickView.className = "quick-view";
      quickView.setAttribute("data-quick-view-modal", "");
      quickView.innerHTML =
        '<div class="quick-view-backdrop" data-quick-view-close></div>' +
        '<div class="quick-view-panel" role="dialog" aria-modal="true" aria-label="Quick view">' +
          '<button class="btn-icon quick-view-close" type="button" data-quick-view-close aria-label="Close quick view"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
          '<div class="quick-view-media"><img alt=""></div>' +
          '<div class="quick-view-body">' +
            '<p class="product-card-category" data-qv-category></p>' +
            '<h3 data-qv-name></h3>' +
            '<div class="price"><span class="price-now" data-qv-price></span><span class="price-mrp" data-qv-mrp></span></div>' +
            '<div class="quick-view-actions">' +
              '<a class="btn btn-ghost" data-qv-link href="product.html">View Product</a>' +
              '<button class="btn btn-primary" type="button" data-qv-add>Add To Cart</button>' +
            "</div>" +
          "</div>" +
        "</div>";
      document.body.appendChild(quickView);
    }
    var img = quickView.querySelector(".quick-view-media img");
    img.src = item.image;
    img.alt = item.alt || "";
    quickView.querySelector("[data-qv-category]").textContent = item.category || "";
    quickView.querySelector("[data-qv-name]").textContent = item.name;
    quickView.querySelector("[data-qv-price]").textContent = money(item.price);
    quickView.querySelector("[data-qv-mrp]").textContent = money(item.mrp);
    var cat = catalog();
    quickView.querySelector("[data-qv-link]").href = cat ? cat.productUrl(item.id) : "product.html?id=" + encodeURIComponent(item.id);
    quickView.querySelector("[data-qv-add]").setAttribute("data-add-cart", item.id);
    quickView.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function syncCounts() {
    var count = String(cartCount());
    document.querySelectorAll(".cart-count").forEach(function (el) {
      el.textContent = count;
    });
  }

  function failLocal(message) {
    state.error = message || "Unable to update your cart. Please try again.";
    persistLocalFallback();
    emit();
    return { ok: false, error: state.error };
  }

  function withReady(action) {
    return ready().then(action).catch(function () {
      return failLocal("Unable to update your cart. Please try again.");
    });
  }

  function addToCart(id, extras) {
    var product = getProduct(id);
    var row = product ? Object.assign(defaultConfig(product), extras || {}) : Object.assign({ id: id, qty: 1 }, extras || {});
    if (product && !variantAllowed(product, row)) {
      state.error = "That size and colour combination is not available.";
      emit();
      return Promise.resolve({ ok: false, error: state.error });
    }
    row.qty = Math.max(1, Number(row.qty) || 1);
    var payload = {
      productId: row.id || id,
      variantId: row.variantId || "",
      color: row.color,
      size: row.size,
      printType: row.printType,
      printPosition: row.printPosition,
      qty: row.qty,
      artworkId: row.artworkId || "",
      artworkName: row.artworkName || ""
    };
    return withReady(function () {
      return postJson(API.cartAdd, payload).then(function (data) {
        if (data && data.ok && data.cart) {
          applySuccess(data);
          return data;
        }
        state.error = (data && data.error) || "Unable to add this item to your cart.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to add this item to your cart.");
      });
    });
  }

  function setQty(index, qty) {
    var items = cartItems();
    var current = items[index];
    if (!current || !current.itemId) return Promise.resolve({ ok: false, error: "Cart item not found." });
    var next = Math.max(1, Number(qty) || 1);
    return withReady(function () {
      return postJson(API.cartUpdate, { itemId: current.itemId, qty: next }).then(function (data) {
        if (data && data.ok && data.cart) {
          applySuccess(data);
          return data;
        }
        state.error = (data && data.error) || "Unable to update quantity.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to update quantity.");
      });
    });
  }

  function removeCart(index) {
    var items = cartItems();
    var current = items[index];
    if (!current || !current.itemId) return Promise.resolve({ ok: false, error: "Cart item not found." });
    return withReady(function () {
      return postJson(API.cartRemove, { itemId: current.itemId }).then(function (data) {
        if (data && data.ok && data.cart) {
          applySuccess(data);
          return data;
        }
        state.error = (data && data.error) || "Unable to remove this item.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to remove this item.");
      });
    });
  }

  function clearCart() {
    state.coupon = "";
    persistCoupon();
    return withReady(function () {
      return postJson(API.cartClear, {}).then(function (data) {
        if (data && data.ok && data.cart) {
          applySuccess(data);
          return data;
        }
        state.error = (data && data.error) || "Unable to clear the cart.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to clear the cart.");
      });
    });
  }

  function toggleWishlist(id) {
    if (!id) return Promise.resolve();
    return withReady(function () {
      return postJson(API.wishlistToggle, { productId: id }).then(function (data) {
        if (data && data.ok && data.wishlist) {
          applySuccess(data);
          return data;
        }
        state.error = (data && data.error) || "Unable to update your wishlist.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to update your wishlist.");
      });
    });
  }

  function removeWishlist(id) {
    if (!id) return Promise.resolve();
    return withReady(function () {
      return postJson(API.wishlistRemove, { productId: id }).then(function (data) {
        if (data && data.ok && data.wishlist) {
          applySuccess(data);
          return data;
        }
        state.error = (data && data.error) || "Unable to update your wishlist.";
        emit();
        return data || { ok: false, error: state.error };
      }).catch(function () {
        return failLocal("Unable to update your wishlist.");
      });
    });
  }

  function moveToCart(id) {
    return addToCart(id).then(function (data) {
      if (data && data.ok) return removeWishlist(id);
      return data;
    });
  }

  function migrateCart() {
    if (flag(CART_MIGRATED_KEY) || forceEmpty()) return Promise.resolve({ ok: true, skipped: true });
    var rows = localCartRows();
    if (!rows.length) {
      setFlag(CART_MIGRATED_KEY);
      return Promise.resolve({ ok: true, skipped: true });
    }
    return postJson(API.cartMigrate, { items: rows }).then(function (data) {
      if (data && data.ok && data.cart) {
        applyCart(data.cart);
        setFlag(CART_MIGRATED_KEY);
        removeKey(CART_KEY);
        return data;
      }
      return data || networkError();
    });
  }

  function migrateWishlist() {
    if (flag(WISHLIST_MIGRATED_KEY) || forceEmpty()) return Promise.resolve({ ok: true, skipped: true });
    var ids = localWishlistIds();
    if (!ids.length) {
      setFlag(WISHLIST_MIGRATED_KEY);
      return Promise.resolve({ ok: true, skipped: true });
    }
    return postJson(API.wishlistMigrate, { productIds: ids }).then(function (data) {
      if (data && data.ok && data.wishlist) {
        applyWishlist(data.wishlist);
        setFlag(WISHLIST_MIGRATED_KEY);
        removeKey(WISHLIST_KEY);
        return data;
      }
      return data || networkError();
    });
  }

  function loadFromServer() {
    return Promise.all([getJson(API.cartGet), getJson(API.wishlistGet)]).then(function (results) {
      var cartData = results[0];
      var wishData = results[1];
      if (!(cartData && cartData.ok && cartData.cart) || !(wishData && wishData.ok && wishData.wishlist)) {
        throw new Error((cartData && cartData.error) || (wishData && wishData.error) || "Unable to load cart.");
      }
      applyCart(cartData.cart);
      applyWishlist(wishData.wishlist);
      state.source = "api";
      return migrateCart().then(function () {
        return migrateWishlist();
      }).then(function () {
        return Promise.all([getJson(API.cartGet), getJson(API.wishlistGet)]).then(function (fresh) {
          if (fresh[0] && fresh[0].ok && fresh[0].cart) applyCart(fresh[0].cart);
          if (fresh[1] && fresh[1].ok && fresh[1].wishlist) applyWishlist(fresh[1].wishlist);
          state.source = "api";
          state.error = null;
          state.ready = true;
          emit();
          return { ok: true, source: "api" };
        });
      });
    });
  }

  function loadLocalFallback(message) {
    var rows = localCartRows();
    state.cart = emptyCart();
    state.cart.items = rows.map(function (row, index) {
      var product = getProduct(row.id) || {};
      return {
        itemId: null,
        id: row.id,
        lineKey: cartLineId(row),
        color: row.color,
        size: row.size,
        printType: row.printType,
        printPosition: row.printPosition,
        artworkId: row.artworkId || "",
        artworkName: row.artworkName || "",
        qty: Math.max(1, Number(row.qty) || 1),
        variantId: row.variantId,
        sku: row.sku || product.sku,
        name: product.name || row.id,
        image: product.image || "",
        alt: product.alt || product.name || "",
        unitPrice: Number(row.price != null ? row.price : product.price || 0),
        unitMrp: Number(row.mrp != null ? row.mrp : product.mrp || 0),
        linePrice: 0,
        lineMrp: 0,
        purchasable: true,
        issues: []
      };
    });
    state.cart.items.forEach(function (item) {
      item.linePrice = item.unitPrice * item.qty;
      item.lineMrp = item.unitMrp * item.qty;
      state.cart.count += item.qty;
      state.cart.subtotal += item.linePrice;
      state.cart.mrp += item.lineMrp;
    });
    state.wishlistIds = localWishlistIds();
    state.wishlistItems = state.wishlistIds.map(getProduct).filter(Boolean);
    state.source = "local";
    state.error = message || null;
    state.ready = true;
    emit();
    return { ok: false, source: "local", error: state.error };
  }

  function ready() {
    if (bootPromise) return bootPromise;
    if (forceEmpty()) {
      state.cart = emptyCart();
      state.wishlistIds = [];
      state.wishlistItems = [];
      state.ready = true;
      state.source = "local";
      emit();
      bootPromise = Promise.resolve({ ok: true, source: "local" });
      return bootPromise;
    }
    state.loading = true;
    bootPromise = loadFromServer().catch(function (error) {
      return loadLocalFallback((error && error.message) || "Unable to load your cart. Showing saved browser items.");
    }).then(function (result) {
      state.loading = false;
      return result;
    });
    return bootPromise;
  }

  document.addEventListener("click", function (event) {
    var heart = event.target.closest("[data-wishlist-toggle]");
    if (heart) {
      event.preventDefault();
      toggleWishlist(heart.getAttribute("data-wishlist-toggle"));
      return;
    }
    var quick = event.target.closest("[data-quick-view]");
    if (quick && !quick.hasAttribute("data-quick-view-modal")) {
      event.preventDefault();
      openQuickView(quick.getAttribute("data-quick-view"));
      return;
    }
    if (event.target.closest("[data-quick-view-close]")) {
      closeQuickView();
      return;
    }
    var add = event.target.closest("[data-add-cart]");
    if (add && add.getAttribute("data-add-cart")) {
      event.preventDefault();
      if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(add);
      addToCart(add.getAttribute("data-add-cart"));
      closeQuickView();
      return;
    }
    var move = event.target.closest("[data-move-cart]");
    if (move) {
      event.preventDefault();
      if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(move);
      moveToCart(move.getAttribute("data-move-cart"));
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeQuickView();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ready();
    });
  } else {
    ready();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.commerce = {
    money: money,
    card: card,
    wishlistIds: wishlistIds,
    wishlistItems: wishlistItems,
    inWishlist: inWishlist,
    toggleWishlist: toggleWishlist,
    removeWishlist: removeWishlist,
    addToCart: addToCart,
    moveToCart: moveToCart,
    setQty: setQty,
    removeCart: removeCart,
    clearCart: clearCart,
    cartItems: cartItems,
    cartCount: cartCount,
    applyCoupon: applyCoupon,
    clearCoupon: clearCoupon,
    totals: totals,
    recommended: recommended,
    collection: collection,
    coupon: function () { return state.coupon; },
    forceEmpty: forceEmpty,
    ready: ready,
    error: function () { return state.error; },
    source: function () { return state.source; },
    loading: function () { return state.loading; },
    cartLineId: cartLineId,
    quoteCheckout: quoteCheckout,
    placeOrder: placeOrder,
    getOrder: getOrder,
    listOrders: listOrders,
    getInvoice: getInvoice,
    invoiceDownloadUrl: invoiceDownloadUrl,
    lastQuote: function () { return state.quote; }
  };
})(window);
