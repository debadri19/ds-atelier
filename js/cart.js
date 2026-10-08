(function (global) {
  var bound = false;
  var commerce = null;
  var list = null;
  var filled = null;
  var empty = null;
  var also = null;
  var collection = null;
  var couponForm = null;
  var couponInput = null;
  var couponNote = null;
  var checkoutNote = null;

  function live() {
    return Boolean(list && document.body.contains(list));
  }

  function busy(el) {
    if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(el);
  }

  function line(item) {
    var row = item.row;
    var product = item.product;
    return (
      '<article class="cart-item" data-cart-index="' + item.index + '">' +
        '<a class="cart-item-media" href="product.html?id=' + encodeURIComponent(product.id) + '">' +
          '<img src="' + product.image + '" alt="' + product.alt + '">' +
        "</a>" +
        '<div class="cart-item-body">' +
          '<a class="cart-item-title" href="product.html?id=' + encodeURIComponent(product.id) + '">' + product.name + "</a>" +
          '<div class="cart-item-meta">' +
            "<span>Color: " + row.color + "</span>" +
            "<span>Size: " + row.size + "</span>" +
            "<span>Print: " + row.printType + "</span>" +
            "<span>Position: " + row.printPosition + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="cart-item-tools">' +
          '<div class="cart-qty" role="group" aria-label="Quantity">' +
            '<button type="button" data-qty-minus="' + item.index + '" aria-label="Decrease quantity">−</button>' +
            "<output>" + row.qty + "</output>" +
            '<button type="button" data-qty-plus="' + item.index + '" aria-label="Increase quantity">+</button>' +
          "</div>" +
          '<span class="cart-item-price">' + commerce.money(item.linePrice) + "</span>" +
          '<button class="cart-remove" type="button" data-remove-cart="' + item.index + '">Remove</button>' +
        "</div>" +
      "</article>"
    );
  }

  function render() {
    if (!live() || !commerce) return;
    var items = commerce.cartItems();
    var totals = commerce.totals();
    if (list) list.innerHTML = items.map(line).join("");
    if (filled) filled.hidden = !items.length;
    if (empty) empty.hidden = items.length > 0;
    var map = {
      "[data-summary-mrp]": commerce.money(totals.mrp),
      "[data-summary-discount]": totals.discount ? "−" + commerce.money(totals.discount) : commerce.money(0),
      "[data-summary-shipping]": totals.shipping ? commerce.money(totals.shipping) : "Free",
      "[data-summary-total]": commerce.money(totals.total)
    };
    Object.keys(map).forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.textContent = map[sel];
    });
    if (couponInput && !couponInput.value && totals.coupon) couponInput.value = totals.coupon;
    if (also) {
      also.innerHTML = commerce.recommended(4).map(function (item) {
        return commerce.card(item, { variant: "alsolike" });
      }).join("");
    }
    if (collection) {
      collection.innerHTML = commerce.collection(4).map(function (item) {
        return commerce.card(item, { variant: "recommend" });
      }).join("");
    }
  }

  function onClick(event) {
    if (!live() || !commerce) return;
    var minus = event.target.closest("[data-qty-minus]");
    if (minus) {
      var i = Number(minus.getAttribute("data-qty-minus"));
      var current = commerce.cartItems()[i];
      if (current) commerce.setQty(i, current.row.qty - 1);
    }
    var plus = event.target.closest("[data-qty-plus]");
    if (plus) {
      var j = Number(plus.getAttribute("data-qty-plus"));
      var next = commerce.cartItems()[j];
      if (next) commerce.setQty(j, next.row.qty + 1);
    }
    var remove = event.target.closest("[data-remove-cart]");
    if (remove) commerce.removeCart(Number(remove.getAttribute("data-remove-cart")));
    var checkout = event.target.closest("[data-checkout]");
    if (checkout) {
      busy(checkout);
      if (checkoutNote) {
        checkoutNote.hidden = false;
        checkoutNote.textContent = "Checkout is presentation-only in this frontend phase.";
      }
    }
  }

  function onCouponSubmit(event) {
    event.preventDefault();
    if (!live() || !commerce) return;
    var submitBtn = couponForm.querySelector('button[type="submit"]');
    busy(submitBtn);
    var code = couponInput ? couponInput.value : "";
    var ok = commerce.applyCoupon(code);
    if (couponNote) {
      couponNote.hidden = false;
      couponNote.textContent = ok ? "WELCOME10 applied." : (String(code).trim() ? "Use WELCOME10 for a demo 10% off." : "Enter a coupon code.");
      couponNote.classList.toggle("is-success", ok);
      couponNote.classList.toggle("is-error", !ok);
    }
  }

  function bindCoupon() {
    couponForm = document.querySelector("[data-coupon-form]");
    if (!couponForm || couponForm.getAttribute("data-bound") === "true") return;
    couponForm.setAttribute("data-bound", "true");
    couponForm.addEventListener("submit", onCouponSubmit);
  }

  function init() {
    commerce = global.DSAtelier && global.DSAtelier.commerce;
    list = document.querySelector("[data-cart-list]");
    filled = document.querySelector("[data-cart-filled]");
    empty = document.querySelector("[data-cart-empty]");
    also = document.querySelector("[data-also-like]");
    collection = document.querySelector("[data-collection]");
    couponInput = document.querySelector("#coupon-code");
    couponNote = document.querySelector("[data-coupon-note]");
    checkoutNote = document.querySelector("[data-checkout-note]");
    if (!commerce || !list) return;
    bindCoupon();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("ds-atelier-commerce", render);
      bound = true;
    }
    render();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.cart = { init: init };
  init();
})(window);
