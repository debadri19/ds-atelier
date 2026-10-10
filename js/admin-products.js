(function () {
  var PRODUCT_TYPES = ["T-Shirt", "Oversized T-Shirt", "Hoodie", "Jersey", "Polo", "Tote Bag", "Accessories"];
  var PRINT_TYPES = ["DTF", "Sublimation"];
  var data = window.DSAtelier && window.DSAtelier.admin && window.DSAtelier.admin.data;
  var view = document.querySelector('[data-admin-view="products"]');
  var dashboard = document.querySelector('[data-admin-view="dashboard"]');
  if (!data) return;
  if (!view && !dashboard) return;

  var products = data.getProducts();
  var listEl = view ? view.querySelector("[data-prod-list]") : null;
  var formWrap = view ? view.querySelector("[data-prod-form-wrap]") : null;
  var form = view ? view.querySelector("[data-prod-form]") : null;
  var rowsEl = view ? view.querySelector("[data-prod-rows]") : null;
  var cardsEl = view ? view.querySelector("[data-prod-cards]") : null;
  var emptyEl = view ? view.querySelector("[data-prod-empty]") : null;
  var emptyTitle = view ? view.querySelector("[data-prod-empty-title]") : null;
  var emptyCopy = view ? view.querySelector("[data-prod-empty-copy]") : null;
  var countEl = view ? view.querySelector("[data-prod-count]") : null;
  var searchEl = view ? view.querySelector("[data-prod-search]") : null;
  var categoryEl = view ? view.querySelector("[data-prod-category]") : null;
  var statusEl = view ? view.querySelector("[data-prod-status]") : null;
  var typeEl = view ? view.querySelector("[data-prod-type]") : null;
  var sortEl = view ? view.querySelector("[data-prod-sort]") : null;
  var formTitle = view ? view.querySelector("[data-prod-form-title]") : null;
  var formError = view ? view.querySelector("[data-prod-form-error]") : null;
  var recentRows = document.querySelector("[data-recent-rows]");
  var recentSearch = document.querySelector("[data-recent-search]");
  var recentStatus = document.querySelector("[data-recent-status]");
  var slugTouched = false;
  var mode = "list";

  function today() {
    return data.today();
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
      .slice(0, 64);
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

  function categories() {
    return data.getCategories();
  }

  function categoryById(id) {
    return data.findCategory(id);
  }

  function categoryName(id) {
    return data.categoryName(id);
  }

  function displayPrice(item) {
    return data.displayPrice(item);
  }

  function formatPrice(value) {
    return data.formatPrice(value);
  }

  function imageSrc(item) {
    return data.imageUrl(item && item.image);
  }

  function statusBadge(status) {
    if (status === "active") return '<span class="admin-status admin-status-active">Active</span>';
    return '<span class="admin-status">Draft</span>';
  }

  function fillSelect(select, options, selected, placeholder) {
    if (!select) return;
    var html = placeholder ? '<option value="">' + escapeHtml(placeholder) + "</option>" : "";
    options.forEach(function (opt) {
      html += '<option value="' + escapeHtml(opt.value) + '"' + (opt.value === selected ? " selected" : "") + ">" + escapeHtml(opt.label) + "</option>";
    });
    select.innerHTML = html;
  }

  function categoryOptions(includeId) {
    return categories()
      .filter(function (item) {
        return item.status === "active" || item.id === includeId;
      })
      .sort(function (a, b) {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return String(a.name).localeCompare(String(b.name));
      })
      .map(function (item) {
        var label = item.name;
        if (item.status === "inactive") label += " (inactive)";
        return { value: item.id, label: label };
      });
  }

  function allCategoryOptions() {
    return categories()
      .slice()
      .sort(function (a, b) {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return String(a.name).localeCompare(String(b.name));
      })
      .map(function (item) {
        var label = item.name;
        if (item.status === "inactive") label += " (inactive)";
        return { value: item.id, label: label };
      });
  }

  function populateFilters() {
    var currentCat = categoryEl ? categoryEl.value : "all";
    var currentType = typeEl ? typeEl.value : "all";
    var catOptions = [{ value: "all", label: "All categories" }].concat(allCategoryOptions());
    fillSelect(categoryEl, catOptions, currentCat || "all");
    if (categoryEl && !Array.prototype.some.call(categoryEl.options, function (opt) { return opt.value === currentCat; })) {
      categoryEl.value = "all";
    }
    var typeOptions = [{ value: "all", label: "All types" }].concat(PRODUCT_TYPES.map(function (type) {
      return { value: type, label: type };
    }));
    fillSelect(typeEl, typeOptions, currentType || "all");
  }

  function populateFormSelects(item) {
    fillSelect(field("categoryId"), categoryOptions(item ? item.categoryId : ""), item ? item.categoryId : "", "Select category");
    fillSelect(field("productType"), PRODUCT_TYPES.map(function (type) {
      return { value: type, label: type };
    }), item ? item.productType : "", "Select type");
    fillSelect(field("printType"), PRINT_TYPES.map(function (type) {
      return { value: type, label: type };
    }), item ? item.printType : "", "Select print type");
  }

  function syncFilled() {
    if (!form) return;
    form.querySelectorAll(".form-field").forEach(function (fieldEl) {
      var control = fieldEl.querySelector(".form-input, .form-textarea, .form-select");
      var filled = false;
      if (control) {
        if (control.tagName === "SELECT") filled = Boolean(control.value);
        else filled = Boolean((control.value || "").trim());
      }
      fieldEl.classList.toggle("is-filled", filled);
    });
  }

  function filtered() {
    var q = searchEl ? String(searchEl.value || "").trim().toLowerCase() : "";
    var category = categoryEl ? categoryEl.value : "all";
    var status = statusEl ? statusEl.value : "all";
    var type = typeEl ? typeEl.value : "all";
    var sort = sortEl ? sortEl.value : "updated-desc";
    var list = products.filter(function (item) {
      if (category !== "all" && item.categoryId !== category) return false;
      if (status !== "all" && item.status !== status) return false;
      if (type !== "all" && item.productType !== type) return false;
      if (!q) return true;
      return String(item.name).toLowerCase().indexOf(q) !== -1 ||
        String(item.sku).toLowerCase().indexOf(q) !== -1 ||
        String(item.slug).toLowerCase().indexOf(q) !== -1;
    }).slice();
    list.sort(function (a, b) {
      if (sort === "name-asc") return String(a.name).localeCompare(String(b.name));
      if (sort === "name-desc") return String(b.name).localeCompare(String(a.name));
      if (sort === "price-asc") return displayPrice(a) - displayPrice(b);
      if (sort === "price-desc") return displayPrice(b) - displayPrice(a);
      if (sort === "updated-asc") return String(a.updatedAt).localeCompare(String(b.updatedAt)) || String(a.name).localeCompare(String(b.name));
      return String(b.updatedAt).localeCompare(String(a.updatedAt)) || String(a.name).localeCompare(String(b.name));
    });
    return list;
  }

  function actions(item) {
    var next = item.status === "active" ? "draft" : "active";
    return (
      '<div class="admin-prod-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-prod-edit="' + escapeHtml(item.id) + '">Edit</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-prod-toggle="' + escapeHtml(item.id) + '">' + (next === "draft" ? "Set draft" : "Set active") + "</button>" +
        '<button class="btn btn-ghost btn-sm" type="button" data-prod-delete="' + escapeHtml(item.id) + '">Delete</button>' +
      "</div>"
    );
  }

  function rowHtml(item) {
    return (
      "<tr>" +
        "<td>" +
          '<div class="admin-product">' +
            '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
            "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.slug) + "</span></span>" +
          "</div>" +
        "</td>" +
        "<td>" + escapeHtml(item.sku) + "</td>" +
        "<td>" + escapeHtml(categoryName(item.categoryId)) + "</td>" +
        "<td>" + escapeHtml(item.productType) + "</td>" +
        "<td>" + formatPrice(displayPrice(item)) + "</td>" +
        "<td>" + statusBadge(item.status) + "</td>" +
        "<td>" + escapeHtml(item.updatedAt) + "</td>" +
        "<td>" + actions(item) + "</td>" +
      "</tr>"
    );
  }

  function cardHtml(item) {
    return (
      '<article class="admin-prod-card">' +
        '<div class="admin-product">' +
          '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
          "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.sku) + "</span></span>" +
        "</div>" +
        '<div class="admin-prod-card-meta">' +
          "<span>" + escapeHtml(categoryName(item.categoryId)) + "</span>" +
          "<span>" + escapeHtml(item.productType) + "</span>" +
          "<span>" + formatPrice(displayPrice(item)) + "</span>" +
          statusBadge(item.status) +
        "</div>" +
        actions(item) +
      "</article>"
    );
  }

  function recentHtml(item) {
    return (
      "<tr>" +
        "<td>" +
          '<div class="admin-product">' +
            '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
            "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.sku) + "</span></span>" +
          "</div>" +
        "</td>" +
        "<td>" + escapeHtml(categoryName(item.categoryId)) + "</td>" +
        "<td>" + statusBadge(item.status) + "</td>" +
        "<td>" + formatPrice(displayPrice(item)) + "</td>" +
      "</tr>"
    );
  }

  function updateDashboard() {
    var total = products.length;
    var active = products.filter(function (item) { return item.status === "active"; }).length;
    var totalStat = document.querySelector('[data-stat="products"]');
    var activeStat = document.querySelector('[data-stat="active"]');
    var catStat = document.querySelector('[data-stat="categories"]');
    if (totalStat) totalStat.textContent = String(total);
    if (activeStat) activeStat.textContent = String(active);
    if (catStat) catStat.textContent = String(data.getCategories().length);
    if (!recentRows) return;
    var q = recentSearch ? String(recentSearch.value || "").trim().toLowerCase() : "";
    var status = recentStatus ? recentStatus.value : "all";
    var list = products.filter(function (item) {
      if (status !== "all" && item.status !== status) return false;
      if (!q) return true;
      return String(item.name).toLowerCase().indexOf(q) !== -1 || String(item.sku).toLowerCase().indexOf(q) !== -1;
    }).slice().sort(function (a, b) {
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    }).slice(0, 4);
    recentRows.innerHTML = list.length ? list.map(recentHtml).join("") : '<tr><td colspan="4">No matching products.</td></tr>';
  }

  function notifyCatalog() {
    data.setProducts(products);
    products = data.getProducts();
  }

  function renderList() {
    if (!view) {
      updateDashboard();
      return;
    }
    populateFilters();
    var list = filtered();
    if (rowsEl) rowsEl.innerHTML = list.map(rowHtml).join("");
    if (cardsEl) cardsEl.innerHTML = list.map(cardHtml).join("");
    var hasProducts = products.length > 0;
    var hasMatches = list.length > 0;
    if (emptyEl) emptyEl.hidden = hasMatches;
    if (emptyTitle) emptyTitle.textContent = hasProducts ? "No matching products" : "No products yet";
    if (emptyCopy) emptyCopy.textContent = hasProducts
      ? "Try another name, SKU or filter. Reset filters to see the full demo list."
      : "Add a product to start the demo catalog. Changes stay in this session only.";
    var tableWrap = view.querySelector(".admin-prod-table-wrap");
    if (tableWrap) tableWrap.hidden = !hasMatches;
    if (cardsEl) cardsEl.hidden = !hasMatches;
    if (countEl) countEl.textContent = list.length === 1 ? "1 product" : list.length + " products";
    updateDashboard();
  }

  function showList() {
    mode = "list";
    if (listEl) listEl.hidden = false;
    if (formWrap) formWrap.hidden = true;
    if (location.hash === "#add") history.replaceState(null, "", location.pathname + location.search);
    renderList();
  }

  function field(name) {
    return form.elements[name];
  }

  function openForm(item) {
    mode = item ? "edit" : "add";
    slugTouched = Boolean(item);
    if (listEl) listEl.hidden = true;
    if (formWrap) formWrap.hidden = false;
    if (formTitle) formTitle.textContent = item ? "Edit Product" : "Add Product";
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    populateFormSelects(item);
    field("id").value = item ? item.id : "";
    field("name").value = item ? item.name : "";
    field("slug").value = item ? item.slug : "";
    field("sku").value = item ? item.sku : "";
    field("categoryId").value = item ? item.categoryId : "";
    field("productType").value = item ? item.productType : "";
    field("printType").value = item ? item.printType : "";
    field("shortDescription").value = item ? item.shortDescription : "";
    field("description").value = item ? item.description : "";
    field("regularPrice").value = item ? item.regularPrice : "";
    field("salePrice").value = item && item.salePrice != null ? item.salePrice : "";
    field("image").value = item ? item.image : "";
    field("status").value = item ? item.status : "active";
    field("featured").value = item && item.featured ? "yes" : "no";
    syncFilled();
    window.scrollTo(0, 0);
    var first = field("name");
    if (first && typeof first.focus === "function") first.focus();
  }

  function findById(id) {
    return products.filter(function (item) {
      return item.id === id;
    })[0] || null;
  }

  function uniqueSlug(slug, skipId) {
    var base = slug || "product";
    var next = base;
    var i = 2;
    while (products.some(function (item) {
      return item.slug === next && item.id !== skipId;
    })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function uniqueId(slug) {
    var base = slug || "product";
    var next = base;
    var i = 2;
    while (products.some(function (item) {
      return item.id === next;
    })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function readForm() {
    var name = String(field("name").value || "").trim();
    var slug = slugify(field("slug").value || name);
    var sku = String(field("sku").value || "").trim();
    var categoryId = String(field("categoryId").value || "").trim();
    var productType = String(field("productType").value || "").trim();
    var printType = String(field("printType").value || "").trim();
    var regularRaw = String(field("regularPrice").value || "").trim();
    var saleRaw = String(field("salePrice").value || "").trim();
    var currentId = String(field("id").value || "");
    var regularPrice = Number(regularRaw);
    var salePrice = saleRaw === "" ? null : Number(saleRaw);
    var errors = [];
    if (!name) errors.push("Product name is required.");
    if (!slug) errors.push("Slug is required.");
    if (!sku) errors.push("SKU is required.");
    if (!categoryId) errors.push("Category is required.");
    if (!productType) errors.push("Product type is required.");
    if (!printType) errors.push("Print type is required.");
    if (!regularRaw || !Number.isFinite(regularPrice) || regularPrice < 0) errors.push("Regular price must be a number of 0 or more.");
    if (saleRaw !== "" && (!Number.isFinite(salePrice) || salePrice < 0)) errors.push("Sale price must be a number of 0 or more.");
    if (salePrice != null && Number.isFinite(regularPrice) && salePrice >= regularPrice) errors.push("Sale price must be lower than regular price.");
    if (sku && products.some(function (item) {
      return String(item.sku).toLowerCase() === sku.toLowerCase() && item.id !== currentId;
    })) errors.push("SKU must be unique.");
    if (slug && products.some(function (item) {
      return item.slug === slug && item.id !== currentId;
    })) errors.push("Slug must be unique.");
    if (errors.length) return { errors: errors };
    return {
      errors: [],
      data: {
        id: currentId || uniqueId(slug),
        name: name,
        slug: uniqueSlug(slug, currentId),
        sku: sku,
        categoryId: categoryId,
        description: String(field("description").value || "").trim(),
        shortDescription: String(field("shortDescription").value || "").trim(),
        productType: productType,
        printType: printType,
        regularPrice: regularPrice,
        salePrice: salePrice,
        status: field("status").value === "draft" ? "draft" : "active",
        featured: field("featured").value === "yes",
        image: String(field("image").value || "").trim()
      }
    };
  }

  function saveForm(event) {
    event.preventDefault();
    var result = readForm();
    if (result.errors.length) {
      formError.hidden = false;
      formError.textContent = result.errors.join(" ");
      var firstInvalid = form.querySelector(".form-input:invalid, .form-select:invalid, .form-textarea:invalid") || field("name");
      if (firstInvalid && typeof firstInvalid.focus === "function") firstInvalid.focus();
      return;
    }
    var existing = findById(result.data.id);
    if (existing) {
      existing.name = result.data.name;
      existing.slug = result.data.slug;
      existing.sku = result.data.sku;
      existing.categoryId = result.data.categoryId;
      existing.description = result.data.description;
      existing.shortDescription = result.data.shortDescription;
      existing.productType = result.data.productType;
      existing.printType = result.data.printType;
      existing.regularPrice = result.data.regularPrice;
      existing.salePrice = result.data.salePrice;
      existing.status = result.data.status;
      existing.featured = result.data.featured;
      existing.image = result.data.image;
      existing.updatedAt = today();
      toast("Product updated.");
    } else {
      products.push({
        id: result.data.id,
        name: result.data.name,
        slug: result.data.slug,
        sku: result.data.sku,
        categoryId: result.data.categoryId,
        description: result.data.description,
        shortDescription: result.data.shortDescription,
        productType: result.data.productType,
        printType: result.data.printType,
        regularPrice: result.data.regularPrice,
        salePrice: result.data.salePrice,
        status: result.data.status,
        featured: result.data.featured,
        image: result.data.image,
        createdAt: today(),
        updatedAt: today()
      });
      toast("Product added.");
    }
    notifyCatalog();
    showList();
  }

  function toggleStatus(id) {
    var item = findById(id);
    if (!item) return;
    item.status = item.status === "active" ? "draft" : "active";
    item.updatedAt = today();
    notifyCatalog();
    renderList();
    toast(item.name + " is now " + item.status + ".");
  }

  function deleteProduct(id) {
    var item = findById(id);
    if (!item) return;
    confirmAction({
      title: "Delete product",
      body: 'Delete "' + item.name + '" from the demo catalog? This does not change the storefront.',
      onConfirm: function () {
        products = products.filter(function (entry) {
          return entry.id !== id;
        });
        notifyCatalog();
        showList();
        toast(item.name + " deleted.");
      }
    });
  }

  function resetFilters() {
    if (searchEl) searchEl.value = "";
    if (categoryEl) categoryEl.value = "all";
    if (statusEl) statusEl.value = "all";
    if (typeEl) typeEl.value = "all";
    if (sortEl) sortEl.value = "updated-desc";
    showList();
  }

  if (view) view.addEventListener("click", function (event) {
    var add = event.target.closest("[data-prod-add]");
    if (add) {
      event.preventDefault();
      openForm(null);
      return;
    }
    var cancel = event.target.closest("[data-prod-cancel]");
    if (cancel) {
      event.preventDefault();
      showList();
      return;
    }
    var reset = event.target.closest("[data-prod-reset]");
    if (reset) {
      event.preventDefault();
      resetFilters();
      return;
    }
    var edit = event.target.closest("[data-prod-edit]");
    if (edit) {
      event.preventDefault();
      openForm(findById(edit.getAttribute("data-prod-edit")));
      return;
    }
    var toggle = event.target.closest("[data-prod-toggle]");
    if (toggle) {
      event.preventDefault();
      toggleStatus(toggle.getAttribute("data-prod-toggle"));
      return;
    }
    var del = event.target.closest("[data-prod-delete]");
    if (del) {
      event.preventDefault();
      deleteProduct(del.getAttribute("data-prod-delete"));
    }
  });

  if (form) form.addEventListener("submit", saveForm);
  if (searchEl) searchEl.addEventListener("input", renderList);
  if (categoryEl) categoryEl.addEventListener("change", renderList);
  if (statusEl) statusEl.addEventListener("change", renderList);
  if (typeEl) typeEl.addEventListener("change", renderList);
  if (sortEl) sortEl.addEventListener("change", renderList);
  if (recentSearch) recentSearch.addEventListener("input", updateDashboard);
  if (recentStatus) recentStatus.addEventListener("change", updateDashboard);
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

  document.addEventListener("ds-admin-categories", function () {
    products = data.getProducts();
    if (view) {
      populateFilters();
      if (mode === "list") renderList();
      else if (form) populateFormSelects(findById(field("id").value));
    }
    updateDashboard();
  });

  window.DSAtelier.admin.products = {
    list: function () { return products.slice(); },
    countByCategory: function (id) {
      return data.countByCategory(id);
    },
    filterByCategory: function (id) {
      if (categoryEl) categoryEl.value = id || "all";
      if (searchEl) searchEl.value = "";
      if (statusEl) statusEl.value = "all";
      if (typeEl) typeEl.value = "all";
      showList();
    }
  };

  if (view) {
    var params = new URLSearchParams(location.search);
    var catFilter = params.get("category");
    populateFilters();
    if (catFilter && categoryEl) categoryEl.value = catFilter;
    if (location.hash === "#add") openForm(null);
    else showList();
  } else {
    updateDashboard();
  }
})();
