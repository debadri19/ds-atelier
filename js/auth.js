(function (global) {
  var SESSION_KEY = "ds-atelier-demo-session";
  var bound = false;

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function mobileDigits(value) {
    var digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    return digits;
  }

  function isMobile(value) {
    return /^[6-9]\d{9}$/.test(mobileDigits(value));
  }

  function looksLikeEmail(value) {
    return String(value || "").indexOf("@") !== -1;
  }

  function readSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || (!data.email && !data.mobile)) return null;
      return { email: String(data.email || ""), name: String(data.name || ""), mobile: String(data.mobile || "") };
    } catch (e) {
      return null;
    }
  }

  function writeSession(data, remember) {
    var payload = JSON.stringify({
      email: String(data.email || "").trim(),
      name: String(data.name || "").trim(),
      mobile: String(data.mobile || "").trim()
    });
    try {
      if (remember === false) {
        sessionStorage.setItem(SESSION_KEY, payload);
        localStorage.removeItem(SESSION_KEY);
      } else {
        localStorage.setItem(SESSION_KEY, payload);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function setFieldError(field, message) {
    if (!field) return;
    var invalid = !!message;
    field.classList.toggle("is-invalid", invalid);
    var input = field.querySelector(".form-input");
    var err = field.querySelector(".form-error");
    if (input) {
      input.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (err && err.id) input.setAttribute("aria-describedby", err.id);
    }
    if (err) err.textContent = message || "";
  }

  function firstInvalidField(form) {
    return qs(".form-field.is-invalid .form-input", form);
  }

  function setNote(el, message, type) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("is-error", "is-success");
    if (type) el.classList.add(type);
  }

  function live() {
    return Boolean(qs("[data-auth-login], [data-auth-register], [data-auth-forgot], [data-auth-reset]"));
  }

  function busy(el) {
    if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(el);
  }

  function nameFromEmail(email) {
    var local = String(email || "").split("@")[0] || "";
    local = local.replace(/[._-]+/g, " ").trim();
    if (!local) return "there";
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  function showSignedIn(session) {
    var wrap = qs("[data-auth-form-wrap]");
    var signed = qs("[data-auth-signed-in]");
    if (!wrap || !signed || !session) return;
    wrap.hidden = true;
    signed.hidden = false;
    var emailEl = qs("[data-session-email]", signed);
    var nameEl = qs("[data-session-name]", signed);
    if (emailEl) emailEl.textContent = session.email || session.mobile || "";
    if (nameEl) nameEl.textContent = session.name || "there";
  }

  function onClick(event) {
    if (!live()) return;
    var toggle = event.target.closest("[data-password-toggle]");
    if (toggle) {
      var field = toggle.closest(".form-field");
      var input = field && field.querySelector(".form-input");
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.setAttribute("aria-pressed", show ? "true" : "false");
      toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
      var icon = toggle.querySelector("i");
      if (icon) icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
      return;
    }

    if (event.target.closest("[data-auth-signout]")) {
      event.preventDefault();
      clearSession();
      window.location.href = "login.html";
    }
  }

  function bindMobileInputs() {
    qsa("input[name='mobile']").forEach(function (input) {
      if (input.getAttribute("data-bound") === "true") return;
      input.setAttribute("data-bound", "true");
      input.addEventListener("input", function () {
        var cleaned = String(input.value || "").replace(/[^\d+\s-]/g, "");
        if (cleaned !== input.value) input.value = cleaned;
      });
    });
  }

  function bindLogin() {
    var loginForm = qs("[data-auth-login]");
    if (!loginForm || loginForm.getAttribute("data-bound") === "true") {
      if (loginForm && readSession()) showSignedIn(readSession());
      return;
    }
    loginForm.setAttribute("data-bound", "true");
    var session = readSession();
    if (session) showSignedIn(session);

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      qsa(".form-field", loginForm).forEach(function (field) {
        setFieldError(field, "");
      });
      var note = qs("[data-auth-note]", loginForm);
      setNote(note, "");

      var idField = qs("[data-field='identifier']", loginForm);
      var passwordField = qs("[data-field='password']", loginForm);
      var identifier = (qs("#login-identifier", loginForm) || {}).value || "";
      var password = (qs("#login-password", loginForm) || {}).value || "";
      var remember = !!(qs("#login-remember", loginForm) && qs("#login-remember", loginForm).checked);
      var valid = true;
      var asEmail = looksLikeEmail(identifier);
      var asMobile = isMobile(identifier);

      if (!String(identifier).trim()) {
        setFieldError(idField, "Enter your email or mobile number.");
        valid = false;
      } else if (asEmail) {
        if (!isEmail(identifier)) {
          setFieldError(idField, "Enter a valid email address.");
          valid = false;
        }
      } else if (!asMobile) {
        setFieldError(idField, "Enter a valid email or 10-digit mobile number.");
        valid = false;
      }

      if (!password) {
        setFieldError(passwordField, "Enter your password.");
        valid = false;
      } else if (password.length < 8) {
        setFieldError(passwordField, "Password must be at least 8 characters.");
        valid = false;
      }

      if (!valid) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = firstInvalidField(loginForm);
        if (focusEl) focusEl.focus();
        return;
      }

      busy(loginForm.querySelector('button[type="submit"]'));
      writeSession({
        email: asEmail ? identifier.trim() : "",
        name: asEmail ? nameFromEmail(identifier) : "there",
        mobile: asMobile ? mobileDigits(identifier) : ""
      }, remember);
      showSignedIn(readSession());
    });
  }

  function bindRegister() {
    var registerForm = qs("[data-auth-register]");
    if (!registerForm || registerForm.getAttribute("data-bound") === "true") {
      if (registerForm && readSession()) showSignedIn(readSession());
      return;
    }
    registerForm.setAttribute("data-bound", "true");
    var existing = readSession();
    if (existing) showSignedIn(existing);

    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      qsa(".form-field", registerForm).forEach(function (field) {
        setFieldError(field, "");
      });
      var termsWrap = qs("[data-field='terms']", registerForm);
      var termsError = qs(".form-error", termsWrap);
      if (termsError) termsError.textContent = "";
      var note = qs("[data-auth-note]", registerForm);
      setNote(note, "");

      var nameField = qs("[data-field='name']", registerForm);
      var emailField = qs("[data-field='email']", registerForm);
      var mobileField = qs("[data-field='mobile']", registerForm);
      var passwordField = qs("[data-field='password']", registerForm);
      var confirmField = qs("[data-field='confirm']", registerForm);
      var name = (qs("#register-name", registerForm) || {}).value || "";
      var email = (qs("#register-email", registerForm) || {}).value || "";
      var mobile = (qs("#register-mobile", registerForm) || {}).value || "";
      var password = (qs("#register-password", registerForm) || {}).value || "";
      var confirm = (qs("#register-confirm", registerForm) || {}).value || "";
      var terms = qs("#register-terms", registerForm);
      var valid = true;

      if (!String(name).trim() || String(name).trim().length < 2) {
        setFieldError(nameField, "Enter your full name.");
        valid = false;
      }
      if (!String(email).trim()) {
        setFieldError(emailField, "Enter your email.");
        valid = false;
      } else if (!isEmail(email)) {
        setFieldError(emailField, "Enter a valid email address.");
        valid = false;
      }
      if (!String(mobile).trim()) {
        setFieldError(mobileField, "Enter your mobile number.");
        valid = false;
      } else if (!isMobile(mobile)) {
        setFieldError(mobileField, "Enter a valid 10-digit mobile number.");
        valid = false;
      }
      if (!password) {
        setFieldError(passwordField, "Create a password.");
        valid = false;
      } else if (password.length < 8) {
        setFieldError(passwordField, "Password must be at least 8 characters.");
        valid = false;
      }
      if (!confirm) {
        setFieldError(confirmField, "Confirm your password.");
        valid = false;
      } else if (confirm !== password) {
        setFieldError(confirmField, "Passwords do not match.");
        valid = false;
      }
      if (terms && !terms.checked) {
        if (termsError) termsError.textContent = "Please agree to the terms to continue.";
        valid = false;
      }

      if (!valid) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = firstInvalidField(registerForm);
        if (focusEl) focusEl.focus();
        else if (terms && !terms.checked) terms.focus();
        return;
      }

      busy(registerForm.querySelector('button[type="submit"]'));
      writeSession({ email: email.trim(), name: String(name).trim(), mobile: mobileDigits(mobile) }, true);
      showSignedIn(readSession());
    });
  }

  function bindForgot() {
    var forgotForm = qs("[data-auth-forgot]");
    if (!forgotForm || forgotForm.getAttribute("data-bound") === "true") return;
    forgotForm.setAttribute("data-bound", "true");
    forgotForm.addEventListener("submit", function (event) {
      event.preventDefault();
      qsa(".form-field", forgotForm).forEach(function (field) {
        setFieldError(field, "");
      });
      var note = qs("[data-auth-note]", forgotForm);
      setNote(note, "");
      var emailField = qs("[data-field='email']", forgotForm);
      var email = (qs("#forgot-email", forgotForm) || {}).value || "";
      if (!String(email).trim()) {
        setFieldError(emailField, "Enter your email.");
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var emptyEl = firstInvalidField(forgotForm);
        if (emptyEl) emptyEl.focus();
        return;
      }
      if (!isEmail(email)) {
        setFieldError(emailField, "Enter a valid email address.");
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var invalidEl = firstInvalidField(forgotForm);
        if (invalidEl) invalidEl.focus();
        return;
      }
      busy(forgotForm.querySelector('button[type="submit"]'));
      var wrap = qs("[data-auth-form-wrap]");
      var done = qs("[data-auth-forgot-done]");
      if (wrap) wrap.hidden = true;
      if (done) {
        done.hidden = false;
        var sent = qs("[data-forgot-email]", done);
        if (sent) sent.textContent = email.trim();
      }
    });
  }

  function bindReset() {
    var resetForm = qs("[data-auth-reset]");
    if (!resetForm || resetForm.getAttribute("data-bound") === "true") return;
    resetForm.setAttribute("data-bound", "true");
    resetForm.addEventListener("submit", function (event) {
      event.preventDefault();
      qsa(".form-field", resetForm).forEach(function (field) {
        setFieldError(field, "");
      });
      var note = qs("[data-auth-note]", resetForm);
      setNote(note, "");
      var passwordField = qs("[data-field='password']", resetForm);
      var confirmField = qs("[data-field='confirm']", resetForm);
      var password = (qs("#reset-password", resetForm) || {}).value || "";
      var confirm = (qs("#reset-confirm", resetForm) || {}).value || "";
      var valid = true;
      if (!password) {
        setFieldError(passwordField, "Enter a new password.");
        valid = false;
      } else if (password.length < 8) {
        setFieldError(passwordField, "Password must be at least 8 characters.");
        valid = false;
      }
      if (!confirm) {
        setFieldError(confirmField, "Confirm your new password.");
        valid = false;
      } else if (confirm !== password) {
        setFieldError(confirmField, "Passwords do not match.");
        valid = false;
      }
      if (!valid) {
        setNote(note, "Check the highlighted fields and try again.", "is-error");
        var focusEl = firstInvalidField(resetForm);
        if (focusEl) focusEl.focus();
        return;
      }
      busy(resetForm.querySelector('button[type="submit"]'));
      var wrap = qs("[data-auth-form-wrap]");
      var done = qs("[data-auth-reset-done]");
      if (wrap) wrap.hidden = true;
      if (done) done.hidden = false;
    });
  }

  function init() {
    if (!live()) return;
    bindMobileInputs();
    bindLogin();
    bindRegister();
    bindForgot();
    bindReset();
    if (!bound) {
      document.addEventListener("click", onClick);
      bound = true;
    }
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.auth = { init: init };
  init();
})(window);
