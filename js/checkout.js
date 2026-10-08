(function (global) {
  var bound = false;
  var commerce = null;
  var account = null;
  var filled = null;
  var empty = null;
  var shippingId = "";
  var billingId = "";
  var billingSame = true;
  var payment = "";
  var addressMode = "shipping";
  var editingId = "";
  var placing = false;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function live() {
    return Boolean(qs("[data-checkout-filled]"));
  }

  function busy(el, ms) {
    if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(el, ms);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setNote(el, message, type) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (type) el.classList.add(type);
  }

  function addresses() {
    return account && account.getAddresses ? account.getAddresses() : [];
  }

  function defaultAddress() {
    return account && account.defaultAddress ? account.defaultAddress() : null;
  }

  function formatAddress(address) {
    if (account && account.formatAddress) return account.formatAddress(address);
    if (!address) return "";
    return [address.line1, address.line2, address.city, address.state + " " + address.pincode].filter(Boolean).join(", ");
  }

  function formatMobile(value) {
    if (account && account.formatMobile) return account.formatMobile(value);
    return String(value || "");
  }

  function mobileDigits(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    return digits;
  }

  function isMobile(value) {
    return /^[6-9]\d{9}$/.test(mobileDigits(value));
  }

  function syncFilled(root) {
    qsa(".form-field", root || document).forEach(function (field) {
      var control = field.querySelector(".form-input, .form-textarea, select");
      var filledField = false;
      if (control) {
        if (control.tagName === "SELECT") filledField = Boolean(control.value);
        else filledField = Boolean((control.value || "").trim());
      }
      field.classList.toggle("is-filled", filledField);
    });
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

  function addressCard(address, selectedId, prefix) {
    return (
      '<article class="checkout-address' + (address.id === selectedId ? " is-selected" : "") + '">' +
        '<label class="checkout-address-select">' +
          '<input type="radio" name="' + prefix + '-address" value="' + escapeHtml(address.id) + '"' + (address.id === selectedId ? " checked" : "") + '>' +
          "<div>" +
            '<div class="checkout-address-name">' +
              "<h3>" + escapeHtml(address.label) + "</h3>" +
              (address.isDefault ? '<span class="badge">Default</span>' : "") +
            "</div>" +
            "<p><strong>" + escapeHtml(address.name) + "</strong></p>" +
            "<p>" + escapeHtml(formatAddress(address)) + "</p>" +
            "<p>" + escapeHtml(formatMobile(address.phone)) + "</p>" +
          "</div>" +
        "</label>" +
        '<div class="checkout-address-actions">' +
          '<button class="btn btn-secondary btn-sm" type="button" data-edit-checkout-address="' + escapeHtml(address.id) + '">Edit</button>' +
        "</div>" +
      "</article>"
    );
  }

  function line(item) {
    var product = item.product;
    var row = item.row;
    return (
      '<article class="checkout-line">' +
        '<div class="checkout-line-media"><img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.alt) + '"></div>' +
        "<div>" +
          '<p class="checkout-line-title">' + escapeHtml(product.name) + "</p>" +
          '<p class="checkout-line-meta">' +
            escapeHtml(row.color) + " · " + escapeHtml(row.size) +
            (row.printType ? " · " + escapeHtml(row.printType) : "") +
            (row.printPosition ? " · " + escapeHtml(row.printPosition) : "") +
          "</p>" +
          '<p class="checkout-line-meta">' + commerce.money(product.price) + " × " + escapeHtml(row.qty) + "</p>" +
        "</div>" +
        '<span class="checkout-line-price">' + commerce.money(item.linePrice) + "</span>" +
      "</article>"
    );
  }

  function ensureSelection() {
    var list = addresses();
    if (!list.length) {
      shippingId = "";
      billingId = "";
      return;
    }
    var ids = {};
    list.forEach(function (row) { ids[row.id] = true; });
    if (!ids[shippingId]) shippingId = (defaultAddress() && defaultAddress().id) || list[0].id;
    if (!ids[billingId]) billingId = shippingId;
  }

  function renderAddresses() {
    ensureSelection();
    var list = addresses();
    var ship = qs("[data-shipping-list]");
    var bill = qs("[data-billing-list]");
    if (ship) {
      ship.innerHTML = list.length
        ? list.map(function (row) { return addressCard(row, shippingId, "shipping"); }).join("")
        : '<p class="account-muted">No saved addresses yet. Add a shipping address to continue.</p>';
    }
    if (bill) {
      bill.innerHTML = list.length
        ? list.map(function (row) { return addressCard(row, billingId, "billing"); }).join("")
        : '<p class="account-muted">No billing address yet.</p>';
    }
  }

  function renderSummary() {
    if (!commerce) return;
    var items = commerce.cartItems();
    var totals = commerce.totals();
    var list = qs("[data-summary-items]");
    if (list) list.innerHTML = items.map(line).join("");
    var saleSubtotal = 0;
    items.forEach(function (item) { saleSubtotal += item.linePrice; });
    var couponDiscount = totals.coupon === "WELCOME10" ? Math.round(saleSubtotal * 0.1) : 0;
    var map = {
      "[data-summary-subtotal]": commerce.money(saleSubtotal),
      "[data-summary-shipping]": totals.shipping ? commerce.money(totals.shipping) : "Free",
      "[data-summary-discount]": couponDiscount ? "−" + commerce.money(couponDiscount) : commerce.money(0),
      "[data-summary-total]": commerce.money(totals.total)
    };
    Object.keys(map).forEach(function (sel) {
      var el = qs(sel);
      if (el) el.textContent = map[sel];
    });
    var coupon = totals.coupon === "WELCOME10" ? "WELCOME10" : "";
    var applied = qs("[data-coupon-applied]");
    var codeEl = qs("[data-coupon-code]");
    var input = qs("#checkout-coupon");
    if (applied) applied.hidden = !coupon;
    if (codeEl) codeEl.textContent = coupon ? coupon + " applied" : "";
    if (input && coupon && !input.value) input.value = coupon;
  }

  function render() {
    if (!live() || !commerce) return;
    var items = commerce.cartItems();
    if (filled) filled.hidden = !items.length;
    if (empty) empty.hidden = items.length > 0;
    if (!items.length) return;
    renderAddresses();
    renderSummary();
    var same = qs("[data-billing-same]");
    var billingFields = qs("[data-billing-fields]");
    if (same) same.checked = billingSame;
    if (billingFields) billingFields.hidden = billingSame;
    qsa('input[name="checkout-payment"]').forEach(function (input) {
      input.checked = input.value === payment;
      var wrap = input.closest(".checkout-pay");
      if (wrap) wrap.classList.toggle("is-selected", input.checked);
    });
  }

  function openAddressModal(address, mode) {
    var modal = qs("[data-checkout-address-modal]");
    var form = qs("[data-checkout-address-form]");
    var title = qs("[data-checkout-address-title]");
    var profile = account && account.getProfile ? account.getProfile() : {};
    if (!modal || !form) return;
    addressMode = mode || "shipping";
    editingId = address ? address.id : "";
    if (title) title.textContent = address ? "Edit Address" : "Add New Address";
    qs("#checkout-address-label", form).value = address ? address.label : "";
    qs("#checkout-address-name", form).value = address ? address.name : (profile.name || "");
    qs("#checkout-address-phone", form).value = address ? address.phone : (profile.mobile || "");
    qs("#checkout-address-line1", form).value = address ? address.line1 : "";
    qs("#checkout-address-line2", form).value = address ? address.line2 : "";
    qs("#checkout-address-city", form).value = address ? address.city : "";
    qs("#checkout-address-state", form).value = address ? address.state : "";
    qs("#checkout-address-pincode", form).value = address ? address.pincode : "";
    clearFormErrors(form);
    setNote(qs("[data-checkout-address-note]", form), "");
    syncFilled(form);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    var first = qs("#checkout-address-label", form);
    if (first) first.focus();
  }

  function closeAddressModal() {
    var modal = qs("[data-checkout-address-modal]");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    editingId = "";
  }

  function readAddressForm(form) {
    return {
      label: (qs("#checkout-address-label", form).value || "").trim(),
      name: (qs("#checkout-address-name", form).value || "").trim(),
      phone: mobileDigits(qs("#checkout-address-phone", form).value || ""),
      line1: (qs("#checkout-address-line1", form).value || "").trim(),
      line2: (qs("#checkout-address-line2", form).value || "").trim(),
      city: (qs("#checkout-address-city", form).value || "").trim(),
      state: (qs("#checkout-address-state", form).value || "").trim(),
      pincode: String(qs("#checkout-address-pincode", form).value || "").replace(/\D/g, "")
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

  function orderDate() {
    try {
      return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "8 Oct 2026";
    }
  }

  function pad(value) {
    return (value < 10 ? "0" : "") + value;
  }

  function orderId() {
    var now = new Date();
    var y = String(now.getFullYear()).slice(2);
    var n = String(Math.floor(1000 + Math.random() * 9000));
    return "DSA-" + y + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + n;
  }

  function go(href) {
    var link = document.createElement("a");
    link.href = href;
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) link.parentNode.removeChild(link);
  }

  function validateCheckout() {
    var note = qs("[data-checkout-note]");
    setNote(note, "");
    setNote(qs("[data-shipping-note]"), "");
    setNote(qs("[data-billing-note]"), "");
    setNote(qs("[data-payment-note]"), "");
    if (!commerce.cartItems().length) {
      setNote(note, "Your cart is empty.", "is-error");
      return false;
    }
    var focusNote = null;
    if (!shippingId) {
      setNote(qs("[data-shipping-note]"), "Select a shipping address.", "is-error");
      setNote(note, "Select a shipping address to continue.", "is-error");
      focusNote = qs("[data-shipping-note]");
    } else if (!billingSame && !billingId) {
      setNote(qs("[data-billing-note]"), "Select a billing address.", "is-error");
      setNote(note, "Select a billing address to continue.", "is-error");
      focusNote = qs("[data-billing-note]");
    } else if (!payment) {
      setNote(qs("[data-payment-note]"), "Select a payment method.", "is-error");
      setNote(note, "Select a payment method to continue.", "is-error");
      focusNote = qs("[data-payment-note]");
    }
    if (focusNote && focusNote.scrollIntoView) {
      focusNote.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return !focusNote;
  }

  function placeOrder(button) {
    if (placing) return;
    if (!validateCheckout()) return;
    placing = true;
    button.disabled = true;
    busy(button, 900);
    window.setTimeout(function () {
      placing = false;
      button.disabled = false;
      if (!live() || !commerce) return;
      var items = commerce.cartItems();
      var totals = commerce.totals();
      var saleSubtotal = 0;
      items.forEach(function (item) { saleSubtotal += item.linePrice; });
      var couponDiscount = totals.coupon === "WELCOME10" ? Math.round(saleSubtotal * 0.1) : 0;
      var order = {
        id: orderId(),
        date: orderDate(),
        status: "Processing",
        payment: payment,
        paymentStatus: "Paid",
        coupon: totals.coupon === "WELCOME10" ? "WELCOME10" : null,
        shipping: totals.shipping,
        discount: couponDiscount,
        subtotal: saleSubtotal,
        total: totals.total,
        addressId: shippingId,
        billingAddressId: billingSame ? shippingId : billingId,
        billingSame: billingSame,
        items: items.map(function (item) {
          return {
            productId: item.product.id,
            color: item.row.color,
            size: item.row.size,
            printType: item.row.printType,
            printPosition: item.row.printPosition,
            qty: item.row.qty,
            price: item.product.price
          };
        })
      };
      if (account && account.addOrder) account.addOrder(order);
      if (commerce.clearCart) commerce.clearCart();
      go("order-success.html");
    }, 720);
  }

  function onClick(event) {
    if (!live()) return;
    if (event.target.closest("[data-add-shipping]")) {
      event.preventDefault();
      openAddressModal(null, "shipping");
      return;
    }
    if (event.target.closest("[data-add-billing]")) {
      event.preventDefault();
      openAddressModal(null, "billing");
      return;
    }
    var edit = event.target.closest("[data-edit-checkout-address]");
    if (edit) {
      event.preventDefault();
      var id = edit.getAttribute("data-edit-checkout-address");
      var row = account && account.getAddress ? account.getAddress(id) : null;
      openAddressModal(row, edit.closest("[data-billing-list]") ? "billing" : "shipping");
      return;
    }
    if (event.target.closest("[data-checkout-address-close]")) {
      event.preventDefault();
      closeAddressModal();
      return;
    }
    if (event.target.closest("[data-coupon-remove]")) {
      event.preventDefault();
      busy(event.target.closest("[data-coupon-remove]"));
      if (commerce.clearCoupon) commerce.clearCoupon();
      var input = qs("#checkout-coupon");
      if (input) input.value = "";
      var couponNote = qs("[data-coupon-note]");
      if (couponNote) {
        couponNote.hidden = false;
        setNote(couponNote, "Coupon removed.", "is-success");
      }
      return;
    }
    if (event.target.closest("[data-place-order]")) {
      event.preventDefault();
      placeOrder(event.target.closest("[data-place-order]"));
    }
  }

  function onChange(event) {
    if (!live()) return;
    if (event.target.matches("[data-billing-same]")) {
      billingSame = event.target.checked;
      if (billingSame) billingId = shippingId;
      render();
      return;
    }
    if (event.target.name === "shipping-address") {
      shippingId = event.target.value;
      if (billingSame) billingId = shippingId;
      renderAddresses();
      return;
    }
    if (event.target.name === "billing-address") {
      billingId = event.target.value;
      renderAddresses();
      return;
    }
    if (event.target.name === "checkout-payment") {
      payment = event.target.value;
      setNote(qs("[data-payment-note]"), "");
      render();
    }
  }

  function bindCoupon() {
    var form = qs("[data-coupon-form]");
    if (!form || form.getAttribute("data-bound") === "true") return;
    form.setAttribute("data-bound", "true");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = qs("#checkout-coupon", form);
      var submitBtn = qs("[data-coupon-submit]", form);
      var note = qs("[data-coupon-note]");
      busy(submitBtn);
      var code = input ? input.value : "";
      var ok = commerce.applyCoupon(code);
      if (note) {
        note.hidden = false;
        note.textContent = ok ? "WELCOME10 applied." : (String(code).trim() ? "Use WELCOME10 for 10% off." : "Enter a coupon code.");
        note.classList.toggle("is-success", ok);
        note.classList.toggle("is-error", !ok);
      }
    });
  }

  function bindAddressForm() {
    var form = qs("[data-checkout-address-form]");
    if (!form || form.getAttribute("data-bound") === "true") return;
    form.setAttribute("data-bound", "true");
    var phone = qs("#checkout-address-phone", form);
    var pincode = qs("#checkout-address-pincode", form);
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
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors(form);
      var note = qs("[data-checkout-address-note]", form);
      setNote(note, "");
      var data = readAddressForm(form);
      if (!validateAddress(form, data)) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = qs(".form-field.is-invalid .form-input", form);
        if (focusEl) focusEl.focus();
        return;
      }
      busy(form.querySelector('button[type="submit"]'));
      var saved = account && account.saveAddress ? account.saveAddress(data, editingId) : null;
      if (saved) {
        if (addressMode === "billing") billingId = saved.id;
        else shippingId = saved.id;
        if (billingSame) billingId = shippingId;
      }
      closeAddressModal();
      render();
    });
  }

  function init() {
    commerce = global.DSAtelier && global.DSAtelier.commerce;
    account = global.DSAtelier && global.DSAtelier.account;
    filled = qs("[data-checkout-filled]");
    empty = qs("[data-checkout-empty]");
    if (!commerce || !filled) return;
    bindCoupon();
    bindAddressForm();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("change", onChange);
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeAddressModal();
      });
      document.addEventListener("ds-atelier-commerce", render);
      document.addEventListener("ds-atelier-account", render);
      bound = true;
    }
    render();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.checkout = { init: init };
  init();
})(window);
