(function () {
  var ALLOWED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
  var ALLOWED_EXT = ["png", "jpg", "jpeg", "pdf"];
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var PRINT_HINTS = {
    DTF: "Opaque transfers on any color",
    Sublimation: "All-over dye-infused colour"
  };

  var catalog = window.DSAtelier && window.DSAtelier.catalog;
  var requestedId = "";
  try {
    requestedId = new URLSearchParams(window.location.search).get("id") || "";
  } catch (e) {
    requestedId = "";
  }

  var product = catalog && catalog.resolve
    ? catalog.resolve(requestedId)
    : null;
  var related = catalog && product ? catalog.getRelated(product.id, 4) : [];

  if (!product) return;

  var state = {
    image: 0,
    printType: "",
    color: "",
    size: "",
    quantity: 1,
    designFile: null,
    printPosition: "",
    specialInstructions: ""
  };

  var previewUrl = "";
  var mainImg = document.querySelector("[data-main-image]");
  var thumbs = document.querySelector("[data-thumbs]");
  var relatedGrid = document.querySelector("[data-related-grid]");
  var qtyOut = document.querySelector("[data-qty]");
  var addBtn = document.querySelector("[data-add-cart]");
  var buyBtn = document.querySelector("[data-buy-now]");
  var hint = document.querySelector("[data-config-hint]");
  var fileInput = document.querySelector("[data-upload-input]");
  var fileState = document.querySelector("[data-upload-file]");
  var fileName = document.querySelector("[data-upload-name]");
  var filePreview = document.querySelector("[data-upload-preview]");
  var fileError = document.querySelector("[data-upload-error]");
  var dropZone = document.querySelector("[data-upload-drop]");
  var lightbox = document.querySelector("[data-lightbox]");
  var lightboxImg = document.querySelector("[data-lightbox-image]");
  var galleryFrame = document.querySelector(".product-main-frame");

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
      printPosition: state.printPosition,
      specialInstructions: state.specialInstructions,
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

  function hydrate() {
    document.title = product.name + " — DS ATELIER";
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
    setText("[data-product-lead]", product.lead);

    var badges = document.querySelector("[data-product-badges]");
    if (badges) {
      badges.innerHTML =
        '<span class="badge">' + product.badge + "</span>" +
        '<span class="badge">Custom print</span>';
    }

    var facts = document.querySelector("[data-product-facts]");
    if (facts) {
      facts.innerHTML =
        "<li><span>Print</span> " + product.printTypes.join(" / ") + "</li>" +
        "<li><span>Material</span> " + product.material + "</li>" +
        "<li><span>GSM</span> " + product.gsm + "</li>" +
        "<li><span>Shipping</span> Free above ₹999</li>";
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
      colorWrap.innerHTML = product.colors.map(function (color) {
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
        "<p>SKU " + product.sku + ". Weight " + product.weight + " g. Configuration is required before purchase.</p>";
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
    document.querySelectorAll("[data-thumb]").forEach(function (btn, i) {
      btn.classList.toggle("is-active", i === state.image);
    });
  }

  function isComplete() {
    return Boolean(state.printType && state.color && state.size && state.designFile && state.printPosition && state.quantity >= 1);
  }

  function missing() {
    var needs = [];
    if (!state.printType) needs.push("print type");
    if (!state.color) needs.push("color");
    if (!state.size) needs.push("size");
    if (!state.designFile) needs.push("design file");
    if (!state.printPosition) needs.push("print position");
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

  function showUploadError(message) {
    if (!fileError) return;
    fileError.hidden = !message;
    fileError.textContent = message || "";
  }

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
    if (filePreview) {
      filePreview.hidden = true;
      filePreview.removeAttribute("src");
    }
  }

  function isAllowedFile(file) {
    if (!file) return false;
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > MAX_FILE_BYTES) return false;
    if (ALLOWED_TYPES.indexOf(file.type) !== -1) return true;
    return ALLOWED_EXT.indexOf(ext) !== -1;
  }

  function applyFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showUploadError("File must be 25 MB or smaller.");
      return;
    }
    if (!isAllowedFile(file)) {
      showUploadError("Use PNG, JPG, JPEG or PDF.");
      return;
    }
    showUploadError("");
    state.designFile = file;
    if (fileName) fileName.textContent = file.name;
    if (fileState) fileState.classList.add("is-visible");
    clearPreview();
    if (filePreview && file.type.indexOf("image/") === 0) {
      previewUrl = URL.createObjectURL(file);
      filePreview.src = previewUrl;
      filePreview.hidden = false;
    }
    updateActions();
  }

  function removeFile() {
    state.designFile = null;
    if (fileInput) fileInput.value = "";
    if (fileState) fileState.classList.remove("is-visible");
    if (fileName) fileName.textContent = "";
    clearPreview();
    showUploadError("");
    updateActions();
  }

  function openLightbox() {
    if (!lightbox) return;
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function setQty(next) {
    state.quantity = Math.max(1, next);
    if (qtyOut) qtyOut.textContent = String(state.quantity);
    updateSummary();
  }

  hydrate();

  if (thumbs) {
    thumbs.innerHTML = product.images.map(function (item, i) {
      return '<button type="button" data-thumb="' + i + '"' + (i === 0 ? ' class="is-active"' : "") + ' aria-label="Show image ' + (i + 1) + '"><img src="' + item.src + '" alt=""></button>';
    }).join("");
  }

  if (relatedGrid) relatedGrid.innerHTML = related.map(card).join("");
  setImage(0);
  updateSummary();
  updateActions();

  document.addEventListener("click", function (event) {
    var thumb = event.target.closest("[data-thumb]");
    if (thumb) setImage(Number(thumb.getAttribute("data-thumb")));
    if (event.target.closest("[data-gallery-prev]")) setImage(state.image - 1);
    if (event.target.closest("[data-gallery-next]")) setImage(state.image + 1);
    if (event.target.closest("[data-zoom]")) openLightbox();
    if (event.target.closest("[data-close-lightbox]") || event.target === lightbox) closeLightbox();

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
      updateActions();
    }

    if (event.target.closest("[data-qty-minus]")) setQty(state.quantity - 1);
    if (event.target.closest("[data-qty-plus]")) setQty(state.quantity + 1);
    if (event.target.closest("[data-remove-file]")) removeFile();

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

    if (event.target.closest("[data-add-cart]") && isComplete()) {
      configuredLine();
      document.querySelectorAll(".cart-count").forEach(function (el) {
        el.textContent = String(Number(el.textContent || 0) + state.quantity);
      });
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Added to cart (demo). Checkout is not connected yet.";
      }
    }

    if (event.target.closest("[data-buy-now]") && isComplete() && hint) {
      configuredLine();
      hint.hidden = false;
      hint.textContent = "Buy Now is presentation-only until checkout is built.";
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeLightbox();
    if (lightbox && lightbox.classList.contains("is-open")) {
      if (event.key === "ArrowLeft") setImage(state.image - 1);
      if (event.key === "ArrowRight") setImage(state.image + 1);
    }
  });

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      applyFile(fileInput.files && fileInput.files[0]);
    });
  }

  if (dropZone) {
    ["dragenter", "dragover"].forEach(function (type) {
      dropZone.addEventListener(type, function (event) {
        event.preventDefault();
        dropZone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      dropZone.addEventListener(type, function () {
        dropZone.classList.remove("is-dragover");
      });
    });
    dropZone.addEventListener("drop", function (event) {
      event.preventDefault();
      applyFile(event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]);
    });
  }

  var notes = document.querySelector("[data-notes]");
  if (notes) {
    notes.addEventListener("input", function () {
      state.specialInstructions = notes.value;
    });
  }

  if (galleryFrame) {
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
})();
