(function (global) {
  var artworks = global.DSAtelier && global.DSAtelier.artworks;
  var catalog = global.DSAtelier && global.DSAtelier.catalog;

  function live(root) {
    return Boolean(root && document.body.contains(root));
  }

  function queryId() {
    var value = "";
    try {
      value = new URLSearchParams(global.location.search).get("id") || "";
    } catch (e) {
      value = "";
    }
    try {
      value = decodeURIComponent(value);
    } catch (err) {}
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function tagLabel(tag) {
    if (artworks && artworks.categoryLabel) {
      var label = artworks.categoryLabel(tag);
      if (label && label !== tag) return label;
    }
    return String(tag || "").replace(/-/g, " ").replace(/\b\w/g, function (ch) {
      return ch.toUpperCase();
    });
  }

  function renderTags(root, item) {
    var wrap = root.querySelector("[data-design-tags]");
    if (!wrap) return;
    var tags = item.tags || [];
    wrap.innerHTML = tags.map(function (tag) {
      return '<span class="chip">' + escapeHtml(tagLabel(tag)) + "</span>";
    }).join("");
    wrap.hidden = !tags.length;
  }

  function renderProducts(root, item) {
    var wrap = root.querySelector("[data-design-products]");
    var empty = root.querySelector("[data-design-products-empty]");
    var title = root.querySelector("[data-design-products-title]");
    if (!wrap) return;
    catalog = global.DSAtelier && global.DSAtelier.catalog;
    var products = (item.availableProducts || []).map(function (id) {
      return catalog && catalog.getById ? catalog.getById(id) : null;
    }).filter(Boolean);
    wrap.innerHTML = products.map(function (product) {
      var href = artworks.productUrl ? artworks.productUrl(product.id, item.id) : ("product.html?id=" + encodeURIComponent(product.id) + "&design=" + encodeURIComponent(item.id));
      return '<a class="btn btn-secondary" href="' + escapeHtml(href) + '">' + escapeHtml(product.name) + "</a>";
    }).join("");
    if (empty) empty.hidden = products.length > 0;
    if (title) title.hidden = !products.length;
    wrap.hidden = !products.length;
  }

  function init() {
    artworks = global.DSAtelier && global.DSAtelier.artworks;
    catalog = global.DSAtelier && global.DSAtelier.catalog;
    var root = document.querySelector("[data-design-page]");
    if (!live(root)) return;
    var found = root.querySelector("[data-design-found]");
    var missing = root.querySelector("[data-design-missing]");
    var item = artworks && artworks.getById ? artworks.getById(queryId()) : null;

    if (!item) {
      if (found) found.hidden = true;
      if (missing) missing.hidden = false;
      setText(root.querySelector("[data-design-crumb]"), "Not found");
      document.title = "Design not found - DS ATELIER";
      return;
    }

    if (found) found.hidden = false;
    if (missing) missing.hidden = true;

    var label = artworks.categoryLabel(item.category);
    setText(root.querySelector("[data-design-crumb]"), item.name);
    setText(root.querySelector("[data-design-title]"), item.name);
    setText(root.querySelector("[data-design-category]"), label);
    setText(root.querySelector("[data-design-desc]"), item.description);
    var image = root.querySelector("[data-design-image]");
    if (image) {
      image.src = item.preview || item.thumbnail;
      image.alt = item.name;
    }
    var back = root.querySelector("[data-design-back]");
    if (back) back.setAttribute("href", artworks.designsCategoryUrl(item.category));
    renderTags(root, item);
    renderProducts(root, item);
    document.title = item.name + " - DS ATELIER";
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", item.description);
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.design = { init: init };
  init();
})(window);
