(function (global) {
  var SESSION_KEY = "ds-atelier-demo-session";
  var bound = false;
  var csrfToken = "";
  var serverCustomer = null;
  var sessionReady = false;
  var API = {
    csrf: "backend/public/customer/csrf.php",
    session: "backend/public/customer/session.php",
    register: "backend/public/customer/register.php",
    login: "backend/public/customer/login.php",
    logout: "backend/public/customer/logout.php",
    forgot: "backend/public/customer/forgot.php",
    reset: "backend/public/customer/reset.php"
  };

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
    serverCustomer = null;
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function resetTokenFromLocation() {
    try {
      return new URLSearchParams(window.location.search).get("token") || "";
    } catch (e) {
      return "";
    }
  }

  function ensureCsrf() {
    if (csrfToken) return Promise.resolve(csrfToken);
    return fetch(API.csrf, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      });
    }).then(function (data) {
      if (data && data.csrf) csrfToken = data.csrf;
      return csrfToken;
    });
  }

  function postAuth(url, payload) {
    payload = payload || {};
    return ensureCsrf().then(function () {
      payload._csrf = csrfToken;
      return fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken
        },
        body: JSON.stringify(payload)
      });
    }).then(function (response) {
      return response.json().catch(function () {
        return { ok: false, error: "Something went wrong. Please try again later." };
      }).then(function (data) {
        if (data && data.csrf) csrfToken = data.csrf;
        data.status = response.status;
        return data;
      });
    });
  }

  function refreshServerSession() {
    return fetch(API.session, {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    }).then(function (response) {
      return response.json().catch(function () {
        return { ok: false };
      });
    }).then(function (data) {
      sessionReady = true;
      if (data && data.csrf) csrfToken = data.csrf;
      if (data && data.authenticated && data.customer) {
        serverCustomer = data.customer;
        writeSession(data.customer, true);
        return data.customer;
      }
      serverCustomer = null;
      clearSession();
      sessionReady = true;
      return null;
    }).catch(function () {
      sessionReady = true;
      serverCustomer = null;
      return null;
    });
  }

  function applyServerFieldErrors(form, fields) {
    if (!fields) return;
    Object.keys(fields).forEach(function (name) {
      setFieldError(qs("[data-field='" + name + "']", form), fields[name]);
      if (name === "terms") {
        var termsError = qs("[data-field='terms'] .form-error", form);
        if (termsError) termsError.textContent = fields[name];
      }
    });
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

  var AUTH_STATES = {
    login: {
      title: "Bienvenue!",
      subtitle: "Sign in to your account",
      documentTitle: "Sign In - DS ATELIER",
      crumb: "Sign In",
      kicker: false
    },
    register: {
      title: "Create Account",
      subtitle: "Create your account",
      documentTitle: "Create Account - DS ATELIER",
      crumb: "Create Account",
      kicker: false
    },
    "forgot-password": {
      title: "Forgot Password",
      subtitle: "Enter your email address to continue with password reset.",
      documentTitle: "Forgot Password - DS ATELIER",
      crumb: "Forgot Password",
      kicker: false
    },
    "reset-password": {
      title: "Reset Password",
      subtitle: "Choose a new password using the reset link from your email.",
      documentTitle: "Reset Password - DS ATELIER",
      crumb: "Reset Password",
      kicker: true
    }
  };

  function hasAuthStates() {
    return Boolean(qs("[data-auth-state]"));
  }

  function normalizeAuthHash(hash) {
    var value = String(hash || "").replace(/^#/, "").trim().toLowerCase();
    if (AUTH_STATES[value]) return value;
    return "login";
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
    if ("inert" in el) el.inert = hidden;
  }

  function resetFormUi(form) {
    if (!form) return;
    qsa(".form-field", form).forEach(function (field) {
      setFieldError(field, "");
    });
    setNote(qs("[data-auth-note]", form), "");
    qsa(".form-input[type='password'], .form-input[autocomplete='current-password'], .form-input[autocomplete='new-password']", form).forEach(function (input) {
      input.value = "";
      input.type = "password";
    });
    qsa("[data-password-toggle]", form).forEach(function (toggle) {
      toggle.setAttribute("aria-pressed", "false");
      toggle.setAttribute("aria-label", "Show password");
      var icon = toggle.querySelector("i");
      if (icon) icon.className = "fa-regular fa-eye";
    });
    var termsError = qs("[data-field='terms'] .form-error", form);
    if (termsError) termsError.textContent = "";
  }

  function applyAuthState(state) {
    var config = AUTH_STATES[state] || AUTH_STATES.login;
    var card = qs("[data-auth-state]");
    var title = qs("#auth-title");
    var subtitle = qs("#auth-subtitle");
    var kicker = qs("[data-auth-kicker]");
    var wrap = qs("[data-auth-form-wrap]");
    var signed = qs("[data-auth-signed-in]");
    var crumbLogin = qs("[data-auth-crumb-login]");
    var crumbLoginLink = qs("[data-auth-crumb-login-link]");
    var crumbRest = qs("[data-auth-crumb-rest]");
    var crumbCurrent = qs("[data-auth-crumb-current]");
    var isLogin = state === "login";

    if (card) card.setAttribute("data-auth-state", state);
    if (title) title.textContent = config.title;
    if (subtitle) subtitle.textContent = config.subtitle;
    setHidden(kicker, !config.kicker);
    document.title = config.documentTitle;

    setHidden(crumbLogin, !isLogin);
    setHidden(crumbLoginLink, isLogin);
    setHidden(crumbRest, isLogin);
    if (crumbCurrent) crumbCurrent.textContent = config.crumb;

    qsa("[data-auth-panel]").forEach(function (form) {
      var active = form.getAttribute("data-auth-panel") === state;
      setHidden(form, !active);
      if (!active) resetFormUi(form);
    });
    qsa("[data-auth-switch]").forEach(function (el) {
      setHidden(el, el.getAttribute("data-auth-switch") !== state);
    });

    setHidden(qs("[data-auth-forgot-done]"), true);
    setHidden(qs("[data-auth-reset-done]"), true);
    setHidden(qs("[data-auth-register-done]"), true);

    var session = sessionReady ? serverCustomer : null;
    if (isLogin && session && signed) {
      showSignedIn(session);
      return;
    }
    if (state === "register" && session) {
      showRegisterDone(session);
      return;
    }
    if (wrap) {
      wrap.hidden = false;
      wrap.removeAttribute("aria-hidden");
      if ("inert" in wrap) wrap.inert = false;
    }
    setHidden(signed, true);
  }

  function syncAuthFromLocation() {
    if (!hasAuthStates()) return;
    var raw = String(window.location.hash || "").replace(/^#/, "");
    var state = normalizeAuthHash(raw);
    if (raw !== state) {
      var next = window.location.pathname + window.location.search + "#" + state;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", next);
      } else {
        window.location.hash = state;
      }
    }
    applyAuthState(state);
  }

  function setBusy(el, on) {
    if (!el) return;
    el.classList.toggle("is-busy", !!on);
    if (on) el.setAttribute("aria-busy", "true");
    else el.removeAttribute("aria-busy");
    el.disabled = !!on;
  }

  function fillSessionCopy(root, session) {
    if (!root || !session) return;
    var emailEl = qs("[data-session-email]", root);
    var nameEl = qs("[data-session-name]", root);
    if (emailEl) emailEl.textContent = session.email || session.mobile || "";
    if (nameEl) nameEl.textContent = session.name || "there";
  }

  function hideAuthViews() {
    var wrap = qs("[data-auth-form-wrap]");
    if (wrap) wrap.hidden = true;
    setHidden(qs("[data-auth-signed-in]"), true);
    setHidden(qs("[data-auth-register-done]"), true);
    setHidden(qs("[data-auth-forgot-done]"), true);
    setHidden(qs("[data-auth-reset-done]"), true);
  }

  function showSignedIn(session) {
    var wrap = qs("[data-auth-form-wrap]");
    var signed = qs("[data-auth-signed-in]");
    if (!wrap || !signed || !session) return;
    hideAuthViews();
    wrap.hidden = true;
    signed.hidden = false;
    signed.removeAttribute("aria-hidden");
    fillSessionCopy(signed, session);
  }

  function showRegisterDone(session) {
    var wrap = qs("[data-auth-form-wrap]");
    var done = qs("[data-auth-register-done]");
    if (!session) return;
    if (!done) {
      showSignedIn(session);
      return;
    }
    hideAuthViews();
    if (wrap) wrap.hidden = true;
    done.hidden = false;
    done.removeAttribute("aria-hidden");
    fillSessionCopy(done, session);
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
      var signoutBtn = event.target.closest("[data-auth-signout]");
      setBusy(signoutBtn, true);
      postAuth(API.logout, {}).catch(function () {
        return { ok: true };
      }).then(function () {
        clearSession();
        window.location.href = "auth.html#login";
      });
      return;
    }

    if (!hasAuthStates()) return;
    var authLink = event.target.closest('a[href^="#"]');
    if (!authLink) return;
    applyAuthState(normalizeAuthHash(authLink.getAttribute("href")));
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
      return;
    }
    loginForm.setAttribute("data-bound", "true");

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

      var submitBtn = loginForm.querySelector('button[type="submit"]');
      setBusy(submitBtn, true);
      postAuth(API.login, {
        identifier: String(identifier).trim(),
        password: password,
        remember: remember
      }).then(function (data) {
        if (data && data.ok && data.customer) {
          serverCustomer = data.customer;
          writeSession(data.customer, remember);
          showSignedIn(data.customer);
          return;
        }
        applyServerFieldErrors(loginForm, data && data.fields);
        setNote(note, (data && data.error) || "Unable to sign in. Please try again later.", "is-error");
        var next = firstInvalidField(loginForm);
        if (next) next.focus();
      }).catch(function () {
        setNote(note, "Something went wrong. Please try again later.", "is-error");
      }).then(function () {
        setBusy(submitBtn, false);
      });
    });
  }

  function bindRegister() {
    var registerForm = qs("[data-auth-register]");
    if (!registerForm || registerForm.getAttribute("data-bound") === "true") return;
    registerForm.setAttribute("data-bound", "true");

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

      var submitBtn = registerForm.querySelector('button[type="submit"]');
      setBusy(submitBtn, true);
      postAuth(API.register, {
        name: String(name).trim(),
        email: String(email).trim(),
        mobile: mobileDigits(mobile),
        password: password,
        confirm: confirm,
        terms: !!(terms && terms.checked)
      }).then(function (data) {
        if (data && data.ok && data.customer) {
          serverCustomer = data.customer;
          writeSession(data.customer, true);
          showRegisterDone(data.customer);
          return;
        }
        applyServerFieldErrors(registerForm, data && data.fields);
        setNote(note, (data && data.error) || "Unable to create the account. Please try again later.", "is-error");
        var next = firstInvalidField(registerForm);
        if (next) next.focus();
        else if (terms && data && data.fields && data.fields.terms) terms.focus();
      }).catch(function () {
        setNote(note, "Something went wrong. Please try again later.", "is-error");
      }).then(function () {
        setBusy(submitBtn, false);
      });
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
      var submitBtn = forgotForm.querySelector('button[type="submit"]');
      setBusy(submitBtn, true);
      postAuth(API.forgot, { email: String(email).trim() }).then(function (data) {
        if (data && data.ok) {
          var wrap = qs("[data-auth-form-wrap]");
          var done = qs("[data-auth-forgot-done]");
          if (wrap) wrap.hidden = true;
          if (done) {
            done.hidden = false;
            var sent = qs("[data-forgot-email]", done);
            if (sent) sent.textContent = email.trim();
          }
          return;
        }
        applyServerFieldErrors(forgotForm, data && data.fields);
        setNote(note, (data && data.error) || "Something went wrong. Please try again later.", "is-error");
        var next = firstInvalidField(forgotForm);
        if (next) next.focus();
      }).catch(function () {
        setNote(note, "Something went wrong. Please try again later.", "is-error");
      }).then(function () {
        setBusy(submitBtn, false);
      });
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
      var token = resetTokenFromLocation();
      if (!token) {
        setNote(note, "This reset link is invalid or has expired.", "is-error");
        return;
      }
      var submitBtn = resetForm.querySelector('button[type="submit"]');
      setBusy(submitBtn, true);
      postAuth(API.reset, {
        token: token,
        password: password,
        confirm: confirm
      }).then(function (data) {
        if (data && data.ok) {
          clearSession();
          var wrap = qs("[data-auth-form-wrap]");
          var done = qs("[data-auth-reset-done]");
          if (wrap) wrap.hidden = true;
          if (done) done.hidden = false;
          return;
        }
        applyServerFieldErrors(resetForm, data && data.fields);
        setNote(note, (data && data.error) || "Unable to update the password. Please try again later.", "is-error");
        var next = firstInvalidField(resetForm);
        if (next) next.focus();
      }).catch(function () {
        setNote(note, "Something went wrong. Please try again later.", "is-error");
      }).then(function () {
        setBusy(submitBtn, false);
      });
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
      window.addEventListener("hashchange", syncAuthFromLocation);
      window.addEventListener("popstate", syncAuthFromLocation);
      bound = true;
    }
    refreshServerSession().then(function () {
      syncAuthFromLocation();
    });
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.auth = { init: init };
  init();
})(window);
