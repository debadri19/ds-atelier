(function (global) {
  var observer = null;

  function setActive(id) {
    document.querySelectorAll("[data-policy-link]").forEach(function (link) {
      var active = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  function closeNav() {
    var nav = document.querySelector("[data-policy-nav]");
    var toggle = document.querySelector("[data-policy-toggle]");
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function init() {
    var nav = document.querySelector("[data-policy-nav]");
    var toggle = document.querySelector("[data-policy-toggle]");
    var links = document.querySelectorAll("[data-policy-link]");
    var sections = document.querySelectorAll("[data-policy-section]");
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (!nav && !sections.length) return;

    if (toggle && nav && toggle.getAttribute("data-bound") !== "true") {
      toggle.setAttribute("data-bound", "true");
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    links.forEach(function (link) {
      if (link.getAttribute("data-bound") === "true") return;
      link.setAttribute("data-bound", "true");
      link.addEventListener("click", closeNav);
    });

    if ("IntersectionObserver" in window && sections.length) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      }, { rootMargin: "-30% 0px -55% 0px", threshold: 0.1 });
      sections.forEach(function (section) { observer.observe(section); });
    }

    if (location.hash) setActive(location.hash.slice(1));
    else if (sections[0]) setActive(sections[0].id);
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.policy = { init: init };
  init();
})(window);
