(function (global) {
  var bound = false;
  var commerce = null;
  var grid = null;
  var empty = null;
  var rec = null;

  function live() {
    return Boolean(grid && document.body.contains(grid));
  }

  function render() {
    if (!live() || !commerce) return;
    var items = commerce.wishlistItems();
    grid.innerHTML = items.map(function (item) {
      return commerce.card(item, { variant: "wishlist", heart: true, category: true });
    }).join("");
    grid.hidden = !items.length;
    if (empty) empty.hidden = items.length > 0;
    if (rec) {
      rec.innerHTML = commerce.recommended(4).map(function (item) {
        return commerce.card(item, { variant: "recommend" });
      }).join("");
    }
  }

  function init() {
    commerce = global.DSAtelier && global.DSAtelier.commerce;
    grid = document.querySelector("[data-wishlist-grid]");
    empty = document.querySelector("[data-wishlist-empty]");
    rec = document.querySelector("[data-recommended]");
    if (!commerce || !grid) return;
    if (!bound) {
      document.addEventListener("ds-atelier-commerce", render);
      bound = true;
    }
    render();
  }

  global.DSAtelier = global.DSAtelier || {};
  global.DSAtelier.pages = global.DSAtelier.pages || {};
  global.DSAtelier.pages.wishlist = { init: init };
  init();
})(window);
