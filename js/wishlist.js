(function () {
  var commerce = window.DSAtelier && window.DSAtelier.commerce;
  if (!commerce) return;

  var grid = document.querySelector("[data-wishlist-grid]");
  var empty = document.querySelector("[data-wishlist-empty]");
  var rec = document.querySelector("[data-recommended]");

  function render() {
    var items = commerce.wishlistItems();
    if (grid) {
      grid.innerHTML = items.map(function (item) {
        return commerce.card(item, { variant: "wishlist", heart: true, category: true });
      }).join("");
      grid.hidden = !items.length;
    }
    if (empty) empty.hidden = items.length > 0;
    if (rec) {
      rec.innerHTML = commerce.recommended(4).map(function (item) {
        return commerce.card(item, { variant: "recommend" });
      }).join("");
    }
  }

  document.addEventListener("ds-atelier-commerce", render);
  render();
})();
