(function () {
  var KEY = "ds-atelier-theme";
  var root = document.documentElement;

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  }

  function current() {
    return root.getAttribute("data-theme") || "light";
  }

  var saved = localStorage.getItem(KEY);
  apply(saved || systemTheme());

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-theme-toggle]");
    if (!btn) return;
    var next = current() === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(KEY, next);
  });
})();
