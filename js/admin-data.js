(function () {
  var STORAGE_KEY = "ds-atelier-admin-demo";
  var CATEGORY_SEED = [
    { id: "anime", name: "Anime", slug: "anime", description: "Bold graphic art for tees and oversized blanks.", image: "assets/images/categories/cat-tee.svg", productCount: 4, displayOrder: 1, status: "active", updated: "2026-03-12" },
    { id: "gaming", name: "Gaming", slug: "gaming", description: "Arcade marks, jerseys and merch drops.", image: "assets/images/categories/cat-jersey.svg", productCount: 3, displayOrder: 2, status: "active", updated: "2026-03-11" },
    { id: "streetwear", name: "Streetwear", slug: "streetwear", description: "Heavy block graphics for oversized cotton.", image: "assets/images/categories/cat-oversize.svg", productCount: 5, displayOrder: 3, status: "active", updated: "2026-03-10" },
    { id: "typography", name: "Typography", slug: "typography", description: "Large-letter layouts for hoodies and polos.", image: "assets/images/categories/cat-hoodie.svg", productCount: 2, displayOrder: 4, status: "active", updated: "2026-03-08" },
    { id: "cyberpunk", name: "Cyberpunk", slug: "cyberpunk", description: "High-contrast grid and signal artwork.", image: "assets/images/categories/cat-sub.svg", productCount: 2, displayOrder: 5, status: "active", updated: "2026-03-07" },
    { id: "minimal", name: "Minimal", slug: "minimal", description: "Quiet studio marks for everyday apparel.", image: "assets/images/categories/cat-polo.svg", productCount: 3, displayOrder: 6, status: "active", updated: "2026-03-06" },
    { id: "studio", name: "Studio", slug: "studio", description: "In-house press graphics and brand runs.", image: "assets/images/hero/print-studio.svg", productCount: 2, displayOrder: 7, status: "active", updated: "2026-03-04" },
    { id: "custom-art", name: "Custom Art", slug: "custom-art", description: "Ink-led artwork for gifts and short runs.", image: "assets/images/categories/cat-gift.svg", productCount: 1, displayOrder: 8, status: "inactive", updated: "2026-02-28" }
  ];
  var PRODUCT_SEED = [
    { id: "anime-graphic-tee", name: "Anime Graphic T-Shirt", slug: "anime-graphic-tee", sku: "DSA-AGT-001", categoryId: "anime", description: "Studio graphic tee cut for everyday wear. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Bold anime graphic on a heavyweight cotton tee.", productType: "T-Shirt", printType: "DTF", regularPrice: 1299, salePrice: 899, status: "active", featured: true, image: "assets/images/products/anime-graphic-tee/mockups/default/black/product-anime.svg", createdAt: "2026-02-18", updatedAt: "2026-03-12" },
    { id: "oversized-graphic-tee", name: "Oversized Graphic Tee", slug: "oversized-graphic-tee", sku: "DSA-OGT-001", categoryId: "streetwear", description: "Relaxed oversized tee cut for layering. Printed in-house after you choose print type, color and artwork.", shortDescription: "Heavyweight oversized blank, printed in-house.", productType: "Oversized T-Shirt", printType: "DTF", regularPrice: 1199, salePrice: 799, status: "active", featured: true, image: "assets/images/products/oversized-graphic-tee/mockups/default/cream/product-oversized.svg", createdAt: "2026-02-20", updatedAt: "2026-03-12" },
    { id: "motivational-hoodie", name: "Motivational Hoodie", slug: "motivational-hoodie", sku: "DSA-MHD-001", categoryId: "typography", description: "Relaxed hoodie blank for studio typography and graphic prints. Printed in-house after configuration.", shortDescription: "Heavyweight hoodie for large typography prints.", productType: "Hoodie", printType: "DTF", regularPrice: 1999, salePrice: 1499, status: "draft", featured: false, image: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", createdAt: "2026-02-22", updatedAt: "2026-03-11" },
    { id: "minimal-hoodie", name: "Minimal Hoodie", slug: "minimal-hoodie", sku: "DSA-MNH-001", categoryId: "minimal", description: "Minimal hoodie cut for everyday wear. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Clean hoodie blank for studio prints.", productType: "Hoodie", printType: "DTF", regularPrice: 1999, salePrice: 1499, status: "active", featured: false, image: "assets/images/products/motivational-hoodie/mockups/default/charcoal/product-hoodie.svg", createdAt: "2026-02-22", updatedAt: "2026-03-10" },
    { id: "custom-sports-jersey", name: "Custom Sports Jersey", slug: "custom-sports-jersey", sku: "DSA-CSJ-001", categoryId: "gaming", description: "Sports jersey made to order. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Team jersey blank for names, numbers and crests.", productType: "Jersey", printType: "Sublimation", regularPrice: 1799, salePrice: 1299, status: "active", featured: true, image: "assets/images/products/custom-sports-jersey/mockups/default/red/product-jersey.svg", createdAt: "2026-02-24", updatedAt: "2026-03-10" },
    { id: "polo-tshirt", name: "Polo T-Shirt", slug: "polo-tshirt", sku: "DSA-PLO-001", categoryId: "studio", description: "Studio polo blank for crests and marks. Printed in-house after configuration.", shortDescription: "Cotton polo for logos and small-run branding.", productType: "Polo", printType: "DTF", regularPrice: 1399, salePrice: 999, status: "active", featured: false, image: "assets/images/products/polo-tshirt/mockups/default/navy/product-polo.svg", createdAt: "2026-02-25", updatedAt: "2026-03-09" },
    { id: "sublimation-tshirt", name: "Sublimation T-Shirt", slug: "sublimation-tshirt", sku: "DSA-SUB-001", categoryId: "cyberpunk", description: "Sublimation-ready blank for edge-to-edge colour. Printed in-house after you choose colour and artwork.", shortDescription: "Polyester tee for all-over dye-infused colour.", productType: "T-Shirt", printType: "Sublimation", regularPrice: 1499, salePrice: 999, status: "active", featured: true, image: "assets/images/products/sublimation-tshirt/mockups/default/white/product-sub.svg", createdAt: "2026-02-26", updatedAt: "2026-03-09" },
    { id: "dtf-print", name: "DTF Print", slug: "dtf-print", sku: "DSA-DTF-001", categoryId: "studio", description: "DTF transfer sheet for studio press work. Artwork is reviewed before print.", shortDescription: "Ready-to-press DTF transfer.", productType: "Accessories", printType: "DTF", regularPrice: 499, salePrice: 349, status: "active", featured: false, image: "assets/images/products/dtf-print/mockups/default/white/product-dtf.svg", createdAt: "2026-02-27", updatedAt: "2026-03-08" },
    { id: "custom-tote-bag", name: "Custom Tote Bag", slug: "custom-tote-bag", sku: "DSA-TOT-001", categoryId: "custom-art", description: "Studio tote blank for custom print. Printed in-house after configuration.", shortDescription: "Canvas tote for marks, art and gifting.", productType: "Tote Bag", printType: "DTF", regularPrice: 799, salePrice: 499, status: "active", featured: true, image: "assets/images/products/custom-tote-bag/mockups/default/cream/product-tote.svg", createdAt: "2026-02-28", updatedAt: "2026-03-08" },
    { id: "corporate-tshirt", name: "Corporate T-Shirt", slug: "corporate-tshirt", sku: "DSA-CRP-001", categoryId: "studio", description: "Corporate tee made to order. Printed in-house after you choose print type, colour and artwork.", shortDescription: "Uniform tee for teams and brands.", productType: "T-Shirt", printType: "DTF", regularPrice: 1199, salePrice: 849, status: "active", featured: false, image: "assets/images/products/corporate-tshirt/mockups/default/white/product-corporate.svg", createdAt: "2026-03-01", updatedAt: "2026-03-07" },
    { id: "kids-tshirt", name: "Kids T-Shirt", slug: "kids-tshirt", sku: "DSA-KID-001", categoryId: "anime", description: "Kids tee printed in-house after configuration.", shortDescription: "Kids cotton tee for small-run prints.", productType: "T-Shirt", printType: "DTF", regularPrice: 899, salePrice: 599, status: "active", featured: false, image: "assets/images/products/kids-tshirt/mockups/default/navy/product-kids.svg", createdAt: "2026-03-02", updatedAt: "2026-03-07" },
    { id: "caps", name: "Caps", slug: "caps", sku: "DSA-CAP-001", categoryId: "custom-art", description: "Studio cap blank for DTF marks. Printed in-house after configuration.", shortDescription: "Custom cap for marks and short runs.", productType: "Accessories", printType: "DTF", regularPrice: 699, salePrice: 449, status: "active", featured: false, image: "assets/images/products/caps/mockups/default/black/product-cap.svg", createdAt: "2026-03-03", updatedAt: "2026-03-06" },
    { id: "sublimation-cushion", name: "Sublimation Cushion", slug: "sublimation-cushion", sku: "DSA-CSH-001", categoryId: "cyberpunk", description: "Sublimation cushion blank for gifts and short runs. Printed in-house after configuration.", shortDescription: "Cushion cover for dye-infused artwork.", productType: "Accessories", printType: "Sublimation", regularPrice: 999, salePrice: 699, status: "draft", featured: false, image: "assets/images/products/sublimation-cushion/mockups/default/white/product-cushion.svg", createdAt: "2026-03-04", updatedAt: "2026-03-05" }
  ];

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = "0" + m;
    if (day.length < 2) day = "0" + day;
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function cloneCategory(item) {
    item = item || {};
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      image: item.image || "",
      productCount: Number(item.productCount) || 0,
      displayOrder: Number(item.displayOrder) || 1,
      status: item.status === "inactive" ? "inactive" : "active",
      updated: item.updated || today()
    };
  }

  function cloneProduct(item) {
    item = item || {};
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      categoryId: item.categoryId,
      description: item.description || "",
      shortDescription: item.shortDescription || "",
      productType: item.productType || "T-Shirt",
      printType: item.printType || "DTF",
      regularPrice: Number(item.regularPrice) || 0,
      salePrice: item.salePrice == null || item.salePrice === "" ? null : Number(item.salePrice),
      status: item.status === "draft" ? "draft" : "active",
      featured: Boolean(item.featured),
      image: item.image || "",
      createdAt: item.createdAt || today(),
      updatedAt: item.updatedAt || today()
    };
  }

  function usable(list, cloneFn) {
    if (!Array.isArray(list)) return null;
    var next = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (!list[i] || !list[i].id) return null;
      next.push(cloneFn(list[i]));
    }
    return next;
  }

  function readStore() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      var cats = usable(parsed.categories, cloneCategory);
      var prods = usable(parsed.products, cloneProduct);
      if (!cats || !prods) return null;
      return { categories: cats, products: prods };
    } catch (e) {
      return null;
    }
  }

  function writeStore() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories: categories,
        products: products
      }));
    } catch (e) {}
  }

  var stored = readStore();
  var categories = stored ? stored.categories : CATEGORY_SEED.map(cloneCategory);
  var products = stored ? stored.products : PRODUCT_SEED.map(cloneProduct);
  if (!stored) writeStore();

  function persist() {
    writeStore();
  }

  function setCategories(next) {
    var cloned = usable(next, cloneCategory);
    if (cloned) categories = cloned;
    persist();
    document.dispatchEvent(new CustomEvent("ds-admin-categories", { detail: { categories: categories } }));
    return categories;
  }

  function setProducts(next) {
    var cloned = usable(next, cloneProduct);
    if (cloned) products = cloned;
    persist();
    document.dispatchEvent(new CustomEvent("ds-admin-products", { detail: { products: products } }));
    return products;
  }

  function findCategory(id) {
    var i;
    for (i = 0; i < categories.length; i += 1) {
      if (categories[i].id === id) return categories[i];
    }
    return null;
  }

  function findProduct(id) {
    var i;
    for (i = 0; i < products.length; i += 1) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  function countByCategory(id) {
    var count = 0;
    var i;
    for (i = 0; i < products.length; i += 1) {
      if (products[i].categoryId === id) count += 1;
    }
    return count;
  }

  function categoryName(id) {
    var item = findCategory(id);
    return item ? item.name : "Unassigned";
  }

  function imageUrl(src) {
    src = src || "assets/images/categories/cat-tee.svg";
    if (src.indexOf("http") === 0 || src.indexOf("../") === 0) return src;
    return "../" + src.replace(/^\.\//, "");
  }

  function displayPrice(item) {
    if (item && item.salePrice != null && Number.isFinite(item.salePrice)) return item.salePrice;
    return item ? item.regularPrice : 0;
  }

  function formatPrice(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  window.DSAtelier = window.DSAtelier || {};
  window.DSAtelier.admin = window.DSAtelier.admin || {};
  window.DSAtelier.admin.data = {
    getCategories: function () { return categories; },
    getProducts: function () { return products; },
    setCategories: setCategories,
    setProducts: setProducts,
    persist: persist,
    findCategory: findCategory,
    findProduct: findProduct,
    countByCategory: countByCategory,
    categoryName: categoryName,
    imageUrl: imageUrl,
    displayPrice: displayPrice,
    formatPrice: formatPrice,
    today: today
  };
})();
