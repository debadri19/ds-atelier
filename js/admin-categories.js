(function () {
  var data = window.DSAtelier && window.DSAtelier.admin && window.DSAtelier.admin.data;
  var view = document.querySelector('[data-admin-view="categories"]');
  if (!view || !data) return;

  var categories = data.getCategories();
  var listEl = view.querySelector("[data-cat-list]");
  var formWrap = view.querySelector("[data-cat-form-wrap]");
  var form = view.querySelector("[data-cat-form]");
  var rowsEl = view.querySelector("[data-cat-rows]");
  var cardsEl = view.querySelector("[data-cat-cards]");
  var emptyEl = view.querySelector("[data-cat-empty]");
  var countEl = view.querySelector("[data-cat-count]");
  var searchEl = view.querySelector("[data-cat-search]");
  var statusEl = view.querySelector("[data-cat-status]");
  var formTitle = view.querySelector("[data-cat-form-title]");
  var formError = view.querySelector("[data-cat-form-error]");
  var slugTouched = false;
  var mode = "list";

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function toast(message) {
    if (window.DSAtelier && window.DSAtelier.admin && window.DSAtelier.admin.toast) {
      window.DSAtelier.admin.toast(message);
    }
  }

  function confirmAction(options) {
    if (window.DSAtelier && window.DSAtelier.admin && window.DSAtelier.admin.confirm) {
      window.DSAtelier.admin.confirm(options);
    }
  }

  function syncFilled() {
    if (!form) return;
    form.querySelectorAll(".form-field").forEach(function (field) {
      var control = field.querySelector(".form-input, .form-textarea, .form-select");
      var filled = false;
      if (control) {
        if (control.tagName === "SELECT") filled = Boolean(control.value);
        else filled = Boolean((control.value || "").trim());
      }
      field.classList.toggle("is-filled", filled);
    });
  }

  function filtered() {
    var q = searchEl ? String(searchEl.value || "").trim().toLowerCase() : "";
    var status = statusEl ? statusEl.value : "all";
    return categories.filter(function (item) {
      if (status !== "all" && item.status !== status) return false;
      if (!q) return true;
      return String(item.name).toLowerCase().indexOf(q) !== -1 || String(item.slug).toLowerCase().indexOf(q) !== -1;
    }).slice().sort(function (a, b) {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  function imageSrc(item) {
    return data.imageUrl(item && item.image);
  }

  function statusBadge(status) {
    if (status === "active") return '<span class="admin-status admin-status-active">Active</span>';
    return '<span class="admin-status">Inactive</span>';
  }

  function actions(item) {
    var next = item.status === "active" ? "inactive" : "active";
    return (
      '<div class="admin-cat-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-cat-edit="' + escapeHtml(item.id) + '">Edit</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-cat-toggle="' + escapeHtml(item.id) + '">' + (next === "inactive" ? "Set inactive" : "Set active") + "</button>" +
        '<button class="btn btn-ghost btn-sm" type="button" data-cat-delete="' + escapeHtml(item.id) + '">Delete</button>' +
      "</div>"
    );
  }

  function rowHtml(item) {
    return (
      "<tr>" +
        "<td>" +
          '<div class="admin-product">' +
            '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
            "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.description) + "</span></span>" +
          "</div>" +
        "</td>" +
        "<td>" + escapeHtml(item.slug) + "</td>" +
        '<td><button class="admin-cat-count-btn" type="button" data-cat-products="' + escapeHtml(item.id) + '">' + item.productCount + "</button></td>" +
        "<td>" + statusBadge(item.status) + "</td>" +
        "<td>" + item.displayOrder + "</td>" +
        "<td>" + escapeHtml(item.updated) + "</td>" +
        "<td>" + actions(item) + "</td>" +
      "</tr>"
    );
  }

  function cardHtml(item) {
    return (
      '<article class="admin-cat-card">' +
        '<div class="admin-product">' +
          '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
          "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.slug) + "</span></span>" +
        "</div>" +
        '<div class="admin-cat-card-meta">' +
          '<span>Order ' + item.displayOrder + "</span>" +
          "<span>" + escapeHtml(item.updated) + "</span>" +
          statusBadge(item.status) +
        "</div>" +
        '<button class="admin-cat-count-btn" type="button" data-cat-products="' + escapeHtml(item.id) + '">' + item.productCount + " products</button>" +
        actions(item) +
      "</article>"
    );
  }

  function productCountFor(id) {
    return data.countByCategory(id);
  }

  function syncProductCounts() {
    categories.forEach(function (item) {
      item.productCount = productCountFor(item.id);
    });
  }

  function notifyCatalog() {
    data.setCategories(categories);
    categories = data.getCategories();
  }

  function renderList() {
    syncProductCounts();
    var list = filtered();
    if (rowsEl) rowsEl.innerHTML = list.map(rowHtml).join("");
    if (cardsEl) cardsEl.innerHTML = list.map(cardHtml).join("");
    if (emptyEl) emptyEl.hidden = list.length > 0;
    var tableWrap = view.querySelector(".admin-cat-table-wrap");
    if (tableWrap) tableWrap.hidden = list.length === 0;
    if (cardsEl) cardsEl.hidden = list.length === 0;
    if (countEl) countEl.textContent = list.length === 1 ? "1 category" : list.length + " categories";
    var stat = document.querySelector('[data-stat="categories"]');
    if (stat) stat.textContent = String(categories.length);
  }

  function showList() {
    mode = "list";
    if (listEl) listEl.hidden = false;
    if (formWrap) formWrap.hidden = true;
    if (location.hash === "#add") history.replaceState(null, "", location.pathname + location.search);
    renderList();
  }

  function openForm(item) {
    mode = item ? "edit" : "add";
    slugTouched = Boolean(item);
    if (listEl) listEl.hidden = true;
    if (formWrap) formWrap.hidden = false;
    if (formTitle) formTitle.textContent = item ? "Edit Category" : "Add Category";
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    field("id").value = item ? item.id : "";
    field("name").value = item ? item.name : "";
    field("slug").value = item ? item.slug : "";
    field("description").value = item ? item.description : "";
    field("image").value = item ? item.image : "";
    field("displayOrder").value = item ? item.displayOrder : nextOrder();
    field("status").value = item ? item.status : "active";
    syncFilled();
    var content = document.querySelector(".admin-content");
    if (content) content.scrollTop = 0;
    else window.scrollTo(0, 0);
  }

  function nextOrder() {
    var max = 0;
    categories.forEach(function (item) {
      if (item.displayOrder > max) max = item.displayOrder;
    });
    return max + 1;
  }

  function findById(id) {
    return categories.filter(function (item) {
      return item.id === id;
    })[0] || null;
  }

  function uniqueSlug(slug, skipId) {
    var base = slug || "category";
    var next = base;
    var i = 2;
    while (categories.some(function (item) {
      return item.slug === next && item.id !== skipId;
    })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function uniqueId(slug) {
    var base = slug || "category";
    var next = base;
    var i = 2;
    while (categories.some(function (item) {
      return item.id === next;
    })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function field(name) {
    return form.elements[name];
  }

  function readForm() {
    var name = String(field("name").value || "").trim();
    var slug = slugify(field("slug").value || name);
    var order = Number(field("displayOrder").value);
    var currentId = String(field("id").value || "");
    var errors = [];
    if (!name) errors.push("Category name is required.");
    if (!slug) errors.push("Slug is required.");
    if (!Number.isFinite(order) || order < 1 || Math.floor(order) !== order) errors.push("Display order must be a whole number of 1 or more.");
    if (errors.length) return { errors: errors };
    return {
      errors: [],
      data: {
        id: currentId || uniqueId(slug),
        name: name,
        slug: uniqueSlug(slug, currentId),
        description: String(field("description").value || "").trim(),
        image: String(field("image").value || "").trim(),
        displayOrder: order,
        status: field("status").value === "inactive" ? "inactive" : "active"
      }
    };
  }

  function saveForm(event) {
    event.preventDefault();
    var result = readForm();
    if (result.errors.length) {
      formError.hidden = false;
      formError.textContent = result.errors.join(" ");
      return;
    }
    var existing = findById(result.data.id);
    if (existing) {
      existing.name = result.data.name;
      existing.slug = result.data.slug;
      existing.description = result.data.description;
      existing.image = result.data.image;
      existing.displayOrder = result.data.displayOrder;
      existing.status = result.data.status;
      existing.updated = today();
      toast("Category updated.");
    } else {
      categories.push({
        id: result.data.id,
        name: result.data.name,
        slug: result.data.slug,
        description: result.data.description,
        image: result.data.image,
        productCount: 0,
        displayOrder: result.data.displayOrder,
        status: result.data.status,
        updated: today()
      });
      toast("Category added.");
    }
    notifyCatalog();
    showList();
  }

  function toggleStatus(id) {
    var item = findById(id);
    if (!item) return;
    item.status = item.status === "active" ? "inactive" : "active";
    item.updated = today();
    notifyCatalog();
    renderList();
    toast(item.name + " is now " + item.status + ".");
  }

  function deleteCategory(id) {
    var item = findById(id);
    if (!item) return;
    confirmAction({
      title: "Delete category",
      body: 'Delete "' + item.name + '" from the demo catalog? This does not change the storefront.',
      onConfirm: function () {
        categories = categories.filter(function (entry) {
          return entry.id !== id;
        });
        notifyCatalog();
        showList();
        toast(item.name + " deleted.");
      }
    });
  }

  view.addEventListener("click", function (event) {
    var add = event.target.closest("[data-cat-add]");
    if (add) {
      event.preventDefault();
      openForm(null);
      return;
    }
    var cancel = event.target.closest("[data-cat-cancel]");
    if (cancel) {
      event.preventDefault();
      showList();
      return;
    }
    var reset = event.target.closest("[data-cat-reset]");
    if (reset) {
      event.preventDefault();
      if (searchEl) searchEl.value = "";
      if (statusEl) statusEl.value = "all";
      showList();
      return;
    }
    var edit = event.target.closest("[data-cat-edit]");
    if (edit) {
      event.preventDefault();
      openForm(findById(edit.getAttribute("data-cat-edit")));
      return;
    }
    var toggle = event.target.closest("[data-cat-toggle]");
    if (toggle) {
      event.preventDefault();
      toggleStatus(toggle.getAttribute("data-cat-toggle"));
      return;
    }
    var del = event.target.closest("[data-cat-delete]");
    if (del) {
      event.preventDefault();
      deleteCategory(del.getAttribute("data-cat-delete"));
      return;
    }
    var productsBtn = event.target.closest("[data-cat-products]");
    if (productsBtn) {
      event.preventDefault();
      var item = findById(productsBtn.getAttribute("data-cat-products"));
      window.location.href = "products.html" + (item ? "?category=" + encodeURIComponent(item.id) : "");
    }
  });

  if (form) form.addEventListener("submit", saveForm);
  if (searchEl) searchEl.addEventListener("input", renderList);
  if (statusEl) statusEl.addEventListener("change", renderList);
  if (form && field("name")) {
    field("name").addEventListener("input", function () {
      if (slugTouched) return;
      field("slug").value = slugify(field("name").value);
      syncFilled();
    });
  }
  if (form && field("slug")) {
    field("slug").addEventListener("input", function () {
      slugTouched = Boolean(field("slug").value.trim());
    });
  }
  if (form) {
    form.addEventListener("input", syncFilled);
    form.addEventListener("change", syncFilled);
  }

  document.addEventListener("ds-admin-products", function () {
    categories = data.getCategories();
    renderList();
  });

  window.DSAtelier.admin.categories = {
    list: function () { return categories.slice(); },
    find: findById,
    refresh: function () { renderList(); }
  };

  if (location.hash === "#add") openForm(null);
  else renderList();
})();
