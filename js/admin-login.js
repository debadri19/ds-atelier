(function () {
  var form = document.querySelector("[data-admin-login]");
  if (!form) return;

  var identifierField = form.querySelector('[data-field="identifier"]');
  var passwordField = form.querySelector('[data-field="password"]');
  var identifierInput = form.querySelector("#admin-login-identifier");
  var passwordInput = form.querySelector("#admin-login-password");
  var submitBtn = form.querySelector("[data-admin-login-submit]");
  var noteEl = form.querySelector("[data-admin-login-note]");
  var dialog = document.querySelector("[data-admin-forgot-dialog]");
  var dialogClose = dialog ? Array.prototype.slice.call(dialog.querySelectorAll("[data-admin-forgot-close]")) : [];
  var lastFocus = null;
  var AUTH_MESSAGE = "Dashboard authentication is not configured yet. This page is currently a UI prototype.";

  function looksLikeEmail(value) {
    return String(value || "").indexOf("@") !== -1;
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function setFieldError(field, message) {
    if (!field) return;
    var invalid = Boolean(message);
    var input = field.querySelector(".form-input");
    var err = field.querySelector(".form-error");
    field.classList.toggle("is-invalid", invalid);
    if (input) input.setAttribute("aria-invalid", invalid ? "true" : "false");
    if (err) err.textContent = message || "";
  }

  function setNote(message, type) {
    if (!noteEl) return;
    noteEl.textContent = message || "";
    noteEl.classList.remove("is-error", "is-info");
    if (type) noteEl.classList.add(type);
  }

  function syncFilled() {
    form.querySelectorAll(".form-field").forEach(function (field) {
      var control = field.querySelector(".form-input");
      field.classList.toggle("is-filled", Boolean(control && String(control.value || "").trim()));
    });
  }

  function setBusy(busy) {
    if (!submitBtn) return;
    submitBtn.disabled = busy;
    submitBtn.classList.toggle("is-busy", busy);
    submitBtn.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function validate() {
    var identifier = identifierInput ? String(identifierInput.value || "").trim() : "";
    var password = passwordInput ? String(passwordInput.value || "") : "";
    var ok = true;

    if (!identifier) {
      setFieldError(identifierField, "Enter your email address or username.");
      ok = false;
    } else if (looksLikeEmail(identifier) && !isEmail(identifier)) {
      setFieldError(identifierField, "Enter a valid email address.");
      ok = false;
    } else {
      setFieldError(identifierField, "");
    }

    if (!password) {
      setFieldError(passwordField, "Enter your password.");
      ok = false;
    } else {
      setFieldError(passwordField, "");
    }

    return ok;
  }

  function firstInvalid() {
    return form.querySelector(".form-field.is-invalid .form-input");
  }

  function togglePassword(toggle) {
    if (!passwordInput) return;
    var show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    var icon = toggle.querySelector("i");
    if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
  }

  function setDialog(open) {
    if (!dialog) return;
    dialog.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var closeBtn = dialog.querySelector("[data-admin-forgot-close]");
      if (closeBtn && closeBtn.focus) closeBtn.focus();
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    setNote("", "");
    setBusy(true);
    window.setTimeout(function () {
      var ok = validate();
      setBusy(false);
      if (!ok) {
        var invalid = firstInvalid();
        if (invalid && invalid.focus) invalid.focus();
        setNote("Check the highlighted fields and try again.", "is-error");
        return;
      }
      setNote(AUTH_MESSAGE, "is-info");
    }, 420);
  });

  form.addEventListener("input", function (event) {
    var field = event.target.closest(".form-field");
    if (field && field.classList.contains("is-invalid")) setFieldError(field, "");
    if (noteEl && noteEl.classList.contains("is-error")) setNote("", "");
    syncFilled();
  });

  form.addEventListener("click", function (event) {
    var toggle = event.target.closest("[data-password-toggle]");
    if (toggle) {
      event.preventDefault();
      togglePassword(toggle);
    }
  });

  document.addEventListener("click", function (event) {
    var forgot = event.target.closest("[data-admin-forgot]");
    if (forgot) {
      event.preventDefault();
      lastFocus = forgot;
      setDialog(true);
      return;
    }
    if (event.target.closest("[data-admin-forgot-close]")) {
      event.preventDefault();
      setDialog(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && dialog && !dialog.hidden) {
      setDialog(false);
    }
  });

  dialogClose.forEach(function (el) {
    el.addEventListener("click", function () {
      setDialog(false);
    });
  });

  syncFilled();
})();
