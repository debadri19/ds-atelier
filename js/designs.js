(function (global) {
  var bound = false;
  var artworks = global.DSAtelier && global.DSAtelier.artworks;
  var grid = null;
  var countEl = null;
  var catsEl = null;
  var active = "all";

  function live() {
    return Boolean(grid && document.body.contains(grid));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readCategory() {
    var value = "";
    try {
      value = new URLSearchParams(global.location.search).get("category") || "";
    } catch (e) {
      value = "";
    }
    try {
      value = decodeURIComponent(value);
    } catch (err) {}
    return artworks && artworks.normalizeCategory ? artworks.normalizeCategory(value) : "all";
  }

  function writeCategory(category) {
    var id = artworks && artworks.normalizeCategory ? artworks.normalizeCategory(category) : "all";
    var url;
    try {
      url = new URL(global.location.href);
    } catch (e) {
      return;
    }
    if (id === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", id);
    if (url.href !== global.location.href) {
      global.history.replaceState({ soft: true }, "", url.href);
    }
  }

  function card(item) {
    var label = artworks.categoryLabel(item.category);
    var href = artworks.artworkUrl(item.id);
    return (
      '<article class="product-card designs-card" data-artwork-id="' + escapeHtml(item.id) + '">' +
        '<div class="product-card-media">' +
          '<img src="' + escapeHtml(item.thumbnail) + '" alt="' + escapeHtml(item.name) + '">' +
        "</div>" +
        '<div class="product-card-body">' +
          '<h3 class="product-card-name">' + escapeHtml(item.name) + "</h3>" +
          '<p class="designs-card-category">' + escapeHtml(label) + "</p>" +
          '<a class="btn btn-secondary" href="' + escapeHtml(href) + '">View Design</a>' +
        "</div>" +
      "</article>"
    );
  }

  function syncCats() {
    if (!catsEl) return;
    catsEl.querySelectorAll("[data-designs-cat]").forEach(function (btn) {
      var on = btn.getAttribute("data-designs-cat") === active;
      btn.classList.toggle("is-active", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
  }

  function render() {
    if (!live()) return;
    var list = artworks && artworks.getByCategory ? artworks.getByCategory(active) : [];
    grid.innerHTML = list.length ? list.map(card).join("") : '<p class="designs-empty">No artworks in this category.</p>';
    if (countEl) {
      countEl.textContent = list.length === 1 ? "1 Design" : list.length + " Designs";
    }
    syncCats();
  }

  function setCategory(category, updateUrl) {
    active = artworks && artworks.normalizeCategory ? artworks.normalizeCategory(category) : "all";
    if (updateUrl) writeCategory(active);
    render();
  }

  function onClick(event) {
    if (!live()) return;
    var btn = event.target.closest("[data-designs-cat]");
    if (!btn || !catsEl.contains(btn)) return;
    event.preventDefault();
    setCategory(btn.getAttribute("data-designs-cat"), true);
  }

  function init() {
    artworks = global.DSAtelier && global.DSAtelier.artworks;
    grid = document.querySelector("[data-designs-grid]");
    countEl = document.querySelector("[data-designs-count]");
    catsEl = document.querySelector("[data-designs-cats]");
    if (!grid) return;
    active = readCategory();
    if (!bound) {
      document.addEventListener("click", onClick);
      bound = true;
    }
    render();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.designs = { init: init };
  init();
})(window);
