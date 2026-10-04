(function () {
  var commerce = window.DSAtelier && window.DSAtelier.commerce;
  if (!commerce) return;

  var list = document.querySelector("[data-cart-list]");
  var filled = document.querySelector("[data-cart-filled]");
  var empty = document.querySelector("[data-cart-empty]");
  var also = document.querySelector("[data-also-like]");
  var collection = document.querySelector("[data-collection]");
  var couponForm = document.querySelector("[data-coupon-form]");
  var couponInput = document.querySelector("#coupon-code");
  var couponNote = document.querySelector("[data-coupon-note]");
  var checkoutNote = document.querySelector("[data-checkout-note]");

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

  document.addEventListener("click", function (event) {
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
    if (event.target.closest("[data-checkout]")) {
      if (checkoutNote) {
        checkoutNote.hidden = false;
        checkoutNote.textContent = "Checkout is presentation-only in this frontend phase.";
      }
    }
  });

  if (couponForm) {
    couponForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var code = couponInput ? couponInput.value : "";
      var ok = commerce.applyCoupon(code);
      if (couponNote) {
        couponNote.hidden = false;
        couponNote.textContent = ok ? "WELCOME10 applied." : (String(code).trim() ? "Use WELCOME10 for a demo 10% off." : "Enter a coupon code.");
      }
    });
  }

  document.addEventListener("ds-atelier-commerce", render);
  render();
})();
