(function () {
  var data = window.DSAtelier && window.DSAtelier.admin && window.DSAtelier.admin.data;
  var view = document.querySelector('[data-admin-view="designs"]');
  if (!view || !data) return;

  var artworks = data.getArtworks();
  var listEl = view.querySelector("[data-art-list]");
  var formWrap = view.querySelector("[data-art-form-wrap]");
  var form = view.querySelector("[data-art-form]");
  var rowsEl = view.querySelector("[data-art-rows]");
  var cardsEl = view.querySelector("[data-art-cards]");
  var emptyEl = view.querySelector("[data-art-empty]");
  var countEl = view.querySelector("[data-art-count]");
  var searchEl = view.querySelector("[data-art-search]");
  var statusEl = view.querySelector("[data-art-status]");
  var categoryEl = view.querySelector("[data-art-category]");
  var productsEl = view.querySelector("[data-art-products]");
  var formTitle = view.querySelector("[data-art-form-title]");
  var formError = view.querySelector("[data-art-form-error]");
  var slugTouched = false;
  var mode = "list";

  function today() {
    return data.today ? data.today() : new Date().toISOString().slice(0, 10);
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

  function artworkCategories() {
    return data.artworkCategories || [];
  }

  function products() {
    return data.getProducts() || [];
  }

  function categoryLabel(id) {
    return data.artworkCategoryLabel ? data.artworkCategoryLabel(id) : id;
  }

  function imageSrc(item) {
    return data.imageUrl(item && (item.thumbnail || item.preview));
  }

  function linkedCount(item) {
    return data.linkedProductCount ? data.linkedProductCount(item) : (item.availableProducts || []).length;
  }

  function parseTags(value) {
    return String(value || "").split(",").map(function (tag) {
      return tag.trim();
    }).filter(Boolean);
  }

  function syncFilled() {
    if (!form) return;
    form.querySelectorAll(".form-field").forEach(function (fieldWrap) {
      var control = fieldWrap.querySelector(".form-input, .form-textarea, .form-select");
      var filled = false;
      if (control) {
        if (control.tagName === "SELECT") filled = Boolean(control.value);
        else filled = Boolean((control.value || "").trim());
      }
      fieldWrap.classList.toggle("is-filled", filled);
    });
  }

  function populateFilters() {
    if (!categoryEl) return;
    var current = categoryEl.value || "all";
    var html = '<option value="all">All categories</option>';
    artworkCategories().forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.label) + "</option>";
    });
    categoryEl.innerHTML = html;
    categoryEl.value = current;
    if (categoryEl.value !== current) categoryEl.value = "all";
  }

  function populateCategorySelect(selected) {
    var select = field("category");
    if (!select) return;
    var html = '<option value="">Select category</option>';
    artworkCategories().forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.label) + "</option>";
    });
    select.innerHTML = html;
    select.value = selected || "";
  }

  function populateProductMap(selectedIds) {
    if (!productsEl) return;
    var selected = {};
    (selectedIds || []).forEach(function (id) { selected[id] = true; });
    var list = products().slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    });
    if (!list.length) {
      productsEl.innerHTML = '<p class="admin-art-map-empty">No products in the demo catalog.</p>';
      return;
    }
    productsEl.innerHTML = list.map(function (item) {
      var checked = selected[item.id] ? " checked" : "";
      var status = item.status === "active" ? "Active" : "Draft";
      return (
        '<label class="admin-art-check">' +
          '<input type="checkbox" name="availableProducts" value="' + escapeHtml(item.id) + '"' + checked + ">" +
          "<span>" +
            "<strong>" + escapeHtml(item.name) + "</strong>" +
            "<em>" + escapeHtml(item.sku) + " · " + escapeHtml(status) + "</em>" +
          "</span>" +
        "</label>"
      );
    }).join("");
  }

  function filtered() {
    var q = searchEl ? String(searchEl.value || "").trim().toLowerCase() : "";
    var status = statusEl ? statusEl.value : "all";
    var category = categoryEl ? categoryEl.value : "all";
    return artworks.filter(function (item) {
      if (status !== "all" && item.status !== status) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      var hay = [item.name, item.slug, item.category, categoryLabel(item.category), (item.tags || []).join(" ")].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    });
  }

  function statusBadge(status) {
    if (status === "active") return '<span class="admin-status admin-status-active">Active</span>';
    return '<span class="admin-status">Inactive</span>';
  }

  function actions(item) {
    var next = item.status === "active" ? "inactive" : "active";
    return (
      '<div class="admin-art-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-art-edit="' + escapeHtml(item.id) + '">Edit</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-art-toggle="' + escapeHtml(item.id) + '">' + (next === "inactive" ? "Set inactive" : "Set active") + "</button>" +
        '<button class="btn btn-ghost btn-sm" type="button" data-art-delete="' + escapeHtml(item.id) + '">Delete</button>' +
      "</div>"
    );
  }

  function rowHtml(item) {
    return (
      "<tr>" +
        "<td>" +
          '<div class="admin-product">' +
            '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
            "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml((item.tags || []).join(", ") || item.description) + "</span></span>" +
          "</div>" +
        "</td>" +
        "<td>" + escapeHtml(item.slug) + "</td>" +
        "<td>" + escapeHtml(categoryLabel(item.category)) + "</td>" +
        "<td>" + linkedCount(item) + "</td>" +
        "<td>" + statusBadge(item.status) + "</td>" +
        "<td>" + escapeHtml(item.updatedAt) + "</td>" +
        "<td>" + actions(item) + "</td>" +
      "</tr>"
    );
  }

  function cardHtml(item) {
    return (
      '<article class="admin-art-card">' +
        '<div class="admin-product">' +
          '<img src="' + escapeHtml(imageSrc(item)) + '" alt="">' +
          "<span><strong>" + escapeHtml(item.name) + "</strong><span>" + escapeHtml(item.slug) + "</span></span>" +
        "</div>" +
        '<div class="admin-art-card-meta">' +
          "<span>" + escapeHtml(categoryLabel(item.category)) + "</span>" +
          "<span>" + linkedCount(item) + " products</span>" +
          "<span>" + escapeHtml(item.updatedAt) + "</span>" +
          statusBadge(item.status) +
        "</div>" +
        actions(item) +
      "</article>"
    );
  }

  function notifyCatalog() {
    data.setArtworks(artworks);
    artworks = data.getArtworks();
  }

  function updateDashboard() {
    var stat = document.querySelector('[data-stat="designs"]');
    if (stat) stat.textContent = String(artworks.length);
  }

  function renderList() {
    populateFilters();
    var list = filtered();
    if (rowsEl) rowsEl.innerHTML = list.map(rowHtml).join("");
    if (cardsEl) cardsEl.innerHTML = list.map(cardHtml).join("");
    if (emptyEl) emptyEl.hidden = list.length > 0;
    var tableWrap = view.querySelector(".admin-art-table-wrap");
    if (tableWrap) tableWrap.hidden = list.length === 0;
    if (cardsEl) cardsEl.hidden = list.length === 0;
    if (countEl) countEl.textContent = list.length === 1 ? "1 artwork" : list.length + " artworks";
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
    if (formTitle) formTitle.textContent = item ? "Edit Artwork" : "Add Artwork";
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    field("id").value = item ? item.id : "";
    field("name").value = item ? item.name : "";
    field("slug").value = item ? item.slug : "";
    populateCategorySelect(item ? item.category : "");
    field("status").value = item ? item.status : "active";
    field("description").value = item ? item.description : "";
    field("thumbnail").value = item ? item.thumbnail : "";
    field("preview").value = item ? item.preview : "";
    field("tags").value = item && item.tags ? item.tags.join(", ") : "";
    populateProductMap(item ? item.availableProducts : []);
    syncFilled();
    var content = document.querySelector(".admin-content");
    if (content) content.scrollTop = 0;
    else window.scrollTo(0, 0);
  }

  function findById(id) {
    return artworks.filter(function (item) {
      return item.id === id;
    })[0] || null;
  }

  function uniqueSlug(slug, skipId) {
    var base = slug || "artwork";
    var next = base;
    var i = 2;
    while (artworks.some(function (item) {
      return item.slug === next && item.id !== skipId;
    })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function uniqueId(slug) {
    var base = slug || "artwork";
    var next = base;
    var i = 2;
    while (artworks.some(function (item) {
      return item.id === next;
    })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function selectedProductIds() {
    if (!form) return [];
    var boxes = form.querySelectorAll('input[name="availableProducts"]:checked');
    var ids = [];
    Array.prototype.forEach.call(boxes, function (box) {
      if (box.value) ids.push(box.value);
    });
    return ids;
  }

  function readForm() {
    var name = String(field("name").value || "").trim();
    var slug = slugify(field("slug").value || name);
    var category = String(field("category").value || "").trim();
    var currentId = String(field("id").value || "");
    var thumbnail = String(field("thumbnail").value || "").trim();
    var preview = String(field("preview").value || "").trim();
    var errors = [];
    if (!name) errors.push("Artwork name is required.");
    if (!slug) errors.push("Slug is required.");
    if (!category) errors.push("Category is required.");
    if (errors.length) return { errors: errors };
    return {
      errors: [],
      data: {
        id: currentId || uniqueId(slug),
        name: name,
        slug: uniqueSlug(slug, currentId),
        category: category,
        description: String(field("description").value || "").trim(),
        thumbnail: thumbnail || preview,
        preview: preview || thumbnail,
        tags: parseTags(field("tags").value),
        availableProducts: selectedProductIds(),
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
      existing.category = result.data.category;
      existing.description = result.data.description;
      existing.thumbnail = result.data.thumbnail;
      existing.preview = result.data.preview;
      existing.tags = result.data.tags;
      existing.availableProducts = result.data.availableProducts;
      existing.status = result.data.status;
      existing.updatedAt = today();
      toast("Artwork updated.");
    } else {
      artworks.push({
        id: result.data.id,
        name: result.data.name,
        slug: result.data.slug,
        category: result.data.category,
        description: result.data.description,
        thumbnail: result.data.thumbnail,
        preview: result.data.preview,
        tags: result.data.tags,
        availableProducts: result.data.availableProducts,
        status: result.data.status,
        createdAt: today(),
        updatedAt: today()
      });
      toast("Artwork added.");
    }
    notifyCatalog();
    showList();
  }

  function toggleStatus(id) {
    var item = findById(id);
    if (!item) return;
    item.status = item.status === "active" ? "inactive" : "active";
    item.updatedAt = today();
    notifyCatalog();
    renderList();
    toast(item.name + " is now " + item.status + ".");
  }

  function deleteArtwork(id) {
    var item = findById(id);
    if (!item) return;
    confirmAction({
      title: "Delete artwork",
      body: 'Delete "' + item.name + '" from the demo catalog? Public Designs pages in this session will update.',
      onConfirm: function () {
        artworks = artworks.filter(function (entry) {
          return entry.id !== id;
        });
        notifyCatalog();
        showList();
        toast(item.name + " deleted.");
      }
    });
  }

  view.addEventListener("click", function (event) {
    var add = event.target.closest("[data-art-add]");
    if (add) {
      event.preventDefault();
      openForm(null);
      return;
    }
    var cancel = event.target.closest("[data-art-cancel]");
    if (cancel) {
      event.preventDefault();
      showList();
      return;
    }
    var reset = event.target.closest("[data-art-reset]");
    if (reset) {
      event.preventDefault();
      if (searchEl) searchEl.value = "";
      if (statusEl) statusEl.value = "all";
      if (categoryEl) categoryEl.value = "all";
      showList();
      return;
    }
    var edit = event.target.closest("[data-art-edit]");
    if (edit) {
      event.preventDefault();
      openForm(findById(edit.getAttribute("data-art-edit")));
      return;
    }
    var toggle = event.target.closest("[data-art-toggle]");
    if (toggle) {
      event.preventDefault();
      toggleStatus(toggle.getAttribute("data-art-toggle"));
      return;
    }
    var del = event.target.closest("[data-art-delete]");
    if (del) {
      event.preventDefault();
      deleteArtwork(del.getAttribute("data-art-delete"));
    }
  });

  if (form) form.addEventListener("submit", saveForm);
  if (searchEl) searchEl.addEventListener("input", renderList);
  if (statusEl) statusEl.addEventListener("change", renderList);
  if (categoryEl) categoryEl.addEventListener("change", renderList);
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
    artworks = data.getArtworks();
    if (mode === "list") renderList();
    else populateProductMap(selectedProductIds());
  });

  document.addEventListener("ds-admin-artworks", function () {
    artworks = data.getArtworks();
    if (mode === "list") renderList();
  });

  window.DSAtelier.admin.designs = {
    list: function () { return artworks.slice(); },
    find: findById,
    refresh: function () { renderList(); }
  };

  if (location.hash === "#add") openForm(null);
  else renderList();
})();
