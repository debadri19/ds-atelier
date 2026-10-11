(function () {
  var AUTH_MESSAGE = "Dashboard authentication is not configured yet. This page is currently a UI prototype.";
  var FORGOT_MESSAGE = "Dashboard password recovery is not configured yet. This page is currently a UI prototype.";

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

  function setNote(noteEl, message, type) {
    if (!noteEl) return;
    noteEl.textContent = message || "";
    noteEl.classList.remove("is-error", "is-info");
    if (type) noteEl.classList.add(type);
  }

  function syncFilled(form) {
    form.querySelectorAll(".form-field").forEach(function (field) {
      var control = field.querySelector(".form-input");
      field.classList.toggle("is-filled", Boolean(control && String(control.value || "").trim()));
    });
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle("is-busy", busy);
    btn.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function firstInvalid(form) {
    return form.querySelector(".form-field.is-invalid .form-input");
  }

  function bindLogin(form) {
    var identifierField = form.querySelector('[data-field="identifier"]');
    var passwordField = form.querySelector('[data-field="password"]');
    var identifierInput = form.querySelector("#admin-login-identifier");
    var passwordInput = form.querySelector("#admin-login-password");
    var submitBtn = form.querySelector("[data-admin-login-submit]");
    var noteEl = form.querySelector("[data-admin-login-note]");

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

    function togglePassword(toggle) {
      if (!passwordInput) return;
      var show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", show ? "true" : "false");
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
      var icon = toggle.querySelector("i");
      if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setNote(noteEl, "", "");
      setBusy(submitBtn, true);
      window.setTimeout(function () {
        var ok = validate();
        setBusy(submitBtn, false);
        if (!ok) {
          var invalid = firstInvalid(form);
          if (invalid && invalid.focus) invalid.focus();
          setNote(noteEl, "Check the highlighted fields and try again.", "is-error");
          return;
        }
        setNote(noteEl, AUTH_MESSAGE, "is-info");
      }, 420);
    });

    form.addEventListener("input", function (event) {
      var field = event.target.closest(".form-field");
      if (field && field.classList.contains("is-invalid")) setFieldError(field, "");
      if (noteEl && noteEl.classList.contains("is-error")) setNote(noteEl, "", "");
      syncFilled(form);
    });

    form.addEventListener("click", function (event) {
      var toggle = event.target.closest("[data-password-toggle]");
      if (toggle) {
        event.preventDefault();
        togglePassword(toggle);
      }
    });

    syncFilled(form);
  }

  function bindForgot(form) {
    var emailField = form.querySelector('[data-field="email"]');
    var emailInput = form.querySelector("#admin-forgot-email");
    var submitBtn = form.querySelector("[data-admin-forgot-submit]");
    var noteEl = form.querySelector("[data-admin-forgot-note]");

    function validate() {
      var email = emailInput ? String(emailInput.value || "").trim() : "";
      if (!email) {
        setFieldError(emailField, "Enter your email address.");
        return false;
      }
      if (!isEmail(email)) {
        setFieldError(emailField, "Enter a valid email address.");
        return false;
      }
      setFieldError(emailField, "");
      return true;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setNote(noteEl, "", "");
      setBusy(submitBtn, true);
      window.setTimeout(function () {
        var ok = validate();
        setBusy(submitBtn, false);
        if (!ok) {
          var invalid = firstInvalid(form);
          if (invalid && invalid.focus) invalid.focus();
          setNote(noteEl, "Check the highlighted fields and try again.", "is-error");
          return;
        }
        setNote(noteEl, FORGOT_MESSAGE, "is-info");
      }, 420);
    });

    form.addEventListener("input", function (event) {
      var field = event.target.closest(".form-field");
      if (field && field.classList.contains("is-invalid")) setFieldError(field, "");
      if (noteEl && noteEl.classList.contains("is-error")) setNote(noteEl, "", "");
      syncFilled(form);
    });

    syncFilled(form);
  }

  var loginForm = document.querySelector("[data-admin-login]");
  if (loginForm) bindLogin(loginForm);

  var forgotForm = document.querySelector("[data-admin-forgot-form]");
  if (forgotForm) bindForgot(forgotForm);
})();
