(function () {
  var products = [
    {
      id: "anime-graphic-tee",
      name: "Anime Graphic T-Shirt",
      price: 899,
      mrp: 1299,
      rating: 4.8,
      badge: "Bestseller",
      image: "assets/product-anime.svg",
      alt: "Black oversized t-shirt with bold anime graphic print"
    },
    {
      id: "oversized-graphic-tee",
      name: "Oversized Graphic Tee",
      price: 799,
      mrp: 1199,
      rating: 4.7,
      badge: "New",
      image: "assets/product-oversized.svg",
      alt: "Cream oversized graphic t-shirt"
    },
    {
      id: "motivational-hoodie",
      name: "Motivational Hoodie",
      price: 1499,
      mrp: 1999,
      rating: 4.9,
      badge: "Hot",
      image: "assets/product-hoodie.svg",
      alt: "Charcoal hoodie with large typography print"
    },
    {
      id: "custom-sports-jersey",
      name: "Custom Sports Jersey",
      price: 1299,
      mrp: 1799,
      rating: 4.6,
      badge: "Custom",
      image: "assets/product-jersey.svg",
      alt: "Orange and black custom sports jersey"
    },
    {
      id: "sublimation-tshirt",
      name: "Sublimation T-Shirt",
      price: 999,
      mrp: 1499,
      rating: 4.8,
      badge: "All-over",
      image: "assets/product-sub.svg",
      alt: "All-over sublimation printed t-shirt"
    },
    {
      id: "custom-tote-bag",
      name: "Custom Tote Bag",
      price: 499,
      mrp: 799,
      rating: 4.5,
      badge: "Gift",
      image: "assets/product-tote.svg",
      alt: "Canvas tote bag with custom print"
    }
  ];

  function money(value) {
    return "₹" + value.toLocaleString("en-IN");
  }

  function productCard(item) {
    return (
      '<article class="product-card" data-product-id="' + item.id + '">' +
        '<div class="product-card-media">' +
          '<span class="badge product-card-badge">' + item.badge + "</span>" +
          '<img src="' + item.image + '" alt="' + item.alt + '">' +
        "</div>" +
        '<div class="product-card-body">' +
          '<h3 class="product-card-name">' + item.name + "</h3>" +
          '<div class="product-card-meta">' +
            '<div class="price"><span class="price-now">' + money(item.price) + '</span><span class="price-mrp">' + money(item.mrp) + "</span></div>" +
            '<div class="rating"><span class="rating-star" aria-hidden="true">★</span><span>' + item.rating + "</span></div>" +
          "</div>" +
          '<a class="btn btn-secondary" href="product.html">View Product</a>' +
        "</div>" +
      "</article>"
    );
  }

  var grid = document.querySelector("[data-product-grid]");
  if (grid) {
    grid.innerHTML = products.map(productCard).join("");
  }

  var drawer = document.querySelector("[data-drawer]");

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-menu-open]")) {
      if (drawer) drawer.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    if (event.target.closest("[data-menu-close]") || event.target.closest(".drawer-links a")) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeDrawer();
  });

  document.querySelectorAll("[data-newsletter]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = form.querySelector("input[type='email']");
      var note = form.querySelector("[data-newsletter-note]");
      if (!input.value) return;
      if (note) note.hidden = false;
      input.value = "";
    });
  });
})();
