(function () {
  var AUTH_MESSAGE = "Dashboard authentication is not configured yet. This page is currently a UI prototype.";
  var FORGOT_MESSAGE = "Dashboard password recovery is not configured yet. This page is currently a UI prototype.";
  var RESET_MESSAGE = "Dashboard password reset is not configured yet. This page is currently a UI prototype.";
  var MIN_PASSWORD = 8;
  var STATES = {
    login: {
      title: "Login",
      copy: "Sign in to access your studio dashboard.",
      documentTitle: "Dashboard Login - DS ATELIER"
    },
    "forgot-password": {
      title: "Forgot Password",
      copy: "Enter your email address to continue with password reset.",
      documentTitle: "Forgot Password - DS ATELIER Dashboard"
    },
    "reset-password": {
      title: "Reset Password",
      copy: "Choose a new password for your Dashboard account.",
      documentTitle: "Reset Password - DS ATELIER Dashboard"
    }
  };

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

  function resetFormState(form) {
    if (!form) return;
    form.querySelectorAll(".form-field").forEach(function (field) {
      setFieldError(field, "");
    });
    form.querySelectorAll(".admin-login-note").forEach(function (noteEl) {
      setNote(noteEl, "", "");
    });
    form.querySelectorAll("[data-password-toggle]").forEach(function (toggle) {
      var field = toggle.closest(".form-field");
      var input = field && field.querySelector(".form-input");
      if (input) input.type = "password";
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Show password");
      var icon = toggle.querySelector("i");
      if (icon) icon.className = "fa-regular fa-eye";
    });
    var submitBtn = form.querySelector('button[type="submit"]');
    setBusy(submitBtn, false);
    syncFilled(form);
  }

  function togglePassword(toggle) {
    var field = toggle.closest(".form-field");
    var input = field && field.querySelector(".form-input");
    if (!input) return;
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.setAttribute("aria-pressed", show ? "true" : "false");
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    var icon = toggle.querySelector("i");
    if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
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

  function bindReset(form) {
    var passwordField = form.querySelector('[data-field="password"]');
    var confirmField = form.querySelector('[data-field="confirm"]');
    var passwordInput = form.querySelector("#admin-reset-password");
    var confirmInput = form.querySelector("#admin-reset-confirm");
    var submitBtn = form.querySelector("[data-admin-reset-submit]");
    var noteEl = form.querySelector("[data-admin-reset-note]");

    function validate() {
      var password = passwordInput ? String(passwordInput.value || "") : "";
      var confirm = confirmInput ? String(confirmInput.value || "") : "";
      var ok = true;

      if (!password) {
        setFieldError(passwordField, "Enter a new password.");
        ok = false;
      } else if (password.length < MIN_PASSWORD) {
        setFieldError(passwordField, "Password must be at least " + MIN_PASSWORD + " characters.");
        ok = false;
      } else {
        setFieldError(passwordField, "");
      }

      if (!confirm) {
        setFieldError(confirmField, "Confirm your new password.");
        ok = false;
      } else if (confirm !== password) {
        setFieldError(confirmField, "Passwords do not match.");
        ok = false;
      } else {
        setFieldError(confirmField, "");
      }

      return ok;
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
        setNote(noteEl, RESET_MESSAGE, "is-info");
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

  function normalizeHash(hash) {
    var value = String(hash || "").replace(/^#/, "").trim().toLowerCase();
    if (STATES[value]) return value;
    return "login";
  }

  function setInert(el, inactive) {
    if (!el) return;
    el.hidden = inactive;
    el.setAttribute("aria-hidden", inactive ? "true" : "false");
    if ("inert" in el) el.inert = inactive;
  }

  function applyState(state, options) {
    options = options || {};
    var config = STATES[state] || STATES.login;
    var card = document.getElementById("admin-login-main");
    var titleEl = document.getElementById("admin-auth-title");
    var copyEl = document.getElementById("admin-auth-copy");
    var activeForm = null;

    if (card) card.setAttribute("data-auth-state", state);
    if (titleEl) titleEl.textContent = config.title;
    if (copyEl) copyEl.textContent = config.copy;
    document.title = config.documentTitle;

    document.querySelectorAll("[data-admin-auth-form]").forEach(function (form) {
      var active = form.getAttribute("data-admin-auth-form") === state;
      setInert(form, !active);
      if (!active) resetFormState(form);
      else activeForm = form;
    });

    document.querySelectorAll("[data-admin-auth-switch]").forEach(function (el) {
      setInert(el, el.getAttribute("data-admin-auth-switch") !== state);
    });

    if (options.focus && activeForm) {
      var first = activeForm.querySelector(".form-input");
      if (first && first.focus) window.setTimeout(function () { first.focus(); }, 0);
    }
  }

  function syncFromLocation(options) {
    var raw = String(window.location.hash || "").replace(/^#/, "");
    var state = normalizeHash(raw);
    if (raw !== state) {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", "#" + state);
      } else {
        window.location.hash = state;
      }
    }
    applyState(state, options);
  }

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest("[data-password-toggle]");
    if (toggle) {
      event.preventDefault();
      togglePassword(toggle);
    }
  });

  var loginForm = document.querySelector("[data-admin-login]");
  if (loginForm) bindLogin(loginForm);

  var forgotForm = document.querySelector("[data-admin-forgot-form]");
  if (forgotForm) bindForgot(forgotForm);

  var resetForm = document.querySelector("[data-admin-reset-form]");
  if (resetForm) bindReset(resetForm);

  window.addEventListener("hashchange", function () {
    syncFromLocation({ focus: true });
  });

  syncFromLocation();
})();
