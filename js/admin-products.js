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
  var colorsEl = view ? view.querySelector("[data-variant-colors]") : null;
  var sizesEl = view ? view.querySelector("[data-variant-sizes]") : null;
  var variantRowsEl = view ? view.querySelector("[data-variant-rows]") : null;
  var variantCardsEl = view ? view.querySelector("[data-variant-cards]") : null;
  var variantEmptyEl = view ? view.querySelector("[data-variant-empty]") : null;
  var variantTableWrap = view ? view.querySelector("[data-variant-table-wrap]") : null;
  var variantComboCopy = view ? view.querySelector("[data-variant-combo-copy]") : null;
  var colorNameEl = view ? view.querySelector("[data-variant-color-name]") : null;
  var colorHexEl = view ? view.querySelector("[data-variant-color-hex]") : null;
  var colorPickerEl = view ? view.querySelector("[data-variant-color-picker]") : null;
  var sizeCustomEl = view ? view.querySelector("[data-variant-size-custom]") : null;
  var galleryListEl = view ? view.querySelector("[data-gallery-list]") : null;
  var galleryEmptyEl = view ? view.querySelector("[data-gallery-empty]") : null;
  var galleryAssetEl = view ? view.querySelector("[data-gallery-asset]") : null;
  var gallerySrcEl = view ? view.querySelector("[data-gallery-src]") : null;
  var galleryAltEl = view ? view.querySelector("[data-gallery-alt]") : null;
  var frontAssetEl = view ? view.querySelector("[data-front-asset]") : null;
  var backAssetEl = view ? view.querySelector("[data-back-asset]") : null;
  var frontPreviewEl = view ? view.querySelector("[data-front-preview]") : null;
  var backPreviewEl = view ? view.querySelector("[data-back-preview]") : null;
  var recentRows = document.querySelector("[data-recent-rows]");
  var recentSearch = document.querySelector("[data-recent-search]");
  var recentStatus = document.querySelector("[data-recent-status]");
  var slugTouched = false;
  var mode = "list";
  var draftOptions = { colors: [], sizes: [] };
  var draftVariants = [];
  var draftGallery = [];
  var SIZE_PRESETS = data.sizePresets || ["XS", "S", "M", "L", "XL", "XXL", "3XL", "One Size"];

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

  function cloneDraft(item) {
    var colors = item && item.options && Array.isArray(item.options.colors) ? item.options.colors : [];
    var sizes = item && item.options && Array.isArray(item.options.sizes) ? item.options.sizes : [];
    var variants = item && Array.isArray(item.variants) ? item.variants : [];
    var gallery = item && Array.isArray(item.gallery) ? item.gallery : [];
    draftOptions = {
      colors: colors.map(function (entry) {
        return { id: entry.id, name: entry.name, hex: entry.hex, image: entry.image || "" };
      }),
      sizes: sizes.map(function (entry) {
        return { id: entry.id, label: entry.label };
      })
    };
    draftVariants = variants.map(function (entry) {
      return {
        id: entry.id,
        colorId: entry.colorId || "",
        sizeId: entry.sizeId || "",
        sku: entry.sku || "",
        regularPrice: entry.regularPrice,
        salePrice: entry.salePrice,
        status: entry.status === "inactive" ? "inactive" : "active",
        image: entry.image || "",
        skuTouched: Boolean(entry.sku)
      };
    });
    draftGallery = gallery.map(function (entry, index) {
      return {
        id: entry.id || ("gallery-" + (index + 1)),
        src: entry.src || "",
        alt: entry.alt || "",
        primary: Boolean(entry.primary)
      };
    });
  }

  function knownAssets() {
    return data.knownAssets || [];
  }

  function assetOptionsHtml(selected) {
    var html = '<option value="">Select existing asset</option>';
    knownAssets().forEach(function (src) {
      html += '<option value="' + escapeHtml(src) + '"' + (src === selected ? " selected" : "") + ">" + escapeHtml((data.assetFileName ? data.assetFileName(src) : src) + " — " + src) + "</option>";
    });
    return html;
  }

  function fillAssetSelect(select, selected) {
    if (!select) return;
    select.innerHTML = assetOptionsHtml(selected);
    if (selected) select.value = selected;
  }

  function primaryGallerySrc() {
    var i;
    for (i = 0; i < draftGallery.length; i += 1) {
      if (draftGallery[i].primary && draftGallery[i].src) return draftGallery[i].src;
    }
    return draftGallery[0] && draftGallery[0].src ? draftGallery[0].src : "";
  }

  function syncPrimaryImageField() {
    if (!form || !field("image")) return;
    field("image").value = primaryGallerySrc();
    syncFilled();
  }

  function uniqueGalleryId() {
    var next = "gallery-" + (draftGallery.length + 1);
    var i = 2;
    while (draftGallery.some(function (item) { return item.id === next; })) {
      next = "gallery-" + i;
      i += 1;
    }
    return next;
  }

  function setPreview(wrap, src, emptySel, emptyText) {
    if (!wrap) return;
    var img = wrap.querySelector("img");
    var empty = wrap.querySelector(emptySel) || wrap.querySelector("span");
    var fallback = emptyText || "No image assigned";
    if (empty && empty.getAttribute("data-empty-label")) fallback = empty.getAttribute("data-empty-label");
    else if (empty && !empty.getAttribute("data-empty-label")) empty.setAttribute("data-empty-label", empty.textContent || fallback);
    if (!src) {
      if (img) {
        img.hidden = true;
        img.removeAttribute("src");
      }
      if (empty) {
        empty.hidden = false;
        empty.textContent = empty.getAttribute("data-empty-label") || fallback;
      }
      return;
    }
    if (empty) empty.hidden = true;
    if (img) {
      img.hidden = false;
      img.src = data.imageUrl(src);
      img.onerror = function () {
        img.hidden = true;
        if (empty) {
          empty.hidden = false;
          empty.textContent = "Missing image";
        }
      };
    }
  }

  function renderDesignRefs() {
    if (!form) return;
    fillAssetSelect(frontAssetEl, field("frontDesign") ? field("frontDesign").value : "");
    fillAssetSelect(backAssetEl, field("backDesign") ? field("backDesign").value : "");
    setPreview(frontPreviewEl, field("frontDesign") ? field("frontDesign").value : "", "[data-front-empty]", "No front design assigned");
    setPreview(backPreviewEl, field("backDesign") ? field("backDesign").value : "", "[data-back-empty]", "No back design assigned");
  }

  function renderGallery() {
    if (!galleryListEl) return;
    fillAssetSelect(galleryAssetEl, gallerySrcEl ? gallerySrcEl.value : "");
    if (!draftGallery.length) {
      galleryListEl.innerHTML = "";
      if (galleryEmptyEl) galleryEmptyEl.hidden = false;
      syncPrimaryImageField();
      return;
    }
    if (galleryEmptyEl) galleryEmptyEl.hidden = true;
    galleryListEl.innerHTML = draftGallery.map(function (item, index) {
      var missing = data.knownAsset ? !data.knownAsset(item.src) : false;
      return (
        '<article class="admin-gallery-item' + (item.primary ? " is-primary" : "") + (missing ? " is-missing" : "") + '" data-gallery-id="' + escapeHtml(item.id) + '">' +
          '<div class="admin-gallery-thumb">' +
            '<img src="' + escapeHtml(data.imageUrl(item.src)) + '" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">' +
            '<span class="admin-media-missing"' + (missing ? "" : " hidden") + '>Missing</span>' +
          "</div>" +
          '<div class="admin-gallery-fields">' +
            '<div class="form-field is-filled">' +
              '<input class="form-input" type="text" value="' + escapeHtml(item.src) + '" data-gallery-path="' + escapeHtml(item.id) + '" aria-label="Gallery image path">' +
            "</div>" +
            '<div class="form-field' + (item.alt ? " is-filled" : "") + '">' +
              '<input class="form-input" type="text" value="' + escapeHtml(item.alt) + '" data-gallery-caption="' + escapeHtml(item.id) + '" placeholder="Alt text" aria-label="Gallery alt text">' +
            "</div>" +
            '<div class="admin-gallery-controls">' +
              '<button class="btn btn-ghost btn-sm" type="button" data-gallery-up="' + escapeHtml(item.id) + '"' + (index === 0 ? " disabled" : "") + '>Up</button>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-gallery-down="' + escapeHtml(item.id) + '"' + (index === draftGallery.length - 1 ? " disabled" : "") + '>Down</button>' +
              '<button class="btn btn-ghost btn-sm" type="button" data-gallery-primary="' + escapeHtml(item.id) + '">' + (item.primary ? "Primary" : "Set primary") + "</button>" +
              '<button class="btn btn-ghost btn-sm" type="button" data-gallery-remove="' + escapeHtml(item.id) + '">Remove</button>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
    syncPrimaryImageField();
  }

  function uniqueOptionId(prefix, label, existing) {
    var base = (data.slugToken ? data.slugToken(label) : slugify(label)) || prefix;
    var next = prefix + "-" + base;
    var i = 2;
    while (existing.some(function (entry) { return entry.id === next; })) {
      next = prefix + "-" + base + "-" + i;
      i += 1;
    }
    return next;
  }

  function uniqueVariantId(colorId, sizeId) {
    var base = [colorId || "none", sizeId || "none"].join("-");
    var next = "var-" + base;
    var i = 2;
    while (draftVariants.some(function (entry) { return entry.id === next; })) {
      next = "var-" + base + "-" + i;
      i += 1;
    }
    return next;
  }

  function findColor(id) {
    var i;
    for (i = 0; i < draftOptions.colors.length; i += 1) {
      if (draftOptions.colors[i].id === id) return draftOptions.colors[i];
    }
    return null;
  }

  function findSize(id) {
    var i;
    for (i = 0; i < draftOptions.sizes.length; i += 1) {
      if (draftOptions.sizes[i].id === id) return draftOptions.sizes[i];
    }
    return null;
  }

  function variantKey(colorId, sizeId) {
    return String(colorId || "") + "::" + String(sizeId || "");
  }

  function expectedPairs() {
    var colors = draftOptions.colors;
    var sizes = draftOptions.sizes;
    var pairs = [];
    var i;
    var j;
    if (!colors.length && !sizes.length) return pairs;
    if (colors.length && sizes.length) {
      for (i = 0; i < colors.length; i += 1) {
        for (j = 0; j < sizes.length; j += 1) {
          pairs.push({ colorId: colors[i].id, sizeId: sizes[j].id });
        }
      }
      return pairs;
    }
    if (colors.length) {
      for (i = 0; i < colors.length; i += 1) {
        pairs.push({ colorId: colors[i].id, sizeId: "" });
      }
      return pairs;
    }
    for (j = 0; j < sizes.length; j += 1) {
      pairs.push({ colorId: "", sizeId: sizes[j].id });
    }
    return pairs;
  }

  function productSkuValue() {
    return form && field("sku") ? String(field("sku").value || "").trim() : "";
  }

  function suggestedSku(colorId, sizeId) {
    var color = findColor(colorId);
    var size = findSize(sizeId);
    if (data.suggestVariantSku) {
      return data.suggestVariantSku(productSkuValue(), color ? color.name : "", size ? size.label : "");
    }
    return productSkuValue() || "DSA";
  }

  function uniqueSuggestedSku(colorId, sizeId, skipId, extra) {
    var base = suggestedSku(colorId, sizeId);
    var next = base;
    var i = 2;
    function taken(value) {
      if (skuConflicts(value, skipId)) return true;
      if (!extra) return false;
      return extra.some(function (entry) {
        return entry.id !== skipId && String(entry.sku || "").trim().toLowerCase() === value.toLowerCase();
      });
    }
    while (taken(next)) {
      next = base + "-" + i;
      i += 1;
    }
    return next;
  }

  function skuConflicts(sku, skipId) {
    var value = String(sku || "").trim().toLowerCase();
    if (!value) return false;
    if (draftVariants.some(function (entry) {
      return entry.id !== skipId && String(entry.sku || "").trim().toLowerCase() === value;
    })) return true;
    var currentId = form && field("id") ? String(field("id").value || "") : "";
    var productSku = productSkuValue().toLowerCase();
    if (productSku && productSku === value) return true;
    return products.some(function (item) {
      if (item.id === currentId) return false;
      if (String(item.sku || "").toLowerCase() === value) return true;
      return (item.variants || []).some(function (entry) {
        return String(entry.sku || "").toLowerCase() === value;
      });
    });
  }

  function syncCombinations() {
    var pairs = expectedPairs();
    var byKey = {};
    var next = [];
    var i;
    for (i = 0; i < draftVariants.length; i += 1) {
      byKey[variantKey(draftVariants[i].colorId, draftVariants[i].sizeId)] = draftVariants[i];
    }
    for (i = 0; i < pairs.length; i += 1) {
      var existing = byKey[variantKey(pairs[i].colorId, pairs[i].sizeId)];
      if (existing) {
        next.push(existing);
      } else {
        var id = uniqueVariantId(pairs[i].colorId, pairs[i].sizeId);
        next.push({
          id: id,
          colorId: pairs[i].colorId,
          sizeId: pairs[i].sizeId,
          sku: uniqueSuggestedSku(pairs[i].colorId, pairs[i].sizeId, id, next),
          regularPrice: null,
          salePrice: null,
          status: "active",
          image: "",
          skuTouched: false
        });
      }
    }
    draftVariants = next;
  }

  function refreshUntouchedSkus() {
    var i;
    for (i = 0; i < draftVariants.length; i += 1) {
      if (!draftVariants[i].skuTouched) {
        draftVariants[i].sku = uniqueSuggestedSku(draftVariants[i].colorId, draftVariants[i].sizeId, draftVariants[i].id, draftVariants);
      }
    }
  }

  function parentRegular() {
    if (!form || !field("regularPrice")) return 0;
    var value = Number(field("regularPrice").value);
    return Number.isFinite(value) ? value : 0;
  }

  function variantSummaryHtml(item) {
    var summary = data.variantSummary ? data.variantSummary(item) : { colors: 0, sizes: 0, variants: 0 };
    if (!summary.variants && !summary.colors && !summary.sizes) {
      return '<span class="admin-variant-summary">No variants</span>';
    }
    return (
      '<span class="admin-variant-summary">' +
        summary.variants + (summary.variants === 1 ? " variant" : " variants") +
        " · " + summary.colors + (summary.colors === 1 ? " color" : " colors") +
        " · " + summary.sizes + (summary.sizes === 1 ? " size" : " sizes") +
      "</span>"
    );
  }

  function renderColors() {
    if (!colorsEl) return;
    if (!draftOptions.colors.length) {
      colorsEl.innerHTML = '<p class="admin-variant-hint">No colors yet. Add one below, or leave empty for size-only or no variants.</p>';
      return;
    }
    colorsEl.innerHTML = draftOptions.colors.map(function (item) {
      var mockup = item.image || "";
      return (
        '<div class="admin-color-row admin-color-row-media" data-color-id="' + escapeHtml(item.id) + '">' +
          '<span class="admin-color-swatch" style="background:' + escapeHtml(item.hex) + '" aria-hidden="true"></span>' +
          '<div class="form-field admin-color-name">' +
            '<input class="form-input is-filled" type="text" value="' + escapeHtml(item.name) + '" data-color-name="' + escapeHtml(item.id) + '" aria-label="Color name">' +
          "</div>" +
          '<input class="admin-color-picker" type="color" value="' + escapeHtml(item.hex) + '" data-color-picker="' + escapeHtml(item.id) + '" aria-label="Color swatch for ' + escapeHtml(item.name) + '">' +
          '<div class="form-field admin-color-hex">' +
            '<input class="form-input is-filled" type="text" value="' + escapeHtml(item.hex) + '" data-color-hex="' + escapeHtml(item.id) + '" aria-label="Hex value">' +
          "</div>" +
          '<button class="btn btn-ghost btn-sm" type="button" data-color-remove="' + escapeHtml(item.id) + '">Remove</button>' +
          '<div class="admin-color-mockup">' +
            '<div class="admin-color-mockup-preview">' +
              (mockup
                ? '<img src="' + escapeHtml(data.imageUrl(mockup)) + '" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false;"><span class="admin-media-missing" hidden>Missing</span>'
                : '<span class="admin-color-mockup-empty">No mockup</span>') +
            "</div>" +
            '<select class="form-select" data-color-mockup="' + escapeHtml(item.id) + '" aria-label="Color mockup for ' + escapeHtml(item.name) + '">' +
              assetOptionsHtml(mockup) +
            "</select>" +
            '<button class="btn btn-ghost btn-sm" type="button" data-color-mockup-clear="' + escapeHtml(item.id) + '"' + (mockup ? "" : " disabled") + ">Clear mockup</button>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderSizes() {
    if (!sizesEl) return;
    var selected = {};
    var i;
    for (i = 0; i < draftOptions.sizes.length; i += 1) {
      selected[draftOptions.sizes[i].label] = true;
    }
    var html = SIZE_PRESETS.map(function (label) {
      var active = Boolean(selected[label]);
      return '<button class="admin-size-chip' + (active ? " is-active" : "") + '" type="button" data-size-toggle="' + escapeHtml(label) + '" aria-pressed="' + (active ? "true" : "false") + '">' + escapeHtml(label) + "</button>";
    }).join("");
    var extras = draftOptions.sizes.filter(function (item) {
      return SIZE_PRESETS.indexOf(item.label) === -1;
    });
    html += extras.map(function (item) {
      return (
        '<span class="admin-size-custom">' +
          '<button class="admin-size-chip is-active" type="button" data-size-toggle="' + escapeHtml(item.label) + '" aria-pressed="true">' + escapeHtml(item.label) + "</button>" +
          '<button class="btn btn-ghost btn-sm" type="button" data-size-remove="' + escapeHtml(item.id) + '" aria-label="Remove ' + escapeHtml(item.label) + '">Remove</button>' +
        "</span>"
      );
    }).join("");
    sizesEl.innerHTML = html;
  }

  function variantPriceHint(entry) {
    var inherited = entry.regularPrice == null;
    return inherited ? '<span class="admin-variant-inherit">Inherits ' + formatPrice(parentRegular()) + "</span>" : '<span class="admin-variant-override">Override</span>';
  }

  function variantRowFields(entry) {
    var color = findColor(entry.colorId);
    var size = findSize(entry.sizeId);
    var regularValue = entry.regularPrice == null ? "" : entry.regularPrice;
    var saleValue = entry.salePrice == null ? "" : entry.salePrice;
    var inactive = entry.status === "inactive";
    return {
      colorLabel: color ? color.name : "—",
      colorHex: color ? color.hex : "",
      sizeLabel: size ? size.label : "—",
      sku: entry.sku || "",
      regularValue: regularValue,
      saleValue: saleValue,
      inactive: inactive
    };
  }

  function variantRowHtml(entry) {
    var fields = variantRowFields(entry);
    return (
      '<tr class="' + (fields.inactive ? "is-inactive" : "") + '" data-variant-id="' + escapeHtml(entry.id) + '">' +
        "<td>" +
          '<span class="admin-variant-color">' +
            (fields.colorHex ? '<span class="admin-color-swatch" style="background:' + escapeHtml(fields.colorHex) + '" aria-hidden="true"></span>' : "") +
            escapeHtml(fields.colorLabel) +
          "</span>" +
        "</td>" +
        "<td>" + escapeHtml(fields.sizeLabel) + "</td>" +
        "<td><input class=\"form-input\" type=\"text\" value=\"" + escapeHtml(fields.sku) + "\" data-variant-sku=\"" + escapeHtml(entry.id) + "\" aria-label=\"Variant SKU\"></td>" +
        "<td>" +
          '<input class="form-input" type="number" min="0" step="1" placeholder="' + escapeHtml(String(parentRegular())) + '" value="' + escapeHtml(String(fields.regularValue)) + '" data-variant-regular="' + escapeHtml(entry.id) + '" aria-label="Regular price override">' +
          variantPriceHint(entry) +
        "</td>" +
        "<td><input class=\"form-input\" type=\"number\" min=\"0\" step=\"1\" placeholder=\"\" value=\"" + escapeHtml(String(fields.saleValue)) + "\" data-variant-sale=\"" + escapeHtml(entry.id) + "\" aria-label=\"Sale price override\"></td>" +
        "<td>" +
          '<select class="form-select" data-variant-status="' + escapeHtml(entry.id) + '" aria-label="Variant availability">' +
            '<option value="active"' + (fields.inactive ? "" : " selected") + ">Active</option>" +
            '<option value="inactive"' + (fields.inactive ? " selected" : "") + ">Inactive</option>" +
          "</select>" +
        "</td>" +
      "</tr>"
    );
  }

  function variantCardHtml(entry) {
    var fields = variantRowFields(entry);
    return (
      '<article class="admin-variant-card' + (fields.inactive ? " is-inactive" : "") + '" data-variant-id="' + escapeHtml(entry.id) + '">' +
        '<div class="admin-variant-card-meta">' +
          '<span class="admin-variant-color">' +
            (fields.colorHex ? '<span class="admin-color-swatch" style="background:' + escapeHtml(fields.colorHex) + '" aria-hidden="true"></span>' : "") +
            escapeHtml(fields.colorLabel) +
          "</span>" +
          "<span>" + escapeHtml(fields.sizeLabel) + "</span>" +
        "</div>" +
        '<label class="admin-variant-field">SKU' +
          '<input class="form-input" type="text" value="' + escapeHtml(fields.sku) + '" data-variant-sku="' + escapeHtml(entry.id) + '" aria-label="Variant SKU">' +
        "</label>" +
        '<label class="admin-variant-field">Regular price' +
          '<input class="form-input" type="number" min="0" step="1" placeholder="' + escapeHtml(String(parentRegular())) + '" value="' + escapeHtml(String(fields.regularValue)) + '" data-variant-regular="' + escapeHtml(entry.id) + '" aria-label="Regular price override">' +
        "</label>" +
        variantPriceHint(entry) +
        '<label class="admin-variant-field">Sale price' +
          '<input class="form-input" type="number" min="0" step="1" value="' + escapeHtml(String(fields.saleValue)) + '" data-variant-sale="' + escapeHtml(entry.id) + '" aria-label="Sale price override">' +
        "</label>" +
        '<label class="admin-variant-field">Availability' +
          '<select class="form-select" data-variant-status="' + escapeHtml(entry.id) + '" aria-label="Variant availability">' +
            '<option value="active"' + (fields.inactive ? "" : " selected") + ">Active</option>" +
            '<option value="inactive"' + (fields.inactive ? " selected" : "") + ">Inactive</option>" +
          "</select>" +
        "</label>" +
      "</article>"
    );
  }

  function renderVariants() {
    syncCombinations();
    if (variantRowsEl) variantRowsEl.innerHTML = draftVariants.map(variantRowHtml).join("");
    if (variantCardsEl) variantCardsEl.innerHTML = draftVariants.map(variantCardHtml).join("");
    var has = draftVariants.length > 0;
    if (variantEmptyEl) variantEmptyEl.hidden = has;
    if (variantTableWrap) variantTableWrap.hidden = !has;
    if (variantCardsEl) variantCardsEl.hidden = !has;
    if (variantComboCopy) {
      variantComboCopy.textContent = has
        ? "Empty regular-price fields inherit the product price (" + formatPrice(parentRegular()) + "). Sale overrides must be lower than the effective regular price."
        : "Add a color, a size, or both to generate combinations. A product can also have no variants.";
    }
  }

  function renderVariantEditor() {
    renderColors();
    renderSizes();
    renderVariants();
    renderGallery();
    renderDesignRefs();
  }

  function addColor(name, hex) {
    name = String(name || "").trim();
    if (!name) {
      toast("Enter a color name.");
      return;
    }
    var normalized = data.normalizeHex ? data.normalizeHex(hex) : hex;
    if (draftOptions.colors.some(function (item) { return item.name.toLowerCase() === name.toLowerCase(); })) {
      toast("That color is already added.");
      return;
    }
    draftOptions.colors.push({
      id: uniqueOptionId("color", name, draftOptions.colors),
      name: name,
      hex: normalized,
      image: ""
    });
    renderVariantEditor();
  }

  function findGallery(id) {
    var i;
    for (i = 0; i < draftGallery.length; i += 1) {
      if (draftGallery[i].id === id) return draftGallery[i];
    }
    return null;
  }

  function addGalleryItem() {
    var raw = String(gallerySrcEl ? gallerySrcEl.value : "").trim();
    if (data.isTemporarySrc && data.isTemporarySrc(raw)) {
      toast("Temporary local previews cannot be saved. Choose an existing project asset.");
      return;
    }
    var src = data.normalizeAssetPath
      ? data.normalizeAssetPath(raw)
      : raw;
    var alt = String(galleryAltEl ? galleryAltEl.value : "").trim();
    if (!src) {
      toast("Choose or enter an image reference.");
      return;
    }
    if (draftGallery.some(function (item) { return item.src === src; })) {
      toast("That gallery image is already added.");
      return;
    }
    draftGallery.push({
      id: uniqueGalleryId(),
      src: src,
      alt: alt,
      primary: draftGallery.length === 0
    });
    if (gallerySrcEl) gallerySrcEl.value = "";
    if (galleryAltEl) galleryAltEl.value = "";
    if (galleryAssetEl) galleryAssetEl.value = "";
    renderGallery();
    syncFilled();
  }

  function setGalleryPrimary(id) {
    draftGallery.forEach(function (item) {
      item.primary = item.id === id;
    });
    renderGallery();
  }

  function removeGalleryItem(id) {
    var wasPrimary = false;
    draftGallery = draftGallery.filter(function (item) {
      if (item.id === id) {
        wasPrimary = item.primary;
        return false;
      }
      return true;
    });
    if (wasPrimary && draftGallery.length) draftGallery[0].primary = true;
    renderGallery();
  }

  function moveGalleryItem(id, delta) {
    var index = -1;
    var i;
    for (i = 0; i < draftGallery.length; i += 1) {
      if (draftGallery[i].id === id) index = i;
    }
    var next = index + delta;
    if (index < 0 || next < 0 || next >= draftGallery.length) return;
    var current = draftGallery[index];
    draftGallery[index] = draftGallery[next];
    draftGallery[next] = current;
    renderGallery();
  }

  function setColorMockup(id, src) {
    var color = findColor(id);
    if (!color) return;
    if (data.isTemporarySrc && data.isTemporarySrc(src)) {
      toast("Temporary local previews cannot be saved. Choose an existing project asset.");
      renderColors();
      return;
    }
    color.image = data.normalizeAssetPath ? data.normalizeAssetPath(src) : String(src || "").trim();
    renderColors();
  }

  function removeColor(id) {
    var item = findColor(id);
    if (!item) return;
    var affected = draftVariants.filter(function (entry) { return entry.colorId === id; }).length;
    function apply() {
      draftOptions.colors = draftOptions.colors.filter(function (entry) { return entry.id !== id; });
      renderVariantEditor();
    }
    if (affected) {
      confirmAction({
        title: "Remove color",
        body: 'Remove "' + item.name + '"? ' + affected + (affected === 1 ? " variant combination" : " variant combinations") + " will be removed from this product.",
        onConfirm: apply
      });
      return;
    }
    apply();
  }

  function addSize(label) {
    label = String(label || "").trim();
    if (!label) {
      toast("Enter a size label.");
      return;
    }
    if (draftOptions.sizes.some(function (item) { return item.label.toLowerCase() === label.toLowerCase(); })) {
      toast("That size is already added.");
      return;
    }
    draftOptions.sizes.push({
      id: uniqueOptionId("size", label, draftOptions.sizes),
      label: label
    });
    renderVariantEditor();
  }

  function removeSizeById(id) {
    var item = findSize(id);
    if (!item) return;
    var affected = draftVariants.filter(function (entry) { return entry.sizeId === id; }).length;
    function apply() {
      draftOptions.sizes = draftOptions.sizes.filter(function (entry) { return entry.id !== id; });
      renderVariantEditor();
    }
    if (affected) {
      confirmAction({
        title: "Remove size",
        body: 'Remove "' + item.label + '"? ' + affected + (affected === 1 ? " variant combination" : " variant combinations") + " will be removed from this product.",
        onConfirm: apply
      });
      return;
    }
    apply();
  }

  function toggleSizeLabel(label) {
    var existing = draftOptions.sizes.filter(function (item) { return item.label === label; })[0];
    if (existing) {
      removeSizeById(existing.id);
      return;
    }
    addSize(label);
  }

  function findDraftVariant(id) {
    var i;
    for (i = 0; i < draftVariants.length; i += 1) {
      if (draftVariants[i].id === id) return draftVariants[i];
    }
    return null;
  }

  function parseOptionalPrice(raw) {
    raw = String(raw == null ? "" : raw).trim();
    if (raw === "") return { empty: true, value: null };
    var value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return { error: true };
    return { empty: false, value: value };
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
        "<td>" + variantSummaryHtml(item) + "</td>" +
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
          variantSummaryHtml(item) +
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
    var designStat = document.querySelector('[data-stat="designs"]');
    if (catStat) catStat.textContent = String(data.getCategories().length);
    if (designStat && data.getArtworks) designStat.textContent = String(data.getArtworks().length);
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
    if (field("frontDesign")) field("frontDesign").value = item ? (item.frontDesign || "") : "";
    if (field("backDesign")) field("backDesign").value = item ? (item.backDesign || "") : "";
    field("status").value = item ? item.status : "active";
    field("featured").value = item && item.featured ? "yes" : "no";
    cloneDraft(item);
    if (colorNameEl) colorNameEl.value = "";
    if (colorHexEl) colorHexEl.value = "#111111";
    if (colorPickerEl) colorPickerEl.value = "#111111";
    if (sizeCustomEl) sizeCustomEl.value = "";
    renderVariantEditor();
    syncFilled();
    var content = document.querySelector(".admin-content");
    if (content) content.scrollTop = 0;
    else window.scrollTo(0, 0);
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
    if (sku && products.some(function (item) {
      return (item.variants || []).some(function (entry) {
        return String(entry.sku || "").toLowerCase() === sku.toLowerCase() && !(item.id === currentId);
      });
    })) errors.push("Product SKU must not match an existing variant SKU.");
    if (slug && products.some(function (item) {
      return item.slug === slug && item.id !== currentId;
    })) errors.push("Slug must be unique.");
    syncCombinations();
    var options = {
      colors: draftOptions.colors.map(function (entry) {
        return { id: entry.id, name: entry.name, hex: entry.hex, image: entry.image || "" };
      }),
      sizes: draftOptions.sizes.map(function (entry) {
        return { id: entry.id, label: entry.label };
      })
    };
    var variants = [];
    var seenSkus = {};
    var i;
    for (i = 0; i < draftVariants.length; i += 1) {
      var entry = draftVariants[i];
      var variantSku = String(entry.sku || "").trim();
      if (!variantSku) errors.push("Each variant needs a SKU.");
      else if (variantSku.toLowerCase() === sku.toLowerCase()) errors.push("Variant SKU " + variantSku + " matches the product SKU.");
      else if (seenSkus[variantSku.toLowerCase()]) errors.push("Variant SKU " + variantSku + " is duplicated.");
      else if (skuConflicts(variantSku, entry.id)) errors.push("Variant SKU " + variantSku + " must be unique.");
      if (variantSku) seenSkus[variantSku.toLowerCase()] = true;
      var regularOverride = entry.regularPrice;
      var saleOverride = entry.salePrice;
      if (regularOverride != null && (!Number.isFinite(regularOverride) || regularOverride < 0)) errors.push("Variant regular price cannot be negative.");
      if (saleOverride != null && (!Number.isFinite(saleOverride) || saleOverride < 0)) errors.push("Variant sale price cannot be negative.");
      var effectiveRegular = regularOverride != null && Number.isFinite(regularOverride) ? regularOverride : regularPrice;
      if (saleOverride != null && Number.isFinite(saleOverride) && saleOverride >= effectiveRegular) {
        errors.push("Variant sale price must be lower than the effective regular price.");
      }
      variants.push({
        id: entry.id,
        colorId: entry.colorId || "",
        sizeId: entry.sizeId || "",
        sku: variantSku,
        regularPrice: regularOverride,
        salePrice: saleOverride,
        status: entry.status === "inactive" ? "inactive" : "active",
        image: entry.image || ""
      });
    }
    var gallery = [];
    var gallerySeen = {};
    var galleryHasPrimary = false;
    for (i = 0; i < draftGallery.length; i += 1) {
      var galleryEntry = draftGallery[i];
      var gallerySrc = data.normalizeAssetPath ? data.normalizeAssetPath(galleryEntry.src) : String(galleryEntry.src || "").trim();
      if (data.isTemporarySrc && data.isTemporarySrc(galleryEntry.src)) {
        errors.push("Temporary local previews cannot be saved as gallery images.");
        continue;
      }
      if (!gallerySrc) {
        errors.push("Each gallery image needs a valid reference path.");
        continue;
      }
      if (gallerySeen[gallerySrc]) continue;
      gallerySeen[gallerySrc] = true;
      gallery.push({
        id: galleryEntry.id || ("gallery-" + (gallery.length + 1)),
        src: gallerySrc,
        alt: String(galleryEntry.alt || "").trim(),
        primary: Boolean(galleryEntry.primary)
      });
      if (galleryEntry.primary) galleryHasPrimary = true;
    }
    if (gallery.length && !galleryHasPrimary) gallery[0].primary = true;
    var primarySrc = "";
    for (i = 0; i < gallery.length; i += 1) {
      if (gallery[i].primary) {
        primarySrc = gallery[i].src;
        break;
      }
    }
    if (!primarySrc && gallery.length) primarySrc = gallery[0].src;
    var frontRaw = field("frontDesign") ? field("frontDesign").value : "";
    var backRaw = field("backDesign") ? field("backDesign").value : "";
    if (data.isTemporarySrc && data.isTemporarySrc(frontRaw)) errors.push("Temporary local previews cannot be saved as a front design.");
    if (data.isTemporarySrc && data.isTemporarySrc(backRaw)) errors.push("Temporary local previews cannot be saved as a back design.");
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
        image: primarySrc,
        gallery: gallery,
        frontDesign: data.normalizeAssetPath ? data.normalizeAssetPath(frontRaw) : String(frontRaw || "").trim(),
        backDesign: data.normalizeAssetPath ? data.normalizeAssetPath(backRaw) : String(backRaw || "").trim(),
        options: options,
        variants: variants
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
      existing.gallery = result.data.gallery;
      existing.frontDesign = result.data.frontDesign;
      existing.backDesign = result.data.backDesign;
      existing.options = result.data.options;
      existing.variants = result.data.variants;
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
        gallery: result.data.gallery,
        frontDesign: result.data.frontDesign,
        backDesign: result.data.backDesign,
        options: result.data.options,
        variants: result.data.variants,
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
      return;
    }
    if (event.target.closest("[data-variant-add-color]")) {
      event.preventDefault();
      addColor(colorNameEl ? colorNameEl.value : "", colorHexEl ? colorHexEl.value : "#111111");
      if (colorNameEl) colorNameEl.value = "";
      syncFilled();
      return;
    }
    if (event.target.closest("[data-variant-add-size]")) {
      event.preventDefault();
      addSize(sizeCustomEl ? sizeCustomEl.value : "");
      if (sizeCustomEl) sizeCustomEl.value = "";
      syncFilled();
      return;
    }
    var colorRemove = event.target.closest("[data-color-remove]");
    if (colorRemove) {
      event.preventDefault();
      removeColor(colorRemove.getAttribute("data-color-remove"));
      return;
    }
    var sizeToggle = event.target.closest("[data-size-toggle]");
    if (sizeToggle) {
      event.preventDefault();
      toggleSizeLabel(sizeToggle.getAttribute("data-size-toggle"));
      return;
    }
    var sizeRemove = event.target.closest("[data-size-remove]");
    if (sizeRemove) {
      event.preventDefault();
      removeSizeById(sizeRemove.getAttribute("data-size-remove"));
      return;
    }
    if (event.target.closest("[data-gallery-add]")) {
      event.preventDefault();
      addGalleryItem();
      return;
    }
    var galleryPrimary = event.target.closest("[data-gallery-primary]");
    if (galleryPrimary) {
      event.preventDefault();
      setGalleryPrimary(galleryPrimary.getAttribute("data-gallery-primary"));
      return;
    }
    var galleryRemove = event.target.closest("[data-gallery-remove]");
    if (galleryRemove) {
      event.preventDefault();
      removeGalleryItem(galleryRemove.getAttribute("data-gallery-remove"));
      return;
    }
    var galleryUp = event.target.closest("[data-gallery-up]");
    if (galleryUp) {
      event.preventDefault();
      moveGalleryItem(galleryUp.getAttribute("data-gallery-up"), -1);
      return;
    }
    var galleryDown = event.target.closest("[data-gallery-down]");
    if (galleryDown) {
      event.preventDefault();
      moveGalleryItem(galleryDown.getAttribute("data-gallery-down"), 1);
      return;
    }
    var mockupClear = event.target.closest("[data-color-mockup-clear]");
    if (mockupClear) {
      event.preventDefault();
      setColorMockup(mockupClear.getAttribute("data-color-mockup-clear"), "");
      return;
    }
    if (event.target.closest("[data-front-clear]")) {
      event.preventDefault();
      if (field("frontDesign")) field("frontDesign").value = "";
      renderDesignRefs();
      syncFilled();
      return;
    }
    if (event.target.closest("[data-back-clear]")) {
      event.preventDefault();
      if (field("backDesign")) field("backDesign").value = "";
      renderDesignRefs();
      syncFilled();
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
    form.addEventListener("input", function (event) {
      var target = event.target;
      var colorName = target.getAttribute && target.getAttribute("data-color-name");
      var colorHex = target.getAttribute && target.getAttribute("data-color-hex");
      var variantSku = target.getAttribute && target.getAttribute("data-variant-sku");
      var variantRegular = target.getAttribute && target.getAttribute("data-variant-regular");
      var variantSale = target.getAttribute && target.getAttribute("data-variant-sale");
      if (colorName) {
        var color = findColor(colorName);
        if (color) color.name = String(target.value || "").trim() || color.name;
        refreshUntouchedSkus();
        return;
      }
      if (colorHex) {
        var hexColor = findColor(colorHex);
        if (hexColor) {
          hexColor.hex = data.normalizeHex ? data.normalizeHex(target.value) : target.value;
          var picker = form.querySelector('[data-color-picker="' + colorHex + '"]');
          if (picker && /^#[0-9A-Fa-f]{6}$/.test(hexColor.hex)) picker.value = hexColor.hex;
        }
        return;
      }
      if (variantSku) {
        var skuEntry = findDraftVariant(variantSku);
        if (skuEntry) {
          skuEntry.sku = String(target.value || "").trim();
          skuEntry.skuTouched = true;
        }
        return;
      }
      if (variantRegular) {
        var regularEntry = findDraftVariant(variantRegular);
        if (regularEntry) {
          var parsedRegular = parseOptionalPrice(target.value);
          if (!parsedRegular.error) regularEntry.regularPrice = parsedRegular.value;
        }
        return;
      }
      if (variantSale) {
        var saleEntry = findDraftVariant(variantSale);
        if (saleEntry) {
          var parsedSale = parseOptionalPrice(target.value);
          if (!parsedSale.error) saleEntry.salePrice = parsedSale.value;
        }
        return;
      }
      if (target === field("sku")) {
        refreshUntouchedSkus();
        renderVariants();
      }
      if (target === field("regularPrice") || target === field("salePrice")) {
        renderVariants();
      }
      var galleryPath = target.getAttribute && target.getAttribute("data-gallery-path");
      var galleryCaption = target.getAttribute && target.getAttribute("data-gallery-caption");
      if (galleryPath) {
        var galleryItem = findGallery(galleryPath);
        if (galleryItem) {
          if (data.isTemporarySrc && data.isTemporarySrc(target.value)) {
            toast("Temporary local previews cannot be saved. Choose an existing project asset.");
            target.value = galleryItem.src;
            return;
          }
          galleryItem.src = data.normalizeAssetPath ? data.normalizeAssetPath(target.value) : target.value;
          syncPrimaryImageField();
        }
        return;
      }
      if (galleryCaption) {
        var captionItem = findGallery(galleryCaption);
        if (captionItem) captionItem.alt = String(target.value || "").trim();
        return;
      }
      syncFilled();
    });
    form.addEventListener("change", function (event) {
      var target = event.target;
      var picker = target.getAttribute && target.getAttribute("data-color-picker");
      var status = target.getAttribute && target.getAttribute("data-variant-status");
      var addPicker = target.getAttribute && target.hasAttribute("data-variant-color-picker");
      if (picker) {
        var picked = findColor(picker);
        if (picked) {
          picked.hex = data.normalizeHex ? data.normalizeHex(target.value) : target.value;
          var hexInput = form.querySelector('[data-color-hex="' + picker + '"]');
          if (hexInput) hexInput.value = picked.hex;
          renderVariants();
        }
        return;
      }
      if (addPicker && colorHexEl) {
        colorHexEl.value = String(target.value || "").toUpperCase();
        return;
      }
      var mockup = target.getAttribute && target.getAttribute("data-color-mockup");
      if (mockup) {
        setColorMockup(mockup, target.value);
        return;
      }
      if (target === galleryAssetEl && target.value) {
        if (gallerySrcEl) gallerySrcEl.value = target.value;
        syncFilled();
        return;
      }
      if (target === frontAssetEl && field("frontDesign")) {
        field("frontDesign").value = target.value;
        renderDesignRefs();
        syncFilled();
        return;
      }
      if (target === backAssetEl && field("backDesign")) {
        field("backDesign").value = target.value;
        renderDesignRefs();
        syncFilled();
        return;
      }
      if (target === field("frontDesign") || target === field("backDesign")) {
        renderDesignRefs();
      }
      if (target.getAttribute && target.getAttribute("data-gallery-path")) {
        var pathItem = findGallery(target.getAttribute("data-gallery-path"));
        if (pathItem) pathItem.src = data.normalizeAssetPath ? data.normalizeAssetPath(target.value) : target.value;
        renderGallery();
        return;
      }
      if (target.getAttribute && target.getAttribute("data-gallery-caption")) {
        var captionEntry = findGallery(target.getAttribute("data-gallery-caption"));
        if (captionEntry) captionEntry.alt = String(target.value || "").trim();
        return;
      }
      if (target.getAttribute && target.getAttribute("data-color-name")) {
        renderVariants();
        return;
      }
      if (target.getAttribute && target.getAttribute("data-color-hex")) {
        renderVariants();
        return;
      }
      if (target.getAttribute && target.getAttribute("data-variant-regular")) {
        renderVariants();
        return;
      }
      if (target.getAttribute && target.getAttribute("data-variant-sale")) {
        renderVariants();
        return;
      }
      if (status) {
        var statusEntry = findDraftVariant(status);
        if (statusEntry) {
          statusEntry.status = target.value === "inactive" ? "inactive" : "active";
          renderVariants();
        }
        return;
      }
      if (target === field("sku")) {
        refreshUntouchedSkus();
        renderVariants();
      }
      if (target === field("regularPrice") || target === field("salePrice")) {
        renderVariants();
      }
      syncFilled();
    });
  }
  if (colorHexEl && colorPickerEl) {
    colorHexEl.addEventListener("input", function () {
      var hex = data.normalizeHex ? data.normalizeHex(colorHexEl.value) : colorHexEl.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) colorPickerEl.value = hex;
    });
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
