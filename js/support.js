(function (global) {
  var bound = false;

  function qs(sel) {
    return document.querySelector(sel);
  }

  function live() {
    return Boolean(qs("[data-support-form], [data-support-search]"));
  }

  function busy(el) {
    if (global.DSAtelier && global.DSAtelier.ui && global.DSAtelier.ui.busy) global.DSAtelier.ui.busy(el);
  }

  function filterFaqs(query) {
    var note = qs("[data-search-note]");
    var faqs = document.querySelectorAll("[data-faq-item]");
    var q = (query || "").trim().toLowerCase();
    var shown = 0;
    faqs.forEach(function (item) {
      var text = (item.getAttribute("data-faq-text") || item.textContent || "").toLowerCase();
      var match = !q || text.indexOf(q) !== -1;
      item.hidden = !match;
      if (match) shown += 1;
    });
    if (note) {
      if (!q) note.textContent = "";
      else if (!shown) note.textContent = "No matching help topics. Try another phrase or use the contact form.";
      else note.textContent = shown + " matching result" + (shown === 1 ? "" : "s") + ".";
    }
  }

  function onSearchInput(event) {
    if (!live()) return;
    filterFaqs(event.target.value);
  }

  function onClick(event) {
    if (!live()) return;
    var trigger = event.target.closest("[data-faq-trigger]");
    if (!trigger) return;
    var item = trigger.closest("[data-faq-item]");
    if (!item) return;
    var open = item.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    var panel = item.querySelector("[data-faq-panel]");
    if (panel) panel.hidden = !open;
  }

  function onFormSubmit(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var formNote = form.querySelector("[data-form-note]");
    busy(form.querySelector('button[type="submit"]'));
    if (formNote) {
      formNote.textContent = "Message captured on this page only. Support inbox is not connected yet.";
      formNote.classList.add("is-success");
    }
    form.reset();
  }

  function bindLocal() {
    var search = qs("[data-support-search]");
    if (search && search.getAttribute("data-bound") !== "true") {
      search.setAttribute("data-bound", "true");
      search.addEventListener("input", onSearchInput);
    }
    var form = qs("[data-support-form]");
    if (form && form.getAttribute("data-bound") !== "true") {
      form.setAttribute("data-bound", "true");
      form.addEventListener("submit", onFormSubmit);
    }
  }

  function init() {
    if (!live()) return;
    bindLocal();
    if (!bound) {
      document.addEventListener("click", onClick);
      bound = true;
    }
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.support = { init: init };
  init();
})(window);
