(function (global) {
  var PAGE_SIZE = 8;
  var bound = false;
  var page = 1;
  var sort = "latest";
  var catalog = global.DSAtelier && global.DSAtelier.catalog;
  var products = catalog && catalog.getAll ? catalog.getAll() : [];
  var grid = null;
  var countEl = null;
  var paginationEl = null;
  var sortSelect = null;
  var filterSheet = null;
  var sortSheet = null;

  function money(value) {
    return "₹" + value.toLocaleString("en-IN");
  }

  function live() {
    return Boolean(grid && document.body.contains(grid));
  }

  function checked(name) {
    return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (input) {
      return input.value;
    });
  }

  function inPrice(item, ranges) {
    if (!ranges.length) return true;
    return ranges.some(function (range) {
      if (range === "under-799") return item.price < 800;
      if (range === "800-1199") return item.price >= 800 && item.price <= 1199;
      if (range === "1200-plus") return item.price >= 1200;
      return true;
    });
  }

  function matches(item) {
    var categories = checked("category");
    var prices = checked("price");
    var sizes = checked("size");
    var colors = checked("color");
    var materials = checked("material");
    var availability = checked("availability");
    if (categories.length && categories.indexOf(item.category) === -1) return false;
    if (!inPrice(item, prices)) return false;
    if (sizes.length && !item.sizes.some(function (size) { return sizes.indexOf(size) !== -1; })) return false;
    if (colors.length && colors.indexOf(item.color) === -1) return false;
    if (materials.length && materials.indexOf(item.material) === -1) return false;
    if (availability.length && availability.indexOf(item.availability) === -1) return false;
    return true;
  }

  function sortItems(list) {
    var copy = list.slice();
    if (sort === "price-asc") copy.sort(function (a, b) { return a.price - b.price; });
    else if (sort === "price-desc") copy.sort(function (a, b) { return b.price - a.price; });
    else if (sort === "popular") copy.sort(function (a, b) { return b.popular - a.popular; });
    return copy;
  }

  function card(item) {
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
          '<a class="btn btn-secondary" href="' + (catalog ? catalog.productUrl(item.id) : "product.html") + '">View Product</a>' +
        "</div>" +
      "</article>"
    );
  }

  function closePopovers(except) {
    document.querySelectorAll(".filter-popover.is-open").forEach(function (el) {
      if (el !== except) el.classList.remove("is-open");
    });
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      var open = except && btn.getAttribute("aria-controls") === except.id;
      btn.classList.toggle("is-open", Boolean(open));
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function updateActiveFilters() {
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      var name = btn.getAttribute("data-filter");
      var map = { category: "category", price: "price", size: "size", color: "color", material: "material", availability: "availability" };
      btn.classList.toggle("is-active", checked(map[name]).length > 0);
    });
  }

  function renderPagination(totalPages) {
    if (!paginationEl) return;
    var html = "";
    var pages = Math.max(totalPages, 1);
    var show = Math.min(pages, 5);
    for (var i = 1; i <= show; i += 1) {
      html += '<button type="button" data-page="' + i + '"' + (i === page ? ' class="is-active" aria-current="page"' : "") + ">" + i + "</button>";
    }
    html += '<button type="button" data-page="next"' + (page >= pages ? " disabled" : "") + ">Next</button>";
    paginationEl.innerHTML = html;
  }

  function render() {
    if (!live()) return;
    var filtered = sortItems(products.filter(matches));
    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    var start = (page - 1) * PAGE_SIZE;
    var visible = filtered.slice(start, start + PAGE_SIZE);
    grid.innerHTML = visible.length ? visible.map(card).join("") : '<p class="shop-empty">No products match these filters.</p>';
    if (countEl) countEl.textContent = "Showing " + filtered.length + " Products";
    renderPagination(totalPages);
    updateActiveFilters();
  }

  function openSheet(sheet) {
    if (!sheet) return;
    sheet.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeSheets() {
    document.querySelectorAll(".shop-sheet.is-open").forEach(function (sheet) {
      sheet.classList.remove("is-open");
    });
    document.body.style.overflow = "";
  }

  function fillMobileFilters() {
    var mobileFilters = document.querySelector("[data-mobile-filters]");
    if (!mobileFilters || mobileFilters.children.length) return;
    var ids = ["filter-category", "filter-price", "filter-size", "filter-color", "filter-material", "filter-availability"];
    mobileFilters.innerHTML = ids.map(function (id) {
      var source = document.getElementById(id);
      return source ? '<div class="shop-sheet-group">' + source.innerHTML + "</div>" : "";
    }).join("");
  }

  function applyQueryFilters() {
    var category = "";
    try {
      category = new URLSearchParams(global.location.search).get("category") || "";
    } catch (e) {
      category = "";
    }
    try {
      category = decodeURIComponent(category);
    } catch (err) {}
    if (!category) return;
    document.querySelectorAll('input[name="category"]').forEach(function (input) {
      input.checked = input.value === category;
    });
  }

  function onClick(event) {
    if (!live()) return;
    var filterBtn = event.target.closest("[data-filter]");
    if (filterBtn && window.matchMedia("(min-width: 769px)").matches) {
      var popover = document.getElementById(filterBtn.getAttribute("aria-controls"));
      var already = popover && popover.classList.contains("is-open");
      closePopovers(already ? null : popover);
      if (popover && !already) popover.classList.add("is-open");
      filterBtn.classList.toggle("is-open", !already);
      filterBtn.setAttribute("aria-expanded", already ? "false" : "true");
      return;
    }

    if (event.target.closest("[data-open-filters]")) openSheet(filterSheet);
    if (event.target.closest("[data-open-sort]")) openSheet(sortSheet);
    if (event.target.closest("[data-close-sheet]")) closeSheets();
    if (event.target.closest("[data-clear-filters]")) {
      document.querySelectorAll('.filter-rail input[type="checkbox"], [data-mobile-filters] input[type="checkbox"]').forEach(function (input) {
        input.checked = false;
      });
      page = 1;
      render();
    }

    var pageBtn = event.target.closest("[data-page]");
    if (pageBtn && !pageBtn.disabled) {
      var value = pageBtn.getAttribute("data-page");
      if (value === "next") page += 1;
      else page = Number(value);
      render();
    }

    if (!event.target.closest(".filter-rail")) closePopovers();
  }

  function onKey(event) {
    if (!live()) return;
    if (event.key === "Escape") {
      closePopovers();
      closeSheets();
    }
  }

  function onChange(event) {
    if (!live()) return;
    if (event.target.matches('input[type="checkbox"][name]')) {
      var name = event.target.name;
      var value = event.target.value;
      var checkedState = event.target.checked;
      document.querySelectorAll('input[name="' + name + '"][value="' + value + '"]').forEach(function (input) {
        input.checked = checkedState;
      });
      page = 1;
      render();
    }

    if (event.target.matches("[data-shop-sort]")) {
      sort = event.target.value;
      document.querySelectorAll('input[name="mobile-sort"]').forEach(function (input) {
        input.checked = input.value === sort;
      });
      page = 1;
      render();
    }

    if (event.target.matches('input[name="mobile-sort"]')) {
      sort = event.target.value;
      if (sortSelect) sortSelect.value = sort;
      page = 1;
      render();
    }
  }

  function init() {
    catalog = global.DSAtelier && global.DSAtelier.catalog;
    products = catalog && catalog.getAll ? catalog.getAll() : [];
    grid = document.querySelector("[data-shop-grid]");
    countEl = document.querySelector("[data-shop-count]");
    paginationEl = document.querySelector("[data-shop-pagination]");
    sortSelect = document.querySelector("[data-shop-sort]");
    filterSheet = document.querySelector("[data-filter-sheet]");
    sortSheet = document.querySelector("[data-sort-sheet]");
    page = 1;
    sort = "latest";
    if (!grid) return;
    fillMobileFilters();
    applyQueryFilters();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      document.addEventListener("change", onChange);
      bound = true;
    }
    render();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.shop = { init: init };
  init();
})(window);
