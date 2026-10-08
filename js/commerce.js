(function (global) {
  var WISHLIST_KEY = "ds-atelier-wishlist";
  var CART_KEY = "ds-atelier-cart";
  var COUPON_KEY = "ds-atelier-coupon";
  var DEFAULT_WISHLIST = ["anime-graphic-tee", "oversized-graphic-tee", "minimal-hoodie", "custom-tote-bag"];
  var DEFAULT_CART = [
    { id: "oversized-graphic-tee", color: "Cream", size: "L", printType: "DTF", printPosition: "Front", qty: 1 },
    { id: "anime-graphic-tee", color: "Black", size: "M", printType: "DTF", printPosition: "Front + Back", qty: 2 }
  ];
  var COLLECTION_IDS = ["minimal-hoodie", "custom-tote-bag", "caps", "sublimation-cushion"];
  var SHIPPING_THRESHOLD = 999;
  var SHIPPING_FEE = 79;

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

  function seededWishlist() {
    if (forceEmpty()) return [];
    var stored = read(WISHLIST_KEY, null);
    if (stored) return stored;
    write(WISHLIST_KEY, DEFAULT_WISHLIST.slice());
    return DEFAULT_WISHLIST.slice();
  }

  function seededCart() {
    if (forceEmpty()) return [];
    var stored = read(CART_KEY, null);
    if (stored) return stored;
    write(CART_KEY, DEFAULT_CART.map(function (row) { return Object.assign({}, row); }));
    return DEFAULT_CART.map(function (row) { return Object.assign({}, row); });
  }

  var state = {
    wishlist: seededWishlist(),
    cart: seededCart(),
    coupon: forceEmpty() ? "" : (read(COUPON_KEY, "") || "")
  };

  function emit() {
    syncCounts();
    try {
      document.dispatchEvent(new CustomEvent("ds-atelier-commerce"));
    } catch (e) {}
  }

  function persist() {
    if (!forceEmpty()) {
      write(WISHLIST_KEY, state.wishlist);
      write(CART_KEY, state.cart);
      write(COUPON_KEY, state.coupon);
    }
    emit();
  }

  function getProduct(id) {
    var cat = catalog();
    return cat && cat.getById ? cat.getById(id) : null;
  }

  function wishlistIds() {
    return state.wishlist.slice();
  }

  function wishlistItems() {
    return state.wishlist.map(getProduct).filter(Boolean);
  }

  function inWishlist(id) {
    return state.wishlist.indexOf(id) !== -1;
  }

  function toggleWishlist(id) {
    if (!id) return;
    var i = state.wishlist.indexOf(id);
    if (i === -1) state.wishlist.push(id);
    else state.wishlist.splice(i, 1);
    persist();
  }

  function removeWishlist(id) {
    state.wishlist = state.wishlist.filter(function (item) { return item !== id; });
    persist();
  }

  function cartLineId(row) {
    return [row.id, row.color, row.size, row.printType, row.printPosition].join("|");
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

  function addToCart(id, extras) {
    var product = getProduct(id);
    if (!product) return;
    var row = Object.assign(defaultConfig(product), extras || {});
    row.qty = Math.max(1, Number(row.qty) || 1);
    var match = state.cart.find(function (item) { return cartLineId(item) === cartLineId(row); });
    if (match) match.qty += row.qty;
    else state.cart.push(row);
    persist();
  }

  function moveToCart(id) {
    addToCart(id);
    removeWishlist(id);
  }

  function setQty(index, qty) {
    if (!state.cart[index]) return;
    var next = Math.max(1, Number(qty) || 1);
    state.cart[index].qty = next;
    persist();
  }

  function removeCart(index) {
    state.cart.splice(index, 1);
    persist();
  }

  function cartItems() {
    return state.cart.map(function (row, index) {
      var product = getProduct(row.id);
      if (!product) return null;
      return {
        index: index,
        row: row,
        product: product,
        lineMrp: product.mrp * row.qty,
        linePrice: product.price * row.qty
      };
    }).filter(Boolean);
  }

  function cartCount() {
    return state.cart.reduce(function (sum, row) { return sum + (Number(row.qty) || 0); }, 0);
  }

  function applyCoupon(code) {
    var next = String(code || "").trim().toUpperCase();
    state.coupon = next === "WELCOME10" ? "WELCOME10" : next;
    persist();
    return state.coupon === "WELCOME10";
  }

  function totals() {
    var items = cartItems();
    var mrp = 0;
    var price = 0;
    items.forEach(function (item) {
      mrp += item.lineMrp;
      price += item.linePrice;
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

  function excludeIds(base, extra) {
    var skip = {};
    (extra || []).forEach(function (id) { skip[id] = true; });
    return base.filter(function (item) { return item && !skip[item.id]; });
  }

  function recommended(limit, extraSkip) {
    var cat = catalog();
    var max = limit || 4;
    var skip = (extraSkip || []).concat(state.wishlist, state.cart.map(function (row) { return row.id; }));
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
    var skip = state.cart.map(function (row) { return row.id; });
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
    var item = getProduct(id);
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
    document.addEventListener("DOMContentLoaded", syncCounts);
  } else {
    syncCounts();
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
    cartItems: cartItems,
    cartCount: cartCount,
    applyCoupon: applyCoupon,
    totals: totals,
    recommended: recommended,
    collection: collection,
    coupon: function () { return state.coupon; },
    forceEmpty: forceEmpty
  };
})(window);
