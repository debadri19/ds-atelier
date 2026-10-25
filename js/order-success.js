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

  function queryRef() {
    try {
      return new URLSearchParams(global.location.search).get("ref") || "";
    } catch (e) {
      return "";
    }
  }

  function statusLabel(status) {
    var value = String(status || "").toLowerCase();
    if (value === "unfulfilled") return "Awaiting fulfilment";
    if (value === "processing") return "Processing";
    if (value === "dispatched") return "Dispatched";
    if (value === "in_transit") return "In transit";
    if (value === "delivered") return "Delivered";
    if (value === "cancelled") return "Cancelled";
    return status || "Awaiting fulfilment";
  }

  function paymentLabel(status) {
    var value = String(status || "").toLowerCase();
    if (value === "pending" || value === "pending_payment") return "Pending payment";
    if (value === "paid") return "Paid";
    return status || "Pending payment";
  }

  function hydrate(item) {
    var catalog = global.DSAtelier && global.DSAtelier.catalog;
    var product = catalog && catalog.getById ? catalog.getById(item.productId) : null;
    return {
      name: item.name || (product && product.name) || "Product",
      image: item.image || (product && product.image) || "",
      alt: item.alt || (product && product.alt) || item.name || "Product",
      color: item.color || "",
      size: item.size || "",
      printType: item.printType || "",
      printPosition: item.printPosition || "",
      qty: Math.max(1, Number(item.qty) || 1),
      price: Number(item.unitPrice != null ? item.unitPrice : item.price != null ? item.price : (product && product.price)) || 0,
      linePrice: Number(item.linePrice != null ? item.linePrice : 0)
    };
  }

  function formatShipping(order, account) {
    var shipping = order && order.shipping ? order.shipping : null;
    if (shipping && shipping.name) {
      var line = [shipping.line1, shipping.line2, shipping.city, shipping.state + " " + shipping.pincode]
        .filter(Boolean)
        .join(", ");
      return {
        html:
          "<strong>" + escapeHtml(shipping.name) + "</strong><br>" +
          escapeHtml(line) + "<br>" +
          escapeHtml(shipping.phone || "")
      };
    }
    var address = account && account.getAddress && order.addressId ? account.getAddress(order.addressId) : null;
    if (!address && account && account.defaultAddress) address = account.defaultAddress();
    if (!address) return { text: "Address unavailable" };
    return {
      html:
        "<strong>" + escapeHtml(address.name) + "</strong><br>" +
        escapeHtml(account.formatAddress ? account.formatAddress(address) : "") + "<br>" +
        escapeHtml(account.formatMobile ? account.formatMobile(address.phone) : address.phone || "")
    };
  }

  function renderOrder(order) {
    var filled = qs("[data-success-filled]");
    var empty = qs("[data-success-empty]");
    if (!filled) return;
    if (!order) {
      filled.hidden = true;
      if (empty) {
        empty.hidden = false;
        var title = qs("h2", empty);
        var copy = qs("p", empty);
        if (queryRef()) {
          if (title) title.textContent = "Order not found";
          if (copy) copy.textContent = "We could not find that order. If you just placed it, refresh this page or open it from your account.";
        } else {
          if (title) title.textContent = "No recent order";
          if (copy) copy.textContent = "Place an order from checkout to see confirmation details here.";
        }
      }
      return;
    }
    if (empty) empty.hidden = true;
    filled.hidden = false;

    var account = global.DSAtelier && global.DSAtelier.account;
    var idEl = qs("[data-order-id]");
    var dateEl = qs("[data-order-date]");
    var statusEl = qs("[data-payment-status]");
    var methodEl = qs("[data-payment-method]");
    var shipEl = qs("[data-shipping-summary]");
    var itemsEl = qs("[data-order-items]");
    var view = qs("[data-view-order-link]");
    var noticeEl = qs("[data-order-notice]");

    var ref = order.ref || order.id;
    if (idEl) idEl.textContent = ref || "";
    if (dateEl) dateEl.textContent = order.date || "";
    if (statusEl) statusEl.textContent = paymentLabel(order.paymentStatus || order.status);
    if (methodEl) methodEl.textContent = order.paymentMethod || order.payment || "";
    if (view) view.href = "account.html#order/" + encodeURIComponent(ref || "");
    if (noticeEl) {
      var notices = Array.isArray(order.notices) ? order.notices : [];
      noticeEl.textContent = notices.join(" ") || "Payment has not been collected. This order is pending payment.";
    }
    var fulfilmentEl = qs("[data-fulfilment-status]");
    if (fulfilmentEl) {
      var fulfilment = order.fulfilment || {};
      fulfilmentEl.textContent = statusLabel(fulfilment.status || "unfulfilled");
    }
    var invoiceEl = qs("[data-invoice-link]");
    if (invoiceEl) {
      var invoice = order.invoice || null;
      if (invoice && invoice.number) {
        invoiceEl.hidden = false;
        invoiceEl.href = invoice.downloadPath || ("backend/public/customer/invoice-download.php?number=" + encodeURIComponent(invoice.number));
        invoiceEl.textContent = "Download invoice";
      } else {
        invoiceEl.hidden = true;
      }
    }

    var ship = formatShipping(order, account);
    if (shipEl) {
      if (ship.html) shipEl.innerHTML = ship.html;
      else shipEl.textContent = ship.text || "Address unavailable";
    }

    var items = (order.items || []).map(hydrate);
    if (itemsEl) {
      itemsEl.innerHTML = items.map(function (item) {
        var lineTotal = item.linePrice || item.price * item.qty;
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
            '<span class="success-line-price">' + money(lineTotal) + "</span>" +
          "</article>"
        );
      }).join("");
    }

    var subtotal = Number(order.itemSubtotal != null ? order.itemSubtotal : order.subtotal || 0);
    var shippingAmt = Number(order.shippingTotal != null ? order.shippingTotal : order.shipping || 0);
    var discount = Number(order.discountTotal != null ? order.discountTotal : order.discount || 0);
    var tax = Number(order.taxTotal != null ? order.taxTotal : order.tax || 0);
    var total = Number(order.grandTotal != null ? order.grandTotal : order.total || 0);
    var subEl = qs("[data-order-subtotal]");
    var shipAmt = qs("[data-order-shipping]");
    var discEl = qs("[data-order-discount]");
    var taxEl = qs("[data-order-tax]");
    var totalEl = qs("[data-order-total]");
    if (subEl) subEl.textContent = money(subtotal);
    if (shipAmt) shipAmt.textContent = shippingAmt ? money(shippingAmt) : "Free";
    if (discEl) discEl.textContent = discount ? "−" + money(discount) : money(0);
    if (taxEl) taxEl.textContent = money(tax);
    if (totalEl) totalEl.textContent = money(total);
  }

  function load() {
    var filled = qs("[data-success-filled]");
    if (!filled) return;
    var commerce = global.DSAtelier && global.DSAtelier.commerce;
    var ref = queryRef();
    if (!ref) {
      renderOrder(null);
      return;
    }
    if (commerce && commerce.getOrder) {
      commerce.getOrder(ref).then(function (data) {
        if (data && data.ok && data.order && (!data.order.ref || data.order.ref === ref || data.order.id === ref)) {
          renderOrder(data.order);
          return;
        }
        renderOrder(null);
      }).catch(function () {
        renderOrder(null);
      });
      return;
    }
    renderOrder(null);
  }

  function init() {
    if (!qs("[data-success-filled]")) return;
    load();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.orderSuccess = { init: init };
  init();
})(window);
