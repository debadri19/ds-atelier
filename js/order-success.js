(function (global) {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(value) {
    var commerce = global.DSAtelier && global.DSAtelier.commerce;
    if (commerce && commerce.money) return commerce.money(value);
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function hydrate(item) {
    var catalog = global.DSAtelier && global.DSAtelier.catalog;
    var product = catalog && catalog.getById ? catalog.getById(item.productId) : null;
    return {
      name: (product && product.name) || item.name || "Product",
      image: (product && product.image) || item.image || "",
      alt: (product && product.alt) || item.name || "Product",
      color: item.color || "",
      size: item.size || "",
      printType: item.printType || "",
      qty: Math.max(1, Number(item.qty) || 1),
      price: Number(item.price != null ? item.price : (product && product.price)) || 0
    };
  }

  function orderSubtotal(order) {
    if (order.subtotal != null) return Number(order.subtotal) || 0;
    return (order.items || []).map(hydrate).reduce(function (sum, item) {
      return sum + item.price * item.qty;
    }, 0);
  }

  function orderTotal(order) {
    if (order.total != null) return Number(order.total) || 0;
    return Math.max(0, orderSubtotal(order) - Number(order.discount || 0) + Number(order.shipping || 0));
  }

  function render() {
    var filled = qs("[data-success-filled]");
    var empty = qs("[data-success-empty]");
    if (!filled) return;
    var account = global.DSAtelier && global.DSAtelier.account;
    var order = account && account.getLastOrder ? account.getLastOrder() : null;
    if (!order) {
      filled.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    filled.hidden = false;

    var idEl = qs("[data-order-id]");
    var dateEl = qs("[data-order-date]");
    var statusEl = qs("[data-payment-status]");
    var methodEl = qs("[data-payment-method]");
    var shipEl = qs("[data-shipping-summary]");
    var itemsEl = qs("[data-order-items]");
    var view = qs("[data-view-order-link]");

    if (idEl) idEl.textContent = order.id;
    if (dateEl) dateEl.textContent = order.date || "";
    if (statusEl) statusEl.textContent = order.paymentStatus || "Paid";
    if (methodEl) methodEl.textContent = order.payment || "";
    if (view) view.href = "account.html#order/" + encodeURIComponent(order.id);

    var address = account.getAddress ? account.getAddress(order.addressId) : null;
    if (!address && account.defaultAddress) address = account.defaultAddress();
    if (shipEl) {
      if (address) {
        shipEl.innerHTML =
          "<strong>" + escapeHtml(address.name) + "</strong><br>" +
          escapeHtml(account.formatAddress ? account.formatAddress(address) : "") + "<br>" +
          escapeHtml(account.formatMobile ? account.formatMobile(address.phone) : address.phone || "");
      } else {
        shipEl.textContent = "Address unavailable";
      }
    }

    var items = (order.items || []).map(hydrate);
    if (itemsEl) {
      itemsEl.innerHTML = items.map(function (item) {
        return (
          '<article class="success-line">' +
            '<div class="success-line-media"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.alt) + '"></div>' +
            "<div>" +
              '<p class="success-line-title">' + escapeHtml(item.name) + "</p>" +
              '<p class="success-line-meta">' +
                (item.color ? escapeHtml(item.color) : "") +
                (item.size ? " · " + escapeHtml(item.size) : "") +
                (item.printType ? " · " + escapeHtml(item.printType) : "") +
                " · Qty " + escapeHtml(item.qty) +
              "</p>" +
            "</div>" +
            '<span class="success-line-price">' + money(item.price * item.qty) + "</span>" +
          "</article>"
        );
      }).join("");
    }

    var subtotal = orderSubtotal(order);
    var shipping = Number(order.shipping || 0);
    var discount = Number(order.discount || 0);
    var subEl = qs("[data-order-subtotal]");
    var shipAmt = qs("[data-order-shipping]");
    var discEl = qs("[data-order-discount]");
    var totalEl = qs("[data-order-total]");
    if (subEl) subEl.textContent = money(subtotal);
    if (shipAmt) shipAmt.textContent = shipping ? money(shipping) : "Free";
    if (discEl) discEl.textContent = discount ? "−" + money(discount) : money(0);
    if (totalEl) totalEl.textContent = money(orderTotal(order));
  }

  function init() {
    if (!qs("[data-success-filled]")) return;
    render();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.orderSuccess = { init: init };
  init();
})(window);
