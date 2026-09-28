(function () {
  var search = document.querySelector("[data-support-search]");
  var note = document.querySelector("[data-search-note]");
  var faqs = document.querySelectorAll("[data-faq-item]");
  var form = document.querySelector("[data-support-form]");
  var formNote = document.querySelector("[data-form-note]");

  function filterFaqs(query) {
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

  if (search) {
    search.addEventListener("input", function () {
      filterFaqs(search.value);
    });
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-faq-trigger]");
    if (!trigger) return;
    var item = trigger.closest("[data-faq-item]");
    if (!item) return;
    var open = item.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    var panel = item.querySelector("[data-faq-panel]");
    if (panel) panel.hidden = !open;
  });

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (formNote) formNote.textContent = "Message captured on this page only. Support inbox is not connected yet.";
      form.reset();
    });
  }
})();
