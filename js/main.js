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
  var searchIdle = null;
  var searchRecentBlock = null;
  var searchRecentList = null;
  var searchPopularList = null;
  var searchLastFocus = null;
  var searchLastQuery = "";
  var searchRememberTimer = null;
  var searchActiveIndex = -1;
  var RECENT_SEARCHES_KEY = "ds-atelier-recent-searches";
  var RECENT_SEARCHES_MAX = 5;
  var POPULAR_SEARCHES = ["Oversized Tee", "Anime", "Hoodie", "Custom T-Shirt", "DTF", "Sublimation"];

  function getSearchSuggestions(query) {
    catalog = window.DSAtelier && window.DSAtelier.catalog;
    var trimmed = String(query || "").trim();
    if (!trimmed) return { products: [], categories: [] };
    if (catalog && catalog.suggest) return catalog.suggest(trimmed, { products: 5, categories: 3 });
    return { products: catalog && catalog.search ? catalog.search(trimmed, 5) : [], categories: [] };
  }

  function readRecentSearches() {
    try {
      var raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var seen = {};
      return parsed.map(function (item) {
        return String(item || "").trim();
      }).filter(function (item) {
        if (!item) return false;
        var key = item.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      }).slice(0, RECENT_SEARCHES_MAX);
    } catch (e) {
      return [];
    }
  }

  function writeRecentSearches(list) {
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list.slice(0, RECENT_SEARCHES_MAX)));
    } catch (e) {}
  }

  function queryHasResults(query) {
    var suggestions = getSearchSuggestions(query);
    return Boolean((suggestions.products && suggestions.products.length) || (suggestions.categories && suggestions.categories.length));
  }

  function rememberRecentSearch(query) {
    var trimmed = String(query || "").trim();
    if (!trimmed || !queryHasResults(trimmed)) return;
    var next = [trimmed];
    var seen = {};
    seen[trimmed.toLowerCase()] = true;
    readRecentSearches().forEach(function (item) {
      var key = item.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      next.push(item);
    });
    writeRecentSearches(next.slice(0, RECENT_SEARCHES_MAX));
  }

  function commitRecentSearch(query) {
    if (searchRememberTimer) {
      window.clearTimeout(searchRememberTimer);
      searchRememberTimer = null;
    }
    rememberRecentSearch(query);
    searchLastQuery = String(query || "").trim();
  }

  function scheduleRememberRecent(query) {
    if (searchRememberTimer) window.clearTimeout(searchRememberTimer);
    searchRememberTimer = window.setTimeout(function () {
      searchRememberTimer = null;
      commitRecentSearch(query);
    }, 650);
  }

  function clearRecentSearches() {
    if (searchRememberTimer) {
      window.clearTimeout(searchRememberTimer);
      searchRememberTimer = null;
    }
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (e) {}
    searchLastQuery = "";
    renderIdleSearches();
  }

  function chipButton(term, index, prefix) {
    var id = "search-opt-" + (prefix || "chip") + "-" + index;
    return '<button type="button" class="search-chip" id="' + id + '" role="option" aria-selected="false" data-search-term="' + escapeHtml(term) + '">' + escapeHtml(term) + "</button>";
  }

  function getSearchNavItems() {
    if (!searchModal || !searchModal.classList.contains("is-open")) return [];
    if (searchIdle && !searchIdle.hidden) {
      return Array.prototype.slice.call(searchIdle.querySelectorAll(".search-chip"));
    }
    if (searchResults && !searchResults.hidden) {
      return Array.prototype.slice.call(searchResults.querySelectorAll(".search-result-link"));
    }
    return [];
  }

  function syncSearchAria() {
    if (!searchInput) return;
    var idleOpen = searchIdle && !searchIdle.hidden;
    var resultsOpen = searchResults && !searchResults.hidden;
    searchInput.setAttribute("role", "combobox");
    searchInput.setAttribute("aria-autocomplete", "list");
    searchInput.setAttribute("aria-expanded", idleOpen || resultsOpen ? "true" : "false");
    if (idleOpen && searchIdle && searchIdle.id) searchInput.setAttribute("aria-controls", searchIdle.id);
    else if (resultsOpen && searchResults && searchResults.id) searchInput.setAttribute("aria-controls", searchResults.id);
    else searchInput.removeAttribute("aria-controls");
  }

  function clearSearchSelection() {
    searchActiveIndex = -1;
    if (searchModal) {
      searchModal.querySelectorAll("[aria-selected]").forEach(function (el) {
        el.classList.remove("is-active");
        el.setAttribute("aria-selected", "false");
      });
    }
    if (searchInput) searchInput.removeAttribute("aria-activedescendant");
  }

  function setSearchActiveIndex(index) {
    var items = getSearchNavItems();
    if (!items.length) {
      clearSearchSelection();
      syncSearchAria();
      return;
    }
    if (index < 0) index = 0;
    if (index > items.length - 1) index = items.length - 1;
    searchActiveIndex = index;
    items.forEach(function (el, i) {
      var on = i === index;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    var active = items[index];
    if (searchInput && active && active.id) searchInput.setAttribute("aria-activedescendant", active.id);
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest", inline: "nearest" });
    syncSearchAria();
  }

  function moveSearchSelection(step) {
    var items = getSearchNavItems();
    if (!items.length) return;
    var next = searchActiveIndex;
    if (next < 0) next = step > 0 ? 0 : items.length - 1;
    else next += step;
    if (next < 0) next = 0;
    if (next > items.length - 1) next = items.length - 1;
    setSearchActiveIndex(next);
  }

  function activateSearchItem(el) {
    if (!el) return;
    if (typeof el.click === "function") el.click();
  }

  function renderIdleSearches() {
    if (!searchIdle) return;
    var recents = readRecentSearches();
    if (searchRecentList) {
      searchRecentList.innerHTML = recents.map(function (term, index) {
        return chipButton(term, index, "recent");
      }).join("");
    }
    if (searchRecentBlock) searchRecentBlock.hidden = !recents.length;
    if (searchPopularList) {
      searchPopularList.innerHTML = POPULAR_SEARCHES.map(function (term, index) {
        return chipButton(term, index, "popular");
      }).join("");
    }
    clearSearchSelection();
    syncSearchAria();
  }

  function applySearchTerm(term) {
    buildSearchModal();
    if (!searchInput) return;
    searchInput.value = term;
    commitRecentSearch(term);
    renderSearchResults();
    if (searchInput.focus) searchInput.focus();
  }

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
        '<div class="search-idle" data-search-idle id="search-idle-list" role="listbox" aria-label="Recent and popular searches">' +
          '<section class="search-idle-block" data-recent-block hidden>' +
            '<div class="search-idle-head">' +
              '<p class="search-result-group search-idle-title">Recent Searches</p>' +
              '<button class="search-idle-clear" type="button" data-search-clear-recent>Clear</button>' +
            "</div>" +
            '<div class="search-chips" data-recent-list></div>' +
          "</section>" +
          '<section class="search-idle-block" data-popular-block>' +
            '<p class="search-result-group search-idle-title">Popular Searches</p>' +
            '<div class="search-chips" data-popular-list></div>' +
          "</section>" +
        "</div>" +
        '<ul class="search-results" data-search-results id="search-results-list" role="listbox" aria-label="Search results"></ul>' +
      "</div>";
    document.body.appendChild(wrap);

    searchModal = wrap;
    searchInput = wrap.querySelector("[data-search-input]");
    searchResults = wrap.querySelector("[data-search-results]");
    searchStatus = wrap.querySelector("[data-search-status]");
    searchIdle = wrap.querySelector("[data-search-idle]");
    searchRecentBlock = wrap.querySelector("[data-recent-block]");
    searchRecentList = wrap.querySelector("[data-recent-list]");
    searchPopularList = wrap.querySelector("[data-popular-list]");

    if (searchPopularList) {
      searchPopularList.innerHTML = POPULAR_SEARCHES.map(function (term, index) {
        return chipButton(term, index, "popular");
      }).join("");
    }
    if (searchInput) {
      searchInput.setAttribute("role", "combobox");
      searchInput.setAttribute("aria-autocomplete", "list");
      searchInput.setAttribute("aria-expanded", "false");
      searchInput.addEventListener("input", renderSearchResults);
    }
    wrap.addEventListener("mouseover", function (event) {
      var item = event.target.closest(".search-result-link, .search-chip");
      if (!item || !wrap.contains(item)) return;
      var items = getSearchNavItems();
      var index = items.indexOf(item);
      if (index === -1) return;
      setSearchActiveIndex(index);
    });
    return searchModal;
  }

  function renderSearchResults() {
    if (!searchResults) return;
    catalog = window.DSAtelier && window.DSAtelier.catalog;
    var query = searchInput ? searchInput.value : "";
    var trimmed = query.trim();
    searchResults.innerHTML = "";

    if (!trimmed) {
      if (searchRememberTimer) {
        window.clearTimeout(searchRememberTimer);
        searchRememberTimer = null;
      }
      if (searchLastQuery) commitRecentSearch(searchLastQuery);
      if (searchStatus) searchStatus.textContent = "";
      searchResults.hidden = true;
      if (searchIdle) searchIdle.hidden = false;
      renderIdleSearches();
      return;
    }

    searchLastQuery = trimmed;
    scheduleRememberRecent(trimmed);

    var suggestions = getSearchSuggestions(trimmed);
    var productsFound = suggestions.products || [];
    var categoriesFound = suggestions.categories || [];
    searchResults.hidden = false;

    if (!productsFound.length && !categoriesFound.length) {
      if (searchStatus) searchStatus.textContent = "No matching results";
      searchResults.hidden = true;
      clearSearchSelection();
      syncSearchAria();
      return;
    }

    var parts = [];
    if (productsFound.length) parts.push(productsFound.length + (productsFound.length === 1 ? " product" : " products"));
    if (categoriesFound.length) parts.push(categoriesFound.length + (categoriesFound.length === 1 ? " category" : " categories"));
    if (searchStatus) searchStatus.textContent = parts.join(" · ");

    var html = "";
    if (productsFound.length) {
      html += '<li class="search-result-group" role="presentation">PRODUCTS</li>';
      html += productsFound.map(function (item, index) {
        return (
          '<li class="search-result">' +
            '<a class="search-result-link" id="search-opt-product-' + index + '" role="option" aria-selected="false" href="' + escapeHtml(catalog.productUrl(item.id)) + '">' +
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
    if (categoriesFound.length) {
      html += '<li class="search-result-group search-result-group-categories" role="presentation">CATEGORIES</li>';
      html += categoriesFound.map(function (name, index) {
        var href = catalog.shopCategoryUrl ? catalog.shopCategoryUrl(name) : "shop.html?category=" + encodeURIComponent(name);
        return (
          '<li class="search-result search-result-category-item">' +
            '<a class="search-result-link search-result-link-category" id="search-opt-category-' + index + '" role="option" aria-selected="false" href="' + escapeHtml(href) + '">' +
              '<span class="search-result-media search-result-media-icon" aria-hidden="true"><i class="fa-solid fa-tag"></i></span>' +
              '<span class="search-result-body">' +
                '<span class="search-result-name">' + escapeHtml(name) + "</span>" +
                '<span class="search-result-category">Category</span>' +
              "</span>" +
            "</a>" +
          "</li>"
        );
      }).join("");
    }
    searchResults.innerHTML = html;
    clearSearchSelection();
    syncSearchAria();
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
    if (searchInput) commitRecentSearch(searchInput.value);
    clearSearchSelection();
    if (searchInput) searchInput.setAttribute("aria-expanded", "false");
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
      return;
    }
    if (event.target.closest("[data-search-clear-recent]")) {
      event.preventDefault();
      clearRecentSearches();
      return;
    }
    var chip = event.target.closest("[data-search-term]");
    if (chip && searchModal && searchModal.contains(chip)) {
      event.preventDefault();
      applySearchTerm(chip.getAttribute("data-search-term") || "");
      return;
    }
    if (event.target.closest(".search-result-link")) {
      if (searchInput) commitRecentSearch(searchInput.value);
      closeSearch();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeSearch();
      return;
    }
    if (!searchModal || !searchModal.classList.contains("is-open")) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (event.target !== searchInput && !searchModal.contains(event.target)) return;
      if (!getSearchNavItems().length) return;
      event.preventDefault();
      moveSearchSelection(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter") {
      var items = getSearchNavItems();
      if (searchActiveIndex >= 0 && items[searchActiveIndex]) {
        event.preventDefault();
        activateSearchItem(items[searchActiveIndex]);
        return;
      }
      if (searchInput && event.target === searchInput) commitRecentSearch(searchInput.value);
    }
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
    "designs.html": { css: ["css/designs.css"], scripts: ["js/artworks.js", "js/designs.js"] },
    "design.html": { css: ["css/design.css"], scripts: ["js/artworks.js", "js/design.js"] },
    "product.html": { css: ["css/product.css"], scripts: ["js/artworks.js", "js/product.js"] },
    "cart.html": { css: ["css/commerce.css"], scripts: ["js/cart.js"] },
    "checkout.html": { css: ["css/commerce.css", "css/account.css", "css/checkout.css"], scripts: ["js/account.js", "js/checkout.js"] },
    "order-success.html": { css: ["css/commerce.css", "css/account.css", "css/order-success.css"], scripts: ["js/account.js", "js/order-success.js"] },
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
    setSearchExpanded(false);
    document.querySelectorAll("[data-address-modal], [data-checkout-address-modal]").forEach(function (el) {
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
    ["home", "shop", "designs", "design", "product", "cart", "checkout", "orderSuccess", "wishlist", "account", "support", "policy", "auth"].forEach(function (name) {
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
