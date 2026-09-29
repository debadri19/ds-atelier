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

  document.querySelectorAll("[data-newsletter]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = form.querySelector("input[type='email']");
      var note = form.querySelector("[data-newsletter-note]");
      if (!input.value) return;
      if (note) note.hidden = false;
      input.value = "";
      syncFilled(input.closest(".form-field"));
    });
  });

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
})();
