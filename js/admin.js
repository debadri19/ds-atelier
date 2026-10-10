(function () {
  var PAGES = {
    dashboard: "index.html",
    products: "products.html",
    categories: "categories.html",
    designs: "index.html#designs",
    orders: "index.html#orders",
    customers: "index.html#customers",
    discounts: "index.html#discounts",
    media: "index.html#media",
    settings: "index.html#settings"
  };
  var PLACEHOLDERS = ["designs", "orders", "customers", "discounts", "media", "settings"];
  var app = document.querySelector("[data-admin-app]");
  if (!app) return;

  var page = app.getAttribute("data-admin-page") || "dashboard";
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-admin-nav]"));
  var views = Array.prototype.slice.call(document.querySelectorAll("[data-admin-view]"));
  var openBtn = document.querySelector("[data-admin-open]");
  var closeEls = Array.prototype.slice.call(document.querySelectorAll("[data-admin-close]"));
  var modal = document.querySelector("[data-admin-modal]");
  var modalTitle = document.getElementById("admin-confirm-title");
  var modalBody = document.querySelector("[data-admin-confirm-body]");
  var toastEl = document.querySelector("[data-admin-toast]");
  var confirmOk = null;
  var toastTimer = null;

  function currentPlaceholder() {
    var hash = String(location.hash || "").replace("#", "");
    return PLACEHOLDERS.indexOf(hash) !== -1 ? hash : "";
  }

  function setNavOpen(open) {
    app.classList.toggle("is-nav-open", open);
    document.body.style.overflow = open && window.matchMedia("(max-width: 1024px)").matches ? "hidden" : "";
    if (openBtn) openBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function markActive(name) {
    document.querySelectorAll(".admin-nav-link").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-admin-nav") === name);
    });
  }

  function showPlaceholder(name) {
    var view = PLACEHOLDERS.indexOf(name) !== -1 ? name : "";
    views.forEach(function (el) {
      var key = el.getAttribute("data-admin-view");
      if (key === "dashboard") el.hidden = Boolean(view);
      else el.hidden = key !== view;
    });
    markActive(view || "dashboard");
    if (view && location.hash.replace("#", "") !== view) {
      history.replaceState(null, "", "#" + view);
    }
    if (!view && location.hash && PLACEHOLDERS.indexOf(location.hash.replace("#", "")) !== -1) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    setNavOpen(false);
    window.scrollTo(0, 0);
  }

  function hrefFor(name) {
    return PAGES[name] || "index.html";
  }

  function navigate(name) {
    var dest = hrefFor(name);
    if (page === "dashboard" && PLACEHOLDERS.indexOf(name) !== -1) {
      showPlaceholder(name);
      return;
    }
    if (page === name && PLACEHOLDERS.indexOf(name) === -1) {
      setNavOpen(false);
      return;
    }
    window.location.href = dest;
  }

  function setModal(open) {
    if (!modal) return;
    modal.hidden = !open;
    if (!open) confirmOk = null;
  }

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message || "";
    toastEl.hidden = !message;
    if (toastTimer) window.clearTimeout(toastTimer);
    if (message) {
      toastTimer = window.setTimeout(function () {
        toastEl.hidden = true;
      }, 2600);
    }
  }

  function confirm(options) {
    options = options || {};
    if (!modal) return;
    if (modalTitle) modalTitle.textContent = options.title || "Confirm action";
    if (modalBody) modalBody.textContent = options.body || "This is a frontend confirmation shell. No data is changed.";
    confirmOk = typeof options.onConfirm === "function" ? options.onConfirm : null;
    setModal(true);
  }

  navLinks.forEach(function (el) {
    var view = el.getAttribute("data-admin-nav");
    if (view && PAGES[view]) el.setAttribute("href", hrefFor(view));
    el.addEventListener("click", function (event) {
      if (!view) return;
      if (page === "dashboard" && PLACEHOLDERS.indexOf(view) !== -1) {
        event.preventDefault();
        showPlaceholder(view);
        return;
      }
      if (page === view) {
        event.preventDefault();
        setNavOpen(false);
      }
    });
  });

  if (openBtn) {
    openBtn.addEventListener("click", function () {
      setNavOpen(!app.classList.contains("is-nav-open"));
    });
  }

  closeEls.forEach(function (el) {
    el.addEventListener("click", function () {
      setNavOpen(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (modal && !modal.hidden) {
      setModal(false);
      return;
    }
    setNavOpen(false);
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-confirm-open]")) {
      confirm({
        title: "Confirm action",
        body: "This is a frontend confirmation shell. No data is changed."
      });
      return;
    }
    if (event.target.closest("[data-confirm-ok]")) {
      var fn = confirmOk;
      setModal(false);
      if (fn) fn();
      return;
    }
    if (event.target.closest("[data-confirm-close]")) {
      setModal(false);
    }
  });

  window.addEventListener("hashchange", function () {
    if (page === "dashboard") showPlaceholder(currentPlaceholder());
  });

  window.DSAtelier = window.DSAtelier || {};
  window.DSAtelier.admin = window.DSAtelier.admin || {};
  window.DSAtelier.admin.showView = navigate;
  window.DSAtelier.admin.toast = toast;
  window.DSAtelier.admin.confirm = confirm;
  window.DSAtelier.admin.page = page;

  if (page === "dashboard") showPlaceholder(currentPlaceholder());
  else markActive(page);
})();
