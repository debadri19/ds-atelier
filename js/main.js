(function () {
  var catalog = window.DSAtelier && window.DSAtelier.catalog;
  var products = catalog && catalog.getFeatured ? catalog.getFeatured() : [];
  var busyTimers = [];

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
          '<a class="btn btn-secondary" href="' + (catalog ? catalog.productUrl(item.id) : "product.html") + '">View Product</a>' +
        "</div>" +
      "</article>"
    );
  }

  function renderHome() {
    catalog = window.DSAtelier && window.DSAtelier.catalog;
    products = catalog && catalog.getFeatured ? catalog.getFeatured() : [];
    var grid = document.querySelector("[data-product-grid]");
    if (grid) grid.innerHTML = products.map(productCard).join("");
  }

  renderHome();

  function drawerEl() {
    return document.querySelector("[data-drawer]");
  }

  function closeDrawer() {
    var drawer = drawerEl();
    if (!drawer) return;
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-menu-open]")) {
      var drawer = drawerEl();
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

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var searchModal = null;
  var searchInput = null;
  var searchResults = null;
  var searchStatus = null;
  var searchLastFocus = null;

  function buildSearchModal() {
    if (searchModal) return searchModal;
    var wrap = document.createElement("div");
    wrap.className = "search-modal";
    wrap.setAttribute("data-search-modal", "");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", "Search products");
    wrap.innerHTML =
      '<div class="search-modal-backdrop" data-search-close></div>' +
      '<div class="search-modal-panel">' +
        '<div class="search-modal-field">' +
          '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>' +
          '<input class="search-modal-input" data-search-input type="search" name="q" placeholder="Search products" aria-label="Search products" autocomplete="off">' +
          '<button class="btn-icon search-modal-close" type="button" data-search-close aria-label="Close search"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        "</div>" +
        '<p class="search-modal-status" data-search-status aria-live="polite"></p>' +
        '<ul class="search-results" data-search-results></ul>' +
      "</div>";
    document.body.appendChild(wrap);

    searchModal = wrap;
    searchInput = wrap.querySelector("[data-search-input]");
    searchResults = wrap.querySelector("[data-search-results]");
    searchStatus = wrap.querySelector("[data-search-status]");

    if (searchInput) searchInput.addEventListener("input", renderSearchResults);
    return searchModal;
  }

  function renderSearchResults() {
    if (!searchResults) return;
    var query = searchInput ? searchInput.value : "";
    var trimmed = query.trim();
    searchResults.innerHTML = "";

    if (!trimmed) {
      if (searchStatus) searchStatus.textContent = "Start typing to search products.";
      searchResults.hidden = true;
      return;
    }

    var results = catalog && catalog.search ? catalog.search(trimmed, 8) : [];
    searchResults.hidden = false;

    if (!results.length) {
      if (searchStatus) searchStatus.textContent = "No products found";
      return;
    }

    if (searchStatus) searchStatus.textContent = results.length + (results.length === 1 ? " product" : " products");
    searchResults.innerHTML = results.map(function (item) {
      return (
        '<li class="search-result">' +
          '<a class="search-result-link" href="' + escapeHtml(catalog.productUrl(item.id)) + '">' +
            '<span class="search-result-media"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.alt) + '" loading="lazy"></span>' +
            '<span class="search-result-body">' +
              '<span class="search-result-name">' + escapeHtml(item.name) + "</span>" +
              '<span class="search-result-category">' + escapeHtml(item.category) + "</span>" +
            "</span>" +
            '<span class="search-result-price">' + money(item.price) + "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
  }

  function setSearchExpanded(open) {
    document.querySelectorAll(".search-btn").forEach(function (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function openSearch() {
    buildSearchModal();
    searchLastFocus = document.activeElement;
    searchModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setSearchExpanded(true);
    renderSearchResults();
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  function closeSearch() {
    if (!searchModal || !searchModal.classList.contains("is-open")) return;
    searchModal.classList.remove("is-open");
    document.body.style.overflow = "";
    setSearchExpanded(false);
    if (searchLastFocus && searchLastFocus.focus) searchLastFocus.focus();
  }

  document.querySelectorAll(".search-btn").forEach(function (btn) {
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest(".search-btn")) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.target.closest("[data-search-close]")) {
      closeSearch();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeSearch();
  });

  function syncFilled(field) {
    if (!field) return;
    var control = field.querySelector(".form-input, .form-textarea, .input, .textarea, select");
    var filled = false;
    if (control) {
      if (control.tagName === "SELECT") filled = Boolean(control.value);
      else filled = Boolean((control.value || "").trim());
    }
    field.classList.toggle("is-filled", filled);
  }

  function closeFormSelects(except) {
    document.querySelectorAll(".form-field.is-open").forEach(function (field) {
      if (field === except) return;
      field.classList.remove("is-open");
      var trigger = field.querySelector(".form-select-trigger");
      var menu = field.querySelector(".form-select-menu");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (menu) menu.hidden = true;
    });
  }

  function selectedOption(select) {
    return select.options[select.selectedIndex] || select.options[0] || null;
  }

  function refreshFormSelect(select) {
    var field = select.closest(".form-field");
    if (!field) return;
    var trigger = field.querySelector(".form-select-trigger");
    var valueEl = field.querySelector(".form-select-value");
    var menu = field.querySelector(".form-select-menu");
    var option = selectedOption(select);
    var empty = !select.value;
    if (valueEl) valueEl.textContent = empty ? "" : (option ? option.textContent : "");
    if (trigger) trigger.classList.toggle("is-placeholder", empty);
    if (menu) {
      menu.querySelectorAll(".form-select-option").forEach(function (item) {
        var selected = item.getAttribute("data-value") === select.value;
        item.classList.toggle("is-selected", selected);
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", selected ? "true" : "false");
      });
    }
    syncFilled(field);
  }

  function setActiveOption(menu, item) {
    if (!menu || !item) return;
    menu.querySelectorAll(".form-select-option").forEach(function (option) {
      option.classList.toggle("is-active", option === item);
    });
    var trigger = menu.parentElement && menu.parentElement.querySelector(".form-select-trigger");
    if (trigger) trigger.setAttribute("aria-activedescendant", item.id || "");
    if (item.scrollIntoView) item.scrollIntoView({ block: "nearest" });
  }

  function openFormSelect(field) {
    if (!field) return;
    closeFormSelects(field);
    var trigger = field.querySelector(".form-select-trigger");
    var menu = field.querySelector(".form-select-menu");
    if (!trigger || !menu) return;
    field.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    var selected = menu.querySelector(".form-select-option.is-selected") || menu.querySelector(".form-select-option");
    setActiveOption(menu, selected);
  }

  function closeFormSelect(field) {
    if (!field) return;
    field.classList.remove("is-open");
    var trigger = field.querySelector(".form-select-trigger");
    var menu = field.querySelector(".form-select-menu");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
    }
    if (menu) menu.hidden = true;
  }

  function chooseFormSelect(select, value) {
    select.value = value;
    refreshFormSelect(select);
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function enhanceFormSelect(select) {
    if (!select || select.getAttribute("data-enhanced") === "true") return;
    var field = select.closest(".form-field");
    if (!field) return;

    var label = field.querySelector(".form-label");
    var trigger = document.createElement("button");
    var valueEl = document.createElement("span");
    var menu = document.createElement("ul");
    var triggerId = select.id ? select.id + "-trigger" : "";
    var menuId = select.id ? select.id + "-menu" : "";

    trigger.type = "button";
    trigger.className = "form-select-trigger";
    if (triggerId) trigger.id = triggerId;
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    if (menuId) trigger.setAttribute("aria-controls", menuId);
    if (select.getAttribute("aria-label")) trigger.setAttribute("aria-label", select.getAttribute("aria-label"));
    else if (label) trigger.setAttribute("aria-label", label.textContent.trim());
    if (select.required) trigger.setAttribute("aria-required", "true");
    trigger.disabled = select.disabled;

    valueEl.className = "form-select-value";
    trigger.appendChild(valueEl);

    menu.className = "form-select-menu";
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    if (menuId) menu.id = menuId;
    if (label && !label.id && select.id) label.id = select.id + "-label";
    if (label && label.id) menu.setAttribute("aria-labelledby", label.id);

    Array.prototype.forEach.call(select.options, function (option, index) {
      var item = document.createElement("li");
      item.className = "form-select-option" + (option.value === "" ? " is-placeholder" : "");
      item.id = (select.id || "form-select") + "-opt-" + index;
      item.setAttribute("role", "option");
      item.setAttribute("data-value", option.value);
      item.setAttribute("aria-selected", option.selected ? "true" : "false");
      item.textContent = option.textContent;
      menu.appendChild(item);
    });

    select.setAttribute("data-enhanced", "true");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");
    select.insertAdjacentElement("afterend", trigger);
    trigger.insertAdjacentElement("afterend", menu);

    var valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    if (valueDesc && valueDesc.set && valueDesc.get) {
      Object.defineProperty(select, "value", {
        get: function () {
          return valueDesc.get.call(this);
        },
        set: function (next) {
          valueDesc.set.call(this, next);
          refreshFormSelect(this);
        },
        configurable: true
      });
    }

    refreshFormSelect(select);

    trigger.addEventListener("click", function () {
      if (field.classList.contains("is-open")) closeFormSelect(field);
      else openFormSelect(field);
    });

    menu.addEventListener("click", function (event) {
      var item = event.target.closest(".form-select-option");
      if (!item) return;
      chooseFormSelect(select, item.getAttribute("data-value"));
      closeFormSelect(field);
      trigger.focus();
    });

    trigger.addEventListener("keydown", function (event) {
      var open = field.classList.contains("is-open");
      var items = menu.querySelectorAll(".form-select-option");
      var active = menu.querySelector(".form-select-option.is-active") || menu.querySelector(".form-select-option.is-selected") || items[0];
      var index = Array.prototype.indexOf.call(items, active);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!open) {
          openFormSelect(field);
          return;
        }
        if (event.key === "ArrowDown") index = Math.min(items.length - 1, index + 1);
        else index = Math.max(0, index - 1);
        setActiveOption(menu, items[index]);
      } else if (event.key === "Home" && open) {
        event.preventDefault();
        setActiveOption(menu, items[0]);
      } else if (event.key === "End" && open) {
        event.preventDefault();
        setActiveOption(menu, items[items.length - 1]);
      } else if ((event.key === "Enter" || event.key === " ") && open) {
        event.preventDefault();
        if (active) chooseFormSelect(select, active.getAttribute("data-value"));
        closeFormSelect(field);
      } else if ((event.key === "Enter" || event.key === " " || event.key === "ArrowDown") && !open) {
        event.preventDefault();
        openFormSelect(field);
      } else if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          closeFormSelect(field);
        }
      } else if (event.key === "Tab") {
        closeFormSelect(field);
      }
    });

    select.addEventListener("focus", function () {
      trigger.focus();
    });

    select.addEventListener("invalid", function () {
      field.classList.add("is-invalid");
      trigger.focus();
    });

    select.addEventListener("change", function () {
      field.classList.remove("is-invalid");
      refreshFormSelect(select);
    });
  }

  document.querySelectorAll(".form-field select.form-select, .form-field select.select").forEach(enhanceFormSelect);
  document.querySelectorAll(".form-field").forEach(syncFilled);

  document.addEventListener("input", function (event) {
    var field = event.target.closest(".form-field");
    if (field) syncFilled(field);
  });

  document.addEventListener("change", function (event) {
    var field = event.target.closest(".form-field");
    if (field) syncFilled(field);
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".form-field.is-open")) closeFormSelects();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeFormSelects();
  });

  document.addEventListener("reset", function (event) {
    var form = event.target;
    window.requestAnimationFrame(function () {
      form.querySelectorAll(".form-field select.form-select, .form-field select.select").forEach(refreshFormSelect);
      form.querySelectorAll(".form-field").forEach(syncFilled);
    });
  });

  window.setTimeout(function () {
    document.querySelectorAll(".form-field").forEach(syncFilled);
  }, 250);

  function busy(el, ms) {
    if (!el) return;
    el.classList.add("is-busy");
    el.setAttribute("aria-busy", "true");
    var timer = window.setTimeout(function () {
      el.classList.remove("is-busy");
      el.removeAttribute("aria-busy");
    }, ms || 420);
    busyTimers.push(timer);
  }

  function bindNewsletters() {
    document.querySelectorAll("[data-newsletter]").forEach(function (form) {
      if (form.getAttribute("data-bound") === "true") return;
      form.setAttribute("data-bound", "true");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = form.querySelector("input[type='email']");
        var note = form.querySelector("[data-newsletter-note]");
        if (!input || !input.value) return;
        busy(form.querySelector('button[type="submit"]'));
        if (note) note.hidden = false;
        input.value = "";
        syncFilled(input.closest(".form-field"));
      });
    });
  }

  bindNewsletters();

  var header = document.querySelector(".site-header");
  var collapseQuery = window.matchMedia("(max-width: 768px)");
  var collapseRange = 88;
  var collapseTicking = false;

  function setHeaderCollapse() {
    if (!header) return;
    if (!collapseQuery.matches) {
      header.style.setProperty("--header-collapse", "0");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      header.style.setProperty("--header-collapse", window.scrollY > collapseRange ? "1" : "0");
      return;
    }
    var progress = Math.min(1, Math.max(0, window.scrollY / collapseRange));
    header.style.setProperty("--header-collapse", progress.toFixed(4));
  }

  function onHeaderScroll() {
    if (collapseTicking) return;
    collapseTicking = true;
    window.requestAnimationFrame(function () {
      setHeaderCollapse();
      collapseTicking = false;
    });
  }

  if (header) {
    window.addEventListener("scroll", onHeaderScroll, { passive: true });
    if (collapseQuery.addEventListener) {
      collapseQuery.addEventListener("change", setHeaderCollapse);
    } else if (collapseQuery.addListener) {
      collapseQuery.addListener(setHeaderCollapse);
    }
    setHeaderCollapse();
  }

  function refreshChrome() {
    renderHome();
    document.querySelectorAll(".form-field select.form-select, .form-field select.select").forEach(enhanceFormSelect);
    document.querySelectorAll(".form-field").forEach(syncFilled);
    bindNewsletters();
    document.querySelectorAll(".search-btn").forEach(function (btn) {
      btn.setAttribute("aria-haspopup", "dialog");
      if (!btn.getAttribute("aria-expanded")) btn.setAttribute("aria-expanded", "false");
    });
    if (window.DSAtelier && window.DSAtelier.commerce && window.DSAtelier.commerce.cartCount) {
      var count = String(window.DSAtelier.commerce.cartCount());
      document.querySelectorAll(".cart-count").forEach(function (el) {
        el.textContent = count;
      });
    }
  }

  window.DSAtelier = window.DSAtelier || {};
  window.DSAtelier.ui = {
    busy: busy
  };
  window.DSAtelier.pages = window.DSAtelier.pages || {};
  window.DSAtelier.pages.home = { init: renderHome };
  window.DSAtelier.pages.shell = { init: refreshChrome };

  var PAGE_ASSETS = {
    "index.html": { css: ["css/home.css"], scripts: [] },
    "shop.html": { css: ["css/shop.css"], scripts: ["js/shop.js"] },
    "product.html": { css: ["css/product.css"], scripts: ["js/product.js"] },
    "cart.html": { css: ["css/commerce.css"], scripts: ["js/cart.js"] },
    "wishlist.html": { css: ["css/commerce.css"], scripts: ["js/wishlist.js"] },
    "account.html": { css: ["css/commerce.css", "css/account.css"], scripts: ["js/wishlist.js", "js/account.js"] },
    "support.html": { css: ["css/support.css"], scripts: ["js/support.js"] },
    "about.html": { css: ["css/about.css"], scripts: [] },
    "policy.html": { css: ["css/policy.css"], scripts: ["js/policy.js"] },
    "login.html": { css: ["css/auth.css"], scripts: ["js/auth.js"] },
    "register.html": { css: ["css/auth.css"], scripts: ["js/auth.js"] },
    "forgot-password.html": { css: ["css/auth.css"], scripts: ["js/auth.js"] },
    "reset-password.html": { css: ["css/auth.css"], scripts: ["js/auth.js"] }
  };

  var navigating = false;
  var progressEl = null;
  var lastPath = location.pathname + location.search;

  function pageFile(pathname) {
    var file = String(pathname || "").split("/").pop() || "index.html";
    if (!file || file.indexOf(".") === -1) file = "index.html";
    return file;
  }

  function sameDocument(url) {
    return url.pathname === location.pathname && url.search === location.search;
  }

  function canSoftNav(anchor, event) {
    if (!anchor || event.defaultPrevented) return false;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;
    var href = anchor.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    var protocol = (anchor.protocol || "").toLowerCase();
    if (protocol === "mailto:" || protocol === "tel:" || protocol === "javascript:") return false;
    if (anchor.origin !== location.origin) return false;
    var url;
    try {
      url = new URL(anchor.href);
    } catch (e) {
      return false;
    }
    if (sameDocument(url)) return false;
    return Boolean(PAGE_ASSETS[pageFile(url.pathname)]);
  }

  function progress(on) {
    if (!progressEl) {
      progressEl = document.createElement("div");
      progressEl.className = "ds-progress";
      progressEl.innerHTML = '<span class="ds-progress-bar"></span>';
      progressEl.setAttribute("aria-hidden", "true");
      document.body.appendChild(progressEl);
    }
    progressEl.classList.toggle("is-on", on);
    document.documentElement.classList.toggle("is-soft-nav", on);
  }

  function ensureStyle(href) {
    var abs = new URL(href, location.href).href;
    var found = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
      return link.href === abs;
    });
    if (found) return Promise.resolve();
    return new Promise(function (resolve) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  function ensureScript(src) {
    var abs = new URL(src, location.href).href;
    var found = Array.prototype.some.call(document.querySelectorAll("script[src]"), function (script) {
      return script.src === abs;
    });
    if (found) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function syncNav(file) {
    document.querySelectorAll(".header-nav .nav-link").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var target = pageFile(href.split("#")[0]);
      var active = false;
      if (file === "index.html") active = target === "index.html" && href.indexOf("#") === -1;
      else if (file === "product.html") active = target === "shop.html";
      else active = target === file;
      link.classList.toggle("is-active", active);
    });
  }

  function closeOverlays() {
    document.body.style.overflow = "";
    var drawer = document.querySelector("[data-drawer]");
    if (drawer) drawer.classList.remove("is-open");
    document.querySelectorAll(".shop-sheet.is-open, .product-lightbox.is-open, .size-guide-overlay.is-open, .quick-view.is-open, .search-modal.is-open").forEach(function (el) {
      el.classList.remove("is-open");
    });
    document.querySelectorAll("[data-address-modal]").forEach(function (el) {
      el.hidden = true;
    });
  }

  function replaceBodyRange(nextDoc) {
    var currentMain = document.getElementById("main");
    var nextMain = nextDoc.getElementById("main");
    var footer = document.querySelector(".site-footer");
    if (!currentMain || !nextMain || !footer) return false;
    var node = currentMain;
    while (node && node !== footer) {
      var following = node.nextSibling;
      node.parentNode.removeChild(node);
      node = following;
    }
    var frag = document.createDocumentFragment();
    var cursor = nextMain;
    var nextFooter = nextDoc.querySelector(".site-footer");
    while (cursor && cursor !== nextFooter) {
      var copy = cursor;
      cursor = cursor.nextSibling;
      frag.appendChild(document.importNode(copy, true));
    }
    footer.parentNode.insertBefore(frag, footer);
    return Boolean(document.getElementById("main"));
  }

  function initPages() {
    refreshChrome();
    var pages = window.DSAtelier && window.DSAtelier.pages;
    if (!pages) return;
    ["home", "shop", "product", "cart", "wishlist", "account", "support", "policy", "auth"].forEach(function (name) {
      if (pages[name] && typeof pages[name].init === "function") pages[name].init();
    });
  }

  function visit(url, push) {
    if (navigating) return Promise.resolve();
    navigating = true;
    progress(true);
    closeOverlays();
    return fetch(url.href, { credentials: "same-origin", headers: { Accept: "text/html" } })
      .then(function (res) {
        if (!res.ok) throw new Error("soft-nav");
        return res.text();
      })
      .then(function (html) {
        var nextDoc = new DOMParser().parseFromString(html, "text/html");
        if (!replaceBodyRange(nextDoc)) throw new Error("soft-nav");
        document.title = nextDoc.title || document.title;
        var nextDesc = nextDoc.querySelector('meta[name="description"]');
        var desc = document.querySelector('meta[name="description"]');
        if (nextDesc && desc) desc.setAttribute("content", nextDesc.getAttribute("content") || "");
        var file = pageFile(url.pathname);
        var assets = PAGE_ASSETS[file] || { css: [], scripts: [] };
        syncNav(file);
        if (push) history.pushState({ soft: true }, "", url.href);
        lastPath = url.pathname + url.search;
        return Promise.all(assets.css.map(ensureStyle)).then(function () {
          return assets.scripts.reduce(function (chain, src) {
            return chain.then(function () { return ensureScript(src); });
          }, Promise.resolve());
        });
      })
      .then(function () {
        initPages();
        if (url.hash) {
          var target = document.getElementById(url.hash.slice(1));
          if (target && target.scrollIntoView) target.scrollIntoView();
          else window.scrollTo(0, 0);
        } else {
          window.scrollTo(0, 0);
        }
        setHeaderCollapse();
      })
      .catch(function () {
        location.assign(url.href);
      })
      .then(function () {
        navigating = false;
        progress(false);
      });
  }

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest("a[href]");
    if (!canSoftNav(anchor, event)) return;
    event.preventDefault();
    closeOverlays();
    visit(new URL(anchor.href), true);
  });

  window.addEventListener("popstate", function () {
    var url = new URL(location.href);
    if (url.pathname + url.search === lastPath) return;
    visit(url, false);
  });
})();
