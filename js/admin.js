(function () {
  var VIEWS = ["dashboard", "products", "categories", "designs", "orders", "customers", "discounts", "media", "settings"];
  var app = document.querySelector("[data-admin-app]");
  if (!app) return;

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

  function currentView() {
    var hash = String(location.hash || "").replace("#", "");
    return VIEWS.indexOf(hash) !== -1 ? hash : "dashboard";
  }

  function setNavOpen(open) {
    app.classList.toggle("is-nav-open", open);
    document.body.style.overflow = open && window.matchMedia("(max-width: 1024px)").matches ? "hidden" : "";
    if (openBtn) openBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function showView(name) {
    var view = VIEWS.indexOf(name) !== -1 ? name : "dashboard";
    views.forEach(function (el) {
      el.hidden = el.getAttribute("data-admin-view") !== view;
    });
    document.querySelectorAll(".admin-nav-link").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-admin-nav") === view);
    });
    if (location.hash.replace("#", "") !== view) {
      history.replaceState(null, "", "#" + view);
    }
    setNavOpen(false);
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("ds-admin-view", { detail: { view: view } }));
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
    el.addEventListener("click", function (event) {
      var view = el.getAttribute("data-admin-nav");
      if (!view) return;
      event.preventDefault();
      showView(view);
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
    showView(currentView());
  });

  window.DSAtelier = window.DSAtelier || {};
  window.DSAtelier.admin = {
    showView: showView,
    toast: toast,
    confirm: confirm
  };

  showView(currentView());
})();
