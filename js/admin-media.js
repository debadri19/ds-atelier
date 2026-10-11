(function () {
  var data = window.DSAtelier && window.DSAtelier.admin && window.DSAtelier.admin.data;
  var view = document.querySelector('[data-admin-view="media"]');
  if (!view || !data) return;

  var media = data.getMedia();
  var listEl = view.querySelector("[data-media-list]");
  var formWrap = view.querySelector("[data-media-form-wrap]");
  var form = view.querySelector("[data-media-form]");
  var gridEl = view.querySelector("[data-media-grid]");
  var emptyEl = view.querySelector("[data-media-empty]");
  var emptyTitle = view.querySelector("[data-media-empty-title]");
  var emptyCopy = view.querySelector("[data-media-empty-copy]");
  var countEl = view.querySelector("[data-media-count]");
  var searchEl = view.querySelector("[data-media-search]");
  var typeEl = view.querySelector("[data-media-type]");
  var formTitle = view.querySelector("[data-media-form-title]");
  var formError = view.querySelector("[data-media-form-error]");
  var previewImg = view.querySelector("[data-media-preview]");
  var previewEmpty = view.querySelector("[data-media-preview-empty]");
  var tempNote = view.querySelector("[data-media-temp]");
  var mode = "list";
  var tempPreviewUrl = "";

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

  function mediaTypes() {
    return data.mediaTypes || [];
  }

  function products() {
    return data.getProducts() || [];
  }

  function artworks() {
    return data.getArtworks ? data.getArtworks() : [];
  }

  function typeLabel(id) {
    return data.mediaTypeLabel ? data.mediaTypeLabel(id) : id;
  }

  function fileName(src) {
    return data.assetFileName ? data.assetFileName(src) : src;
  }

  function imageSrc(src) {
    return data.imageUrl(src);
  }

  function productName(id) {
    var item = data.findProduct ? data.findProduct(id) : null;
    return item ? item.name : "";
  }

  function artworkName(id) {
    var item = data.findArtwork ? data.findArtwork(id) : null;
    return item ? item.name : "";
  }

  function colorName(productId, colorId) {
    var product = data.findProduct ? data.findProduct(productId) : null;
    var colors = product && product.options && product.options.colors ? product.options.colors : [];
    var i;
    for (i = 0; i < colors.length; i += 1) {
      if (colors[i].id === colorId) return colors[i].name;
    }
    return "";
  }

  function association(item) {
    var parts = [];
    var product = productName(item.productId);
    var color = colorName(item.productId, item.colorId);
    var artwork = artworkName(item.artworkId);
    if (product) parts.push(product + (color ? " / " + color : ""));
    if (artwork) parts.push(artwork);
    return parts.join(" · ") || "Unassigned";
  }

  function syncFilled() {
    if (!form) return;
    form.querySelectorAll(".form-field").forEach(function (fieldWrap) {
      var control = fieldWrap.querySelector(".form-input, .form-textarea, .form-select");
      var filled = false;
      if (control) {
        if (control.tagName === "SELECT" || control.type === "file") filled = Boolean(control.value);
        else filled = Boolean((control.value || "").trim());
      }
      fieldWrap.classList.toggle("is-filled", filled);
    });
  }

  function field(name) {
    return form.elements[name];
  }

  function populateTypeFilter() {
    if (!typeEl) return;
    var current = typeEl.value || "all";
    var html = '<option value="all">All types</option>';
    mediaTypes().forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.label) + "</option>";
    });
    typeEl.innerHTML = html;
    typeEl.value = current;
    if (typeEl.value !== current) typeEl.value = "all";
  }

  function populateAssets(selected) {
    var select = field("asset");
    if (!select) return;
    var assets = data.knownAssets || [];
    var html = '<option value="">Select existing asset</option>';
    assets.forEach(function (src) {
      html += '<option value="' + escapeHtml(src) + '">' + escapeHtml(fileName(src)) + " — " + escapeHtml(src) + "</option>";
    });
    select.innerHTML = html;
    select.value = selected || "";
  }

  function populateTypeSelect(selected) {
    var select = field("type");
    if (!select) return;
    var html = '<option value="">Select type</option>';
    mediaTypes().forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.label) + "</option>";
    });
    select.innerHTML = html;
    select.value = selected || "";
  }

  function populateProducts(selected) {
    var select = field("productId");
    if (!select) return;
    var html = '<option value="">No product</option>';
    products().slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    }).forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + "</option>";
    });
    select.innerHTML = html;
    select.value = selected || "";
  }

  function populateArtworks(selected) {
    var select = field("artworkId");
    if (!select) return;
    var html = '<option value="">No artwork</option>';
    artworks().slice().sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    }).forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + "</option>";
    });
    select.innerHTML = html;
    select.value = selected || "";
  }

  function populateColors(productId, selected) {
    var select = field("colorId");
    if (!select) return;
    var product = data.findProduct ? data.findProduct(productId) : null;
    var colors = product && product.options && product.options.colors ? product.options.colors : [];
    var html = '<option value="">No color</option>';
    colors.forEach(function (item) {
      html += '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + "</option>";
    });
    select.innerHTML = html;
    select.value = selected || "";
    select.disabled = !colors.length;
  }

  function clearTempPreview() {
    if (tempPreviewUrl) {
      URL.revokeObjectURL(tempPreviewUrl);
      tempPreviewUrl = "";
    }
    if (tempNote) tempNote.hidden = true;
  }

  function showPreview(src, temporary) {
    var path = src || "";
    if (!path) {
      if (previewImg) {
        previewImg.hidden = true;
        previewImg.removeAttribute("src");
      }
      if (previewEmpty) previewEmpty.hidden = false;
      if (tempNote) tempNote.hidden = true;
      return;
    }
    if (previewEmpty) previewEmpty.hidden = true;
    if (previewImg) {
      previewImg.hidden = false;
      previewImg.src = temporary ? path : imageSrc(path);
      previewImg.alt = "Preview";
      previewImg.onerror = function () {
        previewImg.hidden = true;
        if (previewEmpty) {
          previewEmpty.hidden = false;
          previewEmpty.textContent = "Missing image";
        }
      };
    }
    if (tempNote) tempNote.hidden = !temporary;
  }

  function filtered() {
    var q = searchEl ? String(searchEl.value || "").trim().toLowerCase() : "";
    var type = typeEl ? typeEl.value : "all";
    return media.filter(function (item) {
      if (type !== "all" && item.type !== type) return false;
      if (!q) return true;
      var hay = [item.src, fileName(item.src), item.alt, typeLabel(item.type), association(item)].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    }).slice().sort(function (a, b) {
      return String(a.src).localeCompare(String(b.src));
    });
  }

  function cardHtml(item) {
    var missing = data.knownAsset ? !data.knownAsset(item.src) : false;
    return (
      '<article class="admin-media-card' + (missing ? " is-missing" : "") + '">' +
        '<div class="admin-media-thumb">' +
          '<img src="' + escapeHtml(imageSrc(item.src)) + '" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">' +
          '<span class="admin-media-missing"' + (missing ? "" : " hidden") + '>Missing</span>' +
        "</div>" +
        "<div class=\"admin-media-copy\">" +
          "<strong>" + escapeHtml(fileName(item.src)) + "</strong>" +
          "<span>" + escapeHtml(item.src) + "</span>" +
          "<span>" + escapeHtml(typeLabel(item.type)) + "</span>" +
          "<span>" + escapeHtml(item.alt || "No alt text") + "</span>" +
          "<span>" + escapeHtml(association(item)) + "</span>" +
        "</div>" +
        '<div class="admin-media-actions">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-media-view="' + escapeHtml(item.id) + '">View</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-media-edit="' + escapeHtml(item.id) + '">Edit</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-media-delete="' + escapeHtml(item.id) + '">Remove</button>' +
        "</div>" +
      "</article>"
    );
  }

  function notifyCatalog() {
    data.setMedia(media);
    media = data.getMedia();
  }

  function renderList() {
    populateTypeFilter();
    var list = filtered();
    if (gridEl) gridEl.innerHTML = list.map(cardHtml).join("");
    if (emptyEl) emptyEl.hidden = list.length > 0;
    if (gridEl) gridEl.hidden = list.length === 0;
    if (emptyTitle) emptyTitle.textContent = media.length ? "No matching media" : "No media yet";
    if (emptyCopy) {
      emptyCopy.textContent = media.length
        ? "Try another path, filename or type. Reset filters to see the full demo library."
        : "Add an existing project asset reference. Local files are preview-only.";
    }
    if (countEl) countEl.textContent = list.length === 1 ? "1 item" : list.length + " items";
  }

  function showList() {
    mode = "list";
    clearTempPreview();
    if (listEl) listEl.hidden = false;
    if (formWrap) formWrap.hidden = true;
    if (location.hash === "#add") history.replaceState(null, "", location.pathname + location.search);
    renderList();
  }

  function openForm(item) {
    mode = item ? "edit" : "add";
    clearTempPreview();
    if (listEl) listEl.hidden = true;
    if (formWrap) formWrap.hidden = false;
    if (formTitle) formTitle.textContent = item ? "Edit media reference" : "Add media reference";
    if (formError) {
      formError.hidden = true;
      formError.textContent = "";
    }
    if (previewEmpty) previewEmpty.textContent = "No preview";
    field("id").value = item ? item.id : "";
    populateAssets(item ? item.src : "");
    populateTypeSelect(item ? item.type : "product-image");
    populateProducts(item ? item.productId : "");
    populateArtworks(item ? item.artworkId : "");
    populateColors(item ? item.productId : "", item ? item.colorId : "");
    field("src").value = item ? item.src : "";
    field("alt").value = item ? item.alt : "";
    if (field("tempFile")) field("tempFile").value = "";
    showPreview(item ? item.src : "", false);
    syncFilled();
    var content = document.querySelector(".admin-content");
    if (content) content.scrollTop = 0;
    else window.scrollTo(0, 0);
  }

  function findById(id) {
    return media.filter(function (item) {
      return item.id === id;
    })[0] || null;
  }

  function uniqueId(src, type) {
    var base = (data.slugToken ? data.slugToken(type + "-" + fileName(src)) : type) || "media";
    var next = base;
    var i = 2;
    while (media.some(function (item) { return item.id === next; })) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function readForm() {
    var rawSrc = String(field("src").value || "").trim();
    var src = data.normalizeAssetPath ? data.normalizeAssetPath(rawSrc) : rawSrc;
    var type = String(field("type").value || "").trim();
    var currentId = String(field("id").value || "");
    var errors = [];
    if (data.isTemporarySrc && data.isTemporarySrc(rawSrc)) {
      errors.push("Temporary local previews cannot be saved. Choose an existing project asset.");
    }
    if (!src) errors.push("Image reference path is required.");
    if (!type) errors.push("Media type is required.");
    if (errors.length) return { errors: errors };
    return {
      errors: [],
      data: {
        id: currentId || uniqueId(src, type),
        src: src,
        type: type,
        alt: String(field("alt").value || "").trim(),
        productId: String(field("productId").value || ""),
        colorId: String(field("colorId").value || ""),
        artworkId: String(field("artworkId").value || "")
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
      existing.src = result.data.src;
      existing.type = result.data.type;
      existing.alt = result.data.alt;
      existing.productId = result.data.productId;
      existing.colorId = result.data.colorId;
      existing.artworkId = result.data.artworkId;
      existing.updatedAt = today();
      toast("Media reference updated.");
    } else {
      media.push({
        id: result.data.id,
        src: result.data.src,
        type: result.data.type,
        alt: result.data.alt,
        productId: result.data.productId,
        colorId: result.data.colorId,
        artworkId: result.data.artworkId,
        createdAt: today(),
        updatedAt: today()
      });
      toast("Media reference added.");
    }
    notifyCatalog();
    showList();
  }

  function deleteMedia(id) {
    var item = findById(id);
    if (!item) return;
    confirmAction({
      title: "Remove media reference",
      body: 'Remove "' + fileName(item.src) + '" from the demo library? Products, variants, artworks and artwork mappings are not deleted.',
      onConfirm: function () {
        media = media.filter(function (entry) {
          return entry.id !== id;
        });
        notifyCatalog();
        showList();
        toast(fileName(item.src) + " removed.");
      }
    });
  }

  view.addEventListener("click", function (event) {
    var add = event.target.closest("[data-media-add]");
    if (add) {
      event.preventDefault();
      openForm(null);
      return;
    }
    var cancel = event.target.closest("[data-media-cancel]");
    if (cancel) {
      event.preventDefault();
      showList();
      return;
    }
    var reset = event.target.closest("[data-media-reset]");
    if (reset) {
      event.preventDefault();
      if (searchEl) searchEl.value = "";
      if (typeEl) typeEl.value = "all";
      showList();
      return;
    }
    var edit = event.target.closest("[data-media-edit]");
    if (edit) {
      event.preventDefault();
      openForm(findById(edit.getAttribute("data-media-edit")));
      return;
    }
    var viewBtn = event.target.closest("[data-media-view]");
    if (viewBtn) {
      event.preventDefault();
      openForm(findById(viewBtn.getAttribute("data-media-view")));
      return;
    }
    var del = event.target.closest("[data-media-delete]");
    if (del) {
      event.preventDefault();
      deleteMedia(del.getAttribute("data-media-delete"));
    }
  });

  if (form) form.addEventListener("submit", saveForm);
  if (searchEl) searchEl.addEventListener("input", renderList);
  if (typeEl) typeEl.addEventListener("change", renderList);
  if (form) {
    form.addEventListener("input", syncFilled);
    form.addEventListener("change", function (event) {
      var target = event.target;
      if (target === field("asset") && target.value) {
        field("src").value = target.value;
        showPreview(target.value, false);
        syncFilled();
        return;
      }
      if (target === field("src")) {
        showPreview(field("src").value, false);
        return;
      }
      if (target === field("productId")) {
        populateColors(field("productId").value, "");
        return;
      }
      if (target === field("tempFile") && target.files && target.files[0]) {
        clearTempPreview();
        tempPreviewUrl = URL.createObjectURL(target.files[0]);
        showPreview(tempPreviewUrl, true);
        toast("Temporary local preview only. Choose an existing asset to save.");
      }
      syncFilled();
    });
  }

  document.addEventListener("ds-admin-products", function () {
    media = data.getMedia();
    if (mode === "list") renderList();
  });
  document.addEventListener("ds-admin-artworks", function () {
    media = data.getMedia();
    if (mode === "list") renderList();
  });
  document.addEventListener("ds-admin-media", function () {
    media = data.getMedia();
    if (mode === "list") renderList();
  });

  window.DSAtelier.admin.media = {
    list: function () { return media.slice(); },
    find: findById,
    refresh: function () { renderList(); }
  };

  window.addEventListener("pagehide", clearTempPreview);

  if (location.hash === "#add") openForm(null);
  else renderList();
})();
