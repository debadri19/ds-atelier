(function (global) {
  var PROFILE_KEY = "ds-atelier-profile";
  var ADDRESS_KEY = "ds-atelier-addresses";
  var SESSION_KEY = "ds-atelier-demo-session";
  var DEFAULT_PROFILE = {
    name: "Ananya Rao",
    email: "ananya.rao@email.com",
    mobile: "9876543210"
  };
  var DEFAULT_ADDRESSES = [
    {
      id: "addr-home",
      label: "Home",
      name: "Ananya Rao",
      phone: "9876543210",
      line1: "12, Studio Lane",
      line2: "4th Block, Koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      isDefault: true
    },
    {
      id: "addr-studio",
      label: "Studio",
      name: "Ananya Rao",
      phone: "9876543210",
      line1: "DS ATELIER Press Room",
      line2: "Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400069",
      isDefault: false
    }
  ];
  var ORDERS = [
    {
      id: "DSA-261002-7721",
      date: "2 Oct 2026",
      status: "Processing",
      payment: "UPI",
      coupon: null,
      shipping: 0,
      discount: 500,
      addressId: "addr-home",
      items: [
        { productId: "custom-sports-jersey", color: "Red", size: "L", qty: 1, price: 1299 }
      ]
    },
    {
      id: "DSA-260928-4412",
      date: "28 Sep 2026",
      status: "Shipped",
      payment: "Razorpay",
      coupon: "WELCOME10",
      shipping: 0,
      discount: 920,
      addressId: "addr-home",
      items: [
        { productId: "oversized-graphic-tee", color: "Cream", size: "L", qty: 1, price: 799 },
        { productId: "anime-graphic-tee", color: "Black", size: "M", qty: 2, price: 899 }
      ]
    },
    {
      id: "DSA-260922-1187",
      date: "22 Sep 2026",
      status: "Delivered",
      payment: "Visa",
      coupon: null,
      shipping: 0,
      discount: 500,
      addressId: "addr-studio",
      items: [
        { productId: "minimal-hoodie", color: "Charcoal", size: "M", qty: 1, price: 1499 }
      ]
    },
    {
      id: "DSA-260815-3094",
      date: "15 Aug 2026",
      status: "Cancelled",
      payment: "UPI",
      coupon: null,
      shipping: 79,
      discount: 300,
      addressId: "addr-home",
      items: [
        { productId: "custom-tote-bag", color: "Cream", size: "M", qty: 1, price: 499 }
      ]
    }
  ];

  var bound = false;
  var state = {
    profile: null,
    addresses: [],
    section: "overview",
    orderId: "",
    editingAddressId: ""
  };

  function live() {
    return Boolean(qs("[data-account-panel]"));
  }

  function busy(el) {
    if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(el);
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function catalog() {
    return window.DSAtelier && window.DSAtelier.catalog;
  }

  function commerce() {
    return window.DSAtelier && window.DSAtelier.commerce;
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

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return fallback;
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function readSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || (!data.email && !data.mobile && !data.name)) return null;
      return {
        email: String(data.email || ""),
        name: String(data.name || ""),
        mobile: String(data.mobile || "")
      };
    } catch (e) {
      return null;
    }
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function mobileDigits(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    return digits;
  }

  function isMobile(value) {
    return /^[6-9]\d{9}$/.test(mobileDigits(value));
  }

  function formatMobile(value) {
    var digits = mobileDigits(value);
    if (digits.length === 10) return "+91 " + digits.slice(0, 5) + " " + digits.slice(5);
    return String(value || "");
  }

  function statusClass(status) {
    var key = String(status || "").toLowerCase();
    if (key === "processing") return "is-processing";
    if (key === "shipped") return "is-shipped";
    if (key === "delivered") return "is-delivered";
    if (key === "cancelled") return "is-cancelled";
    return "";
  }

  function pendingStatuses() {
    return { Processing: true, Shipped: true };
  }

  function getProduct(id) {
    var cat = catalog();
    return cat && cat.getById ? cat.getById(id) : null;
  }

  function hydrateItem(item) {
    var product = getProduct(item.productId) || {};
    return {
      productId: item.productId,
      name: product.name || item.name || "Product",
      image: product.image || item.image || "",
      alt: product.alt || product.name || "Product",
      color: item.color || product.color || "",
      size: item.size || "",
      qty: Math.max(1, Number(item.qty) || 1),
      price: Number(item.price != null ? item.price : product.price) || 0
    };
  }

  function orderItems(order) {
    return (order.items || []).map(hydrateItem);
  }

  function orderSubtotal(order) {
    return orderItems(order).reduce(function (sum, item) {
      return sum + item.price * item.qty;
    }, 0);
  }

  function orderTotal(order) {
    return Math.max(0, orderSubtotal(order) - Number(order.discount || 0) + Number(order.shipping || 0));
  }

  function orderCountLabel(order) {
    var count = (order.items || []).length;
    return count === 1 ? "1 item" : count + " items";
  }

  function orderProductLines(order) {
    var items = orderItems(order);
    var visible = items.slice(0, 2);
    var extra = items.length - visible.length;
    var html = visible.map(function (item) {
      return "<li>" + escapeHtml(item.name) + "</li>";
    }).join("");
    if (extra > 0) {
      html += '<li class="account-order-more">+ ' + extra + " more</li>";
    }
    return html;
  }

  function findOrder(id) {
    return ORDERS.filter(function (order) { return order.id === id; })[0] || null;
  }

  function findAddress(id) {
    return state.addresses.filter(function (row) { return row.id === id; })[0] || null;
  }

  function defaultAddress() {
    return state.addresses.filter(function (row) { return row.isDefault; })[0] || state.addresses[0] || null;
  }

  function addressForOrder(order) {
    return findAddress(order.addressId) || defaultAddress();
  }

  function formatAddress(address) {
    if (!address) return "";
    return [address.line1, address.line2, address.city, address.state + " " + address.pincode]
      .filter(Boolean)
      .join(", ");
  }

  function wishlistCount() {
    var store = commerce();
    if (store && store.wishlistIds) return store.wishlistIds().length;
    return 0;
  }

  function loadProfile() {
    var stored = readJson(PROFILE_KEY, null);
    if (stored && (stored.name || stored.email || stored.mobile)) {
      return {
        name: String(stored.name || DEFAULT_PROFILE.name),
        email: String(stored.email || DEFAULT_PROFILE.email),
        mobile: mobileDigits(stored.mobile || DEFAULT_PROFILE.mobile)
      };
    }
    var session = readSession();
    if (session) {
      return {
        name: session.name && session.name !== "there" ? session.name : DEFAULT_PROFILE.name,
        email: session.email || DEFAULT_PROFILE.email,
        mobile: mobileDigits(session.mobile || DEFAULT_PROFILE.mobile)
      };
    }
    return {
      name: DEFAULT_PROFILE.name,
      email: DEFAULT_PROFILE.email,
      mobile: DEFAULT_PROFILE.mobile
    };
  }

  function loadAddresses() {
    var stored = readJson(ADDRESS_KEY, null);
    if (Array.isArray(stored)) {
      return stored.map(function (row) {
        return {
          id: String(row.id || uniqueId("addr")),
          label: String(row.label || "Address"),
          name: String(row.name || state.profile.name),
          phone: mobileDigits(row.phone || state.profile.mobile),
          line1: String(row.line1 || ""),
          line2: String(row.line2 || ""),
          city: String(row.city || ""),
          state: String(row.state || ""),
          pincode: String(row.pincode || ""),
          isDefault: !!row.isDefault
        };
      });
    }
    return DEFAULT_ADDRESSES.map(function (row) {
      return Object.assign({}, row);
    });
  }

  function persistProfile() {
    writeJson(PROFILE_KEY, state.profile);
  }

  function persistAddresses() {
    writeJson(ADDRESS_KEY, state.addresses);
  }

  function uniqueId(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function setFieldError(field, message) {
    if (!field) return;
    var invalid = !!message;
    field.classList.toggle("is-invalid", invalid);
    var input = field.querySelector(".form-input");
    var err = field.querySelector(".form-error");
    if (input) input.setAttribute("aria-invalid", invalid ? "true" : "false");
    if (err) err.textContent = message || "";
  }

  function clearFormErrors(form) {
    qsa(".form-field", form).forEach(function (field) {
      setFieldError(field, "");
    });
  }

  function setNote(el, message, type) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (type) el.classList.add(type);
  }

  function syncFilled(root) {
    qsa(".form-field", root || document).forEach(function (field) {
      var control = field.querySelector(".form-input, .form-textarea, select");
      var filled = false;
      if (control) {
        if (control.tagName === "SELECT") filled = Boolean(control.value);
        else filled = Boolean((control.value || "").trim());
      }
      field.classList.toggle("is-filled", filled);
    });
  }

  function firstInvalid(form) {
    return qs(".form-field.is-invalid .form-input", form);
  }

  function fillProfileForm() {
    var name = qs("#profile-name");
    var email = qs("#profile-email");
    var mobile = qs("#profile-mobile");
    if (name) name.value = state.profile.name;
    if (email) email.value = state.profile.email;
    if (mobile) mobile.value = state.profile.mobile;
    syncFilled(qs("[data-profile-form]"));
  }

  function renderOverview() {
    var nameEl = qs("[data-account-name]");
    var emailEl = qs("[data-account-email]");
    var mobileEl = qs("[data-account-mobile]");
    if (nameEl) nameEl.textContent = state.profile.name;
    if (emailEl) emailEl.textContent = state.profile.email;
    if (mobileEl) mobileEl.textContent = formatMobile(state.profile.mobile);

    var pending = ORDERS.filter(function (order) {
      return pendingStatuses()[order.status];
    }).length;
    var totalEl = qs("[data-stat-orders]");
    var pendingEl = qs("[data-stat-pending]");
    var wishEl = qs("[data-stat-wishlist]");
    if (totalEl) totalEl.textContent = String(ORDERS.length);
    if (pendingEl) pendingEl.textContent = String(pending);
    if (wishEl) wishEl.textContent = String(wishlistCount());

    qsa("[data-wishlist-count]").forEach(function (el) {
      var count = wishlistCount();
      el.textContent = count === 1 ? "1 saved item" : count + " saved items";
    });
  }

  function renderOrders() {
    var list = qs("[data-order-list]");
    var empty = qs("[data-orders-empty]");
    if (!list) return;
    if (!ORDERS.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = ORDERS.map(function (order) {
      return (
        '<article class="account-order">' +
          '<div class="account-order-head">' +
            '<p class="account-order-id">' + escapeHtml(order.id) + "</p>" +
            '<span class="account-status ' + statusClass(order.status) + '">' + escapeHtml(order.status) + "</span>" +
          "</div>" +
          '<p class="account-order-meta">' + escapeHtml(order.date) + " · " + escapeHtml(orderCountLabel(order)) + "</p>" +
          '<ul class="account-order-products">' + orderProductLines(order) + "</ul>" +
          '<div class="account-order-foot">' +
            '<span class="account-order-total">' + money(orderTotal(order)) + "</span>" +
            '<button class="btn btn-secondary btn-sm" type="button" data-view-order="' + escapeHtml(order.id) + '">View Details</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  function renderOrderDetail(order) {
    var root = qs("[data-order-detail]");
    if (!root || !order) return;
    var items = orderItems(order);
    var address = addressForOrder(order);
    var subtotal = orderSubtotal(order);
    var lines = items.map(function (item) {
      return (
        '<article class="account-line">' +
          '<div class="account-line-media"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.alt) + '"></div>' +
          "<div>" +
            '<p class="account-line-title">' + escapeHtml(item.name) + "</p>" +
            '<div class="account-line-meta">' +
              (item.color ? "<span>Color: " + escapeHtml(item.color) + "</span>" : "") +
              (item.size ? "<span>Size: " + escapeHtml(item.size) + "</span>" : "") +
              "<span>Qty: " + escapeHtml(item.qty) + "</span>" +
            "</div>" +
          "</div>" +
          '<span class="account-line-price">' + money(item.price * item.qty) + "</span>" +
        "</article>"
      );
    }).join("");
    var addressHtml = address
      ? "<strong>" + escapeHtml(address.name) + "</strong><br>" +
        escapeHtml(formatAddress(address)) + "<br>" +
        escapeHtml(formatMobile(address.phone))
      : "Address unavailable";
    root.innerHTML =
      '<div class="account-card">' +
        '<div class="account-card-head">' +
          "<div>" +
            '<p class="section-kicker">Order</p>' +
            '<h2 class="account-panel-title">' + escapeHtml(order.id) + "</h2>" +
            '<p class="account-muted">' + escapeHtml(order.date) + "</p>" +
          "</div>" +
          '<span class="account-status ' + statusClass(order.status) + '">' + escapeHtml(order.status) + "</span>" +
        "</div>" +
        '<div class="account-detail-grid">' +
          "<div>" +
            lines +
          "</div>" +
          '<aside class="account-detail-aside">' +
            '<div class="account-rows">' +
              "<div><span>Subtotal</span><span>" + money(subtotal) + "</span></div>" +
              "<div><span>Shipping</span><span>" + (order.shipping ? money(order.shipping) : "Free") + "</span></div>" +
              (order.discount ? "<div><span>Discount" + (order.coupon ? " (" + escapeHtml(order.coupon) + ")" : "") + "</span><span>−" + money(order.discount) + "</span></div>" : "") +
              '<div class="account-total"><span>Total</span><span>' + money(orderTotal(order)) + "</span></div>" +
            "</div>" +
            '<div class="account-detail-block">' +
              '<p class="account-stat-label">Shipping address</p>' +
              '<p class="account-muted">' + addressHtml + "</p>" +
            "</div>" +
            '<div class="account-detail-block">' +
              '<p class="account-stat-label">Payment method</p>' +
              '<p class="account-muted">' + escapeHtml(order.payment) + "</p>" +
            "</div>" +
          "</aside>" +
        "</div>" +
      "</div>";
  }

  function renderAddresses() {
    var list = qs("[data-address-list]");
    var empty = qs("[data-addresses-empty]");
    if (!list) return;
    if (!state.addresses.length) {
      list.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.innerHTML = state.addresses.map(function (address) {
      return (
        '<article class="account-address' + (address.isDefault ? " is-default" : "") + '">' +
          '<div class="account-address-top">' +
            '<div class="account-address-name">' +
              "<h3>" + escapeHtml(address.label) + "</h3>" +
              (address.isDefault ? '<span class="badge">Default</span>' : "") +
            "</div>" +
          "</div>" +
          "<p><strong>" + escapeHtml(address.name) + "</strong></p>" +
          "<p>" + escapeHtml(formatAddress(address)) + "</p>" +
          "<p>" + escapeHtml(formatMobile(address.phone)) + "</p>" +
          '<div class="account-address-actions">' +
            '<button class="btn btn-secondary btn-sm" type="button" data-edit-address="' + escapeHtml(address.id) + '">Edit</button>' +
            (address.isDefault ? "" : '<button class="btn btn-ghost btn-sm" type="button" data-default-address="' + escapeHtml(address.id) + '">Set as Default</button>') +
            '<button class="btn btn-ghost btn-sm" type="button" data-delete-address="' + escapeHtml(address.id) + '">Delete</button>' +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  var SECTIONS = {
    overview: true,
    orders: true,
    addresses: true,
    wishlist: true,
    profile: true,
    password: true
  };

  function currentHash() {
    return (location.hash || "").replace(/^#/, "");
  }

  function sectionHash(section, orderId) {
    if (section === "orders" && orderId) return "order/" + encodeURIComponent(orderId);
    return SECTIONS[section] ? section : "overview";
  }

  function setSection(section, orderId) {
    var next = SECTIONS[section] ? section : "overview";
    state.section = next;
    state.orderId = orderId || "";
    var showDetail = next === "orders" && !!state.orderId && !!findOrder(state.orderId);

    qsa("[data-account-panel]").forEach(function (panel) {
      var name = panel.getAttribute("data-account-panel");
      if (name === "order-detail") panel.hidden = !showDetail;
      else if (name === "orders") panel.hidden = next !== "orders" || showDetail;
      else panel.hidden = name !== next;
    });

    qsa("[data-account-nav]").forEach(function (btn) {
      var name = btn.getAttribute("data-account-nav");
      var active = name === next;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    if (showDetail) renderOrderDetail(findOrder(state.orderId));

    var activeBtn = qs(".account-nav-btn.is-active");
    if (activeBtn && activeBtn.scrollIntoView && window.matchMedia("(max-width: 992px)").matches) {
      activeBtn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }

  function navigate(section, orderId) {
    var next = SECTIONS[section] ? section : "overview";
    var hash = sectionHash(next, orderId);
    if (currentHash() === hash) {
      setSection(next, orderId || "");
      return;
    }
    location.hash = hash;
  }

  function parseHash() {
    var hash = currentHash();
    if (!hash || hash === "overview") return { section: "overview", orderId: "" };
    if (hash.indexOf("order/") === 0) return { section: "orders", orderId: decodeURIComponent(hash.slice(6)) };
    if (SECTIONS[hash]) return { section: hash, orderId: "" };
    return { section: "overview", orderId: "" };
  }

  function openAddressModal(address) {
    var modal = qs("[data-address-modal]");
    var form = qs("[data-address-form]");
    var title = qs("[data-address-modal-title]");
    if (!modal || !form) return;
    state.editingAddressId = address ? address.id : "";
    if (title) title.textContent = address ? "Edit Address" : "Add New Address";
    qs("#address-label", form).value = address ? address.label : "";
    qs("#address-name", form).value = address ? address.name : state.profile.name;
    qs("#address-phone", form).value = address ? address.phone : state.profile.mobile;
    qs("#address-line1", form).value = address ? address.line1 : "";
    qs("#address-line2", form).value = address ? address.line2 : "";
    qs("#address-city", form).value = address ? address.city : "";
    qs("#address-state", form).value = address ? address.state : "";
    qs("#address-pincode", form).value = address ? address.pincode : "";
    clearFormErrors(form);
    setNote(qs("[data-address-note]", form), "");
    syncFilled(form);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var first = qs("#address-label", form);
    if (first) first.focus();
  }

  function closeAddressModal() {
    var modal = qs("[data-address-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    state.editingAddressId = "";
  }

  function readAddressForm(form) {
    return {
      label: (qs("#address-label", form).value || "").trim(),
      name: (qs("#address-name", form).value || "").trim(),
      phone: mobileDigits(qs("#address-phone", form).value || ""),
      line1: (qs("#address-line1", form).value || "").trim(),
      line2: (qs("#address-line2", form).value || "").trim(),
      city: (qs("#address-city", form).value || "").trim(),
      state: (qs("#address-state", form).value || "").trim(),
      pincode: String(qs("#address-pincode", form).value || "").replace(/\D/g, "")
    };
  }

  function validateAddress(form, data) {
    var valid = true;
    if (!data.label) {
      setFieldError(qs("[data-field='label']", form), "Enter a label.");
      valid = false;
    }
    if (!data.name || data.name.length < 2) {
      setFieldError(qs("[data-field='name']", form), "Enter a full name.");
      valid = false;
    }
    if (!isMobile(data.phone)) {
      setFieldError(qs("[data-field='phone']", form), "Enter a valid 10-digit mobile number.");
      valid = false;
    }
    if (!data.line1) {
      setFieldError(qs("[data-field='line1']", form), "Enter address line 1.");
      valid = false;
    }
    if (!data.city) {
      setFieldError(qs("[data-field='city']", form), "Enter a city.");
      valid = false;
    }
    if (!data.state) {
      setFieldError(qs("[data-field='state']", form), "Enter a state.");
      valid = false;
    }
    if (!/^\d{6}$/.test(data.pincode)) {
      setFieldError(qs("[data-field='pincode']", form), "Enter a 6-digit PIN code.");
      valid = false;
    }
    return valid;
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function onClick(event) {
    if (!live()) return;
    if (event.target.closest("[data-account-logout]")) {
      event.preventDefault();
      clearSession();
      window.location.href = "login.html";
      return;
    }

    var nav = event.target.closest("[data-account-nav]");
    if (nav && nav.tagName === "BUTTON") {
      event.preventDefault();
      navigate(nav.getAttribute("data-account-nav"));
      return;
    }

    var shortcut = event.target.closest("[data-account-goto]");
    if (shortcut) {
      event.preventDefault();
      navigate(shortcut.getAttribute("data-account-goto"));
      return;
    }

    var viewOrder = event.target.closest("[data-view-order]");
    if (viewOrder) {
      event.preventDefault();
      navigate("orders", viewOrder.getAttribute("data-view-order"));
      return;
    }

    if (event.target.closest("[data-back-orders]")) {
      event.preventDefault();
      if (currentHash().indexOf("order/") === 0) window.history.back();
      else navigate("orders");
      return;
    }

    if (event.target.closest("[data-add-address]")) {
      event.preventDefault();
      openAddressModal(null);
      return;
    }

    var edit = event.target.closest("[data-edit-address]");
    if (edit) {
      event.preventDefault();
      openAddressModal(findAddress(edit.getAttribute("data-edit-address")));
      return;
    }

    var makeDefault = event.target.closest("[data-default-address]");
    if (makeDefault) {
      event.preventDefault();
      var defaultId = makeDefault.getAttribute("data-default-address");
      state.addresses.forEach(function (row) {
        row.isDefault = row.id === defaultId;
      });
      persistAddresses();
      renderAddresses();
      return;
    }

    var remove = event.target.closest("[data-delete-address]");
    if (remove) {
      event.preventDefault();
      var removeId = remove.getAttribute("data-delete-address");
      var wasDefault = !!(findAddress(removeId) && findAddress(removeId).isDefault);
      state.addresses = state.addresses.filter(function (row) { return row.id !== removeId; });
      if (wasDefault && state.addresses[0]) state.addresses[0].isDefault = true;
      persistAddresses();
      renderAddresses();
      return;
    }

    if (event.target.closest("[data-address-close]")) {
      event.preventDefault();
      closeAddressModal();
      return;
    }

    var toggle = event.target.closest("[data-password-toggle]");
    if (toggle) {
      var field = toggle.closest(".form-field");
      var input = field && field.querySelector(".form-input");
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", show ? "true" : "false");
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
      var icon = toggle.querySelector("i");
      if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    }
  }

  function onKey(event) {
    if (!live()) return;
    if (event.key === "Escape") closeAddressModal();
  }

  function onHashChange() {
    if (!live()) return;
    var parsed = parseHash();
    setSection(parsed.section, parsed.orderId);
  }

  function bindProfile() {
    var profileForm = qs("[data-profile-form]");
    if (!profileForm || profileForm.getAttribute("data-bound") === "true") return;
    profileForm.setAttribute("data-bound", "true");
    profileForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors(profileForm);
      var note = qs("[data-profile-note]", profileForm);
      setNote(note, "");
      var name = (qs("#profile-name", profileForm).value || "").trim();
      var email = (qs("#profile-email", profileForm).value || "").trim();
      var mobile = mobileDigits(qs("#profile-mobile", profileForm).value || "");
      var valid = true;
      if (!name || name.length < 2) {
        setFieldError(qs("[data-field='name']", profileForm), "Enter your full name.");
        valid = false;
      }
      if (!email) {
        setFieldError(qs("[data-field='email']", profileForm), "Enter your email.");
        valid = false;
      } else if (!isEmail(email)) {
        setFieldError(qs("[data-field='email']", profileForm), "Enter a valid email address.");
        valid = false;
      }
      if (!mobile) {
        setFieldError(qs("[data-field='mobile']", profileForm), "Enter your mobile number.");
        valid = false;
      } else if (!isMobile(mobile)) {
        setFieldError(qs("[data-field='mobile']", profileForm), "Enter a valid 10-digit mobile number.");
        valid = false;
      }
      if (!valid) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = firstInvalid(profileForm);
        if (focusEl) focusEl.focus();
        return;
      }
      busy(profileForm.querySelector('button[type="submit"]'));
      state.profile = { name: name, email: email, mobile: mobile };
      persistProfile();
      renderOverview();
      setNote(note, "Profile updated.", "is-success");
    });

    profileForm.addEventListener("reset", function () {
      window.requestAnimationFrame(function () {
        fillProfileForm();
        clearFormErrors(profileForm);
        setNote(qs("[data-profile-note]", profileForm), "");
      });
    });
  }

  function bindPassword() {
    var passwordForm = qs("[data-password-form]");
    if (!passwordForm || passwordForm.getAttribute("data-bound") === "true") return;
    passwordForm.setAttribute("data-bound", "true");
    passwordForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors(passwordForm);
      var note = qs("[data-password-note]", passwordForm);
      setNote(note, "");
      var current = (qs("#password-current", passwordForm).value || "");
      var next = (qs("#password-new", passwordForm).value || "");
      var confirm = (qs("#password-confirm", passwordForm).value || "");
      var valid = true;
      if (!current) {
        setFieldError(qs("[data-field='current']", passwordForm), "Enter your current password.");
        valid = false;
      }
      if (!next) {
        setFieldError(qs("[data-field='new']", passwordForm), "Enter a new password.");
        valid = false;
      } else if (next.length < 8) {
        setFieldError(qs("[data-field='new']", passwordForm), "Password must be at least 8 characters.");
        valid = false;
      }
      if (!confirm) {
        setFieldError(qs("[data-field='confirm']", passwordForm), "Confirm your new password.");
        valid = false;
      } else if (confirm !== next) {
        setFieldError(qs("[data-field='confirm']", passwordForm), "Passwords do not match.");
        valid = false;
      }
      if (valid && current === next) {
        setFieldError(qs("[data-field='new']", passwordForm), "New password must be different.");
        valid = false;
      }
      if (!valid) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = firstInvalid(passwordForm);
        if (focusEl) focusEl.focus();
        return;
      }
      busy(passwordForm.querySelector('button[type="submit"]'));
      passwordForm.reset();
      syncFilled(passwordForm);
      setNote(note, "Password updated.", "is-success");
    });
  }

  function bindAddress() {
    var addressForm = qs("[data-address-form]");
    if (!addressForm || addressForm.getAttribute("data-bound") === "true") return;
    addressForm.setAttribute("data-bound", "true");
    var phone = qs("#address-phone", addressForm);
    var pincode = qs("#address-pincode", addressForm);
    if (phone) {
      phone.addEventListener("input", function () {
        var cleaned = String(this.value || "").replace(/[^\d+\s-]/g, "");
        if (cleaned !== this.value) this.value = cleaned;
      });
    }
    if (pincode) {
      pincode.addEventListener("input", function () {
        var cleaned = String(this.value || "").replace(/\D/g, "").slice(0, 6);
        if (cleaned !== this.value) this.value = cleaned;
      });
    }
    addressForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors(addressForm);
      var note = qs("[data-address-note]", addressForm);
      setNote(note, "");
      var data = readAddressForm(addressForm);
      if (!validateAddress(addressForm, data)) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = firstInvalid(addressForm);
        if (focusEl) focusEl.focus();
        return;
      }
      busy(addressForm.querySelector('button[type="submit"]'));
      if (state.editingAddressId) {
        state.addresses = state.addresses.map(function (row) {
          if (row.id !== state.editingAddressId) return row;
          return Object.assign({}, row, data);
        });
      } else {
        state.addresses.push(Object.assign({
          id: uniqueId("addr"),
          isDefault: state.addresses.length === 0
        }, data));
      }
      persistAddresses();
      renderAddresses();
      closeAddressModal();
    });
  }

  function bindMobileField() {
    var mobileField = qs("#profile-mobile");
    if (!mobileField || mobileField.getAttribute("data-bound") === "true") return;
    mobileField.setAttribute("data-bound", "true");
    mobileField.addEventListener("input", function () {
      var cleaned = String(mobileField.value || "").replace(/[^\d+\s-]/g, "");
      if (cleaned !== mobileField.value) mobileField.value = cleaned;
    });
  }

  function init() {
    if (!qs("[data-account-panel]")) return;
    state.profile = loadProfile();
    state.addresses = loadAddresses();
    fillProfileForm();
    persistProfile();
    persistAddresses();
    renderOverview();
    renderOrders();
    renderAddresses();
    bindProfile();
    bindPassword();
    bindAddress();
    bindMobileField();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      window.addEventListener("hashchange", onHashChange);
      document.addEventListener("ds-atelier-commerce", function () {
        if (live()) renderOverview();
      });
      bound = true;
    }
    var initial = parseHash();
    if (currentHash() !== sectionHash(initial.section, initial.orderId)) {
      history.replaceState(null, "", "#" + sectionHash(initial.section, initial.orderId));
    }
    setSection(initial.section, initial.orderId);
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.account = { init: init };
  init();
})(window);
