(function (global) {
  var ALLOWED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
  var ALLOWED_EXT = ["png", "jpg", "jpeg", "pdf"];
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var PRINT_HINTS = {
    DTF: "Opaque transfers on any color",
    Sublimation: "All-over dye-infused colour"
  };
  var bound = false;
  var catalog = null;
  var artwork = null;
  var product = null;
  var related = [];
  var state = null;
  var previewUrls = { front: "", back: "" };
  var mainImg = null;
  var thumbs = null;
  var relatedGrid = null;
  var qtyOut = null;
  var addBtn = null;
  var buyBtn = null;
  var hint = null;
  var lightbox = null;
  var lightboxImg = null;
  var lightboxCounter = null;
  var galleryFrame = null;
  var sizeGuide = null;
  var sizeGuideBody = null;
  var lastFocus = null;
  var activeOverlay = null;

  function live() {
    return Boolean(product && mainImg && document.body.contains(mainImg));
  }

  function busy(el) {
    if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(el);
  }

  function money(value) {
    return "₹" + value.toLocaleString("en-IN");
  }

  function discountPercent() {
    return Math.round(((product.mrp - product.price) / product.mrp) * 100);
  }

  function estimatedTotal() {
    return product.price * state.quantity;
  }

  function configuredLine() {
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      printType: state.printType,
      color: state.color,
      size: state.size,
      quantity: state.quantity,
      designFile: state.designFile ? { name: state.designFile.name, type: state.designFile.type, size: state.designFile.size } : null,
      designFiles: {
        front: state.designFiles.front ? { name: state.designFiles.front.name, type: state.designFiles.front.type, size: state.designFiles.front.size } : null,
        back: state.designFiles.back ? { name: state.designFiles.back.name, type: state.designFiles.back.type, size: state.designFiles.back.size } : null
      },
      printPosition: state.printPosition,
      specialInstructions: state.specialInstructions,
      artworkId: artwork ? artwork.id : "",
      artworkName: artwork ? artwork.name : "",
      price: product.price,
      mrp: product.mrp,
      weight: product.weight,
      estimatedTotal: estimatedTotal()
    };
  }

  function card(item) {
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
          '<a class="btn btn-secondary" href="' + catalog.productUrl(item.id) + '">View Product</a>' +
        "</div>" +
      "</article>"
    );
  }

  function setText(sel, value) {
    var el = document.querySelector(sel);
    if (el) el.textContent = value;
  }

  function queryParam(name) {
    var value = "";
    try {
      value = new URLSearchParams(global.location.search).get(name) || "";
    } catch (e) {
      value = "";
    }
    try {
      value = decodeURIComponent(value);
    } catch (err) {}
    return String(value || "").trim();
  }

  function hydrateArtworkContext() {
    var note = document.querySelector("[data-artwork-context]");
    var text = document.querySelector("[data-artwork-context-text]");
    if (!note) return;
    if (!artwork) {
      note.hidden = true;
      if (text) text.textContent = "";
      return;
    }
    note.hidden = false;
    if (text) {
      var href = global.DSAtelier.artworks.artworkUrl(artwork.id);
      var name = String(artwork.name || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      text.innerHTML = 'Selected artwork: <a href="' + href + '">' + name + "</a>";
    }
  }

  function hydrate() {
    document.title = product.name + " - DS ATELIER";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Configure and order the " + product.name + ". Choose print type, color, size and upload your design.");
    }

    setText("[data-crumb-category]", product.category);
    setText("[data-crumb-name]", product.name);
    setText("[data-product-name]", product.name);
    setText("[data-product-rating]", String(product.rating));
    setText("[data-product-reviews]", product.reviews + " reviews");
    setText("[data-product-price]", money(product.price));
    setText("[data-product-mrp]", money(product.mrp));
    setText("[data-product-off]", discountPercent() + "% off");
    setText("[data-product-lead]", String(product.lead || "").replace(/\s*Configuration is required before Add to Cart\.?/i, "").trim());
    hydrateArtworkContext();

    var badges = document.querySelector("[data-product-badges]");
    if (badges) {
      badges.innerHTML =
        '<span class="badge">' + product.badge + "</span>" +
        '<span class="badge">Custom print</span>';
    }

    var facts = document.querySelector("[data-product-facts]");
    if (facts) {
      facts.innerHTML =
        "<li><span>Print Type</span> " + product.printTypes.join(" / ") + "</li>" +
        "<li><span>Material</span> " + product.material + "</li>" +
        "<li><span>GSM</span> " + product.gsm + "</li>" +
        "<li><span>Weight</span> " + product.weight + " g</li>";
    }

    var printWrap = document.querySelector("[data-print-type-options]");
    if (printWrap) {
      printWrap.innerHTML = product.printTypes.map(function (type) {
        var hintText = PRINT_HINTS[type] ? " <small>" + PRINT_HINTS[type] + "</small>" : "";
        return '<button class="option-card" type="button" data-print-type="' + type + '" aria-pressed="false">' + type + hintText + "</button>";
      }).join("");
    }

    var colorWrap = document.querySelector("[data-color-options]");
    if (colorWrap) {
      var colors = (product.colors || []).slice();
      if (product.color && colors.indexOf(product.color) === -1) {
        colors.unshift(product.color);
      }
      colorWrap.innerHTML = colors.map(function (color) {
        var cls = "swatch-" + color.toLowerCase();
        return '<button class="swatch" type="button" data-color="' + color + '" aria-pressed="false"><span class="swatch-dot ' + cls + '"></span>' + color + "</button>";
      }).join("");
    }

    var sizeWrap = document.querySelector("[data-size-options]");
    if (sizeWrap) {
      sizeWrap.innerHTML = product.sizes.map(function (size) {
        return '<button class="size-btn" type="button" data-size="' + size + '" aria-pressed="false">' + size + "</button>";
      }).join("");
    }

    var details = document.querySelector("[data-product-details]");
    if (details) {
      details.innerHTML =
        "<p>" + product.details + "</p>" +
        "<p>SKU " + product.sku + ". Weight " + product.weight + " g.</p>";
    }
  }

  function setImage(index) {
    state.image = (index + product.images.length) % product.images.length;
    var item = product.images[state.image];
    if (mainImg) {
      mainImg.src = item.src;
      mainImg.alt = item.alt;
    }
    if (lightboxImg) {
      lightboxImg.src = item.src;
      lightboxImg.alt = item.alt;
    }
    if (lightboxCounter) {
      lightboxCounter.textContent = (state.image + 1) + " / " + product.images.length;
    }
    document.querySelectorAll("[data-thumb]").forEach(function (btn, i) {
      var active = i === state.image;
      btn.classList.toggle("is-active", active);
      if (active && btn.scrollIntoView && !(lightbox && lightbox.classList.contains("is-open"))) {
        btn.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      }
    });
  }

  function requiredUploadSlots() {
    if (state.printPosition === "Back") return ["back"];
    if (state.printPosition === "Front + Back") return ["front", "back"];
    if (state.printPosition === "Front") return ["front"];
    return [];
  }

  function uploadsReady() {
    var slots = requiredUploadSlots();
    if (!slots.length) return false;
    return slots.every(function (slot) {
      return Boolean(state.designFiles[slot]);
    });
  }

  function syncPrimaryFile() {
    var slots = requiredUploadSlots();
    state.designFile = slots.length ? (state.designFiles[slots[0]] || null) : null;
  }

  function isComplete() {
    return Boolean(state.printType && state.color && state.size && uploadsReady() && state.printPosition && state.quantity >= 1);
  }

  function missing() {
    var needs = [];
    if (!state.printType) needs.push("print type");
    if (!state.printPosition) needs.push("print position");
    if (!state.color) needs.push("color");
    if (!state.size) needs.push("size");
    if (!uploadsReady()) {
      var slots = requiredUploadSlots();
      if (slots.length === 2) needs.push("front and back design files");
      else if (slots[0] === "back") needs.push("back design file");
      else needs.push("design file");
    }
    return needs;
  }

  function updateSummary() {
    var map = {
      "[data-summary-mrp]": money(product.mrp),
      "[data-summary-price]": money(product.price),
      "[data-summary-discount]": discountPercent() + "%",
      "[data-summary-qty]": String(state.quantity),
      "[data-summary-total]": money(estimatedTotal())
    };
    Object.keys(map).forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.textContent = map[sel];
    });
  }

  function updateActions() {
    var ready = isComplete();
    if (addBtn) addBtn.disabled = !ready;
    if (buyBtn) buyBtn.disabled = !ready;
    if (hint) {
      hint.hidden = ready;
      if (!ready) hint.textContent = "Select " + missing().join(", ") + " to continue.";
    }
  }

  function selectExclusive(group, value) {
    document.querySelectorAll("[data-" + group + "]").forEach(function (btn) {
      var selected = btn.getAttribute("data-" + group) === value;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function fileSizeLabel(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(/\.0$/, "") + " KB";
    return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " MB";
  }

  function zoneEls(slot) {
    return {
      zone: document.querySelector('[data-upload-zone="' + slot + '"]'),
      trigger: document.querySelector('[data-upload-trigger="' + slot + '"]'),
      input: document.querySelector('[data-upload-input="' + slot + '"]'),
      name: document.querySelector('[data-upload-name="' + slot + '"]'),
      size: document.querySelector('[data-upload-size="' + slot + '"]'),
      preview: document.querySelector('[data-upload-preview="' + slot + '"]'),
      error: document.querySelector('[data-upload-error="' + slot + '"]')
    };
  }

  function syncUploadVisibility() {
    var slots = requiredUploadSlots();
    var previews = document.querySelector("[data-upload-previews]");
    var block = document.querySelector("[data-upload-block]");
    var visible = 0;
    ["front", "back"].forEach(function (slot) {
      var els = zoneEls(slot);
      var required = slots.indexOf(slot) !== -1;
      var hasFile = Boolean(state.designFiles[slot]);
      if (els.trigger) els.trigger.hidden = !required;
      if (els.zone) els.zone.hidden = !(required && hasFile);
      if (required && hasFile) visible++;
    });
    if (previews) previews.classList.toggle("is-dual", visible === 2);
    if (block) block.hidden = !slots.length;
  }

  function showUploadError(slot, message) {
    var els = zoneEls(slot);
    if (!els.error) return;
    els.error.hidden = !message;
    els.error.textContent = message || "";
  }

  function clearPreview(slot) {
    if (previewUrls[slot]) {
      URL.revokeObjectURL(previewUrls[slot]);
      previewUrls[slot] = "";
    }
    var els = zoneEls(slot);
    if (els.preview) {
      els.preview.hidden = true;
      els.preview.removeAttribute("src");
    }
  }

  function isAllowedFile(file) {
    if (!file) return false;
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > MAX_FILE_BYTES) return false;
    if (ALLOWED_TYPES.indexOf(file.type) !== -1) return true;
    return ALLOWED_EXT.indexOf(ext) !== -1;
  }

  function applyFile(slot, file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showUploadError(slot, "File must be 25 MB or smaller.");
      return;
    }
    if (!isAllowedFile(file)) {
      showUploadError(slot, "Use PNG, JPG, JPEG or PDF.");
      return;
    }
    showUploadError(slot, "");
    state.designFiles[slot] = file;
    syncPrimaryFile();
    var els = zoneEls(slot);
    if (els.name) els.name.textContent = file.name;
    if (els.size) els.size.textContent = fileSizeLabel(file.size);
    clearPreview(slot);
    if (els.preview && file.type.indexOf("image/") === 0) {
      previewUrls[slot] = URL.createObjectURL(file);
      els.preview.src = previewUrls[slot];
      els.preview.hidden = false;
    }
    syncUploadVisibility();
    updateActions();
  }

  function removeFile(slot) {
    state.designFiles[slot] = null;
    syncPrimaryFile();
    var els = zoneEls(slot);
    if (els.input) els.input.value = "";
    if (els.name) els.name.textContent = "";
    if (els.size) els.size.textContent = "";
    clearPreview(slot);
    showUploadError(slot, "");
    syncUploadVisibility();
    updateActions();
  }

  function syncUploadZones() {
    var slots = requiredUploadSlots();
    ["front", "back"].forEach(function (slot) {
      if (slots.indexOf(slot) === -1 && state.designFiles[slot]) removeFile(slot);
    });
    syncUploadVisibility();
    syncPrimaryFile();
    updateActions();
  }

  function overlayFocusables(overlay) {
    if (!overlay) return [];
    return Array.prototype.slice.call(overlay.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")).filter(function (el) {
      return !el.disabled && el.getAttribute("aria-hidden") !== "true";
    });
  }

  function openOverlay(overlay, labelEl) {
    if (!overlay) return;
    lastFocus = document.activeElement;
    activeOverlay = overlay;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    var focusables = overlayFocusables(overlay);
    var target = labelEl || focusables[0];
    if (target && target.focus) target.focus();
  }

  function closeOverlay(overlay) {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    if (!document.querySelector(".product-lightbox.is-open, .size-guide-overlay.is-open")) {
      document.body.style.overflow = "";
      activeOverlay = null;
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openLightbox() {
    openOverlay(lightbox, lightbox.querySelector("[data-close-lightbox]"));
  }

  function closeLightbox() {
    closeOverlay(lightbox);
  }

  function openSizeGuide() {
    var source = document.getElementById("panel-size");
    if (sizeGuideBody && source) sizeGuideBody.innerHTML = source.innerHTML;
    openOverlay(sizeGuide, sizeGuide.querySelector("[data-close-size-guide]"));
  }

  function closeSizeGuide() {
    closeOverlay(sizeGuide);
  }

  function setQty(next) {
    state.quantity = Math.max(1, next);
    if (qtyOut) qtyOut.textContent = String(state.quantity);
    updateSummary();
  }

  function onClick(event) {
    if (!live()) return;
    var thumb = event.target.closest("[data-thumb]");
    if (thumb) setImage(Number(thumb.getAttribute("data-thumb")));
    if (event.target.closest("[data-gallery-prev]")) setImage(state.image - 1);
    if (event.target.closest("[data-gallery-next]")) setImage(state.image + 1);
    if (event.target.closest("[data-zoom]")) openLightbox();
    if (event.target.closest("[data-close-lightbox]") || event.target === lightbox) closeLightbox();
    if (event.target.closest("[data-open-size-guide]")) openSizeGuide();
    if (event.target.closest("[data-close-size-guide]") || event.target === sizeGuide) closeSizeGuide();

    var printType = event.target.closest("[data-print-type]");
    if (printType) {
      state.printType = printType.getAttribute("data-print-type");
      selectExclusive("print-type", state.printType);
      updateActions();
    }

    var color = event.target.closest("[data-color]");
    if (color) {
      state.color = color.getAttribute("data-color");
      selectExclusive("color", state.color);
      updateActions();
    }

    var size = event.target.closest("[data-size]");
    if (size && !size.disabled) {
      state.size = size.getAttribute("data-size");
      selectExclusive("size", state.size);
      updateActions();
    }

    var position = event.target.closest("[data-position]");
    if (position) {
      state.printPosition = position.getAttribute("data-position");
      selectExclusive("position", state.printPosition);
      syncUploadZones();
    }

    if (event.target.closest("[data-qty-minus]")) setQty(state.quantity - 1);
    if (event.target.closest("[data-qty-plus]")) setQty(state.quantity + 1);
    var trigger = event.target.closest("[data-upload-trigger]");
    if (trigger) {
      var triggerSlot = trigger.getAttribute("data-upload-trigger");
      var triggerInput = zoneEls(triggerSlot).input;
      if (triggerInput) triggerInput.click();
    }

    var removeBtn = event.target.closest("[data-remove-file]");
    if (removeBtn) {
      event.preventDefault();
      event.stopPropagation();
      removeFile(removeBtn.getAttribute("data-remove-file") || "front");
      return;
    }

    var tab = event.target.closest("[data-tab]");
    if (tab) {
      var id = tab.getAttribute("data-tab");
      document.querySelectorAll("[data-tab]").forEach(function (btn) {
        var active = btn === tab;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll("[data-tab-panel]").forEach(function (panel) {
        var active = panel.getAttribute("data-tab-panel") === id;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    }

    var addCart = event.target.closest("[data-add-cart]");
    if (addCart && isComplete()) {
      busy(addCart);
      var line = configuredLine();
      var commerce = global.DSAtelier && global.DSAtelier.commerce;
      if (commerce && commerce.addToCart) {
        commerce.addToCart(line.productId, {
          color: line.color,
          size: line.size,
          printType: line.printType,
          printPosition: line.printPosition,
          qty: line.quantity,
          artworkId: line.artworkId,
          artworkName: line.artworkName
        });
      } else {
        document.querySelectorAll(".cart-count").forEach(function (el) {
          el.textContent = String(Number(el.textContent || 0) + state.quantity);
        });
      }
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Added to cart (demo). Checkout is not connected yet.";
      }
    }

    var buyNow = event.target.closest("[data-buy-now]");
    if (buyNow && isComplete() && hint) {
      busy(buyNow);
      configuredLine();
      hint.hidden = false;
      hint.textContent = "Buy Now is presentation-only until checkout is built.";
    }
  }

  function onKey(event) {
    if (!live()) return;
    if (event.key === "Escape") {
      closeLightbox();
      closeSizeGuide();
    }
    if (lightbox && lightbox.classList.contains("is-open")) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setImage(state.image - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setImage(state.image + 1);
      }
    }
    if (event.key === "Tab" && activeOverlay && activeOverlay.classList.contains("is-open")) {
      var focusables = overlayFocusables(activeOverlay);
      if (!focusables.length) {
        event.preventDefault();
        return;
      }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function bindLocal() {
    ["front", "back"].forEach(function (slot) {
      var els = zoneEls(slot);
      if (els.input && els.input.getAttribute("data-bound") !== "true") {
        els.input.setAttribute("data-bound", "true");
        els.input.addEventListener("change", function () {
          applyFile(slot, els.input.files && els.input.files[0]);
        });
      }
    });

    var uploadCard = document.querySelector("[data-upload-card]");
    if (uploadCard && uploadCard.getAttribute("data-bound") !== "true") {
      uploadCard.setAttribute("data-bound", "true");
      var dropTargetSlot = function () {
        var slots = requiredUploadSlots();
        for (var i = 0; i < slots.length; i++) {
          if (!state.designFiles[slots[i]]) return slots[i];
        }
        return slots[0] || "";
      };
      ["dragenter", "dragover"].forEach(function (type) {
        uploadCard.addEventListener(type, function (event) {
          event.preventDefault();
          uploadCard.classList.add("is-dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (type) {
        uploadCard.addEventListener(type, function () {
          uploadCard.classList.remove("is-dragover");
        });
      });
      uploadCard.addEventListener("drop", function (event) {
        event.preventDefault();
        var slot = dropTargetSlot();
        if (slot) applyFile(slot, event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
      });
    }

    var notes = document.querySelector("[data-notes]");
    if (notes && notes.getAttribute("data-bound") !== "true") {
      notes.setAttribute("data-bound", "true");
      notes.addEventListener("input", function () {
        state.specialInstructions = notes.value;
      });
    }

    if (galleryFrame && galleryFrame.getAttribute("data-bound") !== "true") {
      galleryFrame.setAttribute("data-bound", "true");
      var touchX = 0;
      galleryFrame.addEventListener("touchstart", function (event) {
        touchX = event.changedTouches[0].clientX;
      }, { passive: true });
      galleryFrame.addEventListener("touchend", function (event) {
        var delta = event.changedTouches[0].clientX - touchX;
        if (delta > 40) setImage(state.image - 1);
        if (delta < -40) setImage(state.image + 1);
      }, { passive: true });
    }
  }

  function init() {
    catalog = global.DSAtelier && global.DSAtelier.catalog;
    var requestedId = queryParam("id");
    var artworkId = queryParam("design");
    var artworks = global.DSAtelier && global.DSAtelier.artworks;
    artwork = artworks && artworks.getById ? artworks.getById(artworkId) : null;
    product = catalog && catalog.resolve ? catalog.resolve(requestedId) : null;
    related = catalog && product ? catalog.getRelated(product.id, 4) : [];
    mainImg = document.querySelector("[data-main-image]");
    thumbs = document.querySelector("[data-thumbs]");
    relatedGrid = document.querySelector("[data-related-grid]");
    qtyOut = document.querySelector("[data-qty]");
    addBtn = document.querySelector("[data-add-cart]");
    buyBtn = document.querySelector("[data-buy-now]");
    hint = document.querySelector("[data-config-hint]");
    lightbox = document.querySelector("[data-lightbox]");
    lightboxImg = document.querySelector("[data-lightbox-image]");
    lightboxCounter = document.querySelector("[data-lightbox-counter]");
    galleryFrame = document.querySelector(".product-main-frame");
    sizeGuide = document.querySelector("[data-size-guide]");
    sizeGuideBody = document.querySelector("[data-size-guide-body]");
    lastFocus = null;
    activeOverlay = null;
    previewUrls = { front: "", back: "" };
    if (!product || !mainImg) return;
    state = {
      image: 0,
      printType: "",
      color: "",
      size: "",
      quantity: 1,
      designFile: null,
      designFiles: { front: null, back: null },
      printPosition: "",
      specialInstructions: ""
    };
    hydrate();
    if (thumbs) {
      thumbs.innerHTML = product.images.map(function (item, i) {
        return '<button type="button" data-thumb="' + i + '"' + (i === 0 ? ' class="is-active"' : "") + ' aria-label="Show image ' + (i + 1) + '"><img src="' + item.src + '" alt="" width="160" height="160"></button>';
      }).join("");
    }
    if (relatedGrid) relatedGrid.innerHTML = related.map(card).join("");
    setImage(0);
    updateSummary();
    updateActions();
    bindLocal();
    syncUploadZones();
    if (!bound) {
      document.addEventListener("click", onClick);
      document.addEventListener("keydown", onKey);
      bound = true;
    }
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.product = { init: init };
  init();
})(window);
